import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import type { AuthError, Session } from '@supabase/supabase-js';
import { InteractionManager, Platform } from 'react-native';

import { supabase } from '../../../lib/supabase';

const BIOMETRIC_ENABLED_KEY = 'vinylhead.biometric.enabled';
const BIOMETRIC_EMAIL_KEY = 'vinylhead.biometric.email';
const BIOMETRIC_SESSION_KEY = 'vinylhead.biometric.session';

const AUTH_PROMPT = 'Нэвтрэхийн тулд Face ID ашиглана уу';

type BiometricVaultPayload = {
  refresh_token: string;
};

/** Legacy vault stored both JWTs and can exceed SecureStore's 2048-byte limit. */
type LegacyBiometricVaultPayload = {
  access_token?: string;
  refresh_token?: string;
};

export type BiometricKind = 'face' | 'fingerprint' | 'none';

export type BiometricSupport = {
  available: boolean;
  label: string;
  kind: BiometricKind;
};

export type BiometricDebugState = {
  platform: string;
  enabledFlag: boolean;
  hasVault: boolean;
  vaultLength: number;
  refreshTokenLength: number;
  refreshTokenLooksValid: boolean;
  savedEmail: string | null;
  support: BiometricSupport;
  canUse: boolean;
};

const UNAVAILABLE_SUPPORT: BiometricSupport = {
  available: false,
  label: '',
  kind: 'none',
};

function mapBiometricError(
  error: LocalAuthentication.LocalAuthenticationError,
): string {
  switch (error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return 'Биометрик баталгаажуулалт цуцлагдлаа.';
    case 'not_enrolled':
      return 'Face ID тохируулаагүй байна. Тохиргоо → Face ID & Passcode руу орно уу.';
    case 'not_available':
      return 'Биометрик одоогоор боломжгүй байна. Аппаа дахин нээгээд оролдоно уу.';
    case 'lockout':
    case 'timeout':
      return 'Хэт олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.';
    case 'passcode_not_set':
      return 'Эхлээд утасныхаа нууц код тохируулна уу.';
    case 'unable_to_process':
    case 'invalid_context':
      return 'Биометрик цонх нээгдсэнгүй. Дахин оролдоно уу.';
    case 'authentication_failed':
      return 'Биометрик таарахгүй байна. Дахин оролдоно уу.';
    default:
      return 'Биометрик баталгаажуулалт амжилтгүй. Дахин оролдоно уу.';
  }
}

function mapRefreshError(error: AuthError): string {
  const msg = error.message.toLowerCase();
  if (
    msg.includes('invalid refresh token') ||
    msg.includes('refresh token not found') ||
    msg.includes('session not found')
  ) {
    return 'Хадгалсан нэвтрэлт хуучирсан байна. Имэйл, нууц үгээрээ дахин нэвтэрч Face ID-г дахин идэвхжүүлнэ үү.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Сүлжээний алдаа. Интернэт холболтоо шалгаад дахин оролдоно уу.';
  }
  return error.message || 'Биометрикээр нэвтэрч чадсангүй.';
}

/** Wait until modals/alerts finish closing — avoids iOS `invalid_context`. */
function afterUiSettled(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, Platform.OS === 'ios' ? 350 : 100);
    });
  });
}

async function runAuthenticate(): Promise<LocalAuthentication.LocalAuthenticationResult> {
  // Always allow device passcode fallback. Forcing biometrics-only on iOS shows
  // the system "Try Again" loop when Face ID fails and breaks Expo Go sign-in.
  return LocalAuthentication.authenticateAsync({
    promptMessage: AUTH_PROMPT,
    cancelLabel: 'Цуцлах',
    disableDeviceFallback: false,
    fallbackLabel: 'Нууц код',
    ...(Platform.OS === 'android'
      ? { biometricsSecurityLevel: 'strong' as const }
      : {}),
  });
}

async function promptBiometricAuth(_kind: BiometricKind): Promise<void> {
  let result = await runAuthenticate();

  if (
    !result.success &&
    (result.error === 'unable_to_process' || result.error === 'invalid_context')
  ) {
    await afterUiSettled();
    result = await runAuthenticate();
  }

  if (result.success) return;

  throw new Error(mapBiometricError(result.error));
}

function assertValidRefreshToken(refreshToken: string): void {
  const trimmed = refreshToken.trim();
  if (trimmed.length < 20) {
    throw new Error(
      'Refresh token бүрэн хадгалагдаагүй байна. Имэйл, нууц үгээрээ дахин нэвтэрч Face ID-г дахин идэвхжүүлнэ үү.',
    );
  }
}

function parseVaultPayload(raw: string): BiometricVaultPayload {
  let parsed: BiometricVaultPayload | LegacyBiometricVaultPayload;
  try {
    parsed = JSON.parse(raw) as BiometricVaultPayload | LegacyBiometricVaultPayload;
  } catch {
    throw new Error('Хадгалсан нэвтрэлт буруу байна. Дахин нэвтэрнэ үү.');
  }

  if (typeof parsed.refresh_token === 'string' && parsed.refresh_token.length > 0) {
    assertValidRefreshToken(parsed.refresh_token);
    return { refresh_token: parsed.refresh_token.trim() };
  }

  throw new Error(
    'Хадгалсан нэвтрэлт хуучин байна. Имэйл, нууц үгээрээ дахин нэвтэрч Face ID-г дахин идэвхжүүлнэ үү.',
  );
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') {
    return UNAVAILABLE_SUPPORT;
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return UNAVAILABLE_SUPPORT;
  }

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return UNAVAILABLE_SUPPORT;
  }

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const hasFace = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );
  const hasFingerprint = types.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );

  if (hasFace) {
    return {
      available: true,
      label: Platform.OS === 'ios' ? 'Face ID' : 'Нүүр царай',
      kind: 'face',
    };
  }

  if (hasFingerprint) {
    return {
      available: true,
      label: Platform.OS === 'ios' ? 'Touch ID' : 'Хурууны хээ',
      kind: 'fingerprint',
    };
  }

  return { available: true, label: 'Биометрик', kind: 'fingerprint' };
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const flag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return flag === 'true';
}

export async function getBiometricLoginEmail(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
}

function vaultHasValidRefreshToken(vault: string | null): boolean {
  if (vault == null || vault.length === 0) return false;
  try {
    parseVaultPayload(vault);
    return true;
  } catch {
    return false;
  }
}

export async function canUseBiometricLogin(): Promise<boolean> {
  const [enabled, support, vault] = await Promise.all([
    isBiometricLoginEnabled(),
    getBiometricSupport(),
    SecureStore.getItemAsync(BIOMETRIC_SESSION_KEY),
  ]);
  return enabled && support.available && vaultHasValidRefreshToken(vault);
}

/** Dev helper — logs biometric readiness to Metro console. */
export async function logBiometricDebugState(): Promise<BiometricDebugState> {
  const [enabledFlag, vault, savedEmail, support, canUse] = await Promise.all([
    isBiometricLoginEnabled(),
    SecureStore.getItemAsync(BIOMETRIC_SESSION_KEY),
    getBiometricLoginEmail(),
    getBiometricSupport(),
    canUseBiometricLogin(),
  ]);

  let refreshTokenLength = 0;
  let refreshTokenLooksValid = false;
  if (vault) {
    try {
      const parsed = parseVaultPayload(vault);
      refreshTokenLength = parsed.refresh_token.length;
      refreshTokenLooksValid = true;
    } catch {
      refreshTokenLength = 0;
    }
  }

  const state: BiometricDebugState = {
    platform: Platform.OS,
    enabledFlag,
    hasVault: vault != null && vault.length > 0,
    vaultLength: vault?.length ?? 0,
    refreshTokenLength,
    refreshTokenLooksValid,
    savedEmail,
    support,
    canUse,
  };

  if (__DEV__) {
    console.log('[biometric]', JSON.stringify(state, null, 2));
  }

  return state;
}

/** Clears a broken partial setup (enabled flag set but vault missing). */
export async function repairBiometricLoginState(): Promise<void> {
  const enabled = await isBiometricLoginEnabled();
  const vault = await SecureStore.getItemAsync(BIOMETRIC_SESSION_KEY);
  if (enabled && !vaultHasValidRefreshToken(vault)) {
    await clearBiometricLogin();
  }
}

export async function enableBiometricLogin(
  session: Session,
  email: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Биометрик нэвтрэлт зөвхөн утсан дээр ажиллана.');
  }

  await afterUiSettled();

  const support = await getBiometricSupport();
  if (!support.available) {
    throw new Error('Энэ төхөөрөмж дээр биометрик тохируулаагүй байна.');
  }

  const refreshToken = session.refresh_token?.trim();
  if (!refreshToken) {
    throw new Error('Refresh token олдсонгүй. Дахин нэвтэрнэ үү.');
  }
  assertValidRefreshToken(refreshToken);

  await promptBiometricAuth(support.kind);
  await clearBiometricLogin();

  const payload: BiometricVaultPayload = { refresh_token: refreshToken };

  await SecureStore.setItemAsync(
    BIOMETRIC_SESSION_KEY,
    JSON.stringify(payload),
  );
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email.trim());
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

  if (__DEV__) {
    await logBiometricDebugState();
  }
}

export async function clearBiometricLogin(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(BIOMETRIC_SESSION_KEY).catch(() => undefined),
  ]);
}

export async function signInWithBiometric(): Promise<Session> {
  if (Platform.OS === 'web') {
    throw new Error('Биометрик нэвтрэлт зөвхөн утсан дээр ажиллана.');
  }

  const support = await getBiometricSupport();
  if (!support.available) {
    throw new Error('Энэ төхөөрөмж дээр биометрик тохируулаагүй байна.');
  }

  const enabled = await isBiometricLoginEnabled();
  if (!enabled) {
    throw new Error('Биометрик нэвтрэлт идэвхгүй байна.');
  }

  await promptBiometricAuth(support.kind);

  const raw = await SecureStore.getItemAsync(BIOMETRIC_SESSION_KEY);
  if (!raw) {
    await clearBiometricLogin();
    throw new Error(
      'Хадгалсан нэвтрэлт олдсонгүй. Имэйл, нууц үгээрээ дахин нэвтэрнэ үү.',
    );
  }

  const { refresh_token: refreshToken } = parseVaultPayload(raw);

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    if (__DEV__) {
      console.warn('[biometric] refreshSession failed:', error.message);
    }
    await clearBiometricLogin();
    throw new Error(mapRefreshError(error));
  }

  if (!data.session) {
    await clearBiometricLogin();
    throw new Error('Сесс үүсгэж чадсангүй. Имэйл, нууц үгээрээ дахин нэвтэрнэ үү.');
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (setSessionError) {
    await clearBiometricLogin();
    throw new Error(mapRefreshError(setSessionError));
  }

  const nextRefresh = data.session.refresh_token?.trim();
  if (nextRefresh) {
    await SecureStore.setItemAsync(
      BIOMETRIC_SESSION_KEY,
      JSON.stringify({ refresh_token: nextRefresh } satisfies BiometricVaultPayload),
    );
  }

  if (__DEV__) {
    await logBiometricDebugState();
  }

  return data.session;
}
