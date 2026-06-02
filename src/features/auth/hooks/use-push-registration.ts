import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isRemotePushSupported } from '../../../lib/push-support';
import { debugLog } from '../../../lib/debug-log';
import { registerPushTokenForUser } from '../lib/register-push-token';

async function registerWithLogging(userId: string, source: string): Promise<void> {
  try {
    const token = await registerPushTokenForUser(userId);
    await debugLog(
      'use-push-registration.ts',
      `${source} registration finished`,
      { userId, ok: Boolean(token) },
      'H3',
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    await debugLog(
      'use-push-registration.ts',
      `${source} registration error`,
      { userId, error: message },
      'H3',
    );
  }
}

/**
 * Registers the device Expo push token for the signed-in user and re-registers
 * when the app returns to the foreground (e.g. after being killed).
 */
export function usePushRegistration(
  userId: string | null | undefined,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || !userId || !isRemotePushSupported()) return;
    void registerWithLogging(userId, 'Initial');
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !userId || !isRemotePushSupported()) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerWithLogging(userId, 'Foreground');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, userId]);
}
