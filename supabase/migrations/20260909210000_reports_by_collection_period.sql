-- Reports follow the collection period, and accounts show the reference the
-- customer actually quotes.
--
-- Two corrections.
--
-- The business does not think in date ranges, it thinks in collection periods:
-- bookings open on a period, they fill, the container goes. Shipments are filed
-- under `collection_period_id` on every other screen, so a revenue report keyed
-- on a from/to date was answering a question nobody asks and could not be
-- reconciled against the period screens beside it.
--
-- And the customer account showed `customers.customer_code` — ANN00079, an
-- internal identifier the customer has never seen. The reference they read off
-- their invoice and quote down the phone is the booking reference, ANN09260012.
-- Staff could not match a caller to their account with the number the caller
-- was reading out.

-- ---------------------------------------------------------------------------
-- A. The operations report, by collection period
-- ---------------------------------------------------------------------------

-- Dropped rather than replaced: the parameter list changes, and two candidates
-- both callable with two arguments would make every existing call ambiguous.
drop function if exists public.operations_report(date, date);

create or replace function public.operations_report(
  p_from date default null,
  p_to date default null,
  p_period_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    return jsonb_build_object('error', 'Admin or finance access required');
  end if;

  with scoped as (
    select * from public.issued_invoice_lines
    where (p_period_id is null or collection_period_id = p_period_id)
      and (p_from is null or created_at::date >= p_from)
      and (p_to is null or created_at::date <= p_to)
  ),
  by_currency as (
    select currency,
           count(*)                               as shipments,
           sum(invoiced)                          as invoiced,
           sum(paid)                              as paid,
           greatest(0, sum(invoiced) - sum(paid)) as outstanding,
           case when count(*) > 0 then round(sum(invoiced) / count(*), 2) else 0 end as per_consignment
    from scoped group by currency
  ),
  by_route as (
    select coalesce(nullif(trim(route), ''), 'No route') as route,
           currency,
           count(*)      as shipments,
           sum(invoiced) as invoiced,
           sum(paid)     as paid,
           greatest(0, sum(invoiced) - sum(paid)) as outstanding,
           case when count(*) > 0 then round(sum(invoiced) / count(*), 2) else 0 end as per_consignment
    from scoped group by 1, 2
  ),
  items as (
    select public.report_item_label(coalesce(i->>'description', i->>'item')) as item,
           sum(coalesce((i->>'quantity')::numeric, 0))                       as quantity,
           count(distinct sc.shipment_id)                                    as shipments,
           sc.currency,
           sum(coalesce((i->>'quantity')::numeric, 0) * coalesce((i->>'unitPrice')::numeric, 0)) as revenue
    from scoped sc
    join public.shipments s on s.id = sc.shipment_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.metadata->'invoice'->'items') = 'array'
           then s.metadata->'invoice'->'items' else '[]'::jsonb end) i
    group by 1, sc.currency
  ),
  -- The period breakdown replaces the calendar-month one. A period is the unit
  -- the business plans, prices and ships in; a calendar month cuts across them.
  by_period as (
    select p.id            as period_id,
           coalesce(p.name, trim(concat_ws(' ', p.month, p.year))) as period,
           sc.currency,
           count(*)        as shipments,
           sum(sc.invoiced) as invoiced,
           sum(sc.paid)     as paid,
           greatest(0, sum(sc.invoiced) - sum(sc.paid)) as outstanding,
           max(cs.pickup_on) as last_collection
    from scoped sc
    join public.collection_periods p on p.id = sc.collection_period_id
    left join public.collection_schedules cs on cs.collection_period_id = p.id
    where p.deleted_at is null
    group by p.id, p.name, p.month, p.year, sc.currency
  ),
  by_status as (
    select coalesce(nullif(trim(status), ''), 'No status') as status, count(*) as shipments
    from scoped group by 1
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'periodId', p_period_id,
    'generatedAt', now(),
    'totals', coalesce((select jsonb_agg(to_jsonb(c) order by c.invoiced desc) from by_currency c), '[]'::jsonb),
    'routes', coalesce((select jsonb_agg(to_jsonb(r) order by r.invoiced desc) from by_route r), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.quantity desc) from items i), '[]'::jsonb),
    'periods', coalesce((
      select jsonb_agg(to_jsonb(bp) order by bp.last_collection desc nulls last, bp.invoiced desc)
      from by_period bp), '[]'::jsonb),
    'statuses', coalesce((select jsonb_agg(to_jsonb(st) order by st.shipments desc) from by_status st), '[]'::jsonb),
    'bestRoute', (select to_jsonb(r) from by_route r where r.route <> 'No route' order by r.invoiced desc limit 1),
    'worstRoute', (select to_jsonb(r) from by_route r where r.route <> 'No route' and r.invoiced > 0 order by r.invoiced asc limit 1),
    'awaitingInvoice', (
      select count(*) from public.shipments s
      where s.deleted_at is null
        and nullif(trim(coalesce(s.metadata->'invoice'->>'invoiceNumber', '')), '') is null
        and (p_period_id is null or s.collection_period_id = p_period_id)
        and (p_from is null or s.created_at::date >= p_from)
        and (p_to is null or s.created_at::date <= p_to))
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.operations_report(date, date, uuid) from public, anon;
grant execute on function public.operations_report(date, date, uuid) to authenticated;

/**
 * The collection periods a report can be run on.
 *
 * Only periods that actually hold an issued invoice, newest collection first —
 * offering a picker of twenty empty periods makes the useful one harder to
 * find. "All periods" is the caller's own option, not a row here.
 */
create or replace function public.report_periods()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not (public.is_operations_admin() or public.is_finance_staff())
    then jsonb_build_object('error', 'Admin or finance access required')
    else coalesce((
      select jsonb_agg(jsonb_build_object(
               'periodId', t.id,
               'name', t.name,
               'shipments', t.shipments,
               'lastCollection', t.last_collection)
             order by t.last_collection desc nulls last, t.name)
      from (
        select p.id,
               coalesce(p.name, trim(concat_ws(' ', p.month, p.year))) as name,
               count(l.shipment_id) as shipments,
               (select max(cs.pickup_on) from public.collection_schedules cs
                 where cs.collection_period_id = p.id) as last_collection
        from public.collection_periods p
        join public.issued_invoice_lines l on l.collection_period_id = p.id
        where p.deleted_at is null
        group by p.id, p.name, p.month, p.year
      ) t), '[]'::jsonb)
  end;
$$;

revoke all on function public.report_periods() from public, anon;
grant execute on function public.report_periods() to authenticated;

-- ---------------------------------------------------------------------------
-- B. Customer accounts carry the reference the customer quotes
-- ---------------------------------------------------------------------------

create or replace function public.customer_accounts(
  p_customer_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    return jsonb_build_object('error', 'Admin or finance access required');
  end if;

  with scoped as (
    select l.*, c.full_name, c.customer_code, c.phone, c.email, c.country
    from public.issued_invoice_lines l
    join public.customers c on c.id = l.customer_id
    where c.deleted_at is null
      and (p_customer_id is null or c.id = p_customer_id)
  ),
  money as (
    select customer_id, full_name, customer_code, phone, email, country, currency,
           count(*)      as shipments,
           sum(invoiced) as spent,
           sum(paid)     as paid,
           greatest(0, sum(invoiced) - sum(paid)) as owed,
           max(created_at) as last_booked
    from scoped
    group by customer_id, full_name, customer_code, phone, email, country, currency
  ),
  -- Every booking reference this customer has been given. This is what they
  -- read off an invoice; `customer_code` is an internal identifier they have
  -- never seen, and quoting it back at them means nothing.
  refs as (
    select customer_id,
           jsonb_agg(distinct customer_reference) filter (
             where nullif(trim(coalesce(customer_reference, '')), '') is not null
           ) as references,
           (array_agg(customer_reference order by created_at desc)
              filter (where nullif(trim(coalesce(customer_reference, '')), '') is not null))[1]
             as latest_reference
    from scoped group by customer_id
  ),
  rolled as (
    select m.customer_id,
           max(m.full_name)     as full_name,
           max(m.customer_code) as customer_code,
           max(r.latest_reference) as customer_reference,
           max(r.references::text)::jsonb as customer_references,
           max(m.phone)   as phone,
           max(m.email)   as email,
           max(m.country) as country,
           sum(m.shipments)  as shipments,
           max(m.last_booked) as last_booked,
           jsonb_agg(jsonb_build_object(
             'currency', m.currency, 'spent', m.spent, 'paid', m.paid,
             'owed', m.owed, 'shipments', m.shipments) order by m.spent desc) as balances
    from money m
    left join refs r on r.customer_id = m.customer_id
    group by m.customer_id
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'customers', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.last_booked desc nulls last)
      from rolled r), '[]'::jsonb),
    'items', case when p_customer_id is null then '[]'::jsonb else coalesce((
      select jsonb_agg(x order by (x->>'quantity')::numeric desc)
      from (
        select jsonb_build_object(
          'item', public.report_item_label(coalesce(i->>'description', i->>'item')),
          'quantity', sum(coalesce((i->>'quantity')::numeric, 0)),
          'shipments', count(distinct sc.shipment_id),
          'currency', sc.currency,
          'revenue', sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
        ) as x
        from scoped sc
        join public.shipments s on s.id = sc.shipment_id
        cross join lateral jsonb_array_elements(
          case when jsonb_typeof(s.metadata->'invoice'->'items') = 'array'
               then s.metadata->'invoice'->'items' else '[]'::jsonb end) i
        group by public.report_item_label(coalesce(i->>'description', i->>'item')), sc.currency
      ) t), '[]'::jsonb) end
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.customer_accounts(uuid) from public, anon;
grant execute on function public.customer_accounts(uuid) to authenticated;
