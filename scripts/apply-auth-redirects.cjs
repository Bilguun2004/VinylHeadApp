/**
 * Push Supabase auth redirect URL settings to your hosted project.
 *
 * Requires in `.env` or `.env.local`:
 *   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
 *   SUPABASE_ACCESS_TOKEN=...  (Dashboard → Account → Access Tokens)
 *
 * Usage: npm run auth:apply
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
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens',
  );
  process.exit(1);
}

const siteUrl = env.SUPABASE_AUTH_SITE_URL?.trim() || 'vinylhead://';

const redirectUrls = [
  'vinylhead://reset-password',
  'vinylhead://auth-callback',
  'vinylhead://**',
  'http://127.0.0.1:3000/reset-password',
  'http://localhost:3000/reset-password',
  'https://127.0.0.1:3000/reset-password',
  'http://127.0.0.1:3000/auth-callback',
  'http://localhost:3000/auth-callback',
  'https://127.0.0.1:3000/auth-callback',
];

const payload = {
  site_url: siteUrl,
  uri_allow_list: redirectUrls.join(','),
};

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

  console.log('Auth redirect settings applied to project:', projectRef);
  console.log('  site_url:', siteUrl);
  for (const url of redirectUrls) {
    console.log('  redirect:', url);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
