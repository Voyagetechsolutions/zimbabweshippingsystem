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
