-- Operations upgrade: detailed goods descriptions with driver corrections,
-- metal coded seals, saved delivery addresses with per-address pricing,
-- server-side customer references (AAAMMYY0000) and booking pricing,
-- quote-to-booking workflow, richer customer notifications, driver-proof
-- retention bookkeeping, AI rate limiting, and route-based driver assignment.
-- Applied to the live DB via the staff-ops edge function's "setup" action.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- A. Goods descriptions + non-destructive driver corrections
-- ---------------------------------------------------------------------------

alter table public.shipments
  add column if not exists goods_description text,
  add column if not exists driver_description_correction text,
  add column if not exists seals_requested integer not null default 0;

alter table public.custom_quotes
  add column if not exists currency text not null default 'GBP',
  add column if not exists valid_until date,
  add column if not exists quoted_by uuid references auth.users(id) on delete set null,
  add column if not exists quoted_at timestamptz,
  add column if not exists booked_shipment_id uuid references public.shipments(id) on delete set null;

create or replace function public.driver_correct_goods_description(
  p_stop_id uuid,
  p_correction text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_ship public.shipments%rowtype;
begin
  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if v_run.driver_id <> auth.uid() and not public.is_operations_admin() then
    raise exception 'This stop is not assigned to you';
  end if;
  if trim(coalesce(p_correction, '')) = '' then raise exception 'Enter the correction first'; end if;

  select * into v_ship from public.shipments where id = v_stop.shipment_id for update;
  -- The customer's original description is never overwritten; corrections are
  -- stored separately and every change is audited.
  update public.shipments set
    driver_description_correction = trim(p_correction),
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'driverDescriptionCorrection', jsonb_build_object(
        'text', trim(p_correction), 'driverId', auth.uid(), 'correctedAt', now(),
        'original', coalesce(v_ship.goods_description, v_ship.metadata->'shipment'->>'description')
      )
    )
  where id = v_ship.id;

  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (v_ship.id, 'description_corrected', null, null, auth.uid(),
          jsonb_build_object('stopId', v_stop.id, 'correction', trim(p_correction),
                             'original', coalesce(v_ship.goods_description, v_ship.metadata->'shipment'->>'description')));

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'CORRECT_DESCRIPTION', 'SHIPMENT', v_ship.id,
          jsonb_build_object('stopId', v_stop.id, 'correction', trim(p_correction)));

  return jsonb_build_object('shipmentId', v_ship.id, 'correction', trim(p_correction));
end $$;
grant execute on function public.driver_correct_goods_description(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- B. Metal coded seals
-- ---------------------------------------------------------------------------

create table if not exists public.shipment_seals (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  stop_id uuid references public.driver_run_stops(id) on delete set null,
  seals_used boolean not null default true,
  seal_count integer not null default 0 check (seal_count >= 0),
  seal_codes text[] not null default '{}',
  condition text not null default 'intact' check (condition in ('intact', 'damaged', 'missing', 'other')),
  notes text,
  photo_path text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id)
);
create index if not exists shipment_seals_shipment_idx on public.shipment_seals(shipment_id);

alter table public.shipment_seals enable row level security;

drop policy if exists "Staff manage shipment seals" on public.shipment_seals;
create policy "Staff manage shipment seals" on public.shipment_seals
  for all to authenticated
  using (public.is_operations_admin() or public.is_finance_staff() or recorded_by = auth.uid())
  with check (public.is_operations_admin() or public.is_finance_staff() or recorded_by = auth.uid());

drop policy if exists "Customers view own shipment seals" on public.shipment_seals;
create policy "Customers view own shipment seals" on public.shipment_seals
  for select to authenticated
  using (exists (select 1 from public.shipments s where s.id = shipment_seals.shipment_id and s.user_id = auth.uid()));

-- Driver records seal details during pickup (server stamps who/when and
-- mirrors the seals onto the shipment metadata for invoices/delivery notes).
create or replace function public.record_shipment_seals(
  p_stop_id uuid,
  p_seals_used boolean,
  p_seal_count integer default 0,
  p_seal_codes text[] default '{}',
  p_condition text default 'intact',
  p_notes text default null,
  p_photo_path text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_row public.shipment_seals%rowtype;
begin
  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if v_run.driver_id <> auth.uid() and not public.is_operations_admin() then
    raise exception 'This stop is not assigned to you';
  end if;
  if p_seals_used and coalesce(p_seal_count, 0) <> coalesce(array_length(p_seal_codes, 1), 0) then
    raise exception 'Enter every seal code (% seals, % codes)', p_seal_count, coalesce(array_length(p_seal_codes, 1), 0);
  end if;

  insert into public.shipment_seals(shipment_id, stop_id, seals_used, seal_count, seal_codes, condition, notes, photo_path, recorded_by)
  values (v_stop.shipment_id, v_stop.id, p_seals_used,
          case when p_seals_used then coalesce(p_seal_count, 0) else 0 end,
          case when p_seals_used then coalesce(p_seal_codes, '{}') else '{}' end,
          coalesce(p_condition, 'intact'), p_notes, p_photo_path, auth.uid())
  on conflict (shipment_id) do update set
    stop_id = excluded.stop_id, seals_used = excluded.seals_used, seal_count = excluded.seal_count,
    seal_codes = excluded.seal_codes, condition = excluded.condition, notes = excluded.notes,
    photo_path = coalesce(excluded.photo_path, shipment_seals.photo_path),
    recorded_by = auth.uid(), updated_at = now()
  returning * into v_row;

  update public.shipments set
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'seals', jsonb_build_object(
        'used', v_row.seals_used, 'count', v_row.seal_count, 'codes', to_jsonb(v_row.seal_codes),
        'condition', v_row.condition, 'notes', v_row.notes,
        'recordedBy', v_row.recorded_by, 'recordedAt', v_row.updated_at))
  where id = v_stop.shipment_id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'RECORD_SEALS', 'SHIPMENT', v_stop.shipment_id,
          jsonb_build_object('stopId', v_stop.id, 'used', v_row.seals_used, 'count', v_row.seal_count, 'codes', v_row.seal_codes));

  return to_jsonb(v_row);
end $$;
grant execute on function public.record_shipment_seals(uuid, boolean, integer, text[], text, text, text) to authenticated;

-- Seal and goods photos share the driver-proofs pipeline (and retention).
alter table public.driver_proofs drop constraint if exists driver_proofs_proof_type_check;
alter table public.driver_proofs add constraint driver_proofs_proof_type_check
  check (proof_type in ('pickup_departure', 'depot_arrival', 'depot_departure', 'delivery_arrival', 'exception', 'seal', 'goods'));

-- ---------------------------------------------------------------------------
-- C. Saved customer delivery addresses (£25 UK / €25 Ireland per address)
-- ---------------------------------------------------------------------------

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  recipient_phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  province text,
  country text not null default 'Zimbabwe',
  postal_code text,
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id, created_at desc);

alter table public.customer_addresses enable row level security;
drop policy if exists "Customers manage own addresses" on public.customer_addresses;
create policy "Customers manage own addresses" on public.customer_addresses
  for all to authenticated
  using (user_id = auth.uid() or public.is_operations_admin() or public.is_finance_staff())
  with check (user_id = auth.uid() or public.is_operations_admin());

create or replace function public.enforce_single_default_address() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_default then
    update public.customer_addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists customer_addresses_default_trigger on public.customer_addresses;
create trigger customer_addresses_default_trigger
  before insert or update on public.customer_addresses
  for each row execute function public.enforce_single_default_address();

-- ---------------------------------------------------------------------------
-- D. Server-side customer references — AAAMMYY0000
-- ---------------------------------------------------------------------------

create table if not exists public.customer_reference_counters (
  period text primary key,
  counter integer not null default 0
);

create or replace function public.next_customer_reference(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare v_prefix text; v_period text; v_n integer; v_ref text;
begin
  v_prefix := upper(rpad(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z]', '', 'g'), 3), 3, 'X'));
  v_period := to_char(now(), 'MMYY');
  loop
    insert into public.customer_reference_counters(period, counter) values (v_period, 1)
      on conflict (period) do update set counter = customer_reference_counters.counter + 1
      returning counter into v_n;
    v_ref := v_prefix || v_period || case when v_n < 10000 then lpad(v_n::text, 4, '0') else v_n::text end;
    exit when not exists (select 1 from public.shipments where customer_reference = v_ref);
  end loop;
  return v_ref;
end $$;
grant execute on function public.next_customer_reference(text) to authenticated;

-- ---------------------------------------------------------------------------
-- E. Canonical catalogue + fully server-priced booking
-- ---------------------------------------------------------------------------

create table if not exists public.catalogue_items (
  id text primary key,
  label text not null,
  price_uk numeric(12,2),
  price_ie numeric(12,2),
  note text,
  active boolean not null default true
);
insert into public.catalogue_items (id, label, price_uk, price_ie, note) values
  ('drum', 'Drum (200-220L)', 280, 360, null),
  ('trunk', 'Trunk / storage box', null, 220, 'UK boxes £180-£280 by size - team confirms'),
  ('seal', 'Metal coded seal', 5, 7, null),
  ('stove', 'Stove / cooker', 260, 325, null),
  ('washing_machine', 'Washing machine', 300, 328, null),
  ('fridge', 'Fridge', 450, null, 'Ireland €490-€620 by size - team confirms'),
  ('american_fridge', 'American fridge freezer', 600, null, null),
  ('sofa', 'Sofa / lounge suite', 1500, 1560, null),
  ('suitcase', 'Suitcase', null, null, 'UK £180-£200, Ireland €200-€230 by size')
on conflict (id) do update set label = excluded.label, price_uk = excluded.price_uk,
  price_ie = excluded.price_ie, note = excluded.note, active = true;

alter table public.catalogue_items enable row level security;
drop policy if exists "Catalogue is readable" on public.catalogue_items;
create policy "Catalogue is readable" on public.catalogue_items for select to authenticated, anon using (true);

-- All booking pricing is computed here from the catalogue, the caller's saved
-- delivery addresses, seals, and (optionally) an approved custom quote. The
-- mobile app's totals are display-only.
create or replace function public.create_customer_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_country text := coalesce(p->>'country', 'United Kingdom');
  v_is_ireland boolean;
  v_currency text; v_symbol text;
  v_full_name text;
  v_reference text; v_tracking text; v_qr text;
  v_items jsonb := coalesce(p->'items', '{}'::jsonb);
  v_lines jsonb := '[]'::jsonb;
  v_line record;
  v_subtotal numeric := 0;
  v_has_custom boolean := false;
  v_seals integer := greatest(0, coalesce((p->>'sealsRequested')::integer, 0));
  v_seal_price numeric;
  v_addr_ids uuid[];
  v_addresses jsonb := '[]'::jsonb;
  v_addr record;
  v_addr_count integer := 0;
  v_quote public.custom_quotes%rowtype;
  v_quote_id uuid := nullif(p->>'quoteId', '')::uuid;
  v_description text;
  v_recipient jsonb;
  v_invoice jsonb;
  v_shipment public.shipments%rowtype;
  v_discount numeric := 0;
begin
  if v_uid is null then raise exception 'Sign in to book a shipment'; end if;
  if v_country not in ('United Kingdom', 'Ireland') then raise exception 'Unknown collection country'; end if;
  v_is_ireland := v_country = 'Ireland';
  v_currency := case when v_is_ireland then 'EUR' else 'GBP' end;
  v_symbol := case when v_is_ireland then '€' else '£' end;
  v_full_name := trim(coalesce(p->'sender'->>'firstName', '') || ' ' || coalesce(p->'sender'->>'lastName', ''));
  if v_full_name = '' then raise exception 'Sender name is required'; end if;
  v_description := nullif(trim(coalesce(p->>'goodsDescription', '')), '');
  if v_description is null then raise exception 'A detailed goods description is required'; end if;

  -- Catalogue items priced server-side.
  for v_line in
    select c.id, c.label, case when v_is_ireland then c.price_ie else c.price_uk end as unit,
           least(greatest((v_items->>c.id)::integer, 0), 500) as qty
    from public.catalogue_items c
    where c.active and v_items ? c.id and coalesce((v_items->>c.id)::integer, 0) > 0 and c.id <> 'seal'
  loop
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', v_line.label, 'quantity', v_line.qty, 'unitPrice', coalesce(v_line.unit, 0)));
    if v_line.unit is null then v_has_custom := true;
    else v_subtotal := v_subtotal + v_line.qty * v_line.unit; end if;
  end loop;

  if nullif(trim(coalesce(p->>'otherItems', '')), '') is not null then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', trim(p->>'otherItems'), 'quantity', 1, 'unitPrice', 0));
    v_has_custom := true;
  end if;

  -- Optional approved custom quote carried into the booking (amount locked).
  if v_quote_id is not null then
    select * into v_quote from public.custom_quotes
      where id = v_quote_id and user_id = v_uid and status = 'approved' for update;
    if not found then raise exception 'This quote is not approved for booking'; end if;
    if v_quote.valid_until is not null and v_quote.valid_until < current_date then
      raise exception 'This quote has expired — please request an updated quote';
    end if;
    if coalesce(v_quote.currency, v_currency) <> v_currency then
      raise exception 'This quote was priced in % — choose the matching collection country', v_quote.currency;
    end if;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', 'Approved quote: ' || left(coalesce(v_quote.description, 'custom goods'), 160),
      'quantity', 1, 'unitPrice', coalesce(v_quote.quoted_amount, 0)));
    v_subtotal := v_subtotal + coalesce(v_quote.quoted_amount, 0);
  end if;

  -- Metal coded seals at the catalogue price.
  if v_seals > 0 then
    select case when v_is_ireland then price_ie else price_uk end into v_seal_price
      from public.catalogue_items where id = 'seal';
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', 'Metal coded seal', 'quantity', v_seals, 'unitPrice', coalesce(v_seal_price, 0)));
    v_subtotal := v_subtotal + v_seals * coalesce(v_seal_price, 0);
  end if;

  -- Delivery addresses: each saved address selected adds £25/€25 in the
  -- booking currency. Addresses must belong to the caller.
  select coalesce(array_agg(value::uuid), '{}') into v_addr_ids
    from jsonb_array_elements_text(coalesce(p->'deliveryAddressIds', '[]'::jsonb));
  for v_addr in
    select * from public.customer_addresses
    where user_id = v_uid and id = any(v_addr_ids)
    order by array_position(v_addr_ids, id)
  loop
    v_addr_count := v_addr_count + 1;
    v_addresses := v_addresses || jsonb_build_array(jsonb_build_object(
      'id', v_addr.id, 'recipientName', v_addr.recipient_name, 'recipientPhone', v_addr.recipient_phone,
      'address', trim(v_addr.address_line1 || coalesce(', ' || nullif(v_addr.address_line2, ''), '')),
      'city', v_addr.city, 'province', v_addr.province, 'country', v_addr.country,
      'postalCode', v_addr.postal_code, 'instructions', v_addr.delivery_instructions));
  end loop;
  if v_addr_count <> coalesce(array_length(v_addr_ids, 1), 0) then
    raise exception 'One of the selected delivery addresses could not be found';
  end if;
  if v_addr_count > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', 'Zimbabwe door delivery (' || v_addr_count || ' address' || case when v_addr_count > 1 then 'es' else '' end || ')',
      'quantity', v_addr_count, 'unitPrice', 25));
    v_subtotal := v_subtotal + v_addr_count * 25;
  end if;

  if jsonb_array_length(v_lines) = 0 then raise exception 'Add at least one item to the booking'; end if;

  -- Primary receiver: first selected delivery address, else the typed one.
  if v_addr_count > 0 then
    v_recipient := v_addresses->0;
    v_recipient := jsonb_build_object(
      'name', v_recipient->>'recipientName', 'phone', v_recipient->>'recipientPhone',
      'address', v_recipient->>'address', 'city', v_recipient->>'city');
  else
    v_recipient := jsonb_build_object(
      'name', coalesce(p->'recipient'->>'name', ''), 'phone', coalesce(p->'recipient'->>'phone', ''),
      'address', coalesce(p->'recipient'->>'address', ''), 'city', coalesce(p->'recipient'->>'city', ''));
    if trim(coalesce(v_recipient->>'name', '')) = '' then
      raise exception 'Add a receiver or select a saved delivery address';
    end if;
  end if;

  v_reference := public.next_customer_reference(v_full_name);
  loop
    v_tracking := 'ZIMSHIP-' || lpad(floor(random() * 90000 + 10000)::text, 5, '0');
    exit when not exists (select 1 from public.shipments where tracking_number = v_tracking);
  end loop;
  v_qr := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  v_invoice := jsonb_build_object(
    'invoiceNumber', 'INV-' || v_reference,
    'issueDate', to_char(now(), 'YYYY-MM-DD'),
    'dueDate', to_char(now() + interval '14 days', 'YYYY-MM-DD'),
    'items', v_lines,
    'discount', v_discount,
    'taxRate', 0,
    'paymentTerms', coalesce(p->>'paymentMethod', 'Bank Transfer'),
    'notes', case when v_has_custom
      then 'Includes custom-quote items - final price to be confirmed by the Zimbabwe Shipping team.'
      else 'Booked via the customer app.' end,
    'currency', v_currency,
    'paid', false, 'payments', '[]'::jsonb, 'sentAt', null);

  insert into public.shipments (
    tracking_number, status, origin, destination, user_id, customer_reference, qr_token,
    collection_status, delivery_note_status, collection_schedule_id,
    goods_description, seals_requested, metadata
  ) values (
    v_tracking, 'Booking Confirmed',
    v_country || ': ' || coalesce(p->>'collectionAddress', '') || ', ' || coalesce(p->>'collectionCity', '') || ' ' || coalesce(p->>'collectionPostcode', ''),
    coalesce(v_recipient->>'address', '') || ', ' || coalesce(v_recipient->>'city', ''),
    v_uid, v_reference, v_qr,
    'Awaiting Collection', 'Draft', nullif(p->>'scheduleId', '')::uuid,
    v_description, v_seals,
    jsonb_build_object(
      'source', 'customer_app',
      'customerReference', v_reference,
      'qrToken', v_qr,
      'sender', jsonb_build_object(
        'firstName', p->'sender'->>'firstName', 'lastName', p->'sender'->>'lastName',
        'name', v_full_name, 'email', p->'sender'->>'email', 'phone', p->'sender'->>'phone',
        'address', p->>'collectionAddress', 'city', p->>'collectionCity',
        'postalCode', p->>'collectionPostcode', 'country', v_country),
      'recipient', v_recipient,
      'deliveryAddresses', v_addresses,
      'shipment', jsonb_build_object('description', v_description, 'includeOtherItems', v_has_custom),
      'shipmentDetails', jsonb_build_object('description', v_description, 'includeOtherItems', v_has_custom),
      'collection', jsonb_build_object(
        'route', coalesce(nullif(p->>'route', ''), 'To be assigned'),
        'date', coalesce(nullif(p->>'collectionDate', ''), 'To be confirmed'),
        'scheduleId', nullif(p->>'scheduleId', '')),
      'pricing', jsonb_build_object(
        'paymentMethod', coalesce(p->>'paymentMethod', 'Bank Transfer'), 'currency', v_currency,
        'estimatedTotal', v_subtotal, 'deliveryAddressCount', v_addr_count,
        'deliveryFeePerAddress', 25, 'sealsRequested', v_seals, 'serverPriced', true),
      'discounts', jsonb_build_object(
        'returningResident', coalesce((p->>'returningResident')::boolean, false),
        'referredBy', nullif(trim(coalesce(p->>'referredBy', '')), '')),
      'sealsRequested', v_seals,
      'quoteId', v_quote_id,
      'invoice', v_invoice,
      'deliveryNote', jsonb_build_object('status', 'Draft', 'number', 'DN-' || v_reference),
      'whatsappNumber', p->'sender'->>'phone',
      'createdAt', now()
    )
  ) returning * into v_shipment;

  if v_quote_id is not null then
    update public.custom_quotes set status = 'booked', booked_shipment_id = v_shipment.id, updated_at = now()
    where id = v_quote_id;
  end if;

  insert into public.customer_requests (shipment_id, customer_name, whatsapp_number, request_type, message,
                                        customer_reference, status, unread, source)
  values (v_shipment.id, v_full_name, p->'sender'->>'phone', 'App Booking',
          left(v_description, 500)
            || case when coalesce((p->>'returningResident')::boolean, false) then ' - RETURNING RESIDENT' else '' end
            || case when nullif(trim(coalesce(p->>'referredBy', '')), '') is not null then ' - referred by ' || trim(p->>'referredBy') else '' end,
          v_reference, 'New', true, 'customer_app');

  return jsonb_build_object(
    'id', v_shipment.id, 'trackingNumber', v_tracking, 'customerReference', v_reference,
    'currency', v_currency, 'estimatedTotal', v_subtotal, 'hasCustomItems', v_has_custom,
    'invoice', v_invoice);
end $$;
grant execute on function public.create_customer_booking(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- F. Quote-to-booking workflow
-- ---------------------------------------------------------------------------

create or replace function public.respond_custom_quote(
  p_quote_id uuid,
  p_action text,
  p_amount numeric default null,
  p_currency text default null,
  p_valid_until date default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_quote public.custom_quotes%rowtype;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  select * into v_quote from public.custom_quotes where id = p_quote_id for update;
  if not found then raise exception 'Quote not found'; end if;
  if v_quote.status = 'booked' then raise exception 'This quote has already been booked'; end if;

  if p_action = 'approve' then
    if coalesce(p_amount, 0) <= 0 then raise exception 'Enter the quoted price first'; end if;
    update public.custom_quotes set
      status = 'approved', quoted_amount = p_amount,
      currency = coalesce(upper(p_currency), currency, 'GBP'),
      valid_until = coalesce(p_valid_until, current_date + 30),
      admin_notes = coalesce(p_notes, admin_notes),
      quoted_by = auth.uid(), quoted_at = now(), updated_at = now()
    where id = p_quote_id returning * into v_quote;
  elsif p_action = 'reject' then
    update public.custom_quotes set status = 'rejected', admin_notes = coalesce(p_notes, admin_notes),
      quoted_by = auth.uid(), quoted_at = now(), updated_at = now()
    where id = p_quote_id returning * into v_quote;
  elsif p_action = 'request_info' then
    update public.custom_quotes set status = 'info_requested', admin_notes = coalesce(p_notes, admin_notes),
      quoted_by = auth.uid(), quoted_at = now(), updated_at = now()
    where id = p_quote_id returning * into v_quote;
  else
    raise exception 'Action must be approve, reject or request_info';
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'QUOTE_' || upper(p_action), 'CUSTOM_QUOTE', p_quote_id,
          jsonb_build_object('amount', p_amount, 'currency', v_quote.currency, 'notes', p_notes));

  if v_quote.user_id is not null then
    insert into public.notifications(user_id, title, message, type, related_id)
    values (v_quote.user_id,
      case p_action when 'approve' then 'Your quote is ready'
                    when 'reject' then 'Quote update'
                    else 'We need more information' end,
      case p_action
        when 'approve' then 'Your custom quote is ' || v_quote.currency || ' ' || to_char(v_quote.quoted_amount, 'FM999999990.00')
          || coalesce(' (valid until ' || to_char(v_quote.valid_until, 'DD Mon YYYY') || ')', '') || '. Open the app to book your shipment.'
        when 'reject' then coalesce('We could not quote this request: ' || p_notes, 'We could not quote this request. Ask Zimmy or contact the team for help.')
        else coalesce(p_notes, 'Please add more details to your quote request so the team can price it.') end,
      'quote', v_quote.id);
  end if;

  return to_jsonb(v_quote);
end $$;
grant execute on function public.respond_custom_quote(uuid, text, numeric, text, date, text) to authenticated;

-- New quote requests alert the admin team and confirm receipt to the customer.
create or replace function public.notify_new_custom_quote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, title, message, type, related_id, is_read)
  values ('00000000-0000-0000-0000-000000000000', 'New quote request',
          coalesce(left(new.description, 120), 'A customer') || ' — respond in Custom Quotes.', 'quote_request', new.id, false);
  if new.user_id is not null then
    insert into public.notifications(user_id, title, message, type, related_id)
    values (new.user_id, 'Quote request received',
            'Our team is pricing your request and will reply shortly.', 'quote', new.id);
  end if;
  return new;
end $$;
drop trigger if exists custom_quote_admin_notification on public.custom_quotes;
create trigger custom_quote_admin_notification after insert on public.custom_quotes
  for each row execute function public.notify_new_custom_quote();

-- ---------------------------------------------------------------------------
-- G. Customer notifications for driver progress (dedup by transition)
-- ---------------------------------------------------------------------------

create or replace function public.notify_customer_driver_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_title text; v_message text; v_ref text;
begin
  if new.user_id is null or new.driver_status is not distinct from old.driver_status then return new; end if;
  if coalesce((select (notification_preferences->>'shipment')::boolean from public.profiles where id = new.user_id), true) = false then
    return new;
  end if;
  v_ref := coalesce(new.customer_reference, new.tracking_number);
  v_title := case new.driver_status
    when 'assigned' then 'Driver assigned'
    when 'en_route' then 'Driver en route'
    when 'arrived' then 'Driver has arrived'
    when 'collected' then 'Goods collected'
    when 'delivered' then 'Delivered'
    when 'failed' then 'Collection or delivery issue'
    else null end;
  if v_title is null then return new; end if;
  v_message := case new.driver_status
    when 'assigned' then v_ref || ': a driver has been assigned to your collection.'
    when 'en_route' then v_ref || ': your driver is on the way.'
    when 'arrived' then v_ref || ': your driver has arrived.'
    when 'collected' then v_ref || ': your goods have been collected. Thank you!'
    when 'delivered' then v_ref || ' has been delivered.'
    else v_ref || ': there was an issue — the team will contact you to replan.' end;
  insert into public.notifications(user_id, title, message, type, related_id)
  select new.user_id, v_title, v_message, 'shipment', new.id
  where not exists (
    select 1 from public.notifications
    where user_id = new.user_id and related_id = new.id and title = v_title
      and created_at > now() - interval '6 hours');
  return new;
end $$;
drop trigger if exists customer_driver_progress_notification on public.shipments;
create trigger customer_driver_progress_notification after update of driver_status on public.shipments
  for each row execute function public.notify_customer_driver_progress();

-- ---------------------------------------------------------------------------
-- H. Driver photograph retention bookkeeping (deleted 48h after delivery)
-- ---------------------------------------------------------------------------

alter table public.driver_proofs
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_reason text;
create index if not exists driver_proofs_retention_idx on public.driver_proofs(shipment_id) where deleted_at is null;

create schema if not exists private;
create table if not exists private.app_config (key text primary key, value text not null);
insert into private.app_config(key, value)
values ('retention_secret', encode(gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

-- Hourly retention sweep: pg_cron + pg_net call the photo-retention edge
-- function, which removes the storage objects and stamps the audit fields.
do $$ begin create extension if not exists pg_cron; exception when others then null; end $$;
do $$ begin create extension if not exists pg_net; exception when others then null; end $$;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'driver-proofs-retention';
    perform cron.schedule(
      'driver-proofs-retention',
      '17 * * * *',
      format(
        $job$select net.http_post(
          url := 'https://oncsaunsqtekwwbzvvyh.supabase.co/functions/v1/photo-retention',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-retention-secret', %L),
          body := '{}'::jsonb)$job$,
        (select value from private.app_config where key = 'retention_secret')));
  end if;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- I. AI rate limiting (consumed by the ai-chat / admin-zimmy edge functions)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  identity text not null,
  scope text not null default 'ai-chat',
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_lookup_idx on public.ai_usage_events(scope, identity, created_at desc);
alter table public.ai_usage_events enable row level security;

create or replace function public.consume_ai_quota(
  p_identity text,
  p_scope text default 'ai-chat',
  p_short_limit integer default 8,
  p_short_seconds integer default 60,
  p_daily_limit integer default 100
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_short integer; v_daily integer; v_oldest timestamptz; v_retry integer;
begin
  if coalesce(trim(p_identity), '') = '' then
    return jsonb_build_object('allowed', false, 'reason', 'missing_identity', 'retryAfterSeconds', 60);
  end if;
  select count(*) into v_daily from public.ai_usage_events
    where scope = p_scope and identity = p_identity and created_at > now() - interval '24 hours';
  if v_daily >= p_daily_limit then
    select min(created_at) into v_oldest from public.ai_usage_events
      where scope = p_scope and identity = p_identity and created_at > now() - interval '24 hours';
    v_retry := greatest(60, extract(epoch from (v_oldest + interval '24 hours' - now()))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'retryAfterSeconds', v_retry);
  end if;
  select count(*) into v_short from public.ai_usage_events
    where scope = p_scope and identity = p_identity and created_at > now() - make_interval(secs => p_short_seconds);
  if v_short >= p_short_limit then
    select min(created_at) into v_oldest from public.ai_usage_events
      where scope = p_scope and identity = p_identity and created_at > now() - make_interval(secs => p_short_seconds);
    v_retry := greatest(5, extract(epoch from (v_oldest + make_interval(secs => p_short_seconds) - now()))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'short_limit', 'retryAfterSeconds', v_retry);
  end if;
  insert into public.ai_usage_events(identity, scope) values (p_identity, p_scope);
  delete from public.ai_usage_events where created_at < now() - interval '8 days';
  return jsonb_build_object('allowed', true, 'remainingToday', p_daily_limit - v_daily - 1);
end $$;
revoke all on function public.consume_ai_quota(text, text, integer, integer, integer) from public, authenticated, anon;
grant execute on function public.consume_ai_quota(text, text, integer, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- J. Invoice + delivery-note access, and description-only driver edits
-- ---------------------------------------------------------------------------

-- Customers may replace their proof of payment while it is still pending
-- review (rejected/verified proofs are immutable to the customer).
drop policy if exists "Customers replace own pending proofs" on public.payment_proofs;
create policy "Customers replace own pending proofs" on public.payment_proofs
  for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Customers view own shipment invoices" on public.driver_invoices;
create policy "Customers view own shipment invoices" on public.driver_invoices
  for select to authenticated
  using (exists (select 1 from public.shipments s where s.id = driver_invoices.shipment_id and s.user_id = auth.uid()));

drop policy if exists "Customers view own delivery notes" on public.delivery_notes;
create policy "Customers view own delivery notes" on public.delivery_notes
  for select to authenticated
  using (exists (select 1 from public.shipments s where s.id = delivery_notes.shipment_id and s.user_id = auth.uid()));

-- The collection invoice takes its prices from the booking (server-priced
-- metadata invoice) when one exists; the driver's payload may only contribute
-- corrected line descriptions. Manual bookings with no stored invoice keep the
-- legacy path, and every use of it is audited.
create or replace function public.create_driver_invoice(
  p_stop_id uuid, p_line_items jsonb, p_discount numeric default 0, p_tax_rate numeric default 0,
  p_currency text default 'GBP', p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype;
  v_ship public.shipments%rowtype; v_invoice public.driver_invoices%rowtype;
  v_meta_invoice jsonb; v_items jsonb; v_discount numeric; v_tax_rate numeric; v_currency text;
  v_subtotal numeric := 0; v_tax numeric := 0; v_total numeric := 0; v_number text;
  v_item jsonb; v_idx integer := 0; v_correction text; v_server_priced boolean := false;
begin
  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if v_run.driver_id <> auth.uid() or v_stop.stop_type <> 'collection' then raise exception 'Pickup driver access required'; end if;
  if v_stop.status <> 'arrived' then raise exception 'Mark the collection as arrived first'; end if;

  select * into v_ship from public.shipments where id = v_stop.shipment_id;
  v_meta_invoice := v_ship.metadata->'invoice';

  if v_meta_invoice is not null and jsonb_typeof(v_meta_invoice->'items') = 'array'
     and jsonb_array_length(v_meta_invoice->'items') > 0 then
    v_server_priced := true;
    v_items := '[]'::jsonb;
    for v_item in select * from jsonb_array_elements(v_meta_invoice->'items') loop
      v_correction := nullif(trim(coalesce(p_line_items->v_idx->>'description', '')), '');
      -- Drivers may correct the wording only — quantity and price are locked.
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'description', coalesce(v_correction, v_item->>'description'),
        'quantity', coalesce((v_item->>'quantity')::numeric, 1),
        'unitPrice', coalesce((v_item->>'unitPrice')::numeric, 0)));
      v_idx := v_idx + 1;
    end loop;
    v_discount := coalesce((v_meta_invoice->>'discount')::numeric, 0);
    v_tax_rate := coalesce((v_meta_invoice->>'taxRate')::numeric, 0);
    v_currency := coalesce(v_meta_invoice->>'currency', 'GBP');
  else
    if jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
      raise exception 'Add at least one invoice item';
    end if;
    v_items := p_line_items; v_discount := coalesce(p_discount, 0);
    v_tax_rate := coalesce(p_tax_rate, 0); v_currency := upper(coalesce(p_currency, 'GBP'));
  end if;

  select coalesce(sum(coalesce((x->>'quantity')::numeric, 0) * coalesce((x->>'unitPrice')::numeric, 0)), 0)
    into v_subtotal from jsonb_array_elements(v_items) x;
  v_tax := greatest(0, v_subtotal - v_discount) * greatest(0, v_tax_rate) / 100;
  v_total := greatest(0, v_subtotal - v_discount) + v_tax;
  v_number := coalesce(v_meta_invoice->>'invoiceNumber',
                       'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(v_stop.id::text, '-', ''), 1, 6)));

  insert into public.driver_invoices(shipment_id, stop_id, driver_id, invoice_number, currency, line_items, subtotal, discount, tax, total, notes)
  values (v_stop.shipment_id, v_stop.id, auth.uid(), v_number, v_currency, v_items, v_subtotal, v_discount, v_tax, v_total, p_notes)
  on conflict (stop_id) do update set line_items = excluded.line_items, subtotal = excluded.subtotal,
    discount = excluded.discount, tax = excluded.tax, total = excluded.total, notes = excluded.notes, updated_at = now()
  returning * into v_invoice;

  update public.shipments set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'invoice', coalesce(v_meta_invoice, '{}'::jsonb) || jsonb_build_object(
      'invoiceNumber', v_invoice.invoice_number, 'issueDate', v_invoice.issue_date, 'dueDate', v_invoice.due_date,
      'items', v_invoice.line_items, 'discount', v_invoice.discount, 'taxRate', v_tax_rate,
      'currency', v_invoice.currency, 'sentAt', now()))
  where id = v_stop.shipment_id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when v_server_priced then 'DRIVER_INVOICE_CONFIRM' else 'DRIVER_INVOICE_MANUAL' end,
          'DRIVER_INVOICE', v_invoice.id,
          jsonb_build_object('stopId', v_stop.id, 'serverPriced', v_server_priced, 'total', v_total));

  return to_jsonb(v_invoice);
end $$;

-- ---------------------------------------------------------------------------
-- K. Route-based driver assignment
-- ---------------------------------------------------------------------------

create index if not exists shipments_schedule_idx on public.shipments(collection_schedule_id) where deleted_at is null;
create index if not exists custom_quotes_user_status_idx on public.custom_quotes(user_id, status, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- Assign one driver to a whole route for a given day: creates (or reuses) the
-- run and adds a stop for every matching shipment not already on an active run.
create or replace function public.assign_route_run(
  p_route text,
  p_run_date date,
  p_driver_id uuid,
  p_run_type text default 'pickup',
  p_vehicle text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run public.driver_runs%rowtype;
  v_added integer := 0; v_skipped integer := 0;
  v_next_order integer;
  v_ship record;
  v_stop_type text;
  v_address text;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  if p_run_type not in ('pickup', 'delivery') then raise exception 'Run type must be pickup or delivery'; end if;
  v_stop_type := case when p_run_type = 'delivery' then 'delivery' else 'collection' end;

  select * into v_run from public.driver_runs where driver_id = p_driver_id and run_date = p_run_date;
  if found then
    update public.driver_runs set route_name = p_route, run_type = p_run_type,
      vehicle_label = coalesce(p_vehicle, vehicle_label), updated_at = now()
    where id = v_run.id returning * into v_run;
  else
    insert into public.driver_runs(driver_id, run_date, status, vehicle_label, route_name, run_type)
    values (p_driver_id, p_run_date, 'planned', coalesce(p_vehicle, 'Assigned vehicle'), p_route, p_run_type)
    returning * into v_run;
  end if;

  select coalesce(max(stop_order), 0) into v_next_order from public.driver_run_stops where run_id = v_run.id;

  for v_ship in
    select s.*
    from public.shipments s
    left join public.collection_schedules cs on cs.id = s.collection_schedule_id
    where s.deleted_at is null
      and s.status not in ('Delivered', 'Cancelled')
      and (cs.route = p_route or s.metadata->'collection'->>'route' = p_route)
      and (v_stop_type <> 'collection' or coalesce(s.status, '') <> 'Collected')
    order by s.created_at
  loop
    if exists (select 1 from public.driver_run_stops
               where shipment_id = v_ship.id and stop_type = v_stop_type and status <> 'failed') then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_next_order := v_next_order + 1;
    v_address := case when v_stop_type = 'collection'
      then coalesce(v_ship.metadata->'sender'->>'address', '') || ', ' || coalesce(v_ship.metadata->'sender'->>'city', '')
      else coalesce(v_ship.metadata->'recipient'->>'address', '') || ', ' || coalesce(v_ship.metadata->'recipient'->>'city', '') end;
    insert into public.driver_run_stops(run_id, shipment_id, stop_order, stop_type, status, address)
    values (v_run.id, v_ship.id, v_next_order, v_stop_type, 'planned', nullif(trim(both ', ' from v_address), ''));
    update public.shipments set assigned_driver_id = p_driver_id, driver_status = 'assigned', updated_at = now()
    where id = v_ship.id;
    v_added := v_added + 1;
  end loop;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'ASSIGN_ROUTE', 'DRIVER_RUN', v_run.id,
          jsonb_build_object('route', p_route, 'runDate', p_run_date, 'driverId', p_driver_id,
                             'added', v_added, 'skipped', v_skipped));

  return jsonb_build_object('runId', v_run.id, 'added', v_added, 'alreadyAssigned', v_skipped);
end $$;
grant execute on function public.assign_route_run(text, date, uuid, text, text) to authenticated;

-- Move a whole run to a different driver (merging into their existing run for
-- that day when needed).
create or replace function public.reassign_run_driver(p_run_id uuid, p_driver_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_run public.driver_runs%rowtype; v_target public.driver_runs%rowtype; v_moved integer := 0;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  select * into v_run from public.driver_runs where id = p_run_id for update;
  if not found then raise exception 'Run not found'; end if;
  if v_run.status = 'completed' then raise exception 'This run is already completed'; end if;

  select * into v_target from public.driver_runs where driver_id = p_driver_id and run_date = v_run.run_date;
  if found and v_target.id <> v_run.id then
    update public.driver_run_stops set run_id = v_target.id,
      stop_order = stop_order + (select coalesce(max(stop_order), 0) from public.driver_run_stops where run_id = v_target.id)
    where run_id = v_run.id;
    get diagnostics v_moved = row_count;
    update public.driver_runs set status = 'cancelled', updated_at = now() where id = v_run.id;
    update public.driver_runs set route_name = coalesce(v_run.route_name, route_name), updated_at = now() where id = v_target.id;
    update public.shipments set assigned_driver_id = p_driver_id
    where id in (select shipment_id from public.driver_run_stops where run_id = v_target.id);
    return jsonb_build_object('runId', v_target.id, 'movedStops', v_moved, 'merged', true);
  end if;

  update public.driver_runs set driver_id = p_driver_id, updated_at = now() where id = p_run_id;
  update public.shipments set assigned_driver_id = p_driver_id
  where id in (select shipment_id from public.driver_run_stops where run_id = p_run_id);
  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'REASSIGN_RUN', 'DRIVER_RUN', p_run_id, jsonb_build_object('driverId', p_driver_id));
  return jsonb_build_object('runId', p_run_id, 'merged', false);
end $$;
grant execute on function public.reassign_run_driver(uuid, uuid) to authenticated;

-- Remove one stop from a run (admin replanning).
create or replace function public.remove_run_stop(p_stop_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found then raise exception 'Stop not found'; end if;
  if v_stop.status = 'completed' then raise exception 'A completed stop cannot be removed'; end if;
  delete from public.driver_run_stops where id = p_stop_id;
  update public.shipments set assigned_driver_id = null, driver_status = null, updated_at = now()
  where id = v_stop.shipment_id
    and not exists (select 1 from public.driver_run_stops where shipment_id = v_stop.shipment_id and status <> 'failed');
  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'REMOVE_STOP', 'DRIVER_RUN_STOP', p_stop_id,
          jsonb_build_object('shipmentId', v_stop.shipment_id, 'runId', v_stop.run_id));
  return jsonb_build_object('removed', true, 'shipmentId', v_stop.shipment_id);
end $$;
grant execute on function public.remove_run_stop(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- L. Deduplicated customer records for the admin Customers screen
-- ---------------------------------------------------------------------------

create or replace function public.admin_customer_records() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required';
  end if;

  with shipment_identities as (
    select s.id as shipment_id, s.user_id,
      lower(nullif(trim(coalesce(s.metadata->'sender'->>'email', '')), '')) as email,
      nullif(regexp_replace(coalesce(s.metadata->'sender'->>'phone', s.metadata->>'whatsappNumber', ''), '[^0-9]', '', 'g'), '') as phone,
      coalesce(nullif(trim(s.metadata->'sender'->>'name'), ''), 'Unknown customer') as name,
      s.customer_reference, s.created_at,
      coalesce((
        select sum(coalesce((i->>'quantity')::numeric, 0) * coalesce((i->>'unitPrice')::numeric, 0))
        from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'items') = 'array'
                                       then s.metadata->'invoice'->'items' else '[]'::jsonb end) i
      ), 0) as invoice_total,
      coalesce((s.metadata->'invoice'->>'paid')::boolean, false) as invoice_paid,
      coalesce(s.metadata->'invoice'->>'currency', 'GBP') as invoice_currency,
      coalesce(s.metadata->'sender'->>'country', 'United Kingdom') as country,
      trim(coalesce(s.metadata->'sender'->>'address', '') || ', ' || coalesce(s.metadata->'sender'->>'city', '')) as pickup_address
    from public.shipments s
    where s.deleted_at is null
  ),
  keyed as (
    select *, coalesce(user_id::text, email, phone, shipment_id::text) as dedupe_key
    from shipment_identities
  ),
  quote_identities as (
    select q.id as quote_id, q.user_id,
      nullif(regexp_replace(coalesce(q.phone_number, ''), '[^0-9]', '', 'g'), '') as phone,
      q.created_at
    from public.custom_quotes q
  ),
  profile_rows as (
    select p.id, p.full_name, p.email, p.phone_number, p.country, p.customer_code,
           trim(coalesce(p.pickup_address, '') || ', ' || coalesce(p.pickup_city, '')) as pickup_address,
           p.created_at
    from public.profiles p
    where coalesce(p.is_admin, false) = false
      and lower(coalesce(p.role, 'customer')) not in ('admin', 'driver', 'finance', 'logistics')
  ),
  merged as (
    select
      coalesce(pr.id::text, k.dedupe_key) as key,
      coalesce(pr.full_name, max(k.name)) as full_name,
      coalesce(pr.email, max(k.email)) as email,
      coalesce(pr.phone_number, max(k.phone)) as phone,
      coalesce(pr.country, max(k.country)) as country,
      coalesce(pr.customer_code, max(k.customer_reference)) as customer_reference,
      coalesce(nullif(pr.pickup_address, ','), max(nullif(k.pickup_address, ','))) as pickup_address,
      count(distinct k.shipment_id) as shipment_count,
      sum(case when not k.invoice_paid then k.invoice_total else 0 end) as outstanding,
      max(k.invoice_currency) as currency,
      greatest(coalesce(max(k.created_at), 'epoch'::timestamptz), coalesce(pr.created_at, 'epoch'::timestamptz)) as last_activity,
      pr.id as profile_id
    from profile_rows pr
    full outer join keyed k
      on k.user_id = pr.id
      or (k.user_id is null and k.email is not null and k.email = lower(coalesce(pr.email, '')))
      or (k.user_id is null and k.email is null and k.phone is not null
          and k.phone = regexp_replace(coalesce(pr.phone_number, ''), '[^0-9]', '', 'g'))
    group by pr.id, pr.full_name, pr.email, pr.phone_number, pr.country, pr.customer_code, pr.pickup_address, pr.created_at, coalesce(pr.id::text, k.dedupe_key)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', m.key,
    'profileId', m.profile_id,
    'fullName', coalesce(m.full_name, 'Unknown customer'),
    'email', m.email,
    'phone', m.phone,
    'country', m.country,
    'customerReference', m.customer_reference,
    'pickupAddress', m.pickup_address,
    'shipmentCount', m.shipment_count,
    'quoteCount', coalesce((
      select count(*) from quote_identities qi
      where (m.profile_id is not null and qi.user_id = m.profile_id)
         or (m.profile_id is null and qi.phone is not null and qi.phone = m.phone)), 0),
    'outstanding', coalesce(m.outstanding, 0),
    'currency', coalesce(m.currency, 'GBP'),
    'lastActivity', m.last_activity
  ) order by m.last_activity desc), '[]'::jsonb)
  into v_result
  from merged m;

  return v_result;
end $$;
grant execute on function public.admin_customer_records() to authenticated;

-- ---------------------------------------------------------------------------
-- M. Realtime for quotes (customer app updates live)
-- ---------------------------------------------------------------------------

do $$ begin alter publication supabase_realtime add table public.custom_quotes; exception when duplicate_object then null; end $$;
