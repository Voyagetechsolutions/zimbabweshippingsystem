// Regenerates the SETUP_SQL_V2 constant inside supabase/functions/staff-ops/index.ts
// from the operations migrations. Run after editing either migration:
// node tools/embed-staff-ops-sql.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fnPath = path.join(root, 'supabase/functions/staff-ops/index.ts');
// The later pilot-hardening migration carries the final private read policies
// together with staff-role and finance controls. Public booking uses
// create_public_booking; public tracking uses get_shipment_tracking_info.
const sqlPaths = [
  path.join(root, 'supabase/migrations/20260719_operations_upgrade.sql'),
  path.join(root, 'supabase/migrations/20260721_admin_screens.sql'),
  path.join(root, 'supabase/migrations/20260722_fix_schedule_typos.sql'),
  path.join(root, 'supabase/migrations/20260808_booking_accounts_self_collection.sql'),
  path.join(root, 'supabase/migrations/20260809_schedule_generate_approve.sql'),
  path.join(root, 'supabase/migrations/20260810_driver_route_collections.sql'),
  path.join(root, 'supabase/migrations/20260810190000_driver_collection_operations.sql'),
  path.join(root, 'supabase/migrations/20260810210000_pilot_security_hardening.sql'),
  path.join(root, 'supabase/migrations/20260810230000_driver_collection_live_locations.sql'),
  path.join(root, 'supabase/migrations/20260814120000_fix_custom_quote_notifications.sql'),
  path.join(root, 'supabase/migrations/20260815090000_delivery_driver_operations.sql'),
  path.join(root, 'supabase/migrations/20260822090000_delivery_note_register.sql'),
  path.join(root, 'supabase/migrations/20260822120000_delivery_note_amendments.sql'),
  path.join(root, 'supabase/migrations/20260822150000_whatsapp_ai_conversations.sql'),
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
