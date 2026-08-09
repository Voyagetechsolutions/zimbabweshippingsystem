-- Booking → account linking, self-collection depots, and a geocode cache for
-- the driver map.
--
-- NOTE: applied to the live DB via the staff-ops edge function's "setup"
-- action (migration history is out of sync — never `db push`). This file is
-- documentation of the applied DDL, and the source the embed script reads.

-- ---------------------------------------------------------------------------
-- A. Claim guest bookings onto a real account
-- ---------------------------------------------------------------------------
-- Every website booking was created with user_id = null, so signed-in
-- customers saw an empty dashboard. New bookings now carry the user_id, and
-- this function retro-attaches the historical guest bookings (and any future
-- guest booking made before the customer registered) by matching the sender
-- email captured on the shipment.
--
-- The email is read from auth.users for the caller — never accepted as an
-- argument — and must be confirmed, so registering with somebody else's
-- address cannot be used to harvest their shipments.

create or replace function public.claim_guest_bookings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_shipment_ids uuid[];
  v_claimed integer := 0;
begin
  if v_uid is null then
    raise exception 'Sign in to claim your bookings';
  end if;

  select lower(trim(email)), email_confirmed_at
    into v_email, v_confirmed
    from auth.users where id = v_uid;

  -- An unconfirmed address proves nothing about who owns it.
  if v_email is null or v_email = '' or v_confirmed is null then
    return jsonb_build_object('claimed', 0, 'reason', 'email_unconfirmed');
  end if;

  -- Collect first so payments and receipts can be moved in the same pass.
  select coalesce(array_agg(id), '{}') into v_shipment_ids
  from public.shipments
  where user_id is null
    and deleted_at is null
    and lower(trim(coalesce(
      metadata->'sender'->>'email',
      metadata->'senderDetails'->>'email'
    ))) = v_email;

  if coalesce(array_length(v_shipment_ids, 1), 0) = 0 then
    return jsonb_build_object('claimed', 0);
  end if;

  update public.shipments
     set user_id = v_uid, updated_at = now()
   where id = any(v_shipment_ids);
  v_claimed := coalesce(array_length(v_shipment_ids, 1), 0);

  update public.payments
     set user_id = v_uid
   where shipment_id = any(v_shipment_ids) and user_id is null;

  update public.receipts
     set user_id = v_uid
   where shipment_id = any(v_shipment_ids) and user_id is null;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (v_uid, 'CLAIM_GUEST_BOOKINGS', 'SHIPMENT', null,
          jsonb_build_object('email', v_email, 'count', v_claimed));

  return jsonb_build_object('claimed', v_claimed);
end $$;

revoke all on function public.claim_guest_bookings() from public, anon;
grant execute on function public.claim_guest_bookings() to authenticated;

-- ---------------------------------------------------------------------------
-- B. Self-collection depots
-- ---------------------------------------------------------------------------
-- Door-to-door delivery is unchanged and still carries its £25/€25 per-address
-- fee. Self-collection is an additional, free option: the shipment is held at
-- a depot for the receiver to collect.

create table if not exists public.delivery_depots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address_line1 text not null,
  address_line2 text,
  province text,
  country text not null default 'Zimbabwe',
  phone text,
  opening_hours text,
  latitude double precision,
  longitude double precision,
  notes text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_depots_active_idx
  on public.delivery_depots(active, sort_order);

alter table public.delivery_depots enable row level security;

-- Depot addresses are published information: customers must be able to read
-- them while choosing self-collection, including before they sign in.
drop policy if exists "Anyone can read active depots" on public.delivery_depots;
create policy "Anyone can read active depots" on public.delivery_depots
  for select to anon, authenticated
  using (active = true);

drop policy if exists "Admins manage depots" on public.delivery_depots;
create policy "Admins manage depots" on public.delivery_depots
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics'))
    )
  );

-- Bulawayo is the launch collection point. Address and hours are editable from
-- the admin dashboard — this only seeds the row so booking has something to
-- offer on day one.
insert into public.delivery_depots (name, city, address_line1, province, country, opening_hours, sort_order)
select 'Bulawayo Depot', 'Bulawayo', 'Address to be confirmed', 'Bulawayo', 'Zimbabwe',
       'Mon–Fri 09:00–17:00, Sat 09:00–13:00', 1
where not exists (
  select 1 from public.delivery_depots where lower(city) = 'bulawayo'
);

-- Records the delivery choice on a booking the customer app just created.
--
-- `create_customer_booking` is long and load-bearing, and its pricing already
-- charges £25/€25 per selected delivery address and nothing when none are
-- selected — which is exactly right for self-collection. So rather than editing
-- it, this small routine annotates the shipment afterwards with which option was
-- chosen and from which depot. No pricing is involved.
create or replace function public.set_booking_delivery_method(
  p_shipment_id uuid,
  p_method text,
  p_depot_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_depot public.delivery_depots%rowtype;
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Sign in to update a booking'; end if;
  if p_method not in ('door', 'self_collection') then
    raise exception 'Unknown delivery method %', p_method;
  end if;

  -- Only the booking's owner (or staff) may change this.
  select user_id into v_owner from public.shipments where id = p_shipment_id;
  if v_owner is null and not public.is_operations_admin() then
    raise exception 'Booking not found';
  end if;
  if v_owner is not null and v_owner <> v_uid and not public.is_operations_admin() then
    raise exception 'Booking not found';
  end if;

  if p_depot_id is not null then
    select * into v_depot from public.delivery_depots where id = p_depot_id and active;
    if not found then raise exception 'That collection point is not available'; end if;
  end if;

  update public.shipments set
    metadata = jsonb_set(
      jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{recipient,deliveryMethod}', to_jsonb(p_method), true),
      '{recipient,depot}',
      case when p_depot_id is null then 'null'::jsonb else jsonb_build_object(
        'id', v_depot.id, 'name', v_depot.name, 'city', v_depot.city,
        'address', trim(v_depot.address_line1 || coalesce(', ' || nullif(v_depot.address_line2, ''), '')),
        'phone', v_depot.phone, 'openingHours', v_depot.opening_hours) end,
      true),
    updated_at = now()
  where id = p_shipment_id;

  return jsonb_build_object('ok', true, 'method', p_method, 'depotId', p_depot_id);
end $$;

grant execute on function public.set_booking_delivery_method(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- C. Geocode cache for the driver map
-- ---------------------------------------------------------------------------
-- driver_run_stops has latitude/longitude columns that nothing ever populated,
-- so the driver map had no pins to draw. Lookups are cached because the free
-- geocoders (postcodes.io, Nominatim) are rate limited and their usage policy
-- expects results to be reused rather than re-requested.

create table if not exists public.geocode_cache (
  lookup_key text primary key,
  query text not null,
  latitude double precision,
  longitude double precision,
  source text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;

-- Only the geocoding edge function (service role) touches this table; the
-- service role bypasses RLS, so no client-facing policy is granted.
drop policy if exists "Staff read geocode cache" on public.geocode_cache;
create policy "Staff read geocode cache" on public.geocode_cache
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and (is_admin = true or lower(coalesce(role, '')) in ('admin', 'logistics', 'driver', 'dispatcher'))
    )
  );

-- Depot coordinates double as delivery pins on the driver map.
create index if not exists driver_run_stops_missing_coords_idx
  on public.driver_run_stops(run_id)
  where latitude is null or longitude is null;

-- ---------------------------------------------------------------------------
-- D. Fix: admin_update_staff never synchronised is_admin with role
-- ---------------------------------------------------------------------------
-- Promoting somebody to 'admin' set profiles.role = 'admin' but left
-- profiles.is_admin = false, and demoting an admin left is_admin = true. Many
-- RLS policies test `is_admin = true or role in (...)`, so a promotion appeared
-- to work while granting nothing, and a demotion removed nothing.

create or replace function public.admin_update_staff(p_user_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.profiles%rowtype; v_role text;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required'; end if;
  if p_patch ? 'role' then
    v_role := lower(p_patch->>'role');
    if v_role not in ('admin', 'driver', 'finance', 'logistics', 'dispatcher', 'customer') then
      raise exception 'Unknown role %', v_role;
    end if;
  end if;

  update public.profiles set
    full_name = coalesce(p_patch->>'fullName', full_name),
    phone_number = coalesce(p_patch->>'phone', phone_number),
    role = coalesce(v_role, role),
    -- Keep the two representations of "is an admin" in agreement. Only touched
    -- when the role is actually being changed.
    is_admin = case when v_role is null then is_admin else v_role = 'admin' end,
    driver_type = case when p_patch ? 'driverType'
      then nullif(p_patch->>'driverType', '') else driver_type end,
    vehicle_label = case when p_patch ? 'vehicle' then nullif(p_patch->>'vehicle', '') else vehicle_label end,
    on_leave = coalesce((p_patch->>'onLeave')::boolean, on_leave),
    staff_active = coalesce((p_patch->>'active')::boolean, staff_active)
  where id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Staff member not found'; end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'UPDATE_STAFF', 'PROFILE', p_user_id, p_patch);

  return jsonb_build_object(
    'id', v_row.id, 'role', v_row.role, 'isAdmin', v_row.is_admin,
    'active', v_row.staff_active, 'onLeave', v_row.on_leave);
end $$;

grant execute on function public.admin_update_staff(uuid, jsonb) to authenticated;
