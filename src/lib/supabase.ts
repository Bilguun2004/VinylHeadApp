import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '../types/supabase';
import { SupabaseAuthStorage } from './supabase-auth-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Dashboard "Connect" may show EXPO_PUBLIC_SUPABASE_KEY (publishable `sb_publishable_*`);
// older projects use EXPO_PUBLIC_SUPABASE_ANON_KEY (JWT anon). Either works with supabase-js.
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env var EXPO_PUBLIC_SUPABASE_URL');
}
if (!supabaseKey) {
  throw new Error(
    'Missing env var: set EXPO_PUBLIC_SUPABASE_KEY (publishable) or EXPO_PUBLIC_SUPABASE_ANON_KEY (legacy anon JWT)',
  );
}

// AsyncStorage avoids SecureStore's ~2 KB Android limit, which can silently fail
// when persisting a full Supabase session (JWT + user metadata).
const isWeb = Platform.OS === 'web';

// #region agent log
void import('./debug-log').then(({ debugLog }) =>
  debugLog(
    'supabase.ts:init',
    'Supabase client init',
    { storage: isWeb ? 'default' : 'AsyncStorage', platform: Platform.OS },
    'H1',
  ),
);
// #endregion

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: isWeb ? undefined : SupabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE is required for OAuth on native: supabase-js issues a
    // code_verifier on signInWithOAuth() and consumes it via
    // exchangeCodeForSession() once the provider redirects back.
    flowType: 'pkce',
    // We never auto-detect from window.location on native; the OAuth
    // callback URL is handed back to us by WebBrowser.openAuthSessionAsync.
    detectSessionInUrl: false,
  },
});

// Pause Supabase's token refresh loop while the app is backgrounded and
// resume it on foreground. Recommended by the Supabase React Native guide
// to avoid unnecessary refreshes (and to refresh immediately on resume).
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
