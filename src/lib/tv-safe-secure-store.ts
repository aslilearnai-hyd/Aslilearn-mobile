/**
 * Classroom TV panels often have a broken Android Keystore. Calling the real
 * expo-secure-store native module aborts the process ("opens then closes").
 * Route those devices through AsyncStorage instead.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoSecureStore from 'expo-secure-store';
import { isAndroidTv } from './device';

export const AFTER_FIRST_UNLOCK = ExpoSecureStore.AFTER_FIRST_UNLOCK;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = ExpoSecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
export const ALWAYS = ExpoSecureStore.ALWAYS;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = ExpoSecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY;
export const ALWAYS_THIS_DEVICE_ONLY = ExpoSecureStore.ALWAYS_THIS_DEVICE_ONLY;
export const WHEN_UNLOCKED = ExpoSecureStore.WHEN_UNLOCKED;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = ExpoSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

export type SecureStoreOptions = ExpoSecureStore.SecureStoreOptions;
export type KeychainAccessibilityConstant = ExpoSecureStore.KeychainAccessibilityConstant;

export async function isAvailableAsync(): Promise<boolean> {
  if (isAndroidTv()) return true;
  try {
    return await ExpoSecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export function canUseBiometricAuthentication(): boolean {
  if (isAndroidTv()) return false;
  try {
    return ExpoSecureStore.canUseBiometricAuthentication?.() ?? false;
  } catch {
    return false;
  }
}

export async function getItemAsync(
  key: string,
  options?: SecureStoreOptions
): Promise<string | null> {
  if (isAndroidTv()) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    const value = await ExpoSecureStore.getItemAsync(key, options);
    if (value != null) return value;
  } catch {
    /* OEM Keystore */
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(
  key: string,
  value: string,
  options?: SecureStoreOptions
): Promise<void> {
  if (isAndroidTv() || value.length >= 2048) {
    if (!isAndroidTv()) {
      try {
        await ExpoSecureStore.deleteItemAsync(key, options);
      } catch {
        /* ignore */
      }
    }
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await ExpoSecureStore.setItemAsync(key, value, options);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

export async function deleteItemAsync(key: string, options?: SecureStoreOptions): Promise<void> {
  if (!isAndroidTv()) {
    try {
      await ExpoSecureStore.deleteItemAsync(key, options);
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
