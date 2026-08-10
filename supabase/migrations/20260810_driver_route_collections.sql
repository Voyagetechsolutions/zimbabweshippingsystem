-- Every clocked-in driver sees the whole of today's active collection route.
--
-- Only one collection route runs per day, so per-driver stop assignment is
-- unnecessary overhead: if the London route is active, every driver on shift
-- needs the same list of addresses and can pick the nearest.
--
-- NOTE: applied to the live DB via the staff-ops edge function's "setup"
-- action (migration history is out of sync — never `db push`).

-- ---------------------------------------------------------------------------
-- A. Read a free-text pickup_date as a real date
-- ---------------------------------------------------------------------------
-- Live data is written in ordinal form ("August 5th, 2026"), which Postgres
-- cannot cast — the "th" makes it invalid input. Some rows are prose
-- ("To be confirmed", "Not set"), so this must never raise.

create or replace function public.parse_schedule_date(p_text text)
returns date
language plpgsql
immutable
as $$
declare v_clean text;
begin
  if p_text is null or btrim(p_text) = '' then return null; end if;
  v_clean := regexp_replace(p_text, '(\d+)(st|nd|rd|th)', '\1', 'gi');
  begin
    return v_clean::date;
  exception when others then
    return null;
  end;
end $$;

grant execute on function public.parse_schedule_date(text) to authenticated;

-- ---------------------------------------------------------------------------
-- B. Which route is running today
-- ---------------------------------------------------------------------------

create or replace function public.active_collection_routes(p_date date default null)
returns table (schedule_id uuid, route text, country text, pickup_date text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.route, s.country, s.pickup_date
  from public.collection_schedules s
  where coalesce(s.approved, true)
    and public.parse_schedule_date(s.pickup_date) = coalesce(p_date, current_date);
$$;

grant execute on function public.active_collection_routes(date) to authenticated;

-- ---------------------------------------------------------------------------
-- C. The collections a driver should see today
-- ---------------------------------------------------------------------------
-- Cached pickup coordinates, declared before the function that reads them so
-- the column exists no matter how this file is split or re-run.

alter table public.shipments
  add column if not exists pickup_latitude double precision,
  add column if not exists pickup_longitude double precision;

-- Returns every shipment still awaiting collection on today's active route,
-- regardless of whether anyone was assigned to it. A shipment is matched either
-- by its linked schedule id or by the route name recorded at booking, because
-- website bookings store the route as text and only sometimes link the schedule.
--
-- Coordinates are returned when known; the app resolves the rest from the
-- postcode. Anything the driver needs to do the job is included, and nothing
-- else: no pricing, no invoice data.

create or replace function public.driver_route_collections(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_staff boolean;
  v_day date := coalesce(p_date, current_date);
  v_routes jsonb;
  v_stops jsonb;
begin
  if v_uid is null then raise exception 'Sign in to view collections'; end if;

  -- Drivers, dispatchers, logistics and admins may all see the day's route.
  select exists (
    select 1 from public.profiles
    where id = v_uid
      and (is_admin = true
           or lower(coalesce(role, '')) in ('driver', 'dispatcher', 'logistics', 'admin'))
  ) into v_is_staff;
  if not v_is_staff then raise exception 'Driver or dispatch access required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'scheduleId', r.schedule_id, 'route', r.route,
           'country', r.country, 'pickupDate', r.pickup_date)), '[]'::jsonb)
    into v_routes
  from public.active_collection_routes(v_day) r;

  select coalesce(jsonb_agg(x order by x->>'customerName'), '[]'::jsonb) into v_stops
  from (
    select jsonb_build_object(
      'shipmentId', s.id,
      'trackingNumber', s.tracking_number,
      'customerReference', s.customer_reference,
      'customerName', trim(coalesce(s.metadata->'sender'->>'firstName', '') || ' ' ||
                           coalesce(s.metadata->'sender'->>'lastName', '')),
      'phone', s.metadata->'sender'->>'phone',
      'address', s.metadata->'sender'->>'address',
      'city', coalesce(s.metadata->'sender'->>'city', ''),
      -- Website bookings use 'postcode'; the app writes 'postalCode'.
      'postcode', coalesce(s.metadata->'sender'->>'postcode', s.metadata->'sender'->>'postalCode', ''),
      'route', s.metadata->'collection'->>'route',
      'goodsDescription', left(coalesce(s.goods_description, ''), 400),
      'collectionStatus', s.collection_status,
      -- A planned stop's coordinates win; otherwise use the point cached on the
      -- shipment by whichever driver resolved its postcode first.
      'latitude', coalesce(st.latitude, s.pickup_latitude),
      'longitude', coalesce(st.longitude, s.pickup_longitude),
      'stopId', st.id
    ) as x
    from public.shipments s
    -- A stop row may already exist (and carry coordinates) if a run was planned.
    left join public.driver_run_stops st
      on st.shipment_id = s.id and st.stop_type = 'collection'
    where s.deleted_at is null
      and coalesce(s.collection_status, 'Awaiting Collection') <> 'Collected'
      and (
        s.collection_schedule_id in (select schedule_id from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route', '')) in (
             select upper(route) from public.active_collection_routes(v_day))
        -- Route names are stored both with and without the " ROUTE" suffix.
        or upper(coalesce(s.metadata->'collection'->>'route', '')) || ' ROUTE' in (
             select upper(route) from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route', '')) in (
             select upper(replace(route, ' ROUTE', '')) from public.active_collection_routes(v_day))
      )
  ) sub;

  return jsonb_build_object('date', v_day, 'routes', v_routes, 'collections', v_stops);
end $$;

grant execute on function public.driver_route_collections(date) to authenticated;

-- ---------------------------------------------------------------------------
-- D. Cache resolved pickup coordinates on the shipment
-- ---------------------------------------------------------------------------
-- The app resolves a collection's postcode to a point once and stores it, so
-- every driver on the route reuses the same lookup instead of each of them
-- hitting the free geocoder for the same 60 addresses. (Columns are declared in
-- section C, above the function that reads them.)

create or replace function public.set_shipment_pickup_point(
  p_shipment_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (is_admin = true
           or lower(coalesce(role, '')) in ('driver', 'dispatcher', 'logistics', 'admin'))
  ) then
    raise exception 'Driver or dispatch access required';
  end if;
  if p_latitude is null or p_longitude is null then return; end if;
  -- Guard against a bad geocode writing nonsense onto the shipment.
  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Coordinates out of range';
  end if;

  update public.shipments
     set pickup_latitude = p_latitude, pickup_longitude = p_longitude
   where id = p_shipment_id;
end $$;

grant execute on function public.set_shipment_pickup_point(uuid, double precision, double precision) to authenticated;
