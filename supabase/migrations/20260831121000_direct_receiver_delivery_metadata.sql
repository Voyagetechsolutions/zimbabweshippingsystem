-- Keep delivery-note routing in sync with the direct-receiver £/€25 charge.
create or replace function public.create_customer_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb; v_shipment_id uuid; v_ship public.shipments%rowtype;
  v_invoice jsonb; v_meta jsonb; v_lines jsonb; v_quote_items jsonb := '[]'::jsonb;
  v_item jsonb; v_direct_delivery boolean; v_total numeric;
begin
  v_result := public.create_customer_booking_legacy(p);
  v_shipment_id := (v_result->>'id')::uuid;
  select * into v_ship from public.shipments where id=v_shipment_id for update;
  v_invoice := coalesce(v_ship.metadata->'invoice','{}'::jsonb);
  v_lines := coalesce(v_invoice->'items','[]'::jsonb);
  v_total := coalesce((v_result->>'estimatedTotal')::numeric,0);
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
  update public.shipments set metadata=v_meta where id=v_shipment_id;
  return v_result || jsonb_build_object('estimatedTotal',v_total,'invoice',v_invoice);
end $$;
grant execute on function public.create_customer_booking(jsonb) to authenticated;
