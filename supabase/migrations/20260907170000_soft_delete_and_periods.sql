-- Deleting things, and seeing a collection period as one job.
--
-- Two gaps.
--
-- The app can create or change twenty tables and delete from none of them.
-- Some of that is right: audit_logs, payments, receipts and proof photos are
-- the record of what happened, and a business that can quietly delete those
-- cannot answer a dispute. Everything else — a quote raised in error, a
-- duplicate pickup zone, an expense typed twice — needs a way out, and only
-- `shipments` had one.
--
-- Every delete here is soft. A shipment carries an invoice, a delivery note, a
-- driver's photos and a customer's payment; removing the row would orphan all
-- of it, and "we deleted it" is not an answer when the customer rings.

-- ---------------------------------------------------------------------------
-- A. Somewhere to record a deletion
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  -- Deliberately excludes audit_logs, payments, receipts, driver_proofs and
  -- driver_signatures. Those are evidence, not content.
  targets text[] := array[
    'custom_quotes', 'finance_expenses', 'pickup_zones', 'collection_schedules',
    'collection_periods', 'customers', 'staff_messages', 'collection_runs'
  ];
begin
  foreach t in array targets loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
      execute format('alter table public.%I add column if not exists deleted_by uuid references auth.users(id) on delete set null', t);
      execute format('create index if not exists %I on public.%I (deleted_at) where deleted_at is null',
                     t || '_live_idx', t);
    end if;
  end loop;
end $$;

-- shipments had deleted_at from the start but never recorded who.
alter table public.shipments
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- B. One way to delete, and to undo it
-- ---------------------------------------------------------------------------

/**
 * Soft-delete (or restore) rows, in bulk.
 *
 * One routine rather than a delete endpoint per table: the rule about what may
 * be deleted, and by whom, then lives in exactly one place. The table name is
 * checked against a whitelist rather than interpolated blindly — this takes a
 * table name from the client, and that is only safe if the set of acceptable
 * answers is fixed here.
 *
 * `p_deleted => false` restores, which is the point of soft deletion: a
 * mistaken bulk delete is undone with the same call.
 */
create or replace function public.set_records_deleted(
  p_table text,
  p_ids uuid[],
  p_deleted boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[] := array[
    'shipments', 'custom_quotes', 'finance_expenses', 'pickup_zones',
    'collection_schedules', 'collection_periods', 'customers', 'staff_messages',
    'collection_runs'
  ];
  v_table text := lower(trim(coalesce(p_table, '')));
  v_count integer := 0;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if not (v_table = any(v_allowed)) then
    raise exception 'Refusing to delete from %', p_table using errcode = '42501';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('changed', 0);
  end if;

  execute format(
    'update public.%I set deleted_at = %s, deleted_by = %s where id = any($1)',
    v_table,
    case when p_deleted then 'now()' else 'null' end,
    case when p_deleted then 'auth.uid()' else 'null' end)
  using p_ids;

  get diagnostics v_count = row_count;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_deleted then 'SOFT_DELETE' else 'RESTORE' end,
          upper(v_table), null,
          jsonb_build_object('ids', to_jsonb(p_ids), 'count', v_count));

  return jsonb_build_object('changed', v_count, 'deleted', p_deleted, 'table', v_table);
end $$;

revoke all on function public.set_records_deleted(text, uuid[], boolean) from public, anon;
grant execute on function public.set_records_deleted(text, uuid[], boolean) to authenticated;

/**
 * Change the same thing on many shipments at once.
 *
 * Only the fields it is safe to set in bulk: what stage they are at, and which
 * collection they belong to. Addresses, prices and contents are per-shipment
 * and are edited one at a time on purpose — a bulk edit of those is a bulk
 * mistake. Null means "leave alone", so one call can move a period without
 * touching status.
 */
create or replace function public.bulk_update_shipments(
  p_ids uuid[],
  p_status text default null,
  p_collection_schedule_id uuid default null,
  p_collection_period_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not (public.is_operations_admin() or public.is_finance_staff()) then
    raise exception 'Admin or finance access required' using errcode = '42501';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('changed', 0);
  end if;

  update public.shipments s set
    status = coalesce(nullif(trim(coalesce(p_status, '')), ''), s.status),
    collection_schedule_id = coalesce(p_collection_schedule_id, s.collection_schedule_id),
    collection_period_id = coalesce(p_collection_period_id, s.collection_period_id),
    updated_at = now()
  where s.id = any(p_ids)
    and s.deleted_at is null;

  get diagnostics v_count = row_count;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'BULK_UPDATE', 'SHIPMENT', null,
          jsonb_build_object('count', v_count, 'status', p_status,
                             'scheduleId', p_collection_schedule_id,
                             'periodId', p_collection_period_id));

  return jsonb_build_object('changed', v_count);
end $$;

revoke all on function public.bulk_update_shipments(uuid[], text, uuid, uuid) from public, anon;
grant execute on function public.bulk_update_shipments(uuid[], text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- C. A collection period as one job
-- ---------------------------------------------------------------------------

/**
 * Every collection period with its numbers, newest first.
 *
 * A period is how this business actually works — bookings open, they fill, the
 * container goes — so it is the unit staff should see, rather than one endless
 * list of every shipment ever booked.
 *
 * Money is read from metadata.invoice, the same place the invoice, the app and
 * the website read it, so the period's totals and the documents inside it
 * cannot disagree.
 */
create or replace function public.collection_period_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not (public.is_operations_admin() or public.is_finance_staff())
    then jsonb_build_object('error', 'Admin or finance access required')
    else coalesce((
      select jsonb_agg(row order by row->>'sortKey' desc)
      from (
        select jsonb_build_object(
          'periodId', p.id,
          'name', p.name,
          'month', p.month,
          'year', p.year,
          'status', p.status,
          -- Sorted by the period's last scheduled collection, not by its
          -- month name: `month` is text ("May", "June"), so anything
          -- alphabetical puts April after August. Periods with nothing
          -- scheduled yet fall back to their year.
          'sortKey', coalesce(
            to_char((select max(cs.pickup_on) from public.collection_schedules cs
                     join public.collection_periods cp on cp.id = cs.collection_period_id
                     where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
                       and cp.year = p.year), 'YYYY-MM-DD'),
            lpad(coalesce(p.year, 0)::text, 4, '0') || '-00-00'),
          -- Routes are matched on month and year, not only on the period id.
          -- Live data has two September 2026 periods differing by nothing but
          -- capitalisation: one holds every booking and no schedule, the other
          -- every schedule and no booking. Matching on the id alone shows a
          -- period full of work as having no routes at all.
          'routes', coalesce((
            select jsonb_agg(distinct cs.route)
            from public.collection_schedules cs
            join public.collection_periods cp on cp.id = cs.collection_period_id
            where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
              and cp.year = p.year
              and cs.route is not null and cs.deleted_at is null), '[]'::jsonb),
          'firstCollection', (
            select min(cs.pickup_on) from public.collection_schedules cs
            join public.collection_periods cp on cp.id = cs.collection_period_id
            where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
              and cp.year = p.year),
          'lastCollection', (
            select max(cs.pickup_on) from public.collection_schedules cs
            join public.collection_periods cp on cp.id = cs.collection_period_id
            where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(p.month, '')))
              and cp.year = p.year),
          'shipments', count(s.id),
          'collected', count(s.id) filter (where lower(coalesce(s.status, '')) in
            ('collected', 'at warehouse', 'enroute to zimbabwe', 'in transit', 'delivered')),
          -- Totals per currency, never added together: a period routinely
          -- holds UK and Irish collections, and pounds plus euros is a number
          -- that is not money in either.
          'byCurrency', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'currency', t.cur, 'invoiced', t.inv, 'paid', t.pd,
                     'outstanding', greatest(0, t.inv - t.pd))
                   order by t.inv desc)
            from (
              select coalesce(s2.metadata->'invoice'->>'currency', 'GBP') as cur,
                sum(coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s2.metadata->'invoice'->'items')='array'
                                                    then s2.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)
                    - coalesce((s2.metadata->'invoice'->>'discount')::numeric, 0)) as inv,
                sum(coalesce((select sum(coalesce((pay->>'amount')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s2.metadata->'invoice'->'payments')='array'
                                                    then s2.metadata->'invoice'->'payments' else '[]'::jsonb end) pay), 0)) as pd
              from public.shipments s2
              where s2.collection_period_id = p.id and s2.deleted_at is null
              group by 1
              having sum(coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s2.metadata->'invoice'->'items')='array'
                                                    then s2.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)) > 0
            ) t), '[]'::jsonb),
          'invoiced', coalesce(sum(inv.total), 0),
          'paid', coalesce(sum(inv.paid), 0),
          'outstanding', greatest(0, coalesce(sum(inv.total), 0) - coalesce(sum(inv.paid), 0)),
          -- "Cleared" means nothing left to pay on that shipment.
          'cleared', count(s.id) filter (where inv.total > 0 and inv.paid >= inv.total - 0.005),
          'unpaid', count(s.id) filter (where inv.total > 0 and inv.paid <= 0.005),
          'currency', coalesce(max(inv.currency), 'GBP')
        ) as row
        from public.collection_periods p
        left join public.shipments s
          on s.collection_period_id = p.id and s.deleted_at is null
        left join lateral (
          select
            coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                      from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'items')='array'
                                                     then s.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)
            - coalesce((s.metadata->'invoice'->>'discount')::numeric, 0) as total,
            coalesce((select sum(coalesce((pay->>'amount')::numeric,0))
                      from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'payments')='array'
                                                     then s.metadata->'invoice'->'payments' else '[]'::jsonb end) pay), 0) as paid,
            s.metadata->'invoice'->>'currency' as currency
        ) inv on true
        where p.deleted_at is null
        group by p.id, p.name, p.month, p.year, p.status
      ) grouped
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.collection_period_summary() from public, anon;
grant execute on function public.collection_period_summary() to authenticated;

/**
 * The collection schedules that belong to a period, by month and year.
 *
 * Not by period id, for the same reason the summary does not: live data has
 * two September 2026 periods differing only by capitalisation, one carrying
 * every booking and the other every route. Looking up by id leaves the period
 * staff are working in with no routes to assign anything to.
 */
create or replace function public.period_schedules(p_period_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', cs.id, 'route', cs.route, 'country', cs.country, 'pickup_on', cs.pickup_on)
      order by cs.pickup_on nulls last, cs.route)
    from public.collection_schedules cs
    join public.collection_periods cp on cp.id = cs.collection_period_id
    join public.collection_periods target on target.id = p_period_id
    where lower(trim(coalesce(cp.month, ''))) = lower(trim(coalesce(target.month, '')))
      and cp.year = target.year
      and cs.deleted_at is null
  ), '[]'::jsonb);
$$;

revoke all on function public.period_schedules(uuid) from public, anon;
grant execute on function public.period_schedules(uuid) to authenticated;
