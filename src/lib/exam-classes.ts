/** Shared helpers for exam class targeting (assignedClasses + legacy classNumber). */

export type ExamClassLike = {
  assignedClasses?: string[] | string | Record<string, unknown>;
  classNumber?: string;
};

export const CLASS_FILTER_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'] as const;

/** Normalizes values like `-7`, `Class 7`, `7th` into `7`. */
export function normalizeClassNumber(value?: unknown): string {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const signedIntMatch = raw.match(/-?\d+/);
  if (!signedIntMatch) return raw;

  const parsed = Math.abs(parseInt(signedIntMatch[0], 10));
  if (Number.isNaN(parsed)) return raw;
  return String(parsed);
}

/** Resolves class labels from API (array, classNumber, or odd legacy shapes). */
export function getExamClassStrings(exam: Partial<ExamClassLike>): string[] {
  const raw = exam.assignedClasses as unknown;
  let classes: string[] = [];
  if (typeof raw === 'string' && raw.trim()) {
    const s = raw.trim();
    if (s.includes('|')) {
      classes = s.split('|').map((c) => normalizeClassNumber(c)).filter(Boolean);
    } else if (s.includes(',')) {
      classes = s.split(',').map((c) => normalizeClassNumber(c)).filter(Boolean);
    } else {
      classes = [normalizeClassNumber(s)];
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    classes = raw.map((c) => normalizeClassNumber(c)).filter(Boolean);
  } else if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    classes = Object.values(raw as object)
      .map((c) => normalizeClassNumber(c))
      .filter(Boolean);
  }
  const cn =
    exam.classNumber != null && String(exam.classNumber).trim() !== ''
      ? normalizeClassNumber(exam.classNumber)
      : '';
  if (classes.length === 0 && cn) {
    classes = [cn];
  }
  return [...new Set(classes)];
}

export function examIncludesClass(exam: Partial<ExamClassLike>, classNum: string): boolean {
  const want = normalizeClassNumber(classNum);
  if (!want) return true;
  return getExamClassStrings(exam).some((c) => normalizeClassNumber(c) === want);
}

/** Only exams explicitly assigned to the student's class. */
export function examMatchesStudentAssignedClass(
  exam: Partial<ExamClassLike>,
  userClass?: string
): boolean {
  const c = normalizeClassNumber(userClass);
  if (!c) return true;
  const examClasses = getExamClassStrings(exam);
  if (examClasses.length === 0) return false;
  return examIncludesClass(exam, c);
}

/** Badge labels on student exam cards — student's class only. */
export function getExamClassLabelsForStudent(
  exam: Partial<ExamClassLike>,
  userClass?: string
): string[] {
  const c = normalizeClassNumber(userClass);
  if (!c || !examIncludesClass(exam, c)) return [];
  return [c];
}

export type ExamClassCard<T extends ExamClassLike = ExamClassLike> = T & {
  viewClassNumber: string;
  cardKey: string;
};

/** One card per assigned class for school-admin lists. */
export function expandExamsByClass<T extends ExamClassLike & { _id?: string }>(
  exams: T[],
): ExamClassCard<T>[] {
  const out: ExamClassCard<T>[] = [];
  for (const exam of exams || []) {
    const classes = getExamClassStrings(exam);
    const examId = String((exam as { _id?: string })._id || '');
    if (classes.length === 0) {
      out.push({
        ...exam,
        viewClassNumber: '',
        cardKey: examId || `exam-${out.length}`,
      });
      continue;
    }
    for (const cl of classes) {
      out.push({
        ...exam,
        viewClassNumber: cl,
        cardKey: `${examId}::${cl}`,
      });
    }
  }
  return out;
}
