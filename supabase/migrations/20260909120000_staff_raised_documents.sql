-- Invoices and delivery notes are raised by staff, not by the booking form.
--
-- Until now a booking issued its own invoice. `create_customer_booking_legacy`
-- stamped an invoice number, an issue date and a due date the instant a
-- customer pressed Book, so 77 of the 107 live shipments carry an invoice that
-- nobody in the office ever looked at. That is backwards: the confirmation call
-- is where the contents and the price are established, and an invoice raised
-- before that call is a document the business has not agreed to.
--
-- The booking still *prices* the shipment. It must — `metadata.invoice.items`
-- is what the driver's goods list, the delivery note and two reporting views
-- read, and emptying it would break all of them. What the booking stops doing
-- is issuing. The invoice number is the line between the two:
--
--   items, currency, terms   ->  written at booking, as it always was
--   invoiceNumber, issuedAt  ->  written only by public.issue_shipment_invoice
--
-- Nothing already issued changes meaning. Every one of those 77 carries a
-- number, so they all read as issued and stay exactly where they are — in the
-- invoice lists, on the customer's account and in the period totals.

-- ---------------------------------------------------------------------------
-- A. The booking stops issuing
-- ---------------------------------------------------------------------------

/**
 * Drop the three issuing fields from a freshly booked shipment.
 *
 * Written as an after-the-fact strip rather than an edit to the 11kb legacy
 * function body, so the pricing logic — which is correct and heavily depended
 * on — is not retyped and cannot be mistranscribed.
 */
create or replace function public.create_customer_booking(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_quote_id uuid := nullif(p->>'quoteId', '')::uuid;
  v_quote public.custom_quotes%rowtype;
  v_shipment_id uuid;
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_item jsonb;
  v_itemised numeric := 0;
  v_line jsonb;
  v_replaced boolean := false;
begin
  -- Everything the previous version did stays exactly as it was.
  v_result := public.create_customer_booking_v3(p);
  v_shipment_id := nullif(v_result->>'id', '')::uuid;

  -- The booking priced the shipment; it does not get to issue the invoice.
  if v_shipment_id is not null then
    update public.shipments
       set metadata = jsonb_set(
             coalesce(metadata, '{}'::jsonb),
             '{invoice}',
             coalesce(metadata->'invoice', '{}'::jsonb)
               - 'invoiceNumber' - 'issueDate' - 'dueDate',
             true)
     where id = v_shipment_id
       and metadata->'invoice' is not null;
  end if;

  if v_quote_id is null then return v_result; end if;

  select * into v_quote from public.custom_quotes where id = v_quote_id;
  if not found or v_quote.quote_items is null or jsonb_array_length(v_quote.quote_items) = 0 then
    return v_result;
  end if;

  -- Every item must carry its own price, and they must add up to the amount the
  -- customer was quoted and agreed. If they do not, the single line stands:
  -- silently re-pricing a booking to make a breakdown fit would be worse than
  -- having no breakdown.
  for v_item in select * from jsonb_array_elements(v_quote.quote_items) loop
    if coalesce((v_item->>'amount')::numeric, 0) <= 0 then return v_result; end if;
    v_itemised := v_itemised + (v_item->>'amount')::numeric;
  end loop;
  if abs(v_itemised - coalesce(v_quote.quoted_amount, -1)) > 0.01 then return v_result; end if;

  if v_shipment_id is null then return v_result; end if;
  select * into v_ship from public.shipments where id = v_shipment_id for update;
  if not found then return v_result; end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);

  -- Swap the one "Approved quote: …" line for the priced breakdown, leaving
  -- every other line (drums, seals, door delivery) exactly where it was.
  for v_line in select * from jsonb_array_elements(coalesce(v_invoice->'items', '[]'::jsonb)) loop
    if not v_replaced and coalesce(v_line->>'description', '') like 'Approved quote:%' then
      v_replaced := true;
      for v_item in select * from jsonb_array_elements(v_quote.quote_items) loop
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'description', left(coalesce(nullif(trim(v_item->>'description'), ''), 'Quoted item'), 200),
          'quantity', 1,
          'unitPrice', (v_item->>'amount')::numeric));
      end loop;
    else
      v_lines := v_lines || jsonb_build_array(v_line);
    end if;
  end loop;
  if not v_replaced then return v_result; end if;

  v_invoice := jsonb_set(v_invoice, '{items}', v_lines, true);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = v_shipment_id;

  return v_result || jsonb_build_object('invoice', v_invoice);
end $$;

grant execute on function public.create_customer_booking(jsonb) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- B. Staff raise the invoice
-- ---------------------------------------------------------------------------

/**
 * Issue the invoice for a shipment.
 *
 * `p_invoice` is the whole invoice as the member of staff checked it — the
 * prefilled lines, corrected. The number, the dates and who issued it are set
 * here rather than by the client, so two people pressing Create at once cannot
 * mint the same invoice number, and so "who raised this" is not a claim the
 * phone makes about itself.
 *
 * Re-issuing an invoice that already has a number keeps that number. An invoice
 * number is what the customer quotes on the phone and what the payment
 * references; changing it because somebody re-opened the editor would strand
 * every payment already made against it.
 */
create or replace function public.issue_shipment_invoice(
  p_shipment_id uuid,
  p_invoice jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_number text;
  v_actor uuid := auth.uid();
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id for update;
  if not found then
    raise exception 'Shipment % not found', p_shipment_id using errcode = 'P0002';
  end if;

  -- Start from what was checked, falling back to what the booking priced.
  v_invoice := coalesce(nullif(p_invoice, 'null'::jsonb), '{}'::jsonb);
  if v_invoice = '{}'::jsonb then
    v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  end if;

  -- An invoice with nothing on it is not an invoice.
  if coalesce(jsonb_array_length(
       case when jsonb_typeof(v_invoice->'items') = 'array' then v_invoice->'items' else '[]'::jsonb end
     ), 0) = 0 then
    raise exception 'Add at least one line before creating the invoice' using errcode = '22023';
  end if;

  v_number := nullif(trim(coalesce(
    v_ship.metadata->'invoice'->>'invoiceNumber',
    v_invoice->>'invoiceNumber')), '');
  if v_number is null then
    v_number := 'INV-' || coalesce(
      nullif(trim(v_ship.customer_reference), ''),
      replace(v_ship.tracking_number, 'ZIMSHIP-', ''),
      to_char(now(), 'YYYYMMDDHH24MISS'));
  end if;

  v_invoice := v_invoice || jsonb_build_object(
    'invoiceNumber', v_number,
    'issueDate', coalesce(nullif(v_invoice->>'issueDate', ''), to_char(now(), 'YYYY-MM-DD')),
    'dueDate', coalesce(nullif(v_invoice->>'dueDate', ''), to_char(now() + interval '14 days', 'YYYY-MM-DD')),
    'issuedAt', coalesce(v_ship.metadata->'invoice'->>'issuedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')),
    'issuedBy', coalesce(v_ship.metadata->'invoice'->>'issuedBy', v_actor::text),
    -- Raising it again un-deletes it, which is what pressing Create means.
    'deletedAt', null);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = p_shipment_id;

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id, 'invoice_issued', v_actor, jsonb_build_object('invoiceNumber', v_number));

  return v_invoice;
end $$;

revoke all on function public.issue_shipment_invoice(uuid, jsonb) from public, anon;
grant execute on function public.issue_shipment_invoice(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- C. Staff raise the delivery note
-- ---------------------------------------------------------------------------

/**
 * Create the delivery note for a collected shipment.
 *
 * The note goes into `delivery_note_records`, the office document register, and
 * deliberately NOT into `public.delivery_notes`. Those two are easy to confuse
 * and are not the same thing: `delivery_notes` is the driver's proof at the
 * door, keyed to a run stop, with `stop_id` and `driver_id` both NOT NULL —
 * there is no honest way to write an office note into it, and inventing a stop
 * and a driver to satisfy the constraints would corrupt the driver's record of
 * what actually happened. `delivery_note_records` already carries exactly the
 * fields a printed note has: shipper, recipient, items, paid, balance due.
 *
 * The note is raised once the goods are in our hands, because that is the first
 * moment its contents are a fact rather than a plan. It needs the invoice
 * first — `invoice_number` is NOT NULL on the register, and a delivery note
 * that cannot name the invoice it belongs to is not much of a record.
 */
create or replace function public.create_shipment_delivery_note(
  p_shipment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ship public.shipments%rowtype;
  v_note public.delivery_note_records%rowtype;
  v_reference text;
  v_invoice_number text;
  v_actor uuid := auth.uid();
  v_recipient jsonb;
  v_sender jsonb;
  v_invoice jsonb;
  v_total numeric;
  v_paid numeric;
  v_suffix integer := 0;
begin
  if not (public.is_operations_admin() or public.is_finance_staff() or public.is_staff_member()) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id for update;
  if not found then
    raise exception 'Shipment % not found', p_shipment_id using errcode = 'P0002';
  end if;

  -- One note per shipment. Pressing the button twice returns the first one
  -- rather than issuing a second note for the same goods.
  select * into v_note from public.delivery_note_records
   where shipment_id = p_shipment_id and voided_at is null
   order by created_at limit 1;
  if found then
    return jsonb_build_object('noteId', v_note.id, 'reference', v_note.reference, 'created', false);
  end if;

  if v_ship.collected_at is null
     and lower(coalesce(v_ship.status, '')) not in
         ('collected', 'at warehouse', 'enroute to zimbabwe', 'in transit',
          'zim warehouse', 'out for delivery', 'delivered') then
    raise exception 'Collect the goods before raising the delivery note' using errcode = '22023';
  end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  v_invoice_number := nullif(trim(coalesce(v_invoice->>'invoiceNumber', '')), '');
  if v_invoice_number is null then
    raise exception 'Create the invoice before the delivery note' using errcode = '22023';
  end if;

  v_sender := coalesce(v_ship.metadata->'sender', v_ship.metadata->'senderDetails', '{}'::jsonb);
  v_recipient := coalesce(v_ship.metadata->'recipient', v_ship.metadata->'receiverDetails', '{}'::jsonb);

  select
    coalesce(sum(coalesce((i->>'quantity')::numeric, 0) * coalesce((i->>'unitPrice')::numeric, 0)), 0)
    - coalesce((v_invoice->>'discount')::numeric, 0)
  into v_total
  from jsonb_array_elements(
    case when jsonb_typeof(v_invoice->'items') = 'array' then v_invoice->'items' else '[]'::jsonb end) i;

  select coalesce(sum(coalesce((pay->>'amount')::numeric, 0)), 0) into v_paid
  from jsonb_array_elements(
    case when jsonb_typeof(v_invoice->'payments') = 'array' then v_invoice->'payments' else '[]'::jsonb end) pay;

  -- REF as printed: first three letters of the shipper's given name, then the
  -- invoice number. `reference` is unique on upper(reference), so a second note
  -- against the same invoice takes the next load suffix rather than failing.
  v_reference := upper(left(regexp_replace(coalesce(
    nullif(trim(v_sender->>'firstName'), ''),
    split_part(trim(coalesce(v_sender->>'name', 'ZIM')), ' ', 1)), '[^A-Za-z]', '', 'g') || 'XXX', 3))
    || v_invoice_number;
  while exists (select 1 from public.delivery_note_records
                 where upper(reference) = upper(v_reference)) loop
    v_suffix := v_suffix + 1;
    if v_suffix > 25 then
      raise exception 'Too many delivery notes already issued against %', v_invoice_number;
    end if;
    v_reference := upper(left(regexp_replace(coalesce(
      nullif(trim(v_sender->>'firstName'), ''),
      split_part(trim(coalesce(v_sender->>'name', 'ZIM')), ' ', 1)), '[^A-Za-z]', '', 'g') || 'XXX', 3))
      || v_invoice_number || chr(64 + v_suffix);
  end loop;

  insert into public.delivery_note_records (
    reference, invoice_number, load_suffix,
    shipper_name, shipper_phone, shipper_address,
    recipient_name, recipient_phone, recipient_address, recipient_city,
    items, delivery_mode, paid, balance_due, note_date,
    shipment_id, confirmed_by
  ) values (
    v_reference,
    v_invoice_number,
    case when v_suffix > 0 then chr(64 + v_suffix) else null end,
    nullif(trim(coalesce(v_sender->>'name',
      concat_ws(' ', v_sender->>'firstName', v_sender->>'lastName'))), ''),
    nullif(trim(coalesce(v_sender->>'phone', '')), ''),
    nullif(trim(concat_ws(', ', nullif(v_sender->>'address', ''),
      nullif(v_sender->>'city', ''), nullif(v_sender->>'postalCode', ''))), ''),
    nullif(trim(coalesce(v_recipient->>'name', '')), ''),
    nullif(trim(coalesce(v_recipient->>'phone', '')), ''),
    nullif(trim(coalesce(v_recipient->>'address', '')), ''),
    nullif(trim(coalesce(v_recipient->>'city', '')), ''),
    coalesce(case when jsonb_typeof(v_invoice->'items') = 'array' then v_invoice->'items' end, '[]'::jsonb),
    case when coalesce(v_ship.metadata->'collection'->>'selfCollection', 'false') = 'true'
         then 'self_collection' else 'door_to_door' end,
    v_paid >= v_total - 0.005 and v_total > 0,
    greatest(0, v_total - v_paid),
    current_date,
    p_shipment_id,
    v_actor
  ) returning * into v_note;

  insert into public.shipment_events(shipment_id, event_type, actor_id, details)
  values (p_shipment_id, 'delivery_note_created', v_actor,
          jsonb_build_object('reference', v_reference, 'invoiceNumber', v_invoice_number));

  return jsonb_build_object('noteId', v_note.id, 'reference', v_note.reference, 'created', true);
end $$;

revoke all on function public.create_shipment_delivery_note(uuid) from public, anon;
grant execute on function public.create_shipment_delivery_note(uuid) to authenticated;

/**
 * The delivery notes raised against one collection period, with enough of the
 * shipment beside them to be read without a second query.
 *
 * Grouped the same way the shipments and invoices are, because the period is
 * how the business counts everything else.
 */
create or replace function public.period_delivery_notes(p_period_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not (public.is_operations_admin() or public.is_finance_staff() or public.is_staff_member())
    then jsonb_build_object('error', 'Staff access required')
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'noteId', n.id,
        'reference', n.reference,
        'invoiceNumber', n.invoice_number,
        'noteDate', n.note_date,
        'paid', n.paid,
        'balanceDue', n.balance_due,
        'deliveryMode', n.delivery_mode,
        'voidedAt', n.voided_at,
        'recipientName', n.recipient_name,
        'recipientCity', n.recipient_city,
        'items', n.items,
        'createdAt', n.created_at,
        'shipmentId', s.id,
        'trackingNumber', s.tracking_number,
        'customerReference', s.customer_reference,
        'shipmentStatus', s.status,
        'currency', coalesce(s.metadata->'invoice'->>'currency', 'GBP'),
        'route', coalesce(cs.route, s.metadata->'collection'->>'route'),
        'customerName', coalesce(
          n.shipper_name,
          s.metadata->'sender'->>'name',
          trim(concat_ws(' ',
            s.metadata->'sender'->>'firstName',
            s.metadata->'sender'->>'lastName')))
      ) order by n.created_at desc)
      from public.delivery_note_records n
      join public.shipments s on s.id = n.shipment_id
      left join public.collection_schedules cs on cs.id = s.collection_schedule_id
      where s.collection_period_id = p_period_id
        and s.deleted_at is null
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.period_delivery_notes(uuid) from public, anon;
grant execute on function public.period_delivery_notes(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- D. Period totals count issued invoices only
-- ---------------------------------------------------------------------------

/**
 * The same summary as before, with two changes.
 *
 * "Invoiced" now means issued — an invoice number exists. A booking that has
 * been priced but not yet invoiced is no longer counted as money owed, because
 * nobody has asked the customer for it.
 *
 * `awaitingInvoice` is the count of shipments in that state, so the card says
 * how much work is waiting rather than quietly showing a smaller total.
 */
create or replace function public.collection_period_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not (public.is_operations_admin() or public.is_finance_staff())
    then jsonb_build_object('error', 'Admin or finance access required')
    else coalesce((
      select jsonb_agg(row order by row->>'sortKey' desc)
      from (
        select jsonb_build_object(
          'periodId', p.id,
          'name', p.name,
          'month', p.month,
          'year', p.year,
          'status', p.status,
          -- Sorted by the period's last scheduled collection, not by its
          -- month name: `month` is text ("May", "June"), so anything
          -- alphabetical puts April after August. Periods with nothing
          -- scheduled yet fall back to their year.
          'sortKey', coalesce(
            to_char((select max(cs.pickup_on) from public.collection_schedules cs
                     join public.collection_periods cp on cp.id = cs.collection_period_id
                     where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
                       and cp.year = p.year), 'YYYY-MM-DD'),
            lpad(coalesce(p.year, 0)::text, 4, '0') || '-00-00'),
          -- Routes are matched on month and year, not only on the period id.
          -- Live data has two September 2026 periods differing by nothing but
          -- capitalisation: one holds every booking and no schedule, the other
          -- every schedule and no booking. Matching on the id alone shows a
          -- period full of work as having no routes at all.
          'routes', coalesce((
            select jsonb_agg(distinct cs.route)
            from public.collection_schedules cs
            join public.collection_periods cp on cp.id = cs.collection_period_id
            where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
              and cp.year = p.year
              and cs.route is not null and cs.deleted_at is null), '[]'::jsonb),
          'firstCollection', (
            select min(cs.pickup_on) from public.collection_schedules cs
            join public.collection_periods cp on cp.id = cs.collection_period_id
            where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
              and cp.year = p.year),
          'lastCollection', (
            select max(cs.pickup_on) from public.collection_schedules cs
            join public.collection_periods cp on cp.id = cs.collection_period_id
            where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
              and cp.year = p.year),
          'shipments', count(s.id),
          'collected', count(s.id) filter (where lower(coalesce(s.status, '')) in
            ('collected', 'at warehouse', 'enroute to zimbabwe', 'in transit', 'delivered')),
          -- Priced by the booking, not yet raised by anybody.
          'awaitingInvoice', count(s.id) filter (
            where s.id is not null
              and nullif(trim(coalesce(s.metadata->'invoice'->>'invoiceNumber', '')), '') is null),
          -- Totals per currency, never added together: a period routinely
          -- holds UK and Irish collections, and pounds plus euros is a number
          -- that is not money in either.
          'byCurrency', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'currency', t.cur, 'invoiced', t.inv, 'paid', t.pd,
                     'outstanding', greatest(0, t.inv - t.pd))
                   order by t.inv desc)
            from (
              select coalesce(s2.metadata->'invoice'->>'currency', 'GBP') as cur,
                sum(coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s2.metadata->'invoice'->'items')='array'
                                                    then s2.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)
                    - coalesce((s2.metadata->'invoice'->>'discount')::numeric, 0)) as inv,
                sum(coalesce((select sum(coalesce((pay->>'amount')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s2.metadata->'invoice'->'payments')='array'
                                                    then s2.metadata->'invoice'->'payments' else '[]'::jsonb end) pay), 0)) as pd
              from public.shipments s2
              where s2.collection_period_id = p.id and s2.deleted_at is null
                -- A deleted invoice is not money owed. The screens filter it
                -- out, so a period total that still counted it disagreed with
                -- the list underneath it.
                and s2.metadata->'invoice'->>'deletedAt' is null
                -- Nor is one nobody has raised yet.
                and nullif(trim(coalesce(s2.metadata->'invoice'->>'invoiceNumber', '')), '') is not null
              group by 1
              having sum(coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s2.metadata->'invoice'->'items')='array'
                                                    then s2.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)) > 0
            ) t), '[]'::jsonb),
          'invoiced', coalesce(sum(inv.total), 0),
          'paid', coalesce(sum(inv.paid), 0),
          'outstanding', greatest(0, coalesce(sum(inv.total), 0) - coalesce(sum(inv.paid), 0)),
          -- "Cleared" means nothing left to pay on that shipment.
          'cleared', count(s.id) filter (where inv.total > 0 and inv.paid >= inv.total - 0.005),
          'unpaid', count(s.id) filter (where inv.total > 0 and inv.paid <= 0.005),
          'currency', coalesce(max(inv.currency), 'GBP')
        ) as row
        from public.collection_periods p
        left join public.shipments s
          on s.collection_period_id = p.id and s.deleted_at is null
        left join lateral (
          select
            case when s.metadata->'invoice'->>'deletedAt' is not null
                   or nullif(trim(coalesce(s.metadata->'invoice'->>'invoiceNumber', '')), '') is null then 0 else
              coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                        from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'items')='array'
                                                       then s.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)
              - coalesce((s.metadata->'invoice'->>'discount')::numeric, 0) end as total,
            case when s.metadata->'invoice'->>'deletedAt' is not null
                   or nullif(trim(coalesce(s.metadata->'invoice'->>'invoiceNumber', '')), '') is null then 0 else
              coalesce((select sum(coalesce((pay->>'amount')::numeric,0))
                        from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'payments')='array'
                                                       then s.metadata->'invoice'->'payments' else '[]'::jsonb end) pay), 0) end as paid,
            s.metadata->'invoice'->>'currency' as currency
        ) inv on true
        where p.deleted_at is null
        group by p.id, p.name, p.month, p.year, p.status
      ) grouped
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.collection_period_summary() from public, anon;
grant execute on function public.collection_period_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- E. Bulk update can clear a field, not only set one
-- ---------------------------------------------------------------------------

/**
 * Same bulk update, plus the ability to say "take this off its route".
 *
 * The previous version wrote `coalesce(p_collection_schedule_id, s.collection_schedule_id)`,
 * so null meant "leave it alone" and there was no way to express "remove it".
 * That mattered in two places: taking a shipment off a route did nothing at
 * all, and moving one to another period silently kept the old period's route —
 * a September round attached to an October shipment, which no driver will ever
 * see and no report can explain.
 *
 * Clearing is now its own flag, so null keeps its meaning and callers that
 * predate this change behave exactly as before. Dropped and recreated rather
 * than overloaded, because two candidates both callable with four arguments
 * would make every existing call ambiguous.
 */
drop function if exists public.bulk_update_shipments(uuid[], text, uuid, uuid);

create or replace function public.bulk_update_shipments(
  p_ids uuid[],
  p_status text default null,
  p_collection_schedule_id uuid default null,
  p_collection_period_id uuid default null,
  p_clear_schedule boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('changed', 0);
  end if;

  update public.shipments s set
    status = coalesce(nullif(trim(coalesce(p_status, '')), ''), s.status),
    collection_schedule_id = case
      when coalesce(p_clear_schedule, false) then null
      else coalesce(p_collection_schedule_id, s.collection_schedule_id) end,
    collection_period_id = coalesce(p_collection_period_id, s.collection_period_id),
    updated_at = now()
  where s.id = any(p_ids)
    and s.deleted_at is null;

  get diagnostics v_count = row_count;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'BULK_UPDATE', 'SHIPMENT', null,
          jsonb_build_object('count', v_count, 'status', p_status,
                             'scheduleId', p_collection_schedule_id,
                             'clearedSchedule', coalesce(p_clear_schedule, false),
                             'periodId', p_collection_period_id));

  return jsonb_build_object('changed', v_count);
end $$;

revoke all on function public.bulk_update_shipments(uuid[], text, uuid, uuid, boolean) from public, anon;
grant execute on function public.bulk_update_shipments(uuid[], text, uuid, uuid, boolean) to authenticated;
