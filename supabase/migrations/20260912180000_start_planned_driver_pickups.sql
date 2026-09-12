-- Allow the at-location action to start this driver's own planned run.
create or replace function public.begin_driver_pickup(p_shipment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype; v_claim jsonb; v_ship public.shipments%rowtype;
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
  -- A dispatch-created run can still be planned when the driver reaches it.
  -- Verify shipment ownership before transition_driver_stop can assign it.
  select * into v_ship from public.shipments where id=p_shipment_id and deleted_at is null for update;
  if not found then raise exception 'Shipment not found'; end if;
  if v_ship.assigned_driver_id is not null and v_ship.assigned_driver_id <> auth.uid() then
    raise exception 'Another driver is assigned to this collection';
  end if;
  if lower(coalesce(v_ship.collection_status,''))='collected'
    or lower(coalesce(v_ship.status,'')) in ('collected','delivered','cancelled','canceled','at warehouse','enroute to zimbabwe') then
    raise exception 'This shipment is no longer awaiting collection';
  end if;
  update public.driver_runs set status='active',started_at=coalesce(started_at,now()),updated_at=now()
    where id=v_stop.run_id and driver_id=auth.uid() and status='planned';
  if v_stop.status='planned' then perform public.transition_driver_stop(v_stop.id,'en_route'); end if;
  if v_stop.status <> 'arrived' then perform public.transition_driver_stop(v_stop.id,'arrived'); end if;
  return jsonb_build_object('stopId',v_stop.id,'shipmentId',p_shipment_id,'status','arrived');
end $$;
revoke all on function public.begin_driver_pickup(uuid) from public, anon;
grant execute on function public.begin_driver_pickup(uuid) to authenticated;
