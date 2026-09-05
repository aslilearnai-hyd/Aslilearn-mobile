import { displaySubjectName } from './subject-names';
import { teacherGreeting } from '../theme/teacher';

/** Title-case a word; keeps short acronyms (e.g. SL, IIT) uppercase. */
function formatWord(part: string): string {
  const trimmed = part.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4 && trimmed === trimmed.toUpperCase()) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** Title-case each word in a label. */
export function formatTitleCase(raw: string): string {
  return String(raw || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(formatWord)
    .join(' ');
}

export function formatPersonName(raw: string): string {
  return String(raw || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function resolveTeacherDisplayName(user?: {
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const combined = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const candidates = [user?.fullName, combined, user?.name, user?.email?.split('@')[0]]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return formatTeacherFullName(candidates[0] || 'Teacher');
}

export function formatSubjectLabel(name: string): string {
  return formatTitleCase(displaySubjectName(name));
}

/**
 * Display class + section as 8'A (apostrophe between grade and section).
 * Accepts "8A", "8 A", "8-A", "Class 8A", "8'A".
 */
export function formatClassSectionLabel(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return trimmed;
  const withoutClass = trimmed.replace(/^class\s+/i, '').trim();
  const compact = withoutClass.replace(/\s+/g, '');
  const match = compact.match(/^(\d{1,2})[-_']?([A-Za-z])$/i);
  if (match) return `${match[1]}'${match[2].toUpperCase()}`;
  return withoutClass;
}

/** Pull grade number from "8", "8A", "8'A", "Class 8", etc. */
export function parseClassGradeNumber(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const compact = String(raw)
    .trim()
    .replace(/^class\s+/i, '')
    .replace(/\s+/g, '');
  const match = compact.match(/^(\d{1,2})/);
  if (!match) return null;
  const grade = parseInt(match[1], 10);
  if (!Number.isFinite(grade) || grade < 1 || grade > 12) return null;
  return grade;
}

/**
 * One accent per grade (6→one color, 7→another…).
 * Sections of the same grade (8'A, 8'B) share the same color — no doubles.
 */
export function classGradeAccentIndex(classNumberOrLabel: string | number | null | undefined): number {
  const grade = parseClassGradeNumber(classNumberOrLabel);
  if (grade == null) return 0;
  return grade - 1; // 1→0 … 12→11
}

/** @deprecated Use classGradeAccentIndex — kept for older call sites. */
export function classAccentIndex(key: string, paletteSize: number): number {
  const gradeIndex = classGradeAccentIndex(key);
  if (paletteSize <= 0) return 0;
  return gradeIndex % paletteSize;
}

function uniqueSubjectNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Pull subject names from a string, array, or populated `{ name }` rows. */
export function parseSubjectNames(raw: unknown): string[] {
  const names: string[] = [];
  const add = (value: unknown) => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === 'object' && value !== null && 'name' in value) {
      add((value as { name?: unknown }).name);
      return;
    }
    String(value)
      .split(',')
      .map((part) => formatSubjectLabel(part.trim()))
      .filter(Boolean)
      .forEach((name) => names.push(name));
  };
  add(raw);
  return uniqueSubjectNames(names);
}

/** Comma-separated subjects → "Biology, English, Maths, SL Hindi". */
export function formatSubjectList(raw: string): string {
  const names = parseSubjectNames(raw);
  return names.length ? names.join(', ') : 'General';
}

/** First `visible` subjects, with a leftover count for a "+N more" chip. */
export function summarizeSubjects(
  raw: unknown,
  visible = 2
): { shown: string[]; extra: number; all: string[] } {
  const all = parseSubjectNames(raw);
  if (all.length === 0) return { shown: ['General'], extra: 0, all: ['General'] };
  if (all.length <= visible) return { shown: all, extra: 0, all };
  return { shown: all.slice(0, visible), extra: all.length - visible, all };
}

export function formatTeacherTimeGreeting(): string {
  return teacherGreeting();
}

export function formatTeacherFullName(fullName?: string): string {
  return formatPersonName(String(fullName || 'Teacher').trim() || 'Teacher');
}

/** @deprecated Use formatTeacherTimeGreeting + formatTeacherFullName */
export function formatTeacherGreeting(fullName?: string): string {
  return `${formatTeacherTimeGreeting()}, ${formatTeacherFullName(fullName)}`;
}
