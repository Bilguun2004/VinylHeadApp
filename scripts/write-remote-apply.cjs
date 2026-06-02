/**
 * Writes `supabase/remote_apply.sql` (migration + seed) using UTF-8.
 * Run: node scripts/write-remote-apply.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260513180000_initial_ecommerce_schema.sql'),
  'utf8',
);
const seed = fs.readFileSync(path.join(root, 'supabase', 'seed.sql'), 'utf8');
const out = `${migration.trimEnd()}\n\n${seed.trimEnd()}\n`;
fs.writeFileSync(path.join(root, 'supabase', 'remote_apply.sql'), out, 'utf8');
console.log('Wrote supabase/remote_apply.sql');
