const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    failures.push(`Missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function requireText(relativePath, patterns) {
  const content = read(relativePath);
  for (const [label, pattern] of patterns) {
    if (!pattern.test(content)) failures.push(`${relativePath}: missing ${label}`);
  }
}

requireText('supabase/migrations/20260810210000_pilot_security_hardening.sql', [
  ['profile privilege guard', /protect_profile_privileges_before_update/],
  ['driver finance isolation', /Customers read own payments/],
  ['audited payment receipt RPC', /mark_payment_received/],
  ['received-before-reconciled guard', /Record the payment as received before reconciliation/],
  ['sensitive mutation audit', /audit_sensitive_mutation/],
]);

requireText('staff-app/src/context/AuthContext.tsx', [
  ['non-blocking auth callback', /Supabase auth callbacks must finish synchronously/],
]);

requireText('docs/PILOT_RELEASE_CHECKLIST.md', [
  ['device verification gate', /Physical-device gate/],
  ['rollback procedure', /Rollback/],
  ['finance sign-off', /Finance sign-off/],
]);

const staffSource = path.join(root, 'staff-app', 'src');
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(fullPath);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/voyage\s*tech|voyagetechsolutions/i.test(content)) {
        failures.push(`Legacy company branding in ${path.relative(root, fullPath)}`);
      }
    }
  }
}
scan(staffSource);

if (failures.length) {
  console.error('Pilot code gate failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Pilot code gate passed.');
  console.log('Physical-device, finance and operational sign-offs are still required.');
}
