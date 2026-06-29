import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Alert, Linking, Platform } from 'react-native';

import {
  isExpectedPushTokenError,
  isRemotePushSupported,
} from '../../../lib/push-support';
import { supabase } from '../../../lib/supabase';

export const PUSH_STATUS_KEY = 'vinylhead.push.status';

/** Matches app.config.js extra.eas.projectId — fallback when Constants omit it in standalone builds. */
const FALLBACK_EAS_PROJECT_ID = 'dc0a2988-a9c4-4aca-96b0-76997bac9adc';

export type PushStatus = {
  ok: boolean;
  reason?: string;
  prefix?: string;
  at: number;
};

let permissionAlertShown = false;

export async function getPushStatus(): Promise<PushStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_STATUS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PushStatus;
  } catch {
    return null;
  }
}

async function setPushStatus(status: PushStatus): Promise<void> {
  await AsyncStorage.setItem(PUSH_STATUS_KEY, JSON.stringify(status));
}

function resolveExpoProjectId(): { projectId: string; usedFallback: boolean } {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const fromExtra = extra?.eas?.projectId?.trim();
  if (fromExtra) return { projectId: fromExtra, usedFallback: false };

  const fromEas = (
    Constants as { easConfig?: { projectId?: string } }
  ).easConfig?.projectId?.trim();
  if (fromEas) return { projectId: fromEas, usedFallback: false };

  return { projectId: FALLBACK_EAS_PROJECT_ID, usedFallback: true };
}

function showPermissionDeniedAlert(): void {
  if (permissionAlertShown) return;
  permissionAlertShown = true;

  Alert.alert(
    'Мэдэгдэл идэвхжүүлэх',
    'Чат мэдэгдэл хүлээн авахын тулд мэдэгдлийг зөвшөөрнө үү.',
    [
      { text: 'Одоо биш', style: 'cancel' },
      {
        text: 'Тохиргоо нээх',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
}

/** Reads the device Expo push token when permission is already granted. */
export async function getDeviceExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice || !isRemotePushSupported()) return null;

  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A0A0A',
    });
  }

  const { projectId } = resolveExpoProjectId();
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResponse.data?.trim();
    if (!token) return null;
    return token;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (__DEV__ && !isExpectedPushTokenError(message)) {
      console.warn('[push] getDeviceExpoPushToken failed:', message);
    }
    return null;
  }
}

/** Removes this device's token from the signed-in user so another account won't receive their pushes. */
export async function unregisterPushTokenForUser(userId: string): Promise<void> {
  try {
    if (!Device.isDevice || !isRemotePushSupported()) return;

    const token = await getDeviceExpoPushToken();
    // Without this device's token we cannot identify its row; deleting by
    // user_id alone would wipe the user's OTHER devices' tokens too. Skip.
    if (!token) return;

    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);
    if (error) {
      if (__DEV__) console.warn('[push] unregister failed:', error.message);
      return;
    }

    await setPushStatus({ ok: false, reason: 'signed_out', at: Date.now() });
  } catch (err) {
    if (__DEV__) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.warn('[push] unregister error:', message);
    }
  }
}

export async function registerPushTokenForUser(
  userId: string,
): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      await setPushStatus({
        ok: false,
        reason: 'not_physical_device',
        at: Date.now(),
      });
      return null;
    }

    if (!isRemotePushSupported()) {
      await setPushStatus({
        ok: false,
        reason: 'remote_push_unsupported',
        at: Date.now(),
      });
      return null;
    }

    const Notifications = await import('expo-notifications');

    const { status: existing, canAskAgain } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      const reason =
        finalStatus === 'denied' && canAskAgain === false
          ? 'permission_denied_permanent'
          : 'permission_denied';
      await setPushStatus({ ok: false, reason, at: Date.now() });
      showPermissionDeniedAlert();
      return null;
    }

    const token = await getDeviceExpoPushToken();

    if (!token) {
      await setPushStatus({
        ok: false,
        reason: 'token_empty',
        at: Date.now(),
      });
      return null;
    }

    const { error } = await supabase.from('expo_push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );

    if (error) {
      await setPushStatus({
        ok: false,
        reason: `upsert:${error.message.slice(0, 80)}`,
        at: Date.now(),
      });
      throw error;
    }

    await setPushStatus({
      ok: true,
      prefix: token.slice(0, 28),
      at: Date.now(),
    });

    return token;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    await setPushStatus({
      ok: false,
      reason: `error:${message.slice(0, 80)}`,
      at: Date.now(),
    });
    throw err;
  }
}
