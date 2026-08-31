-- Dispatchers can build and assign routes.
--
-- The driver_runs / driver_run_stops policies were written before the
-- dispatcher role existed and inline a check for admin/logistics only. The app
-- now routes profiles.role = 'dispatcher' to its own dashboard, so without this
-- a dispatcher can see every run and driver position but cannot create a route,
-- add a stop or record the window a customer gave.
--
-- Deliberately a separate predicate rather than widening is_operations_admin():
-- that function also gates finance-adjacent and staff-record surfaces, and a
-- dispatcher has no business there.

create or replace function public.is_dispatch_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics', 'dispatcher'))
  )
$$;

grant execute on function public.is_dispatch_staff() to authenticated;

drop policy if exists "Admins manage driver runs" on public.driver_runs;
create policy "Admins manage driver runs" on public.driver_runs
  for all to authenticated
  using (public.is_dispatch_staff())
  with check (public.is_dispatch_staff());

drop policy if exists "Admins manage driver stops" on public.driver_run_stops;
create policy "Admins manage driver stops" on public.driver_run_stops
  for all to authenticated
  using (public.is_dispatch_staff())
  with check (public.is_dispatch_staff());

-- A dispatcher also has to see who is available and where they are.
drop policy if exists "Dispatch sees driver presence" on public.driver_presence;
create policy "Dispatch sees driver presence" on public.driver_presence
  for select to authenticated
  using (driver_id = auth.uid() or public.is_dispatch_staff());
