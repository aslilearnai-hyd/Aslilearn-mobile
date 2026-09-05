/**
 * Label / place library materials by Super Admin parent slot
 * (classNumber + productCategory / Alpha|Beta), not generic file titles.
 */

import { normalizeSubjectDisplayKey } from './subject-names';

export type LibrarySubjectRef = {
  _id?: string;
  id?: string;
  name?: string;
  classNumber?: string | number | null;
  productCategory?: string | null;
  board?: string | null;
};

export type LibraryContentLike = {
  title?: string | null;
  topic?: string | null;
  type?: string | null;
  classNumber?: string | number | null;
  productCategory?: string | null;
  subject?: LibrarySubjectRef | string | null;
  subjectId?: LibrarySubjectRef | string | null;
  subjectName?: string | null;
};

function asSubjectRef(value: LibraryContentLike['subject'] | LibraryContentLike['subjectId']): LibrarySubjectRef | null {
  if (!value) return null;
  if (typeof value === 'string') return { _id: value };
  return value;
}

export function getLibraryContentSubjectId(row: LibraryContentLike): string {
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  return String(subject?._id || subject?.id || '').trim();
}

export function getLibraryContentSubjectRawName(row: LibraryContentLike): string {
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  const fromRef = String(subject?.name || '').trim();
  if (fromRef) return fromRef;
  return String(row.subjectName || '').trim();
}

export function getLibraryContentSubjectKey(row: LibraryContentLike): string {
  return normalizeSubjectDisplayKey(getLibraryContentSubjectRawName(row));
}

/**
 * Match library content to a Learning Paths subject card (ID + Social studies↔Social Science).
 */
export function libraryContentMatchesSubject(
  row: LibraryContentLike,
  subject: {
    _id?: string;
    id?: string;
    name?: string;
    mergedSubjectIds?: string[];
  },
): boolean {
  const subjectIds = new Set(
    [subject._id, subject.id, ...(subject.mergedSubjectIds || [])]
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );
  const contentId = getLibraryContentSubjectId(row);
  if (contentId && subjectIds.has(contentId)) return true;

  const subjectKey = normalizeSubjectDisplayKey(subject.name || '');
  const contentKey = getLibraryContentSubjectKey(row);
  return Boolean(subjectKey && contentKey && subjectKey === contentKey);
}

export function normalizeLibraryClassNumber(value: unknown): string {
  const trimmed = value != null ? String(value).trim() : '';
  if (!trimmed) return '';
  const parsed = parseInt(trimmed, 10);
  if (!Number.isNaN(parsed) && parsed > 0) return String(parsed);
  return trimmed;
}

/** ALPHA → Alpha, BETA → Beta, IIT_FOUNDATION → IIT Foundation */
export function formatProductCategoryLabel(value: unknown): string {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ');
  if (!raw) return '';
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function getLibraryContentClassNumber(row: LibraryContentLike): string {
  const direct = normalizeLibraryClassNumber(row.classNumber);
  if (direct) return direct;
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  return normalizeLibraryClassNumber(subject?.classNumber);
}

export function getLibraryContentProductCategory(row: LibraryContentLike): string {
  const direct = String(row.productCategory || '')
    .trim()
    .toUpperCase();
  if (direct && direct !== 'GENERAL' && direct !== 'NONE' && direct !== 'ALL') {
    return direct;
  }
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  const fromSubject = String(subject?.productCategory || '')
    .trim()
    .toUpperCase();
  if (fromSubject && fromSubject !== 'GENERAL' && fromSubject !== 'NONE' && fromSubject !== 'ALL') {
    return fromSubject;
  }
  return '';
}

function contentBoardKey(row: LibraryContentLike): string {
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  const raw = String((row as { board?: string }).board || subject?.board || '');
  return String(raw)
    .toUpperCase()
    .replace(/[\s/\\-]+/g, '');
}

/** IIT-board or Alpha/Beta/Gamma track materials (videos stay EduOTT). */
export function isIitTrackContent(row: LibraryContentLike): boolean {
  if (getLibraryContentProductCategory(row)) return true;
  const board = contentBoardKey(row);
  return board.includes('IIT') || board.includes('NEET') || board.includes('JEE');
}

/** e.g. Biology IIT Alpha */
export function formatIitLearningPathContentLabel(
  row: LibraryContentLike,
  fallbackSubjectName?: string,
): string {
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  const rawName = String(subject?.name || fallbackSubjectName || '').trim();
  const base =
    rawName
      .split('__deleted__')[0]
      .replace(/_\d+$/, '')
      .replace(/\b(iit|neet|jee)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Subject';
  const titled = base.charAt(0).toUpperCase() + base.slice(1);
  const cat = getLibraryContentProductCategory(row);
  if (!cat) return `${titled} IIT`;
  const track = formatProductCategoryLabel(cat);
  return `${titled} IIT ${track}`;
}

function titleAlreadyHasClassOrTrack(title: string, classNumber: string, trackLabel: string): boolean {
  const t = title.toLowerCase();
  if (classNumber) {
    const classRe = new RegExp(
      `\\b(?:class\\s*)?${classNumber}(?:st|nd|rd|th)?\\b|\\b${classNumber}(?:st|nd|rd|th)\\b`,
      'i',
    );
    if (classRe.test(title)) return true;
  }
  if (trackLabel && t.includes(trackLabel.toLowerCase())) return true;
  return false;
}

function ordinalClassLabel(classNumber: string): string {
  const n = parseInt(classNumber, 10);
  if (Number.isNaN(n)) return `Class ${classNumber}`;
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/**
 * Prefer parent-slot metadata (class + Alpha/Beta) over a generic filename like "Physics".
 * Keeps titles that already encode grade/track.
 */
export function getLibraryContentDisplayTitle(row: LibraryContentLike): string {
  const base = String(row.title || row.topic || '')
    .trim()
    .replace(/\.(pdf|docx?|pptx?|xlsx?|zip)$/i, '');
  const classNumber = getLibraryContentClassNumber(row);
  const track = formatProductCategoryLabel(getLibraryContentProductCategory(row));

  if (!base) {
    const bits = ['Material'];
    if (classNumber) bits.push(ordinalClassLabel(classNumber));
    if (track) bits.push(track);
    return bits.join(' ');
  }

  if (titleAlreadyHasClassOrTrack(base, classNumber, track)) {
    return base;
  }

  const bits = [base];
  if (classNumber) bits.push(ordinalClassLabel(classNumber));
  if (track) bits.push(track);
  return bits.length > 1 ? bits.join(' ') : base;
}

export type LibrarySubjectContext = {
  classNumber?: string | number | null;
  productCategory?: string | null;
};

/**
 * Keep only materials that belong to the opened subject's class + Alpha/Beta slot.
 * When the subject slot is known, drop rows tagged for a different class/track.
 * Untagged rows are kept only if they have no conflicting class/track metadata.
 */
export function filterLibraryContentsForSubjectSlot<T extends LibraryContentLike>(
  rows: T[],
  subject?: LibrarySubjectContext | null,
): T[] {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const wantClass = normalizeLibraryClassNumber(subject?.classNumber);
  const wantTrack = String(subject?.productCategory || '')
    .trim()
    .toUpperCase();
  if (!wantClass && !wantTrack) return rows;

  return rows.filter((row) => {
    const rowClass = getLibraryContentClassNumber(row);
    const rowTrack = getLibraryContentProductCategory(row);

    if (wantClass) {
      if (rowClass && rowClass !== wantClass) return false;
      // Prefer parent-slot placement: if subject class is known, require class on content
      // only when track/class metadata exists somewhere on the row or its subject.
      if (!rowClass && rowTrack && wantTrack && rowTrack !== wantTrack) return false;
    }
    if (wantTrack) {
      if (rowTrack && rowTrack !== wantTrack) return false;
    }
    return true;
  });
}
