-- One current location per driver for the shared collections map.
-- This is deliberately not a tracking history: every update replaces the
-- previous point, limiting the amount of sensitive location data retained.

create table if not exists public.driver_live_locations (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision null check (accuracy_m is null or accuracy_m >= 0),
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.driver_live_locations enable row level security;

drop policy if exists "Drivers read own live location" on public.driver_live_locations;
create policy "Drivers read own live location" on public.driver_live_locations
  for select to authenticated
  using (driver_id = auth.uid());

drop policy if exists "Operations read driver live locations" on public.driver_live_locations;
create policy "Operations read driver live locations" on public.driver_live_locations
  for select to authenticated
  using (public.is_operations_admin());

create or replace function public.update_driver_live_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
  v_row public.driver_live_locations%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90
    or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid location coordinates';
  end if;
  if p_accuracy_m is not null and (p_accuracy_m < 0 or p_accuracy_m > 10000) then
    raise exception 'Invalid location accuracy';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.staff_active is distinct from false
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'driver', 'dispatcher', 'logistics'))
  ) into v_allowed;
  if not v_allowed then raise exception 'Driver or operations access required'; end if;

  insert into public.driver_live_locations(driver_id, latitude, longitude, accuracy_m, recorded_at, updated_at)
  values (auth.uid(), p_latitude, p_longitude, p_accuracy_m, now(), now())
  on conflict (driver_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    recorded_at = excluded.recorded_at,
    updated_at = excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'driverId', v_row.driver_id,
    'latitude', v_row.latitude,
    'longitude', v_row.longitude,
    'accuracyM', v_row.accuracy_m,
    'recordedAt', v_row.recorded_at
  );
end;
$$;

revoke all on function public.update_driver_live_location(double precision, double precision, double precision) from public, anon;
grant execute on function public.update_driver_live_location(double precision, double precision, double precision) to authenticated;

grant select on public.driver_live_locations to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.driver_live_locations;
exception when duplicate_object then
  null;
end;
$$;
