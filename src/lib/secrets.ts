// The one secret this app can hold: an optional Claude API key for photo
// analysis, supplied by the person themselves.
//
// Stored in the platform keystore where there is one. On web there is no
// keystore, so it falls back to ordinary local storage — the Settings screen
// says so plainly rather than implying a safety that is not there.

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'steady-move.apiKey';
const FALLBACK_KEY = 'steady-move:v1:api-key';

async function secureAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/** True when the key is held in the device keystore rather than local storage. */
export async function isSecureStorageAvailable(): Promise<boolean> {
  return secureAvailable();
}

export async function readApiKey(): Promise<string> {
  try {
    if (await secureAvailable()) {
      return (await SecureStore.getItemAsync(KEY)) ?? '';
    }
    return (await AsyncStorage.getItem(FALLBACK_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function writeApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  try {
    if (await secureAvailable()) {
      if (trimmed) await SecureStore.setItemAsync(KEY, trimmed);
      else await SecureStore.deleteItemAsync(KEY);
      return;
    }
    if (trimmed) await AsyncStorage.setItem(FALLBACK_KEY, trimmed);
    else await AsyncStorage.removeItem(FALLBACK_KEY);
  } catch {
    // A key that cannot be stored simply is not stored; the feature stays off.
  }
}

export async function clearApiKey(): Promise<void> {
  await writeApiKey('');
}

/** Shows enough to recognise the key without printing it. */
export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••';
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
