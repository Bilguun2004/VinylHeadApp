import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import * as Updates from 'expo-updates';

import { supabase } from '../../../lib/supabase';
import { authSessionKeys } from '../api/use-auth-session-query';
import { AuthReadyContext } from '../context/auth-ready-context';
import { usePushRegistration } from '../hooks/use-push-registration';
import { recoverStaleAuthSession } from '../lib/recover-stale-auth-session';

const PUBLIC_ROUTE_SEGMENTS = new Set([
  'sign-up',
  'forgot-password',
  'reset-password',
  'auth-callback',
]);

function isLoginRoute(segments: string[]): boolean {
  if (segments.length === 0) return true;
  const first = segments[0] ?? '';
  return first === 'index';
}

function isPublicRoute(segments: string[]): boolean {
  if (isLoginRoute(segments)) return true;
  return PUBLIC_ROUTE_SEGMENTS.has(segments[0] ?? '');
}

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const qc = useQueryClient();
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  const userId = session?.user.id ?? null;

  usePushRegistration(userId, authReady);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (Updates.isEnabled) {
        try {
          const check = await Updates.checkForUpdateAsync();
          if (check.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
            return;
          }
        } catch {
          // OTA check is best-effort; continue with the bundled version.
        }
      }

      const { data: { session: loadedSession }, error } =
        await supabase.auth.getSession();
      if (!mounted) return;

      let initialSession = loadedSession;
      const purgedStale = await recoverStaleAuthSession(error);
      if (purgedStale) {
        initialSession = null;
      }

      qc.setQueryData(authSessionKeys.session, initialSession);
      setSession(initialSession);
      setAuthReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      qc.setQueryData(authSessionKeys.session, nextSession);
      setSession(nextSession);
      void qc.invalidateQueries({ queryKey: authSessionKeys.session });
      setAuthReady(true);

      if (event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [qc, router]);

  useEffect(() => {
    if (!authReady || !rootNavigationState?.key) return;

    const segmentList = segments as string[];
    const onPublicRoute = isPublicRoute(segmentList);
    const loginRoute = isLoginRoute(segmentList);

    if (session && loginRoute) {
      router.replace('/home');
      return;
    }

    if (session && segmentList[0] === 'sign-up') {
      router.replace('/home');
      return;
    }

    if (!session && !onPublicRoute) {
      router.replace('/');
    }
  }, [authReady, rootNavigationState?.key, segments, router, session]);

  return (
    <AuthReadyContext.Provider value={authReady}>
      {children}
      {!authReady ? (
        <View style={styles.overlay} accessibilityLabel="Ачаалж байна">
          <ActivityIndicator size="large" />
        </View>
      ) : null}
    </AuthReadyContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
