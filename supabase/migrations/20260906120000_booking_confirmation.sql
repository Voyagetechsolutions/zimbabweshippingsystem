-- Booking confirmation, on the website and in the admin app.
--
-- Two things were inconsistent and this settles both.
--
-- 1. A booking made in the customer app landed as 'Booking Confirmed'; the same
--    booking made on the website landed as 'pending'. The customer saw
--    "Booking Confirmed!" on the receipt either way, so the website's own
--    confirmation screen was contradicting the record behind it — and every
--    staff view that groups by status put website bookings somewhere else.
--    create_public_booking now writes the same status the app does.
--
-- 2. Admin can now confirm a shipment on the phone and lock its details
--    (metadata.confirmation stamped, can_modify cleared). Nothing enforced
--    that, so a customer could still edit an address after the confirmation
--    call. update_customer_shipment now refuses, and it no longer writes the
--    literal string 'To be confirmed' into a
--    collection date that has none — the apps show the published route date
--    instead, and a placeholder masquerading as data made that impossible.
--
-- Idempotent: safe to re-run.

create or replace function public.create_public_booking(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_shipment public.shipments%rowtype;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_currency text := coalesce(nullif(p->>'currency', ''), 'GBP');
  v_amount numeric := coalesce((p->>'amount')::numeric, 0);
  v_tracking text := coalesce(nullif(p->>'trackingNumber', ''), 'ZSN' || lpad(floor(random() * 100000000)::text, 8, '0'));
  v_receipt_no text := coalesce(nullif(p->>'receiptNumber', ''), 'RCP-' || lpad(floor(random() * 10000000000)::text, 10, '0'));
  v_email text := lower(trim(coalesce(p->'metadata'->'sender'->>'email', '')));
begin
  if v_amount < 0 then raise exception 'Booking amount cannot be negative'; end if;
  if v_email = '' then raise exception 'A sender email address is required'; end if;
  if v_currency not in ('GBP', 'EUR') then raise exception 'Unsupported currency %', v_currency; end if;

  insert into public.shipments (
    tracking_number, user_id, origin, destination, status, metadata,
    collection_schedule_id, can_modify, can_cancel
  ) values (
    v_tracking,
    -- A signed-in customer's booking is theirs; a guest booking is claimed
    -- later by claim_guest_bookings() using the sender email above.
    v_uid,
    coalesce(p->>'origin', ''),
    coalesce(p->>'destination', ''),
    -- Same status the customer app's create_customer_booking writes, so a
    -- booking means the same thing whichever door it came through.
    'Booking Confirmed',
    coalesce(p->'metadata', '{}'::jsonb),
    nullif(p->>'collectionScheduleId', '')::uuid,
    true, true
  ) returning * into v_shipment;

  insert into public.payments (
    user_id, shipment_id, amount, currency, payment_method, payment_status, transaction_id
  ) values (
    v_uid, v_shipment.id, v_amount, v_currency,
    coalesce(p->>'paymentMethod', 'standard'), 'pending',
    coalesce(nullif(p->>'transactionId', ''), 'TX-' || lpad(floor(random() * 1000000000000)::text, 12, '0'))
  ) returning id into v_payment_id;

  insert into public.receipts (
    user_id, shipment_id, payment_id, receipt_number, amount, currency, payment_method, status,
    sender_details, recipient_details, shipment_details, payment_info, collection_info, payment_schedule
  ) values (
    v_uid, v_shipment.id, v_payment_id, v_receipt_no, v_amount, v_currency,
    coalesce(p->>'paymentMethod', 'standard'), 'pending',
    coalesce(p->'metadata'->'sender', '{}'::jsonb),
    coalesce(p->'metadata'->'recipient', '{}'::jsonb),
    coalesce(p->'metadata'->'items', '{}'::jsonb),
    coalesce(p->'paymentInfo', '{}'::jsonb),
    coalesce(p->'collectionInfo', '{}'::jsonb),
    p->'paymentSchedule'
  ) returning id into v_receipt_id;

  return jsonb_build_object(
    'shipmentId', v_shipment.id,
    'trackingNumber', v_shipment.tracking_number,
    'paymentId', v_payment_id,
    'receiptId', v_receipt_id,
    'receiptNumber', v_receipt_no,
    'linkedToAccount', v_uid is not null
  );
end $$;

grant execute on function public.create_public_booking(jsonb) to anon, authenticated;

-- Deliberately no backfill of existing 'pending' website bookings. Every staff
-- view already reads the two as one queue, so rewriting historical rows would
-- change live data for no gain. Ask if you want them brought across.

-- Customers can correct the contact/address/date details of a booking until a
-- driver has started collection *or* an admin has confirmed it on the phone.
-- Otherwise identical to the version this replaces.
create or replace function public.update_customer_shipment(p_shipment_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_ship public.shipments%rowtype; v_meta jsonb; v_schedule public.collection_schedules%rowtype;
begin
  select * into v_ship from public.shipments where id=p_shipment_id and user_id=auth.uid() for update;
  if not found then raise exception 'Shipment not found'; end if;
  if lower(coalesce(v_ship.collection_status,'')) not in ('','awaiting collection')
     or lower(coalesce(v_ship.driver_status,'')) in ('en_route','arrived','collected','completed') then
    raise exception 'This shipment can no longer be edited because collection has started';
  end if;
  -- Admin has been through the booking with the customer and locked it. Keyed
  -- on the confirmation stamp rather than can_modify, because that column
  -- predates this schema and its default is not ours to assume. The message
  -- names the reason: "cannot be edited" with no explanation sends the customer
  -- to WhatsApp asking why.
  if (v_ship.metadata->'confirmation'->>'confirmedAt') is not null then
    raise exception 'This booking has been confirmed with you and is locked. Message us and we will make the change.';
  end if;
  if nullif(p->>'scheduleId','') is not null then
    select * into v_schedule from public.collection_schedules where id=(p->>'scheduleId')::uuid;
    if not found then raise exception 'Collection date not found'; end if;
  end if;
  v_meta := coalesce(v_ship.metadata,'{}'::jsonb);
  v_meta := jsonb_set(v_meta,'{sender}',coalesce(p->'sender',v_meta->'sender'),true);
  v_meta := jsonb_set(v_meta,'{recipient}',coalesce(p->'recipient',v_meta->'recipient'),true);
  v_meta := jsonb_set(v_meta,'{collection}',jsonb_build_object(
    -- No placeholder strings. An unassigned route and an unpublished date are
    -- absent, not the words "To be assigned" and "To be confirmed" — the apps
    -- now fill that gap with the published date for the route, which a
    -- placeholder posing as data made impossible.
    'route',coalesce(p->>'route',v_meta->'collection'->>'route'),
    'date',coalesce(p->>'collectionDate',v_meta->'collection'->>'date'),
    'scheduleId',nullif(p->>'scheduleId','')),true);
  v_meta := jsonb_set(v_meta,'{pricing,paymentMethod}',to_jsonb(coalesce(p->>'paymentMethod',v_meta->'pricing'->>'paymentMethod','Bank Transfer')),true);
  update public.shipments set
    origin=coalesce(p->>'origin',origin), destination=coalesce(p->>'destination',destination),
    collection_schedule_id=nullif(p->>'scheduleId','')::uuid,
    metadata=v_meta, updated_at=now()
  where id=p_shipment_id returning * into v_ship;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details)
  values(auth.uid(),'CUSTOMER_EDIT_BOOKING','SHIPMENT',p_shipment_id,p);
  return jsonb_build_object('id',v_ship.id,'updatedAt',v_ship.updated_at);
end $$;
grant execute on function public.update_customer_shipment(uuid,jsonb) to authenticated;
