import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Running inside the Expo Go client (not a dev/standalone build). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Remote push tokens require a development or production build.
 * Expo Go on Android dropped remote push in SDK 53+; iOS Expo Go still works.
 */
export function isRemotePushSupported(): boolean {
  if (!isExpoGo()) return true;
  return Platform.OS === 'ios';
}

/** Errors that are expected in Expo Go / misconfigured dev environments. */
export function isExpectedPushTokenError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('expo go') ||
    lower.includes('development build') ||
    lower.includes('was removed') ||
    lower.includes('not configured') ||
    lower.includes('firebase') ||
    lower.includes('fcm')
  );
}
