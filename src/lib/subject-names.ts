import { normalizeBoardKey } from './board-label';

/** Parse Super Admin style subject keys, e.g. Chemistry_10 → class "10", plain "Chemistry". */

export function extractClassNumberFromSubjectName(name: string): string | null {
  const base = String(name || '').split('__deleted__')[0].trim();
  const match = base.match(/_(\d+)$/);
  return match ? match[1] : null;
}

export function isSoftDeletedSubjectName(name: string): boolean {
  return String(name || '').includes('__deleted__');
}

export function extractPlainSubjectName(name: string): string {
  const base = String(name || '').split('__deleted__')[0].trim();
  const match = base.match(/^(.+?)_\d+$/);
  return match ? match[1] : base;
}

export function normalizeSubjectDisplayKey(name: string): string {
  const plain = extractPlainSubjectName(name || '')
    .trim()
    .toLowerCase()
    .replace(/\b(iit|neet|jee)\b/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain === 'bio' || plain === 'biology') return 'biology';
  if (plain === 'math' || plain === 'maths' || plain === 'mat' || plain === 'mathematics') {
    return 'math';
  }
  if (plain === 'phy' || plain === 'physics') return 'physics';
  if (plain === 'chem' || plain === 'chemistry') return 'chemistry';
  if (plain === 'sci' || plain === 'science' || plain === 'evs') return 'science';
  if (
    plain === 'sst' ||
    plain === 'social' ||
    plain === 'social science' ||
    plain === 'social studies' ||
    plain === 'history' ||
    plain === 'geography' ||
    plain === 'civics' ||
    plain === 'economics'
  ) {
    return 'social';
  }
  if (plain === 'computer' || plain === 'computers' || plain === 'cs' || plain === 'it') {
    return 'computer';
  }
  if (plain === 'eng' || plain === 'english') return 'english';
  return plain;
}

/** Canonical bucket for teacher learning-path cards (one card per subject name). */
export function subjectCatalogGroupKey(name: string): string {
  return normalizeSubjectDisplayKey(name || '');
}

export function isActiveCatalogSubject(subject: {
  name?: string;
  isActive?: boolean;
}): boolean {
  if (subject.isActive === false) return false;
  if (isSoftDeletedSubjectName(subject.name || '')) return false;
  return true;
}

export function getSubjectClassLabel(subject: {
  name?: string;
  classNumber?: string;
}): string | null {
  if (subject.classNumber != null && String(subject.classNumber).trim() !== '') {
    return String(subject.classNumber).trim();
  }
  return extractClassNumberFromSubjectName(subject.name || '');
}

export function displaySubjectName(name: string): string {
  const base = String(name || '').split('__deleted__')[0].trim();
  return extractPlainSubjectName(base) || base;
}

/** Physics + ALPHA → "Physics IIT Alpha". Empty/General track stays the plain name. */
export function formatSubjectWithIitCategory(
  name: string,
  productCategory?: string | null,
): string {
  const base = displaySubjectName(name) || String(name || '').trim();
  if (!base) return '';
  const rawCat = String(productCategory || '')
    .toUpperCase()
    .trim()
    .replace(/^IIT_/, '');
  if (!rawCat || rawCat === 'GENERAL' || rawCat === 'NONE' || rawCat === 'ALL') {
    return base;
  }
  const trackLabel = rawCat
    .split('_')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
  if (new RegExp(`\\biit\\s+${trackLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(base)) {
    return base;
  }
  return `${base} IIT ${trackLabel}`;
}

export function inferClassNumberFromPrepContent(
  items?: Array<{ classNumber?: string }> | null
): string | null {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    const cn =
      item?.classNumber != null && String(item.classNumber).trim() !== ''
        ? String(item.classNumber).trim()
        : null;
    if (cn) return cn;
  }
  return null;
}

/** Learning path row may only have class on linked content documents. */
export function getLearningPathClassLabel(subject: {
  name?: string;
  classNumber?: string;
  asliPrepContent?: Array<{ classNumber?: string }>;
}): string | null {
  const fromSubject = getSubjectClassLabel(subject);
  if (fromSubject) return fromSubject;
  return inferClassNumberFromPrepContent(subject.asliPrepContent);
}

/** Board track for a learning-path row (CBSE vs IIT/NEET must not merge). */
export function getLearningPathBoardLabel(subject: {
  board?: string;
  asliPrepContent?: Array<{
    board?: string;
    subject?: { board?: string } | string;
  }>;
}): string {
  if (subject.board != null && String(subject.board).trim() !== '') {
    return normalizeBoardKey(String(subject.board));
  }
  if (!Array.isArray(subject.asliPrepContent)) return '';
  for (const item of subject.asliPrepContent) {
    const fromItem = item?.board;
    if (fromItem != null && String(fromItem).trim() !== '') {
      return normalizeBoardKey(String(fromItem));
    }
    const subj = item?.subject;
    if (subj != null && typeof subj === 'object' && subj.board) {
      return normalizeBoardKey(String(subj.board));
    }
  }
  return '';
}
