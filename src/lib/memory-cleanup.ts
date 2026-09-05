/**
 * Evicts image buffers and ephemeral caches so backgrounded sessions
 * do not retain more memory than necessary.
 */
import { Image } from 'expo-image';
import { queryClient } from './queryClient';
import { clearPdfBytesCache } from '../utils/contentPreview';
import { clearCurriculumResponseCache } from '../hooks/useCurriculumCascade';
import teacherService from '../services/api/teacherService';

export type MemoryCleanupLevel = 'soft' | 'aggressive';

export type MemoryCleanupResult = {
  level: MemoryCleanupLevel;
  imageMemoryCleared: boolean;
  imageDiskCleared: boolean;
  reactQueryRemoved: number;
  pdfCacheCleared: boolean;
  curriculumCacheCleared: boolean;
  teacherStoragePruned: number;
};

let lastRunAt = 0;
let lastDiskClearAt = 0;
const MIN_INTERVAL_MS = 8_000;
/** Disk image cache is expensive to rebuild — clear at most once per half hour. */
const DISK_CLEAR_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Soft: decoded image memory + inactive React Query entries + PDF/curriculum maps.
 * Aggressive: also prune stale teacher AsyncStorage snapshots; periodically clear image disk cache.
 */
export async function runMemoryCleanup(
  level: MemoryCleanupLevel = 'soft'
): Promise<MemoryCleanupResult> {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return {
      level,
      imageMemoryCleared: false,
      imageDiskCleared: false,
      reactQueryRemoved: 0,
      pdfCacheCleared: false,
      curriculumCacheCleared: false,
      teacherStoragePruned: 0,
    };
  }
  lastRunAt = now;

  let imageMemoryCleared = false;
  let imageDiskCleared = false;
  let reactQueryRemoved = 0;
  let teacherStoragePruned = 0;

  try {
    imageMemoryCleared = await Image.clearMemoryCache();
  } catch {
    imageMemoryCleared = false;
  }

  if (level === 'aggressive' && now - lastDiskClearAt >= DISK_CLEAR_INTERVAL_MS) {
    try {
      imageDiskCleared = await Image.clearDiskCache();
      if (imageDiskCleared) lastDiskClearAt = now;
    } catch {
      imageDiskCleared = false;
    }
  }

  try {
    const inactive = queryClient.getQueryCache().findAll({ type: 'inactive' });
    reactQueryRemoved = inactive.length;
    if (inactive.length > 0) {
      queryClient.removeQueries({ type: 'inactive' });
    }
  } catch {
    reactQueryRemoved = 0;
  }

  let pdfCacheCleared = false;
  try {
    clearPdfBytesCache();
    pdfCacheCleared = true;
  } catch {
    pdfCacheCleared = false;
  }

  let curriculumCacheCleared = false;
  try {
    clearCurriculumResponseCache();
    curriculumCacheCleared = true;
  } catch {
    curriculumCacheCleared = false;
  }

  if (level === 'aggressive') {
    try {
      teacherStoragePruned = await teacherService.pruneStaleCache();
    } catch {
      teacherStoragePruned = 0;
    }
  }

  return {
    level,
    imageMemoryCleared,
    imageDiskCleared,
    reactQueryRemoved,
    pdfCacheCleared,
    curriculumCacheCleared,
    teacherStoragePruned,
  };
}
