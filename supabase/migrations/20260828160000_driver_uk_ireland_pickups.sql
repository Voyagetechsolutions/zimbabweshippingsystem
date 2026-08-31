-- Make the shared pickup feed resilient to older bookings that were created
-- before collection_schedule_id was populated. UK and Ireland pickups are
-- included by schedule, route name, or the booking's country/date metadata.
create or replace function public.driver_route_collections(p_date date default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_day date:=coalesce(p_date,current_date); v_routes jsonb; v_stops jsonb;
begin
  if v_uid is null then raise exception 'Sign in to view collections'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_uid and (p.is_admin=true or lower(coalesce(p.role,'')) in ('driver','dispatcher','logistics','admin','finance'))) then raise exception 'Driver or dispatch access required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('scheduleId',r.schedule_id,'route',r.route,'country',r.country,'pickupDate',r.pickup_date) order by r.country,r.route),'[]'::jsonb) into v_routes from public.active_collection_routes(v_day) r;
  select coalesce(jsonb_agg(x order by case x->>'claimStatus' when 'arrived' then 0 when 'en_route' then 1 when 'claimed' then 2 else 3 end,x->>'customerName'),'[]'::jsonb) into v_stops
  from (
    select jsonb_build_object(
      'shipmentId',s.id,'trackingNumber',s.tracking_number,'customerReference',s.customer_reference,
      'customerName',coalesce(nullif(s.metadata->'sender'->>'name',''),nullif(trim(coalesce(s.metadata->'sender'->>'firstName','')||' '||coalesce(s.metadata->'sender'->>'lastName','')),''),'Collection customer'),
      'phone',s.metadata->'sender'->>'phone','address',s.metadata->'sender'->>'address','city',coalesce(s.metadata->'sender'->>'city',''),
      'postcode',coalesce(s.metadata->'sender'->>'postcode',s.metadata->'sender'->>'postalCode',''),'route',s.metadata->'collection'->>'route',
      'country',coalesce(nullif(s.metadata->'sender'->>'country',''),nullif(s.metadata->'senderDetails'->>'country',''),nullif(s.metadata->'collection'->>'country',''),cs.country),
      'goodsDescription',left(coalesce(s.goods_description,''),400),'collectionStatus',s.collection_status,
      'latitude',coalesce(st.latitude,s.pickup_latitude),'longitude',coalesce(st.longitude,s.pickup_longitude),'stopId',coalesce(c.stop_id,st.id),
      'runId',st.run_id,
      'claimId',c.id,'claimStatus',coalesce(c.status,'available'),'claimedBy',c.driver_id,'claimedByName',p.full_name,'claimedAt',c.claimed_at
    ) x
    from public.shipments s
    left join public.collection_schedules cs on cs.id=s.collection_schedule_id
    left join public.route_collection_claims c on c.shipment_id=s.id and c.claim_date=v_day
    left join public.driver_run_stops st on st.id=c.stop_id
    left join public.profiles p on p.id=c.driver_id
    where s.deleted_at is null and coalesce(s.collection_status,'Awaiting Collection')<>'Collected'
      and (
        s.collection_schedule_id in (select schedule_id from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route','')) in (select upper(route) from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route',''))||' ROUTE' in (select upper(route) from public.active_collection_routes(v_day))
        or upper(coalesce(s.metadata->'collection'->>'route','')) in (select upper(replace(route,' ROUTE','')) from public.active_collection_routes(v_day))
        or (
          lower(coalesce(s.metadata->'sender'->>'country',s.metadata->'senderDetails'->>'country',s.metadata->'collection'->>'country','')) in ('ireland','republic of ireland','northern ireland','united kingdom','england','uk','great britain')
          and public.parse_schedule_date(coalesce(s.metadata->'collection'->>'date',s.metadata->>'collectionDate'))=v_day
        )
      )
  ) q;
  return jsonb_build_object('date',v_day,'routes',v_routes,'collections',v_stops);
end $$;
grant execute on function public.driver_route_collections(date) to authenticated;
