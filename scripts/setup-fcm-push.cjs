/**
 * Validates Firebase push setup files before an EAS Android build.
 *
 * Required:
 *   1. google-services.json at project root (Firebase Console → Android app)
 *   2. FCM V1 service account JSON uploaded to expo.dev (Credentials → Android)
 *
 * Usage:
 *   npm run fcm:check
 *   npm run fcm:setup   (opens Firebase + Expo credential pages)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PACKAGE = 'com.vinylhead.app';
const GOOGLE_SERVICES = path.join(ROOT, 'google-services.json');
const EXPO_PROJECT = 'https://expo.dev/accounts/bilguun88/projects/VinylHeadApp';
const FIREBASE_CONSOLE = 'https://console.firebase.google.com/';

function openUrl(url) {
  if (process.platform === 'win32') {
    execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true });
  } else if (process.platform === 'darwin') {
    execSync(`open "${url}"`, { stdio: 'ignore' });
  } else {
    execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
  }
}

function printSetupSteps() {
  console.log(`
FCM push setup (one-time)

1) Firebase project
   Open: ${FIREBASE_CONSOLE}
   - Create a project (or use existing)
   - Add Android app with package: ${PACKAGE}
   - Download google-services.json
   - Save to: ${GOOGLE_SERVICES}

2) FCM V1 service account (for Expo to SEND notifications)
   Firebase → Project settings → Service accounts → Generate new private key
   Upload JSON at:
   ${EXPO_PROJECT}/credentials
   → Android → ${PACKAGE} → FCM V1 service account key

3) Verify locally
   npm run fcm:check

4) Rebuild APK
   eas build --profile preview --platform android
`);
}

function validateGitTracked(relativePath) {
  try {
    execSync(`git ls-files --error-unmatch "${relativePath}"`, {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function validateGoogleServices() {
  if (!fs.existsSync(GOOGLE_SERVICES)) {
    return {
      ok: false,
      error: `Missing ${GOOGLE_SERVICES}`,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(GOOGLE_SERVICES, 'utf8'));
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${err.message}` };
  }

  const clients = parsed.client ?? [];
  const match = clients.find(
    (c) =>
      c.client_info?.android_client_info?.package_name === PACKAGE,
  );

  if (!match) {
    const found = clients
      .map((c) => c.client_info?.android_client_info?.package_name)
      .filter(Boolean);
    return {
      ok: false,
      error: `google-services.json package must be ${PACKAGE}. Found: ${found.join(', ') || 'none'}`,
    };
  }

  return {
    ok: true,
    projectId: parsed.project_info?.project_id ?? 'unknown',
  };
}

function main() {
  const openBrowser = process.argv.includes('--open');

  if (openBrowser) {
    openUrl(FIREBASE_CONSOLE);
    openUrl(`${EXPO_PROJECT}/credentials`);
    printSetupSteps();
  }

  const result = validateGoogleServices();
  if (!result.ok) {
    console.error(`\nFCM check failed: ${result.error}\n`);
    if (!openBrowser) {
      printSetupSteps();
    }
    process.exit(openBrowser ? 0 : 1);
  }

  console.log(`\nFCM check passed (Firebase project: ${result.projectId}).`);
  console.log(
    'Ensure FCM V1 service account key is uploaded on expo.dev credentials.',
  );
  console.log(`Dashboard: ${EXPO_PROJECT}/credentials\n`);

  const tracked = validateGitTracked('google-services.json');
  const hasEasEnv = Boolean(process.env.GOOGLE_SERVICES_JSON?.trim());
  const allowUntracked =
    process.argv.includes('--allow-untracked') ||
    process.env.EAS_NO_VCS === '1';
  if (!tracked && !hasEasEnv && !allowUntracked) {
    console.warn(
      'WARNING: google-services.json is not git-tracked and GOOGLE_SERVICES_JSON is not set.',
    );
    console.warn(
      'EAS Build may omit the file → FirebaseApp not initialized on device.',
    );
    console.warn(
      'Fix: git add google-services.json OR set EAS file env GOOGLE_SERVICES_JSON,',
    );
    console.warn('     or run build with EAS_NO_VCS=1 (npm run build:preview:android).\n');
    process.exit(1);
  }
}

main();
