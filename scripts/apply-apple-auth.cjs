/**
 * Enable Sign in with Apple on your hosted Supabase project.
 *
 * Requires in `.env` or `.env.local`:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_ACCESS_TOKEN
 *   APPLE_CLIENT_ID      — Services ID for web/Android OAuth
 *   APPLE_TEAM_ID
 *   APPLE_KEY_ID
 *   APPLE_PRIVATE_KEY
 *
 * Optional:
 *   APPLE_CLIENT_IDS     — comma-separated Client IDs for Supabase (bundle + Services IDs)
 *                          Defaults to APPLE_CLIENT_ID + com.vinylhead.app
 *
 * Usage: npm run apple:apply
 */
const fs = require('fs');
const path = require('path');

const { loadFromEnv } = require('./generate-apple-client-secret.cjs');

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

const root = path.join(__dirname, '..');
const env = {
  ...loadEnvFile(path.join(root, '.env')),
  ...loadEnvFile(path.join(root, '.env.local')),
  ...process.env,
};

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const projectRef = projectRefFromUrl(supabaseUrl);

if (!projectRef) {
  console.error('Missing or invalid EXPO_PUBLIC_SUPABASE_URL in .env');
  process.exit(1);
}
if (!accessToken) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens',
  );
  process.exit(1);
}

const defaultNativeBundleId = 'com.vinylhead.app';
const servicesClientId = env.APPLE_CLIENT_ID?.trim();
const clientIds = (
  env.APPLE_CLIENT_IDS?.trim() ||
  [servicesClientId, defaultNativeBundleId, 'host.exp.Exponent']
    .filter(Boolean)
    .join(',')
).replace(/\s+/g, '');

let appleSecret = null;
try {
  appleSecret = loadFromEnv(env, root);
} catch (err) {
  const nativeOnly = env.APPLE_NATIVE_ONLY?.trim() === '1';
  if (!nativeOnly) {
    console.error(err instanceof Error ? err.message : err);
    console.error(
      'Tip: for iOS-only signInWithIdToken you can set APPLE_NATIVE_ONLY=1 ' +
        'to enable Apple with Client IDs only (no OAuth secret).',
    );
    process.exit(1);
  }
  console.warn(
    'No Apple private key — enabling native Sign in with Apple (Client IDs only).',
  );
}

const payload = {
  external_apple_enabled: true,
  external_apple_client_id: clientIds,
};
if (appleSecret) {
  payload.external_apple_secret = appleSecret;
}

async function main() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed (${res.status}): ${body}`);
    process.exit(1);
  }

  console.log('Apple auth provider applied to project:', projectRef);
  console.log('  client_ids:', clientIds);
  console.log(
    '  secret: generated (valid ~6 months — re-run npm run apple:apply before expiry)',
  );
  console.log('');
  console.log(
    'Also run: npm run auth:apply  (ensures vinylhead://auth-callback is allow-listed)',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
