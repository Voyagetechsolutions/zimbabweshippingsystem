-- A pickup can be visible in driver_route_collections because the booking
-- carries today's collection date even when its old collection_schedule_id or
-- route text no longer matches an active schedule row. Claiming must use the
-- same source of truth as the feed, otherwise the Start collection button
-- appears to do nothing for exactly the bookings the driver can see.

create or replace function public.claim_route_collection(p_shipment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ship public.shipments%rowtype;
  v_claim public.route_collection_claims%rowtype;
  v_run public.driver_runs%rowtype;
  v_stop public.driver_run_stops%rowtype;
  v_order integer;
  v_route text;
  v_address text;
  v_name text;
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if not exists (
    select 1 from public.profiles p where p.id = v_uid
      and coalesce(p.staff_active, true)
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('driver', 'admin', 'dispatcher', 'logistics'))
  ) then raise exception 'Active driver access required'; end if;

  if not exists (
    select 1 from public.driver_attendance a
    where a.driver_id = v_uid and a.work_date = current_date and a.clocked_out_at is null
  ) and not exists (
    select 1 from public.profiles p where p.id = v_uid
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'dispatcher', 'logistics'))
  ) then raise exception 'Clock in before claiming a collection'; end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then raise exception 'Shipment not found'; end if;
  if coalesce(v_ship.collection_status, 'Awaiting Collection') = 'Collected' then
    raise exception 'This shipment has already been collected';
  end if;

  -- Claim eligibility uses exactly the same date rules as the dashboard.
  if not exists (select 1 from jsonb_array_elements(
    public.driver_route_collections(null)->'collections') c
    where c->>'shipmentId' = p_shipment_id::text) then
    raise exception 'This shipment is not on today''s collection list';
  end if;
  if v_ship.assigned_driver_id is not null and v_ship.assigned_driver_id <> v_uid then
    raise exception 'Another driver is assigned to this collection';
  end if;

  select * into v_claim from public.route_collection_claims where shipment_id = p_shipment_id for update;
  if found and v_claim.status in ('claimed', 'en_route', 'arrived') and v_claim.driver_id <> v_uid then
    select coalesce(p.full_name, 'Another driver') into v_name from public.profiles p where p.id = v_claim.driver_id;
    raise exception '% is already working this collection', coalesce(v_name, 'Another driver');
  end if;
  if found and v_claim.driver_id = v_uid and v_claim.status in ('claimed', 'en_route', 'arrived') and v_claim.stop_id is not null then
    return jsonb_build_object('claimId', v_claim.id, 'stopId', v_claim.stop_id, 'shipmentId', p_shipment_id, 'status', v_claim.status);
  end if;

  v_route := coalesce(v_ship.metadata->'collection'->>'route', 'Collection route');
  v_address := concat_ws(', ', nullif(v_ship.metadata->'sender'->>'address', ''), nullif(v_ship.metadata->'sender'->>'city', ''),
    nullif(coalesce(v_ship.metadata->'sender'->>'postcode', v_ship.metadata->'sender'->>'postalCode'), ''));

  insert into public.driver_runs(driver_id, run_date, status, run_type, route_name, started_at)
  values (v_uid, current_date, 'active', 'pickup', v_route, now())
  on conflict(driver_id, run_date) do update set
    status = 'active', run_type = 'pickup', route_name = coalesce(public.driver_runs.route_name, excluded.route_name),
    started_at = coalesce(public.driver_runs.started_at, now()), completed_at = null, updated_at = now()
  returning * into v_run;

  select * into v_stop from public.driver_run_stops
   where run_id = v_run.id and shipment_id = p_shipment_id limit 1 for update;
  if found then
    update public.driver_run_stops set status = 'planned', failure_reason = null, failure_note = null,
      failed_at = null, en_route_at = null, arrived_at = null, completed_at = null, updated_at = now()
    where id = v_stop.id returning * into v_stop;
  else
    select coalesce(max(stop_order), 0) + 1 into v_order from public.driver_run_stops where run_id = v_run.id;
    insert into public.driver_run_stops(run_id, shipment_id, stop_order, stop_type, status, address,
      latitude, longitude)
    values (v_run.id, p_shipment_id, v_order, 'collection', 'planned', v_address,
      v_ship.pickup_latitude, v_ship.pickup_longitude)
    returning * into v_stop;
  end if;

  insert into public.route_collection_claims(shipment_id, schedule_id, driver_id, stop_id, claim_date, status, claimed_at, updated_at)
  values (p_shipment_id, v_ship.collection_schedule_id, v_uid, v_stop.id, current_date, 'claimed', now(), now())
  on conflict(shipment_id) do update set schedule_id = excluded.schedule_id, driver_id = excluded.driver_id,
    stop_id = excluded.stop_id, claim_date = excluded.claim_date, status = 'claimed', claimed_at = now(),
    en_route_at = null, arrived_at = null, completed_at = null, released_at = null,
    issue_reason = null, issue_note = null, updated_at = now()
  returning * into v_claim;

  update public.shipments set assigned_driver_id = v_uid, driver_status = 'claimed', updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('driverUpdate', jsonb_build_object(
      'status', 'claimed', 'driverId', v_uid, 'stopId', v_stop.id, 'updatedAt', now()))
  where id = p_shipment_id;

  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (p_shipment_id, 'collection_claimed', v_ship.driver_status, 'claimed', v_uid,
    jsonb_build_object('claimId', v_claim.id, 'runId', v_run.id, 'stopId', v_stop.id));

  return jsonb_build_object('claimId', v_claim.id, 'stopId', v_stop.id, 'shipmentId', p_shipment_id, 'status', 'claimed');
end;
$$;

grant execute on function public.claim_route_collection(uuid) to authenticated;

-- At the address, begin the pickup in one transaction. Location and customer
-- verification are optional, but clock-in, ownership and state are not.
create or replace function public.begin_driver_pickup(p_shipment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype; v_claim jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and coalesce(staff_active,true)
    and (is_admin or lower(role) in ('driver','admin','dispatcher','logistics'))) then
    raise exception 'Active driver access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.driver_attendance where driver_id = auth.uid()
    and work_date = current_date and clocked_in_at is not null and clocked_out_at is null) then
    raise exception 'Clock in before starting a collection';
  end if;
  select st.* into v_stop from public.driver_run_stops st join public.driver_runs r on r.id=st.run_id
    where r.driver_id=auth.uid() and r.run_date=current_date and r.status <> 'cancelled'
      and st.shipment_id=p_shipment_id and st.stop_type='collection' limit 1 for update of st;
  if not found then
    v_claim := public.claim_route_collection(p_shipment_id);
    select * into v_stop from public.driver_run_stops where id=(v_claim->>'stopId')::uuid for update;
  end if;
  if v_stop.status not in ('planned','en_route','arrived') then raise exception 'This stop is already closed'; end if;
  if v_stop.status='planned' then perform public.transition_driver_stop(v_stop.id,'en_route'); end if;
  if v_stop.status <> 'arrived' then perform public.transition_driver_stop(v_stop.id,'arrived'); end if;
  return jsonb_build_object('stopId',v_stop.id,'shipmentId',p_shipment_id,'status','arrived');
end $$;
revoke all on function public.begin_driver_pickup(uuid) from public, anon;
grant execute on function public.begin_driver_pickup(uuid) to authenticated;

