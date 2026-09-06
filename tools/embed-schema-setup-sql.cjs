// Regenerates the SETUP_SQL constant inside
// supabase/functions/app-schema-setup/index.ts from the migrations below.
// Run after editing any of them:
//   node tools/embed-schema-setup-sql.cjs
//
// Order matters — the files are concatenated and executed as one script.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fnPath = path.join(root, 'supabase/functions/app-schema-setup/index.ts');
const sqlPaths = [
  path.join(root, 'supabase/migrations/20260903120000_collection_time_slots.sql'),
  path.join(root, 'supabase/migrations/20260903140000_pickup_addresses_and_drum_purchase.sql'),
  path.join(root, 'supabase/migrations/20260903160000_collection_runs.sql'),
  path.join(root, 'supabase/migrations/20260903180000_assign_group_driver.sql'),
  path.join(root, 'supabase/migrations/20260906120000_booking_confirmation.sql'),
  path.join(root, 'supabase/migrations/20260906130000_itemised_quote_lines.sql'),
  path.join(root, 'supabase/migrations/20260906140000_staff_payment_proof_uploads.sql'),
  path.join(root, 'supabase/migrations/20260906150000_website_customer_reference.sql'),
];

// The constant is always exactly one line, because JSON.stringify never emits a
// raw newline — so it is replaced line-wise.
//
// A whole-file regex is the obvious approach and a trap. `".*?";` stops at the
// first escaped quote-semicolon inside the embedded SQL: a comment reading
// `"LU1"; anything shorter...` is written out as `\";` and the non-greedy match
// happily ends there, truncating the constant and leaving the tail of the old
// string behind as unparseable JavaScript. Nothing local complains; the deploy
// fails minutes later with a bundler parse error pointing at the SQL comment.
const PREFIX = 'const SETUP_SQL = ';
const NEWLINE = /\r?\n/;

const src = fs.readFileSync(fnPath, 'utf8');
const sql = sqlPaths.map((p) => fs.readFileSync(p, 'utf8')).join('\n\n');

const lines = src.split(NEWLINE);
const at = lines.findIndex((line) => line.startsWith(PREFIX));
if (at === -1) throw new Error('SETUP_SQL constant not found in app-schema-setup/index.ts');

lines[at] = PREFIX + JSON.stringify(sql) + ';';
const out = lines.join('\n');

// Prove it round-trips before writing over a working function.
if (JSON.parse(out.split(NEWLINE)[at].slice(PREFIX.length, -1)) !== sql) {
  throw new Error('Embedded SQL did not round-trip — refusing to write.');
}

if (out === src) {
  console.log('SETUP_SQL already up to date,', sql.length, 'chars of SQL');
} else {
  fs.writeFileSync(fnPath, out);
  console.log('Embedded', sql.length, 'chars from', sqlPaths.length, 'migrations into app-schema-setup');
}
