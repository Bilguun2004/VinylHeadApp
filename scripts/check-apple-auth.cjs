/**
 * Print hosted Supabase Apple auth provider status.
 * Usage: npm run apple:check
 */
const fs = require('fs');
const path = require('path');

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
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

async function main() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    console.error(`Failed (${res.status}):`, await res.text());
    process.exit(1);
  }

  const config = await res.json();
  console.log('Project:', projectRef);
  console.log('  external_apple_enabled:', config.external_apple_enabled);
  console.log('  external_apple_client_id:', config.external_apple_client_id);
  console.log(
    '  external_apple_secret:',
    config.external_apple_secret ? '(set)' : '(not set)',
  );
  console.log('');
  console.log(
    'Users appear under Dashboard → Authentication → Users.',
  );
  console.log(
    'Profile rows are in Table Editor → public.profiles (not user_profiles).',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
