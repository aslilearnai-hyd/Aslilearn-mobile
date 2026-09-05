import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { isAndroidTv } from './device';

/**
 * Authentication secrets use the OS keychain/keystore on native devices.
 * Non-sensitive, oversized UI state may still use AsyncStorage.
 */
const SECURE_STORE_MAX_BYTES = 2048;

function useAsyncOnly(): boolean {
  return Platform.OS === 'web' || isAndroidTv();
}

const SENSITIVE_KEYS = new Set(['authToken', 'accessToken', 'jwtToken', 'token', 'refreshToken']);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
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
  const tooLarge = value.length >= SECURE_STORE_MAX_BYTES;
  if (isSensitiveKey(key) && tooLarge) {
    throw new Error('Authentication credential is too large for secure storage.');
  }
  if (!useAsyncOnly() && !tooLarge) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      if (isSensitiveKey(key)) throw new Error('Secure credential storage is unavailable.');
    }
  } else if (!useAsyncOnly() && tooLarge) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* never crash the app on storage write */
  }
}

export async function storageDeleteItem(key: string): Promise<void> {
  if (!useAsyncOnly()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
