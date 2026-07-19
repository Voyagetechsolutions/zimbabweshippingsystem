-- Staff operations phase two: driver specialisms, attendance, handover proof,
-- pickup invoices, delivery notes, expenses, and automated finance monitoring.

alter table public.profiles
  add column if not exists driver_type text
    check (driver_type is null or driver_type in ('pickup', 'delivery', 'both'));

alter table public.shipments
  add column if not exists collection_code text,
  add column if not exists delivery_code text;

update public.shipments set
  collection_code = coalesce(collection_code, lpad(floor(random() * 1000000)::text, 6, '0')),
  delivery_code = coalesce(delivery_code, lpad(floor(random() * 1000000)::text, 6, '0'));

alter table public.driver_runs
  add column if not exists route_name text,
  add column if not exists run_type text not null default 'pickup'
    check (run_type in ('pickup', 'delivery')),
  add column if not exists scheduled_start time,
  add column if not exists scheduled_end time;

create table if not exists public.driver_attendance (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete restrict,
  work_date date not null default current_date,
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz,
  clock_in_note text,
  clock_out_note text,
  created_at timestamptz not null default now(),
  unique(driver_id, work_date)
);

create table if not exists public.driver_invoices (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  stop_id uuid not null references public.driver_run_stops(id) on delete restrict,
  driver_id uuid not null references auth.users(id) on delete restrict,
  invoice_number text not null unique,
  issue_date date not null default current_date,
  due_date date not null default (current_date + 7),
  currency text not null default 'GBP',
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  status text not null default 'issued' check (status in ('draft', 'issued', 'partial', 'paid', 'void', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stop_id)
);

create table if not exists public.driver_proofs (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  stop_id uuid not null references public.driver_run_stops(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete restrict,
  proof_type text not null check (proof_type in ('pickup_departure', 'depot_arrival', 'depot_departure', 'delivery_arrival', 'exception')),
  storage_path text not null,
  latitude double precision,
  longitude double precision,
  captured_at timestamptz not null default now(),
  notes text
);

create table if not exists public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  stop_id uuid not null references public.driver_run_stops(id) on delete restrict,
  driver_id uuid not null references auth.users(id) on delete restrict,
  note_number text not null unique,
  recipient_name text,
  delivery_address text,
  delivered_at timestamptz,
  customer_code_verified boolean not null default false,
  proof_count integer not null default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'completed', 'exception', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stop_id)
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'GBP',
  supplier text,
  receipt_url text,
  status text not null default 'recorded' check (status in ('draft', 'recorded', 'approved', 'rejected')),
  recorded_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_anomalies (
  id uuid primary key default gen_random_uuid(),
  anomaly_key text not null unique,
  anomaly_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text not null,
  entity_type text not null,
  entity_id uuid,
  amount numeric(12,2),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text
);

create index if not exists driver_attendance_date_idx on public.driver_attendance(work_date desc, driver_id);
create index if not exists driver_invoices_issue_idx on public.driver_invoices(issue_date desc, status);
create index if not exists driver_proofs_stop_idx on public.driver_proofs(stop_id, proof_type);
create index if not exists delivery_notes_delivered_idx on public.delivery_notes(delivered_at desc, status);
create index if not exists finance_expenses_date_idx on public.finance_expenses(expense_date desc, status);
create index if not exists finance_anomalies_open_idx on public.finance_anomalies(status, severity, detected_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-proofs', 'driver-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760;

alter table public.driver_attendance enable row level security;
alter table public.driver_invoices enable row level security;
alter table public.driver_proofs enable row level security;
alter table public.delivery_notes enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_anomalies enable row level security;

create or replace function public.is_operations_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (is_admin=true or lower(coalesce(role,'')) in ('admin','logistics')))
$$;
create or replace function public.is_finance_staff() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (is_admin=true or lower(coalesce(role,'')) in ('admin','finance')))
$$;

drop policy if exists "Drivers view own attendance" on public.driver_attendance;
create policy "Drivers view own attendance" on public.driver_attendance for select to authenticated using (driver_id=auth.uid() or public.is_operations_admin());
drop policy if exists "Admins manage attendance" on public.driver_attendance;
create policy "Admins manage attendance" on public.driver_attendance for all to authenticated using (public.is_operations_admin()) with check (public.is_operations_admin());
drop policy if exists "Drivers view own invoices" on public.driver_invoices;
create policy "Drivers view own invoices" on public.driver_invoices for select to authenticated using (driver_id=auth.uid() or public.is_operations_admin() or public.is_finance_staff());
drop policy if exists "Finance manage invoices" on public.driver_invoices;
create policy "Finance manage invoices" on public.driver_invoices for update to authenticated using (public.is_finance_staff()) with check (public.is_finance_staff());
drop policy if exists "Staff view proofs" on public.driver_proofs;
create policy "Staff view proofs" on public.driver_proofs for select to authenticated using (driver_id=auth.uid() or public.is_operations_admin() or public.is_finance_staff());
drop policy if exists "Drivers insert own proofs" on public.driver_proofs;
create policy "Drivers insert own proofs" on public.driver_proofs for insert to authenticated with check (driver_id=auth.uid() and exists(select 1 from public.driver_run_stops s join public.driver_runs r on r.id=s.run_id where s.id=stop_id and r.driver_id=auth.uid()));
drop policy if exists "Staff view delivery notes" on public.delivery_notes;
create policy "Staff view delivery notes" on public.delivery_notes for select to authenticated using (driver_id=auth.uid() or public.is_operations_admin() or public.is_finance_staff());
drop policy if exists "Finance manages expenses" on public.finance_expenses;
create policy "Finance manages expenses" on public.finance_expenses for all to authenticated using (public.is_finance_staff()) with check (public.is_finance_staff());
drop policy if exists "Finance views anomalies" on public.finance_anomalies;
create policy "Finance views anomalies" on public.finance_anomalies for select to authenticated using (public.is_finance_staff());
drop policy if exists "Finance updates anomalies" on public.finance_anomalies;
create policy "Finance updates anomalies" on public.finance_anomalies for update to authenticated using (public.is_finance_staff()) with check (public.is_finance_staff());

drop policy if exists "Drivers upload proof photos" on storage.objects;
create policy "Drivers upload proof photos" on storage.objects for insert to authenticated
  with check (bucket_id='driver-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Staff read proof photos" on storage.objects;
create policy "Staff read proof photos" on storage.objects for select to authenticated
  using (bucket_id='driver-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_operations_admin() or public.is_finance_staff()));

create or replace function public.clock_driver(p_action text, p_note text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_row public.driver_attendance%rowtype;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and lower(coalesce(role,''))='driver') then raise exception 'Driver access required'; end if;
  if p_action='in' then
    insert into public.driver_attendance(driver_id,work_date,clocked_in_at,clock_in_note) values(auth.uid(),current_date,now(),p_note)
    on conflict(driver_id,work_date) do update set clocked_in_at=coalesce(driver_attendance.clocked_in_at,now()), clock_in_note=coalesce(excluded.clock_in_note,driver_attendance.clock_in_note)
    returning * into v_row;
  elsif p_action='out' then
    update public.driver_attendance set clocked_out_at=now(),clock_out_note=p_note where driver_id=auth.uid() and work_date=current_date returning * into v_row;
    if not found then raise exception 'Clock in before clocking out'; end if;
  else raise exception 'Action must be in or out'; end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details) values(auth.uid(),'CLOCK_'||upper(p_action),'DRIVER_ATTENDANCE',v_row.id,jsonb_build_object('workDate',v_row.work_date));
  return to_jsonb(v_row);
end $$;

create or replace function public.create_driver_invoice(p_stop_id uuid,p_line_items jsonb,p_discount numeric default 0,p_tax_rate numeric default 0,p_currency text default 'GBP',p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_invoice public.driver_invoices%rowtype; v_subtotal numeric:=0; v_tax numeric:=0; v_total numeric:=0; v_number text;
begin
  select * into v_stop from public.driver_run_stops where id=p_stop_id; if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id;
  if v_run.driver_id<>auth.uid() or v_stop.stop_type<>'collection' then raise exception 'Pickup driver access required'; end if;
  if v_stop.status<>'arrived' then raise exception 'Mark the collection as arrived first'; end if;
  if jsonb_typeof(p_line_items)<>'array' or jsonb_array_length(p_line_items)=0 then raise exception 'Add at least one invoice item'; end if;
  select coalesce(sum(coalesce((x->>'quantity')::numeric,0)*coalesce((x->>'unitPrice')::numeric,0)),0) into v_subtotal from jsonb_array_elements(p_line_items) x;
  v_tax:=greatest(0,v_subtotal-coalesce(p_discount,0))*greatest(0,coalesce(p_tax_rate,0))/100; v_total:=greatest(0,v_subtotal-coalesce(p_discount,0))+v_tax;
  v_number:='INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_stop.id::text,'-',''),1,6));
  insert into public.driver_invoices(shipment_id,stop_id,driver_id,invoice_number,currency,line_items,subtotal,discount,tax,total,notes)
  values(v_stop.shipment_id,v_stop.id,auth.uid(),v_number,upper(p_currency),p_line_items,v_subtotal,coalesce(p_discount,0),v_tax,v_total,p_notes)
  on conflict(stop_id) do update set line_items=excluded.line_items,subtotal=excluded.subtotal,discount=excluded.discount,tax=excluded.tax,total=excluded.total,notes=excluded.notes,updated_at=now()
  returning * into v_invoice;
  update public.shipments set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('invoice',jsonb_build_object('invoiceNumber',v_invoice.invoice_number,'issueDate',v_invoice.issue_date,'dueDate',v_invoice.due_date,'items',v_invoice.line_items,'discount',v_invoice.discount,'taxRate',p_tax_rate,'currency',v_invoice.currency,'sentAt',now())) where id=v_stop.shipment_id;
  return to_jsonb(v_invoice);
end $$;

create or replace function public.complete_driver_handover(p_stop_id uuid,p_customer_code text,p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_stop public.driver_run_stops%rowtype; v_run public.driver_runs%rowtype; v_ship public.shipments%rowtype; v_now timestamptz:=now(); v_proofs int:=0; v_note text;
begin
  select * into v_stop from public.driver_run_stops where id=p_stop_id for update; if not found then raise exception 'Stop not found'; end if;
  select * into v_run from public.driver_runs where id=v_stop.run_id; if v_run.driver_id<>auth.uid() then raise exception 'Stop is not assigned to you'; end if;
  if v_stop.status<>'arrived' then raise exception 'Mark the stop as arrived first'; end if;
  select * into v_ship from public.shipments where id=v_stop.shipment_id for update;
  select count(*) into v_proofs from public.driver_proofs where stop_id=v_stop.id;
  if v_stop.stop_type='collection' then
    if not exists(select 1 from public.driver_invoices where stop_id=v_stop.id and status<>'void') then raise exception 'Create the invoice before collection'; end if;
    if not exists(select 1 from public.driver_proofs where stop_id=v_stop.id and proof_type='pickup_departure') then raise exception 'Take a goods photo before leaving the pickup address'; end if;
    if trim(coalesce(p_customer_code,''))<>v_ship.collection_code then raise exception 'The customer collection code is incorrect'; end if;
    update public.shipments set status='Collected',driver_status='collected',updated_at=v_now,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('collectionConfirmation',jsonb_build_object('codeVerified',true,'collectedAt',v_now,'driverId',auth.uid(),'proofCount',v_proofs,'notes',p_notes)) where id=v_ship.id;
  else
    if not exists(select 1 from public.driver_proofs where stop_id=v_stop.id and proof_type='delivery_arrival') then raise exception 'Take a delivery photo before completing this stop'; end if;
    if trim(coalesce(p_customer_code,''))<>v_ship.delivery_code then raise exception 'The customer delivery code is incorrect'; end if;
    v_note:='DN-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_stop.id::text,'-',''),1,6));
    insert into public.delivery_notes(shipment_id,stop_id,driver_id,note_number,delivery_address,delivered_at,customer_code_verified,proof_count,notes,status)
    values(v_ship.id,v_stop.id,auth.uid(),v_note,v_stop.address,v_now,true,v_proofs,p_notes,'completed') on conflict(stop_id) do update set delivered_at=v_now,customer_code_verified=true,proof_count=v_proofs,notes=p_notes,status='completed',updated_at=v_now;
    update public.shipments set status='Delivered',driver_status='delivered',delivery_note_status='Completed',updated_at=v_now,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('deliveryConfirmation',jsonb_build_object('codeVerified',true,'deliveredAt',v_now,'driverId',auth.uid(),'proofCount',v_proofs,'deliveryNote',v_note,'notes',p_notes)) where id=v_ship.id;
  end if;
  update public.driver_run_stops set status='completed',completed_at=v_now,updated_at=v_now where id=v_stop.id;
  if not exists(select 1 from public.driver_run_stops where run_id=v_run.id and status not in('completed','failed')) then update public.driver_runs set status='completed',completed_at=v_now,updated_at=v_now where id=v_run.id; end if;
  insert into public.shipment_events(shipment_id,event_type,previous_status,new_status,actor_id,details) values(v_ship.id,case when v_stop.stop_type='collection' then 'collection_code_verified' else 'delivery_code_verified' end,v_ship.status,case when v_stop.stop_type='collection' then 'Collected' else 'Delivered' end,auth.uid(),jsonb_build_object('runId',v_run.id,'stopId',v_stop.id,'proofCount',v_proofs));
  return jsonb_build_object('shipmentId',v_ship.id,'status',case when v_stop.stop_type='collection' then 'Collected' else 'Delivered' end,'proofCount',v_proofs,'deliveryNote',v_note);
end $$;

create or replace function public.refresh_finance_anomalies() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;
  insert into public.finance_anomalies(anomaly_key,anomaly_type,severity,title,description,entity_type,entity_id,amount)
  select 'unreconciled:'||p.id,'unreconciled_payment',case when p.amount>=1000 then 'high' else 'medium' end,'Payment needs reconciliation','Payment has remained unreconciled for more than seven days.','payment',p.id,p.amount from public.payments p where p.reconciled_at is null and p.created_at<now()-interval '7 days'
  on conflict(anomaly_key) do nothing;
  insert into public.finance_anomalies(anomaly_key,anomaly_type,severity,title,description,entity_type,entity_id,amount)
  select 'overdue:'||i.id,'overdue_invoice',case when i.total>=1000 then 'high' else 'medium' end,'Invoice is overdue','A customer invoice is past its due date and is not paid.','invoice',i.id,i.total from public.driver_invoices i where i.due_date<current_date and i.status not in('paid','void')
  on conflict(anomaly_key) do nothing;
  insert into public.finance_anomalies(anomaly_key,anomaly_type,severity,title,description,entity_type,entity_id,amount)
  select 'large-expense:'||e.id,'large_expense','high','Large expense requires review','A recorded expense is GBP 1,000 or more.','expense',e.id,e.amount from public.finance_expenses e where e.amount>=1000 and e.status<>'rejected'
  on conflict(anomaly_key) do nothing;
  select count(*) into v_count from public.finance_anomalies where status='open'; return v_count;
end $$;

grant execute on function public.clock_driver(text,text) to authenticated;
grant execute on function public.create_driver_invoice(uuid,jsonb,numeric,numeric,text,text) to authenticated;
grant execute on function public.complete_driver_handover(uuid,text,text) to authenticated;
grant execute on function public.refresh_finance_anomalies() to authenticated;
