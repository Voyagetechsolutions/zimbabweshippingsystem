-- Keep finance metrics aligned with the dashboards: a payment can only be
-- reconciled after money has actually been received.

create or replace function public.admin_finance_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;

  with completed as (
    select * from public.payments
    where lower(coalesce(payment_status, '')) in ('completed', 'paid', 'success', 'succeeded')
  ),
  approved_expenses as (
    select * from public.finance_expenses where status in ('recorded', 'approved')
  ),
  currency_totals as (
    select coalesce(c.currency, 'GBP') as currency, sum(c.amount) as collected
    from completed c group by 1
  ),
  daily as (
    select d::date as day,
      coalesce((select sum(amount) from completed where created_at::date = d::date and coalesce(currency, 'GBP') = 'GBP'), 0) as in_gbp,
      coalesce((select sum(amount) from completed where created_at::date = d::date and coalesce(currency, 'GBP') = 'EUR'), 0) as in_eur,
      coalesce((select sum(amount) from approved_expenses where expense_date = d::date), 0) as out_gbp
    from generate_series(current_date - 29, current_date, interval '1 day') d
  )
  select jsonb_build_object(
    'collectedByCurrency', (select coalesce(jsonb_object_agg(currency, collected), '{}'::jsonb) from currency_totals),
    'pendingByCurrency', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select coalesce(currency, 'GBP') as currency, sum(amount) as total
      from public.payments
      where lower(coalesce(payment_status, '')) not in ('completed', 'paid', 'success', 'succeeded', 'failed', 'cancelled', 'refunded')
      group by 1
    ) p),
    'pendingPaymentCount', (select count(*) from public.payments
      where lower(coalesce(payment_status, '')) not in ('completed', 'paid', 'success', 'succeeded', 'failed', 'cancelled', 'refunded')),
    'expensesTotal', (select coalesce(sum(amount), 0) from approved_expenses),
    'incoming30', (select coalesce(sum(amount), 0) from completed where created_at > now() - interval '30 days'),
    'incomingPrev30', (select coalesce(sum(amount), 0) from completed
      where created_at between now() - interval '60 days' and now() - interval '30 days'),
    'outgoing30', (select coalesce(sum(amount), 0) from approved_expenses where expense_date > current_date - 30),
    'outgoingPrev30', (select coalesce(sum(amount), 0) from approved_expenses
      where expense_date between current_date - 60 and current_date - 30),
    'billedByCurrency', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select coalesce(currency, 'GBP') as currency, sum(total) as total
      from public.driver_invoices where status <> 'void' group by 1
    ) b),
    'unpaidInvoices', (select count(*) from public.driver_invoices where status in ('issued', 'partial', 'overdue')),
    'outstandingByCurrency', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select coalesce(currency, 'GBP') as currency, sum(total) as total
      from public.driver_invoices where status in ('issued', 'partial', 'overdue') group by 1
    ) o),
    'unreconciledPayments', (select count(*) from completed where reconciled_at is null),
    'pendingProofs', (select count(*) from public.payment_proofs where status = 'pending'),
    'cashflow', (select coalesce(jsonb_agg(jsonb_build_object(
      'day', to_char(day, 'YYYY-MM-DD'), 'inGBP', in_gbp, 'inEUR', in_eur, 'out', out_gbp
    ) order by day), '[]'::jsonb) from daily),
    'recentTransactions', (select coalesce(jsonb_agg(t order by t->>'createdAt' desc), '[]'::jsonb) from (
      select jsonb_build_object(
        'id', p.id,
        'amount', p.amount,
        'currency', coalesce(p.currency, 'GBP'),
        'method', p.payment_method,
        'status', p.payment_status,
        'reconciled', p.reconciled_at is not null,
        'createdAt', p.created_at,
        'shipmentId', p.shipment_id,
        'reference', coalesce(s.customer_reference, s.tracking_number),
        'customer', coalesce(
          nullif(s.metadata->'sender'->>'name', ''),
          nullif(concat_ws(' ', s.metadata->'sender'->>'firstName', s.metadata->'sender'->>'lastName'), ''),
          nullif(s.metadata->'senderDetails'->>'name', ''),
          nullif(concat_ws(' ', s.metadata->'senderDetails'->>'firstName', s.metadata->'senderDetails'->>'lastName'), ''),
          nullif(s.metadata->>'sender_name', ''),
          nullif(s.metadata->>'customer_name', ''),
          'Customer'
        ),
        'proofId', (select pp.id from public.payment_proofs pp
          where pp.shipment_id = p.shipment_id order by pp.created_at desc limit 1)
      ) as t
      from public.payments p
      left join public.shipments s on s.id = p.shipment_id
      order by p.created_at desc limit 20
    ) tx)
  ) into v;

  return v;
end $$;

grant execute on function public.admin_finance_overview() to authenticated;

create or replace function public.refresh_finance_anomalies() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;

  insert into public.finance_anomalies(
    anomaly_key, anomaly_type, severity, title, description,
    entity_type, entity_id, amount
  )
  select
    'unreconciled:' || p.id,
    'unreconciled_payment',
    case when p.amount >= 1000 then 'high' else 'medium' end,
    'Payment needs reconciliation',
    'A received payment has remained unreconciled for more than seven days.',
    'payment', p.id, p.amount
  from public.payments p
  where p.reconciled_at is null
    and p.created_at < now() - interval '7 days'
    and lower(coalesce(p.payment_status, '')) in ('completed', 'paid', 'success', 'succeeded')
  on conflict(anomaly_key) do nothing;

  insert into public.finance_anomalies(
    anomaly_key, anomaly_type, severity, title, description,
    entity_type, entity_id, amount
  )
  select
    'overdue:' || i.id,
    'overdue_invoice',
    case when i.total >= 1000 then 'high' else 'medium' end,
    'Invoice is overdue',
    'A customer invoice is past its due date and is not paid.',
    'invoice', i.id, i.total
  from public.driver_invoices i
  where i.due_date < current_date and i.status not in ('paid', 'void')
  on conflict(anomaly_key) do nothing;

  insert into public.finance_anomalies(
    anomaly_key, anomaly_type, severity, title, description,
    entity_type, entity_id, amount
  )
  select
    'large-expense:' || e.id,
    'large_expense',
    'high',
    'Large expense requires review',
    'A recorded expense is GBP 1,000 or more.',
    'expense', e.id, e.amount
  from public.finance_expenses e
  where e.amount >= 1000 and e.status <> 'rejected'
  on conflict(anomaly_key) do nothing;

  select count(*) into v_count from public.finance_anomalies where status = 'open';
  return v_count;
end $$;

grant execute on function public.refresh_finance_anomalies() to authenticated;
