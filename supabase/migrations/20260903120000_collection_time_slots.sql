-- ---------------------------------------------------------------------------
-- Collection time slots
--
-- Customers pick a two-hour window between 07:00 and 23:00 for the day their
-- goods are collected; dispatch plans the route around those windows and, when
-- it has to move somebody, owes them a WhatsApp or a phone call.
--
-- The whole feature hangs off knowing *when* a collection is, and that was not
-- previously knowable in SQL: `collection_schedules.pickup_date` is free text
-- and holds "September 14th, 2026", "2026-08-04" and "04/08/2026" side by side.
-- Section A gives every schedule a real `date` alongside it so a reminder can
-- be timed 48 hours out.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- A. A real date for every published schedule
-- ---------------------------------------------------------------------------

-- `public.parse_schedule_date(p_text)` already exists (added by
-- 20260810_driver_route_collections.sql) and is depended on by the driver
-- collection-matching functions. It is reused here rather than redefined —
-- redefining it under a different parameter name is what this migration first
-- tried, and Postgres rightly refused with "cannot change name of input
-- parameter". Verified against every format the live schedules actually use:
-- "September 14th, 2026", "2026-08-04", "May 7th, 2026" and
-- "Thursday, 3 September 2026" all parse correctly.
--
-- Known divergence, currently unexercised: it resolves "04/08/2026" through
-- `::date` and so reads it as 8 April, where the apps' `parseCollectionDate`
-- reads day/month and gets 4 August. No published schedule uses that format.
-- Changing the shared function would move the driver matching too, so this is
-- documented rather than "fixed" here.

alter table public.collection_schedules add column if not exists pickup_on date;

create or replace function public.sync_schedule_pickup_on()
returns trigger language plpgsql set search_path = public as $$
begin
  new.pickup_on := public.parse_schedule_date(new.pickup_date);
  return new;
end $$;

drop trigger if exists collection_schedule_pickup_on on public.collection_schedules;
create trigger collection_schedule_pickup_on
  before insert or update of pickup_date on public.collection_schedules
  for each row execute function public.sync_schedule_pickup_on();

update public.collection_schedules
   set pickup_on = public.parse_schedule_date(pickup_date)
 where pickup_on is distinct from public.parse_schedule_date(pickup_date);

create index if not exists collection_schedules_pickup_on_idx on public.collection_schedules(pickup_on);

-- The date a given booking is being collected on: the linked schedule when
-- there is one, otherwise whatever the booking recorded for itself.
create or replace function public.shipment_collection_date(p_schedule_id uuid, p_metadata jsonb)
returns date language sql stable set search_path = public as $$
  select coalesce(
    (select cs.pickup_on from public.collection_schedules cs where cs.id = p_schedule_id),
    public.parse_schedule_date(p_metadata->'collection'->>'date')
  )
$$;

-- ---------------------------------------------------------------------------
-- B. The slot itself
-- ---------------------------------------------------------------------------

create table if not exists public.collection_slots (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  collection_date date,
  route text,

  -- What the customer asked for. `requested_flexible` is "any time is fine",
  -- which is a real answer and not the same as never having replied.
  requested_start time,
  requested_end time,
  requested_flexible boolean not null default false,
  requested_at timestamptz,

  -- What dispatch settled on once the route was sequenced.
  dispatch_start time,
  dispatch_end time,
  dispatch_set_at timestamptz,
  dispatch_set_by uuid references auth.users(id) on delete set null,
  change_reason text,

  -- Proof that somebody actually spoke to the customer about a change.
  customer_informed_at timestamptz,
  customer_informed_by uuid references auth.users(id) on delete set null,
  customer_informed_via text check (customer_informed_via in ('whatsapp', 'call', 'sms', 'in_person')),
  customer_informed_note text,

  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collection_slots_date_idx on public.collection_slots(collection_date);
create index if not exists collection_slots_user_idx on public.collection_slots(user_id);

do $$ begin
  alter table public.collection_slots add constraint collection_slot_requested_window
    check (
      requested_start is null or requested_end is null
      or (requested_start >= time '07:00' and requested_end <= time '23:00' and requested_end > requested_start)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.collection_slots add constraint collection_slot_dispatch_window
    check (
      dispatch_start is null or dispatch_end is null
      or (dispatch_start >= time '07:00' and dispatch_end <= time '23:00' and dispatch_end > dispatch_start)
    );
exception when duplicate_object then null; end $$;

create or replace function public.touch_collection_slot()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists collection_slots_touch on public.collection_slots;
create trigger collection_slots_touch before update on public.collection_slots
  for each row execute function public.touch_collection_slot();

alter table public.collection_slots enable row level security;

-- Customers read their own slot; every write goes through the RPCs below so the
-- 07:00-23:00 rule and the "who changed this" trail cannot be sidestepped.
drop policy if exists "Customers read own collection slot" on public.collection_slots;
create policy "Customers read own collection slot" on public.collection_slots
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Operations manage collection slots" on public.collection_slots;
create policy "Operations manage collection slots" on public.collection_slots
  for all to authenticated
  using (public.is_operations_admin()) with check (public.is_operations_admin());

-- A driver working the stop needs to know when the customer said they would be
-- in, without being able to see anybody else's day.
drop policy if exists "Drivers read slots on their runs" on public.collection_slots;
create policy "Drivers read slots on their runs" on public.collection_slots
  for select to authenticated using (
    exists (
      select 1 from public.driver_run_stops st
      join public.driver_runs r on r.id = st.run_id
      where st.shipment_id = collection_slots.shipment_id and r.driver_id = auth.uid()
    )
  );

-- Make sure a row exists for a booking, filling in the date and route from the
-- booking itself. Returns the row id.
create or replace function public.ensure_collection_slot(p_shipment_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ship public.shipments%rowtype; v_date date; v_route text; v_id uuid;
begin
  select * into v_ship from public.shipments where id = p_shipment_id;
  if not found then raise exception 'Shipment not found'; end if;

  v_date := public.shipment_collection_date(v_ship.collection_schedule_id, v_ship.metadata);
  v_route := coalesce(
    (select cs.route from public.collection_schedules cs where cs.id = v_ship.collection_schedule_id),
    nullif(v_ship.metadata->'collection'->>'route', 'To be assigned'));

  insert into public.collection_slots (shipment_id, user_id, collection_date, route)
  values (p_shipment_id, v_ship.user_id, v_date, v_route)
  on conflict (shipment_id) do update
    set collection_date = coalesce(excluded.collection_date, collection_slots.collection_date),
        route = coalesce(excluded.route, collection_slots.route),
        user_id = coalesce(collection_slots.user_id, excluded.user_id)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.ensure_collection_slot(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. The customer's half
-- ---------------------------------------------------------------------------

/**
 * The customer confirms when they will be in. Passing p_flexible skips the
 * window entirely and tells dispatch any time on the day suits.
 */
create or replace function public.confirm_collection_slot(
  p_shipment_id uuid,
  p_start time default null,
  p_end time default null,
  p_flexible boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ship public.shipments%rowtype; v_slot public.collection_slots%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to confirm your collection time'; end if;

  select * into v_ship from public.shipments where id = p_shipment_id;
  if not found or v_ship.user_id is distinct from auth.uid() then
    raise exception 'That booking is not yours';
  end if;
  if coalesce(v_ship.collection_status, 'Awaiting Collection') = 'Collected' then
    raise exception 'This shipment has already been collected';
  end if;

  if not p_flexible then
    if p_start is null or p_end is null then raise exception 'Choose a collection window'; end if;
    if p_start < time '07:00' or p_end > time '23:00' or p_end <= p_start then
      raise exception 'Collection windows run between 07:00 and 23:00';
    end if;
  end if;

  perform public.ensure_collection_slot(p_shipment_id);

  update public.collection_slots set
    requested_start = case when p_flexible then null else p_start end,
    requested_end = case when p_flexible then null else p_end end,
    requested_flexible = p_flexible,
    requested_at = now()
  where shipment_id = p_shipment_id
  returning * into v_slot;

  return to_jsonb(v_slot);
end $$;

revoke all on function public.confirm_collection_slot(uuid, time, time, boolean) from public, anon;
grant execute on function public.confirm_collection_slot(uuid, time, time, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- D. Dispatch's half
-- ---------------------------------------------------------------------------

/**
 * Dispatch records the window it can actually work to. When that differs from
 * what the customer asked for, the customer is notified in the app straight
 * away — but an in-app notice is not a conversation, so the slot is left
 * flagged until somebody records a WhatsApp or a call against it.
 */
create or replace function public.dispatch_set_collection_slot(
  p_shipment_id uuid,
  p_start time,
  p_end time,
  p_reason text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slot public.collection_slots%rowtype; v_ship public.shipments%rowtype; v_moved boolean;
begin
  if not public.is_operations_admin() then raise exception 'Only dispatch can set collection windows'; end if;
  if p_start is null or p_end is null then raise exception 'A dispatch window needs a start and an end'; end if;
  if p_start < time '07:00' or p_end > time '23:00' or p_end <= p_start then
    raise exception 'Collection windows run between 07:00 and 23:00';
  end if;

  perform public.ensure_collection_slot(p_shipment_id);
  select * into v_slot from public.collection_slots where shipment_id = p_shipment_id;

  -- "Moved" means moved away from something the customer actually asked for.
  -- A customer who said any time is fine, or who never replied, has not been
  -- moved and generates no obligation.
  v_moved := v_slot.requested_at is not null
         and not v_slot.requested_flexible
         and (v_slot.requested_start is distinct from p_start or v_slot.requested_end is distinct from p_end);

  update public.collection_slots set
    dispatch_start = p_start,
    dispatch_end = p_end,
    dispatch_set_at = now(),
    dispatch_set_by = auth.uid(),
    change_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where shipment_id = p_shipment_id
  returning * into v_slot;

  if v_moved then
    select * into v_ship from public.shipments where id = p_shipment_id;
    if v_ship.user_id is not null then
      insert into public.notifications (user_id, title, message, type, related_id)
      values (
        v_ship.user_id,
        'Your collection time has changed',
        coalesce(v_ship.customer_reference, v_ship.tracking_number)
          || ': we now plan to collect between ' || substring(p_start::text from 1 for 5)
          || ' and ' || substring(p_end::text from 1 for 5)
          || coalesce(' on ' || to_char(v_slot.collection_date, 'FMDay FMDD FMMonth'), '')
          || '.' || coalesce(' ' || v_slot.change_reason, ''),
        'shipment',
        p_shipment_id);
    end if;
  end if;

  return to_jsonb(v_slot) || jsonb_build_object('moved', v_moved);
end $$;

revoke all on function public.dispatch_set_collection_slot(uuid, time, time, text) from public, anon;
grant execute on function public.dispatch_set_collection_slot(uuid, time, time, text) to authenticated;

/** Records that somebody actually reached the customer about a change. */
create or replace function public.mark_collection_customer_informed(
  p_shipment_id uuid,
  p_via text,
  p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slot public.collection_slots%rowtype;
begin
  if not public.is_operations_admin() then raise exception 'Only dispatch can close a customer contact'; end if;
  if p_via not in ('whatsapp', 'call', 'sms', 'in_person') then raise exception 'Unknown contact method'; end if;

  update public.collection_slots set
    customer_informed_at = now(),
    customer_informed_by = auth.uid(),
    customer_informed_via = p_via,
    customer_informed_note = nullif(btrim(coalesce(p_note, '')), '')
  where shipment_id = p_shipment_id
  returning * into v_slot;

  if not found then raise exception 'No collection slot for that booking'; end if;
  return to_jsonb(v_slot);
end $$;

revoke all on function public.mark_collection_customer_informed(uuid, text, text) from public, anon;
grant execute on function public.mark_collection_customer_informed(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- E. The 48-hour reminder
-- ---------------------------------------------------------------------------

/**
 * Two days before a collection, offer everybody booked onto it a window.
 *
 * The offer is optional and the wording says so: a customer who ignores it is
 * not chased again and is not treated as a problem, because dispatch plans the
 * round perfectly well without an answer. `reminder_sent_at` makes this
 * once-only per booking, so a retry or a second run on the same day cannot
 * message anyone twice.
 */
create or replace function public.queue_collection_slot_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare v_target date := current_date + 2; v_count integer := 0; v_row record;
begin
  for v_row in
    select s.id, s.user_id, s.customer_reference, s.tracking_number,
           public.shipment_collection_date(s.collection_schedule_id, s.metadata) as collect_on
      from public.shipments s
     where s.deleted_at is null
       and s.user_id is not null
       and coalesce(s.collection_status, 'Awaiting Collection') <> 'Collected'
       and public.shipment_collection_date(s.collection_schedule_id, s.metadata) = v_target
       and coalesce((select (p.notification_preferences->>'shipment')::boolean
                       from public.profiles p where p.id = s.user_id), true)
       and not exists (
         select 1 from public.collection_slots cs
          where cs.shipment_id = s.id and cs.reminder_sent_at is not null)
  loop
    perform public.ensure_collection_slot(v_row.id);

    insert into public.notifications (user_id, title, message, type, related_id)
    values (
      v_row.user_id,
      'Your collection is in two days',
      coalesce(v_row.customer_reference, v_row.tracking_number)
        || ' is being collected on ' || to_char(v_row.collect_on, 'FMDay FMDD FMMonth')
        || '. If a particular time suits you better, pick a two-hour window between 7am and 11pm in the app —'
        || ' otherwise the driver will call ahead on the day.',
      'shipment',
      v_row.id);

    update public.collection_slots set reminder_sent_at = now() where shipment_id = v_row.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

revoke all on function public.queue_collection_slot_reminders() from public, anon, authenticated;
grant execute on function public.queue_collection_slot_reminders() to service_role;

-- 08:00 UTC daily: a Saturday collection asks on Thursday morning, which leaves
-- two working days for dispatch to react to the answers.
do $$ begin create extension if not exists pg_cron; exception when others then null; end $$;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'collection-slot-reminders';
    perform cron.schedule(
      'collection-slot-reminders',
      '0 8 * * *',
      $job$select public.queue_collection_slot_reminders();$job$);
  end if;
exception when others then null;
end $$;
