-- Letting a customer choose which collection they want to be on.
--
-- The booking form only ever offered one date, and worse, adding a new month
-- destroyed the old one. Both come from the same cause: `collection_schedules`
-- has exactly one row per route, and that row holds both the route definition
-- (name, country, the postcodes it covers) *and* its single `pickup_date`. The
-- admin "create a collection period" flow therefore does an UPDATE:
--
--     update collection_schedules set pickup_date = ..., collection_period_id = ...
--      where id = <the route>
--
-- So publishing October's dates overwrote September's in place. On 2026-09-11
-- the live table held 17 rows for 17 routes, every UK one carrying an October
-- date and every Irish one a November date, while 23 shipments sat booked and
-- uncollected against September dates that no longer existed anywhere. The
-- `schedule_name` column still read "LONDON ROUTE - May 16th, 2026" — the row
-- had been overwritten so many times the name was four periods stale.
--
-- A route is a stable thing: LONDON ROUTE covers the same postcodes next month
-- as this month. A collection is not: it happens on a date, once per
-- consignment. Those are two entities sharing one row, so this adds the
-- missing one rather than widening the old one.
--
-- `collection_schedules` is deliberately left alone. It is read in roughly
-- thirty places — driver run matching, pickup zones, postcode coverage,
-- reports, the public hero, both mobile apps — all of which want exactly what
-- it means today: one row per route. Sixteen live `collection_runs` also
-- follow `pickup_on` through a trigger, so churning that column would drag
-- drivers' planned runs with it. Nothing here writes to it.

-- ---------------------------------------------------------------------------
-- A. The collections a route will actually run
-- ---------------------------------------------------------------------------

create table if not exists public.route_collection_dates (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.collection_schedules(id) on delete cascade,
  collection_period_id uuid not null references public.collection_periods(id),
  pickup_on date not null,
  -- Unpublished dates are the office's own planning; only published ones are
  -- offered to a customer.
  published boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid
);

comment on table public.route_collection_dates is
  'One row per collection a route runs: which route, which consignment period, which day. '
  'Many rows per route — this is what lets a customer choose between September and October. '
  'collection_schedules stays one-row-per-route and is the route definition.';

-- A route cannot collect twice on one day, but it may well collect on two days
-- inside one period when the load needs splitting — so the identity is
-- (route, day), not (route, period).
create unique index if not exists route_collection_dates_unique_day
  on public.route_collection_dates (schedule_id, pickup_on)
  where deleted_at is null;

create index if not exists route_collection_dates_upcoming
  on public.route_collection_dates (pickup_on, schedule_id)
  where deleted_at is null and published;

create index if not exists route_collection_dates_period
  on public.route_collection_dates (collection_period_id)
  where deleted_at is null;

alter table public.route_collection_dates enable row level security;

-- Guests book without signing in, so the offer has to be readable by anon —
-- the same reach `collection_schedules` already grants its approved rows.
drop policy if exists "Anyone reads published collection dates" on public.route_collection_dates;
create policy "Anyone reads published collection dates"
  on public.route_collection_dates for select
  to anon, authenticated
  using (published and deleted_at is null);

drop policy if exists "Admins read all collection dates" on public.route_collection_dates;
create policy "Admins read all collection dates"
  on public.route_collection_dates for select
  to authenticated
  using (public.is_operations_admin() or public.is_finance_staff());

drop policy if exists "Admins write collection dates" on public.route_collection_dates;
create policy "Admins write collection dates"
  on public.route_collection_dates for all
  to authenticated
  using (public.is_operations_admin())
  with check (public.is_operations_admin());

create or replace function public.touch_route_collection_date()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists route_collection_dates_touch on public.route_collection_dates;
create trigger route_collection_dates_touch before update on public.route_collection_dates
  for each row execute function public.touch_route_collection_date();

-- ---------------------------------------------------------------------------
-- B. Seed it from the date each route currently carries
-- ---------------------------------------------------------------------------

insert into public.route_collection_dates (schedule_id, collection_period_id, pickup_on, note)
select cs.id, cs.collection_period_id, cs.pickup_on, 'Carried over from the route''s published date'
  from public.collection_schedules cs
 where cs.deleted_at is null
   and cs.pickup_on is not null
   and cs.collection_period_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- C. Put September 2026 back
-- ---------------------------------------------------------------------------
--
-- September's dates were overwritten by October's, but they are not lost: 23
-- shipments are booked and awaiting collection, and each one recorded the date
-- it was sold in `metadata.collection.date`. Those are not guesses — a
-- customer is expecting a van on that day.
--
-- Only dates still in the future are restored, and only where the shipments
-- agree: the most-booked date per route wins, and `count(*)` breaks nothing
-- because every route here had a single date with between one and four
-- shipments on it. Routes with no September shipment (Birmingham, Nottingham
-- and the Irish routes) get nothing — there is no evidence of what their
-- September date was, and inventing one would send a driver out on a day
-- nobody agreed to.
--
-- Route names are matched with " ROUTE" stripped from both sides: the metadata
-- carries "LONDON" on some rows and "LONDON ROUTE" on others.

with september as (
  -- Two rows both call themselves September 2026: an empty one typed by hand on
  -- 23 August and the one the shipment trigger created on the 1st, which holds
  -- all 59 bookings. The busy one is the real consignment — picking by
  -- `created_at` picks the decoy and splits the month in two.
  select id from public.collection_periods p
   where p.deleted_at is null and lower(p.name) = 'september 2026'
   order by (select count(*) from public.shipments s
              where s.collection_period_id = p.id and s.deleted_at is null) desc,
            p.created_at
   limit 1
),
evidence as (
  select cs.id as schedule_id,
         public.parse_schedule_date(s.metadata->'collection'->>'date') as pickup_on,
         count(*) as bookings
    from public.shipments s
    join public.collection_schedules cs
      on regexp_replace(upper(coalesce(s.metadata->'collection'->>'route', '')), '\s*ROUTE$', '')
       = regexp_replace(upper(cs.route), '\s*ROUTE$', '')
   where s.deleted_at is null
     and cs.deleted_at is null
     and coalesce(s.status, '') <> 'Cancelled'
     and public.parse_schedule_date(s.metadata->'collection'->>'date')
         between date '2026-09-01' and date '2026-09-30'
     and public.parse_schedule_date(s.metadata->'collection'->>'date') >= current_date
   group by 1, 2
),
best as (
  select distinct on (schedule_id) schedule_id, pickup_on, bookings
    from evidence
   order by schedule_id, bookings desc, pickup_on
)
insert into public.route_collection_dates
       (schedule_id, collection_period_id, pickup_on, note)
select b.schedule_id, september.id, b.pickup_on,
       'Recovered from ' || b.bookings || ' booked shipment(s) after October overwrote September'
  from best b cross join september
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- D. Spelling a date the way every existing row spells it
-- ---------------------------------------------------------------------------

/**
 * "2026-09-14" -> "September 14th, 2026".
 *
 * The inverse of `parse_schedule_date`. Every collection date ever written to
 * `collection_schedules.pickup_date` and to `metadata.collection.date` is in
 * this ordinal form, and a booking made through the new picker has to read
 * back identically to one made before it — the staff app, the receipts and the
 * delivery notes all match on that string.
 */
create or replace function public.schedule_date_text(p_on date)
returns text
language sql
immutable
as $$
  select case when p_on is null then null else
    trim(to_char(p_on, 'FMMonth')) || ' ' || extract(day from p_on)::int ||
    case
      when extract(day from p_on)::int % 100 in (11, 12, 13) then 'th'
      when extract(day from p_on)::int % 10 = 1 then 'st'
      when extract(day from p_on)::int % 10 = 2 then 'nd'
      when extract(day from p_on)::int % 10 = 3 then 'rd'
      else 'th'
    end || ', ' || to_char(p_on, 'YYYY')
  end
$$;

-- ---------------------------------------------------------------------------
-- E. What the booking form asks for
-- ---------------------------------------------------------------------------

/**
 * The collections a route will run that a customer may still choose between.
 *
 * Keyed on the route name rather than the postcode on purpose. Which route
 * covers a postcode is decided by `app_configuration.uk_route_coverage` — a
 * longest-prefix map maintained in one place and read by the website, the
 * staff app and the customer app alike. The database has its own matcher in
 * `match_collection_schedule`, but it matches postcodes against
 * `collection_schedules.areas`, and those hold *town* names: LEEDS ROUTE lists
 * Wakefield, Halifax and York and does not mention Leeds, so an LS1 postcode
 * matches nothing. Re-deriving coverage here would mean a second, weaker
 * answer to a question already answered correctly; the caller passes the route
 * it resolved.
 *
 * The " ROUTE" suffix is normalised away on both sides. Live rows spell the
 * same route "LEEDS" and "LEEDS ROUTE" interchangeably, which is why the
 * booking form previously tried three separate queries to find one row.
 *
 * A known route with nothing upcoming returns `route` set and `options` empty.
 * That is a real state and a different one from "we do not cover you"; the
 * form used to print "To be confirmed" for both.
 */
create or replace function public.collection_dates_for_route(p_route text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := regexp_replace(upper(trim(coalesce(p_route, ''))), '\s*ROUTE$', '');
  v_sched public.collection_schedules;
  v_options jsonb;
begin
  if v_key = '' then
    return jsonb_build_object('route', null, 'scheduleId', null, 'options', '[]'::jsonb);
  end if;

  select * into v_sched
    from public.collection_schedules cs
   where cs.deleted_at is null
     and regexp_replace(upper(cs.route), '\s*ROUTE$', '') = v_key
   order by cs.approved desc nulls last, cs.updated_at desc
   limit 1;

  if not found then
    return jsonb_build_object('route', null, 'scheduleId', null, 'options', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id,
           'date', d.pickup_on,
           'label', public.schedule_date_text(d.pickup_on),
           'periodId', d.collection_period_id,
           'period', p.name
         ) order by d.pickup_on), '[]'::jsonb)
    into v_options
    from public.route_collection_dates d
    join public.collection_periods p on p.id = d.collection_period_id
   where d.schedule_id = v_sched.id
     and d.deleted_at is null
     and d.published
     and p.deleted_at is null
     and d.pickup_on >= current_date;

  return jsonb_build_object(
    'route', v_sched.route,
    'scheduleId', v_sched.id,
    'country', v_sched.country,
    'options', v_options
  );
end $$;

revoke all on function public.collection_dates_for_route(text) from public;
grant execute on function public.collection_dates_for_route(text) to anon, authenticated;

drop function if exists public.collection_date_options(text, text, text);

-- ---------------------------------------------------------------------------
-- F. A booking lands in the consignment it was booked onto
-- ---------------------------------------------------------------------------

/**
 * File a shipment under the consignment it was actually booked onto.
 *
 * This trigger derived the period from `created_at` — the month the booking
 * was *taken*. That was indistinguishable from the month it *ships* only for
 * as long as there was one date to choose from. Now that a customer booking on
 * 11 September can pick October's collection, the clock files them under
 * September and they vanish from the consignment they paid to be on.
 *
 * The date the customer chose is the answer, and every booking path already
 * records it in `metadata.collection.date` — the website's
 * `create_public_booking`, the app's `create_customer_booking_legacy` and the
 * admin's manual booking all write that same key. Resolving it here rather
 * than in each of them means one rule, and no caller has to remember it.
 *
 * Three steps, most specific first:
 *   1. a period the caller stated explicitly wins outright;
 *   2. otherwise the period owning the chosen collection date;
 *   3. otherwise the month the booking was taken, exactly as before.
 *
 * Step 3 is why this is safe to deploy: a booking with no chosen date — every
 * row written before today, and the "To be confirmed" ones — behaves
 * identically to the way it always has.
 */
create or replace function public.assign_collection_period()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_on date;
  v_month text;
  v_year integer;
  v_name text;
  v_period_id uuid;
begin
  if new.collection_period_id is not null then
    return new;
  end if;

  v_on := public.parse_schedule_date(new.metadata->'collection'->>'date');

  if v_on is not null then
    -- Prefer the row on the shipment's own route; a second route collecting on
    -- the same day belongs to the same consignment anyway, so either answers.
    select d.collection_period_id into v_period_id
      from public.route_collection_dates d
     where d.deleted_at is null
       and d.pickup_on = v_on
     order by (d.schedule_id is not distinct from new.collection_schedule_id) desc,
              d.created_at
     limit 1;

    if v_period_id is not null then
      new.collection_period_id := v_period_id;
      return new;
    end if;
  end if;

  v_month := trim(to_char(new.created_at, 'Month'));
  v_year  := extract(year from new.created_at);
  v_name  := v_month || ' ' || v_year;

  select id into v_period_id from public.collection_periods where name = v_name;

  if v_period_id is null then
    insert into public.collection_periods (name, month, year)
    values (v_name, v_month, v_year)
    returning id into v_period_id;
  end if;

  new.collection_period_id := v_period_id;
  return new;
end $$;

/**
 * The day a shipment is actually collected.
 *
 * The order of this coalesce matters and used to be the wrong way round. It
 * read the route's current `pickup_on` first, which meant that the moment
 * October's dates overwrote September's, all 23 shipments still awaiting a
 * September collection silently reported October — on the delivery notes, in
 * the reports and on the driver's list.
 *
 * The date the customer was actually sold is the answer, and it is recorded
 * per shipment. The route's published date is the fallback for older rows that
 * never captured one, where `parse_schedule_date` returns null for the
 * "To be confirmed" placeholder they hold instead.
 */
create or replace function public.shipment_collection_date(p_schedule_id uuid, p_metadata jsonb)
returns date
language sql
stable
set search_path = public
as $$
  select coalesce(
    public.parse_schedule_date(p_metadata->'collection'->>'date'),
    (select cs.pickup_on from public.collection_schedules cs where cs.id = p_schedule_id)
  )
$$;

-- ---------------------------------------------------------------------------
-- G0. Who is booked on a collection
-- ---------------------------------------------------------------------------

/**
 * How many live shipments are waiting for this route on this day.
 *
 * Defined once because two callers need exactly the same answer: the editor
 * shows the count, and `remove_route_collection_date` refuses to delete a date
 * anybody is standing on. If those two ever disagreed the screen would say a
 * date is safe to remove and the removal would then be refused, or worse.
 *
 * Matched on the route *name* as well as `collection_schedule_id`, because the
 * link is not reliable: of the 24 shipments awaiting a September collection,
 * two carry no schedule id at all — the booking form only set it when its
 * `pickup_date` lookup happened to match, which it could not do for any date
 * other than the one date the route currently advertised. Trusting the foreign
 * key alone would have let the office delete a day two customers are expecting
 * a van on.
 */
create or replace function public.shipments_booked_on(p_schedule_id uuid, p_pickup_on date)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
    from public.shipments s
   where s.deleted_at is null
     and coalesce(s.status, '') <> 'Cancelled'
     and public.parse_schedule_date(s.metadata->'collection'->>'date') = p_pickup_on
     and (
       s.collection_schedule_id = p_schedule_id
       or (s.collection_schedule_id is null and exists (
            select 1 from public.collection_schedules cs
             where cs.id = p_schedule_id
               and regexp_replace(upper(cs.route), '\s*ROUTE$', '')
                 = regexp_replace(upper(coalesce(s.metadata->'collection'->>'route', '')), '\s*ROUTE$', '')))
     )
$$;

revoke all on function public.shipments_booked_on(uuid, date) from public, anon;
grant execute on function public.shipments_booked_on(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- G. Adding and removing dates
-- ---------------------------------------------------------------------------

/**
 * Put a route on a date, or move/republish the one it already has there.
 *
 * Deliberately additive: this never writes to `collection_schedules`. The
 * route's own `pickup_date` is what sixteen live `collection_runs` follow
 * through a trigger, and quietly re-pointing it would move a driver's planned
 * round as a side effect of the office pencilling in next month.
 */
create or replace function public.set_route_collection_date(
  p_schedule_id uuid,
  p_period_id uuid,
  p_pickup_on date,
  p_published boolean default true,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.route_collection_dates;
begin
  if not public.is_operations_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_pickup_on is null then
    raise exception 'A collection needs a date' using errcode = '22023';
  end if;
  if not exists (select 1 from public.collection_schedules
                  where id = p_schedule_id and deleted_at is null) then
    raise exception 'Route not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.collection_periods
                  where id = p_period_id and deleted_at is null) then
    raise exception 'Collection period not found' using errcode = 'P0002';
  end if;

  -- A previously removed date coming back is the same collection resurfacing,
  -- not a new one, so the soft-deleted row is revived rather than duplicated —
  -- the partial unique index would otherwise let a second row sit beside it.
  update public.route_collection_dates
     set collection_period_id = p_period_id,
         published = p_published,
         note = coalesce(p_note, note),
         deleted_at = null,
         deleted_by = null
   where schedule_id = p_schedule_id and pickup_on = p_pickup_on
  returning * into v_row;

  if not found then
    insert into public.route_collection_dates
           (schedule_id, collection_period_id, pickup_on, published, note, created_by)
    values (p_schedule_id, p_period_id, p_pickup_on, p_published, p_note, auth.uid())
    returning * into v_row;
  end if;

  return to_jsonb(v_row);
end $$;

revoke all on function public.set_route_collection_date(uuid, uuid, date, boolean, text) from public, anon;
grant execute on function public.set_route_collection_date(uuid, uuid, date, boolean, text) to authenticated;

/**
 * Take a date off a route.
 *
 * Soft-deleted, and refused while customers are booked on it: a shipment whose
 * collection day simply disappears is how somebody gets left standing outside
 * with their drums. The count comes back in the error so the office knows how
 * many people have to be moved first.
 */
create or replace function public.remove_route_collection_date(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.route_collection_dates;
  v_booked integer;
begin
  if not public.is_operations_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_row from public.route_collection_dates
   where id = p_id and deleted_at is null for update;
  if not found then
    raise exception 'That collection date is already gone' using errcode = 'P0002';
  end if;

  v_booked := public.shipments_booked_on(v_row.schedule_id, v_row.pickup_on);

  if v_booked > 0 then
    raise exception '% shipment(s) are booked for this collection — move them to another date first', v_booked
      using errcode = '23503';
  end if;

  update public.route_collection_dates
     set deleted_at = now(), deleted_by = auth.uid()
   where id = p_id
  returning * into v_row;

  return to_jsonb(v_row);
end $$;

revoke all on function public.remove_route_collection_date(uuid) from public, anon;
grant execute on function public.remove_route_collection_date(uuid) to authenticated;

/**
 * Every route with every collection date it has, for the admin editor.
 *
 * Routes with no date at all are included — those are exactly the ones needing
 * attention, and a screen that lists only scheduled routes is a screen where a
 * forgotten route is invisible.
 */
create or replace function public.route_collection_calendar(p_country text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(r order by r.route), '[]'::jsonb) into v_rows
    from (
      select cs.id as "scheduleId",
             cs.route,
             cs.country,
             cs.areas,
             cs.pickup_date as "headlineDate",
             coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', d.id,
                        'date', d.pickup_on,
                        'label', public.schedule_date_text(d.pickup_on),
                        'published', d.published,
                        'periodId', d.collection_period_id,
                        'period', p.name,
                        'past', d.pickup_on < current_date,
                        'booked', public.shipments_booked_on(cs.id, d.pickup_on)
                      ) order by d.pickup_on)
                 from public.route_collection_dates d
                 join public.collection_periods p on p.id = d.collection_period_id
                where d.schedule_id = cs.id and d.deleted_at is null and p.deleted_at is null
             ), '[]'::jsonb) as dates
        from public.collection_schedules cs
       where cs.deleted_at is null
         and (p_country is null
              or (lower(p_country) like '%ireland%')
                 = (lower(coalesce(cs.country, 'UK')) like '%ireland%'))
    ) r;

  return v_rows;
end $$;

revoke all on function public.route_collection_calendar(text) from public, anon;
grant execute on function public.route_collection_calendar(text) to authenticated;
