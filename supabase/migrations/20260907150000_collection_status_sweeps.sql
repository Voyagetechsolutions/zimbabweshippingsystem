-- The two automatic status moves nobody should have to remember.
--
--   Collected            -> At Warehouse          at 23:59, London time
--   At Warehouse         -> Enroute to Zimbabwe   5 days after the period's
--                                                 last scheduled collection
--
-- Both are written to be safe to run repeatedly and safe to run late: they
-- describe the state the world should be in, and moving nothing is a normal
-- result. That is what makes overnight collections a non-issue - a stop
-- finished at 01:00 simply gets swept the following night, with no special
-- case for a day that ran over.

/**
 * Everything collected today is at the warehouse by the end of the day.
 *
 * Scheduled hourly and gated on the London hour rather than scheduled once at
 * a fixed UTC time, because the United Kingdom changes clocks twice a year and
 * a fixed UTC job would silently drift an hour every spring - marking goods in
 * at 22:59 through the summer, before the last van is back.
 */
create or replace function public.sweep_collected_to_warehouse(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp := now() at time zone 'Europe/London';
  v_moved integer := 0;
begin
  -- pg_cron calls this with no JWT, so a null caller is the scheduler. Any
  -- real caller has to be an admin: these routines move every shipment in the
  -- business between states.
  if auth.uid() is not null and not public.is_operations_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if not p_force and extract(hour from v_local) <> 23 then
    return jsonb_build_object('skipped', true, 'reason', 'not 23:00 in London', 'localHour',
                              extract(hour from v_local));
  end if;

  with moved as (
    update public.shipments
       set status = 'At Warehouse', updated_at = now()
     where status = 'Collected'
       and deleted_at is null
    returning id
  )
  select count(*) into v_moved from moved;

  if v_moved > 0 then
    insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
    values (null, 'SWEEP_AT_WAREHOUSE', 'SHIPMENT', null,
            jsonb_build_object('moved', v_moved, 'at', now()));
  end if;

  return jsonb_build_object('moved', v_moved, 'status', 'At Warehouse');
end $$;

/**
 * Goods leave for Zimbabwe five days after the last collection of their period.
 *
 * "Last collection of the period" is the latest *scheduled* date across that
 * period's routes (collection_schedules.pickup_on), not the last collection
 * actually recorded — a route that slips would otherwise keep pushing the
 * departure date back, and the container does not wait.
 *
 * A shipment's period is taken from the shipment itself where it is set, and
 * from its collection schedule where it is not; older bookings only carry the
 * schedule.
 */
create or replace function public.sweep_warehouse_to_enroute(
  p_force boolean default false,
  p_days integer default 5
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp := now() at time zone 'Europe/London';
  v_moved integer := 0;
begin
  -- pg_cron calls this with no JWT, so a null caller is the scheduler. Any
  -- real caller has to be an admin: these routines move every shipment in the
  -- business between states.
  if auth.uid() is not null and not public.is_operations_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  -- Once a day is plenty; 06:00 London means the change is there when the
  -- office opens rather than appearing mid-morning.
  if not p_force and extract(hour from v_local) <> 6 then
    return jsonb_build_object('skipped', true, 'reason', 'not 06:00 in London');
  end if;

  with period_end as (
    select cs.collection_period_id as period_id, max(cs.pickup_on) as last_pickup
      from public.collection_schedules cs
     where cs.collection_period_id is not null
       and cs.pickup_on is not null
     group by cs.collection_period_id
    having max(cs.pickup_on) <= current_date - make_interval(days => greatest(0, p_days))
  ),
  moved as (
    update public.shipments s
       set status = 'Enroute to Zimbabwe', updated_at = now()
      from period_end pe
     where coalesce(
             s.collection_period_id,
             (select cs.collection_period_id from public.collection_schedules cs
               where cs.id = s.collection_schedule_id)
           ) = pe.period_id
       and s.status in ('Collected', 'At Warehouse')
       and s.deleted_at is null
    returning s.id
  )
  select count(*) into v_moved from moved;

  if v_moved > 0 then
    insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
    values (null, 'SWEEP_ENROUTE', 'SHIPMENT', null,
            jsonb_build_object('moved', v_moved, 'days', p_days, 'at', now()));
  end if;

  return jsonb_build_object('moved', v_moved, 'status', 'Enroute to Zimbabwe');
end $$;

revoke all on function public.sweep_collected_to_warehouse(boolean) from public, anon;
revoke all on function public.sweep_warehouse_to_enroute(boolean, integer) from public, anon;
-- Admins can run either by hand, for the first backfill and for the month a
-- route slips and somebody needs it moved now.
grant execute on function public.sweep_collected_to_warehouse(boolean) to authenticated;
grant execute on function public.sweep_warehouse_to_enroute(boolean, integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'shipments-at-warehouse';
    perform cron.schedule('shipments-at-warehouse', '59 * * * *',
                          'select public.sweep_collected_to_warehouse()');

    perform cron.unschedule(jobid) from cron.job where jobname = 'shipments-enroute';
    perform cron.schedule('shipments-enroute', '5 * * * *',
                          'select public.sweep_warehouse_to_enroute()');
  else
    raise notice 'pg_cron not installed - status sweeps must be run manually';
  end if;
end $$;
