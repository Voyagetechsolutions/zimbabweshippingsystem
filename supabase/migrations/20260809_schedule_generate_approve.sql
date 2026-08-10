-- Draft → approve workflow for collection schedules, and an AI invoice-scan
-- audit trail.
--
-- NOTE: applied to the live DB via the staff-ops edge function's "setup"
-- action (migration history is out of sync — never `db push`).

-- ---------------------------------------------------------------------------
-- A. Approval state on collection_schedules
-- ---------------------------------------------------------------------------
-- The website, both apps and the WhatsApp/AI bot all read collection_schedules
-- directly, so anything written there is instantly public. Generating a proposed
-- schedule therefore needs somewhere to sit that is NOT yet public.
--
-- `approved` defaults to TRUE so every schedule that already exists stays
-- published exactly as it is — this migration must not blank the live site.
-- Only rows created by generate_collection_schedules() start unapproved.

alter table public.collection_schedules
  add column if not exists approved boolean not null default true,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists generated_at timestamptz,
  add column if not exists generated_from_id uuid;

create index if not exists collection_schedules_approved_idx
  on public.collection_schedules(approved);

-- ---------------------------------------------------------------------------
-- B. Generate the next round of collection dates
-- ---------------------------------------------------------------------------
-- Collections run on a monthly cadence per route. For each route that currently
-- has a published date, this proposes the next one by stepping the most recent
-- date forward by `p_interval_days` (default 28, i.e. a four-week cycle), keeping
-- the route's areas and country.
--
-- Proposals are inserted with approved = false, so nothing reaches customers
-- until an admin approves. Re-running is safe: a route that already has an
-- unapproved draft is skipped rather than duplicated.

create or replace function public.generate_collection_schedules(
  p_interval_days integer default 28,
  p_from_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route record;
  v_created integer := 0;
  v_skipped integer := 0;
  v_base date;
  v_next date;
  v_drafts jsonb := '[]'::jsonb;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  if p_interval_days < 1 or p_interval_days > 120 then
    raise exception 'Interval must be between 1 and 120 days';
  end if;

  for v_route in
    -- Latest approved row per route is the anchor for the next date.
    select distinct on (route)
      id, route, areas, country, pickup_date
    from public.collection_schedules
    where approved = true
    order by route, coalesce(generated_at, created_at) desc
  loop
    -- Skip routes that already have a pending draft awaiting approval.
    if exists (
      select 1 from public.collection_schedules
      where route = v_route.route and approved = false
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- pickup_date is free text ("14 September 2026", "Not set", …), so parse
    -- defensively and fall back to today when it cannot be read.
    begin
      v_base := coalesce(p_from_date, v_route.pickup_date::date);
    exception when others then
      v_base := coalesce(p_from_date, current_date);
    end;

    v_next := v_base + p_interval_days;
    -- Never propose a date in the past.
    while v_next < current_date loop
      v_next := v_next + p_interval_days;
    end loop;

    insert into public.collection_schedules
      (route, areas, country, pickup_date, approved, generated_at, generated_from_id)
    values
      (v_route.route, v_route.areas, v_route.country,
       to_char(v_next, 'DD FMMonth YYYY'), false, now(), v_route.id);

    v_created := v_created + 1;
    v_drafts := v_drafts || jsonb_build_array(jsonb_build_object(
      'route', v_route.route, 'pickupDate', to_char(v_next, 'DD FMMonth YYYY')));
  end loop;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'GENERATE_SCHEDULES', 'COLLECTION_SCHEDULE', null,
          jsonb_build_object('created', v_created, 'skipped', v_skipped, 'intervalDays', p_interval_days));

  return jsonb_build_object('created', v_created, 'skipped', v_skipped, 'drafts', v_drafts);
end $$;

grant execute on function public.generate_collection_schedules(integer, date) to authenticated;

-- ---------------------------------------------------------------------------
-- C. Approve (publish) or discard drafts
-- ---------------------------------------------------------------------------
-- Approving is the moment a date becomes visible on the website, in both apps
-- and to the AI bot, because they all read this table.

create or replace function public.approve_collection_schedules(p_ids uuid[] default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;

  with promoted as (
    update public.collection_schedules
       set approved = true, approved_at = now(), approved_by = auth.uid(), updated_at = now()
     where approved = false
       and (p_ids is null or id = any(p_ids))
    returning id, route, pickup_date, generated_from_id
  ),
  -- A newly approved date supersedes the row it was generated from, so the old
  -- one is removed. Without this the site would list two dates per route.
  superseded as (
    delete from public.collection_schedules
     where id in (select generated_from_id from promoted where generated_from_id is not null)
    returning id
  )
  select count(*) into v_count from promoted;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'APPROVE_SCHEDULES', 'COLLECTION_SCHEDULE', null,
          jsonb_build_object('approved', v_count));

  return jsonb_build_object('approved', v_count);
end $$;

grant execute on function public.approve_collection_schedules(uuid[]) to authenticated;

create or replace function public.discard_collection_schedule_drafts(p_ids uuid[] default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  with removed as (
    delete from public.collection_schedules
     where approved = false and (p_ids is null or id = any(p_ids))
    returning id
  )
  select count(*) into v_count from removed;
  return jsonb_build_object('discarded', v_count);
end $$;

grant execute on function public.discard_collection_schedule_drafts(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- D. Hide unapproved drafts from everything customer-facing
-- ---------------------------------------------------------------------------
-- Customers and the bot read this table with the anon/authenticated roles. A
-- draft must not appear until approved, so the read policy is narrowed while
-- admins keep full visibility.

alter table public.collection_schedules enable row level security;

do $$
declare v_policy record;
begin
  for v_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'collection_schedules'
      and cmd in ('SELECT', 'ALL')
      and coalesce(btrim(qual), '') in ('true', '(true)')
  loop
    execute format('drop policy if exists %I on public.collection_schedules', v_policy.policyname);
  end loop;
end $$;

drop policy if exists "Anyone reads approved schedules" on public.collection_schedules;
create policy "Anyone reads approved schedules" on public.collection_schedules
  for select to anon, authenticated
  using (approved = true);

drop policy if exists "Admins read all schedules" on public.collection_schedules;
create policy "Admins read all schedules" on public.collection_schedules
  for select to authenticated
  using (public.is_operations_admin());

drop policy if exists "Admins write schedules" on public.collection_schedules;
create policy "Admins write schedules" on public.collection_schedules
  for all to authenticated
  using (public.is_operations_admin())
  with check (public.is_operations_admin());

-- ---------------------------------------------------------------------------
-- E. AI invoice-scan audit trail
-- ---------------------------------------------------------------------------
-- Delivery notes can be prefilled by scanning an invoice. What the model read is
-- recorded so a mis-keyed delivery note can be traced back to its source.

create table if not exists public.invoice_scans (
  id uuid primary key default gen_random_uuid(),
  scanned_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  shipment_id uuid references public.shipments(id) on delete set null,
  storage_path text,
  extracted jsonb not null default '{}'::jsonb,
  model text,
  confidence text,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.invoice_scans enable row level security;

-- is_operations_admin() rather than is_staff_member(): the latter is defined in
-- 20260808_restrict_public_shipment_reads.sql, which is applied separately and
-- deliberately later, so depending on it here would make the order matter.
drop policy if exists "Staff manage invoice scans" on public.invoice_scans;
create policy "Staff manage invoice scans" on public.invoice_scans
  for all to authenticated
  using (public.is_operations_admin())
  with check (public.is_operations_admin());
