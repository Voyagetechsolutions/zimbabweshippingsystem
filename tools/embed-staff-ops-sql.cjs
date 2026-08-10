// Regenerates the SETUP_SQL_V2 constant inside supabase/functions/staff-ops/index.ts
// from the operations migrations. Run after editing either migration:
// node tools/embed-staff-ops-sql.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fnPath = path.join(root, 'supabase/functions/staff-ops/index.ts');
// NOTE: 20260808_restrict_public_shipment_reads.sql is deliberately NOT in this
// list. It closes public SELECT on shipments/payments/receipts, which the
// currently-deployed booking form still relies on, so it must be applied only
// after the new frontend (which books via create_public_booking) is live. Run it
// as its own step — see docs/ROLLOUT_BOOKING_ACCOUNTS_AND_SECURITY.md.
const sqlPaths = [
  path.join(root, 'supabase/migrations/20260719_operations_upgrade.sql'),
  path.join(root, 'supabase/migrations/20260721_admin_screens.sql'),
  path.join(root, 'supabase/migrations/20260722_fix_schedule_typos.sql'),
  path.join(root, 'supabase/migrations/20260808_booking_accounts_self_collection.sql'),
  path.join(root, 'supabase/migrations/20260809_schedule_generate_approve.sql'),
  path.join(root, 'supabase/migrations/20260810_driver_route_collections.sql'),
];

const src = fs.readFileSync(fnPath, 'utf8');
const sql = sqlPaths.map((p) => fs.readFileSync(p, 'utf8')).join('\n\n');

// The replacement goes through a function so `$` sequences in the SQL are
// never interpreted as String.replace substitution patterns.
const out = src.replace(
  /const SETUP_SQL_V2 = ".*?";/s,
  () => 'const SETUP_SQL_V2 = ' + JSON.stringify(sql) + ';'
);
// Distinguish "the constant is missing" from "the SQL is already up to date" —
// the old check treated an unchanged file as a failure, which looked alarming
// when re-running the script was in fact a no-op.
if (!/const SETUP_SQL_V2 = ".*?";/s.test(src)) {
  throw new Error('SETUP_SQL_V2 constant not found in staff-ops/index.ts');
}
if (out === src) {
  console.log('staff-ops SETUP_SQL_V2 already up to date,', sql.length, 'chars of SQL');
  return;
}
fs.writeFileSync(fnPath, out);
console.log('staff-ops SETUP_SQL_V2 regenerated,', sql.length, 'chars of SQL');
