-- Close public read access to shipments, payments and receipts.
--
-- Verified against the live database on 2026-08-08: the anon (publishable) key
-- could `select` EVERY row of public.shipments, public.payments and
-- public.receipts. shipments.metadata carries sender and recipient names, email
-- addresses, phone numbers and full street addresses, and receipts carries the
-- same in sender_details / recipient_details. Anyone with the publishable key —
-- which ships in the browser bundle and is therefore public — could read the
-- entire customer base.
--
-- The cause is a policy created in 20250917131013 with `using (true)`:
--     create policy "Allow tracking by tracking number" on public.shipments
--       for select using ( true );
-- A later migration dropped it, but the live database's migration history does
-- not match this directory, so on the real database it (or an equivalent) is
-- still in force.
--
-- What must keep working after this runs:
--   * public tracking by tracking number  -> get_shipment_tracking_info(), a
--     SECURITY DEFINER function that returns only non-sensitive fields
--   * guest booking (anon insert)         -> insert policies are left intact
--   * a customer reading their own rows   -> user_id = auth.uid()
--   * admin/staff and the service role    -> unchanged
--
-- NOTE: applied to the live DB via the staff-ops edge function's "setup"
-- action (migration history is out of sync — never `db push`).

-- ---------------------------------------------------------------------------
-- A. Remove every unconditionally-permissive SELECT policy on these tables
-- ---------------------------------------------------------------------------
-- Dropping by name is unreliable here because the live policy names are not
-- knowable from this directory. Instead, drop exactly those SELECT policies
-- whose USING expression is a bare truth value, which is what makes a table
-- world-readable. Policies with a real predicate (owner checks, admin checks)
-- are deliberately left alone.

do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname, qual, roles, cmd
    from pg_policies
    where schemaname = 'public'
      and tablename in ('shipments', 'payments', 'receipts')
      and cmd in ('SELECT', 'ALL')
      -- `using (true)` normalises to 'true' in pg_policies.qual.
      and coalesce(btrim(qual), '') in ('true', '(true)')
  loop
    raise notice 'Dropping world-readable policy %.% -> % (cmd %, roles %)',
      v_policy.schemaname, v_policy.tablename, v_policy.policyname, v_policy.cmd, v_policy.roles;
    execute format('drop policy if exists %I on %I.%I',
      v_policy.policyname, v_policy.schemaname, v_policy.tablename);
  end loop;
end $$;

-- Named drops for the policies this repository does know about, so a database
-- whose history does match ends in the same state.
drop policy if exists "Allow tracking by tracking number" on public.shipments;
drop policy if exists "Allow public select from shipments" on public.shipments;
drop policy if exists "Allow public select from payments" on public.payments;
drop policy if exists "Allow public select from receipts" on public.receipts;

-- ---------------------------------------------------------------------------
-- B. Owner and staff read access
-- ---------------------------------------------------------------------------

alter table public.shipments enable row level security;
alter table public.payments  enable row level security;
alter table public.receipts  enable row level security;

-- Shared predicate for "the caller works here". Mirrors the mix of is_admin and
-- role already used across the driver/finance policies.
create or replace function public.is_staff_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (is_admin = true
           or lower(coalesce(role, '')) in ('admin', 'finance', 'logistics', 'dispatcher', 'driver', 'staff'))
  );
$$;

revoke all on function public.is_staff_member() from public, anon;
grant execute on function public.is_staff_member() to authenticated;

drop policy if exists "Customers read own shipments" on public.shipments;
create policy "Customers read own shipments" on public.shipments
  for select to authenticated
  using (
    user_id = auth.uid()
    or assigned_driver_id = auth.uid()
    or public.is_staff_member()
  );

drop policy if exists "Customers read own payments" on public.payments;
create policy "Customers read own payments" on public.payments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff_member()
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
    or public.is_staff_member()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- C. Keep public tracking working without exposing the table
-- ---------------------------------------------------------------------------
-- get_shipment_tracking_info is SECURITY DEFINER and returns only status,
-- origin, destination, tracking number and timestamps — no personal data — so
-- it stays reachable without a session.

grant execute on function public.get_shipment_tracking_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- D. Guest booking has to survive
-- ---------------------------------------------------------------------------
-- The public booking form inserts a shipment, then a payment, then a receipt,
-- each with `.select()` to read the new id back. Under RLS, INSERT ... RETURNING
-- needs a SELECT policy that the new row satisfies, and a guest row has
-- user_id = null, so no owner policy can match it.
--
-- Rather than reopening SELECT, guest bookings are created through one
-- SECURITY DEFINER routine that returns exactly the ids the form needs. The
-- website calls this instead of three client-side inserts.

create or replace function public.create_public_booking(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_shipment public.shipments%rowtype;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_currency text := coalesce(nullif(p->>'currency', ''), 'GBP');
  v_amount numeric := coalesce((p->>'amount')::numeric, 0);
  v_tracking text := coalesce(nullif(p->>'trackingNumber', ''), 'ZSN' || lpad(floor(random() * 100000000)::text, 8, '0'));
  v_receipt_no text := coalesce(nullif(p->>'receiptNumber', ''), 'RCP-' || lpad(floor(random() * 10000000000)::text, 10, '0'));
  v_email text := lower(trim(coalesce(p->'metadata'->'sender'->>'email', '')));
begin
  if v_amount < 0 then raise exception 'Booking amount cannot be negative'; end if;
  if v_email = '' then raise exception 'A sender email address is required'; end if;
  if v_currency not in ('GBP', 'EUR') then raise exception 'Unsupported currency %', v_currency; end if;

  insert into public.shipments (
    tracking_number, user_id, origin, destination, status, metadata,
    collection_schedule_id, can_modify, can_cancel
  ) values (
    v_tracking,
    -- A signed-in customer's booking is theirs; a guest booking is claimed
    -- later by claim_guest_bookings() using the sender email above.
    v_uid,
    coalesce(p->>'origin', ''),
    coalesce(p->>'destination', ''),
    'pending',
    coalesce(p->'metadata', '{}'::jsonb),
    nullif(p->>'collectionScheduleId', '')::uuid,
    true, true
  ) returning * into v_shipment;

  insert into public.payments (
    user_id, shipment_id, amount, currency, payment_method, payment_status, transaction_id
  ) values (
    v_uid, v_shipment.id, v_amount, v_currency,
    coalesce(p->>'paymentMethod', 'standard'), 'pending',
    coalesce(nullif(p->>'transactionId', ''), 'TX-' || lpad(floor(random() * 1000000000000)::text, 12, '0'))
  ) returning id into v_payment_id;

  insert into public.receipts (
    user_id, shipment_id, payment_id, receipt_number, amount, currency, payment_method, status,
    sender_details, recipient_details, shipment_details, payment_info, collection_info, payment_schedule
  ) values (
    v_uid, v_shipment.id, v_payment_id, v_receipt_no, v_amount, v_currency,
    coalesce(p->>'paymentMethod', 'standard'), 'pending',
    coalesce(p->'metadata'->'sender', '{}'::jsonb),
    coalesce(p->'metadata'->'recipient', '{}'::jsonb),
    coalesce(p->'metadata'->'items', '{}'::jsonb),
    coalesce(p->'paymentInfo', '{}'::jsonb),
    coalesce(p->'collectionInfo', '{}'::jsonb),
    p->'paymentSchedule'
  ) returning id into v_receipt_id;

  return jsonb_build_object(
    'shipmentId', v_shipment.id,
    'trackingNumber', v_shipment.tracking_number,
    'paymentId', v_payment_id,
    'receiptId', v_receipt_id,
    'receiptNumber', v_receipt_no,
    'linkedToAccount', v_uid is not null
  );
end $$;

-- Guests must be able to book, so anon is granted this one narrow routine.
grant execute on function public.create_public_booking(jsonb) to anon, authenticated;
