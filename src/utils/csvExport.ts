import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const CSV_MIME = 'text/csv';
const ANDROID_DOWNLOADS_TREE_KEY = '@aslilearn/android_downloads_tree_uri';

export function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const body = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  return [headerLine, ...body].join('\n');
}

export function ensureCsvFilename(filename: string): string {
  const trimmed = String(filename || 'export').trim() || 'export';
  const safe = trimmed.replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96);
  const base = safe || 'export';
  return base.toLowerCase().endsWith('.csv') ? base : `${base}.csv`;
}

function splitCsvFilename(filename: string): { name: string; mimeType: string } {
  const finalName = ensureCsvFilename(filename);
  const lastDot = finalName.lastIndexOf('.');
  if (lastDot <= 0) return { name: finalName, mimeType: CSV_MIME };
  return { name: finalName.slice(0, lastDot), mimeType: CSV_MIME };
}

async function writeCsvToCache(csv: string, filename: string): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File cache is unavailable on this device.');
  }
  const fileUri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
}

async function writeCsvToSafTree(treeUri: string, csv: string, filename: string): Promise<boolean> {
  const { StorageAccessFramework } = FileSystem;
  if (!StorageAccessFramework?.createFileAsync) return false;

  const { name, mimeType } = splitCsvFilename(filename);
  try {
    const fileUri = await StorageAccessFramework.createFileAsync(treeUri, name, mimeType);
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return true;
  } catch {
    return false;
  }
}

/** Android: save into Downloads via Storage Access Framework (works in Expo Go). */
async function saveToAndroidDownloadsViaSaf(csv: string, filename: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const { StorageAccessFramework } = FileSystem;
  if (!StorageAccessFramework?.requestDirectoryPermissionsAsync) return false;

  let treeUri = await AsyncStorage.getItem(ANDROID_DOWNLOADS_TREE_KEY);
  if (treeUri && (await writeCsvToSafTree(treeUri, csv, filename))) {
    return true;
  }

  const downloadsRoot = StorageAccessFramework.getUriForDirectoryInRoot?.('Download') ?? null;
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsRoot);
  if (!permissions.granted) return false;

  treeUri = permissions.directoryUri;
  await AsyncStorage.setItem(ANDROID_DOWNLOADS_TREE_KEY, treeUri);
  return writeCsvToSafTree(treeUri, csv, filename);
}

async function shareCsvFromCache(csv: string, filename: string): Promise<void> {
  const fileUri = await writeCsvToCache(csv, filename);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Export failed', 'Could not open the save dialog on this device.');
    return;
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: CSV_MIME,
    dialogTitle: `Save ${filename}`,
    UTI: 'public.comma-separated-values-text',
  });
}

/**
 * Save CSV to Downloads (Android) or the system save sheet (iOS).
 * Uses only Expo Go–compatible APIs (no custom native modules).
 */
export async function exportCsvFile(csv: string, filename: string): Promise<void> {
  const finalName = ensureCsvFilename(filename);
  const content = csv.endsWith('\n') ? csv : `${csv}\n`;

  if (Platform.OS === 'android') {
    const saved = await saveToAndroidDownloadsViaSaf(content, finalName);
    if (saved) {
      Alert.alert('Download complete', `${finalName} saved to Downloads.`);
      return;
    }
    await shareCsvFromCache(content, finalName);
    return;
  }

  await shareCsvFromCache(content, finalName);
}
