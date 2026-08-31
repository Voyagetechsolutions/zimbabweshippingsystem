-- Country-scoped driver work, driver-requested route optimisation and the
-- package controls used by the country switcher. These functions validate the
-- selected country server-side; the UI filter is not the security boundary.

create or replace function public.driver_country_matches(p_country text,p_run_type text,p_metadata jsonb)
returns boolean language sql immutable as $$
  select case lower(trim(coalesce(p_country,'')))
    when 'zimbabwe' then p_run_type='delivery'
    when 'ireland' then p_run_type='pickup' and lower(coalesce(p_metadata->'sender'->>'country',p_metadata->'senderDetails'->>'country',p_metadata->'collection'->>'country','')) in ('ireland','republic of ireland','northern ireland')
    when 'united kingdom' then p_run_type='pickup' and lower(coalesce(p_metadata->'sender'->>'country',p_metadata->'senderDetails'->>'country',p_metadata->'collection'->>'country','united kingdom')) not in ('ireland','republic of ireland','northern ireland')
    else false end
$$;

create or replace function public.search_driver_packages_for_country(p_query text,p_country text,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_query text:='%'||lower(trim(coalesce(p_query,'')))||'%';v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_query,'')))<2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(row_data order by row_data->>'packageCode'),'[]'::jsonb) into v_result from(
    select jsonb_build_object('packageId',p.id,'packageCode',p.package_code,'status',p.status,'bay',p.bay,'shelf',p.shelf,'shipmentId',s.id,
      'reference',coalesce(s.customer_reference,s.tracking_number),'customerName',coalesce(nullif(s.metadata->'sender'->>'name',''),nullif(concat_ws(' ',s.metadata->'sender'->>'firstName',s.metadata->'sender'->>'lastName'),''),nullif(s.metadata->'recipient'->>'name',''),'Customer'),
      'address',coalesce(nullif(concat_ws(', ',s.metadata->'sender'->>'address',s.metadata->'sender'->>'city',s.metadata->'sender'->>'postcode'),''),s.destination),'country',p_country) row_data
    from public.shipment_packages p join public.shipments s on s.id=p.shipment_id
    where exists(select 1 from public.driver_run_stops rs join public.driver_runs r on r.id=rs.run_id where rs.shipment_id=s.id and r.driver_id=auth.uid() and r.status in('planned','active') and public.driver_country_matches(p_country,r.run_type,s.metadata))
      and(lower(p.package_code) like v_query or lower(coalesce(s.customer_reference,'')) like v_query or lower(coalesce(s.tracking_number,'')) like v_query or lower(coalesce(s.metadata::text,'')) like v_query)
    limit least(greatest(coalesce(p_limit,20),1),50)
  ) matches;
  return v_result;
end $$;

create or replace function public.scan_driver_package_for_country(p_package_code text,p_country text,p_stop_id uuid default null,p_scan_type text default 'collection',p_latitude double precision default null,p_longitude double precision default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_package public.shipment_packages%rowtype;v_shipment public.shipments%rowtype;v_run public.driver_runs%rowtype;
begin
  select * into v_package from public.shipment_packages where upper(package_code)=upper(trim(p_package_code));
  if not found then raise exception 'Package not recognised. Check the label and try again.';end if;
  select * into v_shipment from public.shipments where id=v_package.shipment_id;
  if p_stop_id is not null then select r.* into v_run from public.driver_runs r join public.driver_run_stops s on s.run_id=r.id where s.id=p_stop_id and s.shipment_id=v_package.shipment_id;
  else select r.* into v_run from public.driver_runs r join public.driver_run_stops s on s.run_id=r.id where r.driver_id=auth.uid() and s.shipment_id=v_package.shipment_id and r.status in('planned','active') order by r.run_date desc limit 1;end if;
  if not found or (v_run.driver_id<>auth.uid() and not public.is_operations_admin()) then raise exception 'This package is not assigned to your active route.';end if;
  if not public.driver_country_matches(p_country,v_run.run_type,v_shipment.metadata) then raise exception 'This package belongs to a different country workflow.';end if;
  return public.scan_driver_package(p_package_code,p_stop_id,p_scan_type,p_latitude,p_longitude,null);
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

grant execute on function public.search_driver_packages_for_country(text,text,integer) to authenticated;
grant execute on function public.scan_driver_package_for_country(text,text,uuid,text,double precision,double precision) to authenticated;
grant execute on function public.driver_reoptimise_route(uuid,text) to authenticated;
