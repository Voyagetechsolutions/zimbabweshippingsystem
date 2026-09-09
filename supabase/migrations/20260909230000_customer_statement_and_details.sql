-- The statement agrees with the balance printed above it, and the account
-- carries the customer's details.
--
-- `customer_statement` charged for any booking carrying a priced
-- `metadata.invoice`, whether or not anybody had raised it. The account beside
-- it counts only issued invoices, so the two disagreed on the same screen: a
-- customer shown as owing nothing had a statement closing hundreds in debit for
-- bookings nobody has billed. A statement is a demand for money; it cannot list
-- charges the business has not made.
--
-- The ordering rule is kept exactly as it was, because it is right and the
-- reason is easy to lose: a payment carries a plain date, which is midnight,
-- while the invoice it settles carries the booking's real time of day. Ordering
-- by timestamp puts every payment ahead of the invoice it pays and opens the
-- statement hundreds in credit.

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
           null::text as method
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
           p->>'method' as method
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
           'amount', amount, 'currency', currency, 'method', method, 'balance', balance
         ) order by at::date, kind, at), '[]'::jsonb)
    into v_rows from ordered;

  return v_rows;
end $function$;

revoke all on function public.customer_statement(uuid) from public, anon;
grant execute on function public.customer_statement(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The account carries the customer's own details
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
    select l.*, c.full_name, c.customer_code, c.phone, c.email, c.country,
           c.pickup_address, c.pickup_city, c.pickup_postcode, c.created_at as customer_since
    from public.issued_invoice_lines l
    join public.customers c on c.id = l.customer_id
    where c.deleted_at is null
      and (p_customer_id is null or c.id = p_customer_id)
  ),
  money as (
    select customer_id, full_name, customer_code, phone, email, country,
           pickup_address, pickup_city, pickup_postcode, customer_since, currency,
           count(*)      as shipments,
           sum(invoiced) as spent,
           sum(paid)     as paid,
           greatest(0, sum(invoiced) - sum(paid)) as owed,
           max(created_at) as last_booked
    from scoped
    group by customer_id, full_name, customer_code, phone, email, country,
             pickup_address, pickup_city, pickup_postcode, customer_since, currency
  ),
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
           max(m.full_name)        as full_name,
           max(m.customer_code)    as customer_code,
           max(r.latest_reference) as customer_reference,
           max(r.references::text)::jsonb as customer_references,
           max(m.phone)           as phone,
           max(m.email)           as email,
           max(m.country)         as country,
           max(m.pickup_address)  as pickup_address,
           max(m.pickup_city)     as pickup_city,
           max(m.pickup_postcode) as pickup_postcode,
           max(m.customer_since)  as customer_since,
           sum(m.shipments)       as shipments,
           max(m.last_booked)     as last_booked,
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
    -- Only for one customer: the shipments behind the balance, so staff can see
    -- what the statement lines refer to without opening each one.
    'shipments', case when p_customer_id is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
               'shipmentId', sc.shipment_id,
               'reference', coalesce(sc.customer_reference, sc.tracking_number),
               'invoiceNumber', sc.invoice_number,
               'status', sc.status,
               'route', sc.route,
               'bookedOn', sc.created_at,
               'currency', sc.currency,
               'invoiced', sc.invoiced,
               'paid', sc.paid,
               'balance', greatest(0, sc.invoiced - sc.paid))
             order by sc.created_at desc)
      from scoped sc), '[]'::jsonb) end,
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
