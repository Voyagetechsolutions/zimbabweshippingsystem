-- ---------------------------------------------------------------------------
-- Collection runs: giving a collection period an identity
--
-- Dispatch could not group work by "the Northampton run on the 14th" because
-- nothing in the database represented that. `collection_schedules` holds one
-- row per ROUTE and its `pickup_date` is edited in place
-- (`update ... set pickup_date = new_date where route = route_name`), so the
-- schedule id identifies a route, not an occurrence of it: move the date and
-- every shipment ever linked to that route appears to belong to the new date.
--
-- The shape of the problem in the live data before this migration:
--   * 278 shipments read as awaiting collection, of which only 11 carried a
--     schedule link at all.
--   * 83 distinct route/date pairs, dominated by "(no route) | (no date)" (71)
--     and "To be assigned | To be confirmed" (35).
--   * Route names recorded inconsistently — BRIGHTON vs BRIGHTON ROUTE, LEEDS
--     vs LEEDS ROUTE, SOUTHEND vs SOUTHEND ROUTE.
--
-- A `collection_run` is one route on one date. Shipments attach to it
-- automatically as they are booked, whichever booking path they came in
-- through, and dispatch opens a run to work it.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- A. The run
-- ---------------------------------------------------------------------------

create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.collection_schedules(id) on delete set null,
  route text not null,
  country text,
  -- Null while the office has not published the next date for this route. The
  -- run still exists and still gathers bookings; it simply has no date yet.
  collection_date date,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'completed', 'cancelled')),
  driver_run_id uuid references public.driver_runs(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One run per route per date. Nulls compare as distinct in a plain unique
-- index, so the undated run is pinned to a sentinel to keep it single.
create unique index if not exists collection_runs_route_date_key
  on public.collection_runs (route, coalesce(collection_date, date '0001-01-01'));
create index if not exists collection_runs_date_idx on public.collection_runs (collection_date);
create index if not exists collection_runs_status_idx on public.collection_runs (status);

alter table public.shipments
  add column if not exists collection_run_id uuid references public.collection_runs(id) on delete set null;
create index if not exists shipments_collection_run_idx
  on public.shipments (collection_run_id) where deleted_at is null;

create or replace function public.touch_collection_run()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists collection_runs_touch on public.collection_runs;
create trigger collection_runs_touch before update on public.collection_runs
  for each row execute function public.touch_collection_run();

alter table public.collection_runs enable row level security;

drop policy if exists "Operations manage collection runs" on public.collection_runs;
create policy "Operations manage collection runs" on public.collection_runs
  for all to authenticated
  using (public.is_operations_admin()) with check (public.is_operations_admin());

-- A driver working the run needs to see it.
drop policy if exists "Drivers read their collection runs" on public.collection_runs;
create policy "Drivers read their collection runs" on public.collection_runs
  for select to authenticated using (
    exists (select 1 from public.driver_runs r
             where r.id = collection_runs.driver_run_id and r.driver_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- B. Working out which route a booking belongs to
-- ---------------------------------------------------------------------------

/**
 * The canonical route name for whatever was recorded on a booking.
 *
 * Bookings carry "BRIGHTON" where the schedule says "BRIGHTON ROUTE" and vice
 * versa, so an exact match loses roughly a fifth of them. Compared on letters
 * and digits only, with the word ROUTE stripped from both sides.
 */
create or replace function public.canonical_route_name(p_route text)
returns text language sql stable set search_path = public as $$
  select cs.route from public.collection_schedules cs
   where regexp_replace(upper(regexp_replace(coalesce(cs.route, ''), '[^A-Za-z0-9]', '', 'g')), 'ROUTE$', '')
       = regexp_replace(upper(regexp_replace(coalesce(p_route, ''), '[^A-Za-z0-9]', '', 'g')), 'ROUTE$', '')
     and coalesce(p_route, '') <> ''
   limit 1
$$;

/**
 * The schedule covering a collection address, mirroring the apps'
 * `scheduleMatchesPostcode`.
 *
 * UK matches the postcode's outward code or the town against the route's areas;
 * Ireland has no usable postcode so it matches the town alone. Deliberately
 * returns nothing rather than a guess when neither matches — an unassigned
 * booking that dispatch can see is far better than a confident wrong route.
 */
create or replace function public.match_collection_schedule(
  p_postcode text, p_city text, p_country text
) returns public.collection_schedules
language plpgsql stable set search_path = public as $$
declare
  v_ireland boolean := lower(coalesce(p_country, '')) like '%ireland%';
  v_code text := upper(regexp_replace(coalesce(p_postcode, ''), '[^A-Za-z0-9]', '', 'g'));
  v_town text := upper(regexp_replace(coalesce(p_city, ''), '[^A-Za-z0-9]', '', 'g'));
  v_outward text;
  v_row public.collection_schedules%rowtype;
begin
  -- "LU11AA" -> "LU1"; anything four characters or shorter is already outward.
  v_outward := case when length(v_code) > 4 then left(v_code, length(v_code) - 3) else v_code end;

  if v_ireland then
    if length(v_town) < 3 then return null; end if;
    select * into v_row from public.collection_schedules cs
     where lower(coalesce(cs.country, '')) like '%ireland%'
       and upper(regexp_replace(cs.areas::text, '[^A-Za-z0-9]', '', 'g')) like '%' || v_town || '%'
     order by cs.pickup_on nulls last limit 1;
    return v_row;
  end if;

  if length(v_outward) >= 2 then
    select * into v_row from public.collection_schedules cs
     where lower(coalesce(cs.country, 'UK')) not like '%ireland%'
       and upper(regexp_replace(cs.areas::text, '[^A-Za-z0-9]', '', 'g')) like '%' || v_outward || '%'
     order by cs.pickup_on nulls last limit 1;
    if found then return v_row; end if;
  end if;

  if length(v_town) >= 3 then
    select * into v_row from public.collection_schedules cs
     where lower(coalesce(cs.country, 'UK')) not like '%ireland%'
       and upper(regexp_replace(cs.areas::text, '[^A-Za-z0-9]', '', 'g')) like '%' || v_town || '%'
     order by cs.pickup_on nulls last limit 1;
    return v_row;
  end if;

  return null;
end $$;

/** Find or create the run for one route on one date. */
create or replace function public.ensure_collection_run(
  p_route text, p_date date, p_schedule_id uuid default null, p_country text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_route), '') = '' then return null; end if;

  select id into v_id from public.collection_runs
   where route = p_route and coalesce(collection_date, date '0001-01-01') = coalesce(p_date, date '0001-01-01');
  if found then
    update public.collection_runs
       set schedule_id = coalesce(schedule_id, p_schedule_id),
           country = coalesce(country, p_country)
     where id = v_id;
    return v_id;
  end if;

  insert into public.collection_runs (schedule_id, route, country, collection_date)
  values (p_schedule_id, p_route, p_country, p_date)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.collection_runs
     where route = p_route and coalesce(collection_date, date '0001-01-01') = coalesce(p_date, date '0001-01-01');
  end if;
  return v_id;
end $$;

revoke all on function public.ensure_collection_run(text, date, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. Attaching a booking to its run
-- ---------------------------------------------------------------------------

/**
 * Put one shipment in the right run.
 *
 * Order of preference for the route: the schedule already linked to the
 * booking, then the route name the booking recorded (canonicalised), then the
 * route the collection postcode resolves to. The date follows the route's
 * published date, falling back to whatever the booking recorded.
 *
 * Returns the run id, or null when nothing could be resolved — which is a
 * legitimate outcome and shows in dispatch as unassigned.
 */
create or replace function public.attach_shipment_to_run(p_shipment_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ship public.shipments%rowtype;
  v_sched public.collection_schedules%rowtype;
  v_sender jsonb; v_route text; v_date date; v_run uuid;
begin
  select * into v_ship from public.shipments where id = p_shipment_id;
  if not found then return null; end if;

  if v_ship.collection_schedule_id is not null then
    select * into v_sched from public.collection_schedules where id = v_ship.collection_schedule_id;
  end if;

  if v_sched.id is null then
    v_route := public.canonical_route_name(nullif(v_ship.metadata->'collection'->>'route', 'To be assigned'));
    if v_route is not null then
      select * into v_sched from public.collection_schedules where route = v_route limit 1;
    end if;
  end if;

  if v_sched.id is null then
    v_sender := coalesce(v_ship.metadata->'sender', v_ship.metadata->'senderDetails', '{}'::jsonb);
    select * into v_sched from public.match_collection_schedule(
      coalesce(v_sender->>'postalCode', v_sender->>'postcode'),
      v_sender->>'city',
      coalesce(v_sender->>'country', v_ship.metadata->'collection'->>'country'));
  end if;

  if v_sched.id is null then return null; end if;

  v_date := coalesce(v_sched.pickup_on, public.parse_schedule_date(v_ship.metadata->'collection'->>'date'));
  v_run := public.ensure_collection_run(v_sched.route, v_date, v_sched.id, v_sched.country);

  update public.shipments
     set collection_run_id = v_run,
         collection_schedule_id = coalesce(collection_schedule_id, v_sched.id)
   where id = p_shipment_id;

  return v_run;
end $$;

revoke all on function public.attach_shipment_to_run(uuid) from public, anon;
grant execute on function public.attach_shipment_to_run(uuid) to authenticated;

/**
 * Every new booking joins a run, whichever door it came in through — the app,
 * the website, or a manual booking typed by the office. A trigger rather than a
 * change to `create_customer_booking`, because there is more than one creator
 * and they must not drift apart again.
 *
 * Never fatal: a booking that cannot be filed is still a booking.
 */
create or replace function public.attach_new_shipment_to_run()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.attach_shipment_to_run(new.id);
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists shipment_joins_collection_run on public.shipments;
create trigger shipment_joins_collection_run
  after insert on public.shipments
  for each row execute function public.attach_new_shipment_to_run();

/**
 * When the office moves a route's date, the run moves with it.
 *
 * Without this, editing NORTHAMPTON from the 14th to the 16th would leave the
 * existing bookings in a 14th run and start filing new ones into a 16th run —
 * splitting one collection into two groups, which is precisely the confusion
 * this table exists to remove. Only open runs follow; a completed run keeps the
 * date it actually happened on.
 */
create or replace function public.move_collection_run_with_schedule()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pickup_on is distinct from old.pickup_on then
    -- Skip when a run already sits on the new date, or the unique index trips.
    update public.collection_runs r
       set collection_date = new.pickup_on
     where r.schedule_id = new.id
       and r.status in ('planned', 'active')
       and r.collection_date is distinct from new.pickup_on
       and not exists (
         select 1 from public.collection_runs other
          where other.route = r.route and other.id <> r.id
            and coalesce(other.collection_date, date '0001-01-01') = coalesce(new.pickup_on, date '0001-01-01'));
  end if;
  return new;
end $$;

drop trigger if exists collection_run_follows_schedule on public.collection_schedules;
create trigger collection_run_follows_schedule
  after update of pickup_on on public.collection_schedules
  for each row execute function public.move_collection_run_with_schedule();

-- ---------------------------------------------------------------------------
-- D. Backfill
-- ---------------------------------------------------------------------------

/**
 * File the bookings that are genuinely still waiting to be collected.
 *
 * Scoped hard on purpose. `collection_status` is stale across this data — 124
 * of the 278 shipments it calls uncollected are already In Transit, Arrived or
 * Delivered — so `status` is the signal that means anything, and only the
 * pre-collection ones are swept in. Sixty days keeps a year of abandoned
 * bookings out of next week's run.
 */
do $$
declare v_row record; v_count integer := 0;
begin
  for v_row in
    select s.id from public.shipments s
     where s.deleted_at is null
       and s.collection_run_id is null
       and lower(coalesce(s.status, '')) in ('booking confirmed', 'confirmed', 'pending')
       and s.created_at >= now() - interval '60 days'
  loop
    begin
      perform public.attach_shipment_to_run(v_row.id);
      v_count := v_count + 1;
    exception when others then null;
    end;
  end loop;
  raise notice 'collection runs: considered % pending shipments', v_count;
end $$;

-- ---------------------------------------------------------------------------
-- E. The dispatch board
-- ---------------------------------------------------------------------------

/**
 * One row per run, with the numbers dispatch actually decides on: how much work
 * is in it, how many customers have chosen a time, and whether a driver is on
 * it yet. Unassigned bookings are returned as a synthetic run with a null id so
 * they sit in the same list rather than being forgotten in another screen.
 */
create or replace function public.collection_run_board(p_include_done boolean default false)
returns table (
  run_id uuid, route text, country text, collection_date date, status text,
  driver_run_id uuid, driver_name text,
  shipment_count integer, slots_chosen integer, needs_contact integer
) language sql stable security definer set search_path = public as $$
  select
    r.id, r.route, r.country, r.collection_date, r.status,
    r.driver_run_id,
    -- Not every staff profile has a name filled in, and a nameless driver
    -- must not read as no driver at all.
    (select coalesce(nullif(btrim(p.full_name), ''), p.email) from public.profiles p
      join public.driver_runs dr on dr.driver_id = p.id where dr.id = r.driver_run_id),
    (select count(*)::int from public.shipments s
      where s.collection_run_id = r.id and s.deleted_at is null),
    (select count(*)::int from public.shipments s
      join public.collection_slots cs on cs.shipment_id = s.id
      where s.collection_run_id = r.id and s.deleted_at is null and cs.requested_at is not null),
    (select count(*)::int from public.shipments s
      join public.collection_slots cs on cs.shipment_id = s.id
      where s.collection_run_id = r.id and s.deleted_at is null
        and cs.dispatch_set_at is not null
        and not cs.requested_flexible and cs.requested_at is not null
        and (cs.requested_start is distinct from cs.dispatch_start
          or cs.requested_end is distinct from cs.dispatch_end)
        and (cs.customer_informed_at is null or cs.customer_informed_at < cs.dispatch_set_at))
  from public.collection_runs r
  where public.is_operations_admin()
    and (p_include_done or r.status in ('planned', 'active'))

  union all

  -- Recent bookings whose postcode matched no route. These need a human, so
  -- they sit in the same list rather than in a screen nobody opens.
  select
    null::uuid, 'Unassigned', null, null, 'planned', null, null,
    (select count(*)::int from public.shipments s
      where s.deleted_at is null and s.collection_run_id is null
        and lower(coalesce(s.status, '')) in ('booking confirmed', 'confirmed', 'pending')
        and s.created_at >= now() - interval '60 days'),
    0, 0
  where public.is_operations_admin()

  union all

  -- Older pending bookings, counted but kept out of the working set. Most are
  -- abandoned; burying this week's real stragglers among a year of them was
  -- what made the flat list unusable in the first place.
  select
    null::uuid, 'Older than 60 days', null, null, 'planned', null, null,
    (select count(*)::int from public.shipments s
      where s.deleted_at is null and s.collection_run_id is null
        and lower(coalesce(s.status, '')) in ('booking confirmed', 'confirmed', 'pending')
        and s.created_at < now() - interval '60 days'),
    0, 0
  where public.is_operations_admin()

  order by 4 nulls last, 2
$$;

revoke all on function public.collection_run_board(boolean) from public, anon;
grant execute on function public.collection_run_board(boolean) to authenticated;
