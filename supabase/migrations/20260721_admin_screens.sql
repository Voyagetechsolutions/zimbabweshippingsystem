-- Admin app redesign: server-side aggregation for Reports / Analytics /
-- Finance Overview, pickup zones connected to real routes, staff management
-- fields + RPCs, and richer deduplicated customer records.
-- Applied to the live DB via the staff-ops edge function's "setup" action.

-- ---------------------------------------------------------------------------
-- A. Staff management fields + RPCs
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists vehicle_label text,
  add column if not exists on_leave boolean not null default false,
  add column if not exists staff_active boolean not null default true;

create or replace function public.admin_staff_records() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'fullName', p.full_name,
    'email', p.email,
    'phone', p.phone_number,
    'role', case when coalesce(p.is_admin, false) then 'admin' else lower(coalesce(p.role, 'staff')) end,
    'isAdmin', coalesce(p.is_admin, false),
    'driverType', p.driver_type,
    'vehicle', p.vehicle_label,
    'onLeave', p.on_leave,
    'active', p.staff_active,
    'createdAt', p.created_at,
    'attendanceToday', (
      select jsonb_build_object('clockedInAt', a.clocked_in_at, 'clockedOutAt', a.clocked_out_at)
      from public.driver_attendance a
      where a.driver_id = p.id and a.work_date = current_date),
    'lastAttendance', (
      select max(a.work_date) from public.driver_attendance a where a.driver_id = p.id),
    'runStats', (
      select jsonb_build_object(
        'runs', count(distinct r.id),
        'completedStops', count(s.id) filter (where s.status = 'completed'),
        'failedStops', count(s.id) filter (where s.status = 'failed'),
        'lastRunDate', max(r.run_date))
      from public.driver_runs r
      left join public.driver_run_stops s on s.run_id = r.id
      where r.driver_id = p.id)
  ) order by coalesce(p.full_name, p.email)), '[]'::jsonb)
  into v_result
  from public.profiles p
  where coalesce(p.is_admin, false)
     or lower(coalesce(p.role, '')) in ('admin', 'driver', 'finance', 'logistics', 'dispatcher', 'staff');
  return v_result;
end $$;
grant execute on function public.admin_staff_records() to authenticated;

create or replace function public.admin_update_staff(p_user_id uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row public.profiles%rowtype; v_role text;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  if p_patch ? 'role' then
    v_role := lower(p_patch->>'role');
    if v_role not in ('admin', 'driver', 'finance', 'logistics', 'dispatcher', 'customer') then
      raise exception 'Unknown role %', v_role;
    end if;
  end if;
  update public.profiles set
    full_name = coalesce(p_patch->>'fullName', full_name),
    phone_number = coalesce(p_patch->>'phone', phone_number),
    role = coalesce(v_role, role),
    driver_type = case when p_patch ? 'driverType'
      then nullif(p_patch->>'driverType', '') else driver_type end,
    vehicle_label = case when p_patch ? 'vehicle' then nullif(p_patch->>'vehicle', '') else vehicle_label end,
    on_leave = coalesce((p_patch->>'onLeave')::boolean, on_leave),
    staff_active = coalesce((p_patch->>'active')::boolean, staff_active)
  where id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Staff member not found'; end if;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'UPDATE_STAFF', 'PROFILE', p_user_id, p_patch);
  return jsonb_build_object('id', v_row.id, 'role', v_row.role, 'active', v_row.staff_active, 'onLeave', v_row.on_leave);
end $$;
grant execute on function public.admin_update_staff(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- B. Pickup zones — real records connected to collection routes
-- ---------------------------------------------------------------------------

create table if not exists public.pickup_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'United Kingdom',
  areas text[] not null default '{}',
  route text,
  color text not null default '#009B68',
  active boolean not null default true,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);
alter table public.pickup_zones enable row level security;
drop policy if exists "Staff read pickup zones" on public.pickup_zones;
create policy "Staff read pickup zones" on public.pickup_zones
  for select to authenticated using (public.is_operations_admin() or public.is_finance_staff());
drop policy if exists "Admins manage pickup zones" on public.pickup_zones;
create policy "Admins manage pickup zones" on public.pickup_zones
  for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());

-- Seed zones from the live collection routes (idempotent: only missing routes).
insert into public.pickup_zones (name, country, areas, route, color, latitude, longitude)
select distinct on (cs.route)
  cs.route,
  coalesce(nullif(cs.country, ''), 'United Kingdom'),
  case when jsonb_typeof(to_jsonb(cs.areas)) = 'array'
       then coalesce(array(select jsonb_array_elements_text(to_jsonb(cs.areas))), '{}')
       else array[coalesce(to_jsonb(cs.areas) #>> '{}', '')] end,
  cs.route,
  (array['#009B68','#1d4ed8','#ea580c','#7c3aed','#0891b2','#a16207','#dc2626','#0f766e','#b45309','#4338ca'])
    [1 + (abs(hashtext(cs.route)) % 10)],
  case cs.route
    when 'LONDON ROUTE' then 51.5074 when 'BIRMINGHAM ROUTE' then 52.4862
    when 'MANCHESTER ROUTE' then 53.4808 when 'LEEDS ROUTE' then 53.8008
    when 'CARDIFF ROUTE' then 51.4816 when 'BOURNEMOUTH ROUTE' then 50.7192
    when 'NOTTINGHAM ROUTE' then 52.9548 when 'BRIGHTON ROUTE' then 50.8225
    when 'SOUTHEND ROUTE' then 51.5459 when 'NORTHAMPTON ROUTE' then 52.2405
    when 'SCOTLAND ROUTE' then 55.8642
    else case when lower(coalesce(cs.country, '')) like '%ireland%' then 53.3498 else null end end,
  case cs.route
    when 'LONDON ROUTE' then -0.1278 when 'BIRMINGHAM ROUTE' then -1.8904
    when 'MANCHESTER ROUTE' then -2.2426 when 'LEEDS ROUTE' then -1.5491
    when 'CARDIFF ROUTE' then -3.1791 when 'BOURNEMOUTH ROUTE' then -1.8808
    when 'NOTTINGHAM ROUTE' then -1.1581 when 'BRIGHTON ROUTE' then -0.1372
    when 'SOUTHEND ROUTE' then 0.7077 when 'NORTHAMPTON ROUTE' then -0.9027
    when 'SCOTLAND ROUTE' then -4.2518
    else case when lower(coalesce(cs.country, '')) like '%ireland%' then -6.2603 else null end end
from public.collection_schedules cs
where nullif(trim(coalesce(cs.route, '')), '') is not null
on conflict (name) do nothing;

create or replace function public.touch_pickup_zone() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists pickup_zones_touch on public.pickup_zones;
create trigger pickup_zones_touch before update on public.pickup_zones
  for each row execute function public.touch_pickup_zone();

-- Live stats per zone: waiting shipments, drivers on the route, schedule dates.
create or replace function public.admin_zone_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Staff access required';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'zoneId', z.id,
    'pendingCollections', (
      select count(*) from public.shipments s
      left join public.collection_schedules cs on cs.id = s.collection_schedule_id
      where s.deleted_at is null
        and s.status not in ('Delivered', 'Cancelled', 'Collected')
        and (cs.route = z.route or s.metadata->'collection'->>'route' = z.route)),
    'activeDrivers', (
      select coalesce(jsonb_agg(distinct jsonb_build_object('id', p.id, 'name', coalesce(p.full_name, p.email))), '[]'::jsonb)
      from public.driver_runs r join public.profiles p on p.id = r.driver_id
      where r.route_name = z.route and r.run_date >= current_date and r.status in ('planned', 'active')),
    'completedCollections', (
      select count(*) from public.driver_run_stops st
      join public.driver_runs r on r.id = st.run_id
      where r.route_name = z.route and st.stop_type = 'collection' and st.status = 'completed'),
    'scheduleDates', (
      select coalesce(jsonb_agg(cs.pickup_date order by cs.pickup_date), '[]'::jsonb)
      from public.collection_schedules cs where cs.route = z.route)
  )), '[]'::jsonb)
  into v_result from public.pickup_zones z;
  return v_result;
end $$;
grant execute on function public.admin_zone_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- C. Finance overview aggregate
-- ---------------------------------------------------------------------------

create or replace function public.admin_finance_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;

  with completed as (
    select * from public.payments
    where lower(coalesce(payment_status, '')) in ('completed', 'paid', 'success', 'succeeded')
  ),
  approved_expenses as (
    select * from public.finance_expenses where status in ('recorded', 'approved')
  ),
  currency_totals as (
    select coalesce(c.currency, 'GBP') as currency,
           sum(c.amount) as collected
    from completed c group by 1
  ),
  daily as (
    select d::date as day,
      coalesce((select sum(amount) from completed where created_at::date = d::date and coalesce(currency,'GBP') = 'GBP'), 0) as in_gbp,
      coalesce((select sum(amount) from completed where created_at::date = d::date and coalesce(currency,'GBP') = 'EUR'), 0) as in_eur,
      coalesce((select sum(amount) from approved_expenses where expense_date = d::date), 0) as out_gbp
    from generate_series(current_date - 29, current_date, interval '1 day') d
  )
  select jsonb_build_object(
    'collectedByCurrency', (select coalesce(jsonb_object_agg(currency, collected), '{}'::jsonb) from currency_totals),
    -- Payments awaiting a collected status: without this the screen would show
    -- a £0 cash position while real money is sitting in "pending".
    'pendingByCurrency', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select coalesce(currency, 'GBP') as currency, sum(amount) as total
      from public.payments
      where lower(coalesce(payment_status, '')) not in ('completed', 'paid', 'success', 'succeeded')
        and lower(coalesce(payment_status, '')) not in ('failed', 'cancelled', 'refunded')
      group by 1) p),
    'pendingPaymentCount', (select count(*) from public.payments
      where lower(coalesce(payment_status, '')) not in ('completed', 'paid', 'success', 'succeeded', 'failed', 'cancelled', 'refunded')),
    'expensesTotal', (select coalesce(sum(amount), 0) from approved_expenses),
    'incoming30', (select coalesce(sum(amount), 0) from completed where created_at > now() - interval '30 days'),
    'incomingPrev30', (select coalesce(sum(amount), 0) from completed
                       where created_at between now() - interval '60 days' and now() - interval '30 days'),
    'outgoing30', (select coalesce(sum(amount), 0) from approved_expenses where expense_date > current_date - 30),
    'outgoingPrev30', (select coalesce(sum(amount), 0) from approved_expenses
                       where expense_date between current_date - 60 and current_date - 30),
    'billedByCurrency', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select coalesce(currency, 'GBP') as currency, sum(total) as total
      from public.driver_invoices where status <> 'void' group by 1) b),
    'unpaidInvoices', (select count(*) from public.driver_invoices where status in ('issued', 'partial', 'overdue')),
    'outstandingByCurrency', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select coalesce(currency, 'GBP') as currency, sum(total) as total
      from public.driver_invoices where status in ('issued', 'partial', 'overdue') group by 1) o),
    'unreconciledPayments', (select count(*) from public.payments where reconciled_at is null),
    'pendingProofs', (select count(*) from public.payment_proofs where status = 'pending'),
    'cashflow', (select coalesce(jsonb_agg(jsonb_build_object(
      'day', to_char(day, 'YYYY-MM-DD'), 'inGBP', in_gbp, 'inEUR', in_eur, 'out', out_gbp) order by day), '[]'::jsonb) from daily),
    'recentTransactions', (select coalesce(jsonb_agg(t order by t->>'createdAt' desc), '[]'::jsonb) from (
      select jsonb_build_object(
        'id', p.id, 'amount', p.amount, 'currency', coalesce(p.currency, 'GBP'),
        'method', p.payment_method, 'status', p.payment_status,
        'reconciled', p.reconciled_at is not null,
        'createdAt', p.created_at,
        'shipmentId', p.shipment_id,
        'reference', coalesce(s.customer_reference, s.tracking_number),
        'customer', coalesce(s.metadata->'sender'->>'name', 'Customer'),
        'proofId', (select pp.id from public.payment_proofs pp where pp.shipment_id = p.shipment_id order by pp.created_at desc limit 1)
      ) as t
      from public.payments p
      left join public.shipments s on s.id = p.shipment_id
      order by p.created_at desc limit 20) tx)
  ) into v;
  return v;
end $$;
grant execute on function public.admin_finance_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- D. Reports / Analytics aggregate (filterable, currency-aware)
-- ---------------------------------------------------------------------------

create or replace function public.admin_reports(
  p_from date,
  p_to date,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
  v_days integer := greatest(1, p_to - p_from + 1);
  v_prev_from date := p_from - (p_to - p_from + 1);
  v_prev_to date := p_from - 1;
  f_country text := nullif(p_filters->>'country', '');
  f_route text := nullif(p_filters->>'route', '');
  f_driver uuid := nullif(p_filters->>'driver', '')::uuid;
  f_status text := nullif(p_filters->>'status', '');
  f_currency text := nullif(p_filters->>'currency', '');
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Staff access required';
  end if;

  with ships as (
    select s.*, cs.route as schedule_route,
      coalesce(cs.route, s.metadata->'collection'->>'route') as route,
      coalesce(s.metadata->'sender'->>'country', 'United Kingdom') as country
    from public.shipments s
    left join public.collection_schedules cs on cs.id = s.collection_schedule_id
    where s.deleted_at is null
      and (f_country is null or coalesce(s.metadata->'sender'->>'country', 'United Kingdom') ilike '%' || f_country || '%')
      and (f_route is null or coalesce(cs.route, s.metadata->'collection'->>'route') = f_route)
      and (f_driver is null or s.assigned_driver_id = f_driver)
      and (f_status is null or s.status = f_status)
  ),
  range_ships as (select * from ships where created_at::date between p_from and p_to),
  prev_ships as (select * from ships where created_at::date between v_prev_from and v_prev_to),
  -- Payments are LEFT joined so revenue is never silently understated by
  -- payments that have no linked shipment; a matching shipment is only
  -- required when a shipment-scoped filter is active.
  pays as (
    select p.*, sh.route, sh.country
    from public.payments p
    left join ships sh on sh.id = p.shipment_id
    where lower(coalesce(p.payment_status, '')) in ('completed', 'paid', 'success', 'succeeded')
      and (f_currency is null or coalesce(p.currency, 'GBP') = f_currency)
      and (sh.id is not null
           or (f_country is null and f_route is null and f_driver is null and f_status is null))
  ),
  range_pays as (select * from pays where created_at::date between p_from and p_to),
  prev_pays as (select * from pays where created_at::date between v_prev_from and v_prev_to),
  stops as (
    select st.*, r.driver_id, r.route_name, r.run_date
    from public.driver_run_stops st join public.driver_runs r on r.id = st.run_id
    where r.run_date between p_from and p_to
      and (f_driver is null or r.driver_id = f_driver)
      and (f_route is null or r.route_name = f_route)
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days),
    'revenue', jsonb_build_object(
      'byCurrency', (select coalesce(jsonb_object_agg(c, t), '{}'::jsonb) from
        (select coalesce(currency, 'GBP') c, sum(amount) t from range_pays group by 1) x),
      'prevByCurrency', (select coalesce(jsonb_object_agg(c, t), '{}'::jsonb) from
        (select coalesce(currency, 'GBP') c, sum(amount) t from prev_pays group by 1) x),
      'series', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'gbp', g, 'eur', e) order by d), '[]'::jsonb) from
        (select created_at::date d,
                sum(amount) filter (where coalesce(currency,'GBP') = 'GBP') g,
                sum(amount) filter (where coalesce(currency,'GBP') = 'EUR') e
         from range_pays group by 1) x),
      'byRoute', (select coalesce(jsonb_agg(jsonb_build_object('route', route, 'currency', c, 'total', t) order by t desc), '[]'::jsonb) from
        (select coalesce(route, 'Unrouted') route, coalesce(currency, 'GBP') c, sum(amount) t
         from range_pays group by 1, 2 order by 3 desc limit 12) x),
      'byMethod', (select coalesce(jsonb_agg(jsonb_build_object('method', m, 'currency', c, 'total', t) order by t desc), '[]'::jsonb) from
        (select coalesce(payment_method, 'Unknown') m, coalesce(currency, 'GBP') c, sum(amount) t
         from range_pays group by 1, 2 order by 3 desc limit 12) x)),
    'shipments', jsonb_build_object(
      'total', (select count(*) from range_ships),
      'prevTotal', (select count(*) from prev_ships),
      'series', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb) from
        (select created_at::date d, count(*) c from range_ships group by 1) x),
      'byStatus', (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) from
        (select status, count(*) c from range_ships group by 1) x),
      'byRoute', (select coalesce(jsonb_agg(jsonb_build_object('route', r, 'count', c) order by c desc), '[]'::jsonb) from
        (select coalesce(route, 'Unrouted') r, count(*) c from range_ships group by 1 order by 2 desc limit 12) x)),
    'collections', jsonb_build_object(
      'completed', (select count(*) from stops where stop_type = 'collection' and status = 'completed'),
      'failed', (select count(*) from stops where stop_type = 'collection' and status = 'failed'),
      'byRoute', (select coalesce(jsonb_agg(jsonb_build_object('route', r, 'done', d, 'failed', f) order by d desc), '[]'::jsonb) from
        (select coalesce(route_name, 'Unrouted') r,
                count(*) filter (where status = 'completed') d,
                count(*) filter (where status = 'failed') f
         from stops where stop_type = 'collection' group by 1) x)),
    'deliveries', jsonb_build_object(
      'completed', (select count(*) from stops where stop_type = 'delivery' and status = 'completed'),
      'failed', (select count(*) from stops where stop_type = 'delivery' and status = 'failed'),
      'successRate', (select case when count(*) = 0 then null
        else round(100.0 * count(*) filter (where status = 'completed') / count(*), 1) end
        from stops where stop_type = 'delivery' and status in ('completed', 'failed'))),
    'driverPerformance', (select coalesce(jsonb_agg(jsonb_build_object(
        'driverId', driver_id, 'name', name, 'completed', done, 'failed', failed) order by done desc), '[]'::jsonb) from
      (select st.driver_id, coalesce(p.full_name, p.email, 'Driver') as name,
              count(*) filter (where st.status = 'completed') done,
              count(*) filter (where st.status = 'failed') failed
       from stops st left join public.profiles p on p.id = st.driver_id
       group by 1, 2 order by 3 desc limit 15) x),
    'failReasons', (select coalesce(jsonb_object_agg(reason, c), '{}'::jsonb) from
      (select coalesce(failure_reason, 'other') reason, count(*) c
       from stops where status = 'failed' group by 1) x),
    'quotes', jsonb_build_object(
      'requested', (select count(*) from public.custom_quotes where created_at::date between p_from and p_to),
      'approved', (select count(*) from public.custom_quotes
        where created_at::date between p_from and p_to and status in ('approved', 'booked')),
      'booked', (select count(*) from public.custom_quotes
        where created_at::date between p_from and p_to and status = 'booked')),
    'customers', jsonb_build_object(
      'new', (select count(*) from public.profiles
        where created_at::date between p_from and p_to
          and coalesce(is_admin, false) = false
          and lower(coalesce(role, 'customer')) not in ('admin', 'driver', 'finance', 'logistics', 'dispatcher')),
      'returning', (select count(*) from
        (select user_id from range_ships where user_id is not null group by user_id
         having count(*) > 1 or user_id in (select user_id from prev_ships where user_id is not null)) x),
      'series', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb) from
        (select created_at::date d, count(*) c from public.profiles
         where created_at::date between p_from and p_to
           and coalesce(is_admin, false) = false
           and lower(coalesce(role, 'customer')) not in ('admin', 'driver', 'finance', 'logistics', 'dispatcher')
         group by 1) x)),
    'proofs', jsonb_build_object(
      'pending', (select count(*) from public.payment_proofs where status = 'pending'),
      'verified', (select count(*) from public.payment_proofs
        where status = 'verified' and reviewed_at::date between p_from and p_to),
      'rejected', (select count(*) from public.payment_proofs
        where status = 'rejected' and reviewed_at::date between p_from and p_to),
      'avgValidationHours', (select round(avg(extract(epoch from (reviewed_at - created_at)) / 3600.0)::numeric, 1)
        from public.payment_proofs where reviewed_at is not null and reviewed_at::date between p_from and p_to)),
    'outstanding', jsonb_build_object(
      'byCurrency', (select coalesce(jsonb_object_agg(c, t), '{}'::jsonb) from
        (select coalesce(currency, 'GBP') c, sum(total) t from public.driver_invoices
         where status in ('issued', 'partial', 'overdue') group by 1) x),
      'invoices', (select count(*) from public.driver_invoices where status in ('issued', 'partial', 'overdue')))
  ) into v;
  return v;
end $$;
grant execute on function public.admin_reports(date, date, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- E. Customer records v2 — lifetime value, last booking, active flag
-- ---------------------------------------------------------------------------

create or replace function public.admin_customer_records() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required';
  end if;

  with shipment_identities as (
    select s.id as shipment_id, s.user_id,
      lower(nullif(trim(coalesce(s.metadata->'sender'->>'email', '')), '')) as email,
      nullif(regexp_replace(coalesce(s.metadata->'sender'->>'phone', s.metadata->>'whatsappNumber', ''), '[^0-9]', '', 'g'), '') as phone,
      -- Resolve the sender name the same way the app does: prefer sender.name,
      -- then firstName + lastName. Leave NULL when truly absent so max() below
      -- picks a real name from the group instead of a premature 'Unknown
      -- customer' literal (which sorts high and would win the max()).
      coalesce(
        nullif(trim(s.metadata->'sender'->>'name'), ''),
        nullif(trim(coalesce(s.metadata->'sender'->>'firstName', '') || ' ' || coalesce(s.metadata->'sender'->>'lastName', '')), '')
      ) as name,
      s.customer_reference, s.created_at, s.tracking_number,
      coalesce((
        select sum(coalesce((i->>'quantity')::numeric, 0) * coalesce((i->>'unitPrice')::numeric, 0))
        from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'items') = 'array'
                                       then s.metadata->'invoice'->'items' else '[]'::jsonb end) i
      ), 0) as invoice_total,
      coalesce((s.metadata->'invoice'->>'paid')::boolean, false) as invoice_paid,
      coalesce(s.metadata->'invoice'->>'currency', 'GBP') as invoice_currency,
      coalesce(s.metadata->'sender'->>'country', 'United Kingdom') as country,
      trim(coalesce(s.metadata->'sender'->>'address', '') || ', ' || coalesce(s.metadata->'sender'->>'city', '')) as pickup_address
    from public.shipments s
    where s.deleted_at is null
  ),
  keyed as (
    select *, coalesce(user_id::text, email, phone, shipment_id::text) as dedupe_key
    from shipment_identities
  ),
  quote_identities as (
    select q.id as quote_id, q.user_id,
      nullif(regexp_replace(coalesce(q.phone_number, ''), '[^0-9]', '', 'g'), '') as phone,
      q.created_at
    from public.custom_quotes q
  ),
  profile_rows as (
    select p.id, p.full_name, p.email, p.phone_number, p.country, p.customer_code,
           trim(coalesce(p.pickup_address, '') || ', ' || coalesce(p.pickup_city, '')) as pickup_address,
           p.created_at
    from public.profiles p
    where coalesce(p.is_admin, false) = false
      and lower(coalesce(p.role, 'customer')) not in ('admin', 'driver', 'finance', 'logistics', 'dispatcher')
  ),
  -- A FULL OUTER JOIN cannot use OR conditions in Postgres, so shipments are
  -- matched to profiles with a LEFT JOIN and profile-only customers are added
  -- back with a UNION.
  keyed_matched as (
    select k.*, pr.id as matched_profile
    from keyed k
    left join profile_rows pr
      on k.user_id = pr.id
      or (k.user_id is null and k.email is not null and k.email = lower(coalesce(pr.email, '')))
      or (k.user_id is null and k.email is null and k.phone is not null
          and k.phone = regexp_replace(coalesce(pr.phone_number, ''), '[^0-9]', '', 'g'))
  ),
  grouped as (
    select
      coalesce(km.matched_profile::text, km.dedupe_key) as key,
      km.matched_profile as profile_id,
      max(km.name) as ship_name,
      max(km.email) as ship_email,
      max(km.phone) as ship_phone,
      max(km.country) as ship_country,
      max(km.customer_reference) as ship_reference,
      max(nullif(km.pickup_address, ',')) as ship_pickup,
      count(distinct km.shipment_id) as shipment_count,
      sum(km.invoice_total) as lifetime_value,
      sum(case when not km.invoice_paid then km.invoice_total else 0 end) as outstanding,
      max(km.invoice_currency) as currency,
      max(km.created_at) as last_booking
    from keyed_matched km
    group by 1, 2
  ),
  merged as (
    select g.key,
      coalesce(pr.full_name, g.ship_name) as full_name,
      coalesce(pr.email, g.ship_email) as email,
      coalesce(pr.phone_number, g.ship_phone) as phone,
      coalesce(pr.country, g.ship_country) as country,
      coalesce(pr.customer_code, g.ship_reference) as customer_reference,
      coalesce(nullif(pr.pickup_address, ','), g.ship_pickup) as pickup_address,
      g.shipment_count, g.lifetime_value, g.outstanding, g.currency, g.last_booking,
      greatest(coalesce(g.last_booking, 'epoch'::timestamptz), coalesce(pr.created_at, 'epoch'::timestamptz)) as last_activity,
      g.profile_id
    from grouped g
    left join profile_rows pr on pr.id = g.profile_id
    union all
    select pr.id::text, pr.full_name, pr.email, pr.phone_number, pr.country, pr.customer_code,
      nullif(pr.pickup_address, ','), 0, 0, 0, 'GBP', null,
      coalesce(pr.created_at, 'epoch'::timestamptz), pr.id
    from profile_rows pr
    where not exists (select 1 from grouped g where g.profile_id = pr.id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', m.key,
    'profileId', m.profile_id,
    'fullName', coalesce(m.full_name, 'Unknown customer'),
    'email', m.email,
    'phone', m.phone,
    'country', m.country,
    'customerReference', m.customer_reference,
    'pickupAddress', m.pickup_address,
    'shipmentCount', m.shipment_count,
    'quoteCount', coalesce((
      select count(*) from quote_identities qi
      where (m.profile_id is not null and qi.user_id = m.profile_id)
         or (m.profile_id is null and qi.phone is not null and qi.phone = m.phone)), 0),
    'lifetimeValue', coalesce(m.lifetime_value, 0),
    'outstanding', coalesce(m.outstanding, 0),
    'currency', coalesce(m.currency, 'GBP'),
    'lastBooking', m.last_booking,
    'lastActivity', m.last_activity,
    'active', m.last_activity > now() - interval '180 days'
  ) order by m.last_activity desc), '[]'::jsonb)
  into v_result
  from merged m;

  return v_result;
end $$;

-- ---------------------------------------------------------------------------
-- F. Reorder a stop within its run
-- ---------------------------------------------------------------------------

-- driver_run_stops has unique(run_id, stop_order), so a direct swap violates
-- the constraint mid-statement; the moving row is parked on a negative order
-- first. Completed stops keep their position in the delivered sequence.
create or replace function public.reorder_run_stop(p_stop_id uuid, p_direction text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype; v_other public.driver_run_stops%rowtype;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  if p_direction not in ('up', 'down') then raise exception 'Direction must be up or down'; end if;

  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found then raise exception 'Stop not found'; end if;
  if v_stop.status in ('completed', 'failed') then
    raise exception 'A completed or failed stop cannot be moved';
  end if;

  if p_direction = 'up' then
    select * into v_other from public.driver_run_stops
    where run_id = v_stop.run_id and stop_order < v_stop.stop_order
      and status not in ('completed', 'failed')
    order by stop_order desc limit 1 for update;
  else
    select * into v_other from public.driver_run_stops
    where run_id = v_stop.run_id and stop_order > v_stop.stop_order
      and status not in ('completed', 'failed')
    order by stop_order asc limit 1 for update;
  end if;
  if not found then return jsonb_build_object('moved', false, 'reason', 'already at the end'); end if;

  update public.driver_run_stops set stop_order = -1, updated_at = now() where id = v_stop.id;
  update public.driver_run_stops set stop_order = v_stop.stop_order, updated_at = now() where id = v_other.id;
  update public.driver_run_stops set stop_order = v_other.stop_order, updated_at = now() where id = v_stop.id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'REORDER_STOP', 'DRIVER_RUN_STOP', v_stop.id,
          jsonb_build_object('runId', v_stop.run_id, 'from', v_stop.stop_order, 'to', v_other.stop_order));

  return jsonb_build_object('moved', true, 'stopOrder', v_other.stop_order);
end $$;
grant execute on function public.reorder_run_stop(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- G. Indexes for the report ranges and lists
-- ---------------------------------------------------------------------------

create index if not exists payments_created_idx on public.payments(created_at desc);
create index if not exists shipments_created_idx on public.shipments(created_at desc) where deleted_at is null;
create index if not exists driver_runs_date_idx on public.driver_runs(run_date desc);
create index if not exists custom_quotes_created_idx on public.custom_quotes(created_at desc);
create index if not exists delivery_notes_created_idx on public.delivery_notes(created_at desc);
create index if not exists payment_proofs_reviewed_idx on public.payment_proofs(reviewed_at desc) where reviewed_at is not null;
