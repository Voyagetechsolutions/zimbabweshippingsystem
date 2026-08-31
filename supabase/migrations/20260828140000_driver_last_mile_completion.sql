-- Remaining last-mile operational entities. These extend the canonical
-- driver_runs / driver_run_stops / shipments model rather than duplicating it.

create table if not exists public.service_regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country_code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.depots (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.service_regions(id) on delete set null,
  name text not null,
  address text not null,
  latitude double precision,
  longitude double precision,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.route_zones (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.service_regions(id) on delete cascade,
  name text not null,
  postcodes text[] not null default '{}',
  boundary_geojson jsonb,
  active boolean not null default true,
  unique(region_id, name)
);

create table if not exists public.collection_days (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.service_regions(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  cutoff_time time,
  active boolean not null default true,
  unique(region_id, weekday)
);

alter table public.driver_runs
  add column if not exists depot_id uuid references public.depots(id) on delete set null,
  add column if not exists region_id uuid references public.service_regions(id) on delete set null,
  add column if not exists delay_minutes integer not null default 0,
  add column if not exists completed_at timestamptz;

alter table public.driver_run_stops
  add column if not exists actual_package_count integer,
  add column if not exists quantity_difference_reason text,
  add column if not exists reschedule_option text,
  add column if not exists reschedule_requested_for timestamptz,
  add column if not exists reschedule_note text,
  add column if not exists reschedule_requested_at timestamptz;

alter table public.driver_proofs
  add column if not exists package_id uuid references public.shipment_packages(id) on delete set null,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  title text not null,
  storage_path text,
  status text not null default 'pending' check (status in ('pending','verified','expired','rejected')),
  expires_at date,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_tracking_tokens (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  show_live_map boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.depot_handovers (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.driver_runs(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete restrict,
  depot_id uuid references public.depots(id) on delete set null,
  expected_count integer not null default 0,
  scanned_count integer not null default 0,
  status text not null default 'open' check (status in ('open','reconciling','complete','override_complete')),
  override_reason text,
  arrived_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  unique(route_id)
);

create or replace function public.refresh_driver_handover_counts() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    update public.depot_handovers h set scanned_count=(
      select count(*) from public.shipment_packages p
      join public.driver_run_stops rs on rs.shipment_id=p.shipment_id
      where rs.run_id=h.route_id and rs.stop_type='collection' and p.status='at_depot'
    ) where exists (
      select 1 from public.driver_run_stops rs where rs.run_id=h.route_id and rs.shipment_id=new.shipment_id
    ) and h.status in ('open','reconciling');
  end if;
  return new;
end $$;
drop trigger if exists shipment_packages_handover_count on public.shipment_packages;
create trigger shipment_packages_handover_count after update of status on public.shipment_packages
for each row execute function public.refresh_driver_handover_counts();

create index if not exists driver_documents_owner_idx on public.driver_documents(driver_id, expires_at);
create index if not exists tracking_tokens_expiry_idx on public.customer_tracking_tokens(expires_at) where revoked_at is null;
create index if not exists depot_handovers_route_idx on public.depot_handovers(route_id, status);
create index if not exists driver_stops_reschedule_idx on public.driver_run_stops(run_id, reschedule_status) where reschedule_status is not null;

alter table public.service_regions enable row level security;
alter table public.depots enable row level security;
alter table public.route_zones enable row level security;
alter table public.collection_days enable row level security;
alter table public.driver_documents enable row level security;
alter table public.customer_tracking_tokens enable row level security;
alter table public.depot_handovers enable row level security;

drop policy if exists "Staff read active service regions" on public.service_regions;
create policy "Staff read active service regions" on public.service_regions for select to authenticated using (active or public.is_operations_admin());
drop policy if exists "Operations manage service regions" on public.service_regions;
create policy "Operations manage service regions" on public.service_regions for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());
drop policy if exists "Staff read active depots" on public.depots;
create policy "Staff read active depots" on public.depots for select to authenticated using (active or public.is_operations_admin());
drop policy if exists "Operations manage depots" on public.depots;
create policy "Operations manage depots" on public.depots for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());
drop policy if exists "Staff read active route zones" on public.route_zones;
create policy "Staff read active route zones" on public.route_zones for select to authenticated using (active or public.is_operations_admin());
drop policy if exists "Operations manage route zones" on public.route_zones;
create policy "Operations manage route zones" on public.route_zones for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());
drop policy if exists "Staff read active collection days" on public.collection_days;
create policy "Staff read active collection days" on public.collection_days for select to authenticated using (active or public.is_operations_admin());
drop policy if exists "Operations manage collection days" on public.collection_days;
create policy "Operations manage collection days" on public.collection_days for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());
drop policy if exists "Driver reads own documents" on public.driver_documents;
create policy "Driver reads own documents" on public.driver_documents for select to authenticated using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Operations manage driver documents" on public.driver_documents;
create policy "Operations manage driver documents" on public.driver_documents for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());
drop policy if exists "Assigned driver reads handover" on public.depot_handovers;
create policy "Assigned driver reads handover" on public.depot_handovers for select to authenticated using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Warehouse manages handover" on public.depot_handovers;
create policy "Warehouse manages handover" on public.depot_handovers for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());

create or replace function public.search_driver_packages(p_query text, p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_query text := '%' || lower(trim(coalesce(p_query,''))) || '%'; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_query,''))) < 2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(row_data order by (row_data->>'packageCode')), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'packageId',p.id,'packageCode',p.package_code,'status',p.status,'bay',p.bay,'shelf',p.shelf,
      'shipmentId',s.id,'reference',coalesce(s.customer_reference,s.tracking_number),
      'customerName',coalesce(nullif(s.metadata->'sender'->>'name',''),nullif(concat_ws(' ',s.metadata->'sender'->>'firstName',s.metadata->'sender'->>'lastName'),''),nullif(s.metadata->'recipient'->>'name',''),'Customer'),
      'address',coalesce(nullif(concat_ws(', ',s.metadata->'sender'->>'address',s.metadata->'sender'->>'city',s.metadata->'sender'->>'postcode'),''),s.destination)
    ) row_data
    from public.shipment_packages p
    join public.shipments s on s.id=p.shipment_id
    where exists (
      select 1 from public.driver_run_stops rs join public.driver_runs r on r.id=rs.run_id
      where rs.shipment_id=s.id and (r.driver_id=auth.uid() or public.is_operations_admin())
    ) and (
      lower(p.package_code) like v_query or lower(coalesce(s.customer_reference,'')) like v_query
      or lower(coalesce(s.tracking_number,'')) like v_query or lower(coalesce(s.metadata::text,'')) like v_query
      or lower(coalesce(s.destination,'')) like v_query
    ) limit least(greatest(coalesce(p_limit,20),1),50)
  ) matches;
  return v_result;
end $$;

create or replace function public.request_driver_reschedule(
  p_stop_id uuid, p_option text, p_requested_for timestamptz default null, p_note text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype;
begin
  if p_option not in ('later_today','different_date','return_to_depot','dispatch_decision') then raise exception 'Invalid reschedule option'; end if;
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update;
  if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id;
  if v_run.driver_id<>auth.uid() and not public.is_operations_admin() then raise exception 'Not assigned to this stop'; end if;
  if v_stop.status in ('completed','failed') then raise exception 'Closed stops cannot be rescheduled'; end if;
  update public.driver_run_stops set reschedule_status='requested',reschedule_option=p_option,
    reschedule_requested_for=p_requested_for,reschedule_note=nullif(trim(coalesce(p_note,'')),''),
    reschedule_requested_at=now(),updated_at=now() where id=p_stop_id;
  insert into public.driver_route_events(event_type,driver_id,route_id,stop_id,shipment_id,metadata)
    values('driver_reschedule_requested',v_run.driver_id,v_run.id,v_stop.id,v_stop.shipment_id,jsonb_build_object('option',p_option,'requestedFor',p_requested_for,'note',p_note));
  insert into public.driver_notifications(driver_id,category,title,body,route_id,stop_id)
    values(v_run.driver_id,'customer_update','Reschedule request sent','Dispatch will review this stop and update your route.',v_run.id,v_stop.id);
  return jsonb_build_object('status','requested','option',p_option);
end $$;

create or replace function public.update_driver_operational_location(
  p_latitude double precision, p_longitude double precision, p_accuracy_m double precision default null,
  p_speed_mps double precision default null, p_route_id uuid default null
) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then return false; end if;
  update public.driver_presence set current_latitude=p_latitude,current_longitude=p_longitude,
    location_accuracy_m=p_accuracy_m,speed_mps=case when p_speed_mps is null or p_speed_mps<0 then null else p_speed_mps end,
    last_location_update=now(),last_seen=now(),active_route_id=coalesce(p_route_id,active_route_id),updated_at=now()
    where driver_id=auth.uid() and status<>'offline';
  return found;
end $$;

create or replace function public.start_driver_return_to_depot(p_route_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run public.driver_runs%rowtype; v_open integer; v_expected integer; v_handover public.depot_handovers%rowtype;
begin
  select * into v_run from public.driver_runs where id=p_route_id for update;
  if not found then raise exception 'Route not found'; end if;
  if v_run.driver_id<>auth.uid() and not public.is_operations_admin() then raise exception 'This route is not assigned to you'; end if;
  select count(*) into v_open from public.driver_run_stops where run_id=p_route_id and status not in ('completed','failed');
  if v_open>0 then raise exception 'Complete or report every stop before returning to depot'; end if;
  select coalesce(count(p.id),0) into v_expected from public.driver_run_stops rs join public.shipment_packages p on p.shipment_id=rs.shipment_id where rs.run_id=p_route_id and rs.stop_type='collection';
  if v_expected=0 then select coalesce(sum(package_count),0) into v_expected from public.driver_run_stops where run_id=p_route_id and stop_type='collection' and status='completed'; end if;
  insert into public.depot_handovers(route_id,driver_id,depot_id,expected_count,status)
    values(p_route_id,v_run.driver_id,v_run.depot_id,v_expected,'open')
    on conflict(route_id) do update set expected_count=excluded.expected_count
    returning * into v_handover;
  update public.driver_runs set returning_to_depot_at=coalesce(returning_to_depot_at,now()),updated_at=now() where id=p_route_id;
  insert into public.driver_presence(driver_id,status,active_route_id,last_seen,updated_at) values(v_run.driver_id,'returning_to_depot',p_route_id,now(),now())
    on conflict(driver_id) do update set status='returning_to_depot',active_route_id=p_route_id,last_seen=now(),updated_at=now();
  insert into public.driver_route_events(event_type,driver_id,route_id,metadata) values('driver_return_to_depot_started',v_run.driver_id,p_route_id,jsonb_build_object('expectedPackages',v_expected));
  return jsonb_build_object('handoverId',v_handover.id,'status',v_handover.status,'expectedCount',v_expected);
end $$;

create or replace function public.arrive_driver_depot(p_route_id uuid, p_latitude double precision default null, p_longitude double precision default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run public.driver_runs%rowtype;
begin
  select * into v_run from public.driver_runs where id=p_route_id for update;
  if not found or (v_run.driver_id<>auth.uid() and not public.is_operations_admin()) then raise exception 'Route not available'; end if;
  update public.driver_runs set depot_arrived_at=coalesce(depot_arrived_at,now()),updated_at=now() where id=p_route_id;
  update public.depot_handovers set arrived_at=coalesce(arrived_at,now()),status='reconciling' where route_id=p_route_id;
  update public.driver_presence set status='at_stop',last_seen=now(),current_latitude=coalesce(p_latitude,current_latitude),current_longitude=coalesce(p_longitude,current_longitude),updated_at=now() where driver_id=v_run.driver_id;
  insert into public.driver_route_events(event_type,driver_id,route_id,latitude,longitude) values('driver_depot_arrived',v_run.driver_id,p_route_id,p_latitude,p_longitude);
  return jsonb_build_object('status','reconciling');
end $$;

create or replace function public.complete_driver_depot_handover(p_route_id uuid, p_override_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run public.driver_runs%rowtype; v_handover public.depot_handovers%rowtype; v_scanned integer; v_missing jsonb; v_override boolean:=false;
begin
  select * into v_run from public.driver_runs where id=p_route_id for update;
  if not found or (v_run.driver_id<>auth.uid() and not public.is_operations_admin()) then raise exception 'Route not available'; end if;
  select * into v_handover from public.depot_handovers where route_id=p_route_id for update;
  if not found then raise exception 'Start return to depot first'; end if;
  select count(*) filter(where p.status='at_depot'),coalesce(jsonb_agg(p.package_code) filter(where p.status<>'at_depot'),'[]'::jsonb)
    into v_scanned,v_missing from public.shipment_packages p join public.driver_run_stops rs on rs.shipment_id=p.shipment_id
    where rs.run_id=p_route_id and rs.stop_type='collection';
  if v_scanned<>v_handover.expected_count then
    if not public.is_operations_admin() or nullif(trim(coalesce(p_override_reason,'')),'') is null then
      raise exception 'Package reconciliation incomplete: % of % received',v_scanned,v_handover.expected_count;
    end if;
    v_override:=true;
  end if;
  update public.depot_handovers set scanned_count=v_scanned,status=case when v_override then 'override_complete' else 'complete' end,
    override_reason=nullif(trim(coalesce(p_override_reason,'')),''),completed_at=now(),completed_by=auth.uid() where id=v_handover.id;
  update public.driver_runs set handover_completed_at=now(),status='completed',completed_at=now(),updated_at=now() where id=p_route_id;
  update public.driver_presence set status='route_complete',active_route_id=null,current_stop_id=null,last_seen=now(),updated_at=now() where driver_id=v_run.driver_id;
  insert into public.driver_route_events(event_type,driver_id,route_id,metadata) values('depot_handover_completed',v_run.driver_id,p_route_id,jsonb_build_object('expected',v_handover.expected_count,'scanned',v_scanned,'override',v_override,'missing',v_missing));
  return jsonb_build_object('status',case when v_override then 'override_complete' else 'complete' end,'expectedCount',v_handover.expected_count,'scannedCount',v_scanned,'missing',v_missing);
end $$;

grant execute on function public.search_driver_packages(text,integer) to authenticated;
grant execute on function public.request_driver_reschedule(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.update_driver_operational_location(double precision,double precision,double precision,double precision,uuid) to authenticated;
grant execute on function public.start_driver_return_to_depot(uuid) to authenticated;
grant execute on function public.arrive_driver_depot(uuid,double precision,double precision) to authenticated;
grant execute on function public.complete_driver_depot_handover(uuid,text) to authenticated;

do $$ begin alter publication supabase_realtime add table public.depot_handovers; exception when duplicate_object then null; end $$;
