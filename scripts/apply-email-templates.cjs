/**
 * Push Supabase auth email templates to your hosted project.
 *
 * Requires in `.env` or `.env.local`:
 *   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
 *   SUPABASE_ACCESS_TOKEN=...  (Dashboard → Account → Access Tokens)
 *
 * Usage: npm run email:apply
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

const templatesDir = path.join(root, 'supabase', 'templates');
const confirmationHtml = fs.readFileSync(
  path.join(templatesDir, 'confirmation.html'),
  'utf8',
);
const recoveryHtml = fs.readFileSync(
  path.join(templatesDir, 'recovery.html'),
  'utf8',
);

const payload = {
  mailer_subjects_confirmation: 'Пянз Толгойт — Бүртгэл баталгаажуулах',
  mailer_templates_confirmation_content: confirmationHtml,
  mailer_subjects_recovery: 'Пянз Толгойт — Нууц үг сэргээх',
  mailer_templates_recovery_content: recoveryHtml,
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

  console.log('Email templates applied to project:', projectRef);
  console.log('  - confirmation (sign up)');
  console.log('  - recovery (password reset)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
