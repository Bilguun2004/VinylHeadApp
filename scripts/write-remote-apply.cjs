/**
 * Writes `supabase/remote_apply.sql` (all migrations in order + seed) using UTF-8.
 * Run: node scripts/write-remote-apply.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const sections = migrationFiles.map((name) => {
  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8').trimEnd();
  return `-- ===== migration: ${name} =====\n${sql}`;
});

const seed = fs.readFileSync(path.join(root, 'supabase', 'seed.sql'), 'utf8').trimEnd();
sections.push(`-- ===== seed: seed.sql =====\n${seed}`);

const out = `${sections.join('\n\n')}\n`;
fs.writeFileSync(path.join(root, 'supabase', 'remote_apply.sql'), out, 'utf8');
console.log(`Wrote supabase/remote_apply.sql (${migrationFiles.length} migrations + seed)`);
