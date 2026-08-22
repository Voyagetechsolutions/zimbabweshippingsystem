-- Delivery driver operations.
--
-- Pickup drivers work a shared collection route (route_collection_claims) and
-- that half of the journey is already built. This migration adds the other
-- half: the delivery driver.
--
-- A delivery driver does not get handed a route. At the depot they build the
-- load themselves, one consignment at a time. For each one they type the
-- customer reference and the code stamped on the metal coded seal fitted at
-- collection; the lookup returns what that customer is shipping so the driver
-- can verify the goods in front of them before the item joins the load.
--
-- Every loaded consignment raises a draft delivery note. An admin has to verify
-- each note before the run can start, so a delivery driver never leaves the
-- depot with a document the office has not checked — and can download only the
-- notes that were verified.

-- ---------------------------------------------------------------------------
-- A. Delivery notes gain an admin verification gate
-- ---------------------------------------------------------------------------

alter table public.delivery_notes
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_notes text,
  add column if not exists seal_codes text[] not null default '{}',
  add column if not exists seal_status text,
  add column if not exists discrepancy_note text,
  add column if not exists loaded_at timestamptz;

alter table public.delivery_notes drop constraint if exists delivery_notes_verification_status_check;
alter table public.delivery_notes add constraint delivery_notes_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected'));

create index if not exists delivery_notes_verification_idx
  on public.delivery_notes(verification_status, created_at desc);

-- Notes for deliveries that already happened pre-date the gate. Verifying them
-- now would be theatre, so they are marked verified rather than blocking a
-- driver from downloading a document for a completed job. Anything an admin has
-- since rejected keeps its rejection.
update public.delivery_notes
   set verification_status = 'verified',
       verified_at = coalesce(verified_at, updated_at)
 where delivered_at is not null
   and verification_status = 'pending';

-- ---------------------------------------------------------------------------
-- B. The load: what a delivery driver put on the vehicle, and how it verified
-- ---------------------------------------------------------------------------

create table if not exists public.delivery_load_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.driver_runs(id) on delete cascade,
  stop_id uuid not null references public.driver_run_stops(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete restrict,
  load_date date not null default current_date,
  -- Exactly what the driver typed, kept verbatim: the reference they matched on
  -- and the code they read off the seal. Both are evidence if a load is queried.
  entered_reference text not null,
  entered_seal_code text,
  seal_status text not null default 'none_on_record'
    check (seal_status in ('matched', 'mismatch', 'none_on_record')),
  recorded_seal_codes text[] not null default '{}',
  discrepancy_note text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stop_id)
);

create index if not exists delivery_load_items_driver_date_idx
  on public.delivery_load_items(driver_id, load_date desc);
create index if not exists delivery_load_items_run_idx
  on public.delivery_load_items(run_id);

alter table public.delivery_load_items enable row level security;

drop policy if exists "Staff view delivery load" on public.delivery_load_items;
create policy "Staff view delivery load" on public.delivery_load_items
  for select to authenticated
  using (driver_id = auth.uid() or public.is_operations_admin() or public.is_finance_staff());

drop policy if exists "Admins manage delivery load" on public.delivery_load_items;
create policy "Admins manage delivery load" on public.delivery_load_items
  for all to authenticated
  using (public.is_operations_admin()) with check (public.is_operations_admin());

-- Loading photos ride the same proofs pipeline (and 48-hour retention).
alter table public.driver_proofs drop constraint if exists driver_proofs_proof_type_check;
alter table public.driver_proofs add constraint driver_proofs_proof_type_check
  check (proof_type in ('pickup_departure', 'depot_arrival', 'depot_departure',
                        'delivery_arrival', 'exception', 'seal', 'goods', 'delivery_load'));

-- ---------------------------------------------------------------------------
-- C. Who may work deliveries
-- ---------------------------------------------------------------------------

create or replace function public.is_delivery_driver() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.staff_active, true)
      and (
        p.is_admin = true
        or lower(coalesce(p.role, '')) in ('admin', 'dispatcher', 'logistics')
        or (lower(coalesce(p.role, '')) = 'driver'
            and coalesce(p.driver_type, 'both') in ('delivery', 'both'))
      )
  )
$$;
grant execute on function public.is_delivery_driver() to authenticated;

-- ---------------------------------------------------------------------------
-- D. Find the consignment from the customer reference (+ seal code)
-- ---------------------------------------------------------------------------

-- Seal codes are read off stamped metal in poor light, so compare them the way
-- a human would: ignore case, spaces and punctuation.
create or replace function public.normalise_seal_code(p_code text) returns text
language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.lookup_delivery_shipment(
  p_reference text,
  p_seal_code text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ref text := upper(trim(coalesce(p_reference, '')));
  v_ship public.shipments%rowtype;
  v_seal public.shipment_seals%rowtype;
  v_note public.delivery_notes%rowtype;
  v_item public.delivery_load_items%rowtype;
  v_holder text;
  v_recorded text[];
  v_seal_status text;
  v_entered text := public.normalise_seal_code(p_seal_code);
begin
  if not public.is_delivery_driver() then raise exception 'Delivery driver access required'; end if;
  if length(v_ref) < 3 then raise exception 'Enter the customer reference from the delivery note or label'; end if;

  select * into v_ship from public.shipments
   where deleted_at is null
     and (upper(coalesce(customer_reference, '')) = v_ref
       or upper(coalesce(tracking_number, '')) = v_ref)
   order by created_at desc limit 1;

  if not found then
    -- Fall back to a prefix match so a partially rubbed-off label still lands.
    select * into v_ship from public.shipments
     where deleted_at is null
       and (upper(coalesce(customer_reference, '')) like v_ref || '%'
         or upper(coalesce(tracking_number, '')) like '%' || v_ref)
     order by created_at desc limit 1;
  end if;
  if not found then raise exception 'No consignment found for reference %', v_ref; end if;

  select * into v_seal from public.shipment_seals where shipment_id = v_ship.id;
  select * into v_note from public.delivery_notes where shipment_id = v_ship.id
   order by created_at desc limit 1;
  select * into v_item from public.delivery_load_items where shipment_id = v_ship.id
   order by created_at desc limit 1;

  v_recorded := coalesce(v_seal.seal_codes, '{}');
  if coalesce(v_seal.seals_used, false) and coalesce(array_length(v_recorded, 1), 0) > 0 then
    if v_entered = '' then
      v_seal_status := 'not_entered';
    elsif exists (select 1 from unnest(v_recorded) c where public.normalise_seal_code(c) = v_entered) then
      v_seal_status := 'matched';
    else
      v_seal_status := 'mismatch';
    end if;
  else
    v_seal_status := 'none_on_record';
  end if;

  if v_item.id is not null then
    select coalesce(p.full_name, 'Another driver') into v_holder
      from public.profiles p where p.id = v_item.driver_id;
  end if;

  return jsonb_build_object(
    'shipmentId', v_ship.id,
    'customerReference', v_ship.customer_reference,
    'trackingNumber', v_ship.tracking_number,
    'status', v_ship.status,
    'deliveryNoteStatus', v_ship.delivery_note_status,
    'senderName', trim(coalesce(v_ship.metadata->'sender'->>'name',
      concat_ws(' ', v_ship.metadata->'sender'->>'firstName', v_ship.metadata->'sender'->>'lastName'))),
    'receiverName', coalesce(v_ship.metadata->'recipient'->>'name',
      v_ship.metadata->'recipientDetails'->>'name', ''),
    'receiverPhone', coalesce(v_ship.metadata->'recipient'->>'phone',
      v_ship.metadata->'recipientDetails'->>'phone', ''),
    'deliveryAddress', coalesce(nullif(concat_ws(', ',
      nullif(coalesce(v_ship.metadata->'recipient'->>'address', v_ship.metadata->'recipientDetails'->>'address'), ''),
      nullif(coalesce(v_ship.metadata->'recipient'->>'city', v_ship.metadata->'recipientDetails'->>'city'), '')), ''),
      v_ship.destination, ''),
    -- What this customer is shipping: the declared description, the driver's
    -- collection correction, and the priced lines from the booking. This is the
    -- list the driver checks the physical goods against.
    'goodsDescription', left(coalesce(v_ship.goods_description, v_ship.metadata->'shipment'->>'description', ''), 600),
    'driverCorrection', v_ship.driver_description_correction,
    'items', coalesce(v_ship.metadata->'invoice'->'items', '[]'::jsonb),
    'sealsRequested', coalesce(v_ship.seals_requested, 0),
    'sealsUsed', coalesce(v_seal.seals_used, false),
    'recordedSealCodes', to_jsonb(v_recorded),
    'sealCondition', v_seal.condition,
    'sealNotes', v_seal.notes,
    'sealStatus', v_seal_status,
    'alreadyLoaded', v_item.id is not null,
    'loadedByName', v_holder,
    'loadedByMe', coalesce(v_item.driver_id = auth.uid(), false),
    'deliveryNote', case when v_note.id is null then null else jsonb_build_object(
      'id', v_note.id, 'noteNumber', v_note.note_number, 'status', v_note.status,
      'verificationStatus', v_note.verification_status, 'verificationNotes', v_note.verification_notes) end
  );
end $$;
grant execute on function public.lookup_delivery_shipment(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- E. Put a consignment on the vehicle
-- ---------------------------------------------------------------------------

create or replace function public.add_delivery_load_item(
  p_shipment_id uuid,
  p_entered_reference text,
  p_seal_code text default null,
  p_discrepancy_note text default null,
  p_photo_path text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ship public.shipments%rowtype;
  v_seal public.shipment_seals%rowtype;
  v_run public.driver_runs%rowtype;
  v_stop public.driver_run_stops%rowtype;
  v_item public.delivery_load_items%rowtype;
  v_note public.delivery_notes%rowtype;
  v_recorded text[];
  v_entered text := public.normalise_seal_code(p_seal_code);
  v_seal_status text;
  v_discrepancy text := nullif(trim(coalesce(p_discrepancy_note, '')), '');
  v_order integer;
  v_address text;
  v_number text;
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if not public.is_delivery_driver() then raise exception 'Delivery driver access required'; end if;

  if not exists (
    select 1 from public.driver_attendance a
     where a.driver_id = v_uid and a.work_date = current_date and a.clocked_out_at is null
  ) and not public.is_operations_admin() then
    raise exception 'Clock in before loading the vehicle';
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id and deleted_at is null for update;
  if not found then raise exception 'Consignment not found'; end if;
  if lower(coalesce(v_ship.status, '')) = 'delivered' then
    raise exception 'This consignment has already been delivered';
  end if;
  if lower(coalesce(v_ship.status, '')) = 'cancelled' then
    raise exception 'This consignment was cancelled — do not load it';
  end if;

  -- Seal check. A mismatch is never silently accepted: the driver has to look at
  -- what the customer reference says is being shipped and record what they found
  -- before the item can travel, and that note goes to admin with the note.
  select * into v_seal from public.shipment_seals where shipment_id = v_ship.id;
  v_recorded := coalesce(v_seal.seal_codes, '{}');
  if coalesce(v_seal.seals_used, false) and coalesce(array_length(v_recorded, 1), 0) > 0 then
    if v_entered = '' then
      raise exception 'This consignment was sealed at collection — enter the code stamped on the seal';
    elsif exists (select 1 from unnest(v_recorded) c where public.normalise_seal_code(c) = v_entered) then
      v_seal_status := 'matched';
    else
      v_seal_status := 'mismatch';
      if v_discrepancy is null then
        raise exception 'Seal % does not match the seal recorded at collection (%). Check the goods against what this customer reference says is being shipped, then record what you found to load it.',
          trim(p_seal_code), array_to_string(v_recorded, ', ');
      end if;
    end if;
  else
    v_seal_status := 'none_on_record';
    if v_entered <> '' then
      v_discrepancy := trim(concat_ws(' ',
        'Seal ' || trim(p_seal_code) || ' found on the goods but no seal was recorded at collection.',
        v_discrepancy));
    end if;
  end if;

  -- Today's delivery run. One run per driver per day, so a driver cannot be
  -- half on a collection route and half on a delivery route.
  select * into v_run from public.driver_runs
   where driver_id = v_uid and run_date = current_date for update;
  if found and v_run.run_type <> 'delivery' then
    raise exception 'You already have a % route today — deliveries need their own day', v_run.run_type;
  end if;
  if found and v_run.status = 'completed' then
    raise exception 'Today''s delivery run is already closed';
  end if;
  if not found then
    insert into public.driver_runs(driver_id, run_date, status, run_type, route_name)
    values (v_uid, current_date, 'planned', 'delivery', 'Delivery route')
    returning * into v_run;
  end if;

  v_address := coalesce(
    nullif(concat_ws(', ',
      nullif(coalesce(v_ship.metadata->'recipient'->>'address', v_ship.metadata->'recipientDetails'->>'address'), ''),
      nullif(coalesce(v_ship.metadata->'recipient'->>'city', v_ship.metadata->'recipientDetails'->>'city'), '')), ''),
    v_ship.destination);

  select * into v_stop from public.driver_run_stops
   where shipment_id = v_ship.id and stop_type = 'delivery' and status <> 'failed' limit 1 for update;
  if found then
    if v_stop.run_id <> v_run.id then
      raise exception 'This consignment is already loaded on another delivery run';
    end if;
    update public.driver_run_stops set address = coalesce(v_stop.address, v_address), updated_at = now()
     where id = v_stop.id returning * into v_stop;
  else
    select coalesce(max(stop_order), 0) + 1 into v_order from public.driver_run_stops where run_id = v_run.id;
    insert into public.driver_run_stops(run_id, shipment_id, stop_order, stop_type, status, address)
    values (v_run.id, v_ship.id, v_order, 'delivery', 'planned', v_address)
    returning * into v_stop;
  end if;

  insert into public.delivery_load_items(run_id, stop_id, shipment_id, driver_id, load_date,
    entered_reference, entered_seal_code, seal_status, recorded_seal_codes, discrepancy_note, photo_path)
  values (v_run.id, v_stop.id, v_ship.id, v_uid, current_date,
    trim(coalesce(p_entered_reference, coalesce(v_ship.customer_reference, ''))),
    nullif(trim(coalesce(p_seal_code, '')), ''), v_seal_status, v_recorded, v_discrepancy, p_photo_path)
  on conflict (stop_id) do update set
    entered_reference = excluded.entered_reference,
    entered_seal_code = excluded.entered_seal_code,
    seal_status = excluded.seal_status,
    recorded_seal_codes = excluded.recorded_seal_codes,
    discrepancy_note = coalesce(excluded.discrepancy_note, delivery_load_items.discrepancy_note),
    photo_path = coalesce(excluded.photo_path, delivery_load_items.photo_path),
    updated_at = now()
  returning * into v_item;

  -- Raise the delivery note in draft so admin has something to verify. A note
  -- that was already verified keeps that verification; a rejected one goes back
  -- to pending because the driver has just re-presented the goods.
  v_number := 'DN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(v_stop.id::text, '-', ''), 1, 6));
  insert into public.delivery_notes(shipment_id, stop_id, driver_id, note_number, recipient_name,
    delivery_address, status, verification_status, seal_codes, seal_status, discrepancy_note, loaded_at)
  values (v_ship.id, v_stop.id, v_uid, v_number,
    coalesce(v_ship.metadata->'recipient'->>'name', v_ship.metadata->'recipientDetails'->>'name'),
    v_address, 'draft', 'pending',
    case when v_item.entered_seal_code is null then v_recorded else array[v_item.entered_seal_code] end,
    v_seal_status, v_discrepancy, now())
  on conflict (stop_id) do update set
    driver_id = v_uid,
    recipient_name = coalesce(delivery_notes.recipient_name, excluded.recipient_name),
    delivery_address = coalesce(delivery_notes.delivery_address, excluded.delivery_address),
    seal_codes = excluded.seal_codes,
    seal_status = excluded.seal_status,
    discrepancy_note = coalesce(excluded.discrepancy_note, delivery_notes.discrepancy_note),
    loaded_at = coalesce(delivery_notes.loaded_at, now()),
    verification_status = case when delivery_notes.verification_status = 'verified'
      then 'verified' else 'pending' end,
    updated_at = now()
  returning * into v_note;

  update public.shipments set assigned_driver_id = v_uid, driver_status = 'loaded',
    delivery_note_status = case when coalesce(delivery_note_status, 'Draft') = 'Completed'
      then delivery_note_status else 'Awaiting Verification' end,
    updated_at = now()
   where id = v_ship.id;

  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (v_ship.id, 'delivery_loaded', v_ship.driver_status, 'loaded', v_uid,
    jsonb_build_object('runId', v_run.id, 'stopId', v_stop.id, 'sealStatus', v_seal_status,
      'enteredSeal', v_item.entered_seal_code, 'deliveryNote', v_note.note_number));

  -- Tell dispatch there is something to verify. Without this the driver would be
  -- sitting in a loaded vehicle waiting on an admin who does not know. Correcting
  -- an entry re-sends only after twelve hours, so fixing a typo is not a ping.
  if v_note.verification_status = 'pending' and not exists (
    select 1 from public.staff_messages m
     where m.shipment_id = v_ship.id and m.audience_role = 'dispatch'
       and m.subject = 'Delivery note to verify' and m.created_at > now() - interval '12 hours'
  ) then
    insert into public.staff_messages(sender_id, recipient_id, audience_role, shipment_id, subject, body, priority)
    values (v_uid, null, 'dispatch', v_ship.id, 'Delivery note to verify',
      v_note.note_number || ' (' || coalesce(v_ship.customer_reference, v_ship.tracking_number, 'consignment')
        || ') is loaded for delivery'
        || case when v_seal_status = 'mismatch' then ' WITH A SEAL DISCREPANCY — ' || coalesce(v_discrepancy, 'see the note') else '' end
        || '. It needs verifying before the run can start.',
      case when v_seal_status = 'mismatch' then 'urgent' else 'normal' end);
  end if;

  return jsonb_build_object('runId', v_run.id, 'stopId', v_stop.id, 'shipmentId', v_ship.id,
    'sealStatus', v_seal_status, 'discrepancy', v_discrepancy,
    'deliveryNote', jsonb_build_object('id', v_note.id, 'noteNumber', v_note.note_number,
      'verificationStatus', v_note.verification_status));
end $$;
grant execute on function public.add_delivery_load_item(uuid, text, text, text, text) to authenticated;

create or replace function public.remove_delivery_load_item(p_stop_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_item public.delivery_load_items%rowtype; v_stop public.driver_run_stops%rowtype;
begin
  select * into v_item from public.delivery_load_items where stop_id = p_stop_id for update;
  if not found then raise exception 'This consignment is not on your load'; end if;
  if v_item.driver_id <> auth.uid() and not public.is_operations_admin() then
    raise exception 'Only the loading driver or dispatch can take this off the vehicle';
  end if;
  select * into v_stop from public.driver_run_stops where id = p_stop_id;
  if v_stop.status not in ('planned', 'en_route') then
    raise exception 'This delivery is already under way and cannot be unloaded here';
  end if;

  delete from public.delivery_load_items where stop_id = p_stop_id;

  -- A note the office has already verified is a record, not a draft. It is
  -- voided rather than deleted, and because delivery_notes.stop_id is ON DELETE
  -- RESTRICT the stop has to stay too — it is failed instead, which also frees
  -- the one-active-handover index so the goods can be reloaded another day.
  if exists (select 1 from public.delivery_notes where stop_id = p_stop_id and verification_status = 'verified') then
    update public.delivery_notes set status = 'void', updated_at = now() where stop_id = p_stop_id;
    update public.driver_run_stops set status = 'failed', failure_reason = 'unloaded',
      failure_note = coalesce(p_reason, 'Taken off the vehicle'), failed_at = now(), updated_at = now()
     where id = p_stop_id;
  else
    delete from public.delivery_notes where stop_id = p_stop_id;
    delete from public.driver_run_stops where id = p_stop_id;
  end if;

  update public.shipments set assigned_driver_id = null, driver_status = 'available', updated_at = now()
   where id = v_item.shipment_id;
  insert into public.shipment_events(shipment_id, event_type, previous_status, new_status, actor_id, details)
  values (v_item.shipment_id, 'delivery_unloaded', 'loaded', 'available', auth.uid(),
    jsonb_build_object('reason', p_reason, 'stopId', p_stop_id));

  return jsonb_build_object('shipmentId', v_item.shipment_id, 'removed', true);
end $$;
grant execute on function public.remove_delivery_load_item(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- F. The driver's own load for a day
-- ---------------------------------------------------------------------------

create or replace function public.driver_delivery_load(p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := coalesce(p_date, current_date);
  v_run public.driver_runs%rowtype;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if not public.is_delivery_driver() then raise exception 'Delivery driver access required'; end if;

  select * into v_run from public.driver_runs
   where driver_id = v_uid and run_date = v_day and run_type = 'delivery'
   order by created_at desc limit 1;

  if v_run.id is null then
    return jsonb_build_object('date', v_day, 'run', null, 'items', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(x order by x->>'stopOrder'), '[]'::jsonb) into v_items from (
    select jsonb_build_object(
      'stopId', st.id, 'stopOrder', lpad(st.stop_order::text, 4, '0'), 'stopStatus', st.status,
      'shipmentId', s.id, 'customerReference', s.customer_reference, 'trackingNumber', s.tracking_number,
      'receiverName', coalesce(n.recipient_name, s.metadata->'recipient'->>'name',
        s.metadata->'recipientDetails'->>'name', ''),
      'receiverPhone', coalesce(s.metadata->'recipient'->>'phone',
        s.metadata->'recipientDetails'->>'phone', ''),
      'address', coalesce(st.address, s.destination, ''),
      'latitude', st.latitude, 'longitude', st.longitude,
      'goodsDescription', left(coalesce(s.goods_description, ''), 400),
      'enteredSealCode', li.entered_seal_code, 'sealStatus', li.seal_status,
      'recordedSealCodes', to_jsonb(li.recorded_seal_codes),
      'discrepancyNote', li.discrepancy_note, 'photoPath', li.photo_path,
      'loadedAt', li.created_at,
      'noteId', n.id, 'noteNumber', n.note_number, 'noteStatus', n.status,
      'verificationStatus', coalesce(n.verification_status, 'pending'),
      'verificationNotes', n.verification_notes
    ) x
    from public.delivery_load_items li
    join public.driver_run_stops st on st.id = li.stop_id
    join public.shipments s on s.id = li.shipment_id
    left join public.delivery_notes n on n.stop_id = li.stop_id
    where li.run_id = v_run.id
  ) q;

  return jsonb_build_object('date', v_day, 'run', to_jsonb(v_run), 'items', v_items);
end $$;
grant execute on function public.driver_delivery_load(date) to authenticated;

-- ---------------------------------------------------------------------------
-- G. Admin verification
-- ---------------------------------------------------------------------------

create or replace function public.verify_delivery_note(
  p_note_id uuid,
  p_approved boolean,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_note public.delivery_notes%rowtype;
begin
  if not public.is_operations_admin() then raise exception 'Admin access required to verify a delivery note'; end if;

  update public.delivery_notes set
    verification_status = case when p_approved then 'verified' else 'rejected' end,
    verification_notes = nullif(trim(coalesce(p_notes, '')), ''),
    verified_by = auth.uid(), verified_at = now(),
    status = case when p_approved then status else 'exception' end,
    updated_at = now()
  where id = p_note_id returning * into v_note;
  if not found then raise exception 'Delivery note not found'; end if;

  update public.shipments set
    delivery_note_status = case when p_approved then 'Verified' else 'Rejected' end,
    updated_at = now()
   where id = v_note.shipment_id and coalesce(delivery_note_status, '') <> 'Completed';

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_approved then 'VERIFY' else 'REJECT' end, 'DELIVERY_NOTE', v_note.id,
    jsonb_build_object('noteNumber', v_note.note_number, 'notes', p_notes));

  insert into public.staff_messages(sender_id, recipient_id, audience_role, shipment_id, subject, body, priority)
  values (auth.uid(), v_note.driver_id, 'driver', v_note.shipment_id,
    case when p_approved then 'Delivery note verified' else 'Delivery note rejected' end,
    v_note.note_number || (case when p_approved
      then ' has been verified — you can download it and deliver this consignment.'
      else ' was rejected. ' || coalesce(nullif(trim(coalesce(p_notes, '')), ''), 'Check the goods and seal against the booking.') end),
    case when p_approved then 'normal' else 'urgent' end);

  return to_jsonb(v_note);
end $$;
grant execute on function public.verify_delivery_note(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- H. A delivery run cannot start until every note on it is verified
-- ---------------------------------------------------------------------------

create or replace function public.start_driver_run(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run public.driver_runs%rowtype;
  v_type text;
  v_unverified integer;
  v_rejected integer;
begin
  select * into v_run from public.driver_runs where id = p_run_id for update;
  if not found or v_run.driver_id <> auth.uid() then raise exception 'Run is not assigned to you'; end if;
  if not exists (select 1 from public.driver_attendance
    where driver_id = auth.uid() and work_date = current_date and clocked_out_at is null)
  then raise exception 'Clock in before starting your route'; end if;
  select driver_type into v_type from public.profiles where id = auth.uid();
  if coalesce(v_type, 'both') <> 'both' and v_type <> v_run.run_type then
    raise exception 'This route does not match your driver specialism';
  end if;
  if v_run.run_date <> current_date then raise exception 'Only today''s route can be started'; end if;

  if v_run.run_type = 'delivery' then
    if not exists (select 1 from public.driver_run_stops where run_id = v_run.id and stop_type = 'delivery') then
      raise exception 'Load the vehicle before starting the delivery run';
    end if;
    select count(*) filter (where coalesce(n.verification_status, 'pending') = 'pending'),
           count(*) filter (where n.verification_status = 'rejected')
      into v_unverified, v_rejected
      from public.driver_run_stops st
      left join public.delivery_notes n on n.stop_id = st.id
     where st.run_id = v_run.id and st.stop_type = 'delivery' and st.status <> 'failed';
    if coalesce(v_rejected, 0) > 0 then
      raise exception '% delivery note(s) were rejected by admin — take those consignments off the vehicle first', v_rejected;
    end if;
    if coalesce(v_unverified, 0) > 0 then
      raise exception '% delivery note(s) are still waiting for admin verification', v_unverified;
    end if;
    update public.shipments s set status = 'Out for Delivery', updated_at = now()
      from public.driver_run_stops st
     where st.run_id = v_run.id and st.stop_type = 'delivery' and st.status <> 'failed'
       and s.id = st.shipment_id and lower(coalesce(s.status, '')) <> 'delivered';
  end if;

  update public.driver_runs set status = 'active', started_at = coalesce(started_at, now()), updated_at = now()
   where id = p_run_id returning * into v_run;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'START_RUN', 'DRIVER_RUN', v_run.id,
    jsonb_build_object('route', v_run.route_name, 'runType', v_run.run_type));
  return to_jsonb(v_run);
end $$;
grant execute on function public.start_driver_run(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.delivery_notes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.delivery_load_items; exception when duplicate_object then null; end $$;
