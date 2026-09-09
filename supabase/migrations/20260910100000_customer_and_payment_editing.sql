-- Editing a customer, and the payments that make up their statement.
--
-- A statement line is not a row anyone can create directly: it is either a
-- charge, which is an invoice, or a credit, which is a payment. Invoices are
-- already raised and edited from the shipment. Payments had nowhere at all —
-- the money a customer actually sends lives in `metadata.invoice.payments[]`
-- and nothing could add to it, correct it or take it back. Finance was
-- adjusting the statement by editing the invoice, which is how a payment ends
-- up recorded as a discount.
--
-- So: customers become editable, and payments become first-class.

-- ---------------------------------------------------------------------------
-- A. Editing the customer record
-- ---------------------------------------------------------------------------

/**
 * Correct a customer's own details.
 *
 * Only the fields a person can get wrong. `phone_key` and `email_key` are the
 * identity the customer-matching runs on and are maintained by their own
 * trigger, so they are not writable here — editing them by hand would silently
 * split one customer into two, or merge two into one.
 *
 * Absent keys are left alone rather than nulled, so a caller sending only the
 * phone does not wipe the address.
 */
create or replace function public.update_customer_record(
  p_customer_id uuid,
  p jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.customers%rowtype;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  select * into v_row from public.customers
   where id = p_customer_id and deleted_at is null for update;
  if not found then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  update public.customers set
    full_name       = coalesce(nullif(trim(p->>'fullName'), ''), full_name),
    phone           = case when p ? 'phone' then nullif(trim(p->>'phone'), '') else phone end,
    email           = case when p ? 'email' then nullif(trim(p->>'email'), '') else email end,
    country         = case when p ? 'country' then nullif(trim(p->>'country'), '') else country end,
    pickup_address  = case when p ? 'pickupAddress' then nullif(trim(p->>'pickupAddress'), '') else pickup_address end,
    pickup_city     = case when p ? 'pickupCity' then nullif(trim(p->>'pickupCity'), '') else pickup_city end,
    pickup_postcode = case when p ? 'pickupPostcode'
                           then nullif(upper(trim(p->>'pickupPostcode')), '') else pickup_postcode end,
    notes           = case when p ? 'notes' then nullif(trim(p->>'notes'), '') else notes end,
    updated_at      = now()
  where id = p_customer_id
  returning * into v_row;

  return to_jsonb(v_row);
end $$;

revoke all on function public.update_customer_record(uuid, jsonb) from public, anon;
grant execute on function public.update_customer_record(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- B. Payments against an invoice
-- ---------------------------------------------------------------------------

/**
 * Record or correct one payment on a shipment's invoice.
 *
 * Payments are stored as an array on `metadata.invoice.payments`. Historically
 * the entries carried no identity, so the only way to point at one was its
 * position — and a position moves the moment anybody else adds a payment from
 * another device, which is how the wrong receipt gets edited. Every entry
 * written from here carries an `id`; passing that id corrects the existing
 * entry, omitting it appends a new one.
 *
 * The invoice must be issued. Recording money against a booking nobody has
 * billed produces a credit with no charge to set it against, and a statement
 * that opens in credit.
 */
create or replace function public.record_invoice_payment(
  p_shipment_id uuid,
  p jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_payments jsonb;
  v_entry jsonb;
  v_id text := nullif(trim(coalesce(p->>'id', '')), '');
  v_amount numeric := coalesce((p->>'amount')::numeric, 0);
  v_found boolean := false;
  v_next jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if v_amount <= 0 then
    raise exception 'A payment must be more than zero' using errcode = '22023';
  end if;

  select * into v_ship from public.shipments
   where id = p_shipment_id and deleted_at is null for update;
  if not found then
    raise exception 'Shipment not found' using errcode = 'P0002';
  end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  if nullif(trim(coalesce(v_invoice->>'invoiceNumber', '')), '') is null then
    raise exception 'Raise the invoice before recording a payment against it'
      using errcode = '22023';
  end if;

  v_payments := case when jsonb_typeof(v_invoice->'payments') = 'array'
                     then v_invoice->'payments' else '[]'::jsonb end;

  v_entry := jsonb_strip_nulls(jsonb_build_object(
    'id', coalesce(v_id, gen_random_uuid()::text),
    'amount', v_amount,
    'method', nullif(trim(coalesce(p->>'method', '')), ''),
    'date', coalesce(nullif(trim(coalesce(p->>'date', '')), ''), to_char(now(), 'YYYY-MM-DD')),
    'reference', nullif(trim(coalesce(p->>'reference', '')), ''),
    'note', nullif(trim(coalesce(p->>'note', '')), ''),
    'recordedBy', auth.uid()::text,
    'recordedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')));

  -- Replace in place when the id matches, so a correction keeps its position in
  -- the ledger rather than jumping to the end of the statement.
  if v_id is not null then
    select coalesce(jsonb_agg(
             case when existing->>'id' = v_id then v_entry else existing end
             order by ord), '[]'::jsonb),
           bool_or(existing->>'id' = v_id)
      into v_next, v_found
      from jsonb_array_elements(v_payments) with ordinality t(existing, ord);
  end if;

  if not coalesce(v_found, false) then
    v_next := v_payments || jsonb_build_array(v_entry);
  end if;

  v_invoice := jsonb_set(v_invoice, '{payments}', v_next, true);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = p_shipment_id;

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id,
          case when coalesce(v_found, false) then 'payment_corrected' else 'payment_recorded' end,
          auth.uid(), v_entry);

  select jsonb_build_object('payments', v_next, 'entry', v_entry) into v_row;
  return v_row;
end $$;

revoke all on function public.record_invoice_payment(uuid, jsonb) from public, anon;
grant execute on function public.record_invoice_payment(uuid, jsonb) to authenticated;

/**
 * Take a payment back off an invoice.
 *
 * Removed outright rather than flagged: a payment that was never received is
 * not history, it is a mistake, and leaving it on the statement means the
 * balance stays wrong. What happened is kept in `shipment_events`, which is the
 * audit trail — the deleted entry is recorded there in full, so a removal can
 * always be explained and reversed by hand.
 */
create or replace function public.delete_invoice_payment(
  p_shipment_id uuid,
  p_payment_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_payments jsonb;
  v_removed jsonb;
  v_next jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  select * into v_ship from public.shipments
   where id = p_shipment_id and deleted_at is null for update;
  if not found then
    raise exception 'Shipment not found' using errcode = 'P0002';
  end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  v_payments := case when jsonb_typeof(v_invoice->'payments') = 'array'
                     then v_invoice->'payments' else '[]'::jsonb end;

  select jsonb_agg(existing order by ord) filter (where existing->>'id' is distinct from p_payment_id),
         (array_agg(existing) filter (where existing->>'id' = p_payment_id))[1]
    into v_next, v_removed
    from jsonb_array_elements(v_payments) with ordinality t(existing, ord);

  if v_removed is null then
    raise exception 'That payment is no longer on this invoice' using errcode = 'P0002';
  end if;

  v_invoice := jsonb_set(v_invoice, '{payments}', coalesce(v_next, '[]'::jsonb), true);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = p_shipment_id;

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id, 'payment_removed', auth.uid(), v_removed);

  return jsonb_build_object('payments', coalesce(v_next, '[]'::jsonb), 'removed', v_removed);
end $$;

revoke all on function public.delete_invoice_payment(uuid, text) from public, anon;
grant execute on function public.delete_invoice_payment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- C. The statement carries each payment's id, so a line can be acted on
-- ---------------------------------------------------------------------------

create or replace function public.customer_statement(p_customer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_rows jsonb;
  v_allowed boolean;
begin
  select public.is_operations_admin() or public.is_finance_staff()
         or exists (select 1 from public.customers c
                     where c.id = p_customer_id and c.profile_id = auth.uid())
    into v_allowed;
  if not v_allowed then
    raise exception 'Not your statement' using errcode = '42501';
  end if;

  with charges as (
    select l.shipment_id,
           l.created_at as at,
           l.invoice_number as ref,
           'charge' as kind,
           l.invoiced as amount,
           l.currency,
           null::text as method,
           null::text as payment_id,
           null::text as note
      from public.issued_invoice_lines l
     where l.customer_id = p_customer_id
  ),
  credits as (
    select l.shipment_id,
           coalesce((p->>'date')::timestamptz, l.created_at) as at,
           l.invoice_number as ref,
           'payment' as kind,
           -coalesce((p->>'amount')::numeric, 0) as amount,
           l.currency,
           p->>'method' as method,
           -- Entries written before payments carried ids have none; the line is
           -- still shown, it simply cannot be edited until it is re-recorded.
           p->>'id' as payment_id,
           coalesce(p->>'reference', p->>'note') as note
      from public.issued_invoice_lines l
      join public.shipments s on s.id = l.shipment_id
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(s.metadata->'invoice'->'payments') = 'array'
             then s.metadata->'invoice'->'payments' else '[]'::jsonb end) p
     where l.customer_id = p_customer_id
  ),
  ordered as (
    -- Order by the calendar day, then charge before payment.
    --
    -- Not by timestamp: a payment carries a plain date, which is midnight,
    -- while the invoice it settles carries the booking's real time of day. Any
    -- payment therefore sorts ahead of the invoice it pays, and the statement
    -- opens hundreds in credit before the first bill is raised.
    --
    -- The running balance is per currency: a euro payment does not reduce a
    -- sterling debt, and one blended balance reconciles against neither.
    select *, sum(amount) over (partition by currency
                                order by at::date, kind, at
                                rows between unbounded preceding and current row) as balance
      from (select * from charges union all select * from credits) both_sides
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'shipmentId', shipment_id, 'at', at, 'reference', ref, 'kind', kind,
           'amount', amount, 'currency', currency, 'method', method,
           'paymentId', payment_id, 'note', note, 'balance', balance
         ) order by at::date, kind, at), '[]'::jsonb)
    into v_rows from ordered;

  return v_rows;
end $function$;

revoke all on function public.customer_statement(uuid) from public, anon;
grant execute on function public.customer_statement(uuid) to authenticated;
