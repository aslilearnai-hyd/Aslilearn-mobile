import { STUDENT } from '../theme/student';
import { getExamClassLabelsForStudent } from './exam-classes';
import type { ExamDayRole } from './exam-calendar-entries';

export type ExamCardGradientScheme = {
  gradient: readonly [string, string];
  typeBadgeBg: string;
  typeBadgeText: string;
};

/** Rotating gradient schemes — matches web student-exams cards. */
export const EXAM_CARD_GRADIENT_SCHEMES: ExamCardGradientScheme[] = [
  {
    gradient: [STUDENT.statGradients.today[0], STUDENT.statGradients.today[1]],
    typeBadgeBg: 'rgba(249,115,22,0.25)',
    typeBadgeText: '#fff7ed',
  },
  {
    gradient: [STUDENT.accent, STUDENT.statGradients.study[1]],
    typeBadgeBg: 'rgba(14,165,233,0.25)',
    typeBadgeText: '#f0f9ff',
  },
  {
    gradient: [STUDENT.primaryLight, STUDENT.primary],
    typeBadgeBg: 'rgba(20,184,166,0.25)',
    typeBadgeText: '#f0fdfa',
  },
];

export function getExamCardGradientScheme(index: number): ExamCardGradientScheme {
  return EXAM_CARD_GRADIENT_SCHEMES[index % EXAM_CARD_GRADIENT_SCHEMES.length];
}

export type StudentExamLike = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  examType?: string;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  maxAttempts?: number;
  questions?: unknown[];
  assignedClasses?: string[] | string;
  classNumber?: string;
  hasInProgressDraft?: boolean;
  canResumeExam?: boolean;
  forceSubmitDraft?: boolean;
  hideAvailabilityDates?: boolean;
};

export function getExamIdFromResult(result: any): string | null {
  if (!result || !result.examId) return null;
  if (typeof result.examId === 'object' && result.examId._id) {
    return result.examId._id.toString();
  }
  return result.examId.toString();
}

export function getMaxAttemptsForExam(exam: StudentExamLike): number {
  const configured = Math.max(1, Number(exam.maxAttempts) || (exam.hideAvailabilityDates ? 5 : 1));
  return exam.hideAvailabilityDates ? Math.min(5, configured) : configured;
}

export function getExamStatus(exam: StudentExamLike) {
  const now = new Date();
  const startDate = new Date(exam.startDate || '');
  const endDate = new Date(exam.endDate || exam.startDate || '');

  if (Number.isNaN(startDate.getTime())) {
    return { status: 'active', color: '#10b981', bg: '#d1fae5' };
  }
  if (now < startDate) return { status: 'upcoming', color: '#fbbf24', bg: '#fef3c7' };
  if (Number.isNaN(endDate.getTime()) || now > endDate) {
    return { status: 'ended', color: '#ef4444', bg: '#fee2e2' };
  }
  return { status: 'active', color: '#10b981', bg: '#d1fae5' };
}

export function getExamTypeColor(type: string | undefined) {
  switch (type) {
    case 'mains':
    case 'advanced':
      return { bg: '#dbeafe', text: '#2563eb' };
    case 'weekend':
      return { bg: '#d1fae5', text: '#047857' };
    case 'practice':
      return { bg: 'rgba(245,158,11,0.15)', text: '#d97706' };
    default:
      return { bg: '#f8fafc', text: '#64748b' };
  }
}

export function formatExamDateRange(exam: StudentExamLike): string | null {
  if (!exam.startDate || !exam.endDate) return null;
  const start = new Date(exam.startDate);
  const end = new Date(exam.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

export function getHydratedQuestionCount(exam: StudentExamLike): number {
  if (Array.isArray(exam.questions)) return exam.questions.length;
  return Number(exam.totalQuestions || 0);
}

export function getExamDayRoleLabelForCard(role: ExamDayRole | undefined): string | null {
  switch (role) {
    case 'start':
      return 'OPENS TODAY';
    case 'end':
      return 'CLOSES TODAY';
    case 'middle':
      return 'ACTIVE WINDOW';
    case 'single':
      return 'EXAM DAY';
    default:
      return null;
  }
}

export function buildExamAttemptCounts(results: unknown[]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!Array.isArray(results)) return counts;
  for (const result of results) {
    const examId = getExamIdFromResult(result);
    if (!examId) continue;
    counts[examId] = (counts[examId] || 0) + 1;
  }
  return counts;
}

export function getExamClassLabels(exam: StudentExamLike, studentClassNumber?: string | number | null) {
  const classLabel =
    studentClassNumber == null || studentClassNumber === ''
      ? undefined
      : String(studentClassNumber);
  return getExamClassLabelsForStudent(exam, classLabel);
}
