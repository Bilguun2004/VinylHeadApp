import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isRemotePushSupported } from '../../../lib/push-support';
import { registerPushTokenForUser } from '../lib/register-push-token';

async function registerSafely(userId: string): Promise<void> {
  try {
    await registerPushTokenForUser(userId);
  } catch {
    // Push registration is best-effort; failures must not break the app.
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
    void registerSafely(userId);
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !userId || !isRemotePushSupported()) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerSafely(userId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, userId]);
}
