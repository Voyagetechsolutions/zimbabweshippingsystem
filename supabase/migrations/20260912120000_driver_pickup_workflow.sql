-- One scoped feed for real drivers and admin preview; do not broaden shipment RLS.
create or replace function public.driver_collection_feed(p_days integer default 7, p_start date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_start date := coalesce(p_start, current_date); v_result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
    and coalesce(staff_active, true)
    and (is_admin or lower(role) in ('driver','admin','dispatcher','logistics','finance'))) then
    raise exception 'Active staff access required' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 21 or v_start < current_date - 1 or v_start > current_date + 21 then
    raise exception 'Choose a collection window of 1 to 21 days';
  end if;
  with bookings as (
    select s.*, coalesce(s.metadata->'sender', s.metadata->'senderDetails', '{}'::jsonb) sender,
      coalesce(public.parse_schedule_date(s.metadata->'collection'->>'date'),
        public.parse_schedule_date(s.metadata->>'collectionDate'),
        public.parse_schedule_date(cs.pickup_date),
        (select min(public.parse_schedule_date(r.pickup_date)) from public.collection_schedules r
          where r.approved is not false and nullif(trim(s.metadata->'collection'->>'route'),'') is not null
          and regexp_replace(upper(trim(r.route)), '\s+ROUTE$', '') = regexp_replace(upper(trim(s.metadata->'collection'->>'route')), '\s+ROUTE$', '')
          and public.parse_schedule_date(r.pickup_date) >= current_date)) pickup_day,
      cs.country schedule_country
    from public.shipments s left join public.collection_schedules cs on cs.id = s.collection_schedule_id
    where s.deleted_at is null and lower(coalesce(s.collection_status,'')) <> 'collected'
      and lower(coalesce(s.status,'')) not in ('collected','at warehouse','enroute to zimbabwe','delivered','cancelled','canceled')
  ), rows as (
    select b.pickup_day, jsonb_build_object(
      'shipmentId',b.id,'trackingNumber',b.tracking_number,'customerReference',b.customer_reference,
      'customerName',coalesce(nullif(trim(concat_ws(' ',b.sender->>'firstName',b.sender->>'lastName')),''),b.sender->>'name','Collection customer'),
      'phone',b.sender->>'phone','address',b.sender->>'address','city',coalesce(b.sender->>'city',''),
      'postcode',coalesce(b.sender->>'postcode',b.sender->>'postalCode',''),
      'country',coalesce(nullif(trim(b.sender->>'country'),''),b.schedule_country,b.metadata->'collection'->>'country'),
      'route',b.metadata->'collection'->>'route',
      'goodsDescription',left(public.shipment_goods_summary(b.goods_description,b.metadata),400),
      'collectionStatus',b.collection_status,'latitude',b.pickup_latitude,'longitude',b.pickup_longitude,
      'stopId',case when c.driver_id = auth.uid() then c.stop_id end,
      'claimId',c.id,'claimStatus',case when c.status in ('claimed','en_route','arrived') then c.status else 'available' end,
      'claimedBy',coalesce(case when c.status in ('claimed','en_route','arrived') then c.driver_id end,b.assigned_driver_id),
      'claimedByName',p.full_name,'claimedAt',c.claimed_at) item
    from bookings b left join public.route_collection_claims c on c.shipment_id = b.id
    left join public.profiles p on p.id = c.driver_id
    where b.pickup_day >= v_start and b.pickup_day < v_start + p_days
      -- Known overseas origins are not pickups. Missing/legacy country fields
      -- remain usable when a collection date exists (e.g. a city in country).
      and lower(trim(coalesce(b.sender->>'country',''))) not in ('zimbabwe','zw','south africa','za')
  ), days as (
    select pickup_day, jsonb_build_object('date',pickup_day,
      -- Deduplicated on the suffix-stripped name. Bookings spell the same
      -- route both ways, so a plain `distinct` listed NORTHAMPTON and
      -- NORTHAMPTON ROUTE as two routes on the driver's own run.
      'routes',coalesce(jsonb_agg(distinct regexp_replace(upper(trim(item->>'route')), '\s*ROUTE$', ''))
                 filter (where nullif(trim(item->>'route'),'') is not null),'[]'::jsonb),
      'collections',jsonb_agg(item order by item->>'city',item->>'customerName')) payload
    from rows group by pickup_day
  ) select coalesce(jsonb_agg(payload order by pickup_day),'[]'::jsonb) into v_result from days;
  return v_result;
end $$;
revoke all on function public.driver_collection_feed(integer,date) from public, anon;
grant execute on function public.driver_collection_feed(integer,date) to authenticated;

create or replace function public.driver_route_collections(p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_day date := coalesce(p_date,current_date); v_feed jsonb;
begin
  v_feed := public.driver_collection_feed(1,v_day);
  return jsonb_build_object('date',v_day,'routes','[]'::jsonb,
    'collections',coalesce(v_feed->0->'collections','[]'::jsonb));
end $$;
revoke all on function public.driver_route_collections(date) from public, anon;
grant execute on function public.driver_route_collections(date) to authenticated;

-- An unclaimed booking needs readable details before the driver claims it.
-- Expose only operational fields, never customer handover codes or payments.
create or replace function public.driver_collection_detail(p_shipment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_feed jsonb; v_result jsonb;
begin
  v_feed := public.driver_collection_feed(21,null);
  if not exists (select 1 from jsonb_array_elements(v_feed) d,
    jsonb_array_elements(d->'collections') c where c->>'shipmentId' = p_shipment_id::text) then
    raise exception 'This booking is not in the upcoming collection window';
  end if;
  select jsonb_build_object('id',s.id,'tracking_number',s.tracking_number,'customer_reference',s.customer_reference,
    'goods_description',public.shipment_goods_summary(s.goods_description,s.metadata),
    'collection_status',s.collection_status,'status',s.status,
    'metadata',jsonb_build_object('sender',coalesce(s.metadata->'sender',s.metadata->'senderDetails'),
      'recipient',coalesce(s.metadata->'recipient',s.metadata->'recipientDetails'),
      'shipment',s.metadata->'shipment','shipmentDetails',s.metadata->'shipmentDetails',
      'collection',s.metadata->'collection')) into v_result from public.shipments s where s.id = p_shipment_id;
  return v_result;
end $$;
revoke all on function public.driver_collection_detail(uuid) from public, anon;
grant execute on function public.driver_collection_detail(uuid) to authenticated;

-- Pickup-only endpoint. Delivery continues to use the verified handover flow.
create or replace function public.complete_driver_pickup(p_stop_id uuid, p_details_confirmed boolean, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_stop public.driver_run_stops%rowtype; v_ship public.shipments%rowtype; v_method text;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()
    and coalesce(staff_active,true) and (is_admin or lower(role) in ('driver','admin','dispatcher','logistics'))) then
    raise exception 'Active driver access required' using errcode = '42501';
  end if;
  select * into v_stop from public.driver_run_stops where id = p_stop_id for update;
  if not found or v_stop.stop_type is distinct from 'collection' then raise exception 'Collection stop required'; end if;
  if not exists (select 1 from public.driver_runs where id = v_stop.run_id and driver_id = auth.uid()) then
    raise exception 'Stop is not assigned to you' using errcode = '42501';
  end if;
  -- A retry after a lost response must not create another event or change payment.
  if v_stop.status = 'completed' then return jsonb_build_object('shipmentId',v_stop.shipment_id,'status','Collected','alreadyCompleted',true); end if;
  if not exists (select 1 from public.driver_attendance where driver_id = auth.uid()
    and work_date = current_date and clocked_in_at is not null and clocked_out_at is null) then
    raise exception 'Clock in before completing a collection';
  end if;
  if v_stop.status <> 'arrived' then raise exception 'Mark arrived before completing the collection'; end if;
  if p_details_confirmed is distinct from true then raise exception 'Confirm the customer, pickup address and goods first'; end if;
  select * into v_ship from public.shipments where id = v_stop.shipment_id and deleted_at is null for update;
  if not found then raise exception 'Shipment not found'; end if;
  if v_ship.assigned_driver_id is not null and v_ship.assigned_driver_id <> auth.uid() then
    raise exception 'Another driver is assigned to this shipment';
  end if;
  if lower(coalesce(v_ship.status,'')) in ('collected','at warehouse','enroute to zimbabwe','delivered','cancelled','canceled')
    or lower(coalesce(v_ship.collection_status,'')) = 'collected' then raise exception 'This shipment is no longer awaiting collection'; end if;
  v_method := case when v_stop.qr_verified_at is not null then 'qr'
    when v_stop.code_verified_at is not null then 'code' else 'driver_confirmation' end;
  update public.shipments set status = 'Collected', collection_status = 'Collected', driver_status = 'collected',
    collected_at = now(), collected_by = auth.uid(), updated_at = now(),
    metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('collectionHandover',jsonb_build_object(
      'driverId',auth.uid(),'stopId',v_stop.id,'confirmedAt',now(),'verifiedBy',v_method,'notes',nullif(trim(p_notes),'')))
    where id = v_ship.id;
  update public.driver_run_stops set status = 'completed',completed_at = now(),updated_at = now() where id = v_stop.id;
  update public.route_collection_claims set status = 'completed',completed_at = now(),updated_at = now()
    where shipment_id = v_ship.id and driver_id = auth.uid();
  insert into public.shipment_events(shipment_id,event_type,previous_status,new_status,actor_id,details)
    values(v_ship.id,'collection_handover',v_ship.status,'Collected',auth.uid(),
      jsonb_build_object('stopId',v_stop.id,'verifiedBy',v_method,'detailsConfirmed',true,'notes',p_notes));
  if not exists (select 1 from public.driver_run_stops where run_id = v_stop.run_id and status not in ('completed','failed')) then
    update public.driver_runs set status = 'completed',completed_at = now(),updated_at = now() where id = v_stop.run_id;
  end if;
  return jsonb_build_object('shipmentId',v_ship.id,'status','Collected','verifiedBy',v_method);
end $$;
revoke all on function public.complete_driver_pickup(uuid,boolean,text) from public, anon;
grant execute on function public.complete_driver_pickup(uuid,boolean,text) to authenticated;
