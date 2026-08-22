-- Shared driver collection operations.
--
-- The route is visible to every clocked-in driver, but a shipment can only be
-- worked by one driver at a time. Claims bridge that shared route to the
-- existing driver_run_stops proof/invoice/handover workflow.

create table if not exists public.route_collection_claims (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  schedule_id uuid references public.collection_schedules(id) on delete set null,
  driver_id uuid references auth.users(id) on delete set null,
  stop_id uuid references public.driver_run_stops(id) on delete set null,
  claim_date date not null default current_date,
  status text not null default 'available'
    check (status in ('available', 'claimed', 'en_route', 'arrived', 'completed', 'failed', 'released')),
  claimed_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz,
  issue_reason text,
  issue_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists route_collection_claims_date_status_idx
  on public.route_collection_claims(claim_date, status);
create index if not exists route_collection_claims_driver_idx
  on public.route_collection_claims(driver_id, claim_date);

alter table public.route_collection_claims enable row level security;

drop policy if exists "Operations staff view route claims" on public.route_collection_claims;
create policy "Operations staff view route claims" on public.route_collection_claims
  for select to authenticated using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'driver', 'dispatcher', 'logistics', 'finance'))
    )
  );

drop policy if exists "Admins manage route claims" on public.route_collection_claims;
create policy "Admins manage route claims" on public.route_collection_claims
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'dispatcher', 'logistics'))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'dispatcher', 'logistics'))));

create or replace function public.claim_route_collection(p_shipment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ship public.shipments%rowtype;
  v_claim public.route_collection_claims%rowtype;
  v_run public.driver_runs%rowtype;
  v_stop public.driver_run_stops%rowtype;
  v_order integer;
  v_route text;
  v_address text;
  v_name text;
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if not exists (
    select 1 from public.profiles p where p.id = v_uid
      and coalesce(p.staff_active, true)
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('driver', 'admin', 'dispatcher', 'logistics'))
  ) then raise exception 'Active driver access required'; end if;

  if not exists (
    select 1 from public.driver_attendance a
    where a.driver_id = v_uid and a.work_date = current_date and a.clocked_out_at is null
  ) and not exists (
    select 1 from public.profiles p where p.id = v_uid
      and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'dispatcher', 'logistics'))
  ) then raise exception 'Clock in before claiming a collection'; end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then raise exception 'Shipment not found'; end if;
  if coalesce(v_ship.collection_status, 'Awaiting Collection') = 'Collected' then
    raise exception 'This shipment has already been collected';
  end if;
  if not (
    v_ship.collection_schedule_id in (select schedule_id from public.active_collection_routes(current_date))
    or upper(coalesce(v_ship.metadata->'collection'->>'route', '')) in (select upper(route) from public.active_collection_routes(current_date))
    or upper(coalesce(v_ship.metadata->'collection'->>'route', '')) || ' ROUTE' in (select upper(route) from public.active_collection_routes(current_date))
    or upper(coalesce(v_ship.metadata->'collection'->>'route', '')) in (select upper(replace(route, ' ROUTE', '')) from public.active_collection_routes(current_date))
  ) then raise exception 'This shipment is not on today''s active collection route'; end if;

  select * into v_claim from public.route_collection_claims where shipment_id = p_shipment_id for update;
  if found and v_claim.status in ('claimed', 'en_route', 'arrived') and v_claim.driver_id <> v_uid then
    select coalesce(p.full_name, 'Another driver') into v_name from public.profiles p where p.id = v_claim.driver_id;
    raise exception '% is already working this collection', coalesce(v_name, 'Another driver');
  end if;
  if found and v_claim.driver_id = v_uid and v_claim.status in ('claimed', 'en_route', 'arrived') and v_claim.stop_id is not null then
    return jsonb_build_object('claimId', v_claim.id, 'stopId', v_claim.stop_id, 'shipmentId', p_shipment_id, 'status', v_claim.status);
  end if;

  v_route := coalesce(v_ship.metadata->'collection'->>'route', 'Collection route');
  v_address := concat_ws(', ', nullif(v_ship.metadata->'sender'->>'address', ''), nullif(v_ship.metadata->'sender'->>'city', ''),
    nullif(coalesce(v_ship.metadata->'sender'->>'postcode', v_ship.metadata->'sender'->>'postalCode'), ''));

  insert into public.driver_runs(driver_id, run_date, status, run_type, route_name, started_at)
  values (v_uid, current_date, 'active', 'pickup', v_route, now())
  on conflict(driver_id, run_date) do update set
    status = 'active', run_type = 'pickup', route_name = coalesce(public.driver_runs.route_name, excluded.route_name),
    started_at = coalesce(public.driver_runs.started_at, now()), completed_at = null, updated_at = now()
  returning * into v_run;

  select * into v_stop from public.driver_run_stops
   where run_id = v_run.id and shipment_id = p_shipment_id limit 1 for update;
  if found then
    update public.driver_run_stops set status = 'planned', failure_reason = null, failure_note = null,
      failed_at = null, en_route_at = null, arrived_at = null, completed_at = null, updated_at = now()
    where id = v_stop.id returning * into v_stop;
  else
    select coalesce(max(stop_order), 0) + 1 into v_order from public.driver_run_stops where run_id = v_run.id;
    insert into public.driver_run_stops(run_id, shipment_id, stop_order, stop_type, status, address,
      latitude, longitude)
    values (v_run.id, p_shipment_id, v_order, 'collection', 'planned', v_address,
      v_ship.pickup_latitude, v_ship.pickup_longitude)
    returning * into v_stop;
  end if;

  insert into public.route_collection_claims(shipment_id, schedule_id, driver_id, stop_id, claim_date, status, claimed_at, updated_at)
  values (p_shipment_id, v_ship.collection_schedule_id, v_uid, v_stop.id, current_date, 'claimed', now(), now())
  on conflict(shipment_id) do update set schedule_id = excluded.schedule_id, driver_id = excluded.driver_id,
    stop_id = excluded.stop_id, claim_date = excluded.claim_date, status = 'claimed', claimed_at = now(),
    en_route_at = null, arrived_at = null, completed_at = null, released_at = null,
    issue_reason = null, issue_note = null, updated_at = now()
  returning * into v_claim;

  update public.shipments set assigned_driver_id = v_uid, driver_status = 'claimed', updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('driverUpdate', jsonb_build_object(
      'status', 'claimed', 'driverId', v_uid, 'stopId', v_stop.id, 'updatedAt', now()))
  where id = p_shipment_id;

  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (p_shipment_id, 'collection_claimed', v_ship.driver_status, 'claimed', v_uid,
    jsonb_build_object('claimId', v_claim.id, 'runId', v_run.id, 'stopId', v_stop.id));

  return jsonb_build_object('claimId', v_claim.id, 'stopId', v_stop.id, 'shipmentId', p_shipment_id, 'status', 'claimed');
end;
$$;

create or replace function public.release_route_collection(p_shipment_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_claim public.route_collection_claims%rowtype;
begin
  select * into v_claim from public.route_collection_claims where shipment_id = p_shipment_id for update;
  if not found then raise exception 'Collection claim not found'; end if;
  if v_claim.driver_id <> auth.uid() and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'dispatcher', 'logistics'))
  ) then raise exception 'Only the assigned driver or dispatch can release this collection'; end if;
  if v_claim.status not in ('claimed', 'en_route') then raise exception 'This collection can no longer be released'; end if;

  update public.route_collection_claims set status = 'released', released_at = now(), issue_reason = p_reason, updated_at = now()
    where id = v_claim.id;
  update public.driver_run_stops set status = 'failed', failure_reason = 'released', failure_note = p_reason,
    failed_at = now(), updated_at = now() where id = v_claim.stop_id;
  update public.shipments set assigned_driver_id = null, driver_status = 'available', updated_at = now() where id = p_shipment_id;
  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
    values (p_shipment_id, 'collection_released', v_claim.status, 'released', auth.uid(), jsonb_build_object('reason', p_reason));
  return jsonb_build_object('shipmentId', p_shipment_id, 'status', 'released');
end $$;

create or replace function public.sync_route_collection_claim()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if new.stop_type <> 'collection' then return new; end if;
  v_status := case new.status when 'planned' then 'claimed' else new.status end;
  update public.route_collection_claims set status = v_status,
    en_route_at = case when v_status = 'en_route' then coalesce(en_route_at, now()) else en_route_at end,
    arrived_at = case when v_status = 'arrived' then coalesce(arrived_at, now()) else arrived_at end,
    completed_at = case when v_status = 'completed' then coalesce(completed_at, now()) else completed_at end,
    issue_reason = case when v_status = 'failed' then new.failure_reason else issue_reason end,
    issue_note = case when v_status = 'failed' then new.failure_note else issue_note end,
    updated_at = now()
  where stop_id = new.id and status <> 'released';
  return new;
end $$;

drop trigger if exists sync_route_collection_claim_after_stop on public.driver_run_stops;
create trigger sync_route_collection_claim_after_stop after update of status on public.driver_run_stops
for each row execute function public.sync_route_collection_claim();

grant execute on function public.claim_route_collection(uuid) to authenticated;
grant execute on function public.release_route_collection(uuid, text) to authenticated;

-- Extend the shared route payload with the claim owner and lifecycle. The app
-- can now distinguish available work, the current driver's work, and work
-- already being handled by a colleague.
create or replace function public.driver_route_collections(p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_day date := coalesce(p_date,current_date); v_routes jsonb; v_stops jsonb;
begin
  if v_uid is null then raise exception 'Sign in to view collections'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_uid and
    (p.is_admin=true or lower(coalesce(p.role,'')) in ('driver','dispatcher','logistics','admin','finance')))
  then raise exception 'Driver or operations access required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('scheduleId',r.schedule_id,'route',r.route,
    'country',r.country,'pickupDate',r.pickup_date)),'[]'::jsonb) into v_routes
  from public.active_collection_routes(v_day) r;

  select coalesce(jsonb_agg(x order by
    case x->>'claimStatus' when 'arrived' then 0 when 'en_route' then 1 when 'claimed' then 2 else 3 end,
    x->>'customerName'),'[]'::jsonb) into v_stops
  from (
    select jsonb_build_object(
      'shipmentId',s.id,'trackingNumber',s.tracking_number,'customerReference',s.customer_reference,
      'customerName',trim(coalesce(s.metadata->'sender'->>'firstName','')||' '||coalesce(s.metadata->'sender'->>'lastName','')),
      'phone',s.metadata->'sender'->>'phone','address',s.metadata->'sender'->>'address',
      'city',coalesce(s.metadata->'sender'->>'city',''),
      'postcode',coalesce(s.metadata->'sender'->>'postcode',s.metadata->'sender'->>'postalCode',''),
      'route',s.metadata->'collection'->>'route','goodsDescription',left(coalesce(s.goods_description,''),400),
      'collectionStatus',s.collection_status,'latitude',coalesce(st.latitude,s.pickup_latitude),
      'longitude',coalesce(st.longitude,s.pickup_longitude),'stopId',coalesce(c.stop_id,st.id),
      'claimId',c.id,'claimStatus',coalesce(c.status,'available'),'claimedBy',c.driver_id,
      'claimedByName',p.full_name,'claimedAt',c.claimed_at
    ) x
    from public.shipments s
    left join public.route_collection_claims c on c.shipment_id=s.id
    left join public.driver_run_stops st on st.id=c.stop_id
    left join public.profiles p on p.id=c.driver_id
    where s.deleted_at is null
      and (s.collection_schedule_id in (select schedule_id from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route','')) in (select upper(route) from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route',''))||' ROUTE' in (select upper(route) from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route','')) in (select upper(replace(route,' ROUTE','')) from public.active_collection_routes(v_day)))
  ) q;
  return jsonb_build_object('date',v_day,'routes',v_routes,'collections',v_stops);
end $$;
grant execute on function public.driver_route_collections(date) to authenticated;

-- Dispatch messages: recipient_id is used for direct messages; a null recipient
-- with audience_role='driver' is a route-wide announcement.
create table if not exists public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  recipient_id uuid references auth.users(id) on delete cascade,
  audience_role text not null default 'driver' check (audience_role in ('driver', 'dispatch')),
  shipment_id uuid references public.shipments(id) on delete set null,
  subject text,
  body text not null check (char_length(body) between 1 and 2000),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_messages_recipient_created_idx on public.staff_messages(recipient_id, created_at desc);
alter table public.staff_messages enable row level security;

drop policy if exists "Staff read relevant messages" on public.staff_messages;
create policy "Staff read relevant messages" on public.staff_messages for select to authenticated using (
  sender_id = auth.uid() or recipient_id = auth.uid()
  or (recipient_id is null and audience_role = 'driver' and exists (select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,''))='driver'))
  or exists (select 1 from public.profiles p where p.id=auth.uid() and (p.is_admin=true or lower(coalesce(p.role,'')) in ('admin','dispatcher','logistics')))
);
drop policy if exists "Staff send messages" on public.staff_messages;
create policy "Staff send messages" on public.staff_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.profiles p where p.id=auth.uid() and (p.is_admin=true or lower(coalesce(p.role,'')) in ('admin','driver','dispatcher','logistics')))
);
drop policy if exists "Recipients mark messages read" on public.staff_messages;
create policy "Recipients mark messages read" on public.staff_messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.driver_performance_summary(p_driver_id uuid default null, p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_driver uuid := coalesce(p_driver_id, auth.uid()); v_result jsonb;
begin
  if v_driver <> auth.uid() and not exists (
    select 1 from public.profiles p where p.id=auth.uid() and (p.is_admin=true or lower(coalesce(p.role,'')) in ('admin','dispatcher','logistics'))
  ) then raise exception 'Performance access denied'; end if;
  select jsonb_build_object(
    'periodDays', greatest(1, least(coalesce(p_days,30),365)),
    'claimed', count(*) filter (where c.claimed_at is not null),
    'completed', count(*) filter (where c.status='completed'),
    'issues', count(*) filter (where c.status='failed'),
    'active', count(*) filter (where c.status in ('claimed','en_route','arrived')),
    'successRate', case when count(*) filter (where c.status in ('completed','failed')) = 0 then 0 else
      round(100.0 * count(*) filter (where c.status='completed') / count(*) filter (where c.status in ('completed','failed'))) end,
    'averageMinutes', coalesce(round(avg(extract(epoch from (c.completed_at-c.claimed_at))/60) filter (where c.completed_at is not null)),0),
    'daysWorked', (select count(*) from public.driver_attendance a where a.driver_id=v_driver and a.work_date >= current_date-greatest(1,least(coalesce(p_days,30),365)))
  ) into v_result
  from public.route_collection_claims c
  where c.driver_id=v_driver and c.claim_date >= current_date-greatest(1,least(coalesce(p_days,30),365));
  return v_result;
end $$;
grant execute on function public.driver_performance_summary(uuid, integer) to authenticated;

do $$ begin alter publication supabase_realtime add table public.route_collection_claims; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff_messages; exception when duplicate_object then null; end $$;
