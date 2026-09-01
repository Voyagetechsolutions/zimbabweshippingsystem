update public.app_configuration set value=value||jsonb_build_object(
  'tradingName','Zimbabwe Shipping Services','founderAndDirector','Mr Tshakalisa Moyo',
  'operatingAddress',jsonb_build_array('Pastures Lodge Farm','Chelveston Road','Wellingborough NN9 6AA','United Kingdom')),
  updated_at=now() where key='company_profile';

update public.app_configuration set value=value||jsonb_build_object(
  'shipmentStatusOptions',jsonb_build_array('Pending','Confirmed','Collected','In Transit','Zim Warehouse','Out for Delivery','Delivered','Cancelled'),
  'shipmentStatusSteps',jsonb_build_array('Pending','Confirmed','Collected','In Transit','Zim Warehouse','Out for Delivery','Delivered')),
  updated_at=now() where key='operations';
