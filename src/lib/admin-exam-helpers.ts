import { Alert } from 'react-native';
import { exportCsvFile } from '../utils/csvExport';
import {
  buildSchoolPerformanceAnalysisCsv,
  schoolPerformanceAnalysisFilename,
  withExcelCsvBom,
} from './college-performance-analysis-csv';

/** Helpers for school-admin exam results view (parity with web exam-view-only). */

export type AdminExamResult = {
  _id: string;
  examId?: string;
  examTitle?: string;
  userId: {
    _id?: string;
    fullName?: string;
    email?: string;
    classNumber?: string;
  };
  percentage?: number;
  obtainedMarks: number;
  totalMarks: number;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  unattempted?: number;
  timeTaken?: number;
  attemptNumber?: number;
  subjectWiseScore?: Record<string, { correct?: number; total?: number; marks?: number }>;
  questionAnalytics?: Array<{
    subject?: string;
    chapter?: string;
    difficulty?: string;
    questionType?: string;
    timeTaken?: number;
    status?: 'correct' | 'wrong' | 'not_answered';
  }>;
  completedAt: string;
};

export const normalizeClassNumberForDisplay = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return 'N/A';
  return raw
    .replace(/^class\s*-\s*(\d+)/i, 'Class $1')
    .replace(/^-([0-9]+)([A-Za-z]?)$/, '$1$2');
};

export const derivePercentageFromMarks = (
  obtainedMarks: unknown,
  totalMarks: unknown
): number | null => {
  const obtained = Number(obtainedMarks);
  const total = Number(totalMarks);
  if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((obtained / total) * 10000) / 100;
};

export const getResultPercentage = (result: AdminExamResult): number => {
  const fromMarks = derivePercentageFromMarks(result.obtainedMarks, result.totalMarks);
  if (fromMarks !== null) return fromMarks;
  const stored = Number(result.percentage);
  return Number.isFinite(stored) ? stored : 0;
};

const parsePerformerMarks = (marks: unknown): { obtained: number; total: number } | null => {
  const text = String(marks ?? '').trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { obtained: Number(match[1]), total: Number(match[2]) };
};

export const getPerformerPercentage = (performer: {
  marks?: string;
  percentage?: number;
}): number => {
  const parsedMarks = parsePerformerMarks(performer?.marks);
  if (parsedMarks) {
    const fromMarks = derivePercentageFromMarks(parsedMarks.obtained, parsedMarks.total);
    if (fromMarks !== null) return fromMarks;
  }
  const stored = Number(performer?.percentage);
  return Number.isFinite(stored) ? stored : 0;
};

export const formatTimeTaken = (seconds: unknown): string => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

export const getAttemptedCount = (result: AdminExamResult): number =>
  Math.max(0, Number(result.correctAnswers) || 0) + Math.max(0, Number(result.wrongAnswers) || 0);

export const getQuestionAccuracy = (result: AdminExamResult): number => {
  const attempted = getAttemptedCount(result);
  if (attempted <= 0) return 0;
  return Math.round((Math.max(0, Number(result.correctAnswers) || 0) / attempted) * 100);
};

export const formatCompletedAt = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

export const subjectWiseEntries = (result: AdminExamResult) => {
  const raw = result.subjectWiseScore;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw).map(([subject, stats]) => ({
    subject,
    correct: Number(stats?.correct) || 0,
    total: Number(stats?.total) || 0,
    marks: Number(stats?.marks) || 0,
  }));
};

export const marksBadgeTone = (pct: number): 'good' | 'mid' | 'low' => {
  if (pct >= 70) return 'good';
  if (pct >= 50) return 'mid';
  return 'low';
};

export const rankMedalColor = (idx: number): string => {
  if (idx === 0) return '#EAB308';
  if (idx === 1) return '#9CA3AF';
  if (idx === 2) return '#F97316';
  return '#E2E8F0';
};

export const rankMedalTextColor = (idx: number): string => {
  if (idx <= 2) return '#FFFFFF';
  return '#475569';
};

export function formatAttemptLabel(attemptNumber?: number): string {
  const n = Number(attemptNumber);
  if (!Number.isFinite(n) || n < 1) return 'Attempt 1';
  return `Attempt ${Math.round(n)}`;
}

/** Ensure each row has Attempt 1/2/3 when a student has multiple submissions. */
export function enrichExamResultsWithAttempts(rows: AdminExamResult[]): AdminExamResult[] {
  const groups = new Map<string, AdminExamResult[]>();
  for (const row of rows) {
    const studentId = String(row.userId?._id || '');
    const examId = String(row.examId || '');
    const key = `${studentId}:${examId}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const enriched: AdminExamResult[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const storedNums = sorted.map((r) => Number(r.attemptNumber)).filter((n) => n >= 1);
    const useStored =
      storedNums.length === sorted.length && new Set(storedNums).size === sorted.length;

    sorted.forEach((row, idx) => {
      enriched.push({
        ...row,
        attemptNumber: useStored ? Number(row.attemptNumber) : idx + 1,
      });
    });
  }
  return enriched;
}

export function rankExamResults(results: AdminExamResult[]) {
  return [...results]
    .map((result) => ({
      result,
      marksPct: getResultPercentage(result),
      questionAcc: getQuestionAccuracy(result),
    }))
    .sort(
      (a, b) =>
        b.marksPct - a.marksPct || b.result.obtainedMarks - a.result.obtainedMarks
    );
}

export function buildExamResultsCsv(
  examTitle: string,
  ranked: ReturnType<typeof rankExamResults>
): string {
  return withExcelCsvBom(
    buildSchoolPerformanceAnalysisCsv(
      examTitle,
      ranked.map(({ result }) => result),
    ),
  );
}

function buildExamResultsFilename(examTitle: string): string {
  return schoolPerformanceAnalysisFilename(examTitle);
}

/** Export ranked exam results as a downloadable `.csv` file. */
export async function shareExamResultsCsv(examTitle: string, ranked: ReturnType<typeof rankExamResults>) {
  if (!ranked.length) {
    Alert.alert('Export', 'No results to export for this exam yet.');
    return;
  }
  const csv = buildExamResultsCsv(examTitle, ranked);
  await exportCsvFile(csv, buildExamResultsFilename(examTitle));
}
