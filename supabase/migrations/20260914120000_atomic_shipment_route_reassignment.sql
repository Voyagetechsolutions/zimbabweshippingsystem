-- Keep every representation of a shipment's collection route in sync.
-- Route changes previously updated only collection_schedule_id, leaving the
-- booking metadata, collection run and planned driver stop on the old route.

create or replace function public.reassign_shipments_to_route(
  p_ids uuid[],
  p_collection_schedule_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.collection_schedules%rowtype;
  v_ship public.shipments%rowtype;
  v_run_id uuid;
  v_pickup_on date;
  v_metadata jsonb;
  v_changed integer := 0;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('changed', 0);
  end if;

  if p_collection_schedule_id is not null then
    select * into v_schedule from public.collection_schedules
     where id = p_collection_schedule_id and deleted_at is null;
    if not found then raise exception 'The selected collection route no longer exists'; end if;
  end if;

  -- Dispatch must release a collection that a driver has already started.
  if exists (
    select 1 from public.driver_run_stops st
     where st.shipment_id = any(p_ids) and st.stop_type = 'collection'
       and st.status in ('en_route', 'arrived')
  ) then
    raise exception 'A selected collection is already in progress. Release it from the driver before changing its route.';
  end if;

  for v_ship in
    select * from public.shipments
     where id = any(p_ids) and deleted_at is null for update
  loop
    -- Selecting the route it already has is a no-op. In particular, do not
    -- tear down a valid planned driver stop merely because dispatch tapped the
    -- current option again. A null schedule with stale route data is not a
    -- no-op: that is precisely the legacy state this migration repairs.
    if p_collection_schedule_id is not null
       and v_ship.collection_schedule_id = p_collection_schedule_id then
      continue;
    end if;
    if p_collection_schedule_id is null
       and v_ship.collection_schedule_id is null
       and v_ship.collection_run_id is null
       and coalesce(v_ship.metadata->'collection'->>'route', v_ship.metadata->>'collectionRoute', v_ship.metadata->>'route') is null then
      continue;
    end if;

    -- Preserve the history while taking the shipment off the old driver's work.
    update public.route_collection_claims
       set status = 'released', released_at = now(),
           issue_reason = case when p_collection_schedule_id is null
             then 'Removed from collection route' else 'Moved to another collection route' end,
           updated_at = now()
     where shipment_id = v_ship.id and status in ('claimed', 'planned');

    update public.driver_run_stops
       set status = 'failed', failure_reason = 'route_reassigned',
           failure_note = case when p_collection_schedule_id is null
             then 'Removed from collection route by dispatch'
             else 'Moved to another collection route by dispatch' end,
           failed_at = coalesce(failed_at, now()), updated_at = now()
     where shipment_id = v_ship.id and stop_type = 'collection' and status = 'planned';

    -- Older screens fall back to these metadata keys. Remove them before
    -- writing the new canonical route so "unassign" cannot reveal the old one.
    v_metadata := coalesce(v_ship.metadata, '{}'::jsonb)
      #- '{collection,route}' #- '{collection,scheduleId}'
      #- '{collectionRoute}' #- '{route}';

    if p_collection_schedule_id is null then
      v_run_id := null;
    else
      v_pickup_on := coalesce(
        v_schedule.pickup_on,
        public.parse_schedule_date(v_ship.metadata->'collection'->>'date')
      );
      v_run_id := public.ensure_collection_run(
        v_schedule.route, v_pickup_on, v_schedule.id, v_schedule.country
      );
      v_metadata := jsonb_set(
        v_metadata, '{collection}',
        coalesce(v_metadata->'collection', '{}'::jsonb)
          || jsonb_build_object('route', v_schedule.route, 'scheduleId', v_schedule.id), true
      ) || jsonb_build_object('collectionRoute', v_schedule.route);
      if v_pickup_on is not null then
        v_metadata := jsonb_set(v_metadata, '{collection,date}', to_jsonb(v_pickup_on::text), true);
      end if;
    end if;

    update public.shipments
       set collection_schedule_id = p_collection_schedule_id,
           collection_run_id = v_run_id,
           assigned_driver_id = null, driver_status = 'available',
           metadata = v_metadata, updated_at = now()
     where id = v_ship.id;

    insert into public.shipment_events(
      shipment_id, event_type, previous_status, new_status, actor_id, details
    ) values (
      v_ship.id,
      case when p_collection_schedule_id is null
        then 'collection_route_removed' else 'collection_route_reassigned' end,
      coalesce(v_ship.collection_schedule_id::text, v_ship.metadata->'collection'->>'route'),
      coalesce(p_collection_schedule_id::text, 'unassigned'), auth.uid(),
      jsonb_build_object('previousScheduleId', v_ship.collection_schedule_id,
        'scheduleId', p_collection_schedule_id,
        'route', case when p_collection_schedule_id is null then null else v_schedule.route end,
        'collectionRunId', v_run_id)
    );
    v_changed := v_changed + 1;
  end loop;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'REASSIGN_SHIPMENT_ROUTE', 'SHIPMENT', null,
    jsonb_build_object('ids', to_jsonb(p_ids), 'count', v_changed,
      'scheduleId', p_collection_schedule_id,
      'route', case when p_collection_schedule_id is null then null else v_schedule.route end));

  return jsonb_build_object('changed', v_changed, 'scheduleId', p_collection_schedule_id,
    'route', case when p_collection_schedule_id is null then null else v_schedule.route end);
end $$;

revoke all on function public.reassign_shipments_to_route(uuid[], uuid) from public, anon;
grant execute on function public.reassign_shipments_to_route(uuid[], uuid) to authenticated;
