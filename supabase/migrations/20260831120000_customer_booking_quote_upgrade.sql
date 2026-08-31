-- Customer booking catalogue, itemized quotes and safe customer edits.

alter table public.custom_quotes
  add column if not exists quote_items jsonb not null default '[]'::jsonb,
  add column if not exists request_type text not null default 'custom';

insert into public.catalogue_items (id, label, price_uk, price_ie, note, active) values
  ('plastic_drum', 'Plastic shipping drum (200-220L)', 280, 360, null, true),
  ('metal_drum', 'Metal shipping drum (200-220L)', 280, 360, null, true),
  ('trunk', 'Trunk / storage box', null, 220, 'UK £180-£280 depending on size - team confirms item by item', true),
  ('seal', 'Metal coded seal', 5, 6, null, true)
on conflict (id) do update set label=excluded.label, price_uk=excluded.price_uk,
  price_ie=excluded.price_ie, note=excluded.note, active=excluded.active;

update public.catalogue_items set active=false
where id not in ('plastic_drum','metal_drum','trunk','seal');

-- Preserve the proven booking creator and decorate its result with the two new
-- pricing rules. This avoids duplicating its reference, audit and notification logic.
do $$
begin
  if to_regprocedure('public.create_customer_booking_legacy(jsonb)') is null then
    execute 'alter function public.create_customer_booking(jsonb) rename to create_customer_booking_legacy';
  end if;
end $$;

create or replace function public.create_customer_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb;
  v_shipment_id uuid;
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_meta jsonb;
  v_lines jsonb;
  v_quote_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_direct_delivery boolean;
  v_total numeric;
begin
  v_result := public.create_customer_booking_legacy(p);
  v_shipment_id := (v_result->>'id')::uuid;
  select * into v_ship from public.shipments where id=v_shipment_id for update;
  v_invoice := coalesce(v_ship.metadata->'invoice','{}'::jsonb);
  v_lines := coalesce(v_invoice->'items','[]'::jsonb);
  v_total := coalesce((v_result->>'estimatedTotal')::numeric,0);

  -- A directly entered receiver is one paid door-delivery address too.
  v_direct_delivery := coalesce(p->>'deliveryMethod','door')='door'
    and jsonb_array_length(coalesce(p->'deliveryAddressIds','[]'::jsonb))=0
    and trim(coalesce(p->'recipient'->>'name',''))<>''
    and trim(coalesce(p->'recipient'->>'address',''))<>''
    and trim(coalesce(p->'recipient'->>'city',''))<>'';
  if v_direct_delivery then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description','Zimbabwe door delivery (1 address)','quantity',1,'unitPrice',25));
    v_total := v_total + 25;
  end if;

  -- Replace the single approved-quote row with the staff-priced customer rows.
  if nullif(p->>'quoteId','') is not null then
    select coalesce(quote_items,'[]'::jsonb) into v_quote_items
    from public.custom_quotes where id=(p->>'quoteId')::uuid and user_id=auth.uid();
    if jsonb_array_length(v_quote_items)>0 then
      select coalesce(jsonb_agg(value),'[]'::jsonb) into v_lines
      from jsonb_array_elements(v_lines) value
      where value->>'description' not like 'Approved quote:%';
      for v_item in select value from jsonb_array_elements(v_quote_items) loop
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'description',coalesce(v_item->>'description','Custom quote item'),
          'quantity',1,'unitPrice',coalesce((v_item->>'amount')::numeric,0)));
      end loop;
    end if;
  end if;

  v_invoice := jsonb_set(v_invoice,'{items}',v_lines,true);
  v_meta := jsonb_set(coalesce(v_ship.metadata,'{}'::jsonb),'{invoice}',v_invoice,true);
  v_meta := jsonb_set(v_meta,'{pricing,estimatedTotal}',to_jsonb(v_total),true);
  if v_direct_delivery then
    v_meta := jsonb_set(v_meta,'{pricing,deliveryAddressCount}','1'::jsonb,true);
    v_meta := jsonb_set(v_meta,'{pricing,doorDelivery}','true'::jsonb,true);
  end if;
  update public.shipments set metadata = v_meta
  where id=v_shipment_id;
  return v_result || jsonb_build_object('estimatedTotal',v_total,'invoice',v_invoice);
end $$;
grant execute on function public.create_customer_booking(jsonb) to authenticated;

-- Customers can correct the contact/address/date details of a booking until a
-- driver has started collection. Ownership and editable status are enforced here.
create or replace function public.update_customer_shipment(p_shipment_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_ship public.shipments%rowtype; v_meta jsonb; v_schedule public.collection_schedules%rowtype;
begin
  select * into v_ship from public.shipments where id=p_shipment_id and user_id=auth.uid() for update;
  if not found then raise exception 'Shipment not found'; end if;
  if lower(coalesce(v_ship.collection_status,'')) not in ('','awaiting collection')
     or lower(coalesce(v_ship.driver_status,'')) in ('en_route','arrived','collected','completed') then
    raise exception 'This shipment can no longer be edited because collection has started';
  end if;
  if nullif(p->>'scheduleId','') is not null then
    select * into v_schedule from public.collection_schedules where id=(p->>'scheduleId')::uuid;
    if not found then raise exception 'Collection date not found'; end if;
  end if;
  v_meta := coalesce(v_ship.metadata,'{}'::jsonb);
  v_meta := jsonb_set(v_meta,'{sender}',coalesce(p->'sender',v_meta->'sender'),true);
  v_meta := jsonb_set(v_meta,'{recipient}',coalesce(p->'recipient',v_meta->'recipient'),true);
  v_meta := jsonb_set(v_meta,'{collection}',jsonb_build_object(
    'route',coalesce(p->>'route',v_meta->'collection'->>'route','To be assigned'),
    'date',coalesce(p->>'collectionDate',v_meta->'collection'->>'date','To be confirmed'),
    'scheduleId',nullif(p->>'scheduleId','')),true);
  v_meta := jsonb_set(v_meta,'{pricing,paymentMethod}',to_jsonb(coalesce(p->>'paymentMethod',v_meta->'pricing'->>'paymentMethod','Bank Transfer')),true);
  update public.shipments set
    origin=coalesce(p->>'origin',origin), destination=coalesce(p->>'destination',destination),
    collection_schedule_id=nullif(p->>'scheduleId','')::uuid,
    metadata=v_meta, updated_at=now()
  where id=p_shipment_id returning * into v_ship;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details)
  values(auth.uid(),'CUSTOMER_EDIT_BOOKING','SHIPMENT',p_shipment_id,p);
  return jsonb_build_object('id',v_ship.id,'updatedAt',v_ship.updated_at);
end $$;
grant execute on function public.update_customer_shipment(uuid,jsonb) to authenticated;
