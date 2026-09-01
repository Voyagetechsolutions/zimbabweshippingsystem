-- READY TO RUN IN SUPABASE SQL EDITOR
-- Moves mutable business configuration into RLS-protected database records.
-- API keys and privileged secrets are intentionally excluded.
begin;

-- Source: 20260831130000_database_driven_business_configuration.sql
-- One source of truth for customer-facing and operational business settings.
-- Values that are credentials (service keys, API secrets and signing keys) stay
-- in Supabase secrets/environment variables and are deliberately not stored here.

create table if not exists public.app_configuration (
  key text primary key,
  value jsonb not null,
  audience text not null default 'public' check (audience in ('public','authenticated','staff')),
  description text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_configuration enable row level security;
revoke all on public.app_configuration from anon, authenticated;
grant select on public.app_configuration to anon, authenticated;

drop policy if exists "Public configuration is readable" on public.app_configuration;
create policy "Public configuration is readable" on public.app_configuration
  for select to anon using (active and audience='public');
drop policy if exists "Signed in configuration is readable" on public.app_configuration;
create policy "Signed in configuration is readable" on public.app_configuration
  for select to authenticated using (
    active and (audience in ('public','authenticated') or public.is_staff_member())
  );
drop policy if exists "Staff manage configuration" on public.app_configuration;
create policy "Staff manage configuration" on public.app_configuration
  for all to authenticated using (public.is_staff_member()) with check (public.is_staff_member());

alter table public.catalogue_items
  add column if not exists description text,
  add column if not exists category text not null default 'shipment',
  add column if not exists sort_order integer not null default 0;

update public.catalogue_items set
  description=case id
    when 'plastic_drum' then 'Heavy-duty plastic barrel for securely packed clothes, groceries and household goods. The declared contents are checked at collection.'
    when 'metal_drum' then 'Strong metal drum for securely packed household goods. The lid must be suitable for a coded security seal.'
    when 'trunk' then 'Rigid lockable trunk or storage box for personal and household goods. UK pricing depends on its dimensions; Ireland pricing is EUR 220.'
    when 'seal' then 'Tamper-evident numbered metal seal fitted to a drum or trunk. Its unique code is recorded at collection and checked at delivery.'
    else coalesce(description,note,label)
  end,
  category=case when id='seal' then 'addon' else 'shipment' end,
  sort_order=case id when 'plastic_drum' then 10 when 'metal_drum' then 20 when 'trunk' then 30 when 'seal' then 40 else 100 end;

insert into public.app_configuration(key,value,audience,description) values
('company_profile', jsonb_build_object(
  'name','Zimbabwe Shipping','website','https://zimbabweshipping.com',
  'supportEmail','info@zimbabweshipping.com','ukPhone','+44 7584 100552',
  'irelandPhone','+353 87 988 8653','accountsPhone','+44 7770 761266','whatsappPhone','447584100552',
  'logoUrl','https://zimbabweshipping.com/logo.png','tagline','Family-run since 2011. Founded by Mr Tshakalisa Moyo.','customerCareWhatsApp','447901217618'), 'public', 'Company identity and customer contact channels'),
('booking_fees', jsonb_build_object(
  'doorDeliveryPerAddress',25,'doorCollection',25,'referralDiscount',20,
  'payOnArrivalPremiumPercent',0,'metalDrumPurchase',40,'plasticDrumPurchase',50), 'public', 'Booking fees and discounts'),
('payment_methods', jsonb_build_object('methods',jsonb_build_array(
  jsonb_build_object('id','bank_transfer','label','Bank Transfer','note','Details shared after booking','icon','business-outline'),
  jsonb_build_object('id','cash_on_collection','label','Cash on Collection','note','Pay the driver at your door','icon','cash-outline'),
  jsonb_build_object('id','pay_on_arrival','label','Pay on Arrival','note','Pay when goods reach Zimbabwe','icon','time-outline'),
  jsonb_build_object('id','other_payment','label','Other Payment','note','Use an approved remittance provider','icon','wallet-outline')
), 'otherProviders',jsonb_build_array(
  jsonb_build_object('id','worldremit','label','WorldRemit'),
  jsonb_build_object('id','mukuru','label','Mukuru'),
  jsonb_build_object('id','ria','label','Ria'),
  jsonb_build_object('id','remitly','label','Remitly (select ZB as pickup point)')
), 'otherPaymentInstructions',jsonb_build_object(
  'sendTo','+263771789925','reference','Tshakalisa Moyo'
)), 'public', 'Payment choices and customer remittance instructions'),
('zimbabwe_delivery_places', jsonb_build_object('places',jsonb_build_array(
  'Harare','Bulawayo','Chitungwiza','Mutare','Epworth','Gweru','Kwekwe','Kadoma','Masvingo','Chinhoyi',
  'Victoria Falls','Hwange','Zvishavane','Bindura','Marondera','Chegutu','Beitbridge','Kariba','Chiredzi',
  'Rusape','Plumtree','Ruwa','Norton','Redcliff','Gwanda','Lupane','Gokwe','Shurugwi','Mvuma','Chipinge',
  'Karoi','Mashava','Triangle','Shamva'
)), 'public', 'Zimbabwe towns served by door delivery'),
('uk_route_coverage', jsonb_build_object(
  'restrictedPrefixes',jsonb_build_array('EX','TQ','DT','LD','HR','HU','CA'),
  'routes',jsonb_build_array(
    jsonb_build_object('route','LONDON ROUTE','areas',jsonb_build_array('London and surrounding areas'),'prefixes',jsonb_build_array('EC','WC','N','NW','E','SE','SW','W','EN','IG','RM','DA','BR','UB','HA','WD')),
    jsonb_build_object('route','BIRMINGHAM ROUTE','areas',jsonb_build_array('Birmingham and surrounding areas'),'prefixes',jsonb_build_array('B','CV','WV','DY','WS','WR','SY','TF')),
    jsonb_build_object('route','MANCHESTER ROUTE','areas',jsonb_build_array('Manchester, Liverpool and surrounding areas'),'prefixes',jsonb_build_array('M','L','WA','OL','SK','ST','BB','PR','FY','BL','WN','CW','CH','LL')),
    jsonb_build_object('route','LEEDS ROUTE','areas',jsonb_build_array('Leeds and surrounding areas'),'prefixes',jsonb_build_array('LS','WF','HX','DN','S','HD','YO','BD','HG')),
    jsonb_build_object('route','CARDIFF ROUTE','areas',jsonb_build_array('Cardiff and surrounding areas'),'prefixes',jsonb_build_array('CF','GL','BS','SN','BA','SP','NP','CP','SA')),
    jsonb_build_object('route','BOURNEMOUTH ROUTE','areas',jsonb_build_array('Bournemouth and surrounding areas'),'prefixes',jsonb_build_array('SO','PO','RG','GU','BH','OX')),
    jsonb_build_object('route','NOTTINGHAM ROUTE','areas',jsonb_build_array('Nottingham and surrounding areas'),'prefixes',jsonb_build_array('NG','LE','DE','PE','LN')),
    jsonb_build_object('route','BRIGHTON ROUTE','areas',jsonb_build_array('Brighton and surrounding areas'),'prefixes',jsonb_build_array('BN','RH','SL','TN','CT','CR','TW','KT','ME')),
    jsonb_build_object('route','SOUTHEND ROUTE','areas',jsonb_build_array('Southend and surrounding areas'),'prefixes',jsonb_build_array('NR','IP','CO','CM','CB','SS','SG')),
    jsonb_build_object('route','NORTHAMPTON ROUTE','areas',jsonb_build_array('Northampton and surrounding areas'),'prefixes',jsonb_build_array('MK','LU','AL','HP','NN')),
    jsonb_build_object('route','SCOTLAND ROUTE','areas',jsonb_build_array('Aberdeen','Dundee','Edinburgh','Glasgow','Newcastle','Surrounding areas'),'prefixes',jsonb_build_array('AB','DD','IV','PH','KY','FK','EH','ML','TD','G','PA','KA','DG','NE','DH','SR','DL','TS'))
  )), 'public', 'UK postcode coverage; dates remain in collection_schedules'),
('shipment_journey', jsonb_build_object('stages',jsonb_build_array(
  jsonb_build_object('id','booked','label','Booked'),jsonb_build_object('id','collected','label','Collected'),
  jsonb_build_object('id','warehouse','label','At warehouse'),jsonb_build_object('id','in_transit','label','In transit'),
  jsonb_build_object('id','zimbabwe','label','In Zimbabwe'),jsonb_build_object('id','delivered','label','Delivered')
)), 'public', 'Customer shipment journey stages'),
('operations', jsonb_build_object(
  'vehicleChecklist',jsonb_build_array(
    jsonb_build_object('key','tyres_ok','label','Tyres and wheels'),jsonb_build_object('key','lights_ok','label','Lights and indicators'),
    jsonb_build_object('key','brakes_ok','label','Brakes'),jsonb_build_object('key','mirrors_ok','label','Mirrors and windows'),
    jsonb_build_object('key','condition_ok','label','Body and fluid leaks'),jsonb_build_object('key','cargo_secure','label','Cargo area is safe and secure')),
  'sealConditions',jsonb_build_array('intact','damaged','missing','other'),
  'failedStopReasons',jsonb_build_array(
    jsonb_build_object('id','not_home','label','Customer not home'),jsonb_build_object('id','customer_unavailable','label','Customer unavailable'),
    jsonb_build_object('id','customer_cancelled','label','Customer cancelled'),jsonb_build_object('id','wrong_address','label','Wrong address'),
    jsonb_build_object('id','access_problem','label','Cannot access property'),jsonb_build_object('id','goods_not_ready','label','Package not ready'),
    jsonb_build_object('id','customer_refused','label','Customer refused'),jsonb_build_object('id','damaged_goods','label','Package damaged'),
    jsonb_build_object('id','vehicle_problem','label','Vehicle issue'),jsonb_build_object('id','address_not_found','label','Address cannot be found'),
    jsonb_build_object('id','unsafe_location','label','Unsafe location'),jsonb_build_object('id','other','label','Other')),
  'shipmentStatusOptions',jsonb_build_array('Pending','Confirmed','Collected','In Transit','Zim Warehouse','Out for Delivery','Delivered','Cancelled'),
  'shipmentStatusSteps',jsonb_build_array('Pending','Confirmed','Collected','In Transit','Zim Warehouse','Out for Delivery','Delivered')
), 'staff', 'Driver and warehouse controlled lists')
on conflict(key) do update set value=excluded.value,audience=excluded.audience,
  description=excluded.description,active=true,updated_at=now();

create or replace function public.get_app_configuration() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'configuration',coalesce((select jsonb_object_agg(key,value) from public.app_configuration
      where active and (audience='public' or (auth.uid() is not null and audience='authenticated')
        or (auth.uid() is not null and public.is_staff_member()))),'{}'::jsonb),
    'catalogue',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'label',label,'priceUK',price_uk,'priceIE',price_ie,'note',note,
      'description',description,'category',category,'sortOrder',sort_order
    ) order by sort_order,label) from public.catalogue_items where active),'[]'::jsonb)
  );
$$;
revoke all on function public.get_app_configuration() from public;
grant execute on function public.get_app_configuration() to anon,authenticated;

-- Server-side booking pricing reads the same fee record as every client.
create or replace function public.config_number(p_key text, p_field text, p_default numeric default 0)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((select (value->>p_field)::numeric from public.app_configuration where key=p_key and active),p_default)
$$;
revoke all on function public.config_number(text,text,numeric) from public,anon,authenticated;

-- Remove the final duplicated direct-recipient delivery fee from the wrapper.
create or replace function public.create_customer_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb; v_shipment_id uuid; v_ship public.shipments%rowtype;
  v_invoice jsonb; v_meta jsonb; v_lines jsonb; v_quote_items jsonb := '[]'::jsonb;
  v_item jsonb; v_direct_delivery boolean; v_total numeric; v_delivery_fee numeric;
  v_saved_delivery_count integer := 0; v_old_saved_delivery_total numeric := 0;
begin
  v_result := public.create_customer_booking_legacy(p);
  v_shipment_id := (v_result->>'id')::uuid;
  select * into v_ship from public.shipments where id=v_shipment_id for update;
  v_invoice := coalesce(v_ship.metadata->'invoice','{}'::jsonb);
  v_lines := coalesce(v_invoice->'items','[]'::jsonb);
  v_total := coalesce((v_result->>'estimatedTotal')::numeric,0);
  v_delivery_fee := public.config_number('booking_fees','doorDeliveryPerAddress',0);
  -- The legacy creator performs ownership/reference/audit work. Normalise its
  -- saved-address delivery line to the current database fee immediately.
  select coalesce(sum((line->>'quantity')::integer),0),
         coalesce(sum((line->>'quantity')::numeric * (line->>'unitPrice')::numeric),0)
    into v_saved_delivery_count,v_old_saved_delivery_total
    from jsonb_array_elements(v_lines) line
    where line->>'description' like 'Zimbabwe door delivery (%';
  if v_saved_delivery_count>0 then
    select coalesce(jsonb_agg(case when line->>'description' like 'Zimbabwe door delivery (%'
      then jsonb_set(line,'{unitPrice}',to_jsonb(v_delivery_fee),true) else line end),'[]'::jsonb)
      into v_lines from jsonb_array_elements(v_lines) line;
    v_total := v_total-v_old_saved_delivery_total+(v_saved_delivery_count*v_delivery_fee);
  end if;
  v_direct_delivery := coalesce(p->>'deliveryMethod','door')='door'
    and jsonb_array_length(coalesce(p->'deliveryAddressIds','[]'::jsonb))=0
    and trim(coalesce(p->'recipient'->>'name',''))<>''
    and trim(coalesce(p->'recipient'->>'address',''))<>''
    and trim(coalesce(p->'recipient'->>'city',''))<>'';
  if v_direct_delivery then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description','Zimbabwe door delivery (1 address)','quantity',1,'unitPrice',v_delivery_fee));
    v_total := v_total + v_delivery_fee;
  end if;
  if nullif(p->>'quoteId','') is not null then
    select coalesce(quote_items,'[]'::jsonb) into v_quote_items from public.custom_quotes
      where id=(p->>'quoteId')::uuid and user_id=auth.uid();
    if jsonb_array_length(v_quote_items)>0 then
      select coalesce(jsonb_agg(value),'[]'::jsonb) into v_lines from jsonb_array_elements(v_lines) value
        where value->>'description' not like 'Approved quote:%';
      for v_item in select value from jsonb_array_elements(v_quote_items) loop
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'description',coalesce(v_item->>'description','Custom quote item'),'quantity',1,
          'unitPrice',coalesce((v_item->>'amount')::numeric,0)));
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


-- Source: 20260831131000_normalize_operations_configuration.sql
update public.app_configuration
set value=jsonb_set(value,'{sealConditions}','["intact","damaged","missing","other"]'::jsonb,true),updated_at=now()
where key='operations';


-- Source: 20260831132000_extend_business_configuration.sql
update public.app_configuration set value=value||jsonb_build_object(
  'tradingName','Zimbabwe Shipping Services','founderAndDirector','Mr Tshakalisa Moyo',
  'operatingAddress',jsonb_build_array('Pastures Lodge Farm','Chelveston Road','Wellingborough NN9 6AA','United Kingdom')),
  updated_at=now() where key='company_profile';

update public.app_configuration set value=value||jsonb_build_object(
  'shipmentStatusOptions',jsonb_build_array('Pending','Confirmed','Collected','In Transit','Zim Warehouse','Out for Delivery','Delivered','Cancelled'),
  'shipmentStatusSteps',jsonb_build_array('Pending','Confirmed','Collected','In Transit','Zim Warehouse','Out for Delivery','Delivered')),
  updated_at=now() where key='operations';


-- Source: 20260831133000_customer_care_configuration.sql
update public.app_configuration set value=value||jsonb_build_object('customerCareWhatsApp','447901217618'),updated_at=now()
where key='company_profile';


-- Source: 20260831134000_complete_company_profile_configuration.sql
-- Keep mutable public company/contact content in one RLS-protected source.
update public.app_configuration
set value = value || jsonb_build_object(
  'address', 'Pastures Lodge Farm, Chelveston Road, Wellingborough NN9 6AA, United Kingdom',
  'addressLine1', 'Pastures Lodge Farm, Chelveston Road',
  'addressLine2', '',
  'city', 'Wellingborough',
  'postalCode', 'NN9 6AA',
  'country', 'United Kingdom',
  'noreplyEmail', 'noreply@zimbabweshipping.com',
  'foundedYear', '2011',
  'founderName', 'Mr Tshakalisa Moyo',
  'founderStory', 'Zimbabwe Shipping Services started from hands-on logistics experience. Our founder and director, Mr Tshakalisa Moyo, began as a FedEx driver — learning the importance of careful handling and reliability firsthand — before building Telk Removals and launching Zimbabwe Shipping.',
  'facebookUrl', 'https://www.facebook.com/profile.php?id=61565306426707',
  'instagramUrl', 'https://www.instagram.com/zimbabwe_shipping_services',
  'instagramHandle', '@zimbabwe_shipping_services',
  'tiktokUrl', 'https://www.tiktok.com/@zimbabweshipping',
  'tiktokHandle', '@zimbabweshipping'
), updated_at = now()
where key = 'company_profile';

update public.app_configuration
set value = value || jsonb_build_object('quoteValidityDays', 7), updated_at = now()
where key = 'booking_fees';

update public.app_configuration set value=jsonb_build_object('stages',jsonb_build_array(
  jsonb_build_object('id','booked','label','Booked','title','Booking Confirmed','description','We''re preparing your collection','icon','checkmark-circle-outline'),
  jsonb_build_object('id','collected','label','Collected','title','Collected','description','Your items are safely with our team','icon','cube-outline'),
  jsonb_build_object('id','warehouse','label','At warehouse','title','At Warehouse','description','Your shipment is safely at our warehouse','icon','business-outline'),
  jsonb_build_object('id','in_transit','label','In transit','title','In Transit','description','Your shipment is on the way','icon','boat-outline'),
  jsonb_build_object('id','zimbabwe','label','In Zimbabwe','title','Arrived in Zimbabwe','description','Clearing customs and heading to the depot','icon','flag-outline'),
  jsonb_build_object('id','delivered','label','Delivered','title','Delivered 🎉','description','Thank you for shipping with us','icon','home-outline')
)),updated_at=now() where key='shipment_journey';

insert into public.app_configuration(key, value, audience, description)
values ('route_templates', jsonb_build_object(
  'england', jsonb_build_array(
    jsonb_build_object('route','LONDON','cities',jsonb_build_array('Central London','East London','West London','North London','South London'),'postcodes',jsonb_build_array('EC','WC','N','NW','E','SE','SW','W','EN','IG','RM','DA','BR','UB','HA','WD')),
    jsonb_build_object('route','BIRMINGHAM','cities',jsonb_build_array('Birmingham','Coventry','Wolverhampton','Dudley','Walsall','Worcester','Shrewsbury','Telford'),'postcodes',jsonb_build_array('B','CV','WV','DY','WS','WR','SY','TF')),
    jsonb_build_object('route','MANCHESTER','cities',jsonb_build_array('Manchester','Liverpool','Warrington','Oldham','Stockport','Stoke','Blackburn','Preston','Blackpool','Bolton','Wigan','Crewe','Chester'),'postcodes',jsonb_build_array('M','L','WA','OL','SK','ST','BB','PR','FY','BL','WN','CW','CH','LL')),
    jsonb_build_object('route','LEEDS','cities',jsonb_build_array('Leeds','Wakefield','Halifax','Doncaster','Sheffield','Huddersfield','York','Bradford','Harrogate'),'postcodes',jsonb_build_array('LS','WF','HX','DN','S','HD','YO','BD','HG')),
    jsonb_build_object('route','CARDIFF','cities',jsonb_build_array('Cardiff','Gloucester','Bristol','Swindon','Bath','Salisbury','Newport','Swansea'),'postcodes',jsonb_build_array('CF','GL','BS','SN','BA','SP','NP','SA')),
    jsonb_build_object('route','BOURNEMOUTH','cities',jsonb_build_array('Southampton','Portsmouth','Reading','Guildford','Bournemouth','Oxford'),'postcodes',jsonb_build_array('SO','PO','RG','GU','BH','OX')),
    jsonb_build_object('route','NOTTINGHAM','cities',jsonb_build_array('Nottingham','Leicester','Derby','Peterborough','Lincoln'),'postcodes',jsonb_build_array('NG','LE','DE','PE','LN')),
    jsonb_build_object('route','BRIGHTON','cities',jsonb_build_array('Brighton','Redhill','Slough','Tunbridge Wells','Canterbury','Croydon','Twickenham','Kingston','Maidstone'),'postcodes',jsonb_build_array('BN','RH','SL','TN','CT','CR','TW','KT','ME')),
    jsonb_build_object('route','SOUTHEND','cities',jsonb_build_array('Norwich','Ipswich','Colchester','Chelmsford','Cambridge','Southend','Stevenage'),'postcodes',jsonb_build_array('NR','IP','CO','CM','CB','SS','SG')),
    jsonb_build_object('route','NORTHAMPTON','cities',jsonb_build_array('Milton Keynes','Luton','St Albans','Hemel Hempstead','Northampton'),'postcodes',jsonb_build_array('MK','LU','AL','HP','NN')),
    jsonb_build_object('route','SCOTLAND','cities',jsonb_build_array('Aberdeen','Dundee','Edinburgh','Glasgow','Newcastle','Surrounding areas'),'postcodes',jsonb_build_array('AB','DD','IV','PH','KY','FK','EH','ML','TD','G','PA','KA','DG','NE','DH','SR','DL','TS'))
  ),
  'ireland', jsonb_build_array(
    jsonb_build_object('route','LONDONDERRY','cities',jsonb_build_array('Larne','Ballyclare','Ballymena','Ballymoney','Kilrea','Coleraine','Londonderry','Lifford','Omagh','Cookstown','Carrickfergus'),'postcodes','[]'::jsonb),
    jsonb_build_object('route','BELFAST','cities',jsonb_build_array('Belfast','Bangor','Comber','Lisburn','Newry','Newtownards','Dunmurry','Lurgan','Portadown','Banbridge','Moy','Dungannon','Armagh'),'postcodes','[]'::jsonb),
    jsonb_build_object('route','CAVAN','cities',jsonb_build_array('Maynooth','Ashbourne','Swords','Skerries','Drogheda','Dundalk','Cavan','Virginia','Kells','Navan','Trim'),'postcodes','[]'::jsonb),
    jsonb_build_object('route','ATHLONE','cities',jsonb_build_array('Mullingar','Longford','Roscommon','Boyle','Sligo','Ballina','Swinford','Castlebar','Tuam','Galway','Athenry','Athlone'),'postcodes','[]'::jsonb),
    jsonb_build_object('route','LIMERICK','cities',jsonb_build_array('Newbridge','Portlaoise','Roscrea','Limerick','Ennis','Doolin','Loughrea','Ballinasloe','Tullamore'),'postcodes','[]'::jsonb),
    jsonb_build_object('route','DUBLIN CITY','cities',jsonb_build_array('Sandyford','Rialto','Ballymount','Cabra','Beaumont','Malahide','Portmarnock','Dalkey','Shankill','Bray','Dublin'),'postcodes','[]'::jsonb),
    jsonb_build_object('route','CORK','cities',jsonb_build_array('Cashel','Fermoy','Cork','Dungarvan','Waterford','New Ross','Wexford','Gorey','Greystones'),'postcodes','[]'::jsonb)
  )
), 'staff', 'Admin route templates used to seed collection schedules')
on conflict (key) do update set value=excluded.value,audience=excluded.audience,description=excluded.description,active=true,updated_at=now();

insert into public.app_configuration(key,value,audience,description) values
('system_payment_settings', jsonb_build_object(
  'gbp_to_usd',1.25,'standard_payment',true,'cash_on_collection',true,
  'cash_on_delivery',true,'bank_transfer',true,'paypal_email','', 'stripe_enabled',false
), 'staff', 'Administrative payment feature settings'),
('email_templates', jsonb_build_object(
  'welcome','Welcome to Zimbabwe Shipping! We''re delighted to have you on board.',
  'shipment_confirmation','Your shipment #{tracking_number} has been confirmed.',
  'pickup_scheduled','Your collection has been scheduled for {date}.',
  'payment_received','Thank you for your payment of {amount} for shipment #{tracking_number}.',
  'delivery_notification','Your shipment #{tracking_number} is out for delivery.'
), 'staff', 'Editable operational email templates')
on conflict (key) do update set value=excluded.value,audience=excluded.audience,description=excluded.description,active=true,updated_at=now();


commit;

-- Verification: public callers must not receive staff-only configuration.
select public.get_app_configuration() ? 'configuration' as configuration_available;
