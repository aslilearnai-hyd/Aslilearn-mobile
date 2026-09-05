/** B2C IIT track copy — mirrors web `client/src/lib/iit-track-specs.ts`. */

export const B2C_BOARD_PRICE = 99;
export const B2C_IIT_PRICE = 249;
export const B2C_STUDENT_BOTH_PRICE = 348;
export const B2C_TEACHER_IIT_PRICE = 3999;
export const B2C_TEACHER_BOTH_PRICE = 5187;

export type IitTrackCode = 'ALPHA' | 'BETA' | 'GAMMA';

export type IitTrackSpec = {
  code: IitTrackCode;
  name: string;
  book: string;
  classes: string;
  classNumbers: number[];
  headline: string;
  forWhom: string;
  points: string[];
  colors: {
    border: string;
    bg: string;
    badge: string;
    selected: string;
  };
};

export const IIT_TRACK_SPECS: IitTrackSpec[] = [
  {
    code: 'ALPHA',
    name: 'Alpha',
    book: 'Asli Prep Alpha',
    classes: 'Classes 6–8',
    classNumbers: [6, 7, 8],
    headline: 'Board fundamentals with early Foundation thinking',
    forWhom: 'Best when building school concepts first with a gentle competitive start.',
    points: [
      'CBSE-aligned Alpha book chapters',
      'Concept videos and Vidya for the same chapter',
      'Daily quizzes mapped to Alpha',
      'Foundation Olympiad / JEE / NEET practice',
    ],
    colors: {
      border: '#BFDBFE',
      bg: '#EFF6FF',
      badge: '#1D4ED8',
      selected: '#0284C7',
    },
  },
  {
    code: 'BETA',
    name: 'Beta',
    book: 'Asli Prep Beta',
    classes: 'Classes 6–10',
    classNumbers: [6, 7, 8, 9, 10],
    headline: 'Deeper, exam-focused Foundation pathway',
    forWhom: 'Choose Beta when ready for a faster competitive pace alongside Boards.',
    points: [
      'Beta book chapters as the source of truth',
      'Higher-difficulty adaptive practice',
      'Previous-year banks linked to Beta chapters',
      'Class-wise progression from 6 through 10',
    ],
    colors: {
      border: '#A7F3D0',
      bg: '#ECFDF5',
      badge: '#047857',
      selected: '#0284C7',
    },
  },
  {
    code: 'GAMMA',
    name: 'Gamma',
    book: 'Asli Prep Gamma',
    classes: 'Classes 8–10',
    classNumbers: [8, 9, 10],
    headline: 'Advanced competitive stretch for older classes',
    forWhom: 'For Class 8–10 students who already handle Beta-level work comfortably.',
    points: [
      'Gamma chapters for advanced Foundation',
      'Multi-concept and higher-order problems',
      'Timed mock tests aligned to Gamma topics',
      'Revision sheets from Gamma chapters',
    ],
    colors: {
      border: '#DDD6FE',
      bg: '#F5F3FF',
      badge: '#6D28D9',
      selected: '#0284C7',
    },
  },
];

export function tracksForClass(classNumber: number | string | null | undefined): IitTrackSpec[] {
  const n = Number(String(classNumber ?? '').replace(/\D/g, ''));
  if (!Number.isFinite(n)) return IIT_TRACK_SPECS;
  return IIT_TRACK_SPECS.filter((t) => t.classNumbers.includes(n));
}

export function classNumbersFromLabel(label: string | number | null | undefined): number | null {
  const n = Number(String(label ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) && n >= 6 && n <= 12 ? n : null;
}

export function recommendedTrackForClass(classNumber: number): IitTrackCode {
  if (classNumber <= 7) return 'ALPHA';
  if (classNumber === 8) return 'BETA';
  return 'GAMMA';
}

export const CLASS_TRACK_MATRIX: { classNumber: number; recommended: IitTrackCode; also: IitTrackCode[] }[] = [
  { classNumber: 6, recommended: 'ALPHA', also: ['BETA'] },
  { classNumber: 7, recommended: 'ALPHA', also: ['BETA'] },
  { classNumber: 8, recommended: 'BETA', also: ['ALPHA', 'GAMMA'] },
  { classNumber: 9, recommended: 'BETA', also: ['GAMMA'] },
  { classNumber: 10, recommended: 'GAMMA', also: ['BETA'] },
];
