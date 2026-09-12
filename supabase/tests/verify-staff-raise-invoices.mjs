// A booking must never issue its own invoice. Run against an isolated PGlite
// database using the actual shipped function bodies; no production data.
//
// This rule has been broken twice. It was first fixed in the customer app's
// booking routine, which strips the number after the fact, while the BEFORE
// INSERT trigger and the website's own routine carried on minting one — 86 of
// the 87 invoice numbers alive on 2026-09-12 belonged to invoices nobody in the
// office had ever raised. The gate is `invoiceNumber` and nothing else, so it
// is cheap to assert and worth asserting.
//
//   PGLITE_MODULE=file:///…/@electric-sql/pglite/dist/index.js \
//     node supabase/tests/verify-staff-raise-invoices.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException', (error) => {
  console.error(error.message, error.detail || '', error.where || '');
  process.exit(1);
});
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const admin = '33333333-3333-3333-3333-333333333333';
const q = async (sql, args) => (await db.query(sql, args)).rows;
const scalar = async (sql, args) => (await q(sql, args))[0].result;
let passed = 0;
const test = async (name, fn) => { await fn(); console.log('PASS', name); passed++; };

await db.exec(`
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid $$;
create table profiles(id uuid primary key, role text, is_admin boolean default false,
  staff_active boolean default true, full_name text);
create table shipments(id uuid primary key default gen_random_uuid(), tracking_number text,
  customer_reference text, origin text, destination text, status text, metadata jsonb default '{}',
  delivery_note_status text, collection_schedule_id uuid, updated_at timestamptz, deleted_at timestamptz);
create table shipment_events(id serial primary key, shipment_id uuid, event_type text,
  previous_status text, new_status text, actor_id uuid, details jsonb, created_at timestamptz default now());
create function public.is_operations_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin) $$;
create function public.is_finance_staff() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and lower(coalesce(role,'')) = 'finance') $$;
insert into profiles(id, role, is_admin, full_name) values('${admin}', 'admin', true, 'Test Admin');
select set_config('test.uid', '${admin}', false);
`);

const body = (file, name) => {
  const sql = fs.readFileSync(file, 'utf8');
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `${name} not found in ${file}`);
  const end = sql.indexOf('$function$;', start) >= 0
    ? sql.indexOf('$function$;', start) + '$function$;'.length
    : sql.indexOf('$$;', start) + 3;
  assert.ok(end > start, `could not find the end of ${name}`);
  return sql.slice(start, end);
};

await db.exec(body('supabase/migrations/20260912140000_bookings_stop_issuing_invoices.sql', 'ensure_booking_paperwork'));
await db.exec(body('supabase/migrations/20260909120000_staff_raised_documents.sql', 'issue_shipment_invoice'));
await db.exec(`
create trigger shipments_ensure_booking_paperwork before insert on public.shipments
  for each row execute function public.ensure_booking_paperwork();
`);

const book = (tracking, metadata = {}) => scalar(
  `insert into shipments(tracking_number, customer_reference, origin, destination, status, metadata)
   values($1, $1, 'England', 'Harare, Zimbabwe', 'Booking Confirmed', $2::jsonb) returning id as result`,
  [tracking, JSON.stringify(metadata)]);
const invoice = async (id) => (await q('select metadata->\'invoice\' as i from shipments where id=$1', [id]))[0].i;

await test('A priced booking arrives un-issued', async () => {
  const id = await book('BK-PRICED', { pricing: { finalAmount: 250 } });
  const i = await invoice(id);
  assert.equal(i.invoiceNumber, undefined, 'a booking must not mint an invoice number');
  assert.equal(i.issueDate, undefined, 'an unraised invoice has no issue date');
});

// The prefill is the whole point of the Create button, and the items are read
// by the driver's goods list, the delivery note and two reporting views.
await test('…but keeps the prefill the Create button fills in from', async () => {
  const i = await invoice(await book('BK-PREFILL', { pricing: { finalAmount: 250 } }));
  assert.equal(i.currency, 'GBP');
  assert.equal(i.items.length, 1);
  assert.equal(Number(i.items[0].unitPrice), 250);
  assert.deepEqual(i.payments, []);
});

await test('Ireland prefills in euro', async () => {
  const id = await scalar(`insert into shipments(tracking_number, origin, destination, status, metadata)
    values('BK-EUR', 'Ireland ', 'Harare, Zimbabwe', 'Booking Confirmed',
      jsonb_build_object('pricing', jsonb_build_object('finalAmount', 300))) returning id as result`);
  assert.equal((await invoice(id)).currency, 'EUR');
});

await test('An invoice the caller supplied is left alone, number and all', async () => {
  // Only the absence of an invoice object triggers the prefill; a caller that
  // brings its own — a restored draft, a migration — must not be overwritten.
  const i = await invoice(await book('BK-SUPPLIED', { invoice: { invoiceNumber: 'INV-KEEPME', items: [] } }));
  assert.equal(i.invoiceNumber, 'INV-KEEPME');
});

await test('Staff pressing Create is what mints the number', async () => {
  const id = await book('BK-RAISE', { pricing: { finalAmount: 250 } });
  const raised = await scalar('select public.issue_shipment_invoice($1) as result', [id]);
  assert.match(raised.invoiceNumber, /^INV-/);
  assert.ok(raised.issuedBy, 'issuedBy identifies the person who raised it');
  assert.ok(raised.issuedAt, 'issuedAt records when');
  assert.ok(raised.dueDate, 'a raised invoice carries payment terms');
  assert.equal((await q(
    `select count(*)::int as result from shipment_events
      where shipment_id=$1 and event_type='invoice_issued'`, [id]))[0].result, 1);
});

await test('The issue date is the day it was raised, not the day of the booking', async () => {
  // Why issueDate had to leave the prefill: issue_shipment_invoice keeps any it
  // finds, so a prefilled one would backdate every invoice to its booking.
  const id = await book('BK-DATED', { pricing: { finalAmount: 250 } });
  const raised = await scalar('select public.issue_shipment_invoice($1) as result', [id]);
  const today = (await q('select current_date::text as result'))[0].result;
  assert.equal(raised.issueDate, today);
});

await test('An invoice with no lines cannot be raised', async () => {
  const id = await book('BK-EMPTY', {});           // no pricing, so no line items
  assert.equal((await invoice(id)).items.length, 0);
  await assert.rejects(() => db.query('select public.issue_shipment_invoice($1)', [id]),
    /Add at least one line/);
});

console.log(`${passed} invoice checks passed; no live database writes.`);
