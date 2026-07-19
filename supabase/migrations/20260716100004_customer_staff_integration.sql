-- Customer/staff integration: onboarding identity, postcode notifications,
-- payment proof, driver/service feedback, and QR handover verification.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone_number text,
  add column if not exists pickup_address text,
  add column if not exists pickup_city text,
  add column if not exists postal_code text,
  add column if not exists country text default 'United Kingdom',
  add column if not exists customer_code text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists preferred_theme text not null default 'system' check (preferred_theme in ('light','dark','system')),
  add column if not exists notification_preferences jsonb not null default '{"schedule":true,"shipment":true,"finance":true}'::jsonb;

create unique index if not exists profiles_customer_code_unique on public.profiles(customer_code) where customer_code is not null;

create or replace function public.build_customer_code(p_name text,p_phone text,p_joined timestamptz) returns text
language sql immutable as $$
  select upper(rpad(left(regexp_replace(coalesce(p_name,''),'[^A-Za-z]','','g'),3),3,'X'))||'-'||to_char(coalesce(p_joined,now()),'MMYY')||'-'||lpad(right(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),4),4,'0')
$$;

create or replace function public.set_customer_code() returns trigger language plpgsql set search_path=public as $$
begin
  if coalesce(new.full_name,'')<>'' and coalesce(new.phone_number,'')<>'' then new.customer_code:=public.build_customer_code(new.full_name,new.phone_number,new.created_at); end if;
  return new;
end $$;
drop trigger if exists profiles_customer_code_trigger on public.profiles;
create trigger profiles_customer_code_trigger before insert or update of full_name,phone_number on public.profiles for each row execute function public.set_customer_code();
update public.profiles set full_name=full_name where full_name is not null and phone_number is not null and customer_code is null;

create or replace function public.ensure_shipment_handover_codes() returns trigger language plpgsql set search_path=public as $$
begin
  new.collection_code:=coalesce(new.collection_code,lpad(floor(random()*1000000)::text,6,'0'));
  new.delivery_code:=coalesce(new.delivery_code,lpad(floor(random()*1000000)::text,6,'0'));
  return new;
end $$;
drop trigger if exists shipment_handover_codes_trigger on public.shipments;
create trigger shipment_handover_codes_trigger before insert on public.shipments for each row execute function public.ensure_shipment_handover_codes();

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete set null,
  billing_month date not null,
  amount numeric(12,2),
  currency text not null default 'GBP',
  storage_path text not null,
  file_name text,
  status text not null default 'pending' check(status in('pending','verified','rejected')),
  customer_notes text,
  finance_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payment_proofs_user_month_idx on public.payment_proofs(user_id,billing_month desc);
create index if not exists payment_proofs_status_idx on public.payment_proofs(status,created_at desc);

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete set null,
  driver_id uuid references auth.users(id) on delete set null,
  driver_rating integer check(driver_rating between 1 and 5),
  goods_rating integer check(goods_rating between 1 and 5),
  service_rating integer not null check(service_rating between 1 and 5),
  goods_condition text check(goods_condition is null or goods_condition in('excellent','good','damaged','missing_item')),
  comments text,
  needs_attention boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id,shipment_id)
);
create index if not exists customer_feedback_attention_idx on public.customer_feedback(needs_attention,created_at desc);

alter table public.driver_run_stops add column if not exists qr_verified_at timestamptz;

create or replace function public.require_qr_before_driver_invoice() returns trigger language plpgsql set search_path=public as $$
begin if not exists(select 1 from public.driver_run_stops where id=new.stop_id and qr_verified_at is not null) then raise exception 'Scan the customer shipment QR before creating the invoice';end if;return new;end $$;
drop trigger if exists driver_invoice_requires_qr on public.driver_invoices;
create trigger driver_invoice_requires_qr before insert or update on public.driver_invoices for each row execute function public.require_qr_before_driver_invoice();
alter table public.payment_proofs enable row level security;
alter table public.customer_feedback enable row level security;

drop policy if exists "Customers manage own payment proofs" on public.payment_proofs;
create policy "Customers manage own payment proofs" on public.payment_proofs for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "Customers view own payment proofs" on public.payment_proofs;
create policy "Customers view own payment proofs" on public.payment_proofs for select to authenticated using(user_id=auth.uid() or public.is_finance_staff() or public.is_operations_admin());
drop policy if exists "Finance reviews payment proofs" on public.payment_proofs;
create policy "Finance reviews payment proofs" on public.payment_proofs for update to authenticated using(public.is_finance_staff()) with check(public.is_finance_staff());
drop policy if exists "Customers create own feedback" on public.customer_feedback;
create policy "Customers create own feedback" on public.customer_feedback for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.shipments s where s.id=shipment_id and s.user_id=auth.uid()));
drop policy if exists "Customers view own feedback" on public.customer_feedback;
create policy "Customers view own feedback" on public.customer_feedback for select to authenticated using(user_id=auth.uid() or public.is_operations_admin() or public.is_finance_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760;
drop policy if exists "Customers upload payment proof" on storage.objects;
create policy "Customers upload payment proof" on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Customers and finance read payment proof" on storage.objects;
create policy "Customers and finance read payment proof" on storage.objects for select to authenticated using(bucket_id='payment-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_finance_staff() or public.is_operations_admin()));

drop policy if exists "Customers update own profile" on public.profiles;
create policy "Customers update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists "Customers view own notifications" on public.notifications;
create policy "Customers view own notifications" on public.notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "Customers update own notifications" on public.notifications;
create policy "Customers update own notifications" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.verify_driver_stop_qr(p_stop_id uuid,p_qr_token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype;v_run public.driver_runs%rowtype;v_ship public.shipments%rowtype;
begin
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update;if not found then raise exception 'Stop not found';end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id;if v_run.driver_id<>auth.uid() then raise exception 'Stop is not assigned to you';end if;
  select * into v_ship from public.shipments where id=v_stop.shipment_id and qr_token=p_qr_token;if not found then raise exception 'QR code does not match this shipment';end if;
  update public.driver_run_stops set qr_verified_at=now(),updated_at=now() where id=v_stop.id;
  insert into public.shipment_events(shipment_id,event_type,previous_status,new_status,actor_id,details) values(v_ship.id,'customer_qr_verified',v_ship.status,v_ship.status,auth.uid(),jsonb_build_object('stopId',v_stop.id,'signatureMethod','customer_qr'));
  return jsonb_build_object('verified',true,'shipmentId',v_ship.id,'trackingNumber',v_ship.tracking_number);
end $$;

create or replace function public.notify_customer_shipment_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.user_id is not null and old.status is distinct from new.status and coalesce((select (notification_preferences->>'shipment')::boolean from public.profiles where id=new.user_id),true) then
    insert into public.notifications(user_id,title,message,type,related_id) values(new.user_id,'Shipment update',coalesce(new.customer_reference,new.tracking_number)||' is now '||new.status,'shipment',new.id);
  end if;return new;
end $$;
drop trigger if exists customer_shipment_notification on public.shipments;
create trigger customer_shipment_notification after update of status on public.shipments for each row execute function public.notify_customer_shipment_change();

create or replace function public.notify_customer_booking() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.user_id is not null then insert into public.notifications(user_id,title,message,type,related_id) values(new.user_id,'Booking confirmed',coalesce(new.customer_reference,new.tracking_number)||' has been booked. Your QR and handover codes are ready.','shipment',new.id);end if;return new;end $$;
drop trigger if exists customer_booking_notification on public.shipments;
create trigger customer_booking_notification after insert on public.shipments for each row execute function public.notify_customer_booking();

create or replace function public.notify_customer_invoice() returns trigger language plpgsql security definer set search_path=public as $$
declare v_user uuid;begin select user_id into v_user from public.shipments where id=new.shipment_id;if v_user is not null and coalesce((select (notification_preferences->>'finance')::boolean from public.profiles where id=v_user),true) then insert into public.notifications(user_id,title,message,type,related_id) values(v_user,'Invoice ready',new.invoice_number||' for '||new.currency||' '||to_char(new.total,'FM999999990.00')||' is available.','finance',new.shipment_id);end if;return new;end $$;
drop trigger if exists customer_invoice_notification on public.driver_invoices;
create trigger customer_invoice_notification after insert on public.driver_invoices for each row execute function public.notify_customer_invoice();

create or replace function public.notify_matching_postcodes() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,title,message,type,related_id)
  select p.id,'New collection date for your area',new.route||' is scheduled for '||new.pickup_date,'schedule',new.id
  from public.profiles p where p.onboarding_completed=true and coalesce((p.notification_preferences->>'schedule')::boolean,true)=true
    and ((lower(coalesce(p.country,'')) like '%ireland%' and p.pickup_city is not null and new.areas::text ilike '%'||p.pickup_city||'%') or (lower(coalesce(p.country,'')) not like '%ireland%' and p.postal_code is not null and upper(regexp_replace(new.areas::text,'[^A-Z0-9]','','g')) like '%'||left(upper(regexp_replace(p.postal_code,'[^A-Z0-9]','','g')),greatest(length(regexp_replace(p.postal_code,'[^A-Z0-9]','','g'))-3,3))||'%'))
    and not exists(select 1 from public.notifications n where n.user_id=p.id and n.type='schedule' and n.related_id=new.id);
  return new;
end $$;
drop trigger if exists schedule_postcode_notification on public.collection_schedules;
create trigger schedule_postcode_notification after insert or update of pickup_date,areas on public.collection_schedules for each row execute function public.notify_matching_postcodes();

create or replace function public.complete_driver_handover(p_stop_id uuid,p_customer_code text,p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype;v_run public.driver_runs%rowtype;v_ship public.shipments%rowtype;v_now timestamptz:=now();v_proofs int:=0;v_note text;
begin
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update;if not found then raise exception 'Stop not found';end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id;if v_run.driver_id<>auth.uid() then raise exception 'Stop is not assigned to you';end if;
  if v_stop.status<>'arrived' then raise exception 'Mark the stop as arrived first';end if;
  if v_stop.qr_verified_at is null then raise exception 'Scan the customer shipment QR code first';end if;
  select * into v_ship from public.shipments where id=v_stop.shipment_id for update;select count(*) into v_proofs from public.driver_proofs where stop_id=v_stop.id;
  if v_stop.stop_type='collection' then
    if not exists(select 1 from public.driver_invoices where stop_id=v_stop.id and status<>'void') then raise exception 'Create the invoice before collection';end if;
    if not exists(select 1 from public.driver_proofs where stop_id=v_stop.id and proof_type='pickup_departure') then raise exception 'Take a goods photo before leaving the pickup address';end if;
    if trim(coalesce(p_customer_code,''))<>v_ship.collection_code then raise exception 'The customer collection code is incorrect';end if;
    update public.shipments set status='Collected',driver_status='collected',updated_at=v_now where id=v_ship.id;
  else
    if not exists(select 1 from public.driver_proofs where stop_id=v_stop.id and proof_type='delivery_arrival') then raise exception 'Take a delivery photo before completing this stop';end if;
    if trim(coalesce(p_customer_code,''))<>v_ship.delivery_code then raise exception 'The customer delivery code is incorrect';end if;
    v_note:='DN-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_stop.id::text,'-',''),1,6));
    insert into public.delivery_notes(shipment_id,stop_id,driver_id,note_number,delivery_address,delivered_at,customer_code_verified,proof_count,notes,status) values(v_ship.id,v_stop.id,auth.uid(),v_note,v_stop.address,v_now,true,v_proofs,p_notes,'completed') on conflict(stop_id) do update set delivered_at=v_now,customer_code_verified=true,proof_count=v_proofs,notes=p_notes,status='completed',updated_at=v_now;
    update public.shipments set status='Delivered',driver_status='delivered',delivery_note_status='Completed',updated_at=v_now where id=v_ship.id;
  end if;
  update public.driver_run_stops set status='completed',completed_at=v_now,updated_at=v_now where id=v_stop.id;
  if not exists(select 1 from public.driver_run_stops where run_id=v_run.id and status not in('completed','failed')) then update public.driver_runs set status='completed',completed_at=v_now,updated_at=v_now where id=v_run.id;end if;
  return jsonb_build_object('shipmentId',v_ship.id,'status',case when v_stop.stop_type='collection' then 'Collected' else 'Delivered' end,'proofCount',v_proofs,'deliveryNote',v_note);
end $$;

grant execute on function public.verify_driver_stop_qr(uuid,text) to authenticated;

create or replace function public.review_payment_proof(p_proof_id uuid,p_approved boolean,p_finance_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_proof public.payment_proofs%rowtype;v_payment_id uuid;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required';end if;
  update public.payment_proofs set status=case when p_approved then 'verified' else 'rejected' end,finance_notes=p_finance_notes,reviewed_by=auth.uid(),reviewed_at=now() where id=p_proof_id returning * into v_proof;
  if not found then raise exception 'Payment proof not found';end if;
  if p_approved and v_proof.amount is not null and v_proof.shipment_id is not null then
    insert into public.payments(amount,currency,payment_method,payment_status,shipment_id,user_id,transaction_id)
    values(v_proof.amount,v_proof.currency,'proof_upload','completed',v_proof.shipment_id,v_proof.user_id,'PROOF-'||v_proof.id)
    on conflict do nothing returning id into v_payment_id;
  end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details) values(auth.uid(),case when p_approved then 'VERIFY' else 'REJECT' end,'PAYMENT_PROOF',v_proof.id,jsonb_build_object('amount',v_proof.amount,'paymentId',v_payment_id,'notes',p_finance_notes));
  insert into public.notifications(user_id,title,message,type,related_id) values(v_proof.user_id,case when p_approved then 'Payment proof verified' else 'Payment proof needs attention' end,case when p_approved then 'Finance verified your payment proof for '||to_char(v_proof.billing_month,'Mon YYYY')||'.' else 'Finance could not verify your payment proof. Open billing or contact the team.' end,'finance',v_proof.shipment_id);
  return jsonb_build_object('proofId',v_proof.id,'status',v_proof.status,'paymentId',v_payment_id);
end $$;
grant execute on function public.review_payment_proof(uuid,boolean,text) to authenticated;

do $$ begin alter publication supabase_realtime add table public.shipments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
