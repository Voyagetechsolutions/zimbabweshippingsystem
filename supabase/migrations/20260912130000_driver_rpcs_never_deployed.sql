-- Closing three gaps the driver app has been calling into for two weeks.
--
-- `request_driver_reschedule`, `update_driver_operational_location` and
-- `driver_reoptimise_route` are called from DriverExperienceScreens and
-- DriverOperationsHomeScreen — at HEAD, not new — and none of the three exists
-- in the live database. They were written in two migrations dated 28 August
-- that were never applied, so the buttons behind them have been failing with
-- "Could not find the function" since.
--
-- Those two migrations are NOT replayed here. The larger of them
-- (20260828140000_driver_last_mile_completion.sql) also creates six tables and
-- drops and recreates a dozen policies, and replaying old migrations against
-- this database is exactly the hazard that rules out `db push`. This takes only
-- the three function definitions, verbatim, plus the four columns one of them
-- needs. Everything else those migrations would do is left alone — `depots`
-- still does not exist, so DriverDepotHandoverScreen stays broken and is not
-- pretended otherwise.
--
-- Verified before writing: 14 of the 18 columns these functions touch already
-- exist, `driver_distance_km`, `driver_presence`, `driver_route_events` and
-- `driver_notifications` are all present, and only the four reschedule columns
-- below were missing.

-- ---------------------------------------------------------------------------
-- A. The four columns a reschedule request records
-- ---------------------------------------------------------------------------
-- Nullable with no default, so this is a catalogue change and not a rewrite of
-- the stops table. `reschedule_status` already existed on its own, which is why
-- the column was readable while every write to it failed.

alter table public.driver_run_stops
  add column if not exists reschedule_option text,
  add column if not exists reschedule_requested_for timestamptz,
  add column if not exists reschedule_note text,
  add column if not exists reschedule_requested_at timestamptz;

-- ---------------------------------------------------------------------------
-- B. The three functions, as they were written on 28 August
-- ---------------------------------------------------------------------------

create or replace function public.request_driver_reschedule(
  p_stop_id uuid, p_option text, p_requested_for timestamptz default null, p_note text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype;
begin
  if p_option not in ('later_today','different_date','return_to_depot','dispatch_decision') then raise exception 'Invalid reschedule option'; end if;
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id;
  if v_run.driver_id<>auth.uid() and not public.is_operations_admin() then raise exception 'Not assigned to this stop'; end if;
  if v_stop.status in ('completed','failed') then raise exception 'Closed stops cannot be rescheduled'; end if;
  update public.driver_run_stops set reschedule_status='requested',reschedule_option=p_option,
    reschedule_requested_for=p_requested_for,reschedule_note=nullif(trim(coalesce(p_note,'')),''),
    reschedule_requested_at=now(),updated_at=now() where id=p_stop_id;
  insert into public.driver_route_events(event_type,driver_id,route_id,stop_id,shipment_id,metadata)
    values('driver_reschedule_requested',v_run.driver_id,v_run.id,v_stop.id,v_stop.shipment_id,jsonb_build_object('option',p_option,'requestedFor',p_requested_for,'note',p_note));
  insert into public.driver_notifications(driver_id,category,title,body,route_id,stop_id)
    values(v_run.driver_id,'customer_update','Reschedule request sent','Dispatch will review this stop and update your route.',v_run.id,v_stop.id);
  return jsonb_build_object('status','requested','option',p_option);
end $$;

create or replace function public.update_driver_operational_location(
  p_latitude double precision, p_longitude double precision, p_accuracy_m double precision default null,
  p_speed_mps double precision default null, p_route_id uuid default null
) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then return false; end if;
  update public.driver_presence set current_latitude=p_latitude,current_longitude=p_longitude,
    location_accuracy_m=p_accuracy_m,speed_mps=case when p_speed_mps is null or p_speed_mps<0 then null else p_speed_mps end,
    last_location_update=now(),last_seen=now(),active_route_id=coalesce(p_route_id,active_route_id),updated_at=now()
    where driver_id=auth.uid() and status<>'offline';
  return found;
end $$;

create or replace function public.driver_reoptimise_route(p_run_id uuid,p_reason text default 'driver_requested')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_run public.driver_runs%rowtype;v_stop public.driver_run_stops%rowtype;v_lat double precision;v_lng double precision;v_sequence integer:=0;v_distance numeric:=0;v_leg numeric;v_travel integer;v_cursor timestamptz:=now();v_count integer:=0;
begin
  select * into v_run from public.driver_runs where id=p_run_id for update;
  if not found then raise exception 'Route not found';end if;
  if v_run.driver_id<>auth.uid() and not public.is_operations_admin() then raise exception 'This route is not assigned to you';end if;
  if v_run.status in('completed','cancelled') then raise exception 'A closed route cannot be optimised';end if;
  select coalesce(p.current_latitude,v_run.start_latitude),coalesce(p.current_longitude,v_run.start_longitude) into v_lat,v_lng from(select 1)q left join public.driver_presence p on p.driver_id=v_run.driver_id;
  if v_lat is null then select latitude,longitude into v_lat,v_lng from public.driver_run_stops where run_id=p_run_id and status not in('completed','failed') and latitude is not null order by stop_order limit 1;end if;
  select coalesce(max(stop_order),0) into v_sequence from public.driver_run_stops where run_id=p_run_id and status in('completed','failed');
  create temporary table if not exists driver_route_plan_work(id uuid primary key,seq integer,leg_km numeric,travel_min integer,eta timestamptz,etd timestamptz) on commit drop;truncate driver_route_plan_work;
  loop
    select s.* into v_stop from public.driver_run_stops s where s.run_id=p_run_id and s.status not in('completed','failed') and not exists(select 1 from driver_route_plan_work w where w.id=s.id)
      order by s.sequence_locked desc,case s.priority when 'urgent' then 0 when 'high' then 1 else 2 end,s.time_window_start nulls last,case when s.latitude is null then 999999 else public.driver_distance_km(v_lat,v_lng,s.latitude,s.longitude) end,s.stop_order limit 1;
    exit when not found;v_sequence:=v_sequence+1;v_leg:=public.driver_distance_km(v_lat,v_lng,v_stop.latitude,v_stop.longitude);v_travel:=greatest(0,ceil(v_leg/45*60)::integer);v_cursor:=v_cursor+(v_travel||' minutes')::interval;
    if v_stop.time_window_start is not null and v_cursor<v_stop.time_window_start then v_cursor:=v_stop.time_window_start;end if;
    insert into driver_route_plan_work values(v_stop.id,v_sequence,v_leg,v_travel,v_cursor,v_cursor+(v_stop.service_duration_minutes||' minutes')::interval);v_cursor:=v_cursor+(v_stop.service_duration_minutes||' minutes')::interval;v_distance:=v_distance+v_leg;v_count:=v_count+1;if v_stop.latitude is not null then v_lat:=v_stop.latitude;v_lng:=v_stop.longitude;end if;
  end loop;
  update public.driver_run_stops set stop_order=stop_order+100000 where run_id=p_run_id and status not in('completed','failed');
  update public.driver_run_stops s set stop_order=w.seq,distance_from_previous_km=w.leg_km,travel_time_from_previous_minutes=w.travel_min,estimated_arrival=w.eta,estimated_departure=w.etd,updated_at=now() from driver_route_plan_work w where s.id=w.id;
  update public.driver_runs set estimated_distance_km=v_distance,estimated_duration_minutes=greatest(0,ceil(extract(epoch from(v_cursor-now()))/60)::integer),estimated_finish_at=v_cursor,optimization_version=optimization_version+1,optimized_at=now(),updated_at=now() where id=p_run_id returning * into v_run;
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,metadata) values('route_reoptimized',auth.uid(),v_run.driver_id,v_run.id,jsonb_build_object('reason',p_reason,'remainingStops',v_count,'distanceKm',v_distance,'estimatedFinish',v_cursor));
  return jsonb_build_object('routeId',p_run_id,'remainingStops',v_count,'distanceKm',v_distance,'estimatedFinish',v_cursor,'optimizationVersion',v_run.optimization_version);
end $$;

revoke all on function public.request_driver_reschedule(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.request_driver_reschedule(uuid, text, timestamptz, text) to authenticated;
revoke all on function public.update_driver_operational_location(double precision, double precision, double precision, double precision, uuid) from public, anon;
grant execute on function public.update_driver_operational_location(double precision, double precision, double precision, double precision, uuid) to authenticated;
revoke all on function public.driver_reoptimise_route(uuid, text) from public, anon;
grant execute on function public.driver_reoptimise_route(uuid, text) to authenticated;
