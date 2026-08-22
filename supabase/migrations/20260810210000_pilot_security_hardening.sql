-- Production-pilot security hardening.
--
-- Keep customer, driver, operations and finance access separate; prevent
-- self-service profile edits from becoming privilege escalation; and make
-- sensitive finance changes auditable even if they originate outside the UI.

-- Remove legacy policies that exposed whole tables to anonymous tracking.
-- Public tracking now goes through get_shipment_tracking_info(), which returns
-- a deliberately limited status payload.
drop policy if exists "Allow tracking by tracking number" on public.shipments;
drop policy if exists "Allow public select from shipments" on public.shipments;
drop policy if exists "Allow public select from payments" on public.payments;
drop policy if exists "Allow public select from receipts" on public.receipts;

create or replace function public.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (is_admin = true or lower(coalesce(role, '')) = 'admin')
  );
$$;
revoke all on function public.is_full_admin() from public, anon;
grant execute on function public.is_full_admin() to authenticated;

-- A customer may edit their own contact details, but never their staff role or
-- operational state. Admin/service-role updates continue to work.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_full_admin() then
    new.role := old.role;
    new.is_admin := old.is_admin;
    new.staff_active := old.staff_active;
    new.on_leave := old.on_leave;
    new.driver_type := old.driver_type;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges_before_update on public.profiles;
create trigger protect_profile_privileges_before_update
before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- Drivers only read shipments explicitly assigned to them. Shared-route
-- discovery remains available through driver_route_collections(), which
-- returns a deliberately limited payload.
drop policy if exists "Customers read own shipments" on public.shipments;
create policy "Customers read own shipments" on public.shipments
  for select to authenticated
  using (
    user_id = auth.uid()
    or assigned_driver_id = auth.uid()
    or public.is_operations_admin()
    or public.is_finance_staff()
  );

-- Payment and receipt records are customer/finance data, not general staff
-- data. Admins remain included through is_finance_staff().
drop policy if exists "Customers read own payments" on public.payments;
create policy "Customers read own payments" on public.payments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_finance_staff()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Customers read own receipts" on public.receipts;
create policy "Customers read own receipts" on public.receipts
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_finance_staff()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Customers view own payment proofs" on public.payment_proofs;
create policy "Customers view own payment proofs" on public.payment_proofs
  for select to authenticated
  using (user_id = auth.uid() or public.is_finance_staff());

-- Proof decisions must use review_payment_proof(), which creates the payment,
-- audit entry and customer notification atomically.
drop policy if exists "Finance reviews payment proofs" on public.payment_proofs;

drop policy if exists "Customers and finance read payment proof" on storage.objects;
create policy "Customers and finance read payment proof" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_finance_staff())
  );

-- Finance can prepare recorded expenses. Only operations admins can approve or
-- reject them through approve_finance_expense().
drop policy if exists "Finance manages expenses" on public.finance_expenses;
drop policy if exists "Finance views expenses" on public.finance_expenses;
drop policy if exists "Finance creates recorded expenses" on public.finance_expenses;
drop policy if exists "Finance edits recorded expenses" on public.finance_expenses;
drop policy if exists "Finance deletes recorded expenses" on public.finance_expenses;
drop policy if exists "Admins manage expenses" on public.finance_expenses;

create policy "Finance views expenses" on public.finance_expenses
  for select to authenticated using (public.is_finance_staff());
create policy "Finance creates recorded expenses" on public.finance_expenses
  for insert to authenticated
  with check (public.is_finance_staff() and status = 'recorded' and approved_by is null);
create policy "Finance edits recorded expenses" on public.finance_expenses
  for update to authenticated
  using (public.is_finance_staff() and status = 'recorded')
  with check (public.is_finance_staff() and status = 'recorded' and approved_by is null);
create policy "Finance deletes recorded expenses" on public.finance_expenses
  for delete to authenticated
  using (public.is_finance_staff() and status = 'recorded');
create policy "Admins manage expenses" on public.finance_expenses
  for all to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin());

create or replace function public.approve_finance_expense(
  p_expense_id uuid,
  p_approved boolean,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_expense public.finance_expenses%rowtype;
begin
  if not public.is_full_admin() then raise exception 'Full admin approval required'; end if;
  update public.finance_expenses set
    status = case when p_approved then 'approved' else 'rejected' end,
    approved_by = auth.uid(), updated_at = now()
  where id = p_expense_id and status = 'recorded'
  returning * into v_expense;
  if not found then raise exception 'Recorded expense not found'; end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_approved then 'APPROVE' else 'REJECT' end,
    'EXPENSE', p_expense_id,
    jsonb_build_object('amount', v_expense.amount, 'currency', v_expense.currency, 'notes', p_notes));
  return to_jsonb(v_expense);
end;
$$;
revoke all on function public.approve_finance_expense(uuid, boolean, text) from public, anon;
grant execute on function public.approve_finance_expense(uuid, boolean, text) to authenticated;

-- Finance does not need the operational claim table itself. It receives the
-- linked, limited invoice summaries through finance RPCs.
drop policy if exists "Operations staff view route claims" on public.route_collection_claims;
create policy "Operations staff view route claims" on public.route_collection_claims
  for select to authenticated using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and (p.is_admin = true or lower(coalesce(p.role, '')) in ('admin', 'driver', 'dispatcher', 'logistics'))
    )
  );

-- Record receipt separately from reconciliation. This avoids a single tap
-- claiming both that money arrived and that it was independently matched.
create or replace function public.mark_payment_received(
  p_payment_id uuid,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_payment public.payments%rowtype;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if coalesce(v_payment.amount, 0) <= 0 then raise exception 'Payment amount must be greater than zero'; end if;

  update public.payments set
    payment_status = 'paid',
    finance_notes = coalesce(nullif(trim(p_notes), ''), finance_notes),
    updated_at = now()
  where id = p_payment_id
  returning * into v_payment;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'MARK_RECEIVED', 'PAYMENT', p_payment_id,
    jsonb_build_object('amount', v_payment.amount, 'currency', v_payment.currency,
      'reference', v_payment.transaction_id, 'notes', p_notes));

  return jsonb_build_object('paymentId', v_payment.id, 'status', v_payment.payment_status,
    'reconciled', v_payment.reconciled_at is not null);
end;
$$;

revoke all on function public.mark_payment_received(uuid, text) from public, anon;
grant execute on function public.mark_payment_received(uuid, text) to authenticated;

-- Reconciliation is only valid after receipt has been recorded.
create or replace function public.set_payment_reconciled(
  p_payment_id uuid,
  p_reconciled boolean,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_payment public.payments%rowtype;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p_reconciled and lower(coalesce(v_payment.payment_status, '')) not in ('completed', 'paid', 'success', 'succeeded') then
    raise exception 'Record the payment as received before reconciliation';
  end if;

  update public.payments set
    reconciled_at = case when p_reconciled then now() else null end,
    reconciled_by = case when p_reconciled then auth.uid() else null end,
    finance_notes = coalesce(nullif(trim(p_notes), ''), finance_notes)
  where id = p_payment_id
  returning * into v_payment;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_reconciled then 'RECONCILE' else 'UNRECONCILE' end,
    'PAYMENT', p_payment_id, jsonb_build_object('reconciled', p_reconciled,
      'notes', p_notes, 'amount', v_payment.amount, 'currency', v_payment.currency));

  return jsonb_build_object('paymentId', v_payment.id,
    'reconciled', v_payment.reconciled_at is not null,
    'reconciledAt', v_payment.reconciled_at);
end;
$$;

revoke all on function public.set_payment_reconciled(uuid, boolean, text) from public, anon;
grant execute on function public.set_payment_reconciled(uuid, boolean, text) to authenticated;

-- Backstop audit trail for sensitive direct table changes. RPC-level audit
-- entries remain more descriptive; these records catch console/API writes too.
create or replace function public.audit_sensitive_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_id uuid := coalesce(nullif(v_new->>'id', '')::uuid, nullif(v_old->>'id', '')::uuid);
  v_details jsonb;
begin
  if tg_table_name = 'profiles' then
    v_details := jsonb_build_object(
      'oldRole', v_old->>'role', 'newRole', v_new->>'role',
      'oldAdmin', v_old->>'is_admin', 'newAdmin', v_new->>'is_admin',
      'oldActive', v_old->>'staff_active', 'newActive', v_new->>'staff_active');
  elsif tg_table_name = 'payments' then
    v_details := jsonb_build_object(
      'oldStatus', v_old->>'payment_status', 'newStatus', v_new->>'payment_status',
      'oldAmount', v_old->>'amount', 'newAmount', v_new->>'amount',
      'currency', coalesce(v_new->>'currency', v_old->>'currency'),
      'oldReconciledAt', v_old->>'reconciled_at', 'newReconciledAt', v_new->>'reconciled_at');
  elsif tg_table_name = 'finance_expenses' then
    v_details := jsonb_build_object(
      'oldStatus', v_old->>'status', 'newStatus', v_new->>'status',
      'oldAmount', v_old->>'amount', 'newAmount', v_new->>'amount',
      'category', coalesce(v_new->>'category', v_old->>'category'));
  else
    v_details := jsonb_build_object(
      'oldStatus', v_old->>'status', 'newStatus', v_new->>'status',
      'amount', coalesce(v_new->>'amount', v_old->>'amount'),
      'currency', coalesce(v_new->>'currency', v_old->>'currency'));
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'DB_' || tg_op, upper(tg_table_name), v_id, v_details);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists audit_payments_mutation on public.payments;
create trigger audit_payments_mutation after insert or update or delete on public.payments
for each row execute function public.audit_sensitive_mutation();
drop trigger if exists audit_finance_expenses_mutation on public.finance_expenses;
create trigger audit_finance_expenses_mutation after insert or update or delete on public.finance_expenses
for each row execute function public.audit_sensitive_mutation();
drop trigger if exists audit_payment_proofs_mutation on public.payment_proofs;
create trigger audit_payment_proofs_mutation after insert or update or delete on public.payment_proofs
for each row execute function public.audit_sensitive_mutation();
drop trigger if exists audit_profiles_privilege_mutation on public.profiles;
create trigger audit_profiles_privilege_mutation
after update of role, is_admin, staff_active, on_leave, driver_type on public.profiles
for each row execute function public.audit_sensitive_mutation();
