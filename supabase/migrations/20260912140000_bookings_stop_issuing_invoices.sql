-- A booking prices the shipment. It does not get to invoice it.
--
-- This rule was already decided and already half-applied: `create_customer_booking`
-- strips `invoiceNumber`, `issueDate` and `dueDate` straight after the customer
-- app books, so the app's bookings arrive correctly un-raised. The other two
-- write paths were missed and have been stamping numbers ever since:
--
--   1. `ensure_booking_paperwork`, the BEFORE INSERT trigger, mints
--      "INV-<yyyymmdd>-<id>" whenever an insert supplies no invoice object.
--   2. `create_public_booking`, the website's booking routine, always sets
--      "INV-<customer reference>".
--
-- Measured on 2026-09-12: 87 of 127 live shipments carried an invoice number
-- and exactly **one** of them had been raised by a person. The other 86 have no
-- `issuedBy`, no `issuedAt` and no `invoice_issued` event, because nobody ever
-- pressed Create.
--
-- `invoiceNumber` is the gate — `isIssued()` in the staff app means "a person
-- raised this", and every list, total, statement and customer-facing view
-- filters on it. So the number is the only thing removed here. The rest of the
-- prefill stays exactly as it was: `metadata.invoice.items` feeds the driver's
-- goods list, the delivery note and two reporting views, and emptying it would
-- break all three.
--
-- `issueDate` goes with the number. An invoice raised next week should not be
-- dated the day the customer booked, and `issue_shipment_invoice` keeps any
-- `issueDate` it finds rather than stamping the day it actually ran.
--
-- Existing rows are deliberately left alone. Un-issuing the 60 unpaid ones
-- would remove 60 charges from customer statements, and the 26 with payments
-- recorded against them are invoices finance has already treated as real.
-- Nothing here rewrites history.

-- ---------------------------------------------------------------------------
-- A. The trigger builds the prefill, not the invoice
-- ---------------------------------------------------------------------------

create or replace function public.ensure_booking_paperwork()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_invoice jsonb := new.metadata->'invoice';
  v_currency text;
  v_amount numeric;
begin
  if v_invoice is null or jsonb_typeof(v_invoice) <> 'object' then
    -- Ireland prices in euro, everywhere else in pounds. `origin` carries
    -- trailing spaces on live rows, hence the trim.
    v_currency := case
      when lower(trim(coalesce(new.origin, ''))) in ('ireland', 'republic of ireland', 'eire')
        then 'EUR' else 'GBP' end;

    v_amount := coalesce(
      (new.metadata->'pricing'->>'finalAmount')::numeric,
      (new.metadata->'pricing'->>'total')::numeric,
      (new.metadata->>'quotedAmount')::numeric,
      0);

    -- Everything an invoice needs except the two fields that would make it an
    -- issued one. `issue_shipment_invoice` fills those in when staff press
    -- Create, and refuses if there is not at least one line to bill.
    new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'invoice', jsonb_build_object(
        'currency', v_currency,
        'items', case when v_amount > 0 then jsonb_build_array(jsonb_build_object(
                        'description', 'Shipping and collection service',
                        'quantity', 1,
                        'unitPrice', v_amount))
                 else '[]'::jsonb end,
        'discount', 0,
        'taxRate', 0,
        'payments', '[]'::jsonb,
        'createdAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')
      ));
  end if;

  if new.delivery_note_status is null then
    new.delivery_note_status := 'Draft';
  end if;

  return new;
end $function$;

-- ---------------------------------------------------------------------------
-- B. The website's booking routine stops minting a number
-- ---------------------------------------------------------------------------
--
-- Reproduced from the live definition with one change, marked below. Note the
-- second effect of the old line: because it always supplied an `invoice`
-- object, `ensure_booking_paperwork` skipped its prefill entirely, so website
-- bookings got a number and nothing else — no currency, no line items. They
-- now get the prefill and no number, which is the right way round.

CREATE OR REPLACE FUNCTION public.create_public_booking(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- A booking prices the shipment; it does not invoice it. This used to add
    -- 'INV-<reference>' here, which made every website booking arrive looking
    -- already raised — and, because supplying an invoice object suppresses
    -- ensure_booking_paperwork, arrive with no line items either. Dropping the
    -- key entirely lets the trigger build the prefill that Create invoice
    -- fills in from.
    (coalesce(p->'metadata', '{}'::jsonb) - 'invoice') || jsonb_build_object(
      'customerReference', v_reference,
      'deliveryNote', jsonb_build_object('status', 'Draft', 'number', 'DN-' || v_reference)
    ) || case
           when coalesce(p->'metadata'->'invoice', '{}'::jsonb) = '{}'::jsonb
             then '{}'::jsonb
           else jsonb_build_object('invoice',
                  (p->'metadata'->'invoice') - 'invoiceNumber' - 'issueDate' - 'dueDate')
         end,
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
end $function$;
