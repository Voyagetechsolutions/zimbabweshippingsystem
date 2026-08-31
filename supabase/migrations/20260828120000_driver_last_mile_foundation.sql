-- Driver last-mile foundation.
-- Extends the existing driver_runs / driver_run_stops model; intentionally does
-- not create parallel jobs or routes tables.

alter table public.driver_runs
  add column if not exists route_code text,
  add column if not exists start_address text,
  add column if not exists end_address text,
  add column if not exists start_latitude double precision,
  add column if not exists start_longitude double precision,
  add column if not exists end_latitude double precision,
  add column if not exists end_longitude double precision,
  add column if not exists estimated_distance_km numeric(10,2),
  add column if not exists estimated_duration_minutes integer,
  add column if not exists estimated_finish_at timestamptz,
  add column if not exists optimization_version integer not null default 0,
  add column if not exists allow_driver_make_next boolean not null default false,
  add column if not exists optimized_at timestamptz,
  add column if not exists returning_to_depot_at timestamptz,
  add column if not exists depot_arrived_at timestamptz,
  add column if not exists handover_completed_at timestamptz;

alter table public.driver_run_stops
  add column if not exists package_count integer not null default 1,
  add column if not exists priority text not null default 'normal',
  add column if not exists time_window_start timestamptz,
  add column if not exists time_window_end timestamptz,
  add column if not exists estimated_arrival timestamptz,
  add column if not exists estimated_departure timestamptz,
  add column if not exists distance_from_previous_km numeric(10,2),
  add column if not exists travel_time_from_previous_minutes integer,
  add column if not exists service_duration_minutes integer not null default 10,
  add column if not exists sequence_locked boolean not null default false,
  add column if not exists arrival_latitude double precision,
  add column if not exists arrival_longitude double precision,
  add column if not exists arrival_accuracy_m numeric(10,2),
  add column if not exists recipient_name text,
  add column if not exists special_instructions text,
  add column if not exists reschedule_status text;

do $$ begin
  alter table public.driver_run_stops add constraint driver_stop_priority_check
    check (priority in ('normal','high','urgent'));
exception when duplicate_object then null; end $$;

create table if not exists public.driver_presence (
  driver_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline'
    check (status in ('offline','available','on_route','at_stop','on_break','delayed','returning_to_depot','route_complete')),
  online_since timestamptz,
  last_seen timestamptz not null default now(),
  current_latitude double precision,
  current_longitude double precision,
  location_accuracy_m numeric(10,2),
  speed_mps numeric(10,2),
  last_location_update timestamptz,
  active_route_id uuid references public.driver_runs(id) on delete set null,
  current_stop_id uuid references public.driver_run_stops(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_packages (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  package_code text not null unique,
  package_type text,
  description text,
  weight_kg numeric(10,2),
  bay text,
  shelf text,
  status text not null default 'expected'
    check (status in ('expected','loaded','collected','delivered','at_depot','missing','damaged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_scans (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.shipment_packages(id) on delete restrict,
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  route_id uuid references public.driver_runs(id) on delete set null,
  stop_id uuid references public.driver_run_stops(id) on delete set null,
  driver_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  scan_type text not null check (scan_type in ('load','collection','delivery','depot_handover','manual_override')),
  latitude double precision,
  longitude double precision,
  override_reason text,
  scanned_at timestamptz not null default now()
);

create table if not exists public.driver_signatures (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  stop_id uuid not null references public.driver_run_stops(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  recipient_name text not null,
  signature_svg text not null,
  confirmation_accepted boolean not null default false,
  latitude double precision,
  longitude double precision,
  captured_at timestamptz not null default now(),
  unique (stop_id)
);

create table if not exists public.driver_breaks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  route_id uuid references public.driver_runs(id) on delete cascade,
  planned_minutes integer not null check (planned_minutes between 1 and 480),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.driver_notifications (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('new_job','route_changed','job_cancelled','customer_update','dispatch_message','delay_warning','document_reminder','vehicle_notice','system_notice')),
  title text not null,
  body text not null,
  route_id uuid references public.driver_runs(id) on delete cascade,
  stop_id uuid references public.driver_run_stops(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.driver_route_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  driver_id uuid references auth.users(id) on delete set null,
  route_id uuid references public.driver_runs(id) on delete cascade,
  stop_id uuid references public.driver_run_stops(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete set null,
  package_id uuid references public.shipment_packages(id) on delete set null,
  latitude double precision,
  longitude double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.driver_vehicle_checks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  route_id uuid references public.driver_runs(id) on delete set null,
  vehicle_label text not null,
  mileage numeric(12,1),
  fuel_percent integer check (fuel_percent between 0 and 100),
  tyres_ok boolean not null,
  lights_ok boolean not null,
  brakes_ok boolean not null,
  mirrors_ok boolean not null,
  condition_ok boolean not null,
  cargo_secure boolean not null,
  defect_notes text,
  passed boolean generated always as
    (tyres_ok and lights_ok and brakes_ok and mirrors_ok and condition_ok and cargo_secure) stored,
  checked_at timestamptz not null default now()
);

create index if not exists driver_presence_status_idx on public.driver_presence(status, last_seen desc);
create index if not exists shipment_packages_shipment_idx on public.shipment_packages(shipment_id, status);
create index if not exists shipment_packages_search_idx on public.shipment_packages(upper(package_code));
create index if not exists package_scans_route_idx on public.package_scans(route_id, scanned_at desc);
create index if not exists driver_notifications_unread_idx on public.driver_notifications(driver_id, created_at desc) where read_at is null;
create index if not exists driver_route_events_route_idx on public.driver_route_events(route_id, created_at desc);
create index if not exists driver_breaks_active_idx on public.driver_breaks(driver_id, started_at desc) where ended_at is null;

alter table public.driver_presence enable row level security;
alter table public.shipment_packages enable row level security;
alter table public.package_scans enable row level security;
alter table public.driver_signatures enable row level security;
alter table public.driver_breaks enable row level security;
alter table public.driver_notifications enable row level security;
alter table public.driver_route_events enable row level security;
alter table public.driver_vehicle_checks enable row level security;

drop policy if exists "Driver sees own presence" on public.driver_presence;
create policy "Driver sees own presence" on public.driver_presence for select to authenticated
  using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Operations manage presence" on public.driver_presence;
create policy "Operations manage presence" on public.driver_presence for all to authenticated
  using (public.is_operations_admin()) with check (public.is_operations_admin());

drop policy if exists "Assigned staff see packages" on public.shipment_packages;
create policy "Assigned staff see packages" on public.shipment_packages for select to authenticated using (
  public.is_operations_admin() or exists (
    select 1 from public.driver_run_stops s join public.driver_runs r on r.id=s.run_id
    where s.shipment_id=shipment_packages.shipment_id and r.driver_id=auth.uid()
  )
);
drop policy if exists "Operations manage packages" on public.shipment_packages;
create policy "Operations manage packages" on public.shipment_packages for all to authenticated
  using (public.is_operations_admin()) with check (public.is_operations_admin());

drop policy if exists "Driver sees own scans" on public.package_scans;
create policy "Driver sees own scans" on public.package_scans for select to authenticated
  using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Driver records own scans" on public.package_scans;
create policy "Driver records own scans" on public.package_scans for insert to authenticated
  with check (driver_id=auth.uid());

drop policy if exists "Driver sees own signatures" on public.driver_signatures;
create policy "Driver sees own signatures" on public.driver_signatures for select to authenticated
  using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Driver records signatures" on public.driver_signatures;
create policy "Driver records signatures" on public.driver_signatures for insert to authenticated
  with check (driver_id=auth.uid() and confirmation_accepted);
drop policy if exists "Driver updates own signatures" on public.driver_signatures;
create policy "Driver updates own signatures" on public.driver_signatures for update to authenticated
  using (driver_id=auth.uid()) with check (driver_id=auth.uid() and confirmation_accepted);

drop policy if exists "Driver manages own breaks" on public.driver_breaks;
create policy "Driver manages own breaks" on public.driver_breaks for all to authenticated
  using (driver_id=auth.uid() or public.is_operations_admin())
  with check (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Driver sees own notifications" on public.driver_notifications;
create policy "Driver sees own notifications" on public.driver_notifications for select to authenticated
  using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Driver reads own notifications" on public.driver_notifications;
create policy "Driver reads own notifications" on public.driver_notifications for update to authenticated
  using (driver_id=auth.uid()) with check (driver_id=auth.uid());
drop policy if exists "Staff see route events" on public.driver_route_events;
create policy "Staff see route events" on public.driver_route_events for select to authenticated using (
  driver_id=auth.uid() or public.is_operations_admin()
);
drop policy if exists "Driver sees own vehicle checks" on public.driver_vehicle_checks;
create policy "Driver sees own vehicle checks" on public.driver_vehicle_checks for select to authenticated
  using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Driver creates vehicle checks" on public.driver_vehicle_checks;
create policy "Driver creates vehicle checks" on public.driver_vehicle_checks for insert to authenticated
  with check (driver_id=auth.uid());

create or replace function public.set_driver_presence(
  p_status text,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_m numeric default null,
  p_active_route_id uuid default null,
  p_current_stop_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row public.driver_presence%rowtype;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,''))='driver' and coalesce(p.staff_active,true))
    and not public.is_operations_admin() then raise exception 'Driver access required'; end if;
  if p_status not in ('offline','available','on_route','at_stop','on_break','delayed','returning_to_depot','route_complete')
    then raise exception 'Unknown driver status'; end if;
  insert into public.driver_presence(driver_id,status,online_since,last_seen,current_latitude,current_longitude,
    location_accuracy_m,last_location_update,active_route_id,current_stop_id)
  values(auth.uid(),p_status,case when p_status='offline' then null else now() end,now(),p_latitude,p_longitude,
    p_accuracy_m,case when p_latitude is null then null else now() end,p_active_route_id,p_current_stop_id)
  on conflict(driver_id) do update set
    status=excluded.status,
    online_since=case when excluded.status='offline' then null else coalesce(driver_presence.online_since,now()) end,
    last_seen=now(),
    current_latitude=coalesce(excluded.current_latitude,driver_presence.current_latitude),
    current_longitude=coalesce(excluded.current_longitude,driver_presence.current_longitude),
    location_accuracy_m=coalesce(excluded.location_accuracy_m,driver_presence.location_accuracy_m),
    last_location_update=case when excluded.current_latitude is null then driver_presence.last_location_update else now() end,
    active_route_id=coalesce(excluded.active_route_id,driver_presence.active_route_id),
    current_stop_id=excluded.current_stop_id,
    updated_at=now()
  returning * into v_row;
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,stop_id,latitude,longitude,metadata)
  values('driver_status_changed',auth.uid(),auth.uid(),v_row.active_route_id,v_row.current_stop_id,p_latitude,p_longitude,jsonb_build_object('status',p_status));
  return to_jsonb(v_row);
end $$;

create or replace function public.scan_driver_package(
  p_package_code text,
  p_stop_id uuid default null,
  p_scan_type text default 'delivery',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_override_reason text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_package public.shipment_packages%rowtype; v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_status text;
begin
  select * into v_package from public.shipment_packages where upper(package_code)=upper(trim(p_package_code)) for update;
  if not found then raise exception 'Package not recognised. Check the label and try again.'; end if;
  if p_stop_id is not null then
    select * into v_stop from public.driver_run_stops where id=p_stop_id;
    select * into v_run from public.driver_runs where id=v_stop.run_id;
    if v_run.driver_id<>auth.uid() and not public.is_operations_admin() then raise exception 'This stop is not assigned to you'; end if;
    if v_package.shipment_id<>v_stop.shipment_id and nullif(trim(coalesce(p_override_reason,'')),'') is null then
      raise exception 'WRONG PACKAGE — this package belongs to another booking.';
    end if;
  else
    select r.* into v_run from public.driver_runs r join public.driver_run_stops s on s.run_id=r.id
      where r.driver_id=auth.uid() and s.shipment_id=v_package.shipment_id and r.status in ('planned','active')
      order by r.run_date desc limit 1;
    if not found then raise exception 'This package is not assigned to your active route.'; end if;
  end if;
  if p_scan_type not in ('load','collection','delivery','depot_handover','manual_override') then raise exception 'Invalid scan type'; end if;
  v_status:=case p_scan_type when 'load' then 'loaded' when 'collection' then 'collected' when 'delivery' then 'delivered' when 'depot_handover' then 'at_depot' else v_package.status end;
  insert into public.package_scans(package_id,shipment_id,route_id,stop_id,driver_id,scan_type,latitude,longitude,override_reason)
    values(v_package.id,v_package.shipment_id,v_run.id,p_stop_id,auth.uid(),p_scan_type,p_latitude,p_longitude,nullif(trim(coalesce(p_override_reason,'')),''));
  update public.shipment_packages set status=v_status,updated_at=now() where id=v_package.id;
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,stop_id,shipment_id,package_id,latitude,longitude,metadata)
    values('package_scanned',auth.uid(),auth.uid(),v_run.id,p_stop_id,v_package.shipment_id,v_package.id,p_latitude,p_longitude,jsonb_build_object('scanType',p_scan_type,'packageCode',v_package.package_code));
  return jsonb_build_object('ok',true,'packageId',v_package.id,'packageCode',v_package.package_code,'shipmentId',v_package.shipment_id,'status',v_status,'bay',v_package.bay,'shelf',v_package.shelf);
end $$;

create or replace function public.set_driver_break(p_minutes integer default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_break public.driver_breaks%rowtype; v_run_id uuid;
begin
  select id into v_run_id from public.driver_runs where driver_id=auth.uid() and status='active' order by run_date desc limit 1;
  if p_minutes is null then
    update public.driver_breaks set ended_at=now() where driver_id=auth.uid() and ended_at is null returning * into v_break;
    if not found then raise exception 'No active break'; end if;
    perform public.set_driver_presence('on_route',null,null,null,v_run_id,null);
  else
    if p_minutes<1 or p_minutes>480 then raise exception 'Break must be between 1 and 480 minutes'; end if;
    if exists(select 1 from public.driver_breaks where driver_id=auth.uid() and ended_at is null) then raise exception 'A break is already active'; end if;
    insert into public.driver_breaks(driver_id,route_id,planned_minutes) values(auth.uid(),v_run_id,p_minutes) returning * into v_break;
    update public.driver_run_stops set estimated_arrival=estimated_arrival+(p_minutes||' minutes')::interval,
      estimated_departure=estimated_departure+(p_minutes||' minutes')::interval
      where run_id=v_run_id and status not in ('completed','failed');
    perform public.set_driver_presence('on_break',null,null,null,v_run_id,null);
  end if;
  return to_jsonb(v_break);
end $$;

grant execute on function public.set_driver_presence(text,double precision,double precision,numeric,uuid,uuid) to authenticated;
grant execute on function public.scan_driver_package(text,uuid,text,double precision,double precision,text) to authenticated;
grant execute on function public.set_driver_break(integer) to authenticated;

create or replace function public.arrive_driver_stop(
  p_stop_id uuid,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_m numeric default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_run_id uuid;
begin
  v_result:=public.transition_driver_stop(p_stop_id,'arrived');
  update public.driver_run_stops set arrival_latitude=p_latitude,arrival_longitude=p_longitude,
    arrival_accuracy_m=p_accuracy_m where id=p_stop_id returning run_id into v_run_id;
  perform public.set_driver_presence('at_stop',p_latitude,p_longitude,p_accuracy_m,v_run_id,p_stop_id);
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,stop_id,latitude,longitude,metadata)
    values('stop_arrived',auth.uid(),auth.uid(),v_run_id,p_stop_id,p_latitude,p_longitude,jsonb_build_object('accuracyM',p_accuracy_m));
  return v_result || jsonb_build_object('latitude',p_latitude,'longitude',p_longitude,'accuracyM',p_accuracy_m);
end $$;

create or replace function public.fail_driver_stop(p_stop_id uuid,p_reason text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_now timestamptz:=now();
begin
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update;
  if not found then raise exception 'Driver stop not found'; end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id;
  if v_run.driver_id<>auth.uid() and not public.is_operations_admin() then raise exception 'This stop is not assigned to you'; end if;
  if v_stop.status in ('completed','failed') then raise exception 'This stop is already closed'; end if;
  if p_reason not in ('not_home','customer_unavailable','customer_cancelled','wrong_address','access_problem','goods_not_ready','customer_refused','damaged_goods','vehicle_problem','address_not_found','unsafe_location','payment_issue','other')
    then raise exception 'Unknown failure reason'; end if;
  if p_reason in ('wrong_address','access_problem','damaged_goods','vehicle_problem','address_not_found','unsafe_location','other')
    and nullif(trim(coalesce(p_note,'')),'') is null then raise exception 'Add a note so dispatch knows what happened'; end if;
  update public.driver_run_stops set status='failed',failure_reason=p_reason,failure_note=nullif(trim(coalesce(p_note,'')),''),failed_at=v_now,updated_at=v_now where id=p_stop_id;
  update public.shipments set driver_status='failed',updated_at=v_now,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('driverUpdate',jsonb_build_object('status','failed','reason',p_reason,'note',p_note,'updatedAt',v_now,'driverId',v_run.driver_id)) where id=v_stop.shipment_id;
  insert into public.shipment_events(shipment_id,event_type,previous_status,new_status,actor_id,details)
    values(v_stop.shipment_id,'driver_stop_failed',v_stop.status,'failed',auth.uid(),jsonb_build_object('runId',v_run.id,'stopId',v_stop.id,'reason',p_reason,'note',p_note));
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,stop_id,shipment_id,metadata)
    values('stop_failed',auth.uid(),v_run.driver_id,v_run.id,v_stop.id,v_stop.shipment_id,jsonb_build_object('reason',p_reason,'note',p_note));
  insert into public.staff_messages(sender_id,recipient_id,audience_role,shipment_id,subject,body,priority)
    values(auth.uid(),null,'dispatch',v_stop.shipment_id,'Driver issue: '||replace(p_reason,'_',' '),coalesce(nullif(trim(coalesce(p_note,'')),''),'No additional note.'),'urgent');
  return jsonb_build_object('stopId',v_stop.id,'status','failed','reason',p_reason);
end $$;

grant execute on function public.arrive_driver_stop(uuid,double precision,double precision,numeric) to authenticated;
grant execute on function public.fail_driver_stop(uuid,text,text) to authenticated;

create or replace function public.driver_distance_km(a_lat double precision,a_lng double precision,b_lat double precision,b_lng double precision)
returns numeric language sql immutable as $$
  select case when a_lat is null or a_lng is null or b_lat is null or b_lng is null then 0::numeric else
    (6371 * 2 * asin(sqrt(power(sin(radians(b_lat-a_lat)/2),2)+cos(radians(a_lat))*cos(radians(b_lat))*power(sin(radians(b_lng-a_lng)/2),2))))::numeric end
$$;

create or replace function public.optimize_driver_route(p_run_id uuid,p_reason text default 'dispatch_optimization')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_run public.driver_runs%rowtype; v_stop public.driver_run_stops%rowtype; v_lat double precision; v_lng double precision;
  v_sequence integer:=0; v_distance numeric:=0; v_leg numeric; v_travel integer; v_cursor timestamptz:=now(); v_count integer:=0;
begin
  if not public.is_operations_admin() then raise exception 'Dispatch access required'; end if;
  select * into v_run from public.driver_runs where id=p_run_id for update;
  if not found then raise exception 'Route not found'; end if;
  if v_run.status in ('completed','cancelled') then raise exception 'A closed route cannot be optimized'; end if;
  select coalesce(p.current_latitude,v_run.start_latitude),coalesce(p.current_longitude,v_run.start_longitude)
    into v_lat,v_lng from (select 1) q left join public.driver_presence p on p.driver_id=v_run.driver_id;
  if v_lat is null then select latitude,longitude into v_lat,v_lng from public.driver_run_stops where run_id=p_run_id and status not in ('completed','failed') and latitude is not null order by stop_order limit 1; end if;
  select coalesce(max(stop_order),0) into v_sequence from public.driver_run_stops where run_id=p_run_id and status in ('completed','failed');
  create temporary table if not exists route_plan_work(id uuid primary key,seq integer,leg_km numeric,travel_min integer,eta timestamptz,etd timestamptz) on commit drop;
  truncate route_plan_work;
  loop
    select s.* into v_stop from public.driver_run_stops s
      where s.run_id=p_run_id and s.status not in ('completed','failed') and not exists(select 1 from route_plan_work w where w.id=s.id)
      order by s.sequence_locked desc,
        case s.priority when 'urgent' then 0 when 'high' then 1 else 2 end,
        s.time_window_start nulls last,
        case when s.latitude is null then 999999 else public.driver_distance_km(v_lat,v_lng,s.latitude,s.longitude) end,
        s.stop_order limit 1;
    exit when not found;
    v_sequence:=v_sequence+1;
    v_leg:=public.driver_distance_km(v_lat,v_lng,v_stop.latitude,v_stop.longitude);
    v_travel:=greatest(0,ceil(v_leg/45*60)::integer);
    v_cursor:=v_cursor+(v_travel||' minutes')::interval;
    if v_stop.time_window_start is not null and v_cursor<v_stop.time_window_start then v_cursor:=v_stop.time_window_start; end if;
    insert into route_plan_work values(v_stop.id,v_sequence,v_leg,v_travel,v_cursor,v_cursor+(v_stop.service_duration_minutes||' minutes')::interval);
    v_cursor:=v_cursor+(v_stop.service_duration_minutes||' minutes')::interval;
    v_distance:=v_distance+v_leg; v_count:=v_count+1;
    if v_stop.latitude is not null then v_lat:=v_stop.latitude; v_lng:=v_stop.longitude; end if;
  end loop;
  update public.driver_run_stops set stop_order=stop_order+100000 where run_id=p_run_id and status not in ('completed','failed');
  update public.driver_run_stops s set stop_order=w.seq,distance_from_previous_km=w.leg_km,
    travel_time_from_previous_minutes=w.travel_min,estimated_arrival=w.eta,estimated_departure=w.etd,updated_at=now()
    from route_plan_work w where s.id=w.id;
  update public.driver_runs set estimated_distance_km=v_distance,estimated_duration_minutes=greatest(0,ceil(extract(epoch from(v_cursor-now()))/60)::integer),
    estimated_finish_at=v_cursor,optimization_version=optimization_version+1,optimized_at=now(),updated_at=now() where id=p_run_id returning * into v_run;
  insert into public.driver_notifications(driver_id,category,title,body,route_id)
    values(v_run.driver_id,'route_changed','Your route has been updated.',v_count||' remaining stop(s) were optimized. Review the new sequence before continuing.',p_run_id);
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,metadata)
    values('route_reoptimized',auth.uid(),v_run.driver_id,p_run_id,jsonb_build_object('reason',p_reason,'remainingStops',v_count,'distanceKm',v_distance,'estimatedFinish',v_cursor));
  return jsonb_build_object('routeId',p_run_id,'remainingStops',v_count,'distanceKm',v_distance,'estimatedFinish',v_cursor,'optimizationVersion',v_run.optimization_version);
end $$;

create or replace function public.make_driver_stop_next(p_stop_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_next integer;
begin
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id for update;
  if v_run.driver_id<>auth.uid() then raise exception 'This route is not assigned to you'; end if;
  if not v_run.allow_driver_make_next then raise exception 'Dispatch has not enabled Make Next Stop for this route'; end if;
  if v_stop.status in ('completed','failed') then raise exception 'This stop is already closed'; end if;
  select coalesce(min(stop_order),1) into v_next from public.driver_run_stops where run_id=v_run.id and status not in ('completed','failed');
  update public.driver_run_stops set stop_order=stop_order+100000 where run_id=v_run.id and status not in ('completed','failed');
  update public.driver_run_stops set stop_order=v_next where id=p_stop_id;
  with ordered as (select id,row_number() over(order by case when id=p_stop_id then 0 else 1 end,stop_order)::integer+v_next-1 seq from public.driver_run_stops where run_id=v_run.id and status not in ('completed','failed'))
  update public.driver_run_stops s set stop_order=o.seq,updated_at=now() from ordered o where s.id=o.id;
  insert into public.driver_route_events(event_type,user_id,driver_id,route_id,stop_id,shipment_id,metadata)
    values('driver_made_stop_next',auth.uid(),auth.uid(),v_run.id,v_stop.id,v_stop.shipment_id,'{}');
  return jsonb_build_object('stopId',p_stop_id,'stopSequence',v_next);
end $$;

grant execute on function public.optimize_driver_route(uuid,text) to authenticated;
grant execute on function public.make_driver_stop_next(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.driver_presence; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.driver_notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.package_scans; exception when duplicate_object then null; end $$;
