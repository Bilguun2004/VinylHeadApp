import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * Reads auth session from AsyncStorage first, then migrates any legacy
 * SecureStore session left from before the storage switch.
 */
export const SupabaseAuthStorage: SupportedStorage = {
  getItem: async (key) => {
    const fromAsync = await AsyncStorage.getItem(key);
    if (fromAsync !== null) return fromAsync;

    const fromSecure = await SecureStore.getItemAsync(key);
    if (fromSecure !== null) {
      await AsyncStorage.setItem(key, fromSecure);
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    }
    return fromSecure;
  },
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: async (key) => {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  },
};
