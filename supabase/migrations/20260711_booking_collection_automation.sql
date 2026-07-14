-- End-to-end WhatsApp booking, collection, invoicing and request workflow.

alter table public.shipments
  add column if not exists customer_reference text,
  add column if not exists qr_token text,
  add column if not exists collection_status text not null default 'Awaiting Collection',
  add column if not exists delivery_note_status text not null default 'Draft',
  add column if not exists collected_at timestamptz,
  add column if not exists collected_by uuid references auth.users(id);

create unique index if not exists shipments_customer_reference_unique
  on public.shipments (customer_reference) where customer_reference is not null;
create unique index if not exists shipments_qr_token_unique
  on public.shipments (qr_token) where qr_token is not null;

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments(id) on delete set null,
  customer_name text,
  whatsapp_number text not null,
  request_type text not null,
  message text,
  customer_reference text,
  status text not null default 'New' check (status in ('New', 'Contacted', 'Resolved')),
  unread boolean not null default true,
  source text not null default 'whatsapp-bot',
  handled_by uuid references auth.users(id),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_requests_status_created_idx
  on public.customer_requests (status, created_at desc);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_type text not null,
  previous_status text,
  new_status text,
  actor_id uuid references auth.users(id),
  actor_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shipment_events_shipment_created_idx
  on public.shipment_events (shipment_id, created_at desc);

alter table public.customer_requests enable row level security;
alter table public.shipment_events enable row level security;

-- The QR bot uses the anon key. Restrict anonymous writes to creating requests;
-- staff access remains limited to authenticated administrators.
drop policy if exists "Bot can create customer requests" on public.customer_requests;
create policy "Bot can create customer requests" on public.customer_requests
  for insert to anon, authenticated with check (true);

drop policy if exists "Admins manage customer requests" on public.customer_requests;
create policy "Admins manage customer requests" on public.customer_requests
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Admins manage shipment events" on public.shipment_events;
create policy "Admins manage shipment events" on public.shipment_events
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

do $$
begin
  alter publication supabase_realtime add table public.customer_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shipment_events;
exception when duplicate_object then null;
end $$;

create or replace function public.process_collection_scan(
  p_qr_token text,
  p_payment_result text default 'not_applicable',
  p_amount_received numeric default 0,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
  v_payment public.payments%rowtype;
  v_now timestamptz := now();
  v_invoice_number text;
  v_payment_status text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or role in ('driver', 'staff'))
  ) then raise exception 'Not authorised to process collections'; end if;

  select * into v_shipment from public.shipments where qr_token = p_qr_token for update;
  if not found then raise exception 'Invalid QR code'; end if;

  if v_shipment.collected_at is null then
    update public.shipments set
      status = 'Collected',
      collection_status = 'Collected',
      delivery_note_status = 'Collected/Confirmed',
      collected_at = v_now,
      collected_by = auth.uid(),
      updated_at = v_now,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'collectionConfirmation', jsonb_build_object('notes', p_notes, 'collectedAt', v_now, 'collectedBy', auth.uid())
      )
    where id = v_shipment.id returning * into v_shipment;

    insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
    values (v_shipment.id, 'collection_confirmed', v_shipment.status, 'Collected', auth.uid(), jsonb_build_object('notes', p_notes));
  end if;

  select * into v_payment from public.payments where shipment_id = v_shipment.id order by created_at desc limit 1 for update;
  if found
    and lower(coalesce(v_payment.payment_method, '')) in ('cashoncollection', 'cash_on_collection', 'cash on collection')
    and not (lower(coalesce(v_payment.payment_status, '')) = 'paid' and p_payment_result = 'paid') then
    v_payment_status := case
      when p_payment_result = 'paid' then 'paid'
      when p_payment_result = 'partial' then 'partially_paid'
      else 'pending'
    end;

    update public.payments set payment_status = v_payment_status where id = v_payment.id;

    if p_payment_result = 'paid' then
      v_invoice_number := coalesce(v_shipment.metadata->'invoice'->>'invoiceNumber', 'INV-' || v_shipment.customer_reference);
      update public.shipments set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'invoice', jsonb_build_object(
          'invoiceNumber', v_invoice_number,
          'status', 'paid',
          'paid', true,
          'paymentMethod', 'Cash on Collection',
          'amountPaid', greatest(p_amount_received, v_payment.amount),
          'paidAt', v_now,
          'issuedAt', v_now
        )
      ) where id = v_shipment.id returning * into v_shipment;
    end if;

    insert into public.shipment_events(shipment_id, event_type, actor_id, details)
    values (v_shipment.id, 'cash_payment_recorded', auth.uid(), jsonb_build_object(
      'result', p_payment_result, 'amountReceived', p_amount_received, 'paymentStatus', v_payment_status, 'invoiceNumber', v_invoice_number
    ));
  end if;

  return jsonb_build_object(
    'shipmentId', v_shipment.id,
    'trackingNumber', v_shipment.tracking_number,
    'customerReference', v_shipment.customer_reference,
    'status', v_shipment.status,
    'alreadyCollected', v_shipment.collected_at is not null and v_shipment.collected_at < v_now,
    'invoiceNumber', v_invoice_number,
    'paymentStatus', v_payment_status
  );
end;
$$;

grant execute on function public.process_collection_scan(text, text, numeric, text) to authenticated;
