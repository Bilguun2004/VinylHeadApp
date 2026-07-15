/**
 * Generate a Sign in with Apple client secret (ES256 JWT).
 * Apple requires rotating this secret at least every 6 months for OAuth flows.
 *
 * Env (from .env / .env.local):
 *   APPLE_CLIENT_ID        — Services ID (e.g. com.example.app.web) used for OAuth
 *   APPLE_TEAM_ID          — 10-char Apple Developer Team ID
 *   APPLE_KEY_ID           — Key ID from Apple Developer → Keys
 *   APPLE_PRIVATE_KEY      — Contents of AuthKey_XXXX.p8 (use \n for newlines in .env)
 *   APPLE_PRIVATE_KEY_PATH — Easier: path to AuthKey_XXXX.p8 file (overrides APPLE_PRIVATE_KEY)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MAX_TTL_SECONDS = 15777000; // ~6 months (Apple maximum)

const PEM_PKCS8_BEGIN = '-----BEGIN PRIVATE KEY-----';
const PEM_PKCS8_END = '-----END PRIVATE KEY-----';
const PEM_EC_BEGIN = '-----BEGIN EC PRIVATE KEY-----';
const PEM_EC_END = '-----END EC PRIVATE KEY-----';

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function wrapPemBody(begin, end, singleLine) {
  const body = singleLine
    .replace(begin, '')
    .replace(end, '')
    .replace(/\s+/g, '');
  if (!body) return '';
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `${begin}\n${lines.join('\n')}\n${end}`;
}

function normalizePrivateKeyPem(raw) {
  if (!raw) return '';

  let key = stripQuotes(String(raw));
  key = key.replace(/\\n/g, '\n').trim();

  if (!key.includes('BEGIN')) {
    // Raw base64 body only
    const lines = key.replace(/\s+/g, '').match(/.{1,64}/g) ?? [key];
    return `${PEM_PKCS8_BEGIN}\n${lines.join('\n')}\n${PEM_PKCS8_END}`;
  }

  if (!key.includes('\n')) {
    if (key.includes(PEM_PKCS8_BEGIN)) {
      return wrapPemBody(PEM_PKCS8_BEGIN, PEM_PKCS8_END, key);
    }
    if (key.includes(PEM_EC_BEGIN)) {
      return wrapPemBody(PEM_EC_BEGIN, PEM_EC_END, key);
    }
  }

  return key;
}

function readPrivateKeyFromEnv(env, rootDir) {
  const keyPath = env.APPLE_PRIVATE_KEY_PATH?.trim();
  if (keyPath) {
    const resolved = path.isAbsolute(keyPath)
      ? keyPath
      : path.join(rootDir ?? process.cwd(), keyPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`APPLE_PRIVATE_KEY_PATH not found: ${resolved}`);
    }
    return fs.readFileSync(resolved, 'utf8').trim();
  }

  const inline = env.APPLE_PRIVATE_KEY;
  if (!inline?.trim()) {
    return '';
  }

  const trimmed = inline.trim();
  if (
    trimmed.endsWith('.p8') &&
    !trimmed.includes('BEGIN PRIVATE KEY') &&
    !trimmed.includes('BEGIN EC PRIVATE KEY')
  ) {
    const resolved = path.isAbsolute(trimmed)
      ? trimmed
      : path.join(rootDir ?? process.cwd(), trimmed);
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, 'utf8').trim();
    }
  }

  return trimmed;
}

function parsePrivateKey(pem) {
  const normalized = normalizePrivateKeyPem(pem);
  if (!normalized) {
    throw new Error('APPLE_PRIVATE_KEY is empty');
  }

  try {
    return crypto.createPrivateKey({ key: normalized, format: 'pem' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not parse Apple private key (${message}). ` +
        'Use APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXX.p8 pointing at your downloaded .p8 file, ' +
        'or paste the full PEM with \\n between lines in APPLE_PRIVATE_KEY.',
    );
  }
}

function generateAppleClientSecret({
  clientId,
  teamId,
  keyId,
  privateKeyPem,
  expiresInSeconds = MAX_TTL_SECONDS,
}) {
  const privateKey = parsePrivateKey(privateKeyPem);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + expiresInSeconds,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${unsigned}.${signature.toString('base64url')}`;
}

function loadFromEnv(env, rootDir) {
  const clientId = env.APPLE_CLIENT_ID?.trim();
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const privateKeyPem = readPrivateKeyFromEnv(env, rootDir);

  if (!clientId || !teamId || !keyId || !privateKeyPem) {
    throw new Error(
      'Missing APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY / APPLE_PRIVATE_KEY_PATH',
    );
  }

  return generateAppleClientSecret({
    clientId,
    teamId,
    keyId,
    privateKeyPem,
  });
}

module.exports = {
  generateAppleClientSecret,
  loadFromEnv,
  normalizePrivateKeyPem,
  readPrivateKeyFromEnv,
};
