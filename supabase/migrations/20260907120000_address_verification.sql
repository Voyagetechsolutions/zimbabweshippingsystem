-- Verified addresses, so a driver is never sent to a guess.
--
-- Geocoding cannot reach every booking. Roughly 40% of live shipments carry a
-- postcode, and Irish addresses carry no Eircode at all — "Irish Bar Church
-- Street Tullow, Cork" is a real pickup. Those resolve, at best, to a town
-- centroid, which is fine for grouping a day's work on a map and useless for
-- driving to a door.
--
-- So a point has a *precision*, and a human has the last word:
--   exact       — a UK postcode centroid or a street-level match
--   approximate — a town centroid; the driver sees a warning
--   manual      — placed or corrected by admin; always treated as exact
--   null        — never geocoded
--
-- Verification is separate from precision: an admin confirming the address is
-- right is a different claim from the geocoder being confident, and the driver
-- app shows a banner until someone has made the first claim. Per the agreed
-- scope an unverified address warns but never blocks — drivers keep working
-- while admin catches up.

alter table public.shipments
  add column if not exists pickup_address_verified boolean not null default false,
  add column if not exists pickup_address_verified_at timestamptz,
  add column if not exists pickup_address_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists pickup_geocode_precision text,
  add column if not exists delivery_latitude double precision,
  add column if not exists delivery_longitude double precision,
  add column if not exists delivery_address_verified boolean not null default false,
  add column if not exists delivery_address_verified_at timestamptz,
  add column if not exists delivery_address_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists delivery_geocode_precision text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shipments_pickup_geocode_precision_check'
  ) then
    alter table public.shipments add constraint shipments_pickup_geocode_precision_check
      check (pickup_geocode_precision is null
             or pickup_geocode_precision in ('exact', 'approximate', 'manual'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shipments_delivery_geocode_precision_check'
  ) then
    alter table public.shipments add constraint shipments_delivery_geocode_precision_check
      check (delivery_geocode_precision is null
             or delivery_geocode_precision in ('exact', 'approximate', 'manual'));
  end if;
end $$;

-- The driver's route query asks "today's collections that have a point"; the
-- admin's cleanup queue asks the opposite. One partial index serves both.
create index if not exists shipments_pickup_point_idx
  on public.shipments (pickup_latitude, pickup_longitude)
  where deleted_at is null;

create index if not exists shipments_pickup_unverified_idx
  on public.shipments (pickup_address_verified)
  where deleted_at is null and pickup_address_verified = false;

/**
 * Admin confirms an address, and may place the point by hand.
 *
 * Passing coordinates marks the precision 'manual', which is what makes this
 * usable for the addresses no geocoder will ever resolve: someone looks the
 * place up, drops the pin, and the driver can navigate to it like any other.
 * Passing no coordinates just records the human check against whatever the
 * geocoder found.
 */
create or replace function public.set_shipment_address_verification(
  p_shipment_id uuid,
  p_which text,
  p_verified boolean default true,
  p_latitude double precision default null,
  p_longitude double precision default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_which text := lower(coalesce(p_which, 'pickup'));
  v_has_point boolean := p_latitude is not null and p_longitude is not null;
  v_row public.shipments%rowtype;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Only admin or finance can verify an address'
      using errcode = '42501';
  end if;

  if v_which not in ('pickup', 'delivery') then
    raise exception 'p_which must be pickup or delivery, got %', p_which
      using errcode = '22023';
  end if;

  -- Guard the point before it is written: a swapped lat/lng, or a zero pair
  -- from an empty form, would put a driver in the Atlantic.
  if v_has_point and (p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180) then
    raise exception 'Coordinates out of range: %, %', p_latitude, p_longitude
      using errcode = '22023';
  end if;
  if v_has_point and p_latitude = 0 and p_longitude = 0 then
    raise exception 'Refusing to save a null island coordinate'
      using errcode = '22023';
  end if;

  if v_which = 'pickup' then
    update public.shipments set
      pickup_address_verified = coalesce(p_verified, true),
      pickup_address_verified_at = case when coalesce(p_verified, true) then now() else null end,
      pickup_address_verified_by = case when coalesce(p_verified, true) then auth.uid() else null end,
      pickup_latitude = case when v_has_point then p_latitude else pickup_latitude end,
      pickup_longitude = case when v_has_point then p_longitude else pickup_longitude end,
      pickup_geocode_precision = case when v_has_point then 'manual' else pickup_geocode_precision end,
      updated_at = now()
    where id = p_shipment_id
    returning * into v_row;
  else
    update public.shipments set
      delivery_address_verified = coalesce(p_verified, true),
      delivery_address_verified_at = case when coalesce(p_verified, true) then now() else null end,
      delivery_address_verified_by = case when coalesce(p_verified, true) then auth.uid() else null end,
      delivery_latitude = case when v_has_point then p_latitude else delivery_latitude end,
      delivery_longitude = case when v_has_point then p_longitude else delivery_longitude end,
      delivery_geocode_precision = case when v_has_point then 'manual' else delivery_geocode_precision end,
      updated_at = now()
    where id = p_shipment_id
    returning * into v_row;
  end if;

  if v_row.id is null then
    raise exception 'Shipment % not found', p_shipment_id using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'which', v_which,
    'verified', case when v_which = 'pickup' then v_row.pickup_address_verified else v_row.delivery_address_verified end,
    'latitude', case when v_which = 'pickup' then v_row.pickup_latitude else v_row.delivery_latitude end,
    'longitude', case when v_which = 'pickup' then v_row.pickup_longitude else v_row.delivery_longitude end,
    'precision', case when v_which = 'pickup' then v_row.pickup_geocode_precision else v_row.delivery_geocode_precision end
  );
end $$;

revoke all on function public.set_shipment_address_verification(uuid, text, boolean, double precision, double precision) from public, anon;
grant execute on function public.set_shipment_address_verification(uuid, text, boolean, double precision, double precision) to authenticated;

/**
 * Editing an address invalidates the verification that was made against the
 * old one.
 *
 * Without this a verified pin survives an address change and the driver is
 * confidently routed to the previous house. The point is cleared too, so the
 * geocoder picks the row up again on its next pass.
 */
create or replace function public.reset_address_verification_on_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  old_pickup text := lower(trim(coalesce(
    old.metadata->'sender'->>'address', old.metadata->'senderDetails'->>'address', '')));
  new_pickup text := lower(trim(coalesce(
    new.metadata->'sender'->>'address', new.metadata->'senderDetails'->>'address', '')));
  old_drop text := lower(trim(coalesce(
    old.metadata->'recipient'->>'address', old.metadata->'recipientDetails'->>'address', '')));
  new_drop text := lower(trim(coalesce(
    new.metadata->'recipient'->>'address', new.metadata->'recipientDetails'->>'address', '')));
begin
  if new_pickup is distinct from old_pickup then
    new.pickup_address_verified := false;
    new.pickup_address_verified_at := null;
    new.pickup_address_verified_by := null;
    new.pickup_latitude := null;
    new.pickup_longitude := null;
    new.pickup_geocode_precision := null;
  end if;

  if new_drop is distinct from old_drop then
    new.delivery_address_verified := false;
    new.delivery_address_verified_at := null;
    new.delivery_address_verified_by := null;
    new.delivery_latitude := null;
    new.delivery_longitude := null;
    new.delivery_geocode_precision := null;
  end if;

  return new;
end $$;

drop trigger if exists shipments_reset_address_verification on public.shipments;
create trigger shipments_reset_address_verification
  before update of metadata on public.shipments
  for each row
  execute function public.reset_address_verification_on_change();
