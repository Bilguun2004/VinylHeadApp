import { useMutation } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '../../../lib/supabase';

// `cancel` lets the screen distinguish "user backed out" from a real
// failure so we don't show an alert in that case.
export type FacebookSignInResult = { status: 'cancel' } | {
  status: 'success';
  session: Session;
};

// Required on web so the browser-tab-redirect handshake completes.
WebBrowser.maybeCompleteAuthSession();

function parseAuthCode(url: string): string | null {
  // expo-linking and Supabase callbacks both produce URLs with a query
  // string like `?code=...`; we lean on the WHATWG URL parser (polyfilled
  // by `react-native-url-polyfill/auto` from lib/supabase.ts).
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

async function signInWithFacebook(): Promise<FacebookSignInResult> {
  // On native we round-trip through the app's deep-link scheme
  // (configured in app.json as `vinylhead`). On web we let Supabase use
  // the current origin so the browser tab can complete the handshake.
  const redirectTo =
    Platform.OS === 'web' ? undefined : Linking.createURL('auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
      // We open the browser ourselves so we can read the callback URL.
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) {
    throw new Error('Facebook нэвтрэх URL олдсонгүй.');
  }

  if (Platform.OS === 'web' || !redirectTo) {
    // On web supabase-js redirects the tab itself; nothing more to do here.
    // The session shows up on the next page load via detectSessionInUrl.
    // We just resolve as "cancel" to keep the UI idle — the navigation
    // will tear this screen down anyway.
    if (Platform.OS === 'web') {
      window.location.assign(data.url);
    }
    return { status: 'cancel' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancel' };
  }
  if (result.type !== 'success') {
    throw new Error('Facebook нэвтрэх амжилтгүй боллоо.');
  }

  const code = parseAuthCode(result.url);
  if (!code) {
    throw new Error('Facebook-аас баталгаажуулах код ирсэнгүй.');
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  if (!sessionData.session) {
    throw new Error('Сесс үүсгэж чадсангүй.');
  }

  return { status: 'success', session: sessionData.session };
}

export function useFacebookSignInMutation() {
  return useMutation({
    mutationKey: ['auth', 'sign-in', 'facebook'],
    mutationFn: signInWithFacebook,
  });
}
