-- Driver exception flow + end-of-run completion.
-- Applied to the live DB via the staff-ops edge function's "setup" action.

alter table public.driver_run_stops add column if not exists failure_note text;
alter table public.driver_run_stops add column if not exists failed_at timestamptz;

-- Mark a stop as failed with a reason; notifies admins and stamps the shipment.
create or replace function public.fail_driver_stop(
  p_stop_id uuid,
  p_reason text,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_stop public.driver_run_stops%rowtype;
  v_run public.driver_runs%rowtype;
  v_is_admin boolean := false;
  v_now timestamptz := now();
  v_customer text;
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
  ) into v_is_admin;

  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found then raise exception 'Driver stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if not v_is_admin and v_run.driver_id <> auth.uid() then
    raise exception 'This stop is not assigned to you';
  end if;
  if v_stop.status in ('completed', 'failed') then
    raise exception 'This stop is already closed';
  end if;
  if p_reason not in ('not_home', 'goods_not_ready', 'payment_issue', 'access_problem', 'other') then
    raise exception 'Unknown failure reason';
  end if;

  update public.driver_run_stops set
    status = 'failed',
    failure_reason = p_reason,
    failure_note = nullif(trim(coalesce(p_note, '')), ''),
    failed_at = v_now,
    updated_at = v_now
  where id = p_stop_id
  returning * into v_stop;

  update public.shipments set
    driver_status = 'failed',
    updated_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'driverUpdate', jsonb_build_object(
        'status', 'failed', 'reason', p_reason, 'note', p_note,
        'stopType', v_stop.stop_type, 'updatedAt', v_now, 'driverId', v_run.driver_id
      )
    )
  where id = v_stop.shipment_id;

  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (v_stop.shipment_id, 'driver_stop_failed', null, 'failed', auth.uid(),
          jsonb_build_object('runId', v_run.id, 'stopId', v_stop.id, 'reason', p_reason, 'note', p_note));

  select coalesce(metadata->'sender'->>'name', metadata->'recipient'->>'name', tracking_number)
    into v_customer from public.shipments where id = v_stop.shipment_id;

  insert into public.notifications(user_id, title, message, type, related_id, is_read)
  values ('00000000-0000-0000-0000-000000000000',
          'Driver stop failed',
          coalesce(v_customer, 'A stop') || ' — ' || replace(p_reason, '_', ' ') ||
            coalesce(': ' || p_note, '') || '. Replan this ' || v_stop.stop_type || '.',
          'driver_exception', v_stop.shipment_id, false);

  return jsonb_build_object('stopId', v_stop.id, 'status', v_stop.status, 'reason', p_reason);
end; $$;

-- Close an active run once every stop is completed or failed; returns the day summary.
create or replace function public.complete_driver_run(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run public.driver_runs%rowtype;
  v_open integer;
  v_done integer;
  v_failed integer;
  v_cash jsonb;
begin
  select * into v_run from public.driver_runs where id = p_run_id for update;
  if not found then raise exception 'Run not found'; end if;
  if v_run.driver_id <> auth.uid() and not exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
  ) then
    raise exception 'This run is not assigned to you';
  end if;
  if v_run.status <> 'active' then raise exception 'Only an active run can be completed'; end if;

  select count(*) filter (where status not in ('completed', 'failed')),
         count(*) filter (where status = 'completed'),
         count(*) filter (where status = 'failed')
    into v_open, v_done, v_failed
    from public.driver_run_stops where run_id = p_run_id;
  if v_open > 0 then
    raise exception 'There are still % open stop(s). Complete or mark them as exceptions first.', v_open;
  end if;

  select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) into v_cash
  from (
    select i.currency, sum(i.total) as total
    from public.driver_invoices i
    join public.driver_run_stops s on s.id = i.stop_id
    where s.run_id = p_run_id
    group by i.currency
  ) sums;

  update public.driver_runs
     set status = 'completed', completed_at = now(), updated_at = now()
   where id = p_run_id;

  insert into public.notifications(user_id, title, message, type, related_id, is_read)
  values ('00000000-0000-0000-0000-000000000000', 'Driver run completed',
          coalesce(v_run.route_name, 'Run') || ': ' || v_done || ' completed, ' || v_failed || ' failed.',
          'driver_run', p_run_id, false);

  return jsonb_build_object('completed', v_done, 'failed', v_failed, 'invoiced', v_cash);
end; $$;
