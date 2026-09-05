import { filterContentsBySchoolProgram, filterByProductCategory, filterVideosForEduOtt, filterVideosForLearningPath } from './school-program';
import {
  filterLibraryContentsForSubjectSlot,
  formatProductCategoryLabel,
  formatIitLearningPathContentLabel,
  getLibraryContentClassNumber,
  getLibraryContentDisplayTitle,
  getLibraryContentProductCategory,
  isIitTrackContent,
  normalizeLibraryClassNumber,
  type LibrarySubjectContext,
} from './library-content-labels';

// Single re-export path — duplicate export-from + export crashes Hermes ("property is not configurable").
export {
  filterLibraryContentsForSubjectSlot,
  formatProductCategoryLabel,
  formatIitLearningPathContentLabel,
  getLibraryContentClassNumber,
  getLibraryContentDisplayTitle,
  getLibraryContentProductCategory,
  isIitTrackContent,
  normalizeLibraryClassNumber,
};

/** Row shape from /api/student/asli-prep-content (and teacher/admin equivalents). */
export type LibraryContentRow = {
  _id?: string;
  title?: string;
  type?: string;
  topic?: string;
  fileUrl?: string;
  fileUrls?: string[];
  videoUrl?: string;
  youtubeUrl?: string;
  driveLink?: string;
  classNumber?: string | number | null;
  productCategory?: string | null;
  board?: string | null;
  subject?:
    | {
        _id?: string;
        name?: string;
        classNumber?: string | number | null;
        productCategory?: string | null;
        board?: string | null;
      }
    | string;
  subjectId?:
    | {
        _id?: string;
        name?: string;
        classNumber?: string | number | null;
        productCategory?: string | null;
        board?: string | null;
      }
    | string;
  description?: string;
  duration?: number;
  views?: number;
};

/**
 * Normalize API payloads that wrap lists under data / contents / videos / etc.
 */
export function extractLibraryContentList(payload: unknown): LibraryContentRow[] {
  if (Array.isArray(payload)) return payload as LibraryContentRow[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ['data', 'contents', 'content', 'videos', 'items', 'results', 'rows']) {
    const value = obj[key];
    if (Array.isArray(value)) return value as LibraryContentRow[];
  }
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return extractLibraryContentList(obj.data);
  }
  return [];
}

export function isLibraryVideoRow(row: LibraryContentRow | null | undefined): boolean {
  if (!row) return false;
  const t = String(row.type || '')
    .trim()
    .toLowerCase();
  if (t === 'video' || t === 'youtube' || t === 'lecture') return true;
  // Dedicated /videos endpoints sometimes omit type.
  if (!t && (row.videoUrl || row.youtubeUrl || row.fileUrl || row.driveLink)) return true;
  return false;
}

function normalizeUrl(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '');
}

function subjectKey(row: LibraryContentRow): string {
  const sub = row.subjectId ?? row.subject;
  if (!sub) return '';
  if (typeof sub === 'string') return sub.trim().toLowerCase();
  return String(sub.name || sub._id || '')
    .trim()
    .toLowerCase();
}

/** Stable key for duplicate detection — prefers media URL, then title + type + topic + slot. */
export function libraryContentDedupeKey(row: LibraryContentRow): string {
  const url = normalizeUrl(
    row.fileUrl ||
      row.videoUrl ||
      row.youtubeUrl ||
      row.driveLink ||
      (Array.isArray(row.fileUrls) ? row.fileUrls[0] : ''),
  );
  // Same uploaded file under sibling subjects should collapse.
  if (url) return `media:${url}`;

  const slot = `${getLibraryContentClassNumber(row)}|${getLibraryContentProductCategory(row)}`;
  const title = String(row.title || '')
    .trim()
    .toLowerCase();
  const type = String(row.type || '')
    .trim()
    .toLowerCase();
  const topic = String(row.topic || '')
    .trim()
    .toLowerCase();
  return `meta:${type}|${title}|${topic}|${subjectKey(row)}|${slot}`;
}

function rowRichness(row: LibraryContentRow): number {
  let score = 0;
  if (row.duration) score += 4;
  if (row.description?.trim()) score += 2;
  if (normalizeUrl(row.fileUrl || row.videoUrl || row.youtubeUrl)) score += 3;
  if (typeof row.views === 'number' && row.views > 0) score += 1;
  if (getLibraryContentClassNumber(row)) score += 1;
  if (getLibraryContentProductCategory(row)) score += 1;
  return score;
}

/**
 * Remove duplicate library rows (same video/file uploaded under sibling subjects or twice).
 * Keeps the row with the richest metadata when keys collide.
 *
 * Pass 1: media URL / id / meta slot
 * Pass 2 (optional): visible display title + type — only for subject-detail catalogs.
 *   Skip on EduOTT / global lists: backend already URL-dedupes, and title collapse
 *   drops distinct videos that share a generic title (web shows all of them).
 */
export function dedupeLibraryContents<T extends LibraryContentRow>(
  rows: T[],
  options?: { collapseAcrossSubjects?: boolean; skipTitleCollapse?: boolean },
): T[] {
  if (!Array.isArray(rows) || rows.length < 2) return rows || [];

  const byId = new Map<string, T>();
  const byKey = new Map<string, T>();

  for (const row of rows) {
    const id = String(row._id || '').trim();
    if (id && byId.has(id)) continue;

    const key = libraryContentDedupeKey(row);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      if (id) byId.set(id, row);
      continue;
    }

    if (rowRichness(row) > rowRichness(prev)) {
      byKey.set(key, row);
      if (id) byId.set(id, row);
      const prevId = String(prev._id || '').trim();
      if (prevId) byId.delete(prevId);
    }
  }

  const keptByUrl = new Set(byKey.values());
  const afterUrlPass = rows.filter((row) => keptByUrl.has(row));

  if (options?.skipTitleCollapse || afterUrlPass.length < 2) return afterUrlPass;

  const collapseAcrossSubjects = Boolean(options?.collapseAcrossSubjects);
  const byTitle = new Map<string, T>();
  for (const row of afterUrlPass) {
    const type = String(row.type || '')
      .trim()
      .toLowerCase();
    const title = getLibraryContentDisplayTitle(row)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    // Subject detail / merged catalog group: collapse identical visible titles.
    // Global multi-subject lists: keep Biology vs Chemistry titles separate.
    const titleKey = title
      ? collapseAcrossSubjects
        ? `title:${type}|${title}`
        : `title:${type}|${title}|${subjectKey(row)}`
      : `keep:${String(row._id || Math.random())}`;
    const prev = byTitle.get(titleKey);
    if (!prev || rowRichness(row) > rowRichness(prev)) {
      byTitle.set(titleKey, row);
    }
  }

  const keptTitles = new Set(byTitle.values());
  return afterUrlPass.filter((row) => keptTitles.has(row));
}

export type PrepareLibraryContentsOptions = {
  subjectSlot?: LibrarySubjectContext | null;
  schoolIitCategories?: string[];
  surface?: 'learning-path' | 'eduott';
};

/**
 * Apply school-program type rules, place into Alpha/Beta + class slots, then collapse duplicates.
 * Use for every client list built from /asli-prep-content (student, teacher, admin).
 */
export function prepareLibraryContents<T extends LibraryContentRow>(
  rows: T[] | null | undefined,
  isAsliPrepExclusive: boolean,
  options?: PrepareLibraryContentsOptions,
): T[] {
  let list = filterContentsBySchoolProgram(Array.isArray(rows) ? rows : [], isAsliPrepExclusive);
  if (options?.schoolIitCategories?.length) {
    list = filterByProductCategory(
      list as Array<{
        productCategory?: string | null;
        subject?: { productCategory?: string | null } | null;
      }>,
      options.schoolIitCategories,
    ) as T[];
  }
  if (options?.surface === 'learning-path') {
    list = filterVideosForLearningPath(list);
  } else if (options?.surface === 'eduott') {
    list = filterVideosForEduOtt(list);
  }
  if (options?.subjectSlot) {
    list = filterLibraryContentsForSubjectSlot(list, options.subjectSlot);
  }
  // Subject detail screens: collapse identical titles even when CDN URLs differ.
  return dedupeLibraryContents(list, {
    collapseAcrossSubjects: Boolean(options?.subjectSlot),
  });
}
