-- Final staff controls: enforce attendance and driver specialism, keep invoice
-- balances synchronized, and run Zimmy checks as finance records change.

create unique index if not exists driver_run_stops_one_active_handover_idx
  on public.driver_run_stops(shipment_id, stop_type)
  where status <> 'failed';

create or replace function public.start_driver_run(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_run public.driver_runs%rowtype; v_type text;
begin
  select * into v_run from public.driver_runs where id=p_run_id for update;
  if not found or v_run.driver_id<>auth.uid() then raise exception 'Run is not assigned to you'; end if;
  if not exists(select 1 from public.driver_attendance where driver_id=auth.uid() and work_date=current_date and clocked_out_at is null) then raise exception 'Clock in before starting your route'; end if;
  select driver_type into v_type from public.profiles where id=auth.uid();
  if coalesce(v_type,'both')<>'both' and v_type<>v_run.run_type then raise exception 'This route does not match your driver specialism'; end if;
  if v_run.run_date<>current_date then raise exception 'Only today''s route can be started'; end if;
  update public.driver_runs set status='active',started_at=coalesce(started_at,now()),updated_at=now() where id=p_run_id returning * into v_run;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details) values(auth.uid(),'START_RUN','DRIVER_RUN',v_run.id,jsonb_build_object('route',v_run.route_name,'runType',v_run.run_type));
  return to_jsonb(v_run);
end $$;

create or replace function public.clock_driver(p_action text, p_note text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_row public.driver_attendance%rowtype;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and lower(coalesce(role,''))='driver') then raise exception 'Driver access required'; end if;
  if p_action='in' then
    insert into public.driver_attendance(driver_id,work_date,clocked_in_at,clock_in_note) values(auth.uid(),current_date,now(),p_note)
    on conflict(driver_id,work_date) do update set clocked_in_at=coalesce(driver_attendance.clocked_in_at,now()),clocked_out_at=null,clock_in_note=coalesce(excluded.clock_in_note,driver_attendance.clock_in_note)
    returning * into v_row;
  elsif p_action='out' then
    if exists(select 1 from public.driver_runs r join public.driver_run_stops s on s.run_id=r.id where r.driver_id=auth.uid() and r.run_date=current_date and r.status='active' and s.status not in('completed','failed')) then raise exception 'Complete or report every active stop before clocking out'; end if;
    update public.driver_attendance set clocked_out_at=now(),clock_out_note=p_note where driver_id=auth.uid() and work_date=current_date returning * into v_row;
    if not found then raise exception 'Clock in before clocking out'; end if;
  else raise exception 'Action must be in or out'; end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details) values(auth.uid(),'CLOCK_'||upper(p_action),'DRIVER_ATTENDANCE',v_row.id,jsonb_build_object('workDate',v_row.work_date));
  return to_jsonb(v_row);
end $$;

create or replace function public.sync_driver_invoice_payment_status() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_paid numeric:=0; v_invoice public.driver_invoices%rowtype;
begin
  if new.shipment_id is null then return new; end if;
  select * into v_invoice from public.driver_invoices where shipment_id=new.shipment_id and status<>'void' order by created_at desc limit 1;
  if not found then return new; end if;
  select coalesce(sum(amount),0) into v_paid from public.payments where shipment_id=new.shipment_id and lower(coalesce(payment_status,'')) in('completed','paid','success','succeeded');
  update public.driver_invoices set status=case when v_paid>=total and total>0 then 'paid' when v_paid>0 then 'partial' when due_date<current_date then 'overdue' else 'issued' end,updated_at=now() where id=v_invoice.id;
  update public.shipments set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{invoice,paid}',to_jsonb(v_paid>=v_invoice.total and v_invoice.total>0),true) where id=new.shipment_id;
  return new;
end $$;
drop trigger if exists sync_driver_invoice_after_payment on public.payments;
create trigger sync_driver_invoice_after_payment after insert or update of amount,payment_status,shipment_id on public.payments for each row execute function public.sync_driver_invoice_payment_status();

create or replace function public.zimmy_watch_expense() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.amount>=1000 and new.status<>'rejected' then
    insert into public.finance_anomalies(anomaly_key,anomaly_type,severity,title,description,entity_type,entity_id,amount)
    values('large-expense:'||new.id,'large_expense','high','Large expense requires review','A recorded expense is GBP 1,000 or more.','expense',new.id,new.amount)
    on conflict(anomaly_key) do update set amount=excluded.amount,detected_at=now(),status=case when finance_anomalies.status in('resolved','dismissed') then 'open' else finance_anomalies.status end;
  end if; return new;
end $$;
drop trigger if exists zimmy_expense_monitor on public.finance_expenses;
create trigger zimmy_expense_monitor after insert or update of amount,status on public.finance_expenses for each row execute function public.zimmy_watch_expense();

create or replace function public.zimmy_watch_payment() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_duplicate uuid;
begin
  if new.transaction_id is not null then
    select id into v_duplicate from public.payments where transaction_id=new.transaction_id and id<>new.id limit 1;
    if found then insert into public.finance_anomalies(anomaly_key,anomaly_type,severity,title,description,entity_type,entity_id,amount)
      values('duplicate-payment:'||new.id,'duplicate_payment','critical','Possible duplicate payment','Another payment uses the same transaction reference.','payment',new.id,new.amount) on conflict(anomaly_key) do nothing; end if;
  end if;
  if new.amount>=5000 then insert into public.finance_anomalies(anomaly_key,anomaly_type,severity,title,description,entity_type,entity_id,amount)
    values('large-payment:'||new.id,'large_payment','high','Large payment received','A payment of GBP 5,000 or more should be independently verified.','payment',new.id,new.amount) on conflict(anomaly_key) do nothing; end if;
  return new;
end $$;
drop trigger if exists zimmy_payment_monitor on public.payments;
create trigger zimmy_payment_monitor after insert or update of amount,transaction_id on public.payments for each row execute function public.zimmy_watch_payment();

create or replace function public.approve_finance_expense(p_expense_id uuid,p_approved boolean,p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_expense public.finance_expenses%rowtype;
begin
  if not public.is_operations_admin() then raise exception 'Admin approval required'; end if;
  update public.finance_expenses set status=case when p_approved then 'approved' else 'rejected' end,approved_by=auth.uid(),updated_at=now() where id=p_expense_id returning * into v_expense;
  if not found then raise exception 'Expense not found'; end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details) values(auth.uid(),case when p_approved then 'APPROVE' else 'REJECT' end,'EXPENSE',p_expense_id,jsonb_build_object('amount',v_expense.amount,'notes',p_notes));
  return to_jsonb(v_expense);
end $$;

grant execute on function public.start_driver_run(uuid) to authenticated;
grant execute on function public.approve_finance_expense(uuid,boolean,text) to authenticated;
