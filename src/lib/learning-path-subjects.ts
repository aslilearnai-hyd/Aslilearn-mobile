import { normalizeBoardKey } from './board-label';
import {
  displaySubjectName,
  extractPlainSubjectName,
  normalizeSubjectDisplayKey,
} from './subject-names';

export function isIitLearningPathSubject(subject: {
  board?: string;
  name?: string;
  productCategory?: string | null;
} | null | undefined): boolean {
  const cat = String(subject?.productCategory || '')
    .trim()
    .toUpperCase();
  if (cat && cat !== 'GENERAL' && cat !== 'NONE' && cat !== 'ALL') return true;
  const board = normalizeBoardKey(subject?.board || '');
  if (board === 'IIT' || board === 'IIT/NEET') return true;
  const name = String(subject?.name || '');
  return /\b(iit|neet|jee)\b/i.test(name);
}

export function learningPathDisplayName(name: string): string {
  const plain = extractPlainSubjectName(name || '').trim();
  if (!plain) return String(name || '').trim() || 'Subject';
  const lower = plain
    .toLowerCase()
    .replace(/\b(iit|neet|jee)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const aliases: Record<string, string> = {
    bio: 'Biology',
    biology: 'Biology',
    chem: 'Chemistry',
    chemistry: 'Chemistry',
    phy: 'Physics',
    physics: 'Physics',
    math: 'Mathematics',
    maths: 'Mathematics',
    mathematics: 'Mathematics',
    eng: 'English',
    english: 'English',
    sci: 'Science',
    science: 'Science',
  };
  if (aliases[lower]) return aliases[lower];
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

function preferSubject<T extends { name?: string; contentCount?: number; teacherCount?: number }>(
  a: T,
  b: T,
): T {
  const score = (s: T) => {
    let n = Number(s.contentCount || 0) * 10 + Number(s.teacherCount || 0);
    const name = String(s.name || '');
    if (!/_\d+$/.test(name.split('__deleted__')[0])) n += 5;
    if (/^(biology|chemistry|physics|mathematics|english|science)$/i.test(extractPlainSubjectName(name))) {
      n += 3;
    }
    return n;
  };
  return score(a) >= score(b) ? a : b;
}

/** Merge BIO/Biology and IIT siblings into one Learning Paths card. */
export function prepareStudentLearningPathSubjects<T extends Record<string, any>>(subjects: T[]): T[] {
  const list = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
  const byKey = new Map<string, T & { mergedSubjectIds?: string[]; hasIitTrack?: boolean }>();

  for (const row of list) {
    const key = normalizeSubjectDisplayKey(row.name || '');
    if (!key) continue;
    const rowIsIit = isIitLearningPathSubject(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...row,
        name: learningPathDisplayName(row.name),
        description: row.description || `Content for ${learningPathDisplayName(row.name)}`,
        mergedSubjectIds: [String(row._id || row.id || '')].filter(Boolean),
        hasIitTrack: rowIsIit,
      });
      continue;
    }
    const winner =
      isIitLearningPathSubject(existing) && !rowIsIit
        ? row
        : !isIitLearningPathSubject(existing) && rowIsIit
          ? existing
          : preferSubject(existing, row);
    const mergedIds = new Set(
      [
        ...(existing.mergedSubjectIds || [String(existing._id || existing.id || '')]),
        String(row._id || row.id || ''),
      ].filter(Boolean),
    );
    byKey.set(key, {
      ...winner,
      name: learningPathDisplayName(String(winner.name || row.name)),
      description:
        winner.description ||
        row.description ||
        `Content for ${learningPathDisplayName(String(winner.name || row.name))}`,
      contentCount: Number(existing.contentCount || 0) + Number(row.contentCount || 0),
      mergedSubjectIds: Array.from(mergedIds),
      hasIitTrack: Boolean(existing.hasIitTrack || rowIsIit),
    } as T & { mergedSubjectIds?: string[]; hasIitTrack?: boolean });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
  );
}

export { displaySubjectName, normalizeSubjectDisplayKey };
