/**
 * Apply Supabase schema + seed from your machine (requires DB credentials).
 *
 * Option A — recommended: set DATABASE_URL in `.env` or `.env.local` (copy "URI" from
 * Supabase Dashboard → Project Settings → Database; use Session mode or
 * direct connection; never commit this file).
 *
 * Option B: set SUPABASE_DB_PASSWORD in `.env` or `.env.local` (Database password).
 * The script builds a **pooler** URI (IPv4-friendly). Set SUPABASE_DB_REGION if needed
 * (default `ap-northeast-1` — see Dashboard → Database → Pooler region).
 *
 * Usage: npm run db:apply
 */
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function projectRefFromUrl(url) {
  const m = String(url || '').match(/https:\/\/([^.]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

function buildPoolerUrl(ref, password, region) {
  const enc = encodeURIComponent(password);
  return `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
}

function buildDirectUrl(ref, password) {
  const enc = encodeURIComponent(password);
  return `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`;
}

function maskConnectionString(url) {
  return String(url).replace(/:([^:@/]+)@/, ':***@');
}

const POOLER_REGION_CANDIDATES = [
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'eu-west-1',
  'eu-central-1',
];

async function probePooler(url) {
  const sql = postgres(url, {
    ssl: 'require',
    max: 1,
    connect_timeout: 8,
    prepare: false,
  });
  try {
    await sql`select 1 as ok`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

async function discoverPoolerUrl(ref, password, env) {
  const enc = encodeURIComponent(password);
  const customHost = env.SUPABASE_POOLER_HOST?.trim();
  if (customHost) {
    const url = `postgresql://postgres.${ref}:${enc}@${customHost}:5432/postgres`;
    if (await probePooler(url)) return url;
  }

  for (const prefix of ['aws-0', 'aws-1']) {
    for (const region of POOLER_REGION_CANDIDATES) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      const url = `postgresql://postgres.${ref}:${enc}@${host}:5432/postgres`;
      try {
        if (await probePooler(url)) {
          console.log(`Found working pooler host: ${host}`);
          return url;
        }
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

function parseOnlyMigrationArg(argv) {
  const onlyFlag = argv.find((a) => a.startsWith('--only='));
  if (onlyFlag) return onlyFlag.slice('--only='.length);
  const onlyIdx = argv.indexOf('--only');
  if (onlyIdx !== -1 && argv[onlyIdx + 1]) return argv[onlyIdx + 1];
  return null;
}

async function main() {
  const onlyMigration = parseOnlyMigrationArg(process.argv.slice(2));
  const root = path.join(__dirname, '..');
  const dotEnv = loadEnvFile(path.join(root, '.env'));
  const dotEnvLocal = loadEnvFile(path.join(root, '.env.local'));
  const fileEnv = { ...dotEnv, ...dotEnvLocal };
  const env = { ...process.env, ...fileEnv };

  let connectionString = env.DATABASE_URL || null;
  const password = env.SUPABASE_DB_PASSWORD || null;
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || '';
  const ref =
    env.SUPABASE_PROJECT_REF?.trim() || projectRefFromUrl(supabaseUrl) || null;

  if (!connectionString && password) {
    if (!ref) {
      console.error(
        [
          'SUPABASE_DB_PASSWORD is set but the project ref could not be resolved.',
          '',
          'Set EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co in `.env`',
          'or add SUPABASE_PROJECT_REF=YOUR_REF',
        ].join('\n'),
      );
      process.exit(1);
    }

    if (env.SUPABASE_POOLER_HOST?.trim()) {
      const enc = encodeURIComponent(password);
      connectionString = `postgresql://postgres.${ref}:${enc}@${env.SUPABASE_POOLER_HOST.trim()}:5432/postgres`;
    } else if (env.SUPABASE_DB_REGION?.trim()) {
      connectionString = buildPoolerUrl(
        ref,
        password,
        env.SUPABASE_DB_REGION.trim(),
      );
    } else {
      console.log('Looking for the correct Supabase pooler host…');
      connectionString = await discoverPoolerUrl(ref, password, env);
      if (!connectionString) {
        console.error(
          [
            'Could not connect with SUPABASE_DB_PASSWORD alone.',
            '',
            'Recommended fix:',
            '  1. Supabase Dashboard → Connect → Session mode',
            '  2. Copy the full connection URI',
            '  3. Add to `.env`: DATABASE_URL=postgresql://postgres.[ref]:…',
            '  4. Run: npm run db:apply',
            '',
            'Or set SUPABASE_POOLER_HOST from that URI (host only), e.g.',
            '  SUPABASE_POOLER_HOST=aws-1-ap-northeast-1.pooler.supabase.com',
          ].join('\n'),
        );
        process.exit(1);
      }
    }
  }

  if (!connectionString) {
    const hasApiUrl = !!env.EXPO_PUBLIC_SUPABASE_URL;
    const hasApiKey = !!(
      env.EXPO_PUBLIC_SUPABASE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );
    console.error(
      [
        'Missing database credentials for schema push.',
        '',
        hasApiUrl && hasApiKey
          ? '(You have API URL + key in .env — those are for the app only, not Postgres DDL.)'
          : '',
        '',
        'Add one of the following to `.env` or `.env.local` (both are loaded; gitignored):',
        '  DATABASE_URL=…  (copy full URI from Database settings — avoids DNS/region issues)',
        '  OR',
        '  SUPABASE_DB_PASSWORD=your_database_password',
        '    — optional: SUPABASE_DB_REGION=ap-northeast-1 (default) if pooler host is wrong',
        '',
        'Then run: npm run db:apply',
        '',
        'Or paste `supabase/remote_apply.sql` into Supabase → SQL Editor → Run.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    process.exit(1);
  }

  const migrationsDir = path.join(root, 'supabase', 'migrations');
  let migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (onlyMigration) {
    const name = onlyMigration.endsWith('.sql')
      ? onlyMigration
      : `${onlyMigration}.sql`;
    if (!migrationFiles.includes(name)) {
      console.error(`Migration not found: ${name}`);
      process.exit(1);
    }
    migrationFiles = [name];
    console.log(`Applying only: ${name}`);
  }

  const seedPath = path.join(root, 'supabase', 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  const runSeed = !onlyMigration;

  async function runMigrations(connStr) {
    const viaPooler =
      typeof connStr === 'string' && connStr.includes('pooler.supabase.com');

    const sql = postgres(connStr, {
      ssl: 'require',
      max: 1,
      connect_timeout: 30,
      ...(viaPooler ? { prepare: false } : {}),
    });

    try {
      console.log(`Connecting: ${maskConnectionString(connStr)}`);
      for (const file of migrationFiles) {
        console.log(`Applying migration: ${file}`);
        const migrationSql = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8',
        );
        try {
          await sql.unsafe(migrationSql);
        } catch (err) {
          if (err?.code === '42P07') {
            console.log(`  (skipped — already exists: ${err.message})`);
            continue;
          }
          if (err?.code === '42710') {
            console.log(`  (skipped — already exists: ${err.message})`);
            continue;
          }
          throw err;
        }
      }
      if (runSeed) {
        console.log('Applying seed…');
        await sql.unsafe(seedSql);
      }
      console.log('Done.');
    } finally {
      await sql.end({ timeout: 5 });
    }
  }

  try {
    await runMigrations(connectionString);
  } catch (err) {
    const msg = String(err?.message || err);
    const poolerTenantMissing =
      msg.includes('tenant/user') && msg.includes('not found');

    console.error(err);
    if (poolerTenantMissing || msg.includes('ENOTFOUND')) {
      console.error(
        [
          '',
          'Database connection failed. Use the exact URI from your dashboard:',
          '  Supabase → Connect → Session mode → copy URI → DATABASE_URL in `.env`',
          '',
          'Password-only mode needs the correct pooler host (not always aws-0-ap-northeast-1).',
          'Set SUPABASE_POOLER_HOST=… from that URI, or run discover by removing SUPABASE_DB_REGION.',
        ].join('\n'),
      );
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
