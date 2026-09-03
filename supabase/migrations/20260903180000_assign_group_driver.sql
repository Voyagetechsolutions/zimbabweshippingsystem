-- ---------------------------------------------------------------------------
-- Assigning a driver to a whole collection group
--
-- The group already is the route: everything collecting on the Northampton run
-- on the 14th. Making dispatch re-pick those same shipments one by one in the
-- route builder just to name a driver was the remaining piece of busywork, so
-- this does the whole thing in one call — create or reuse the driver's run for
-- that day, put every collection in the group on it, order the stops by the
-- windows customers actually asked for, and tie the group to the run.
-- ---------------------------------------------------------------------------

/**
 * Put a driver on a collection group.
 *
 * Passing a null driver unassigns the group and cancels the run it created,
 * which is what dispatch wants when a driver calls in sick and the work has to
 * go back in the pool.
 *
 * Stops are ordered by the customer's requested window, earliest first, with
 * everyone who did not choose one after them. That is the whole point of asking
 * for windows: a route sequenced against them is a route that keeps its
 * promises. Where a customer chose a window it is also recorded as the dispatch
 * window, so the run reads as agreed rather than as an unanswered question —
 * and because it matches what they asked for, nobody is flagged as moved and
 * nobody is owed a phone call.
 */
create or replace function public.assign_collection_run_driver(
  p_run_id uuid,
  p_driver_id uuid,
  p_vehicle text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run public.collection_runs%rowtype;
  v_driver_run public.driver_runs%rowtype;
  v_driver_run_id uuid;
  v_order integer;
  v_added integer := 0;
  v_row record;
  v_sender jsonb;
begin
  if not public.is_operations_admin() then raise exception 'Only dispatch can assign a driver'; end if;

  select * into v_run from public.collection_runs where id = p_run_id for update;
  if not found then raise exception 'Collection group not found'; end if;

  -- Unassign.
  if p_driver_id is null then
    if v_run.driver_run_id is not null then
      update public.driver_runs set status = 'cancelled', updated_at = now()
       where id = v_run.driver_run_id and status <> 'completed';
      update public.shipments set assigned_driver_id = null
       where collection_run_id = p_run_id and deleted_at is null;
    end if;
    update public.collection_runs
       set driver_run_id = null, status = 'planned' where id = p_run_id;
    return jsonb_build_object('assigned', false, 'stops', 0);
  end if;

  -- A driver run is filed by date, so an undated group has nothing to file
  -- against. Publishing the route's date is the fix, and saying so is more use
  -- than a constraint violation.
  if v_run.collection_date is null then
    raise exception 'Publish a collection date for % before assigning a driver', v_run.route;
  end if;

  -- One run per driver per day is a database rule, so reuse theirs if it exists.
  select * into v_driver_run from public.driver_runs
   where driver_id = p_driver_id and run_date = v_run.collection_date;

  if found then
    v_driver_run_id := v_driver_run.id;
    if v_driver_run.status = 'completed' then
      raise exception 'That driver has already completed their run for this day';
    end if;
    update public.driver_runs
       set route_name = coalesce(route_name, v_run.route),
           vehicle_label = coalesce(p_vehicle, vehicle_label),
           status = case when status = 'cancelled' then 'planned' else status end,
           updated_at = now()
     where id = v_driver_run_id;
  else
    insert into public.driver_runs (driver_id, run_date, status, run_type, route_name, vehicle_label, created_by)
    values (p_driver_id, v_run.collection_date, 'planned', 'pickup', v_run.route, p_vehicle, auth.uid())
    returning id into v_driver_run_id;
  end if;

  -- Moving the group to a different driver takes its existing stops along, so
  -- nothing has to be rebuilt and no stop is orphaned on the old run.
  if v_run.driver_run_id is not null and v_run.driver_run_id <> v_driver_run_id then
    update public.driver_run_stops st
       set run_id = v_driver_run_id,
           stop_order = st.stop_order
             + (select coalesce(max(stop_order), 0) from public.driver_run_stops where run_id = v_driver_run_id)
     where st.run_id = v_run.driver_run_id
       and st.shipment_id in (select id from public.shipments where collection_run_id = p_run_id)
       and st.status not in ('completed', 'failed');
    update public.driver_runs set status = 'cancelled', updated_at = now()
     where id = v_run.driver_run_id
       and not exists (select 1 from public.driver_run_stops where run_id = v_run.driver_run_id);
  end if;

  select coalesce(max(stop_order), 0) into v_order
    from public.driver_run_stops where run_id = v_driver_run_id;

  for v_row in
    select s.id, s.metadata, s.pickup_latitude, s.pickup_longitude,
           cs.requested_start, cs.requested_end, cs.requested_flexible, cs.requested_at
      from public.shipments s
      left join public.collection_slots cs on cs.shipment_id = s.id
     where s.collection_run_id = p_run_id
       and s.deleted_at is null
       and lower(coalesce(s.status, '')) in ('booking confirmed', 'confirmed', 'pending')
       and not exists (
         select 1 from public.driver_run_stops st
          where st.run_id = v_driver_run_id and st.shipment_id = s.id)
     -- Earliest promised window first; everyone without one after them.
     order by cs.requested_start nulls last, s.created_at
  loop
    v_sender := coalesce(v_row.metadata->'sender', v_row.metadata->'senderDetails', '{}'::jsonb);
    v_order := v_order + 1;

    insert into public.driver_run_stops (
      run_id, shipment_id, stop_order, stop_type, status, address, latitude, longitude,
      recipient_name, time_window_start, time_window_end)
    values (
      v_driver_run_id, v_row.id, v_order, 'collection', 'planned',
      nullif(btrim(concat_ws(', ',
        nullif(v_sender->>'address', ''), nullif(v_sender->>'city', ''),
        nullif(coalesce(v_sender->>'postalCode', v_sender->>'postcode'), ''))), ''),
      v_row.pickup_latitude, v_row.pickup_longitude,
      nullif(btrim(concat_ws(' ', v_sender->>'firstName', v_sender->>'lastName')), ''),
      case when v_row.requested_start is null then null
           else (v_run.collection_date + v_row.requested_start) at time zone 'UTC' end,
      case when v_row.requested_end is null then null
           else (v_run.collection_date + v_row.requested_end) at time zone 'UTC' end);

    -- Honour the customer's own window as the dispatch window. Identical to
    -- what they asked for, so this raises no "moved" flag and owes no call.
    if v_row.requested_at is not null and not v_row.requested_flexible
       and v_row.requested_start is not null then
      update public.collection_slots
         set dispatch_start = v_row.requested_start,
             dispatch_end = v_row.requested_end,
             dispatch_set_at = now(),
             dispatch_set_by = auth.uid()
       where shipment_id = v_row.id;
    end if;

    v_added := v_added + 1;
  end loop;

  update public.shipments set assigned_driver_id = p_driver_id
   where collection_run_id = p_run_id and deleted_at is null
     and lower(coalesce(status, '')) in ('booking confirmed', 'confirmed', 'pending');

  update public.collection_runs
     set driver_run_id = v_driver_run_id, status = 'active'
   where id = p_run_id;

  return jsonb_build_object(
    'assigned', true, 'driverRunId', v_driver_run_id, 'stopsAdded', v_added,
    'route', v_run.route, 'date', v_run.collection_date);
end $$;

revoke all on function public.assign_collection_run_driver(uuid, uuid, text) from public, anon;
grant execute on function public.assign_collection_run_driver(uuid, uuid, text) to authenticated;

/**
 * The drivers dispatch can put on a collection run.
 *
 * `stops_that_day` is what stops a dispatcher quietly double-booking someone:
 * a driver already carrying twenty stops on the 14th should look busy in the
 * picker, not identical to one carrying none. Delivery-only drivers are left
 * out — they work the Zimbabwe half.
 */
create or replace function public.collection_drivers(p_date date default null)
returns table (
  id uuid, full_name text, email text, driver_type text,
  on_leave boolean, stops_that_day integer, run_route text)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.full_name, p.email, coalesce(p.driver_type, 'both'), coalesce(p.on_leave, false),
    coalesce((select count(*)::int from public.driver_run_stops st
               join public.driver_runs r on r.id = st.run_id
              where r.driver_id = p.id and r.run_date = p_date and r.status <> 'cancelled'), 0),
    (select r.route_name from public.driver_runs r
      where r.driver_id = p.id and r.run_date = p_date and r.status <> 'cancelled' limit 1)
  from public.profiles p
  where public.is_operations_admin()
    and (lower(coalesce(p.role, '')) = 'driver' or p.is_admin = true
         or lower(coalesce(p.role, '')) in ('admin', 'logistics'))
    and coalesce(p.staff_active, true)
    and coalesce(p.driver_type, 'both') <> 'delivery'
  order by coalesce(p.on_leave, false), p.full_name
$$;

revoke all on function public.collection_drivers(date) from public, anon;
grant execute on function public.collection_drivers(date) to authenticated;
