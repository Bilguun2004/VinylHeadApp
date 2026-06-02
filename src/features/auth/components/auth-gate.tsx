import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  View,
} from 'react-native';

import * as Updates from 'expo-updates';

import { debugLog, flushPersistedDebugLogs } from '../../../lib/debug-log';
import { supabase } from '../../../lib/supabase';
import { authSessionKeys } from '../api/use-auth-session-query';
import { AuthReadyContext } from '../context/auth-ready-context';
import { DebugBootStrip } from './debug-boot-strip';
import { usePushRegistration } from '../hooks/use-push-registration';

const PUBLIC_ROUTE_SEGMENTS = new Set([
  'sign-up',
  'forgot-password',
  'reset-password',
]);

function isLoginRoute(segments: string[]): boolean {
  if (segments.length === 0) return true;
  const first = segments[0] ?? '';
  // Expo Router may report the index route as "index" instead of an empty segment list.
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
    const sub = AppState.addEventListener('change', (state) => {
      void debugLog(
        'auth-gate.tsx:AppState',
        'App lifecycle',
        { state, hasSession: Boolean(session), userId },
        'H1',
      );
    });
    return () => sub.remove();
  }, [session, userId]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await flushPersistedDebugLogs();

      if (Updates.isEnabled) {
        try {
          const check = await Updates.checkForUpdateAsync();
          await debugLog(
            'auth-gate.tsx:ota-check',
            'OTA checkForUpdateAsync',
            { isAvailable: check.isAvailable },
            'H4',
          );
          if (check.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
            return;
          }
        } catch (err) {
          await debugLog(
            'auth-gate.tsx:ota-check',
            'OTA check failed',
            { error: err instanceof Error ? err.message : 'unknown' },
            'H4',
          );
        }
      }

      const updatesInfo = {
        isEnabled: Updates.isEnabled,
        updateId: Updates.updateId ?? null,
        runtimeVersion: Updates.runtimeVersion ?? null,
        channel: Updates.channel ?? null,
      };
      await debugLog(
        'auth-gate.tsx:mount',
        'AuthGate mounted + updates info',
        updatesInfo,
        'H4',
      );

      const { data: { session: initialSession }, error } =
        await supabase.auth.getSession();
      if (!mounted) return;

      await debugLog(
        'auth-gate.tsx:getSession',
        'Initial getSession result',
        {
          hasSession: Boolean(initialSession),
          userId: initialSession?.user.id ?? null,
          error: error?.message ?? null,
        },
        'H1',
      );

      qc.setQueryData(authSessionKeys.session, initialSession);
      setSession(initialSession);
      setAuthReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void debugLog(
        'auth-gate.tsx:onAuthStateChange',
        'Auth state changed',
        {
          event,
          hasSession: Boolean(nextSession),
          userId: nextSession?.user.id ?? null,
        },
        'H1',
      );
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

    void debugLog(
      'auth-gate.tsx:redirect',
      'Route guard evaluation',
      {
        segments: segmentList,
        loginRoute,
        onPublicRoute,
        hasSession: Boolean(session),
        navReady: Boolean(rootNavigationState?.key),
        willRedirectHome: Boolean(session && loginRoute),
        willRedirectLogin: Boolean(!session && !onPublicRoute),
      },
      'H2',
    );

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
      <View style={styles.debugStrip}>
        <DebugBootStrip />
      </View>
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
  debugStrip: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    zIndex: 9999,
  },
});
