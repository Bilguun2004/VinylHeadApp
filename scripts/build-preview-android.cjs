/**
 * Preview Android build with google-services.json included.
 * EAS_NO_VCS=1 uploads untracked files (required when google-services.json is not committed).
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

execSync('node scripts/setup-fcm-push.cjs --allow-untracked', {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, EAS_NO_VCS: '1' },
});

execSync(
  'eas build --profile preview --platform android --non-interactive',
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, EAS_NO_VCS: '1' },
  },
);
