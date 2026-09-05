import { getExamClassStrings } from './exam-classes';

export type ExamType = 'weekend' | 'mains' | 'advanced' | 'practice';
export type ExamSubject = 'maths' | 'physics' | 'chemistry' | 'biology';
export type FilterType = 'all-schools' | 'specific-schools';
export type QuestionType = 'mcq' | 'multiple' | 'integer' | 'assertion_reason' | 'match_following';
export type BulkQuestionUploadMode = 'csv' | 'pdf';

export interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: ExamType;
  classNumber?: string;
  subject: ExamSubject;
  subjects?: ExamSubject[];
  maxAttempts: number;
  assignedClasses?: string[];
  board: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  instructions: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  questions?: string[] | unknown[];
  targetSchools?: Array<{ _id: string; schoolName?: string; fullName?: string; email?: string } | string>;
  schoolId?: string;
  isSchoolSpecific?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SchoolOption {
  id: string;
  name: string;
  email?: string;
  board?: string;
}

export interface ExamFormState {
  title: string;
  description: string;
  examType: ExamType;
  classNumber: string;
  assignedClasses: string[];
  subjects: ExamSubject[];
  maxAttempts: string;
  board: string;
  filterType: FilterType;
  selectedSchools: string[];
  duration: string;
  totalQuestions: string;
  totalMarks: string;
  instructions: string;
  startDate: string;
  endDate: string;
}

export interface QuestionFormState {
  questionText: string;
  questionImage: string;
  questionType: QuestionType;
  subject: ExamSubject;
  marks: string;
  negativeMarks: string;
  explanation: string;
  options: string[];
  correctAnswer: string;
  correctAnswers: string[];
  integerAnswer: string;
}

export interface PdfQuestionRow {
  row: number;
  questionText: string;
  questionType: QuestionType;
  subject: string;
  marks: number;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  explanation: string;
  passageId?: string;
  passageText?: string;
  sharedMatterId?: string;
  sharedMatterText?: string;
  sharedMatterKind?: '' | 'case' | 'assertion_reason' | 'match_following';
  assertionText?: string;
  reasonText?: string;
  matchColumnI?: Array<{ key?: string; text?: string }>;
  matchColumnII?: Array<{ key?: string; text?: string }>;
}

export const BOARDS = [
  { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'Asli Prep (exclusive)' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'SSC', label: 'SSC / State Board' },
  { value: 'STATE', label: 'State Board (generic)' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IB', label: 'IB' },
  { value: 'CAMBRIDGE', label: 'Cambridge (CAIE)' },
] as const;

export const EXAM_TYPES = [
  { value: 'mains' as const, label: 'Mains' },
  { value: 'advanced' as const, label: 'Advanced' },
  { value: 'weekend' as const, label: 'Weekend' },
  { value: 'practice' as const, label: 'Practice' },
];

export const EXAM_SUBJECTS = [
  { value: 'maths' as const, label: 'Mathematics' },
  { value: 'physics' as const, label: 'Physics' },
  { value: 'chemistry' as const, label: 'Chemistry' },
  { value: 'biology' as const, label: 'Biology' },
];

export const CLASS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

export const emptyExamForm = (): ExamFormState => ({
  title: '',
  description: '',
  examType: 'mains',
  classNumber: '',
  assignedClasses: [],
  subjects: ['maths'],
  maxAttempts: '1',
  board: 'ASLI_EXCLUSIVE_SCHOOLS',
  filterType: 'all-schools',
  selectedSchools: [],
  duration: '',
  totalQuestions: '',
  totalMarks: '',
  instructions: '',
  startDate: '',
  endDate: '',
});

export const emptyQuestionForm = (): QuestionFormState => ({
  questionText: '',
  questionImage: '',
  questionType: 'mcq',
  subject: 'maths',
  marks: '1',
  negativeMarks: '0',
  explanation: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  correctAnswers: [],
  integerAnswer: '',
});

function optionText(opt: unknown): string {
  if (typeof opt === 'string') return opt;
  if (opt && typeof opt === 'object' && 'text' in (opt as object)) {
    return String((opt as { text?: unknown }).text ?? '');
  }
  return '';
}

/** Prefill the single-question form from an existing exam question (edit flow). */
export const questionFormFromExisting = (q: any): QuestionFormState => {
  const rawOptions = Array.isArray(q?.options) ? q.options : [];
  const options = rawOptions.map(optionText);
  while (options.length < 4) options.push('');

  const typeRaw = String(q?.questionType || 'mcq').toLowerCase();
  const questionType: QuestionType =
    typeRaw === 'multiple' ||
    typeRaw === 'integer' ||
    typeRaw === 'assertion_reason' ||
    typeRaw === 'match_following'
      ? (typeRaw as QuestionType)
      : 'mcq';

  const subjectRaw = String(q?.subject || 'maths').toLowerCase();
  const subject: ExamSubject = (['maths', 'physics', 'chemistry', 'biology'].includes(subjectRaw)
    ? subjectRaw
    : 'maths') as ExamSubject;

  let correctAnswer = '';
  let correctAnswers: string[] = [];
  let integerAnswer = '';

  if (questionType === 'integer') {
    integerAnswer =
      q?.correctAnswer === null || q?.correctAnswer === undefined ? '' : String(q.correctAnswer);
  } else if (questionType === 'multiple') {
    const answers = Array.isArray(q?.correctAnswer)
      ? q.correctAnswer
      : q?.correctAnswer != null && q?.correctAnswer !== ''
        ? [q.correctAnswer]
        : [];
    correctAnswers = answers.map((a: unknown) => String(a ?? '').trim()).filter(Boolean);
    if (correctAnswers.length === 0) {
      rawOptions.forEach((opt: any) => {
        if (opt?.isCorrect) correctAnswers.push(optionText(opt));
      });
    }
  } else {
    if (q?.correctAnswer != null && q?.correctAnswer !== '') {
      correctAnswer = String(q.correctAnswer);
    } else {
      const flagged = rawOptions.find((opt: any) => opt?.isCorrect);
      if (flagged) correctAnswer = optionText(flagged);
    }
  }

  return {
    questionText: String(q?.questionText || ''),
    questionImage: String(q?.questionImage || ''),
    questionType,
    subject,
    marks: String(q?.marks ?? 1),
    negativeMarks: String(q?.negativeMarks ?? 0),
    explanation: String(q?.explanation || ''),
    options,
    correctAnswer,
    correctAnswers,
    integerAnswer,
  };
};

export const normalizeDisplayText = (value?: string) =>
  (value || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const toIsoFromDateTimeLocal = (value: string) => {
  if (!value) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

export const toDateTimeLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getExamSubjects = (exam: Partial<Exam>): ExamSubject[] => {
  const fromArray = Array.isArray(exam.subjects) ? exam.subjects : [];
  const merged = [...fromArray, exam.subject].filter(Boolean) as ExamSubject[];
  return Array.from(new Set(merged.map((s) => String(s).trim().toLowerCase() as ExamSubject))).filter(Boolean);
};

export const getExamTimestamp = (exam: Partial<Exam>) => {
  const raw = exam.updatedAt || exam.createdAt || '';
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

export const examDisplayDedupKey = (exam: Exam) => {
  const classKey = getExamClassStrings(exam)
    .map((c) => String(c).trim())
    .filter(Boolean)
    .sort()
    .join('|');
  const targetSchoolsKey = (exam.targetSchools || [])
    .map((s) => (typeof s === 'string' ? s : s?._id))
    .filter(Boolean)
    .map((id) => String(id))
    .sort()
    .join('|');

  return [
    (exam.title || '').trim().toLowerCase(),
    (exam.description || '').trim().toLowerCase(),
    exam.examType || '',
    classKey,
    String(exam.duration || ''),
    String(exam.totalQuestions || ''),
    String(exam.totalMarks || ''),
    exam.startDate || '',
    exam.endDate || '',
    exam.isSchoolSpecific ? 'school-specific' : 'all-schools',
    targetSchoolsKey,
  ].join('::');
};

export const normalizeExamFromApi = (ex: Exam): Exam => {
  const labels = getExamClassStrings(ex);
  const normalizedSubjects = getExamSubjects(ex);
  return {
    ...ex,
    assignedClasses: labels,
    classNumber: labels[0] ?? ex.classNumber ?? '',
    subject: (normalizedSubjects[0] || ex.subject || 'maths') as ExamSubject,
    subjects:
      normalizedSubjects.length > 0
        ? normalizedSubjects
        : [(ex.subject || 'maths') as ExamSubject],
  };
};

export const examFormFromExam = (exam: Exam): ExamFormState => {
  const assigned = getExamClassStrings(exam);
  return {
    title: exam.title || '',
    description: exam.description || '',
    examType: exam.examType || 'mains',
    classNumber: assigned[0] || '',
    assignedClasses: assigned,
    subjects: getExamSubjects(exam).length > 0 ? getExamSubjects(exam) : ['maths'],
    maxAttempts: String(exam.maxAttempts || 1),
    board: exam.board || 'ASLI_EXCLUSIVE_SCHOOLS',
    filterType: exam.isSchoolSpecific ? 'specific-schools' : 'all-schools',
    selectedSchools:
      exam.targetSchools?.map((s) => (typeof s === 'string' ? s : s._id)).filter(Boolean) || [],
    duration: String(exam.duration || ''),
    totalQuestions: String(exam.totalQuestions || ''),
    totalMarks: String(exam.totalMarks || ''),
    instructions: exam.instructions || '',
    startDate: toDateTimeLocalInput(exam.startDate),
    endDate: toDateTimeLocalInput(exam.endDate),
  };
};

export const buildExamSavePayload = (form: ExamFormState) => {
  const normalizedSubjects = Array.from(
    new Set(form.subjects.map((s) => String(s).trim().toLowerCase()).filter(Boolean))
  ) as ExamSubject[];

  const payload: Record<string, unknown> = {
    title: form.title,
    description: form.description,
    examType: form.examType,
    classNumber: form.assignedClasses[0],
    assignedClasses: form.assignedClasses,
    subject: normalizedSubjects[0],
    subjects: normalizedSubjects,
    maxAttempts: parseInt(form.maxAttempts, 10),
    board: form.board,
    duration: parseInt(form.duration, 10),
    totalQuestions: parseInt(form.totalQuestions, 10),
    totalMarks: parseInt(form.totalMarks, 10),
    instructions: form.instructions,
    startDate: toIsoFromDateTimeLocal(form.startDate),
    endDate: toIsoFromDateTimeLocal(form.endDate),
  };

  if (form.filterType === 'specific-schools' && form.selectedSchools.length > 0) {
    payload.targetSchools = form.selectedSchools;
    payload.isSchoolSpecific = true;
    payload.isAllBoards = false;
  } else {
    payload.isSchoolSpecific = false;
    payload.isAllBoards = true;
    payload.targetSchools = [];
  }

  return payload;
};

export const validateExamForm = (form: ExamFormState): string | null => {
  if (
    !form.title ||
    form.assignedClasses.length === 0 ||
    form.subjects.length === 0 ||
    !form.maxAttempts ||
    !form.duration ||
    !form.totalQuestions ||
    !form.totalMarks ||
    !form.startDate ||
    !form.endDate
  ) {
    return 'Please fill in all required fields.';
  }
  if ((parseInt(form.maxAttempts, 10) || 0) < 1) {
    return 'No. of Attempts must be at least 1.';
  }
  if (form.filterType === 'specific-schools' && form.selectedSchools.length === 0) {
    return 'Please select at least one school.';
  }
  return null;
};

export const filterExams = (
  exams: Exam[],
  selectedSchool: string,
  selectedClass: string,
  searchQuery: string
) => {
  const query = searchQuery.trim().toLowerCase();
  return exams.filter((exam) => {
    const schoolMatches =
      selectedSchool === 'all-schools'
        ? true
        : !exam.isSchoolSpecific ||
          (exam.targetSchools || []).some((school) => {
            const schoolId = typeof school === 'string' ? school : school._id;
            return schoolId === selectedSchool;
          });

    const examClasses = getExamClassStrings(exam);
    const classMatches =
      selectedClass === 'all-classes'
        ? true
        : examClasses.map((c) => String(c)).includes(String(selectedClass));

    const searchMatches =
      !query ||
      exam.title.toLowerCase().includes(query) ||
      (exam.description && exam.description.toLowerCase().includes(query)) ||
      exam.examType.toLowerCase().includes(query);

    return schoolMatches && classMatches && searchMatches;
  });
};

export const dedupeExams = (exams: Exam[]): Exam[] => {
  const byKey = new Map<string, Exam>();
  exams.forEach((exam) => {
    const key = examDisplayDedupKey(exam);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, exam);
      return;
    }
    const existingSubjectCount = getExamSubjects(existing).length;
    const nextSubjectCount = getExamSubjects(exam).length;
    if (nextSubjectCount > existingSubjectCount) {
      byKey.set(key, exam);
      return;
    }
    if (nextSubjectCount === existingSubjectCount && getExamTimestamp(exam) > getExamTimestamp(existing)) {
      byKey.set(key, exam);
    }
  });
  return Array.from(byKey.values());
};

export const groupExamsByClass = (exams: Exam[]): Record<string, Exam[]> => {
  const grouped = exams.reduce((acc, exam) => {
    const examClassLabels = getExamClassStrings(exam);
    const classBuckets = examClassLabels.length > 0 ? examClassLabels : ['unassigned'];
    classBuckets.forEach((classKey) => {
      if (!acc[classKey]) acc[classKey] = [];
      acc[classKey].push(exam);
    });
    return acc;
  }, {} as Record<string, Exam[]>);

  Object.keys(grouped).forEach((classKey) => {
    grouped[classKey].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  });
  return grouped;
};

export const sortClassSectionKeys = (keys: string[]) =>
  [...keys].sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return Number(a) - Number(b);
  });

export const getClassWiseStats = (exams: Exam[]) => {
  const counts: Record<string, number> = {};
  exams.forEach((exam) => {
    const labels = getExamClassStrings(exam);
    if (labels.length === 0) {
      counts.unassigned = (counts.unassigned || 0) + 1;
    } else {
      labels.forEach((cls) => {
        counts[cls] = (counts[cls] || 0) + 1;
      });
    }
  });
  return Object.entries(counts)
    .map(([cls, count]) => ({ cls, count }))
    .sort((a, b) => {
      if (a.cls === 'unassigned') return 1;
      if (b.cls === 'unassigned') return -1;
      return Number(a.cls) - Number(b.cls);
    });
};

export const getExamTypeBadgeStyle = (type: string) => {
  switch (type) {
    case 'mains':
      return { bg: '#dbeafe', text: '#1e40af' };
    case 'advanced':
      return { bg: '#ede9fe', text: '#6b21a8' };
    case 'weekend':
      return { bg: '#d1fae5', text: '#065f46' };
    case 'practice':
      return { bg: '#ffedd5', text: '#c2410c' };
    default:
      return { bg: '#f3f4f6', text: '#374151' };
  }
};

export const getBoardLabel = (board: string) =>
  BOARDS.find((b) => b.value === board)?.label || normalizeDisplayText(board);

export const mapAdminToSchool = (admin: Record<string, unknown>): SchoolOption => ({
  id: String(admin.id || admin._id || ''),
  name: String(admin.schoolName || admin.name || 'Unnamed'),
  email: admin.email ? String(admin.email) : undefined,
  board: admin.board ? String(admin.board) : undefined,
});

export const EXAM_CSV_TEMPLATE = [
  'title,description,examType,classNumber,subject,maxAttempts,board,duration,totalQuestions,totalMarks,instructions,startDate,endDate,filterType,targetSchools',
  'JEE Mains Mock Test 2024,Mock test for JEE Mains preparation,mains,10,maths,1,ASLI_EXCLUSIVE_SCHOOLS,180,90,360,Read all instructions carefully,2024-12-25T10:00:00,2024-12-25T13:00:00,all-schools,',
].join('\n');

export const QUESTION_CSV_TEMPLATE = [
  'questionText,questionType,subject,marks,option1,option2,option3,option4,correctAnswer,explanation,questionCategory,difficulty',
  'What is 2+2?,mcq,maths,1,3,4,5,6,4,Basic addition,Numerical,easy',
].join('\n');

export const buildQuestionPayload = (
  form: QuestionFormState,
  examBoard: string,
  replaceDuplicate = false
) => {
  let correctAnswer: string | number | string[];
  if (form.questionType === 'integer') {
    correctAnswer = parseInt(form.integerAnswer, 10);
  } else if (form.questionType === 'multiple') {
    correctAnswer = form.correctAnswers.filter((ans) => ans.trim() !== '');
  } else {
    correctAnswer = form.correctAnswer;
  }

  const formattedOptions =
    form.questionType === 'integer'
      ? []
      : form.options
          .filter((opt) => opt.trim() !== '')
          .map((opt) => ({ text: opt.trim(), isCorrect: false }));

  return {
    questionText: form.questionText.trim(),
    questionImage: form.questionImage.trim(),
    questionType: form.questionType,
    options: formattedOptions,
    correctAnswer,
    marks: Math.max(0, Number(form.marks) || 1),
    negativeMarks: Math.max(0, Math.abs(Number(form.negativeMarks) || 0)),
    explanation: form.explanation.trim() || undefined,
    subject: form.subject,
    board: examBoard,
    replaceDuplicate,
  };
};

export const validateQuestionForm = (form: QuestionFormState): string | null => {
  if (!form.questionText.trim() && !form.questionImage) {
    return 'Question text or image is required.';
  }
  if (
    (form.questionType === 'mcq' || form.questionType === 'multiple') &&
    form.options.every((opt) => !opt.trim())
  ) {
    return 'At least one option is required for MCQ questions.';
  }
  if (form.questionType === 'integer') {
    const n = parseInt(form.integerAnswer, 10);
    if (Number.isNaN(n)) return 'Please enter a valid integer answer.';
  } else if (form.questionType === 'multiple') {
    if (form.correctAnswers.filter((a) => a.trim()).length === 0) {
      return 'Please select at least one correct answer.';
    }
  } else if (!form.correctAnswer.trim()) {
    return 'Please select a correct answer.';
  }
  return null;
};

export function normalizePdfRowSubjectSlug(raw: string): '' | ExamSubject {
  const t = String(raw || '').trim().toLowerCase();
  if (!t) return '';
  const map: Record<string, ExamSubject> = {
    maths: 'maths',
    mathematics: 'maths',
    math: 'maths',
    physics: 'physics',
    chemistry: 'chemistry',
    biology: 'biology',
    biological: 'biology',
  };
  return map[t] || '';
}
