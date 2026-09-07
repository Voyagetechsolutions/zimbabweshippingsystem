-- One customer, one record, however many times they book.
--
-- Today sixty shipments produce fifty-eight "customers". Nothing groups them
-- reliably: website and app bookings never set user_id, so every one is a
-- guest; thirty-one of sixty carry no email, so a key built as
-- user_id -> email -> phone silently switches identifier between two bookings
-- by the same person; and phone numbers are stored in three different shapes
-- (+353…, 0…, and worse), so even the phone does not match itself.
--
-- The customer reference cannot fix this and was never going to. MAR09266988
-- encodes the month and year of the booking, so it identifies a *booking*.
-- Two bookings by one person in different months have different references by
-- design. It stays exactly as it is — it is already printed on paperwork — and
-- customers get their own stable code alongside it.
--
-- Identity is the phone number first, email second, per the agreed rule.

-- ---------------------------------------------------------------------------
-- A. Normalising the things people are identified by
-- ---------------------------------------------------------------------------

/**
 * The comparable part of a phone number: its last nine digits.
 *
 * That is what survives the ways one number gets written down. +353 83 425 2477,
 * 083 425 2477 and 00353834252477 all reduce to 834252477. Nine is chosen
 * because it is short enough to ignore every country and trunk prefix in use
 * here and long enough that two different subscribers will not collide.
 */
create or replace function public.phone_identity_key(p_phone text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 9
      then right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 9)
    else nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '')
  end;
$$;

create or replace function public.email_identity_key(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(lower(trim(coalesce(p_email, ''))), '');
$$;

-- ---------------------------------------------------------------------------
-- B. The customer
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  -- Stable for the life of the customer. Never encodes a date.
  customer_code text not null unique,
  full_name text,
  email text,
  phone text,
  -- Generated, so they can never drift out of step with the raw values.
  phone_key text generated always as (public.phone_identity_key(phone)) stored,
  email_key text generated always as (public.email_identity_key(email)) stored,
  country text,
  pickup_address text,
  pickup_city text,
  pickup_postcode text,
  -- Set once the customer signs up; a guest customer has none.
  profile_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial uniques: two customers may both have no phone, but no two may share
-- one. This is what stops a duplicate being created under a race.
create unique index if not exists customers_phone_key_idx
  on public.customers (phone_key) where phone_key is not null;
create unique index if not exists customers_email_key_idx
  on public.customers (email_key) where email_key is not null;
create unique index if not exists customers_profile_idx
  on public.customers (profile_id) where profile_id is not null;

alter table public.shipments
  add column if not exists customer_id uuid references public.customers(id) on delete set null;
create index if not exists shipments_customer_idx on public.shipments(customer_id)
  where deleted_at is null;

do $$
begin
  if to_regclass('public.custom_quotes') is not null then
    execute 'alter table public.custom_quotes
             add column if not exists customer_id uuid references public.customers(id) on delete set null';
    execute 'create index if not exists custom_quotes_customer_idx on public.custom_quotes(customer_id)';
  end if;
end $$;

create sequence if not exists public.customer_code_seq start 1;

/**
 * A readable, stable customer code: three letters of their name and a running
 * number — MAR00042.
 *
 * Deliberately shaped like the booking reference so staff read them the same
 * way, and deliberately without a date so it never changes.
 */
create or replace function public.next_customer_code(p_name text)
returns text
language sql
volatile
set search_path = public
as $$
  select rpad(
           coalesce(nullif(upper(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z]', '', 'g')), ''), 'CUS'),
           3, 'X')
         || lpad(nextval('public.customer_code_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------------
-- C. Resolving a booking to a customer
-- ---------------------------------------------------------------------------

/**
 * Find the customer these details belong to, or create them.
 *
 * Phone wins, then email, then a signed-in profile. Details that arrive fuller
 * than what is on file fill the gaps — a second booking that carries an email
 * where the first did not should complete the record rather than fork it — but
 * never blank out something already known.
 */
create or replace function public.resolve_customer(
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_country text default null,
  p_address text default null,
  p_city text default null,
  p_postcode text default null,
  p_profile_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_key text := public.phone_identity_key(p_phone);
  v_email_key text := public.email_identity_key(p_email);
  v_id uuid;
begin
  if v_phone_key is not null then
    select id into v_id from public.customers where phone_key = v_phone_key limit 1;
  end if;
  if v_id is null and v_email_key is not null then
    select id into v_id from public.customers where email_key = v_email_key limit 1;
  end if;
  if v_id is null and p_profile_id is not null then
    select id into v_id from public.customers where profile_id = p_profile_id limit 1;
  end if;

  if v_id is null then
    -- Two bookings by one customer landing at once would both reach here.
    -- Rather than guess which partial unique index will fire — phone, email or
    -- profile — let the insert fail and pick up the row that won. ON CONFLICT
    -- can only infer one index, so it would miss the other two.
    begin
      insert into public.customers (customer_code, full_name, email, phone, country,
                                    pickup_address, pickup_city, pickup_postcode, profile_id)
      values (public.next_customer_code(p_name), nullif(trim(coalesce(p_name, '')), ''),
              nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_phone, '')), ''),
              nullif(trim(coalesce(p_country, '')), ''), nullif(trim(coalesce(p_address, '')), ''),
              nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_postcode, '')), ''),
              p_profile_id)
      returning id into v_id;
    exception when unique_violation then
      select id into v_id from public.customers
       where (v_phone_key is not null and phone_key = v_phone_key)
          or (v_email_key is not null and email_key = v_email_key)
          or (p_profile_id is not null and profile_id = p_profile_id)
       limit 1;
      if v_id is null then raise; end if;
    end;
  else
    update public.customers set
      full_name = coalesce(full_name, nullif(trim(coalesce(p_name, '')), '')),
      email = coalesce(email, nullif(trim(coalesce(p_email, '')), '')),
      phone = coalesce(phone, nullif(trim(coalesce(p_phone, '')), '')),
      country = coalesce(country, nullif(trim(coalesce(p_country, '')), '')),
      pickup_address = coalesce(pickup_address, nullif(trim(coalesce(p_address, '')), '')),
      pickup_city = coalesce(pickup_city, nullif(trim(coalesce(p_city, '')), '')),
      pickup_postcode = coalesce(pickup_postcode, nullif(trim(coalesce(p_postcode, '')), '')),
      profile_id = coalesce(profile_id, p_profile_id),
      updated_at = now()
    where id = v_id;
  end if;

  return v_id;
end $$;

/**
 * Every booking joins its customer, whichever door it came in by.
 *
 * A trigger rather than an edit to each booking routine: bookings arrive from
 * the website, the customer app, the WhatsApp bot and manual admin entry, and
 * only a trigger catches all of them and anything added later.
 */
create or replace function public.link_shipment_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender jsonb := coalesce(new.metadata->'sender', new.metadata->'senderDetails', '{}'::jsonb);
  v_name text := coalesce(
    nullif(trim(v_sender->>'name'), ''),
    nullif(trim(concat_ws(' ', v_sender->>'firstName', v_sender->>'lastName')), ''));
begin
  if new.customer_id is not null then
    return new;
  end if;

  new.customer_id := public.resolve_customer(
    v_name,
    v_sender->>'email',
    coalesce(v_sender->>'phone', new.metadata->>'whatsappNumber'),
    coalesce(v_sender->>'country', new.origin),
    v_sender->>'address',
    v_sender->>'city',
    coalesce(v_sender->>'postcode', v_sender->>'postalCode'),
    new.user_id);

  return new;
end $$;

drop trigger if exists shipments_link_customer on public.shipments;
create trigger shipments_link_customer
  before insert or update of metadata, user_id on public.shipments
  for each row
  execute function public.link_shipment_customer();

-- ---------------------------------------------------------------------------
-- D. Backfill, and a report of what it merged
-- ---------------------------------------------------------------------------

/**
 * Link every existing shipment to a customer, merging as it goes.
 *
 * Ordered oldest first so the earliest booking names the customer and their
 * code, which keeps the codes in a sensible order and means the name on file
 * is the one they first gave.
 */
create or replace function public.backfill_customers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_linked integer := 0;
  v_before integer;
  v_after integer;
begin
  if auth.uid() is not null and not public.is_operations_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select count(*) into v_before from public.customers;

  for v_row in
    select id from public.shipments
     where customer_id is null and deleted_at is null
     order by created_at
  loop
    -- The trigger does the work; touching metadata is what fires it.
    update public.shipments set metadata = metadata where id = v_row.id;
    v_linked := v_linked + 1;
  end loop;

  select count(*) into v_after from public.customers;

  return jsonb_build_object(
    'shipmentsLinked', v_linked,
    'customersBefore', v_before,
    'customersAfter', v_after,
    'customersCreated', v_after - v_before);
end $$;

revoke all on function public.backfill_customers() from public, anon;
grant execute on function public.backfill_customers() to authenticated;

/**
 * What the merge actually did: every customer holding more than one booking,
 * with the distinct names, emails and phones that were folded together.
 *
 * This is the check on the automatic merge — a row here listing two different
 * people's names is the signal that a shared phone number merged two
 * customers, and admin can split them.
 */
create or replace function public.customer_merge_report()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(r order by r->>'shipments' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'customerId', c.id,
      'customerCode', c.customer_code,
      'name', c.full_name,
      'phone', c.phone,
      'email', c.email,
      'shipments', count(s.id),
      'distinctNames', (select coalesce(jsonb_agg(distinct n), '[]'::jsonb) from (
         select coalesce(nullif(trim(s2.metadata->'sender'->>'name'), ''),
                nullif(trim(concat_ws(' ', s2.metadata->'sender'->>'firstName',
                                           s2.metadata->'sender'->>'lastName')), '')) as n
         from public.shipments s2 where s2.customer_id = c.id) x where n is not null),
      'distinctPhones', (select coalesce(jsonb_agg(distinct p), '[]'::jsonb) from (
         select nullif(trim(s3.metadata->'sender'->>'phone'), '') as p
         from public.shipments s3 where s3.customer_id = c.id) y where p is not null)
    ) as r
    from public.customers c
    join public.shipments s on s.customer_id = c.id and s.deleted_at is null
    group by c.id, c.customer_code, c.full_name, c.phone, c.email
    having count(s.id) > 1
  ) grouped;
$$;

revoke all on function public.customer_merge_report() from public, anon;
grant execute on function public.customer_merge_report() to authenticated;

-- ---------------------------------------------------------------------------
-- E. Access
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;

drop policy if exists "Staff manage customers" on public.customers;
create policy "Staff manage customers" on public.customers
  for all to authenticated
  using (public.is_operations_admin() or public.is_finance_staff())
  with check (public.is_operations_admin() or public.is_finance_staff());

-- A signed-in customer may read their own record, which is what lets the app
-- and the website show them everything booked under it rather than only the
-- shipments that happen to carry their user_id.
drop policy if exists "Customers read own record" on public.customers;
create policy "Customers read own record" on public.customers
  for select to authenticated
  using (profile_id = auth.uid());

/**
 * The portal shows a customer everything booked under their record.
 *
 * Until now it could only show shipments carrying their user_id, and website
 * bookings never set one — so a customer who booked as a guest and then
 * created an account saw an empty account. RLS policies are OR'd together, so
 * this widens what they can see without loosening anything already in place.
 */
drop policy if exists "Customers read shipments on their record" on public.shipments;
create policy "Customers read shipments on their record" on public.shipments
  for select to authenticated
  using (
    customer_id is not null
    and customer_id in (select id from public.customers where profile_id = auth.uid())
  );

/**
 * Signing up claims the bookings already made with that phone or email.
 *
 * The whole point of unifying customers is undone if creating an account makes
 * a fifty-ninth record. A new or updated profile is attached to the customer
 * that already matches it, and only creates one when nothing does.
 */
create or replace function public.link_profile_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
begin
  -- Staff are not customers.
  if coalesce(new.is_admin, false)
     or lower(coalesce(new.role, 'customer')) in ('admin', 'driver', 'finance', 'logistics', 'dispatcher') then
    return new;
  end if;

  v_customer := public.resolve_customer(
    new.full_name, new.email, new.phone_number, new.country,
    new.pickup_address, new.pickup_city, null, new.id);

  -- Hand them the bookings they made before they had an account.
  --
  -- Setting user_id, rather than only linking the customer, is deliberate:
  -- every screen in the app and on the website already asks "shipments where
  -- user_id is me". Claiming the rows here makes all of them correct at once,
  -- instead of a dozen queries each needing to learn about customers and one
  -- of them being missed. Only unclaimed rows are touched, so a shipment that
  -- already belongs to somebody is never reassigned.
  if v_customer is not null then
    update public.shipments
       set user_id = new.id
     where customer_id = v_customer
       and user_id is null
       and deleted_at is null;
  end if;

  return new;
end $$;

drop trigger if exists profiles_link_customer on public.profiles;
create trigger profiles_link_customer
  after insert or update of email, phone_number on public.profiles
  for each row
  execute function public.link_profile_customer();

-- ---------------------------------------------------------------------------
-- F. What the admin screens read
-- ---------------------------------------------------------------------------

/**
 * The customer list: one row per customer, with the totals staff scan for.
 *
 * This replaces admin_customer_records, whose job was to *reconstruct* customers
 * from scattered booking details every time it ran. That reconstruction is what
 * produced fifty-eight customers from sixty shipments. Identity is a stored
 * fact now, so this only has to add up what hangs off it.
 */
create or replace function public.admin_customer_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not (public.is_operations_admin() or public.is_finance_staff())
    then jsonb_build_object('error', 'Admin or finance access required')
    else coalesce((
      select jsonb_agg(row order by row->>'lastActivity' desc nulls last)
      from (
        select jsonb_build_object(
          'key', c.id,
          'customerId', c.id,
          'profileId', c.profile_id,
          'customerCode', c.customer_code,
          'fullName', coalesce(c.full_name, 'Unknown customer'),
          'email', c.email,
          'phone', c.phone,
          'country', c.country,
          'pickupAddress', nullif(trim(concat_ws(', ', c.pickup_address, c.pickup_city)), ''),
          'shipmentCount', count(distinct s.id),
          'quoteCount', 0,
          'lifetimeValue', coalesce(sum(inv.total), 0),
          'outstanding', coalesce(sum(inv.total), 0) - coalesce(sum(inv.paid), 0),
          'currency', coalesce(max(inv.currency), 'GBP'),
          'lastBooking', max(s.created_at),
          'lastActivity', greatest(coalesce(max(s.created_at), c.created_at), c.created_at),
          'active', true
        ) as row
        from public.customers c
        left join public.shipments s
          on s.customer_id = c.id and s.deleted_at is null
        left join lateral (
          select
            coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                      from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'items')='array'
                                                     then s.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)
            - coalesce((s.metadata->'invoice'->>'discount')::numeric, 0) as total,
            coalesce((select sum(coalesce((p->>'amount')::numeric,0))
                      from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'payments')='array'
                                                     then s.metadata->'invoice'->'payments' else '[]'::jsonb end) p), 0) as paid,
            s.metadata->'invoice'->>'currency' as currency
        ) inv on true
        group by c.id, c.profile_id, c.customer_code, c.full_name, c.email, c.phone,
                 c.country, c.pickup_address, c.pickup_city, c.created_at
      ) grouped
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.admin_customer_list() from public, anon;
grant execute on function public.admin_customer_list() to authenticated;

/**
 * A customer's statement: every charge and every payment, oldest first, with a
 * running balance.
 *
 * Built from the same metadata.invoice the invoice, the app and the website all
 * read, so the statement cannot disagree with the documents it summarises.
 */
create or replace function public.customer_statement(p_customer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_allowed boolean;
begin
  select public.is_operations_admin() or public.is_finance_staff()
         or exists (select 1 from public.customers c
                     where c.id = p_customer_id and c.profile_id = auth.uid())
    into v_allowed;
  if not v_allowed then
    raise exception 'Not your statement' using errcode = '42501';
  end if;

  with charges as (
    select s.id as shipment_id, s.created_at as at,
           coalesce(s.metadata->'invoice'->>'invoiceNumber',
                    'INV-' || coalesce(s.customer_reference, s.tracking_number, '')) as ref,
           'charge' as kind,
           coalesce((select sum(coalesce((i->>'quantity')::numeric,0) * coalesce((i->>'unitPrice')::numeric,0))
                     from jsonb_array_elements(case when jsonb_typeof(s.metadata->'invoice'->'items')='array'
                                                    then s.metadata->'invoice'->'items' else '[]'::jsonb end) i), 0)
           - coalesce((s.metadata->'invoice'->>'discount')::numeric, 0) as amount,
           coalesce(s.metadata->'invoice'->>'currency', 'GBP') as currency,
           null::text as method
      from public.shipments s
     where s.customer_id = p_customer_id and s.deleted_at is null
       and s.metadata->'invoice' is not null
  ),
  credits as (
    select s.id as shipment_id,
           coalesce((p->>'date')::timestamptz, s.created_at) as at,
           coalesce(s.metadata->'invoice'->>'invoiceNumber', s.tracking_number) as ref,
           'payment' as kind,
           -coalesce((p->>'amount')::numeric, 0) as amount,
           coalesce(s.metadata->'invoice'->>'currency', 'GBP') as currency,
           p->>'method' as method
      from public.shipments s
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(s.metadata->'invoice'->'payments')='array'
             then s.metadata->'invoice'->'payments' else '[]'::jsonb end) p
     where s.customer_id = p_customer_id and s.deleted_at is null
  ),
  ordered as (
    select *, sum(amount) over (order by at, kind desc rows between unbounded preceding and current row) as balance
      from (select * from charges union all select * from credits) both_sides
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'shipmentId', shipment_id, 'at', at, 'reference', ref, 'kind', kind,
           'amount', amount, 'currency', currency, 'method', method, 'balance', balance
         ) order by at), '[]'::jsonb)
    into v_rows from ordered;

  return v_rows;
end $$;

revoke all on function public.customer_statement(uuid) from public, anon;
grant execute on function public.customer_statement(uuid) to authenticated;
