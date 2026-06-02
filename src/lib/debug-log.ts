import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEBUG_SESSION = 'e5a3ae';
const DEBUG_STORAGE_KEY = 'vinylhead.debug.e5a3ae';
const INGEST_PATH = '/ingest/a1c0ba24-a96d-4e59-b6ea-bd3612f69b5f';

function getIngestUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (
      Constants as {
        manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:7510${INGEST_PATH}`;
  }
  return `http://127.0.0.1:7510${INGEST_PATH}`;
}

export type DebugLogEntry = {
  sessionId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  hypothesisId: string;
  timestamp: number;
  runId: string;
};

async function sendToIngest(entry: DebugLogEntry): Promise<boolean> {
  // #region agent log
  console.log('[debug-e5a3ae]', JSON.stringify(entry));
  try {
    const res = await fetch(getIngestUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': DEBUG_SESSION,
      },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
  // #endregion
}

/** Persists logs locally so a cold start after kill can flush them on next launch. */
export async function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix',
): Promise<void> {
  const entry: DebugLogEntry = {
    sessionId: DEBUG_SESSION,
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId,
  };

  sendToIngest(entry);

  try {
    const raw = await AsyncStorage.getItem(DEBUG_STORAGE_KEY);
    const arr: DebugLogEntry[] = raw ? (JSON.parse(raw) as DebugLogEntry[]) : [];
    arr.push(entry);
    const trimmed = arr.length > 40 ? arr.slice(-40) : arr;
    await AsyncStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* non-fatal */
  }
}

/** Re-send logs from the previous app process (before swipe-kill). */
export async function flushPersistedDebugLogs(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DEBUG_STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as DebugLogEntry[];
    let sent = 0;
    for (const entry of arr) {
      const ok = await sendToIngest({
        ...entry,
        message: `[flushed] ${entry.message}`,
      });
      if (ok) sent += 1;
    }
    if (sent === arr.length) {
      await AsyncStorage.removeItem(DEBUG_STORAGE_KEY);
    }
  } catch {
    /* non-fatal */
  }
}
