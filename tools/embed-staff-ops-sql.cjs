// Regenerates the SETUP_SQL_V2 constant inside supabase/functions/staff-ops/index.ts
// from supabase/migrations/20260719_operations_upgrade.sql. Run after editing the
// migration: node tools/embed-staff-ops-sql.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fnPath = path.join(root, 'supabase/functions/staff-ops/index.ts');
const sqlPath = path.join(root, 'supabase/migrations/20260719_operations_upgrade.sql');

const src = fs.readFileSync(fnPath, 'utf8');
const sql = fs.readFileSync(sqlPath, 'utf8');

// The replacement goes through a function so `$` sequences in the SQL are
// never interpreted as String.replace substitution patterns.
const out = src.replace(
  /const SETUP_SQL_V2 = ".*?";/s,
  () => 'const SETUP_SQL_V2 = ' + JSON.stringify(sql) + ';'
);
if (out === src) throw new Error('SETUP_SQL_V2 constant not found in staff-ops/index.ts');
fs.writeFileSync(fnPath, out);
console.log('staff-ops SETUP_SQL_V2 regenerated,', sql.length, 'chars of SQL');
