// Executes the real generate/approve function bodies from
// supabase/migrations/20260809_schedule_generate_approve.sql against a throwaway
// in-process Postgres, with the auth helpers stubbed. This is the only way to
// exercise that SQL without touching the live database.
//
// Run:  npm i --no-save @electric-sql/pglite && node supabase/tests/verify-schedule-sql.mjs
//
// pglite is intentionally NOT a saved dependency — it is a large WASM build and
// this suite is run on demand when the schedule SQL changes.
//
// It caught a real bug: to_char(d, 'DD Month YYYY') blank-pads the month to 9
// characters, so dates shipped as "01 May       2026".
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

const MIGRATION = 'supabase/migrations/20260809_schedule_generate_approve.sql';
const sql = fs.readFileSync(MIGRATION, 'utf8');

// Pull each `create or replace function ... $$;` block out of the migration so
// we test the shipped text, not a paraphrase of it.
function extractFunction(name) {
  const start = sql.indexOf(`create or replace function public.${name}`);
  if (start === -1) throw new Error(`function ${name} not found in migration`);
  const end = sql.indexOf('$$;', start);
  if (end === -1) throw new Error(`unterminated body for ${name}`);
  return sql.slice(start, end + 3);
}

const db = new PGlite();
const q = async (text, params) => (await db.query(text, params)).rows;
let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got      ${JSON.stringify(actual)}\n        expected ${JSON.stringify(expected)}`);
};

await db.exec(`
  create schema if not exists auth;
  create table auth.users (id uuid primary key);
  insert into auth.users values ('11111111-1111-1111-1111-111111111111');
  create or replace function auth.uid() returns uuid language sql stable
    as $fn$ select '11111111-1111-1111-1111-111111111111'::uuid $fn$;
  create or replace function public.is_operations_admin() returns boolean language sql stable
    as $fn$ select true $fn$;

  create table public.audit_logs (
    id serial primary key, user_id uuid, action text, entity_type text,
    entity_id uuid, details jsonb, created_at timestamptz default now());

  create table public.collection_schedules (
    id uuid primary key default gen_random_uuid(),
    route text not null,
    areas text[] default '{}',
    country text default 'England',
    pickup_date text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    approved boolean not null default true,
    approved_at timestamptz,
    approved_by uuid,
    generated_at timestamptz,
    generated_from_id uuid);
`);

await db.exec(extractFunction('generate_collection_schedules'));
await db.exec(extractFunction('approve_collection_schedules'));
await db.exec(extractFunction('discard_collection_schedule_drafts'));
console.log('— function bodies compiled from the migration —\n');

// ── 1. The formatting fix ───────────────────────────────────────────────────
const may = await q(`select to_char(date '2026-05-01', 'DD Month YYYY') as padded,
                            to_char(date '2026-05-01', 'DD FMMonth YYYY') as fixed`);
console.log(`   padded form -> "${may[0].padded}"  (${may[0].padded.length} chars)`);
console.log(`   shipped form -> "${may[0].fixed}"  (${may[0].fixed.length} chars)\n`);
check('short month name is not blank-padded', may[0].fixed, '01 May 2026');

// ── 2. Existing free-text dates parse back to real dates ────────────────────
for (const text of ['14 September 2026', '01 May 2026', '3 March 2026']) {
  const r = await q(`select ($1::text)::date as d`, [text]);
  check(`"${text}" parses as a date`, typeof r[0].d === 'object' || typeof r[0].d === 'string', true);
}

// ── 3. Generation ───────────────────────────────────────────────────────────
await db.exec(`
  insert into public.collection_schedules (route, areas, country, pickup_date) values
    ('LONDON ROUTE',      '{"Central London","Croydon"}', 'England', '14 September 2026'),
    ('BIRMINGHAM ROUTE',  '{"Birmingham"}',               'England', '01 May 2026'),
    ('BROKEN ROUTE',      '{"Nowhere"}',                  'England', 'To be confirmed');
`);

const gen = await q(`select public.generate_collection_schedules(28, null) as r`);
console.log('\n   generate ->', JSON.stringify(gen[0].r));
check('proposed one date per route', gen[0].r.created, 3);
check('nothing skipped on first run', gen[0].r.skipped, 0);

const drafts = await q(`select route, pickup_date from public.collection_schedules
                         where approved = false order by route`);
console.log('   drafts:', drafts.map(d => `${d.route} = "${d.pickup_date}"`).join(' | '));
check('no double spaces in any generated date',
  drafts.every(d => !/\s{2}/.test(d.pickup_date)), true);
check('a past anchor rolls forward past today',
  drafts.every(d => new Date(d.pickup_date) >= new Date(new Date().toDateString())), true);
check('unparseable date still produced a draft',
  drafts.some(d => d.route === 'BROKEN ROUTE'), true);

// ── 4. Re-running must not duplicate ────────────────────────────────────────
const gen2 = await q(`select public.generate_collection_schedules(28, null) as r`);
check('re-run creates nothing', gen2[0].r.created, 0);
check('re-run skips every route', gen2[0].r.skipped, 3);

// ── 5. Drafts are invisible until approved ──────────────────────────────────
const publicView = await q(`select count(*)::int as n from public.collection_schedules where approved = true`);
check('published rows unchanged while drafts pend', publicView[0].n, 3);

// ── 6. Approval supersedes the old row ──────────────────────────────────────
const londonDraft = await q(`select id from public.collection_schedules
                              where route = 'LONDON ROUTE' and approved = false`);
const appr = await q(`select public.approve_collection_schedules($1::uuid[]) as r`, [[londonDraft[0].id]]);
check('approved exactly one', appr[0].r.approved, 1);

const london = await q(`select pickup_date, approved from public.collection_schedules
                         where route = 'LONDON ROUTE' order by approved`);
console.log('\n   LONDON ROUTE rows after approval:', JSON.stringify(london));
check('route now has exactly one row', london.length, 1);
check('and it is the approved new date', london[0].approved, true);
check('old superseded date is gone', london[0].pickup_date !== '14 September 2026', true);

// ── 7. Discard ──────────────────────────────────────────────────────────────
const disc = await q(`select public.discard_collection_schedule_drafts(null) as r`);
check('discarded the remaining drafts', disc[0].r.discarded, 2);
const left = await q(`select count(*)::int as n from public.collection_schedules where approved = false`);
check('no drafts remain', left[0].n, 0);
const survivors = await q(`select count(*)::int as n from public.collection_schedules`);
check('published schedules survived the discard', survivors[0].n, 3);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures ? 1 : 0);
