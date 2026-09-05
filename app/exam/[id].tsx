import { storageGetItem } from '../../src/lib/safe-storage';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  BackHandler,
  FlatList,
  Pressable,
  useWindowDimensions,
  AppState,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import { API_BASE_URL } from '../../src/lib/api-config';
import api, { AUTH_TOKEN_KEY } from '../../src/services/api/api';
import { getDashboardPath } from '../../src/hooks/useBackNavigation';
import ExamResultsView from '../../src/components/student/ExamResultsView';
import ExamInstructionsScreen from '../../src/components/exam/ExamInstructionsScreen';
import ExamMathText from '../../src/components/student/ExamMathText';
import { GlassPanel } from '../../src/components/ui';
import { ExamAnalysisResult, normalizeMongoId } from '../../src/lib/exam-analysis-helpers';
import { normalizeAndFormatExamDisplayText, resolveAssertionReasonDisplay } from '../../src/lib/exam-text-normalize';
import {
  clearMobileExamDraft,
  normalizeMobileDraftAnswers,
  pickMobileResumeDraft,
  readMobileExamDraft,
  writeMobileExamDraft,
  type MobileExamDraft,
} from '../../src/lib/exam-attempt-draft';

const MAX_EXIT_ATTEMPTS = 5;
const PALETTE_COLUMNS = 5;
const PALETTE_PAGE_SIZE = 20;
const DEFAULT_ASSERTION_REASON_DIRECTIONS =
  'Directions: Each question below consists of an Assertion (A) and a Reason (R). Choose the correct option:\n' +
  '(a) Both A and R are true, and R is the correct explanation of A.\n' +
  '(b) Both A and R are true, but R is not the correct explanation of A.\n' +
  '(c) A is true, but R is false.\n' +
  '(d) A is false, but R is true.';

function looksLikeArDirectionsText(text?: string) {
  const t = String(text || '');
  return (
    /correct explanation of A/i.test(t) ||
    (/Both A and R are true/i.test(t) && /A is false,\s*but R is true/i.test(t))
  );
}
type Question = {
  _id: string;
  questionText?: string;
  question?: string;
  questionImage?: string;
  questionType?: 'mcq' | 'multiple' | 'integer' | string;
  options?: Array<string | { text: string; isCorrect?: boolean }>;
  marks?: number;
  negativeMarks?: number;
  subject?: string;
  correctAnswer?: unknown;
  displayOrder?: number;
  sectionHeading?: string;
};

const SUBJECT_SECTION_LABELS: Record<string, string> = {
  maths: 'Maths',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
};

function resolveAttemptSectionHeading(q?: Question | null) {
  if (!q) return '';
  const custom = String(q.sectionHeading || '').trim();
  if (custom) return custom;
  const key = String(q.subject || '').trim().toLowerCase();
  return SUBJECT_SECTION_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
}

function subjectBadgeColors(subject?: string) {
  const key = String(subject || '').trim().toLowerCase();
  if (key === 'maths' || key === 'math' || key === 'mathematics') {
    return { bg: '#dbeafe', text: '#1d4ed8' };
  }
  if (key === 'physics') return { bg: '#dcfce7', text: '#15803d' };
  if (key === 'chemistry') return { bg: '#ffedd5', text: '#c2410c' };
  if (key === 'biology') return { bg: '#dcfce7', text: '#166534' };
  return { bg: '#f3e8ff', text: '#7e22ce' };
}

/** Normalize question id so answer map keys always match (mixed `_id` / `id` shapes). */
function answerKey(question: Question | string | null | undefined): string {
  if (question == null) return '';
  if (typeof question === 'string') return String(question).trim();
  return String(question._id || (question as { id?: string }).id || '').trim();
}

function isAnswerProvided(question: Question, raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  const t = question.questionType || 'mcq';
  if (t === 'multiple') return Array.isArray(raw) && raw.length > 0;
  return String(raw).trim() !== '';
}

function normalizeExamText(value: unknown, subject?: string): string {
  return normalizeAndFormatExamDisplayText(value, subject);
}

type Exam = {
  _id: string;
  title: string;
  duration: number;
  maxAttempts?: number;
  startDate?: string;
  endDate?: string;
  questions: Question[];
  description?: string;
  examType?: string;
  totalMarks?: number;
  totalQuestions?: number;
  instructions?: string;
  classNumber?: string | number;
  negativeMarking?: boolean;
};

function normalizeQuestion(raw: any, index: number): Question {
  const id = String(raw?._id || raw?.id || `q-${index + 1}`).trim();
  return {
    ...raw,
    _id: id,
    marks: Number(raw?.marks) || 0,
    negativeMarks: Number(raw?.negativeMarks) || 0,
  };
}

function sanitizeAnswersForSubmit(
  exam: Exam,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const allowed = new Set(exam.questions.map((q) => answerKey(q)).filter(Boolean));
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(answers || {})) {
    const key = String(rawKey).trim();
    if (!key || !allowed.has(key) || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function sanitizeTimingsForSubmit(
  exam: Exam,
  timings: Record<string, number>
): Record<string, number> {
  const allowed = new Set(exam.questions.map((q) => answerKey(q)).filter(Boolean));
  const out: Record<string, number> = {};
  for (const [rawKey, value] of Object.entries(timings || {})) {
    const key = String(rawKey).trim();
    const n = Number(value);
    if (!key || !allowed.has(key) || !Number.isFinite(n) || n < 0) continue;
    out[key] = Math.round(n);
  }
  return out;
}

function buildLocalExamResult(
  exam: Exam,
  answers: Record<string, unknown>,
  timeTaken: number,
  questionTimings: Record<string, number>
) {
  const safeAnswers = sanitizeAnswersForSubmit(exam, answers);
  const safeTimings = sanitizeTimingsForSubmit(exam, questionTimings);
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;
  const subjectWiseScore = {
    maths: { correct: 0, total: 0, marks: 0 },
    physics: { correct: 0, total: 0, marks: 0 },
    chemistry: { correct: 0, total: 0, marks: 0 },
  };

  for (const question of exam.questions) {
    const qid = answerKey(question);
    const userAnswer = qid ? safeAnswers[qid] : undefined;
    const answered = isAnswerProvided(question, userAnswer);
    const marks = Number(question.marks) || 0;
    totalMarks += marks;

    const normalizedSubject = String(question.subject || '').toLowerCase();
    const tracked =
      normalizedSubject === 'maths' ||
      normalizedSubject === 'physics' ||
      normalizedSubject === 'chemistry';
    if (tracked) {
      subjectWiseScore[normalizedSubject as keyof typeof subjectWiseScore].total += 1;
    }

    // Server re-grades with the real key; local estimate is only a payload fallback
    // when correctAnswer is hidden from the student exam payload.
    const correct = question.correctAnswer;
    let isCorrect = false;
    if (answered && correct != null && correct !== '') {
      if ((question.questionType || 'mcq') === 'multiple') {
        const correctArr = Array.isArray(correct) ? correct : [correct];
        const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const norm = (arr: unknown[]) =>
          arr.map((a) => String(a).toLowerCase().trim()).sort().join('|');
        isCorrect = norm(correctArr) === norm(userArr);
      } else {
        isCorrect =
          String(Array.isArray(userAnswer) ? userAnswer[0] : userAnswer)
            .toLowerCase()
            .trim() ===
          String(Array.isArray(correct) ? correct[0] : correct)
            .toLowerCase()
            .trim();
      }
    }

    if (isCorrect) {
      correctAnswers += 1;
      obtainedMarks += marks;
      if (tracked) {
        const bucket = subjectWiseScore[normalizedSubject as keyof typeof subjectWiseScore];
        bucket.correct += 1;
        bucket.marks += marks;
      }
    } else if (answered) {
      wrongAnswers += 1;
      obtainedMarks -= Number(question.negativeMarks) || 0;
    }
  }

  const totalQuestions = exam.questions.length;
  const unattempted = Math.max(0, totalQuestions - correctAnswers - wrongAnswers);
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const examId = normalizeMongoId(exam._id);

  return {
    examId,
    examTitle: String(exam.title || 'Exam'),
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    unattempted,
    totalMarks,
    obtainedMarks,
    percentage: Number.isFinite(percentage) ? percentage : 0,
    timeTaken: Math.max(0, Math.round(Number(timeTaken) || 0)),
    subjectWiseScore,
    answers: safeAnswers,
    questionTimings: safeTimings,
  };
}

function extractSubmitErrorMessage(err: unknown, fallback = 'Failed to save result'): string {
  const ax = err as {
    response?: { status?: number; data?: { message?: string; error?: string } };
    message?: string;
  };
  const data = ax?.response?.data;
  const msg = String(data?.message || data?.error || ax?.message || '').trim();
  const status = ax?.response?.status;
  if (msg && status) return `${msg} (HTTP ${status})`;
  if (msg) return msg;
  if (status) return `${fallback} (HTTP ${status})`;
  return fallback;
}

async function postExamResult(payload: Record<string, unknown>) {
  // Prefer axios (same token resolution as the rest of the app).
  const { data, status } = await api.post('/api/student/exam-results', payload, {
    timeout: 60_000,
    validateStatus: () => true,
  });
  return { data, status, ok: status >= 200 && status < 300 };
}

function mergeExamResult(
  exam: Exam,
  answers: Record<string, unknown>,
  timeTaken: number,
  server: Record<string, unknown>,
  localQuestionTimings?: Record<string, number>
): ExamAnalysisResult {
  const serverAnswersRaw = server.answers;
  const normalizedServerAnswers =
    serverAnswersRaw && typeof serverAnswersRaw === 'object' && !Array.isArray(serverAnswersRaw)
      ? Object.fromEntries(Object.entries(serverAnswersRaw).map(([k, v]) => [String(k), v]))
      : {};
  const localAnswerCount = Object.keys(answers).length;
  const serverAnswerCount = Object.keys(normalizedServerAnswers).length;

  return {
    _id: server._id != null ? String(server._id) : undefined,
    attemptNumber:
      Number(server.attemptNumber) >= 1 ? Number(server.attemptNumber) : undefined,
    examId: String(server.examId || exam._id),
    examTitle: String(server.examTitle || exam.title),
    totalQuestions: Number(server.totalQuestions ?? exam.questions.length),
    correctAnswers: Number(server.correctAnswers ?? 0),
    wrongAnswers: Number(server.wrongAnswers ?? 0),
    unattempted: Number(server.unattempted ?? 0),
    totalMarks: Number(server.totalMarks ?? 0),
    obtainedMarks: Number(server.obtainedMarks ?? 0),
    percentage: Number(server.percentage ?? 0),
    timeTaken: Number(server.timeTaken ?? timeTaken),
    subjectWiseScore:
      server.subjectWiseScore && typeof server.subjectWiseScore === 'object'
        ? (server.subjectWiseScore as ExamAnalysisResult['subjectWiseScore'])
        : undefined,
    answers:
      serverAnswerCount > 0 || localAnswerCount === 0 ? normalizedServerAnswers : answers,
    questions:
      Array.isArray(server.questions) && server.questions.length > 0
        ? server.questions
        : exam.questions,
    questionTimings:
      server.questionTimings && typeof server.questionTimings === 'object'
        ? (server.questionTimings as Record<string, number>)
        : localQuestionTimings && Object.keys(localQuestionTimings).length > 0
          ? localQuestionTimings
          : undefined,
  };
}

function optionLabel(opt: string | { text: string }, index: number): string {
  if (typeof opt === 'string') return opt;
  return opt.text || `Option ${index + 1}`;
}

export default function ExamPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [dashboardPath, setDashboardPath] = useState('/dashboard');
  const [exitAttempts, setExitAttempts] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [palettePage, setPalettePage] = useState(0);
  const [showQuestionDropdown, setShowQuestionDropdown] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const paletteListRef = useRef<FlatList<number>>(null);
  const questionScrollRef = useRef<ScrollView>(null);
  const [examResult, setExamResult] = useState<ExamAnalysisResult | null>(null);
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [pendingForceSubmit, setPendingForceSubmit] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const submittedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const submitExamRef = useRef<() => Promise<void>>(async () => {});
  const questionEnterTimestampRef = useRef<number>(Date.now());
  const lastTrackedQuestionIdRef = useRef<string | null>(null);
  const answersRef = useRef(answers);
  const timeLeftRef = useRef(timeLeft);
  const flaggedRef = useRef(flaggedQuestions);
  const questionTimingsRef = useRef(questionTimings);
  const currentIndexRef = useRef(currentIndex);
  const examRef = useRef(exam);
  const draftUserIdRef = useRef<string>('');
  const [uploadAuthHeaders, setUploadAuthHeaders] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await storageGetItem(AUTH_TOKEN_KEY);
        if (!cancelled && token) {
          setUploadAuthHeaders({ Authorization: `Bearer ${token}` });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  answersRef.current = answers;
  timeLeftRef.current = timeLeft;
  flaggedRef.current = flaggedQuestions;
  questionTimingsRef.current = questionTimings;
  currentIndexRef.current = currentIndex;
  examRef.current = exam;
  hasStartedRef.current = hasStarted;

  const examInProgress = !!exam && hasStarted && !submittedRef.current && !isLoading && !examResult;

  const persistDraftNow = useCallback(async (opts?: {
    remainingSeconds?: number;
    answers?: Record<string, unknown>;
    flaggedQuestions?: number[];
    questionTimings?: Record<string, number>;
    currentQuestionIndex?: number;
  }) => {
    const liveExam = examRef.current;
    if (!liveExam || !id || submittedRef.current || submitInFlightRef.current || !hasStartedRef.current) return;
    const durationSeconds = Math.max(60, Math.round((Number(liveExam.duration) || 60) * 60));
    const remainingSeconds = Math.max(
      0,
      Number.isFinite(Number(opts?.remainingSeconds))
        ? Number(opts?.remainingSeconds)
        : timeLeftRef.current || 0,
    );
    const payload = {
      answers: normalizeMobileDraftAnswers(
        (opts?.answers as Record<string, unknown> | undefined) ??
          (answersRef.current as Record<string, unknown>) ??
          {},
      ),
      flaggedQuestions: Array.isArray(opts?.flaggedQuestions)
        ? opts.flaggedQuestions
        : Array.from(flaggedRef.current || []),
      questionTimings:
        opts?.questionTimings && typeof opts.questionTimings === 'object'
          ? opts.questionTimings
          : questionTimingsRef.current || {},
      currentQuestionIndex: Number.isFinite(Number(opts?.currentQuestionIndex))
        ? Math.max(0, Number(opts?.currentQuestionIndex))
        : currentIndexRef.current || 0,
      remainingSeconds,
      durationSeconds,
    };
    await writeMobileExamDraft(String(id), payload, draftUserIdRef.current);
    try {
      const token = await storageGetItem('authToken');
      await fetch(`${API_BASE_URL}/api/student/exams/${id}/attempt-draft`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      /* local backup kept */
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchExam();
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, [id]);

  useEffect(() => {
    if (!examInProgress || pendingForceSubmit) return;
    const interval = setInterval(() => {
      void persistDraftNow();
    }, 15000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void persistDraftNow();
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [examInProgress, pendingForceSubmit, persistDraftNow]);

  useEffect(() => {
    if (!examInProgress || pendingForceSubmit) return;
    const t = setTimeout(() => {
      void persistDraftNow();
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, flaggedQuestions, currentIndex, examInProgress, pendingForceSubmit, persistDraftNow]);

  useEffect(() => {
    if (!pendingForceSubmit || !exam || isLoading) return;
    setPendingForceSubmit(false);
    const t = setTimeout(() => {
      void submitExamRef.current();
    }, 600);
    return () => clearTimeout(t);
  }, [pendingForceSubmit, exam, isLoading]);

  const recordExitAttempt = useCallback(() => {
    if (submittedRef.current || submitInFlightRef.current || isSubmitting || !exam) return;
    setExitAttempts((prev) => Math.min(prev + 1, MAX_EXIT_ATTEMPTS));
    setShowExitWarning(true);
  }, [exam, isSubmitting]);

  usePreventRemove(examInProgress, () => {
    recordExitAttempt();
  });

  useEffect(() => {
    if (!showQuestionDropdown || !exam?.questions?.length) return;
    const targetPage = Math.floor(currentIndex / PALETTE_PAGE_SIZE);
    setPalettePage(targetPage);
    requestAnimationFrame(() => {
      paletteListRef.current?.scrollToOffset({
        offset: targetPage * screenWidth,
        animated: false,
      });
    });
  }, [showQuestionDropdown, currentIndex, exam?.questions?.length, screenWidth]);

  const scrollToPalettePage = useCallback(
    (page: number) => {
      setPalettePage(page);
      paletteListRef.current?.scrollToOffset({
        offset: page * screenWidth,
        animated: true,
      });
    },
    [screenWidth]
  );

  const palettePageIndexes = useMemo(() => {
    const total = exam?.questions?.length ?? 0;
    if (!total) return [];
    const pageCount = Math.ceil(total / PALETTE_PAGE_SIZE);
    return Array.from({ length: pageCount }, (_, index) => index);
  }, [exam?.questions?.length]);

  useEffect(() => {
    if (!examInProgress) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      recordExitAttempt();
      return true;
    });
    return () => handler.remove();
  }, [examInProgress, recordExitAttempt]);

  const recordCurrentQuestionDuration = useCallback(
    (baseTimings: Record<string, number> = questionTimings) => {
      if (!exam?.questions?.length) return baseTimings;
      const now = Date.now();
      const current = exam.questions[currentIndex];
      const currentId = answerKey(current) || null;
      if (!currentId) return baseTimings;

      if (!lastTrackedQuestionIdRef.current) {
        lastTrackedQuestionIdRef.current = currentId;
        questionEnterTimestampRef.current = now;
        return baseTimings;
      }

      const elapsedSec = Math.max(0, Math.round((now - questionEnterTimestampRef.current) / 1000));
      const trackedId = lastTrackedQuestionIdRef.current;
      let updatedTimings = baseTimings;
      if (elapsedSec > 0) {
        updatedTimings = {
          ...baseTimings,
          [trackedId]: (baseTimings[trackedId] || 0) + elapsedSec,
        };
        setQuestionTimings(updatedTimings);
      }
      lastTrackedQuestionIdRef.current = currentId;
      questionEnterTimestampRef.current = now;
      return updatedTimings;
    },
    [exam, currentIndex, questionTimings]
  );

  useEffect(() => {
    if (!exam?.questions?.length || examResult || !hasStarted) return;
    const current = exam.questions[currentIndex];
    const currentId = answerKey(current);
    if (!currentId) return;
    if (!lastTrackedQuestionIdRef.current) {
      lastTrackedQuestionIdRef.current = currentId;
      questionEnterTimestampRef.current = Date.now();
      return;
    }
    recordCurrentQuestionDuration();
  }, [exam, currentIndex, examResult, hasStarted, recordCurrentQuestionDuration]);

  const submitExam = useCallback(async () => {
    if (!exam || submittedRef.current || submitInFlightRef.current) return;
    submittedRef.current = true;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setIsGrading(true);
    setShowExitWarning(false);
    setShowQuestionDropdown(false);

    const latestAnswers = answersRef.current;
    const latestTimeLeft = timeLeftRef.current;
    const finalTimings = recordCurrentQuestionDuration();
    const timeTaken = Math.max(0, (Number(exam.duration) || 60) * 60 - latestTimeLeft);
    const localPayload = buildLocalExamResult(exam, latestAnswers, timeTaken, finalTimings);

    if (!localPayload.examId) {
      submittedRef.current = false;
      autoSubmitTriggeredRef.current = false;
      Alert.alert('Submit Failed', 'This exam is missing a valid id. Please reopen it from Exams.', [
        { text: 'Go to Dashboard', onPress: () => router.replace(dashboardPath) },
      ]);
      submitInFlightRef.current = false;
      setIsGrading(false);
      setIsSubmitting(false);
      return;
    }

    const attempts: Record<string, unknown>[] = [
      { ...localPayload },
      {
        examId: localPayload.examId,
        examTitle: localPayload.examTitle,
        timeTaken: localPayload.timeTaken,
        answers: localPayload.answers,
        questionTimings: localPayload.questionTimings,
        totalQuestions: localPayload.totalQuestions,
        correctAnswers: localPayload.correctAnswers,
        wrongAnswers: localPayload.wrongAnswers,
        unattempted: localPayload.unattempted,
        totalMarks: localPayload.totalMarks,
        obtainedMarks: localPayload.obtainedMarks,
        percentage: localPayload.percentage,
      },
      {
        examId: localPayload.examId,
        examTitle: localPayload.examTitle,
        timeTaken: localPayload.timeTaken,
        answers: localPayload.answers,
        questionTimings: localPayload.questionTimings,
      },
      {
        examId: localPayload.examId,
        answers: localPayload.answers,
        timeTaken: localPayload.timeTaken,
      },
    ];

    let lastError = 'Failed to save result';
    let savedServer: Record<string, unknown> | null = null;

    try {
      for (const body of attempts) {
        try {
          const { data, status, ok } = await postExamResult(body);
          if (ok) {
            savedServer = (data?.data || data || {}) as Record<string, unknown>;
            break;
          }
          lastError = extractSubmitErrorMessage(
            { response: { status, data } },
            'Failed to save result'
          );
          if (status === 401 || status === 403) break;
        } catch (err) {
          lastError = extractSubmitErrorMessage(err);
        }
      }

      if (savedServer) {
        await clearMobileExamDraft(String(exam._id || id), draftUserIdRef.current);
        setExamResult(
          mergeExamResult(
            exam,
            localPayload.answers,
            timeTaken,
            savedServer,
            localPayload.questionTimings
          )
        );
        return;
      }

      // Match web recovery: never strand the student after finishing an exam.
      submittedRef.current = false;
      autoSubmitTriggeredRef.current = false;
      Alert.alert(
        'Submit Failed',
        `${lastError}\n\nTry again, or view a local score now. Check Attempted Exams later if sync is still failing.`,
        [
          { text: 'Try Again', onPress: () => void submitExamRef.current() },
          {
            text: 'View Local Results',
            onPress: () => {
              submittedRef.current = true;
              void clearMobileExamDraft(String(exam._id || id), draftUserIdRef.current);
              setExamResult(
                mergeExamResult(
                  exam,
                  localPayload.answers,
                  timeTaken,
                  {
                    examId: localPayload.examId,
                    examTitle: localPayload.examTitle,
                    totalQuestions: localPayload.totalQuestions,
                    correctAnswers: localPayload.correctAnswers,
                    wrongAnswers: localPayload.wrongAnswers,
                    unattempted: localPayload.unattempted,
                    totalMarks: localPayload.totalMarks,
                    obtainedMarks: localPayload.obtainedMarks,
                    percentage: localPayload.percentage,
                    timeTaken: localPayload.timeTaken,
                    subjectWiseScore: localPayload.subjectWiseScore,
                    answers: localPayload.answers,
                    questionTimings: localPayload.questionTimings,
                  },
                  localPayload.questionTimings
                )
              );
            },
          },
          { text: 'Go to Dashboard', style: 'cancel', onPress: () => router.replace(dashboardPath) },
        ]
      );
    } catch (error: unknown) {
      const aborted =
        (error instanceof Error && error.name === 'AbortError') ||
        String((error as any)?.code || '').includes('ECONNABORTED') ||
        String((error as any)?.message || '').toLowerCase().includes('timeout');
      submittedRef.current = false;
      autoSubmitTriggeredRef.current = false;
      Alert.alert(
        aborted ? 'Grading is taking longer than usual' : 'Submit Failed',
        aborted
          ? 'Your result may appear under Attempted Exams shortly. You can try submitting again.'
          : extractSubmitErrorMessage(error),
        [
          { text: 'Try Again', onPress: () => void submitExamRef.current() },
          { text: 'Go to Dashboard', onPress: () => router.replace(dashboardPath) },
        ]
      );
    } finally {
      submitInFlightRef.current = false;
      setIsGrading(false);
      setIsSubmitting(false);
    }
  }, [exam, dashboardPath, router, recordCurrentQuestionDuration, id]);

  submitExamRef.current = submitExam;

  useEffect(() => {
    if (
      !examInProgress ||
      exitAttempts < MAX_EXIT_ATTEMPTS ||
      autoSubmitTriggeredRef.current ||
      submittedRef.current
    ) {
      return;
    }

    autoSubmitTriggeredRef.current = true;
    setShowExitWarning(false);
    setIsGrading(true);
    void submitExamRef.current();
  }, [exitAttempts, examInProgress]);

  useEffect(() => {
    if (!exam || !hasStarted || timeLeft <= 0 || submittedRef.current) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void submitExamRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, hasStarted, timeLeft]);

  useEffect(() => {
    if (!resumeNotice || pendingForceSubmit) return;
    const t = setTimeout(() => setResumeNotice(null), 4500);
    return () => clearTimeout(t);
  }, [resumeNotice, pendingForceSubmit]);

  useEffect(() => {
    questionScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentIndex]);

  const fetchExam = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exams/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Unavailable', err?.message || 'This exam is not available.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const data = await response.json();
      const examData = data.data || data;
      const rawQuestions = Array.isArray(examData.questions) ? examData.questions : [];
      if (!rawQuestions.length) {
        Alert.alert('Unavailable', 'No questions uploaded for this exam.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const questions = rawQuestions.map((q: any, index: number) => normalizeQuestion(q, index));
      const examId = normalizeMongoId(examData._id || examData.id || id);
      if (!examId) {
        Alert.alert('Unavailable', 'This exam is missing an id.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const fullSeconds = (Number(examData.duration) || 60) * 60;
      let userId = '';
      try {
        const userRaw = await storageGetItem('user');
        if (userRaw) {
          const u = JSON.parse(userRaw);
          userId = String(u?._id || u?.id || '');
        }
      } catch {
        /* ignore */
      }
      draftUserIdRef.current = userId;

      let serverDraft: MobileExamDraft | null = null;
      let draftMeta: {
        forceSubmit?: boolean;
        resumeLimitReached?: boolean;
        examEnded?: boolean;
        message?: string;
        resumeCount?: number;
        maxResumes?: number;
      } = {
        forceSubmit: Boolean(examData?.forceSubmitExam),
        examEnded: Boolean(examData?.forceSubmitExam),
        message: examData?.examWindowMessage || undefined,
      };
      try {
        const draftRes = await fetch(`${API_BASE_URL}/api/student/exams/${id}/attempt-draft`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (draftRes.ok) {
          const draftJson = await draftRes.json();
          draftMeta = {
            forceSubmit: Boolean(draftJson?.forceSubmit || examData?.forceSubmitExam),
            resumeLimitReached: Boolean(draftJson?.resumeLimitReached),
            examEnded: Boolean(draftJson?.examEnded || examData?.forceSubmitExam),
            message: draftJson?.message || examData?.examWindowMessage || undefined,
            resumeCount: Number(draftJson?.data?.resumeCount) || 0,
            maxResumes: Number(draftJson?.data?.maxResumes) || Number(draftJson?.maxResumes) || 5,
          };
          if (draftJson?.data) {
            serverDraft = {
              examId: String(draftJson.data.examId || id),
              answers: draftJson.data.answers || {},
              flaggedQuestions: Array.isArray(draftJson.data.flaggedQuestions)
                ? draftJson.data.flaggedQuestions
                : [],
              questionTimings: draftJson.data.questionTimings || {},
              currentQuestionIndex: Number(draftJson.data.currentQuestionIndex) || 0,
              remainingSeconds: Math.max(0, Number(draftJson.data.remainingSeconds) || 0),
              durationSeconds: Math.max(1, Number(draftJson.data.durationSeconds) || fullSeconds),
              lastSavedAt: String(draftJson.data.lastSavedAt || new Date().toISOString()),
            };
          }
        }
      } catch {
        /* continue with local */
      }

      const localDraft = await readMobileExamDraft(String(id), userId);
      const draft = pickMobileResumeDraft(serverDraft, localDraft);
      const mustForceSubmit = Boolean(draftMeta.forceSubmit && draft);

      const hydratedExam = { ...examData, _id: examId, questions };
      examRef.current = hydratedExam;
      setExam(hydratedExam);

      const restoredAnswers = draft
        ? normalizeMobileDraftAnswers(draft.answers as Record<string, unknown>)
        : {};
      const restoredFlags = Array.isArray(draft?.flaggedQuestions) ? draft.flaggedQuestions : [];
      const restoredIndex = Math.min(
        Math.max(0, questions.length - 1),
        Math.max(0, Number(draft?.currentQuestionIndex) || 0),
      );
      const resumeSeconds = Math.min(fullSeconds, Math.max(0, Number(draft?.remainingSeconds) || 0));
      const draftLooksStarted =
        Boolean(draft) &&
        (Object.keys(restoredAnswers).length > 0 ||
          restoredFlags.length > 0 ||
          restoredIndex > 0 ||
          (resumeSeconds > 0 && resumeSeconds < fullSeconds - 5));
      const skipInstructions = Boolean(mustForceSubmit || examData?.forceSubmitExam || draftLooksStarted);

      if (draft && skipInstructions) {
        const restoredTimings =
          draft.questionTimings && typeof draft.questionTimings === 'object'
            ? draft.questionTimings
            : {};

        answersRef.current = restoredAnswers;
        flaggedRef.current = new Set(restoredFlags);
        questionTimingsRef.current = restoredTimings;
        currentIndexRef.current = restoredIndex;
        timeLeftRef.current = resumeSeconds;

        setAnswers(restoredAnswers);
        setFlaggedQuestions(new Set(restoredFlags));
        setQuestionTimings(restoredTimings);
        setCurrentIndex(restoredIndex);
        setTimeLeft(resumeSeconds);
        setHasStarted(true);
        hasStartedRef.current = true;

        const answered = Object.keys(restoredAnswers).length;
        const mm = Math.floor(resumeSeconds / 60);
        const ss = resumeSeconds % 60;
        const resumeUsed = Math.max(0, Number(draftMeta.resumeCount) || 0);
        const resumeMax = Math.max(1, Number(draftMeta.maxResumes) || 5);

        if (mustForceSubmit) {
          setResumeNotice(
            draftMeta.message ||
              (draftMeta.examEnded
                ? 'Exam ended — submitting saved answers.'
                : `Resume limit (${resumeMax}) reached — submitting saved answers.`),
          );
          setPendingForceSubmit(true);
        } else {
          setResumeNotice(
            `Resumed (${resumeUsed}/${resumeMax}) — ${answered} answer(s) · ${mm}:${String(ss).padStart(2, '0')} left`,
          );
          void persistDraftNow({
            remainingSeconds: resumeSeconds,
            answers: restoredAnswers,
            flaggedQuestions: restoredFlags,
            questionTimings: restoredTimings,
            currentQuestionIndex: restoredIndex,
          });
        }
      } else if (examData?.forceSubmitExam) {
        setHasStarted(true);
        hasStartedRef.current = true;
        setResumeNotice(examData?.examWindowMessage || 'Exam window has ended.');
        timeLeftRef.current = 0;
        setTimeLeft(0);
      } else {
        setHasStarted(false);
        hasStartedRef.current = false;
        timeLeftRef.current = fullSeconds;
        setTimeLeft(fullSeconds);
      }

    } catch {
      Alert.alert('Error', 'Failed to load exam.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = exam?.questions[currentIndex];

  const handleSelect = (questionId: string, value: any, multi = false) => {
    if (multi) {
      setAnswers((prev) => {
        const existing = Array.isArray(prev[questionId]) ? [...prev[questionId]] : [];
        const idx = existing.indexOf(value);
        if (idx >= 0) existing.splice(idx, 1);
        else existing.push(value);
        let next: Record<string, any>;
        if (existing.length === 0) {
          next = { ...prev };
          delete next[questionId];
        } else {
          next = { ...prev, [questionId]: existing };
        }
        answersRef.current = next;
        return next;
      });
    } else {
      setAnswers((prev) => {
        let next: Record<string, any>;
        if (prev[questionId] === value) {
          next = { ...prev };
          delete next[questionId];
        } else {
          next = { ...prev, [questionId]: value };
        }
        answersRef.current = next;
        return next;
      });
    }
  };

  const handleClearCurrentAnswer = () => {
    if (!currentQuestion) return;
    const qid = answerKey(currentQuestion);
    if (!qid) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };

  const toggleFlagQuestion = (index: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const confirmSubmit = () => {
    Alert.alert('Submit Exam', 'Are you sure you want to submit? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: () => void submitExam() },
    ]);
  };

  const handleBeginExam = useCallback(() => {
    const liveExam = examRef.current;
    const fullSeconds = Math.max(
      timeLeftRef.current || 0,
      Math.round((Number(liveExam?.duration) || 60) * 60),
    );
    if (timeLeftRef.current <= 0) {
      timeLeftRef.current = fullSeconds;
      setTimeLeft(fullSeconds);
    }
    lastTrackedQuestionIdRef.current = null;
    questionEnterTimestampRef.current = Date.now();
    hasStartedRef.current = true;
    setHasStarted(true);
    void persistDraftNow({
      remainingSeconds: timeLeftRef.current || fullSeconds,
      answers: answersRef.current || {},
      flaggedQuestions: Array.from(flaggedRef.current || []),
      questionTimings: questionTimingsRef.current || {},
      currentQuestionIndex: currentIndexRef.current || 0,
    });
  }, [persistDraftNow]);

  const handleBackToDashboard = () => {
    router.replace(dashboardPath);
  };

  const handleRetakeExam = () => {
    if (!exam) return;
    const maxA = Math.max(1, Number(exam.maxAttempts) || 1);
    const used = Number(examResult?.attemptNumber) >= 1 ? Number(examResult?.attemptNumber) : 1;
    if (used >= maxA) {
      Alert.alert('No Attempts Left', 'You have used all attempts for this exam.');
      return;
    }
    if (exam.endDate && new Date() > new Date(exam.endDate)) {
      Alert.alert('Exam Ended', 'This exam window has ended. Retakes are not available.');
      return;
    }
    submittedRef.current = false;
    autoSubmitTriggeredRef.current = false;
    submitInFlightRef.current = false;
    setExamResult(null);
    setIsGrading(false);
    setHasStarted(false);
    hasStartedRef.current = false;
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft((Number(exam.duration) || 60) * 60);
    setExitAttempts(0);
    setShowExitWarning(false);
    setPalettePage(0);
    setShowQuestionDropdown(false);
    setFlaggedQuestions(new Set());
    setQuestionTimings({});
    setResumeNotice(null);
    lastTrackedQuestionIdRef.current = null;
    questionEnterTimestampRef.current = Date.now();
    void clearMobileExamDraft(String(id), draftUserIdRef.current);
  };

  const attemptsRemaining = exam
    ? Math.max(
        0,
        Math.max(1, Number(exam.maxAttempts) || 1) -
          (Number(examResult?.attemptNumber) >= 1 ? Number(examResult?.attemptNumber) : 1)
      )
    : 0;

  if (isGrading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.gradingTitle}>Grading your exam...</Text>
          <Text style={styles.gradingHint}>This usually takes a few seconds</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (examResult && exam) {
    return (
      <ExamResultsView
        result={examResult}
        examTitle={exam.title}
        onBack={handleBackToDashboard}
        onRetake={handleRetakeExam}
        attemptsRemaining={attemptsRemaining}
      />
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Loading exam...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>No exam data</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasStarted) {
    return (
      <>
        <Stack.Screen options={{ gestureEnabled: true, headerShown: false }} />
        <ExamInstructionsScreen
          exam={exam}
          questionCount={exam.questions.length || exam.totalQuestions || 0}
          onStart={handleBeginExam}
          onBack={() => router.replace(dashboardPath)}
        />
      </>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>No exam data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qText = currentQuestion.questionText || currentQuestion.question || '';
  const arDisplay = resolveAssertionReasonDisplay({
    assertionText: currentQuestion.assertionText,
    reasonText: currentQuestion.reasonText,
    questionText: qText,
  });
  const qType = currentQuestion.questionType || 'mcq';
  const options = currentQuestion.options || [];
  const maxExitReached = exitAttempts >= MAX_EXIT_ATTEMPTS;
  const currentQid = answerKey(currentQuestion);
  const hasCurrentAnswer = isAnswerProvided(currentQuestion, answers[currentQid]);
  const questionImageUri = currentQuestion.questionImage
    ? currentQuestion.questionImage.startsWith('http')
      ? currentQuestion.questionImage
      : `${API_BASE_URL}${currentQuestion.questionImage}`
    : null;
  const sharedMatterDisplay = (() => {
    const optsBlob = (options || [])
      .map((o: any) => (typeof o === 'string' ? o : o?.text || ''))
      .join('\n');
    const isAr =
      currentQuestion.questionType === 'assertion_reason' ||
      Boolean(currentQuestion.assertionText || currentQuestion.reasonText) ||
      (/\bA\s*[:：]/.test(qText) && /\bR\s*[:：]/.test(qText)) ||
      (/Both A and R are true/i.test(optsBlob) && /correct explanation of A/i.test(optsBlob));
    if (!isAr) {
      return String(currentQuestion.sharedMatterText || currentQuestion.passageText || '').trim();
    }
    const raw = String(currentQuestion.sharedMatterText || '').trim();
    return looksLikeArDirectionsText(raw) ? raw : DEFAULT_ASSERTION_REASON_DIRECTIONS;
  })();
  const answeredCount = exam.questions.filter((q) =>
    isAnswerProvided(q, answers[answerKey(q)])
  ).length;
  const paletteGap = 8;
  const palettePadding = 16;
  const paletteItemSize = Math.min(
    48,
    Math.floor(
      (screenWidth - palettePadding * 2 - paletteGap * (PALETTE_COLUMNS - 1)) / PALETTE_COLUMNS
    )
  );
  const palettePageCount = palettePageIndexes.length;
  const paletteRowCount =
    palettePageCount > 1
      ? Math.ceil(PALETTE_PAGE_SIZE / PALETTE_COLUMNS)
      : Math.ceil(exam.questions.length / PALETTE_COLUMNS);
  const paletteGridHeight =
    paletteRowCount * paletteItemSize + Math.max(0, paletteRowCount - 1) * paletteGap;

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    setShowQuestionDropdown(false);
  };

  const renderPaletteItem = (q: Question, index: number) => {
    const answered = isAnswerProvided(q, answers[answerKey(q)]);
    const flagged = flaggedQuestions.has(index);
    const isCurrent = index === currentIndex;
    return (
      <TouchableOpacity
        key={answerKey(q) || `q-${index}`}
        style={[
          styles.paletteItem,
          { width: paletteItemSize, height: paletteItemSize },
          isCurrent && styles.paletteItemCurrent,
          !isCurrent && answered && styles.paletteItemAnswered,
          !isCurrent && flagged && styles.paletteItemFlagged,
          !isCurrent && flagged && answered && styles.paletteItemFlaggedAnswered,
        ]}
        onPress={() => goToQuestion(index)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.paletteItemText,
            isCurrent && styles.paletteItemTextCurrent,
            !isCurrent && answered && styles.paletteItemTextAnswered,
            !isCurrent && flagged && styles.paletteItemTextFlagged,
          ]}
        >
          {index + 1}
        </Text>
        {flagged ? (
          <View style={styles.paletteFlagDot}>
            <Ionicons name="bookmark" size={8} color="#92400e" />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.examTitle} numberOfLines={1}>
                {exam.title}
              </Text>
              <Text style={styles.headerSub}>
                Q {currentIndex + 1}/{exam.questions.length}
                {'  ·  '}
                {answeredCount} answered
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View
                style={[
                  styles.timerPill,
                  timeLeft < 300 ? styles.timerPillUrgent : styles.timerPillOk,
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={timeLeft < 300 ? '#b91c1c' : '#1d4ed8'}
                />
                <Text
                  style={[
                    styles.timerPillText,
                    timeLeft < 300 ? styles.timerPillTextUrgent : styles.timerPillTextOk,
                  ]}
                >
                  {formatTime(timeLeft)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.headerSubmitBtn}
                onPress={confirmSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.headerSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
          {resumeNotice ? (
            <TouchableOpacity
              style={styles.resumeNotice}
              onPress={() => setResumeNotice(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.resumeNoticeText} numberOfLines={2}>
                {resumeNotice}
              </Text>
              <Text style={styles.resumeDismiss}>OK</Text>
            </TouchableOpacity>
          ) : null}
          {exitAttempts > 0 ? (
            <Text
              style={[
                styles.exitAttemptsText,
                maxExitReached ? styles.exitAttemptsDanger : null,
              ]}
            >
              Exit attempts {exitAttempts}/{MAX_EXIT_ATTEMPTS}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.allQuestionsBtn}
            onPress={() => setShowQuestionDropdown(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="grid-outline" size={16} color="#4f46e5" />
            <Text style={styles.allQuestionsLabel}>All questions</Text>
            <Text style={styles.allQuestionsMeta}>
              {answeredCount}/{exam.questions.length}
            </Text>
            {hasCurrentAnswer ? (
              <View style={[styles.statusPill, styles.statusPillAnswered]}>
                <Text style={styles.statusPillTextAnswered}>Answered</Text>
              </View>
            ) : null}
            {flaggedQuestions.has(currentIndex) ? (
              <View style={[styles.statusPill, styles.statusPillReview]}>
                <Text style={styles.statusPillTextReview}>Review</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={questionScrollRef}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.questionCard}>
            <View style={styles.questionCardHeader}>
              <View style={styles.questionBadgeRow}>
                <View style={styles.qNumberChip}>
                  <Text style={styles.qNumberChipText}>Q{currentIndex + 1}</Text>
                </View>
                {currentQuestion.subject ? (
                  <View
                    style={[
                      styles.subjectBadge,
                      { backgroundColor: subjectBadgeColors(currentQuestion.subject).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subjectBadgeText,
                        { color: subjectBadgeColors(currentQuestion.subject).text },
                      ]}
                    >
                      {resolveAttemptSectionHeading(currentQuestion) || currentQuestion.subject}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.marksBadge}>
                  <Text style={styles.marksBadgeText}>{currentQuestion.marks || 0} marks</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.reviewBtn,
                  flaggedQuestions.has(currentIndex) && styles.reviewBtnActive,
                ]}
                onPress={() => toggleFlagQuestion(currentIndex)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={flaggedQuestions.has(currentIndex) ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={flaggedQuestions.has(currentIndex) ? '#b45309' : '#64748b'}
                />
                <Text
                  style={[
                    styles.reviewBtnText,
                    flaggedQuestions.has(currentIndex) && styles.reviewBtnTextActive,
                  ]}
                >
                  {flaggedQuestions.has(currentIndex) ? 'Marked for review' : 'Mark for review'}
                </Text>
              </TouchableOpacity>
            </View>

            {sharedMatterDisplay ? (
              <View style={styles.sharedMatterCard}>
                <Text style={styles.sharedMatterLabel}>
                  {currentQuestion.questionType === 'assertion_reason' ||
                  currentQuestion.sharedMatterKind === 'assertion_reason'
                    ? 'Assertion–Reason directions'
                    : currentQuestion.sharedMatterKind === 'match_following'
                      ? 'Match the Following'
                      : currentQuestion.sharedMatterKind === 'case'
                        ? 'Case / Passage'
                        : 'Shared matter'}
                </Text>
                <Text style={styles.sharedMatterText}>
                  {normalizeExamText(sharedMatterDisplay, currentQuestion.subject)}
                </Text>
              </View>
            ) : null}

            {(arDisplay.assertion || arDisplay.reason) ? (
              <View style={styles.arBlock}>
                {arDisplay.assertion ? (
                  <Text style={styles.questionText}>
                    <Text style={styles.arLabel}>A: </Text>
                    {normalizeExamText(arDisplay.assertion, currentQuestion.subject)}
                  </Text>
                ) : null}
                {arDisplay.reason ? (
                  <Text style={styles.questionText}>
                    <Text style={styles.arLabel}>R: </Text>
                    {normalizeExamText(arDisplay.reason, currentQuestion.subject)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {((Array.isArray(currentQuestion.matchColumnI) && currentQuestion.matchColumnI.length > 0) ||
              (Array.isArray(currentQuestion.matchColumnII) && currentQuestion.matchColumnII.length > 0)) &&
            !questionImageUri ? (
              <View style={styles.matchTable}>
                <View style={[styles.matchTableRow, styles.matchTableHeader]}>
                  <View style={[styles.matchTableCell, styles.matchTableCellBorder]}>
                    <Text style={styles.matchTableHeaderText}>Column I</Text>
                  </View>
                  <View style={styles.matchTableCell}>
                    <Text style={styles.matchTableHeaderText}>Column II</Text>
                  </View>
                </View>
                {Array.from(
                  {
                    length: Math.max(
                      (currentQuestion.matchColumnI || []).length,
                      (currentQuestion.matchColumnII || []).length,
                    ),
                  },
                  (_, i) => {
                    const a = (currentQuestion.matchColumnI || [])[i];
                    const b = (currentQuestion.matchColumnII || [])[i];
                    const leftKey = String(a?.key || String.fromCharCode(65 + i)).replace(/\.$/, '');
                    const rightKey = String(b?.key || String(i + 1)).replace(/\.$/, '');
                    return (
                      <View
                        key={i}
                        style={[
                          styles.matchTableRow,
                          i ===
                          Math.max(
                            (currentQuestion.matchColumnI || []).length,
                            (currentQuestion.matchColumnII || []).length,
                          ) -
                            1
                            ? null
                            : styles.matchTableRowBorder,
                        ]}
                      >
                        <View style={[styles.matchTableCell, styles.matchTableCellBorder]}>
                          {a ? (
                            <Text style={styles.matchColumnItem}>
                              <Text style={styles.matchKey}>{leftKey}. </Text>
                              {normalizeExamText(a.text, currentQuestion.subject)}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.matchTableCell}>
                          {b ? (
                            <Text style={styles.matchColumnItem}>
                              <Text style={styles.matchKey}>{rightKey}. </Text>
                              {normalizeExamText(b.text, currentQuestion.subject)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  },
                )}
              </View>
            ) : null}

            {questionImageUri ? (
              <Image
                source={{
                  uri: questionImageUri,
                  ...(uploadAuthHeaders ? { headers: uploadAuthHeaders } : {}),
                }}
                style={styles.questionImage}
                contentFit="contain"
                transition={150}
              />
            ) : null}

            {arDisplay.showQuestionText && arDisplay.questionText ? (
            <View style={styles.questionTextRow}>
              <Text style={styles.qPrefix}>Q{currentIndex + 1}.</Text>
              <ExamMathText
                text={normalizeExamText(arDisplay.questionText, currentQuestion.subject)}
                style={styles.questionText}
              />
            </View>
            ) : null}

            {qType === 'integer' ? (
              <TextInput
                style={styles.integerInput}
                keyboardType="numeric"
                placeholder="Enter your answer"
                placeholderTextColor="#9ca3af"
                value={String(answers[currentQid] ?? '')}
                onChangeText={(t) => {
                  if (!currentQid) return;
                  if (!t.trim()) {
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[currentQid];
                      return next;
                    });
                    return;
                  }
                  handleSelect(currentQid, t);
                }}
              />
            ) : (
              options.map((opt, index) => {
                const label = optionLabel(opt, index);
                const displayLabel = normalizeExamText(label, currentQuestion.subject);
                const selected =
                  qType === 'multiple'
                    ? Array.isArray(answers[currentQid]) && answers[currentQid].includes(label)
                    : answers[currentQid] === label;
                return (
                  <TouchableOpacity
                    key={`${currentQid || 'q'}-${index}`}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => currentQid && handleSelect(currentQid, label, qType === 'multiple')}
                    activeOpacity={0.7}
                  >
                    <ExamMathText
                      text={displayLabel}
                      style={[styles.optionText, selected && styles.optionTextSelected]}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        <GlassPanel style={styles.footer} radius={0} bordered={false}>
          <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.navBtn, styles.prevBtn, currentIndex === 0 && styles.navBtnDisabled]}
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, styles.clearNavBtn, !hasCurrentAnswer && styles.navBtnDisabled]}
            disabled={!hasCurrentAnswer}
            onPress={handleClearCurrentAnswer}
          >
            <Text style={[styles.clearNavBtnText, !hasCurrentAnswer && styles.navBtnTextDisabled]}>
              Clear
            </Text>
          </TouchableOpacity>

          {currentIndex >= exam.questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, styles.submitNavBtn]}
              onPress={confirmSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitNavBtnText}>Submit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, styles.nextBtn]}
              onPress={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          )}
          </View>
        </GlassPanel>
      </SafeAreaView>

      <Modal
        visible={showQuestionDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuestionDropdown(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setShowQuestionDropdown(false)}>
          <Pressable style={styles.dropdownSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownSheetTitle}>All questions</Text>
              <TouchableOpacity onPress={() => setShowQuestionDropdown(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.dropdownSheetSubtitle}>
              {answeredCount} of {exam.questions.length} answered · tap a number to jump
            </Text>

            {palettePageCount > 1 ? (
              <View style={styles.palettePager}>
                {palettePageIndexes.map((pageIndex) => {
                  const start = pageIndex * PALETTE_PAGE_SIZE + 1;
                  const end = Math.min((pageIndex + 1) * PALETTE_PAGE_SIZE, exam.questions.length);
                  const active = palettePage === pageIndex;
                  return (
                    <TouchableOpacity
                      key={`palette-page-${pageIndex}`}
                      style={[styles.palettePagerBtn, active && styles.palettePagerBtnActive]}
                      onPress={() => scrollToPalettePage(pageIndex)}
                    >
                      <Text style={[styles.palettePagerText, active && styles.palettePagerTextActive]}>
                        Q{start}–{end}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.paletteSwipeHint}>Swipe →</Text>
              </View>
            ) : null}

            <FlatList
              ref={paletteListRef}
              data={palettePageIndexes}
              horizontal
              pagingEnabled
              scrollEnabled={palettePageCount > 1}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(pageIndex) => `dropdown-palette-page-${pageIndex}`}
              style={{ height: paletteGridHeight }}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const nextPage = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                if (nextPage >= 0 && nextPage < palettePageCount) {
                  setPalettePage(nextPage);
                }
              }}
              renderItem={({ item: pageIndex }) => {
                const startIndex = pageIndex * PALETTE_PAGE_SIZE;
                const pageQuestions = exam.questions.slice(
                  startIndex,
                  startIndex + PALETTE_PAGE_SIZE
                );
                return (
                  <View style={[styles.palettePage, { width: screenWidth }]}>
                    <View style={[styles.paletteGrid, { gap: paletteGap, minHeight: paletteGridHeight }]}>
                      {pageQuestions.map((q, offset) => renderPaletteItem(q, startIndex + offset))}
                    </View>
                  </View>
                );
              }}
            />

            <View style={styles.dropdownLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotCurrent]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotAnswered]} />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotFlagged]} />
                <Text style={styles.legendText}>Review</Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showExitWarning} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="warning" size={22} color="#dc2626" />
              <Text style={styles.modalTitle}>Warning: Exit Attempt Detected</Text>
            </View>

            <View style={styles.modalAlertBox}>
              <Text style={styles.modalAttemptText}>
                Attempt {exitAttempts} of {MAX_EXIT_ATTEMPTS}
              </Text>
              <Text style={styles.modalAlertBody}>
                {maxExitReached
                  ? 'Maximum exit attempts reached. Your exam will be auto-submitted.'
                  : `You have ${MAX_EXIT_ATTEMPTS - exitAttempts} attempt(s) remaining before auto-submission.`}
              </Text>
            </View>

            <Text style={styles.modalHint}>
              Please stay on the exam screen. Leaving the exam multiple times will result in automatic
              submission.
            </Text>

            {maxExitReached ? (
              <View style={styles.autoSubmitBox}>
                <ActivityIndicator color="#dc2626" />
                <Text style={styles.autoSubmitText}>
                  {isGrading || isSubmitting
                    ? 'Submitting your exam...'
                    : 'Preparing auto-submit...'}
                </Text>
                {!isGrading && !isSubmitting ? (
                  <TouchableOpacity
                    style={styles.forceSubmitBtn}
                    onPress={() => {
                      autoSubmitTriggeredRef.current = true;
                      setShowExitWarning(false);
                      void submitExamRef.current();
                    }}
                  >
                    <Text style={styles.forceSubmitBtnText}>Submit now</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => setShowExitWarning(false)}
              >
                <Text style={styles.continueBtnText}>Continue Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 16 },
  gradingTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#111827' },
  gradingHint: { marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  examTitle: { fontSize: 16, fontWeight: '800', color: '#111827', lineHeight: 20 },
  headerSub: { marginTop: 3, fontSize: 12, fontWeight: '600', color: '#64748b' },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerPillOk: { backgroundColor: '#dbeafe' },
  timerPillUrgent: { backgroundColor: '#fee2e2' },
  timerPillText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerPillTextOk: { color: '#1d4ed8' },
  timerPillTextUrgent: { color: '#b91c1c' },
  headerSubmitBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerSubmitText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  resumeNotice: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeNoticeText: { flex: 1, fontSize: 12, color: '#065f46', fontWeight: '600', lineHeight: 16 },
  resumeDismiss: { fontSize: 12, color: '#047857', fontWeight: '700' },
  allQuestionsBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  allQuestionsLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#312e81' },
  allQuestionsMeta: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  qNumberChip: {
    backgroundColor: '#fff7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qNumberChipText: { fontSize: 11, fontWeight: '800', color: '#c2410c' },
  progressMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMetaText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  progressTrack: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 999 },
  exitAttemptsText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#ca8a04',
    textAlign: 'center',
  },
  exitAttemptsDanger: { color: '#dc2626' },
  body: { flex: 1, backgroundColor: 'transparent' },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    flexGrow: 1,
  },
  navPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  navPanelTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navPanelTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  navPanelMeta: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  questionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  questionDropdownLeft: { flex: 1, minWidth: 0 },
  questionDropdownLabel: { fontSize: 11, fontWeight: '600', color: '#5B6779', marginBottom: 2 },
  questionDropdownValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  questionDropdownRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillAnswered: { backgroundColor: '#dcfce7' },
  statusPillTextAnswered: { fontSize: 10, fontWeight: '700', color: '#166534' },
  statusPillReview: { backgroundColor: '#fef3c7' },
  statusPillTextReview: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeadingBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionHeadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  sharedMatterCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sharedMatterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sharedMatterText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  arBlock: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  arLabel: {
    fontWeight: '800',
    color: '#5b21b6',
  },
  matchTable: {
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  matchTableHeader: {
    backgroundColor: '#e2e8f0',
  },
  matchTableHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  matchTableRow: {
    flexDirection: 'row',
  },
  matchTableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  matchTableCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  matchTableCellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  matchKey: {
    fontWeight: '700',
    color: '#0f172a',
  },
  matchColumnItem: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
  },
  questionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
  },
  subjectBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subjectBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  marksBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  marksBadgeText: { fontSize: 11, fontWeight: '700', color: '#4b5563' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reviewBtnActive: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  reviewBtnText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  reviewBtnTextActive: { color: '#b45309' },
  questionTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  qPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 24,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  optionSelected: { borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  optionText: { fontSize: 16, color: '#111827' },
  optionTextSelected: { color: '#1d4ed8', fontWeight: '700' },
  integerInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#111827',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  // Row layout lives on an inner view because GlassPanel wraps its children.
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  prevBtn: {},
  nextBtn: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  clearNavBtn: { flexGrow: 0, flexShrink: 0, minWidth: 72 },
  submitNavBtn: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  navBtnDisabled: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  navBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearNavBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  submitNavBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  navBtnTextDisabled: { color: '#9ca3af' },
  palettePager: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  palettePagerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
  },
  palettePagerBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  palettePagerText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  palettePagerTextActive: { color: '#fff' },
  paletteSwipeHint: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginLeft: 'auto' },
  palettePage: {
    paddingHorizontal: 16,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paletteItem: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  paletteItemCurrent: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
    transform: [{ scale: 1.05 }],
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  paletteItemAnswered: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  paletteItemFlagged: {
    backgroundColor: '#fef9c3',
    borderColor: '#facc15',
  },
  paletteItemFlaggedAnswered: {
    backgroundColor: '#fde68a',
    borderColor: '#f59e0b',
  },
  paletteItemText: { fontSize: 13, fontWeight: '700', color: '#4b5563' },
  paletteItemTextCurrent: { color: '#fff' },
  paletteItemTextAnswered: { color: '#166534' },
  paletteItemTextFlagged: { color: '#92400e' },
  paletteFlagDot: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  dropdownSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  dropdownSheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  dropdownSheetSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
  dropdownLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendDotCurrent: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  legendDotAnswered: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  legendDotFlagged: { backgroundColor: '#fef9c3', borderColor: '#facc15' },
  legendText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fca5a5',
    padding: 20,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#dc2626' },
  modalAlertBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  modalAttemptText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalAlertBody: { fontSize: 13, color: '#dc2626', textAlign: 'center', lineHeight: 20 },
  modalHint: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 16 },
  continueBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  autoSubmitBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  autoSubmitText: { fontSize: 14, fontWeight: '700', color: '#b91c1c', textAlign: 'center' },
  forceSubmitBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ea580c',
  },
  forceSubmitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
