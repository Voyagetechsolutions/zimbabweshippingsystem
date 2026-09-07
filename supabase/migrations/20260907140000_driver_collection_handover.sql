-- The collection itself: identity at the door, the invoice, and the lock.
--
-- Three rules from the agreed flow that the existing routines got wrong:
--
--   1. Identity is QR *or* PIN, never both. complete_driver_handover demanded a
--      scanned QR **and** a matching six-digit code, so a customer whose phone
--      was flat could not be collected from at all. Scanning proves the driver
--      is at the right shipment; the code proves it when there is nothing to
--      scan. Either is enough, neither alone is optional.
--
--   2. Photos are optional. The routine refused to complete a collection
--      without a 'pickup_departure' photo, which is a hard block on a driver
--      whose camera or storage fails, for evidence that is nice to have rather
--      than required.
--
--   3. Drivers may correct the whole invoice, not just the wording. The old
--      routine locked quantity and price ("Drivers may correct the wording
--      only"), which leaves the invoice wrong whenever the goods at the door
--      differ from the booking - the exact case the driver is there to catch.
--      They may now change descriptions, quantities, prices, add and remove
--      lines, and record what was actually paid.
--
-- What replaces the old locks is a real one: once the driver confirms, the
-- invoice is closed to them for good. Admin and finance can still edit it.

-- ---------------------------------------------------------------------------
-- A. Every booking starts with a draft invoice and a draft delivery note
-- ---------------------------------------------------------------------------

/**
 * A booking is not just a shipment: it is an invoice waiting to be confirmed
 * and a delivery note waiting to be filled in. Creating both up front is what
 * lets the website, the staff app and the customer all show the same paperwork
 * from the moment the booking is confirmed.
 *
 * Deliberately a trigger rather than an edit to each booking routine: bookings
 * arrive from the website, the customer app and manual admin entry, and only a
 * trigger catches all three (and anything added later).
 *
 * A quote that already priced the job keeps its invoice untouched. No due date
 * is invented — an invented one would make the invoice read "overdue" on a day
 * nobody chose.
 */
create or replace function public.ensure_booking_paperwork()
returns trigger
language plpgsql
set search_path = public
as $$
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

    new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'invoice', jsonb_build_object(
        'invoiceNumber', 'INV-' || to_char(now(), 'YYYYMMDD') || '-' ||
                         upper(substr(replace(new.id::text, '-', ''), 1, 6)),
        'issueDate', to_char(now(), 'YYYY-MM-DD'),
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
end $$;

drop trigger if exists shipments_ensure_booking_paperwork on public.shipments;
create trigger shipments_ensure_booking_paperwork
  before insert on public.shipments
  for each row
  execute function public.ensure_booking_paperwork();

-- ---------------------------------------------------------------------------
-- A2. Opening the shipment with the code instead of the scan
-- ---------------------------------------------------------------------------

-- The QR scan already had somewhere to record itself; the code did not, so the
-- app could only ever unlock a stop by scanning. This is the code's equivalent.
alter table public.driver_run_stops
  add column if not exists code_verified_at timestamptz;

/**
 * Open the shipment by the six-digit code from the customer's app.
 *
 * The counterpart to verify_driver_stop_qr, for the customer whose phone is
 * flat, who cannot find the QR, or who reads the code out over the phone
 * because they had to leave a neighbour with the parcels.
 */
create or replace function public.verify_driver_stop_code(
  p_stop_id uuid,
  p_code text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_stop public.driver_run_stops%rowtype;
  v_run public.driver_runs%rowtype;
  v_ship public.shipments%rowtype;
  v_expected text;
  v_code text := trim(coalesce(p_code, ''));
begin
  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if v_run.driver_id <> auth.uid() and not public.is_operations_admin() then
    raise exception 'Stop is not assigned to you' using errcode = '42501';
  end if;

  select * into v_ship from public.shipments where id = v_stop.shipment_id;
  v_expected := case when v_stop.stop_type = 'collection'
                     then v_ship.collection_code else v_ship.delivery_code end;

  if v_expected is null then
    raise exception 'This shipment has no handover code. Scan the customer QR code instead.';
  end if;
  if v_code <> v_expected then
    raise exception 'That code does not match this shipment';
  end if;

  update public.driver_run_stops
     set code_verified_at = now(), updated_at = now()
   where id = v_stop.id;

  return jsonb_build_object('stopId', v_stop.id, 'verified', true, 'method', 'code');
end $$;

grant execute on function public.verify_driver_stop_code(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- B. The driver's invoice
-- ---------------------------------------------------------------------------

/**
 * Save, and optionally confirm, the invoice for a collection.
 *
 * `p_confirm` is the point of no return for the driver: it stamps
 * driverConfirmedAt, and every later call from a driver is refused. Admin and
 * finance keep full access, because a confirmed invoice still has to be
 * correctable when a customer disputes it.
 *
 * Money taken at the door is appended to metadata.invoice.payments, which is
 * where every other surface already reads it from — so paid / partially paid
 * follows automatically on the customer's app, the admin dashboard, finance
 * and the website, with no second source of truth to keep in step.
 */
create or replace function public.create_driver_invoice(
  p_stop_id uuid,
  p_line_items jsonb,
  p_discount numeric default 0,
  p_tax_rate numeric default 0,
  p_currency text default 'GBP',
  p_notes text default null,
  p_amount_paid numeric default null,
  p_payment_method text default null,
  p_confirm boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_stop public.driver_run_stops%rowtype;
  v_run public.driver_runs%rowtype;
  v_ship public.shipments%rowtype;
  v_invoice public.driver_invoices%rowtype;
  v_meta_invoice jsonb;
  v_items jsonb;
  v_payments jsonb;
  v_discount numeric;
  v_tax_rate numeric;
  v_currency text;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_number text;
  v_is_staff boolean := public.is_operations_admin() or public.is_finance_staff();
begin
  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if not v_is_staff and (v_run.driver_id <> auth.uid() or v_stop.stop_type <> 'collection') then
    raise exception 'Pickup driver access required';
  end if;
  if v_stop.status <> 'arrived' and not v_is_staff then
    raise exception 'Mark the collection as arrived first';
  end if;

  select * into v_ship from public.shipments where id = v_stop.shipment_id for update;
  v_meta_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);

  -- The lock. Confirmed is confirmed.
  if not v_is_staff and nullif(v_meta_invoice->>'driverConfirmedAt', '') is not null then
    raise exception 'This invoice was confirmed and can no longer be changed. Ask admin or finance to amend it.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'Add at least one invoice item';
  end if;

  -- Normalise every line, so a missing quantity cannot silently zero a price.
  select coalesce(jsonb_agg(jsonb_build_object(
           'description', coalesce(nullif(trim(x->>'description'), ''), 'Item'),
           'quantity', greatest(0, coalesce((x->>'quantity')::numeric, 1)),
           'unitPrice', greatest(0, coalesce((x->>'unitPrice')::numeric, 0)))), '[]'::jsonb)
    into v_items
    from jsonb_array_elements(p_line_items) x;

  v_discount := greatest(0, coalesce(p_discount, 0));
  v_tax_rate := greatest(0, coalesce(p_tax_rate, 0));
  v_currency := upper(coalesce(nullif(trim(p_currency), ''), v_meta_invoice->>'currency', 'GBP'));

  select coalesce(sum(coalesce((x->>'quantity')::numeric, 0) * coalesce((x->>'unitPrice')::numeric, 0)), 0)
    into v_subtotal from jsonb_array_elements(v_items) x;
  v_tax := greatest(0, v_subtotal - v_discount) * v_tax_rate / 100;
  v_total := greatest(0, v_subtotal - v_discount) + v_tax;

  v_number := coalesce(nullif(v_meta_invoice->>'invoiceNumber', ''),
                       'INV-' || to_char(now(), 'YYYYMMDD') || '-' ||
                       upper(substr(replace(v_stop.id::text, '-', ''), 1, 6)));

  -- Money taken at the door, appended rather than replaced: a part payment now
  -- and another later are two entries, and the running total is their sum.
  v_payments := coalesce(v_meta_invoice->'payments', '[]'::jsonb);
  if coalesce(p_amount_paid, 0) > 0 then
    v_payments := v_payments || jsonb_build_array(jsonb_build_object(
      'amount', p_amount_paid,
      'method', coalesce(nullif(trim(p_payment_method), ''), 'Cash on collection'),
      'date', to_char(now(), 'YYYY-MM-DD'),
      'recordedBy', 'driver'));
  end if;

  insert into public.driver_invoices(
    shipment_id, stop_id, driver_id, invoice_number, currency,
    line_items, subtotal, discount, tax, total, notes)
  values (v_stop.shipment_id, v_stop.id, coalesce(v_run.driver_id, auth.uid()), v_number, v_currency,
          v_items, v_subtotal, v_discount, v_tax, v_total, p_notes)
  on conflict (stop_id) do update set
    line_items = excluded.line_items, subtotal = excluded.subtotal,
    discount = excluded.discount, tax = excluded.tax, total = excluded.total,
    currency = excluded.currency, notes = excluded.notes, updated_at = now()
  returning * into v_invoice;

  v_meta_invoice := v_meta_invoice || jsonb_build_object(
    'invoiceNumber', v_invoice.invoice_number,
    'issueDate', coalesce(v_meta_invoice->>'issueDate', to_char(now(), 'YYYY-MM-DD')),
    'items', v_items,
    'discount', v_discount,
    'taxRate', v_tax_rate,
    'currency', v_currency,
    'payments', v_payments,
    'notes', coalesce(p_notes, v_meta_invoice->>'notes'));

  if p_confirm then
    v_meta_invoice := v_meta_invoice || jsonb_build_object(
      'driverConfirmedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
      'driverConfirmedBy', auth.uid(),
      -- sentAt is what moves it out of "draft" for every reader.
      'sentAt', coalesce(v_meta_invoice->>'sentAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')));
  end if;

  update public.shipments
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('invoice', v_meta_invoice),
         updated_at = now()
   where id = v_stop.shipment_id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_confirm then 'DRIVER_INVOICE_CONFIRM' else 'DRIVER_INVOICE_SAVE' end,
          'DRIVER_INVOICE', v_invoice.id,
          jsonb_build_object('stopId', v_stop.id, 'total', v_total,
                             'paid', coalesce(p_amount_paid, 0), 'confirmed', p_confirm));

  return to_jsonb(v_invoice) || jsonb_build_object('confirmed', p_confirm, 'invoice', v_meta_invoice);
end $$;

grant execute on function public.create_driver_invoice(uuid, jsonb, numeric, numeric, text, text, numeric, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- C. Completing the stop
-- ---------------------------------------------------------------------------

create or replace function public.complete_driver_handover(
  p_stop_id uuid,
  p_customer_code text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_stop public.driver_run_stops%rowtype;
  v_run public.driver_runs%rowtype;
  v_ship public.shipments%rowtype;
  v_now timestamptz := now();
  v_proofs int := 0;
  v_note text;
  v_code text := trim(coalesce(p_customer_code, ''));
  v_scanned boolean;
  v_expected text;
begin
  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if v_run.driver_id <> auth.uid() then raise exception 'Stop is not assigned to you'; end if;
  if v_stop.status <> 'arrived' then raise exception 'Mark the stop as arrived first'; end if;

  select * into v_ship from public.shipments where id = v_stop.shipment_id for update;
  select count(*) into v_proofs from public.driver_proofs where stop_id = v_stop.id;

  -- Identity: the scan or the code, whichever the customer could manage.
  -- A code already checked when the shipment was opened counts, so the driver
  -- is not asked for the same six digits twice.
  v_scanned := v_stop.qr_verified_at is not null or v_stop.code_verified_at is not null;
  v_expected := case when v_stop.stop_type = 'collection'
                     then v_ship.collection_code else v_ship.delivery_code end;

  if not v_scanned then
    if v_code = '' then
      raise exception 'Scan the customer QR code, or enter the six-digit code from their app';
    end if;
    if v_expected is null or v_code <> v_expected then
      raise exception 'That code does not match this shipment';
    end if;
  end if;

  if v_stop.stop_type = 'collection' then
    -- The invoice must be confirmed, not merely drafted: confirming it is the
    -- driver agreeing what was collected and what was paid.
    if nullif(v_ship.metadata->'invoice'->>'driverConfirmedAt', '') is null then
      raise exception 'Confirm the invoice before completing the collection';
    end if;
    update public.shipments
       set status = 'Collected', driver_status = 'collected',
           collected_at = v_now, collected_by = auth.uid(), updated_at = v_now
     where id = v_ship.id;
  else
    v_note := 'DN-' || to_char(now(), 'YYYYMMDD') || '-' ||
              upper(substr(replace(v_stop.id::text, '-', ''), 1, 6));
    insert into public.delivery_notes(
      shipment_id, stop_id, driver_id, note_number, delivery_address,
      delivered_at, customer_code_verified, proof_count, notes, status)
    values (v_ship.id, v_stop.id, auth.uid(), v_note, v_stop.address,
            v_now, true, v_proofs, p_notes, 'completed')
    on conflict (stop_id) do update set
      delivered_at = v_now, customer_code_verified = true, proof_count = v_proofs,
      notes = p_notes, status = 'completed', updated_at = v_now;
    update public.shipments
       set status = 'Delivered', driver_status = 'delivered',
           delivery_note_status = 'Completed', updated_at = v_now
     where id = v_ship.id;
  end if;

  update public.driver_run_stops
     set status = 'completed', completed_at = v_now, updated_at = v_now
   where id = v_stop.id;

  if not exists (
    select 1 from public.driver_run_stops
    where run_id = v_run.id and status not in ('completed', 'failed')
  ) then
    update public.driver_runs set status = 'completed', completed_at = v_now, updated_at = v_now
     where id = v_run.id;
  end if;

  return jsonb_build_object(
    'shipmentId', v_ship.id,
    'status', case when v_stop.stop_type = 'collection' then 'Collected' else 'Delivered' end,
    'verifiedBy', case when v_scanned then 'qr' else 'code' end,
    'proofCount', v_proofs,
    'deliveryNote', v_note);
end $$;

grant execute on function public.complete_driver_handover(uuid, text, text) to authenticated;
