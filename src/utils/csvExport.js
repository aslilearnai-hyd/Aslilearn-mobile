"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeCsvCell = escapeCsvCell;
exports.buildCsvContent = buildCsvContent;
exports.ensureCsvFilename = ensureCsvFilename;
exports.exportCsvFile = exportCsvFile;
const react_native_1 = require("react-native");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const FileSystem = __importStar(require("expo-file-system/legacy"));
const Sharing = __importStar(require("expo-sharing"));
const CSV_MIME = 'text/csv';
const ANDROID_DOWNLOADS_TREE_KEY = '@aslilearn/android_downloads_tree_uri';
function escapeCsvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
function buildCsvContent(headers, rows) {
    const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
    const body = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
    return [headerLine, ...body].join('\n');
}
function ensureCsvFilename(filename) {
    const trimmed = String(filename || 'export').trim() || 'export';
    const safe = trimmed.replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96);
    const base = safe || 'export';
    return base.toLowerCase().endsWith('.csv') ? base : `${base}.csv`;
}
function splitCsvFilename(filename) {
    const finalName = ensureCsvFilename(filename);
    const lastDot = finalName.lastIndexOf('.');
    if (lastDot <= 0)
        return { name: finalName, mimeType: CSV_MIME };
    return { name: finalName.slice(0, lastDot), mimeType: CSV_MIME };
}
async function writeCsvToCache(csv, filename) {
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
async function writeCsvToSafTree(treeUri, csv, filename) {
    const { StorageAccessFramework } = FileSystem;
    if (!StorageAccessFramework?.createFileAsync)
        return false;
    const { name, mimeType } = splitCsvFilename(filename);
    try {
        const fileUri = await StorageAccessFramework.createFileAsync(treeUri, name, mimeType);
        await FileSystem.writeAsStringAsync(fileUri, csv, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        return true;
    }
    catch {
        return false;
    }
}
/** Android: save into Downloads via Storage Access Framework (works in Expo Go). */
async function saveToAndroidDownloadsViaSaf(csv, filename) {
    if (react_native_1.Platform.OS !== 'android')
        return false;
    const { StorageAccessFramework } = FileSystem;
    if (!StorageAccessFramework?.requestDirectoryPermissionsAsync)
        return false;
    let treeUri = await async_storage_1.default.getItem(ANDROID_DOWNLOADS_TREE_KEY);
    if (treeUri && (await writeCsvToSafTree(treeUri, csv, filename))) {
        return true;
    }
    const downloadsRoot = StorageAccessFramework.getUriForDirectoryInRoot?.('Download') ?? null;
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsRoot);
    if (!permissions.granted)
        return false;
    treeUri = permissions.directoryUri;
    await async_storage_1.default.setItem(ANDROID_DOWNLOADS_TREE_KEY, treeUri);
    return writeCsvToSafTree(treeUri, csv, filename);
}
async function shareCsvFromCache(csv, filename) {
    const fileUri = await writeCsvToCache(csv, filename);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
        react_native_1.Alert.alert('Export failed', 'Could not open the save dialog on this device.');
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
async function exportCsvFile(csv, filename) {
    const finalName = ensureCsvFilename(filename);
    const content = csv.endsWith('\n') ? csv : `${csv}\n`;
    if (react_native_1.Platform.OS === 'android') {
        const saved = await saveToAndroidDownloadsViaSaf(content, finalName);
        if (saved) {
            react_native_1.Alert.alert('Download complete', `${finalName} saved to Downloads.`);
            return;
        }
        await shareCsvFromCache(content, finalName);
        return;
    }
    await shareCsvFromCache(content, finalName);
}
