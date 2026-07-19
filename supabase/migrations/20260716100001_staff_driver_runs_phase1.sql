-- Phase-one staff operations: assigned driver runs, status-based tracking,
-- QR completion, and customer-visible driver state.

alter table public.shipments
  add column if not exists assigned_driver_id uuid references auth.users(id) on delete set null,
  add column if not exists driver_status text,
  add column if not exists driver_eta timestamptz;

alter table public.payments
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by uuid references auth.users(id) on delete set null,
  add column if not exists finance_notes text;

create index if not exists shipments_assigned_driver_idx
  on public.shipments(assigned_driver_id)
  where deleted_at is null;

create table if not exists public.driver_runs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete restrict,
  run_date date not null default current_date,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  vehicle_label text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(driver_id, run_date)
);

create table if not exists public.driver_run_stops (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.driver_runs(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  stop_order integer not null check (stop_order > 0),
  stop_type text not null check (stop_type in ('collection', 'delivery')),
  status text not null default 'planned' check (status in ('planned', 'en_route', 'arrived', 'completed', 'failed')),
  address text,
  latitude double precision,
  longitude double precision,
  en_route_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, shipment_id),
  unique(run_id, stop_order)
);

create index if not exists driver_runs_driver_date_idx on public.driver_runs(driver_id, run_date);
create index if not exists driver_run_stops_run_order_idx on public.driver_run_stops(run_id, stop_order);
create index if not exists driver_run_stops_shipment_idx on public.driver_run_stops(shipment_id);

alter table public.driver_runs enable row level security;
alter table public.driver_run_stops enable row level security;

drop policy if exists "Admins manage driver runs" on public.driver_runs;
create policy "Admins manage driver runs" on public.driver_runs
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
    )
  );

drop policy if exists "Drivers view own runs" on public.driver_runs;
create policy "Drivers view own runs" on public.driver_runs
  for select to authenticated
  using (driver_id = auth.uid());

drop policy if exists "Drivers update own runs" on public.driver_runs;
create policy "Drivers update own runs" on public.driver_runs
  for update to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

drop policy if exists "Admins manage driver stops" on public.driver_run_stops;
create policy "Admins manage driver stops" on public.driver_run_stops
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
    )
  );

drop policy if exists "Drivers view own stops" on public.driver_run_stops;
create policy "Drivers view own stops" on public.driver_run_stops
  for select to authenticated
  using (
    exists (
      select 1 from public.driver_runs
      where driver_runs.id = driver_run_stops.run_id and driver_runs.driver_id = auth.uid()
    )
  );

drop policy if exists "Drivers update own stops" on public.driver_run_stops;
create policy "Drivers update own stops" on public.driver_run_stops
  for update to authenticated
  using (
    exists (
      select 1 from public.driver_runs
      where driver_runs.id = driver_run_stops.run_id and driver_runs.driver_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.driver_runs
      where driver_runs.id = driver_run_stops.run_id and driver_runs.driver_id = auth.uid()
    )
  );

create or replace function public.transition_driver_stop(
  p_stop_id uuid,
  p_next_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stop public.driver_run_stops%rowtype;
  v_run public.driver_runs%rowtype;
  v_is_admin boolean := false;
  v_now timestamptz := now();
  v_previous text;
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
  ) into v_is_admin;

  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found then raise exception 'Driver stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;

  if not v_is_admin and v_run.driver_id <> auth.uid() then
    raise exception 'This stop is not assigned to you';
  end if;
  if v_run.status <> 'active' then
    raise exception 'Start the run before updating stops';
  end if;
  if p_next_status not in ('en_route', 'arrived') then
    raise exception 'Unsupported driver status';
  end if;
  if (v_stop.status = 'planned' and p_next_status <> 'en_route')
     or (v_stop.status = 'en_route' and p_next_status <> 'arrived')
     or v_stop.status not in ('planned', 'en_route') then
    raise exception 'Invalid transition from % to %', v_stop.status, p_next_status;
  end if;

  v_previous := v_stop.status;
  update public.driver_run_stops set
    status = p_next_status,
    en_route_at = case when p_next_status = 'en_route' then v_now else en_route_at end,
    arrived_at = case when p_next_status = 'arrived' then v_now else arrived_at end,
    updated_at = v_now
  where id = p_stop_id
  returning * into v_stop;

  update public.shipments set
    assigned_driver_id = v_run.driver_id,
    driver_status = p_next_status,
    updated_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'driverUpdate', jsonb_build_object(
        'status', p_next_status,
        'stopType', v_stop.stop_type,
        'updatedAt', v_now,
        'driverId', v_run.driver_id
      )
    )
  where id = v_stop.shipment_id;

  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (
    v_stop.shipment_id,
    case when p_next_status = 'en_route' then 'driver_en_route' else 'driver_arrived' end,
    v_previous,
    p_next_status,
    auth.uid(),
    jsonb_build_object('runId', v_run.id, 'stopId', v_stop.id, 'stopType', v_stop.stop_type)
  );

  return jsonb_build_object(
    'stopId', v_stop.id,
    'shipmentId', v_stop.shipment_id,
    'status', v_stop.status,
    'stopType', v_stop.stop_type
  );
end;
$$;

create or replace function public.process_driver_stop_scan(
  p_stop_id uuid,
  p_qr_token text,
  p_payment_result text default 'not_applicable',
  p_amount_received numeric default 0,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stop public.driver_run_stops%rowtype;
  v_run public.driver_runs%rowtype;
  v_shipment public.shipments%rowtype;
  v_collection_result jsonb;
  v_is_admin boolean := false;
  v_now timestamptz := now();
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
  ) into v_is_admin;

  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found then raise exception 'Driver stop not found'; end if;
  select * into v_run from public.driver_runs where id = v_stop.run_id;
  if not v_is_admin and v_run.driver_id <> auth.uid() then
    raise exception 'This stop is not assigned to you';
  end if;
  if v_run.status <> 'active' then raise exception 'Start the run before scanning'; end if;
  if v_stop.status <> 'arrived' then raise exception 'Mark the stop as arrived before scanning'; end if;

  select * into v_shipment
  from public.shipments
  where id = v_stop.shipment_id and qr_token = p_qr_token
  for update;
  if not found then raise exception 'This QR code does not match the assigned shipment'; end if;

  if v_stop.stop_type = 'collection' then
    v_collection_result := public.process_collection_scan(p_qr_token, p_payment_result, p_amount_received, p_notes);
    update public.shipments set
      assigned_driver_id = v_run.driver_id,
      driver_status = 'collected',
      updated_at = v_now
    where id = v_stop.shipment_id;
  else
    update public.shipments set
      status = 'Delivered',
      driver_status = 'delivered',
      assigned_driver_id = v_run.driver_id,
      updated_at = v_now,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'deliveryConfirmation', jsonb_build_object(
          'notes', p_notes,
          'deliveredAt', v_now,
          'deliveredBy', auth.uid(),
          'method', 'qr_scan'
        )
      )
    where id = v_stop.shipment_id;

    insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
    values (
      v_stop.shipment_id,
      'delivery_confirmed',
      v_shipment.status,
      'Delivered',
      auth.uid(),
      jsonb_build_object('runId', v_run.id, 'stopId', v_stop.id, 'notes', p_notes, 'method', 'qr_scan')
    );
  end if;

  update public.driver_run_stops set
    status = 'completed',
    completed_at = v_now,
    updated_at = v_now
  where id = v_stop.id;

  if not exists (
    select 1 from public.driver_run_stops
    where run_id = v_run.id and status not in ('completed', 'failed')
  ) then
    update public.driver_runs set status = 'completed', completed_at = v_now, updated_at = v_now where id = v_run.id;
  end if;

  return jsonb_build_object(
    'stopId', v_stop.id,
    'shipmentId', v_shipment.id,
    'trackingNumber', v_shipment.tracking_number,
    'customerReference', v_shipment.customer_reference,
    'status', case when v_stop.stop_type = 'collection' then 'Collected' else 'Delivered' end,
    'collectionResult', v_collection_result
  );
end;
$$;

grant execute on function public.transition_driver_stop(uuid, text) to authenticated;
grant execute on function public.process_driver_stop_scan(uuid, text, text, numeric, text) to authenticated;

create or replace function public.set_payment_reconciled(
  p_payment_id uuid,
  p_reconciled boolean,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'finance'))
  ) then
    raise exception 'Finance access required';
  end if;

  update public.payments set
    reconciled_at = case when p_reconciled then now() else null end,
    reconciled_by = case when p_reconciled then auth.uid() else null end,
    finance_notes = coalesce(p_notes, finance_notes)
  where id = p_payment_id
  returning * into v_payment;

  if not found then raise exception 'Payment not found'; end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    case when p_reconciled then 'RECONCILE' else 'UNRECONCILE' end,
    'PAYMENT',
    p_payment_id,
    jsonb_build_object('reconciled', p_reconciled, 'notes', p_notes, 'amount', v_payment.amount)
  );

  return jsonb_build_object(
    'paymentId', v_payment.id,
    'reconciled', v_payment.reconciled_at is not null,
    'reconciledAt', v_payment.reconciled_at
  );
end;
$$;

grant execute on function public.set_payment_reconciled(uuid, boolean, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.driver_runs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.driver_run_stops;
exception when duplicate_object then null;
end $$;
