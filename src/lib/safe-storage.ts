import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Authentication secrets use the OS keychain/keystore on native devices.
 * Non-sensitive, oversized UI state may still use AsyncStorage.
 */
const SECURE_STORE_MAX_BYTES = 2048;

function useAsyncOnly(): boolean {
  return Platform.OS === 'web';
}

const SENSITIVE_KEYS = new Set(['authToken', 'accessToken', 'jwtToken', 'token', 'refreshToken']);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

async function removeSecureItemSilently(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore unavailable secure storage during cleanup */
  }
}

async function removeAsyncItemSilently(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore unavailable fallback storage during cleanup */
  }
}

async function setAsyncItemSilently(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* never crash the app on a non-sensitive storage write */
  }
}

async function trySetSecureItem(
  key: string,
  value: string,
  sensitive: boolean,
): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    if (sensitive) await removeAsyncItemSilently(key);
    return true;
  } catch {
    if (sensitive) throw new Error('Secure credential storage is unavailable.');
    return false;
  }
}

export async function storageGetItem(key: string): Promise<string | null> {
  if (!useAsyncOnly()) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value != null) return value;
      // One-time migration from old plaintext storage.
      if (isSensitiveKey(key)) {
        const legacy = await AsyncStorage.getItem(key);
        if (legacy != null) {
          await SecureStore.setItemAsync(key, legacy);
          await AsyncStorage.removeItem(key);
          return legacy;
        }
      }
    } catch {
      if (isSensitiveKey(key)) return null;
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  const sensitive = isSensitiveKey(key);
  const tooLarge = value.length >= SECURE_STORE_MAX_BYTES;
  if (sensitive && tooLarge) {
    throw new Error('Authentication credential is too large for secure storage.');
  }

  if (useAsyncOnly()) {
    await setAsyncItemSilently(key, value);
    return;
  }

  if (tooLarge) {
    await removeSecureItemSilently(key);
    await setAsyncItemSilently(key, value);
    return;
  }

  if (await trySetSecureItem(key, value, sensitive)) return;
  await setAsyncItemSilently(key, value);
}

export async function storageDeleteItem(key: string): Promise<void> {
  if (!useAsyncOnly()) await removeSecureItemSilently(key);
  await removeAsyncItemSilently(key);
}
