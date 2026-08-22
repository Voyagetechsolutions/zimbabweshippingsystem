-- Audited corrections and voiding for the office delivery-note register.
-- Issued notes are never physically deleted: retaining the old reference and
-- invoice is essential to duplicate and multi-load detection.

alter table public.delivery_note_records
  add column if not exists revision integer not null default 1,
  add column if not exists amended_at timestamptz,
  add column if not exists amended_by uuid references auth.users(id) on delete set null,
  add column if not exists last_change_reason text,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists void_reason text;

create table if not exists public.delivery_note_record_revisions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.delivery_note_records(id) on delete cascade,
  revision integer not null,
  action text not null check (action in ('edit', 'void')),
  reason text not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists delivery_note_record_revisions_record_idx
  on public.delivery_note_record_revisions(record_id, revision desc);

alter table public.delivery_note_record_revisions enable row level security;

drop policy if exists "Staff read delivery note revisions" on public.delivery_note_record_revisions;
create policy "Staff read delivery note revisions" on public.delivery_note_record_revisions
  for select to authenticated using (public.is_staff_member());

create or replace function public.capture_delivery_note_record_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_reason text;
begin
  v_action := case when old.voided_at is null and new.voided_at is not null then 'void' else 'edit' end;
  v_reason := trim(coalesce(
    case when v_action = 'void' then new.void_reason else new.last_change_reason end,
    ''
  ));
  if v_reason = '' then
    raise exception 'Enter a reason for changing this delivery note';
  end if;

  insert into public.delivery_note_record_revisions(
    record_id, revision, action, reason, snapshot, changed_by
  ) values (
    old.id, old.revision, v_action, v_reason, to_jsonb(old), auth.uid()
  );

  new.revision := old.revision + 1;
  new.amended_at := now();
  new.amended_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists delivery_note_records_capture_revision on public.delivery_note_records;
create trigger delivery_note_records_capture_revision
  before update on public.delivery_note_records
  for each row execute function public.capture_delivery_note_record_revision();

-- There is deliberately no DELETE policy. Admin "Delete" is a void update so
-- a historical invoice cannot disappear from the duplicate ledger.
