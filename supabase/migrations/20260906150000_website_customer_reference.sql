-- A website booking gets the same customer reference as an app booking.
--
-- `create_customer_booking` has always stamped one — MAR09260013, from
-- `next_customer_reference` — and the invoice and delivery note are numbered
-- from it (INV-…, DN-…). `create_public_booking` never set the column at all,
-- so a booking made on the website had no reference: staff screens fell back to
-- a computed stand-in, and its documents had nothing stable to be numbered by.
--
-- Same generator, so the two doors produce references from one sequence and
-- cannot collide.
--
-- Idempotent: safe to re-run. Existing rows are left alone — see the note at
-- the end.

-- The routine is SECURITY DEFINER, but a guest books as `anon`; granting
-- execute keeps it callable if the search path is ever resolved as the caller.
grant execute on function public.next_customer_reference(text) to anon, authenticated;

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
  v_name text;
  v_reference text;
begin
  if v_amount < 0 then raise exception 'Booking amount cannot be negative'; end if;
  if v_email = '' then raise exception 'A sender email address is required'; end if;
  if v_currency not in ('GBP', 'EUR') then raise exception 'Unsupported currency %', v_currency; end if;

  -- Same three-letter prefix the app uses: the sender's own name.
  v_name := trim(coalesce(p->'metadata'->'sender'->>'firstName', '') || ' '
                 || coalesce(p->'metadata'->'sender'->>'lastName', ''));
  if v_name = '' then v_name := coalesce(p->'metadata'->'sender'->>'name', ''); end if;
  v_reference := public.next_customer_reference(v_name);

  insert into public.shipments (
    tracking_number, customer_reference, user_id, origin, destination, status, metadata,
    collection_schedule_id, can_modify, can_cancel
  ) values (
    v_tracking,
    v_reference,
    -- A signed-in customer's booking is theirs; a guest booking is claimed
    -- later by claim_guest_bookings() using the sender email above.
    v_uid,
    coalesce(p->>'origin', ''),
    coalesce(p->>'destination', ''),
    -- Same status the customer app's create_customer_booking writes, so a
    -- booking means the same thing whichever door it came through.
    'Booking Confirmed',
    -- The reference is echoed into metadata as well, which is where the older
    -- website admin screens read it from.
    coalesce(p->'metadata', '{}'::jsonb) || jsonb_build_object(
      'customerReference', v_reference,
      'invoice', coalesce(p->'metadata'->'invoice', '{}'::jsonb)
                 || jsonb_build_object('invoiceNumber', 'INV-' || v_reference),
      'deliveryNote', jsonb_build_object('status', 'Draft', 'number', 'DN-' || v_reference)
    ),
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
    'customerReference', v_reference,
    'paymentId', v_payment_id,
    'receiptId', v_receipt_id,
    'receiptNumber', v_receipt_no,
    'linkedToAccount', v_uid is not null
  );
end $$;

grant execute on function public.create_public_booking(jsonb) to anon, authenticated;

-- Existing website bookings keep whatever they have. Back-filling would mint a
-- fresh reference for shipments customers were already given a tracking number
-- for, and would renumber documents that may already be in someone's inbox.
-- The staff apps compute a stable stand-in for those, so nothing is unlabelled.
