import { Platform } from 'react-native';

const APP_SCHEME = 'vinylhead';

export type AuthRedirectPath = 'reset-password' | 'auth-callback';

function getNativeRedirectUrl(path: AuthRedirectPath): string {
  return `${APP_SCHEME}://${path}`;
}

export function getAuthRedirectUrl(path: AuthRedirectPath): string | undefined {
  const envOverride =
    path === 'reset-password'
      ? process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL
      : undefined;

  if (envOverride?.trim()) {
    return envOverride.trim();
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/${path}`;
  }

  if (Platform.OS === 'web') {
    return undefined;
  }

  return getNativeRedirectUrl(path);
}

export function getPasswordResetRedirectUrl(): string | undefined {
  return getAuthRedirectUrl('reset-password');
}
