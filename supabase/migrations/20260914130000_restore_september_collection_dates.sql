-- Restore the complete September calendar from the collection runs that were
-- preserved when collection_schedules was overwritten by later months.
--
-- The first recovery copied only dates with a booked shipment and, at the time
-- it ran, excluded dates before current_date. That made completed/past dates
-- disappear from the admin calendar and omitted routes with no bookings. A
-- collection_run is the operational record that the route was scheduled, so it
-- is the authoritative source for the missing dates.

with september as (
  select p.id
    from public.collection_periods p
   where p.deleted_at is null
     and lower(trim(p.name)) = 'september 2026'
   order by (select count(*) from public.shipments s
              where s.collection_period_id = p.id and s.deleted_at is null) desc,
            p.created_at
   limit 1
),
recorded_runs as (
  select distinct cs.id as schedule_id, r.collection_date as pickup_on
    from public.collection_runs r
    join public.collection_schedules cs
      on regexp_replace(upper(r.route), '\s*ROUTE$', '')
       = regexp_replace(upper(cs.route), '\s*ROUTE$', '')
   where r.collection_date between date '2026-09-01' and date '2026-09-30'
     and r.deleted_at is null
     and cs.deleted_at is null
)
insert into public.route_collection_dates (
  schedule_id, collection_period_id, pickup_on, published, note
)
select r.schedule_id, september.id, r.pickup_on, true,
       'Recovered from the September operational collection run'
  from recorded_runs r
  cross join september
on conflict do nothing;
