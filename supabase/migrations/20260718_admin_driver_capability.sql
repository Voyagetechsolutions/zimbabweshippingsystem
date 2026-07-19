-- Admins may temporarily operate the driver dashboard without losing their
-- admin role. A run still has to be explicitly assigned to their auth user.

create or replace function public.clock_driver(
  p_action text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.driver_attendance%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        is_admin = true
        or lower(coalesce(role, '')) in ('admin', 'logistics', 'driver')
      )
  ) then
    raise exception 'Driver access required';
  end if;

  if p_action = 'in' then
    insert into public.driver_attendance(driver_id, work_date, clocked_in_at, clock_in_note)
    values(auth.uid(), current_date, now(), p_note)
    on conflict(driver_id, work_date) do update
      set clocked_in_at = coalesce(driver_attendance.clocked_in_at, now()),
          clocked_out_at = null,
          clock_in_note = coalesce(excluded.clock_in_note, driver_attendance.clock_in_note)
    returning * into v_row;
  elsif p_action = 'out' then
    if exists (
      select 1
      from public.driver_runs r
      join public.driver_run_stops s on s.run_id = r.id
      where r.driver_id = auth.uid()
        and r.run_date = current_date
        and r.status = 'active'
        and s.status not in ('completed', 'failed')
    ) then
      raise exception 'Complete or report every active stop before clocking out';
    end if;
    update public.driver_attendance
      set clocked_out_at = now(), clock_out_note = p_note
      where driver_id = auth.uid() and work_date = current_date
      returning * into v_row;
    if not found then raise exception 'Clock in before clocking out'; end if;
  else
    raise exception 'Action must be in or out';
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values(auth.uid(), 'CLOCK_' || upper(p_action), 'DRIVER_ATTENDANCE', v_row.id,
         jsonb_build_object('workDate', v_row.work_date));
  return to_jsonb(v_row);
end;
$$;

grant execute on function public.clock_driver(text, text) to authenticated;
