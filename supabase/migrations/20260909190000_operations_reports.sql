-- What the business made, and who owes what.
--
-- One statement of the numbers, called by the website and both apps, because a
-- revenue figure that differs between two screens is worse than no figure at
-- all — somebody has to work out which one lied.
--
-- Two rules run through all of it:
--
--   1. Only ISSUED invoices count as money. A booking prices itself the moment
--      it is made, but nobody has asked the customer for that; treating it as
--      revenue would overstate every total on every screen. An invoice counts
--      once it carries an invoiceNumber.
--   2. Pounds and euros are never added together. A period routinely holds UK
--      and Irish collections, and their sum is a number that is not money in
--      either currency. Every total is per-currency, always.

-- ---------------------------------------------------------------------------
-- A0. A route name that is not a route name
-- ---------------------------------------------------------------------------

/**
 * "To be assigned" is a placeholder a booking carries until somebody names the
 * real round. It is a real string in the column, not a null, and treating it as
 * a route made it the single biggest earner in the business at GBP 4,855 —
 * revenue attributed to a collection round that does not exist and that no
 * driver has ever driven.
 *
 * The apps already know this rule (`isPlaceholderRoute`); the reports need it
 * in SQL, and it must be the same list of spellings.
 */
create or replace function public.is_placeholder_route(p_name text)
returns boolean
language sql
immutable
as $$
  select coalesce(trim(p_name), '') = ''
      or trim(p_name) ~* '^(to be (confirmed|assigned)|not (set|assigned)|tbc|n/?a|none|unknown|-|—)$';
$$;

-- ---------------------------------------------------------------------------
-- A. Shared shape: one issued invoice, flattened
-- ---------------------------------------------------------------------------

/**
 * Every shipment with an issued invoice, as plain columns.
 *
 * The invoice lives in `metadata.invoice` as JSON, so each report would
 * otherwise repeat the same unwrapping — and repeat any mistake in it. Written
 * once here, read by everything below.
 */
create or replace view public.issued_invoice_lines as
select
  s.id                                        as shipment_id,
  s.customer_id,
  s.collection_period_id,
  s.tracking_number,
  s.customer_reference,
  s.status,
  s.created_at,
  s.collected_at,
  -- The schedule's route wins; the booking's own is used only when it names a
  -- real round. A placeholder becomes null so it groups as "No route".
  coalesce(
    case when public.is_placeholder_route(cs.route) then null else trim(cs.route) end,
    case when public.is_placeholder_route(s.metadata->'collection'->>'route') then null
         else trim(s.metadata->'collection'->>'route') end
  ) as route,
  coalesce(s.metadata->'invoice'->>'currency', 'GBP')                     as currency,
  s.metadata->'invoice'->>'invoiceNumber'                                 as invoice_number,
  coalesce((
    select sum(coalesce((i->>'quantity')::numeric, 0) * coalesce((i->>'unitPrice')::numeric, 0))
    from jsonb_array_elements(
      case when jsonb_typeof(s.metadata->'invoice'->'items') = 'array'
           then s.metadata->'invoice'->'items' else '[]'::jsonb end) i
  ), 0) - coalesce((s.metadata->'invoice'->>'discount')::numeric, 0)      as invoiced,
  coalesce((
    select sum(coalesce((p->>'amount')::numeric, 0))
    from jsonb_array_elements(
      case when jsonb_typeof(s.metadata->'invoice'->'payments') = 'array'
           then s.metadata->'invoice'->'payments' else '[]'::jsonb end) p
  ), 0)                                                                   as paid
from public.shipments s
left join public.collection_schedules cs on cs.id = s.collection_schedule_id
where s.deleted_at is null
  and nullif(trim(coalesce(s.metadata->'invoice'->>'invoiceNumber', '')), '') is not null
  and s.metadata->'invoice'->>'deletedAt' is null;

comment on view public.issued_invoice_lines is
  'Shipments carrying an issued (numbered, undeleted) invoice, with its totals unwrapped. Bookings that are merely priced are excluded.';

revoke all on public.issued_invoice_lines from public, anon;
grant select on public.issued_invoice_lines to authenticated;

-- ---------------------------------------------------------------------------
-- B. The operations report
-- ---------------------------------------------------------------------------

/**
 * Revenue by route, by period and by what people actually ship.
 *
 * `p_from`/`p_to` bound it by booking date; passing nulls reports on
 * everything, which is what the business wants when asking "which route makes
 * the most money" rather than "how was last week".
 *
 * A route's standing is deliberately not a single ranking. Routes are compared
 * within a currency, because a euro route and a sterling route cannot be put in
 * one league table without inventing an exchange rate the business has not set.
 */
create or replace function public.operations_report(
  p_from date default null,
  p_to date default null
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
    where (p_from is null or created_at::date >= p_from)
      and (p_to is null or created_at::date <= p_to)
  ),
  by_currency as (
    select currency,
           count(*)                            as shipments,
           sum(invoiced)                       as invoiced,
           sum(paid)                           as paid,
           greatest(0, sum(invoiced) - sum(paid)) as outstanding,
           -- What one consignment is worth on average. The question "how much
           -- was made per consignment" is asked per currency for the same
           -- reason every other total is.
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
    from scoped
    group by 1, 2
  ),
  -- What people ship, from the invoice lines themselves. Descriptions are
  -- normalised only by case and spacing: collapsing them further would merge
  -- "Metal drum purchased from us" into "Shipping drum", which are different
  -- things the business sells.
  items as (
    select
      initcap(lower(trim(coalesce(i->>'description', i->>'item', 'Unnamed item')))) as item,
      sum(coalesce((i->>'quantity')::numeric, 0))                                   as quantity,
      count(distinct sc.shipment_id)                                                as shipments,
      sc.currency,
      sum(coalesce((i->>'quantity')::numeric, 0) * coalesce((i->>'unitPrice')::numeric, 0)) as revenue
    from scoped sc
    join public.shipments s on s.id = sc.shipment_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.metadata->'invoice'->'items') = 'array'
           then s.metadata->'invoice'->'items' else '[]'::jsonb end) i
    group by 1, sc.currency
  ),
  by_month as (
    select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
           currency,
           count(*)      as shipments,
           sum(invoiced) as invoiced,
           sum(paid)     as paid
    from scoped group by 1, 2
  ),
  by_status as (
    select coalesce(nullif(trim(status), ''), 'No status') as status,
           count(*) as shipments
    from scoped group by 1
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'generatedAt', now(),
    'totals', coalesce((select jsonb_agg(to_jsonb(c) order by c.invoiced desc) from by_currency c), '[]'::jsonb),
    'routes', coalesce((select jsonb_agg(to_jsonb(r) order by r.invoiced desc) from by_route r), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.quantity desc) from items i), '[]'::jsonb),
    'months', coalesce((select jsonb_agg(to_jsonb(m) order by m.month) from by_month m), '[]'::jsonb),
    'statuses', coalesce((select jsonb_agg(to_jsonb(st) order by st.shipments desc) from by_status st), '[]'::jsonb),
    -- Named outright rather than left for a client to re-derive, so the
    -- "best route" on one screen is the best route on every screen.
    'bestRoute', (select to_jsonb(r) from by_route r order by r.invoiced desc limit 1),
    'worstRoute', (select to_jsonb(r) from by_route r where r.invoiced > 0 order by r.invoiced asc limit 1),
    'awaitingInvoice', (
      select count(*) from public.shipments s
      where s.deleted_at is null
        and nullif(trim(coalesce(s.metadata->'invoice'->>'invoiceNumber', '')), '') is null
        and (p_from is null or s.created_at::date >= p_from)
        and (p_to is null or s.created_at::date <= p_to))
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.operations_report(date, date) from public, anon;
grant execute on function public.operations_report(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- C. Customer accounts
-- ---------------------------------------------------------------------------

/**
 * What each customer is worth and what they still owe.
 *
 * Spend is what has been invoiced to them; owed is what is left on those
 * invoices. Both per currency, for the reason above — a customer who ships from
 * Ireland and from the UK has two balances, not one blended number nobody can
 * reconcile against a bank statement.
 *
 * `p_customer_id` narrows it to one customer, with their items broken out. The
 * list form omits the item breakdown, which would otherwise be 140 customers'
 * worth of line items nobody is looking at.
 */
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
  rolled as (
    select customer_id,
           max(full_name) as full_name,
           max(customer_code) as customer_code,
           max(phone) as phone,
           max(email) as email,
           max(country) as country,
           sum(shipments) as shipments,
           max(last_booked) as last_booked,
           -- Ordered by spend so the biggest currency reads first; a customer
           -- with both shows sterling or euro first depending on which they
           -- actually ship in.
           jsonb_agg(jsonb_build_object(
             'currency', currency, 'spent', spent, 'paid', paid, 'owed', owed,
             'shipments', shipments) order by spent desc) as balances,
           sum(owed) filter (where owed > 0) as owed_any
    from money group by customer_id
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
          'item', initcap(lower(trim(coalesce(i->>'description', i->>'item', 'Unnamed item')))),
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
        group by 1 + 0, initcap(lower(trim(coalesce(i->>'description', i->>'item', 'Unnamed item')))), sc.currency
      ) t), '[]'::jsonb) end
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.customer_accounts(uuid) from public, anon;
grant execute on function public.customer_accounts(uuid) to authenticated;
