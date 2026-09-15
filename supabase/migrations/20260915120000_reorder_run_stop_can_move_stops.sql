-- reorder_run_stop has never been able to move a stop.
--
-- It swapped two stops by parking one at stop_order = -1 first, but
-- driver_run_stops_stop_order_check requires stop_order > 0, so every call
-- failed with a check violation. Found by a rolled-back probe of the website's
-- new Runs screen; the staff app's run screen calls the same function and has
-- been failing the same way.
--
-- The stop is now parked one past the run's highest position: positive, and
-- free, so neither the check nor the (run_id, stop_order) unique index trips.
-- The run row is locked first so two reorders on one run cannot both pick the
-- same parking spot.

create or replace function public.reorder_run_stop(p_stop_id uuid, p_direction text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_stop public.driver_run_stops%rowtype;
  v_other public.driver_run_stops%rowtype;
  v_park integer;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  if p_direction not in ('up', 'down') then raise exception 'Direction must be up or down'; end if;

  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if not found then raise exception 'Stop not found'; end if;
  perform 1 from public.driver_runs where id = v_stop.run_id for update;
  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
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

  select coalesce(max(stop_order), 0) + 1 into v_park from public.driver_run_stops where run_id = v_stop.run_id;
  update public.driver_run_stops set stop_order = v_park, updated_at = now() where id = v_stop.id;
  update public.driver_run_stops set stop_order = v_stop.stop_order, updated_at = now() where id = v_other.id;
  update public.driver_run_stops set stop_order = v_other.stop_order, updated_at = now() where id = v_stop.id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'REORDER_STOP', 'DRIVER_RUN_STOP', v_stop.id,
          jsonb_build_object('runId', v_stop.run_id, 'from', v_stop.stop_order, 'to', v_other.stop_order));

  return jsonb_build_object('moved', true, 'stopOrder', v_other.stop_order);
end $function$;
