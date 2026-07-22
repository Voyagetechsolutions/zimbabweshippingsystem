// Regenerates the SETUP_SQL_V2 constant inside supabase/functions/staff-ops/index.ts
// from the operations migrations. Run after editing either migration:
// node tools/embed-staff-ops-sql.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fnPath = path.join(root, 'supabase/functions/staff-ops/index.ts');
const sqlPaths = [
  path.join(root, 'supabase/migrations/20260719_operations_upgrade.sql'),
  path.join(root, 'supabase/migrations/20260721_admin_screens.sql'),
  path.join(root, 'supabase/migrations/20260722_fix_schedule_typos.sql'),
];

const src = fs.readFileSync(fnPath, 'utf8');
const sql = sqlPaths.map((p) => fs.readFileSync(p, 'utf8')).join('\n\n');

// The replacement goes through a function so `$` sequences in the SQL are
// never interpreted as String.replace substitution patterns.
const out = src.replace(
  /const SETUP_SQL_V2 = ".*?";/s,
  () => 'const SETUP_SQL_V2 = ' + JSON.stringify(sql) + ';'
);
if (out === src) throw new Error('SETUP_SQL_V2 constant not found in staff-ops/index.ts');
fs.writeFileSync(fnPath, out);
console.log('staff-ops SETUP_SQL_V2 regenerated,', sql.length, 'chars of SQL');
