-- Invoices: mark paid / part paid / not paid, verify driver invoices, and let
-- finance edit them.
--
-- What was wrong:
--
-- * An invoice's payment state is derived from metadata.invoice.payments, but
--   the only way to change it from the website was to write the whole shipments
--   row, which RLS allows for is_admin accounts only. Finance-role accounts
--   could open the Invoices tab and then fail on every save.
-- * A driver who takes money at the door records it as a payment, so a
--   driver's invoice already reads "partial". Setting the legacy `paid` flag on
--   top of that changes nothing, which is how "mark as paid" appeared to do
--   nothing on exactly the invoices drivers raise.
-- * Driver-recorded payments carry no id, so no screen could remove one.
-- * The driver's own copy in driver_invoices never learned about payments made
--   afterwards, so it said "issued" for ever.
--
-- Every write below is SECURITY DEFINER behind the same admin-or-finance gate
-- that record_invoice_payment already uses, locks the shipment, keeps the
-- payments ledger as the single source of truth, logs a shipment event, and
-- brings the driver's copy into step.

-- ── Arithmetic, identical to src/utils/invoiceTotals.ts ────────────────────

-- Numbers in invoice JSON arrive as numbers or strings; an unusable one counts
-- as nothing, the same as Number(x) || 0 in the apps.
create or replace function public.invoice_numeric(p_value text)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select case when btrim(coalesce(p_value, '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
              then btrim(p_value)::numeric else 0 end
$$;

create or replace function public.invoice_subtotal(p_invoice jsonb)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select coalesce(sum(public.invoice_numeric(x->>'quantity') * public.invoice_numeric(x->>'unitPrice')), 0)
    from jsonb_array_elements(case when jsonb_typeof(p_invoice->'items') = 'array'
                                   then p_invoice->'items' else '[]'::jsonb end) x
$$;

create or replace function public.invoice_total(p_invoice jsonb)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select round(greatest(0, public.invoice_subtotal(p_invoice) - public.invoice_numeric(p_invoice->>'discount'))
         * (1 + greatest(0, public.invoice_numeric(p_invoice->>'taxRate')) / 100), 2)
$$;

create or replace function public.invoice_paid_amount(p_invoice jsonb)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select coalesce(sum(public.invoice_numeric(x->>'amount')), 0)
    from jsonb_array_elements(case when jsonb_typeof(p_invoice->'payments') = 'array'
                                   then p_invoice->'payments' else '[]'::jsonb end) x
$$;

-- Every payment gets an id, so any single one can be removed later.
create or replace function public.invoice_payments_with_ids(p_invoice jsonb)
returns jsonb
language sql
volatile
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(
           case when nullif(btrim(coalesce(e->>'id', '')), '') is null
                then e || jsonb_build_object('id', gen_random_uuid()::text) else e end
           order by ord), '[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(p_invoice->'payments') = 'array'
                                   then p_invoice->'payments' else '[]'::jsonb end) with ordinality t(e, ord)
$$;

create or replace function public.driver_invoice_status(p_total numeric, p_paid numeric, p_due date)
returns text
language sql
stable
set search_path to 'public'
as $$
  select case when p_total > 0 and p_paid >= p_total - 0.005 then 'paid'
              when p_paid > 0 then 'partial'
              when p_due is not null and p_due < current_date then 'overdue'
              else 'issued' end
$$;

-- ── The driver's copy ───────────────────────────────────────────────────────

-- Returns null, or why the driver's copy could not be updated. A failure here
-- must not undo the office's change: metadata.invoice is the record every
-- screen and the customer reads; driver_invoices is the driver's receipt.
create or replace function public.sync_driver_invoice_from_shipment(p_shipment_id uuid, p_invoice jsonb)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_subtotal numeric := public.invoice_subtotal(p_invoice);
  v_total numeric := public.invoice_total(p_invoice);
  v_paid numeric := public.invoice_paid_amount(p_invoice);
  v_deleted boolean := p_invoice->>'deletedAt' is not null;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  update public.driver_invoices d set
    line_items = case when jsonb_typeof(p_invoice->'items') = 'array' then p_invoice->'items' else d.line_items end,
    subtotal = v_subtotal,
    discount = public.invoice_numeric(p_invoice->>'discount'),
    tax = greatest(0, v_total - greatest(0, v_subtotal - public.invoice_numeric(p_invoice->>'discount'))),
    total = v_total,
    currency = coalesce(nullif(btrim(coalesce(p_invoice->>'currency', '')), ''), d.currency),
    status = case when v_deleted then 'void' else public.driver_invoice_status(v_total, v_paid, d.due_date) end,
    voided_at = case when v_deleted then coalesce(d.voided_at, now()) end,
    void_reason = case when v_deleted then coalesce(d.void_reason, 'Invoice deleted by the office') end,
    updated_at = now()
  where d.shipment_id = p_shipment_id;
  return null;
exception when others then
  return sqlerrm;
end $$;

revoke execute on function public.sync_driver_invoice_from_shipment(uuid, jsonb) from public, anon, authenticated;

-- ── Mark fully paid, partially paid or not paid ─────────────────────────────

create or replace function public.set_invoice_payment_status(p_shipment_id uuid, p_status text, p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_before jsonb;
  v_payments jsonb;
  v_total numeric;
  v_paid_before numeric;
  v_balance numeric;
  v_amount numeric := 0;
  v_entry jsonb;
  v_actor uuid := auth.uid();
  v_now text := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF');
  v_p jsonb := coalesce(p, '{}'::jsonb);
  v_sync text;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('paid', 'partial', 'unpaid') then
    raise exception 'Choose paid, partial or unpaid' using errcode = '22023';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then
    raise exception 'Shipment not found' using errcode = 'P0002';
  end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  if nullif(btrim(coalesce(v_invoice->>'invoiceNumber', '')), '') is null then
    raise exception 'Raise the invoice before marking it' using errcode = '22023';
  end if;
  if v_invoice->>'deletedAt' is not null then
    raise exception 'Restore this invoice before marking it' using errcode = '22023';
  end if;

  v_before := public.invoice_payments_with_ids(v_invoice);
  v_payments := v_before;
  v_total := public.invoice_total(v_invoice);
  v_paid_before := public.invoice_paid_amount(v_invoice);
  v_balance := greatest(0, round(v_total - v_paid_before, 2));

  if p_status = 'unpaid' then
    -- Not paid means nothing was received, so the recorded payments go. They
    -- are kept in the shipment event below, not lost.
    v_payments := '[]'::jsonb;
  else
    if p_status = 'paid' then
      v_amount := v_balance;
    else
      v_amount := round(public.invoice_numeric(v_p->>'amount'), 2);
      if v_total <= 0 then
        raise exception 'This invoice has no total to part-pay' using errcode = '22023';
      end if;
      if v_amount <= 0 then
        raise exception 'Enter the amount received' using errcode = '22023';
      end if;
      if v_amount >= v_balance - 0.005 then
        raise exception 'That clears the balance of %, so mark it fully paid instead',
          to_char(v_balance, 'FM999999990.00') using errcode = '22023';
      end if;
    end if;

    if v_amount > 0.005 then
      v_entry := jsonb_strip_nulls(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'amount', v_amount,
        'method', coalesce(nullif(btrim(coalesce(v_p->>'method', '')), ''), 'cash'),
        'date', coalesce(nullif(btrim(coalesce(v_p->>'date', '')), ''), to_char(now(), 'YYYY-MM-DD')),
        'reference', nullif(btrim(coalesce(v_p->>'reference', '')), ''),
        'note', coalesce(nullif(btrim(coalesce(v_p->>'note', '')), ''),
                         case when p_status = 'paid' then 'Marked fully paid' else 'Part payment' end),
        'recordedBy', v_actor::text,
        'recordedAt', v_now));
      v_payments := v_payments || jsonb_build_array(v_entry);
    end if;
  end if;

  v_invoice := v_invoice || jsonb_build_object(
    'payments', v_payments,
    -- The legacy flag, kept in step: an invoice with no total can still be
    -- settled, and older readers look at nothing else.
    'paid', p_status = 'paid',
    'paymentStatusSetAt', v_now,
    'paymentStatusSetBy', v_actor::text);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = p_shipment_id;

  v_sync := public.sync_driver_invoice_from_shipment(p_shipment_id, v_invoice);

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id, 'invoice_marked_' || p_status, v_actor, jsonb_strip_nulls(jsonb_build_object(
    'invoiceNumber', v_invoice->>'invoiceNumber',
    'total', v_total,
    'paidBefore', v_paid_before,
    'paidAfter', public.invoice_paid_amount(v_invoice),
    'entry', v_entry,
    'removedPayments', case when p_status = 'unpaid' and jsonb_array_length(v_before) > 0 then v_before end,
    'driverInvoiceSync', v_sync)));

  return v_invoice;
end $$;

-- ── Verify an invoice (the driver's, usually) ───────────────────────────────

create or replace function public.verify_shipment_invoice(p_shipment_id uuid, p_verified boolean default true, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_actor uuid := auth.uid();
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then
    raise exception 'Shipment not found' using errcode = 'P0002';
  end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  if nullif(btrim(coalesce(v_invoice->>'invoiceNumber', '')), '') is null then
    raise exception 'There is no invoice on this shipment to verify' using errcode = '22023';
  end if;

  v_invoice := (v_invoice - 'verifiedAt' - 'verifiedBy' - 'verificationNote')
    || jsonb_build_object('payments', public.invoice_payments_with_ids(v_invoice));
  if coalesce(p_verified, true) then
    v_invoice := v_invoice || jsonb_strip_nulls(jsonb_build_object(
      'verifiedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
      'verifiedBy', v_actor::text,
      'verificationNote', nullif(btrim(coalesce(p_note, '')), '')));
  end if;

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = p_shipment_id;

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id,
          case when coalesce(p_verified, true) then 'invoice_verified' else 'invoice_verification_removed' end,
          v_actor,
          jsonb_strip_nulls(jsonb_build_object('invoiceNumber', v_invoice->>'invoiceNumber',
                                               'note', nullif(btrim(coalesce(p_note, '')), ''))));

  return v_invoice;
end $$;

-- ── Edit a raised invoice ───────────────────────────────────────────────────

create or replace function public.save_shipment_invoice(p_shipment_id uuid, p_invoice jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ship public.shipments%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_total numeric;
  v_paid numeric;
  v_actor uuid := auth.uid();
  v_sync text;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if p_invoice is null or jsonb_typeof(p_invoice) <> 'object' then
    raise exception 'Invoice details are missing' using errcode = '22023';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then
    raise exception 'Shipment not found' using errcode = 'P0002';
  end if;

  v_old := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  if nullif(btrim(coalesce(v_old->>'invoiceNumber', '')), '') is null then
    raise exception 'Create the invoice before editing it' using errcode = '22023';
  end if;

  -- Who issued, confirmed and verified it, whether it is deleted, and the paid
  -- flag are each set by their own action, never by a form that happened to
  -- carry an old copy of them.
  v_new := v_old || (p_invoice - array[
    'issuedAt', 'issuedBy', 'driverConfirmedAt', 'driverConfirmedBy', 'verifiedAt', 'verifiedBy',
    'verificationNote', 'deletedAt', 'paid', 'paymentStatusSetAt', 'paymentStatusSetBy']);

  if nullif(btrim(coalesce(v_new->>'invoiceNumber', '')), '') is null then
    v_new := v_new || jsonb_build_object('invoiceNumber', v_old->>'invoiceNumber');
  end if;
  if coalesce(jsonb_array_length(case when jsonb_typeof(v_new->'items') = 'array' then v_new->'items' end), 0) = 0 then
    raise exception 'An invoice needs at least one line' using errcode = '22023';
  end if;

  v_new := v_new || jsonb_build_object('payments', public.invoice_payments_with_ids(v_new));
  v_total := public.invoice_total(v_new);
  v_paid := public.invoice_paid_amount(v_new);
  v_new := v_new || jsonb_build_object('paid',
    (v_total > 0 and v_paid >= v_total - 0.005)
    -- An old invoice marked paid before payments were itemised stays paid.
    or (v_paid = 0 and coalesce(v_old->>'paid', '') = 'true'));

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_new, true),
         updated_at = now()
   where id = p_shipment_id;

  v_sync := public.sync_driver_invoice_from_shipment(p_shipment_id, v_new);

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id, 'invoice_edited', v_actor, jsonb_strip_nulls(jsonb_build_object(
    'invoiceNumber', v_new->>'invoiceNumber', 'total', v_total, 'paid', v_paid, 'driverInvoiceSync', v_sync)));

  return v_new;
end $$;

-- ── Delete (reversibly) or restore ──────────────────────────────────────────

create or replace function public.set_shipment_invoice_deleted(p_shipment_id uuid, p_deleted boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_actor uuid := auth.uid();
  v_sync text;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then
    raise exception 'Shipment not found' using errcode = 'P0002';
  end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  if nullif(btrim(coalesce(v_invoice->>'invoiceNumber', '')), '') is null then
    raise exception 'There is no invoice on this shipment' using errcode = '22023';
  end if;

  -- Deleting keeps the invoice and its payments; it drops out of every list
  -- and the customer's account, and Restore brings it back exactly as it was.
  v_invoice := v_invoice || jsonb_build_object('deletedAt',
    case when coalesce(p_deleted, true) then to_jsonb(to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')) else 'null'::jsonb end);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = p_shipment_id;

  v_sync := public.sync_driver_invoice_from_shipment(p_shipment_id, v_invoice);

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id,
          case when coalesce(p_deleted, true) then 'invoice_deleted' else 'invoice_restored' end,
          v_actor,
          jsonb_strip_nulls(jsonb_build_object('invoiceNumber', v_invoice->>'invoiceNumber', 'driverInvoiceSync', v_sync)));

  return v_invoice;
end $$;

grant execute on function public.set_invoice_payment_status(uuid, text, jsonb) to authenticated;
grant execute on function public.verify_shipment_invoice(uuid, boolean, text) to authenticated;
grant execute on function public.save_shipment_invoice(uuid, jsonb) to authenticated;
grant execute on function public.set_shipment_invoice_deleted(uuid, boolean) to authenticated;
