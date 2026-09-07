-- Drivers start their own routes.
--
-- The run/stop engine already does everything a collection day needs — status
-- transitions, arrivals, scanning, seals, offline replay — but nothing has
-- created a run since the dispatcher board was retired, so all of it has sat
-- idle with zero rows. These two routines give the driver the one thing
-- dispatch used to provide: a run to work through.
--
-- `driver_runs` is unique on (driver_id, run_date), so a run is *the driver's
-- day*, not a single route. Starting a second route appends its collections to
-- the same run, which is what happens in practice when a short route finishes
-- early and the driver picks up another.

/**
 * Start (or resume) today's run and add a route's collections to it.
 *
 * Shipments arrive in the order the driver should drive them — the optimiser
 * has already run on the phone — and are appended after whatever is already on
 * the run. Re-starting a route the driver is already working is a no-op for
 * the stops that exist, so tapping it twice cannot duplicate a collection.
 */
create or replace function public.start_collection_route(
  p_route_name text,
  p_shipment_ids uuid[],
  p_date date default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid := auth.uid();
  v_date date := coalesce(p_date, current_date);
  v_run_id uuid;
  v_next integer;
  v_added integer := 0;
  v_shipment uuid;
begin
  if v_driver is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  -- A driver may only start their own run. Admins get in for support.
  if not (public.is_staff_member() or public.is_operations_admin()) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  insert into public.driver_runs as r (driver_id, run_date, status, route_name, run_type, started_at)
  values (v_driver, v_date, 'active', nullif(trim(coalesce(p_route_name, '')), ''), 'pickup', now())
  on conflict (driver_id, run_date) do update
    set status = case when r.status in ('completed', 'cancelled') then r.status else 'active' end,
        -- Keep the first route's name when a second is appended, rather than
        -- silently relabelling the day.
        route_name = coalesce(r.route_name, excluded.route_name),
        started_at = coalesce(r.started_at, now()),
        updated_at = now()
  returning r.id into v_run_id;

  select coalesce(max(stop_order), 0) + 1 into v_next
  from public.driver_run_stops where run_id = v_run_id;

  -- foreach preserves the caller's order, which is the optimised order.
  foreach v_shipment in array coalesce(p_shipment_ids, array[]::uuid[])
  loop
    -- Already on this run? Leave it exactly as it is; it may be half worked.
    if exists (
      select 1 from public.driver_run_stops
      where run_id = v_run_id and shipment_id = v_shipment
    ) then
      continue;
    end if;

    insert into public.driver_run_stops (
      run_id, shipment_id, stop_order, stop_type, status, address, latitude, longitude
    )
    select
      v_run_id,
      s.id,
      v_next,
      'collection',
      'planned',
      coalesce(
        s.metadata->'sender'->>'address',
        s.metadata->'senderDetails'->>'address'
      ),
      s.pickup_latitude,
      s.pickup_longitude
    from public.shipments s
    where s.id = v_shipment and s.deleted_at is null;

    if found then
      v_next := v_next + 1;
      v_added := v_added + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'runId', v_run_id,
    'date', v_date,
    'added', v_added,
    'stops', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'stopId', st.id,
        'shipmentId', st.shipment_id,
        'stopOrder', st.stop_order,
        'status', st.status
      ) order by st.stop_order), '[]'::jsonb)
      from public.driver_run_stops st where st.run_id = v_run_id
    )
  );
end $$;

revoke all on function public.start_collection_route(text, uuid[], date) from public, anon;
grant execute on function public.start_collection_route(text, uuid[], date) to authenticated;

/**
 * Reorder the stops a driver has not finished yet.
 *
 * Only outstanding work moves. Completed and failed stops keep the positions
 * they were actually worked in, because the run doubles as the record of what
 * happened and rewriting history would make the day's audit trail a fiction.
 * The reordered stops are numbered after them.
 */
create or replace function public.reorder_driver_stops(
  p_run_id uuid,
  p_stop_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid;
  v_done integer;
  v_index integer := 0;
  v_stop uuid;
  v_moved integer := 0;
begin
  select driver_id into v_driver from public.driver_runs where id = p_run_id;
  if v_driver is null then
    raise exception 'Run % not found', p_run_id using errcode = 'P0002';
  end if;
  if v_driver <> auth.uid() and not public.is_operations_admin() then
    raise exception 'That is not your run' using errcode = '42501';
  end if;

  select count(*) into v_done
  from public.driver_run_stops
  where run_id = p_run_id and status in ('completed', 'failed');

  -- Two passes, because stop_order has no unique constraint but sharing a
  -- number would still make the driver's list order arbitrary. Park the moving
  -- stops well clear of the finished ones first.
  update public.driver_run_stops
     set stop_order = stop_order + 100000
   where run_id = p_run_id and status not in ('completed', 'failed');

  foreach v_stop in array coalesce(p_stop_ids, array[]::uuid[])
  loop
    v_index := v_index + 1;
    update public.driver_run_stops
       set stop_order = v_done + v_index, updated_at = now()
     where id = v_stop
       and run_id = p_run_id
       and status not in ('completed', 'failed');
    if found then v_moved := v_moved + 1; end if;
  end loop;

  -- Anything the caller did not mention (a stop added on another device, say)
  -- keeps a stable position at the end rather than colliding on a number.
  with stragglers as (
    select id, row_number() over (order by stop_order) as rn
    from public.driver_run_stops
    where run_id = p_run_id and stop_order > 100000
  )
  update public.driver_run_stops st
     set stop_order = v_done + v_index + s.rn
    from stragglers s
   where st.id = s.id;

  -- Finished stops are renumbered 1..n in the order they were worked, so the
  -- list reads chronologically from the top.
  with worked as (
    select id, row_number() over (
      order by coalesce(completed_at, failed_at, arrived_at, created_at)
    ) as rn
    from public.driver_run_stops
    where run_id = p_run_id and status in ('completed', 'failed')
  )
  update public.driver_run_stops st
     set stop_order = w.rn
    from worked w
   where st.id = w.id;

  return jsonb_build_object('runId', p_run_id, 'moved', v_moved, 'completed', v_done);
end $$;

revoke all on function public.reorder_driver_stops(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_driver_stops(uuid, uuid[]) to authenticated;

/**
 * A driver's own run for a date, with its stops joined to what the driver
 * needs at the door.
 *
 * One read, so the route screen does not fan out into a query per stop.
 */
create or replace function public.driver_run_for_date(p_date date default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
       'runId', r.id,
       'routeName', r.route_name,
       'status', r.status,
       'date', r.run_date,
       'startedAt', r.started_at,
       'stops', coalesce((
         select jsonb_agg(jsonb_build_object(
           'stopId', st.id,
           'shipmentId', st.shipment_id,
           'stopOrder', st.stop_order,
           'status', st.status,
           'address', st.address,
           'latitude', st.latitude,
           'longitude', st.longitude,
           'arrivedAt', st.arrived_at,
           'completedAt', st.completed_at,
           'customerReference', s.customer_reference,
           'trackingNumber', s.tracking_number,
           'customerName', coalesce(
             s.metadata->'sender'->>'name',
             trim(concat_ws(' ',
               s.metadata->'sender'->>'firstName',
               s.metadata->'sender'->>'lastName'))),
           'phone', s.metadata->'sender'->>'phone',
           'addressVerified', s.pickup_address_verified,
           'geocodePrecision', s.pickup_geocode_precision
         ) order by st.stop_order)
         from public.driver_run_stops st
         join public.shipments s on s.id = st.shipment_id
         where st.run_id = r.id
       ), '[]'::jsonb)
     )
     from public.driver_runs r
     where r.driver_id = auth.uid()
       and r.run_date = coalesce(p_date, current_date)
     limit 1),
    'null'::jsonb
  );
$$;

revoke all on function public.driver_run_for_date(date) from public, anon;
grant execute on function public.driver_run_for_date(date) to authenticated;
