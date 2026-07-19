const fs = require('fs');
const s = fs.readFileSync('supabase/functions/staff-ops/index.ts', 'utf8');
const m = s.match(/const SETUP_SQL_V2 = ("(?:[^"\]|\.)*");/s);
const sql = JSON.parse(m[1]);
const orig = fs.readFileSync('supabase/migrations/20260719_operations_upgrade.sql', 'utf8');
console.log('embedded matches migration:', sql === orig);
