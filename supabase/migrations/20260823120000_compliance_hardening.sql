-- Compliance hardening: preserve deletion-request evidence, keep invoice media
-- private, and enforce the published retention windows.

alter table public.account_deletion_requests
  alter column user_id drop not null;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_user_id_fkey;
alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('invoice-documents', 'invoice-documents', false, 15728640, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 15728640, allowed_mime_types = array['application/pdf'];

-- Only service-role Edge Functions use this bucket. No anon/authenticated
-- object policy is deliberately created.

create or replace function public.run_compliance_retention_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_zimmy integer := 0;
  v_whatsapp integer := 0;
  v_quotes integer := 0;
  v_invoice_files integer := 0;
begin
  delete from public.zimmy_chat_events
   where created_at < now() - interval '12 months';
  get diagnostics v_zimmy = row_count;

  -- A conversation that is not closed is an active support/booking record and
  -- is not removed solely because the last customer reply is old.
  delete from public.whatsapp_conversations
   where status = 'closed'
     and last_message_at < now() - interval '24 months';
  get diagnostics v_whatsapp = row_count;

  delete from public.custom_quotes
   where status in ('rejected', 'cancelled')
     and created_at < now() - interval '24 months';
  get diagnostics v_quotes = row_count;

  delete from storage.objects
   where bucket_id = 'invoice-documents'
     and created_at < now() - interval '2 days';
  get diagnostics v_invoice_files = row_count;

  return jsonb_build_object(
    'zimmyEvents', v_zimmy,
    'whatsappConversations', v_whatsapp,
    'quotes', v_quotes,
    'invoiceFiles', v_invoice_files,
    'ranAt', now()
  );
end;
$$;

revoke all on function public.run_compliance_retention_cleanup() from public, anon, authenticated;
grant execute on function public.run_compliance_retention_cleanup() to service_role;

-- Supabase Cron runs the service-side cleanup every night. The named job makes
-- the schedule visible and auditable in the dashboard.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'compliance-retention-nightly',
  '17 3 * * *',
  $$select public.run_compliance_retention_cleanup();$$
);
