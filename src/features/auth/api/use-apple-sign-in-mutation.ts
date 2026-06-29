import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '../../../lib/supabase';
import { authSessionKeys } from './use-auth-session-query';
import { getAuthRedirectUrl } from '../lib/get-auth-redirect-url';
import {
  syncAppleCredentialProfile,
  syncAppleOAuthUserProfile,
} from '../lib/sync-apple-user-profile';

WebBrowser.maybeCompleteAuthSession();

export type AppleSignInResult =
  | { status: 'cancel' }
  | { status: 'success'; session: Session };

function parseAuthCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

async function signInWithAppleNative(): Promise<AppleSignInResult> {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Энэ төхөөрөмж дээр Apple-ээр нэвтрэх боломжгүй.');
  }

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code?: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      return { status: 'cancel' };
    }
    throw err;
  }

  if (!credential.identityToken) {
    throw new Error('Apple баталгаажуулалтын токен ирсэнгүй.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('Сесс үүсгэж чадсангүй.');
  }

  await syncAppleCredentialProfile(credential, data.session);

  return { status: 'success', session: data.session };
}

async function signInWithAppleOAuth(): Promise<AppleSignInResult> {
  const redirectTo = getAuthRedirectUrl('auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) {
    throw new Error('Apple нэвтрэх URL олдсонгүй.');
  }

  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return { status: 'cancel' };
  }

  if (!redirectTo) {
    throw new Error('Apple нэвтрэх буцах хаяг тохируулагдаагүй байна.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancel' };
  }
  if (result.type !== 'success') {
    throw new Error('Apple-ээр нэвтрэх амжилтгүй боллоо.');
  }

  const code = parseAuthCode(result.url);
  if (!code) {
    throw new Error('Apple-аас баталгаажуулах код ирсэнгүй.');
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  if (!sessionData.session) {
    throw new Error('Сесс үүсгэж чадсангүй.');
  }

  await syncAppleOAuthUserProfile(sessionData.session.user);

  return { status: 'success', session: sessionData.session };
}

async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS === 'ios') {
    return signInWithAppleNative();
  }
  return signInWithAppleOAuth();
}

export function useAppleSignInMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['auth', 'sign-in', 'apple'],
    mutationFn: signInWithApple,
    onSuccess: (result) => {
      if (result.status === 'success') {
        qc.setQueryData(authSessionKeys.session, result.session);
        void qc.invalidateQueries({ queryKey: authSessionKeys.session });
      }
    },
  });
}
