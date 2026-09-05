import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useAnimatedProps } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import ChipNav from '../../../src/components/student/ChipNav';
import StudentFilterDropdown from '../../../src/components/student/StudentFilterDropdown';
import StudentExamPreviewCard from '../../../src/components/student/StudentExamPreviewCard';
import { EXAM_CARD_GRADIENT_SCHEMES } from '../../../src/lib/student-exam-display';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import { AnimatedStatInput, useCountUp } from '../../../src/hooks/useCountUp';
import {
  STUDENT,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';
import { GLASS_ROW, GLASS_VIOLET } from '../../../src/theme/glass';
import GlassPanel from '../../../src/components/ui/GlassPanel';
import {
  examMatchesStudentAssignedClass,
  getExamClassLabelsForStudent,
  normalizeClassNumber,
} from '../../../src/lib/exam-classes';
import { isIndividualAccount } from '../../../src/lib/individual-signup';
import { dedupeStudentExamResults } from '../../../src/lib/dedupe-exam-results';
import { readMobileExamDraft } from '../../../src/lib/exam-attempt-draft';
import ExamResultsView from '../../../src/components/student/ExamResultsView';
import RankingsTab from './RankingsTab';
import OmrResultsView from './OmrResultsView';
import DonutChart from '../../../src/components/ui/charts/DonutChart';
import {
  ExamAnalysisResult,
  buildQuestionDistributionSegments,
  formatAttemptHistoryLabel,
  formatReviewResultForAnalysis,
  getDisplayPercentage,
  getExamResultRowId,
  getMarksPercentage,
  normalizeExamResultFromApi,
} from '../../../src/lib/exam-analysis-helpers';
import { useCurriculumCascade } from '../../../src/hooks/useCurriculumCascade';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  b2cPastPractice?: boolean;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxAttempts?: number;
  assignedClasses?: string[] | string;
  classNumber?: string;
  subjects?: string[];
  subject?: string;
  questions?: any[];
  hasInProgressDraft?: boolean;
  canResumeExam?: boolean;
  forceSubmitDraft?: boolean;
  resumeCount?: number;
  maxResumes?: number;
  hideAvailabilityDates?: boolean;
}

function removeInternalAccountLabels(value: unknown): string {
  return String(value || '')
    .replace(/\bB2C\b\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface ExamResult {
  examId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeTaken: number;
}

type ExamsViewProps = {
  dark?: boolean;
  initialTab?: 'available' | 'attempted' | 'ranking' | 'upcoming' | 'omr';
  focusExamId?: string | null;
  onFocusExamHandled?: () => void;
  openGenerator?: boolean;
};

const ATTEMPTED_CARD_SCHEMES = EXAM_CARD_GRADIENT_SCHEMES.map((scheme) => ({
  accent: scheme.gradient[0],
  typeBadgeBg: `${scheme.gradient[0]}22`,
  typeBadgeText: scheme.gradient[0],
}));

function CountUpText({
  target,
  suffix = '',
  prefix = '',
  style,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  style?: object;
}) {
  const value = useCountUp(target, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(value.value)}${suffix}`,
  }));

  return (
    <AnimatedStatInput
      animatedProps={animatedProps as never}
      editable={false}
      style={style}
      underlineColorAndroid="transparent"
    />
  );
}

const EXAMS_TABLET_MIN_WIDTH = 768;
const EXAMS_WIDE_MIN_WIDTH = 1024;
const EXAMS_GRID_GAP = 12;
/** Max width for exam cards on tablet+ — header/filters stay full width. */
const EXAMS_CARD_MAX_WIDTH = 480;

function getExamGridLayout(screenWidth: number, itemCount: number) {
  const isTablet = screenWidth >= EXAMS_TABLET_MIN_WIDTH;
  const maxCols =
    screenWidth >= EXAMS_WIDE_MIN_WIDTH ? 3 : isTablet ? 2 : 1;
  const columns = itemCount <= 1 ? 1 : Math.min(maxCols, itemCount);
  const listWidth = screenWidth - 24;

  if (!isTablet) {
    return { columns: 1, cardWidth: undefined as number | undefined, isGrid: false };
  }

  const rawCardWidth =
    columns > 1
      ? (listWidth - EXAMS_GRID_GAP * (columns - 1)) / columns
      : listWidth;
  const cardWidth = Math.min(rawCardWidth, EXAMS_CARD_MAX_WIDTH);

  return { columns, cardWidth, isGrid: columns > 1 };
}

export default function ExamsView({
  initialTab = 'available',
  focusExamId,
  onFocusExamHandled,
  openGenerator = false,
}: ExamsViewProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= EXAMS_TABLET_MIN_WIDTH;
  const [activeTab, setActiveTab] = useState<'available' | 'attempted' | 'ranking' | 'upcoming' | 'omr'>(initialTab);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [selectedAttemptByExam, setSelectedAttemptByExam] = useState<Record<string, string>>({});
  const [attemptPickerExamId, setAttemptPickerExamId] = useState<string | null>(null);
  const [showExamResults, setShowExamResults] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState<{
    exam: Exam;
    result: ExamAnalysisResult;
  } | null>(null);
  const [loadingExamResults, setLoadingExamResults] = useState(false);
  const [highlightedExamId, setHighlightedExamId] = useState<string | null>(null);
  const [showGenerateExam, setShowGenerateExam] = useState(false);
  const [generateBoard, setGenerateBoard] = useState('CBSE');
  const [generateSubject, setGenerateSubject] = useState('');
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateQuestionCount, setGenerateQuestionCount] = useState('10');
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [showAllAvailableExams, setShowAllAvailableExams] = useState(false);
  const handledFocusExamIdRef = useRef<string | null>(null);

  const studentClassNumber = normalizeClassNumber(user?.classNumber);
  const isB2cStudent = isIndividualAccount(user);
  const examGeneratorCascade = useCurriculumCascade(
    studentClassNumber ? `Class ${studentClassNumber}` : undefined,
    generateSubject || undefined,
    generateTopic || undefined,
    generateBoard,
  );

  const generatePersonalExam = async () => {
    try {
      setIsGeneratingExam(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exams/generate-personal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: generateBoard, subject: generateSubject, topic: generateTopic, questionCount: Number(generateQuestionCount), classNumber: studentClassNumber }),
      });
      const json = await response.json();
      if (!response.ok || !json?.data?.examId) throw new Error(json?.message || 'Could not generate exam');
      setShowGenerateExam(false);
      router.push(`/exam/${json.data.examId}`);
    } catch (error) {
      Alert.alert('Could not generate exam', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsGeneratingExam(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchExams();
    fetchResults();
    fetchRankings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchExams();
      void fetchResults();
    }, []),
  );

  useEffect(() => {
    if (isB2cStudent && activeTab === 'omr') setActiveTab('available');
  }, [isB2cStudent, activeTab]);

  useEffect(() => {
    if (openGenerator && isB2cStudent) setShowGenerateExam(true);
  }, [openGenerator, isB2cStudent]);

  const fetchUser = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && token !== 'null' && token !== 'undefined') {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/api/student/exams`, {
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const examsList = Array.isArray(data) ? data : (data.data || data.exams || []);
        const userRaw = await storageGetItem('user');
        let userId: string | null = null;
        try {
          const parsed = userRaw ? JSON.parse(userRaw) : null;
          userId = parsed?._id || parsed?.id || null;
        } catch {
          userId = null;
        }
        const enriched = await Promise.all(
          (Array.isArray(examsList) ? examsList : []).map(async (rawExam: Exam) => {
            const exam = {
              ...rawExam,
              title: removeInternalAccountLabels(rawExam.title) || 'Exam',
              description: removeInternalAccountLabels(rawExam.description),
            };
            if (exam?.hasInProgressDraft) return exam;
            const local = await readMobileExamDraft(String(exam._id), userId);
            return local ? { ...exam, hasInProgressDraft: true } : exam;
          }),
        );
        setExams(enriched);
      } else {
        console.error('Failed to fetch exams:', response.status);
        setExams([]);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rows = data.data || data || [];
        setResults(Array.isArray(rows) ? rows.map(normalizeExamResultFromApi) : []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setResultsLoaded(true);
    }
  };

  const fetchRankings = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/rankings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRankings(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    }
  };

  const getExamIdFromResult = useCallback((result: any): string | null => {
    if (!result || !result.examId) return null;
    if (typeof result.examId === 'object' && result.examId._id) {
      return result.examId._id.toString();
    }
    return result.examId.toString();
  }, []);

  const getMaxAttemptsForExam = (exam: Exam): number =>
    Math.max(1, Number(exam.maxAttempts) || 1);

  const getExamSubjects = (exam: Exam): string[] => {
    const qSubjects = Array.isArray(exam.questions)
      ? exam.questions
          .map((q) => String(q?.subject || '').trim().toLowerCase())
          .filter(Boolean)
      : [];
    const merged = [
      ...qSubjects,
      ...(Array.isArray(exam.subjects) ? exam.subjects : []),
      exam.subject,
    ]
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(merged));
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'upcoming', color: '#fbbf24', bg: '#fef3c7' };
    if (exam.b2cPastPractice === true) {
      return { status: 'active', color: '#10b981', bg: '#d1fae5' };
    }
    if (now > endDate) return { status: 'ended', color: '#ef4444', bg: '#fee2e2' };
    return { status: 'active', color: '#10b981', bg: '#d1fae5' };
  };

  const classFilteredExams = useMemo(
    () => exams.filter((e) => examMatchesStudentAssignedClass(e, user?.classNumber)),
    [exams, user?.classNumber]
  );

  const availableSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    classFilteredExams.forEach((exam) => {
      getExamSubjects(exam).forEach((s) => set.add(s));
    });
    return Array.from(set.values()).sort();
  }, [classFilteredExams]);

  const subjectFilteredExams = useMemo(
    () =>
      classFilteredExams.filter((exam) => {
        if (examSubjectFilter === 'all') return true;
        return getExamSubjects(exam).includes(String(examSubjectFilter).toLowerCase());
      }),
    [classFilteredExams, examSubjectFilter]
  );

  const dedupedExamResults = useMemo(
    () => dedupeStudentExamResults(results, getExamIdFromResult),
    [results, getExamIdFromResult]
  );

  const attemptCountByExamId = useMemo(() => {
    const m = new Map<string, number>();
    for (const result of dedupedExamResults) {
      const id = getExamIdFromResult(result);
      if (!id) continue;
      const k = String(id);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [dedupedExamResults, getExamIdFromResult]);

  const availableActiveExams = useMemo(
    () =>
      subjectFilteredExams.filter((exam) => {
        const examId = String(exam._id || '');
        if (!examId) return false;
        const used = attemptCountByExamId.get(examId) || 0;
        if (used >= getMaxAttemptsForExam(exam)) return false;
        const hydratedQuestionCount = Array.isArray(exam.questions) ? exam.questions.length : 0;
        if (hydratedQuestionCount <= 0) return false;
        if (exam.isActive === false) return false;
        if (exam.hasInProgressDraft || exam.forceSubmitDraft) return true;
        const now = new Date();
        const startDate = new Date(exam.startDate);
        const endDate = new Date(exam.endDate);
        return exam.b2cPastPractice === true || (now >= startDate && now <= endDate);
      }),
    [subjectFilteredExams, attemptCountByExamId]
  );
  const visibleAvailableExams = useMemo(
    () => (showAllAvailableExams ? availableActiveExams : availableActiveExams.slice(0, 3)),
    [availableActiveExams, showAllAvailableExams]
  );

  const attemptedResultRows = useMemo(() => {
    const filtered = dedupedExamResults.filter((result) => {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) return false;
      if (examSubjectFilter === 'all') return true;
      const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
      if (!catalogExam) return true;
      if (!examMatchesStudentAssignedClass(catalogExam, user?.classNumber)) return false;
      return getExamSubjects(catalogExam).includes(String(examSubjectFilter).toLowerCase());
    });

    const latestByExam = new Map<string, any>();
    for (const result of filtered) {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) continue;
      const key = String(examIdStr);
      const existing = latestByExam.get(key);
      if (!existing) {
        latestByExam.set(key, result);
        continue;
      }
      const attNew = Number(result.attemptNumber) >= 1 ? Number(result.attemptNumber) : 1;
      const attOld = Number(existing.attemptNumber) >= 1 ? Number(existing.attemptNumber) : 1;
      const dateNew = new Date(result.completedAt || 0).getTime();
      const dateOld = new Date(existing.completedAt || 0).getTime();
      if (attNew > attOld || (attNew === attOld && dateNew > dateOld)) {
        latestByExam.set(key, result);
      }
    }

    return Array.from(latestByExam.values()).sort(
      (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );
  }, [dedupedExamResults, exams, examSubjectFilter, getExamIdFromResult, user?.classNumber]);

  const attemptHistoryByExamId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const result of dedupedExamResults) {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) continue;
      if (examSubjectFilter !== 'all') {
        const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
        if (
          catalogExam &&
          !getExamSubjects(catalogExam).includes(String(examSubjectFilter).toLowerCase())
        ) {
          continue;
        }
      }
      const key = String(examIdStr);
      const list = map.get(key) || [];
      list.push(result);
      map.set(key, list);
    }
    Array.from(map.entries()).forEach(([key, list]) => {
      list.sort((a, b) => {
        const attA = Number(a.attemptNumber) >= 1 ? Number(a.attemptNumber) : 1;
        const attB = Number(b.attemptNumber) >= 1 ? Number(b.attemptNumber) : 1;
        if (attB !== attA) return attB - attA;
        return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
      });
      map.set(key, list);
    });
    return map;
  }, [dedupedExamResults, exams, examSubjectFilter, getExamIdFromResult]);

  const upcomingExams = useMemo(
    () => subjectFilteredExams.filter((exam) => getExamStatus(exam).status === 'upcoming'),
    [subjectFilteredExams]
  );

  const availableGridLayout = useMemo(
    () => getExamGridLayout(width, availableActiveExams.length),
    [width, availableActiveExams.length]
  );
  const attemptedGridLayout = useMemo(
    () => getExamGridLayout(width, attemptedResultRows.length),
    [width, attemptedResultRows.length]
  );
  const upcomingGridLayout = useMemo(
    () => getExamGridLayout(width, upcomingExams.length),
    [width, upcomingExams.length]
  );

  const findExamForResult = (examIdStr: string, result: any): Exam => {
    const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
    if (catalogExam) return catalogExam;
    return {
      _id: examIdStr,
      title: result.examTitle || result.examId?.title || 'Exam',
      description: '',
      examType: 'practice',
      duration: 0,
      totalQuestions: result.totalQuestions || 0,
      totalMarks: result.totalMarks || 0,
      startDate: '',
      endDate: '',
      isActive: false,
    };
  };

  const openAttemptedExamResults = async (exam: Exam, displayResult: any) => {
    const attemptNum =
      Number(displayResult.attemptNumber) >= 1 ? Number(displayResult.attemptNumber) : 1;
    setLoadingExamResults(true);
    try {
      const token = await storageGetItem('authToken');
      const reviewQs =
        displayResult._id != null && String(displayResult._id).trim() !== ''
          ? `?resultId=${encodeURIComponent(String(displayResult._id))}`
          : '';
      const reviewResponse = await fetch(
        `${API_BASE_URL}/api/student/exam-results/${exam._id}/review${reviewQs}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let examWithQuestions = exam;
      let reviewResult = displayResult;
      let reviewedQuestions: any[] = [];

      if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        reviewResult = reviewJson?.data?.result || displayResult;
        reviewedQuestions = reviewJson?.data?.questions || [];
        examWithQuestions = {
          ...exam,
          questions: reviewedQuestions,
          totalQuestions: reviewJson?.data?.exam?.totalQuestions || exam.totalQuestions,
          totalMarks: reviewJson?.data?.exam?.totalMarks || exam.totalMarks,
          title: reviewJson?.data?.exam?.title || exam.title,
        };
      } else {
        const response = await fetch(`${API_BASE_URL}/api/student/exams/${exam._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          examWithQuestions = data.data || exam;
        }
      }

      const formattedResult = formatReviewResultForAnalysis(
        { ...reviewResult, attemptNumber: Number(reviewResult.attemptNumber) >= 1 ? Number(reviewResult.attemptNumber) : attemptNum },
        exam,
        examWithQuestions,
        displayResult
      );

      setSelectedExamForResults({ exam: examWithQuestions, result: formattedResult });
      setShowExamResults(true);
    } catch (error) {
      console.error('Failed to load exam review:', error);
      setSelectedExamForResults({
        exam,
        result: {
          ...displayResult,
          examId: getExamIdFromResult(displayResult) || exam._id,
          examTitle: displayResult.examTitle || exam.title,
        },
      });
      setShowExamResults(true);
    } finally {
      setLoadingExamResults(false);
    }
  };

  const handleStartExam = (exam: Exam) => {
    const maxA = getMaxAttemptsForExam(exam);
    const used = attemptCountByExamId.get(String(exam._id)) || 0;
    if (used >= maxA) {
      Alert.alert(
        'No Attempts Left',
        `You have used all ${maxA} attempt(s) for this exam. Open "Attempted Exams" to review your results.`
      );
      return;
    }

    router.push(`/exam/${exam._id}`);
  };

  useEffect(() => {
    if (!focusExamId?.trim()) {
      handledFocusExamIdRef.current = null;
      return;
    }
    if (isLoading || !exams.length || !resultsLoaded) return;
    if (handledFocusExamIdRef.current === focusExamId) return;

    const targetId = focusExamId.trim();
    const exam = exams.find((e) => String(e._id) === targetId);
    handledFocusExamIdRef.current = targetId;
    onFocusExamHandled?.();

    setExamSubjectFilter('all');
    setHighlightedExamId(targetId);

    if (!exam) {
      setActiveTab('available');
      return;
    }

    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    const attempts = attemptCountByExamId.get(targetId) || 0;
    const maxAttempts = getMaxAttemptsForExam(exam);
    const inWindow = now >= start && now <= end;
    const attemptsExhausted = attempts >= maxAttempts;

    if (now < start) {
      setActiveTab('upcoming');
      return;
    }

    if (attempts > 0 && (attemptsExhausted || !inWindow)) {
      setActiveTab('attempted');
      return;
    }

    if (inWindow) {
      setActiveTab('available');
      return;
    }

    setActiveTab('available');
  }, [
    focusExamId,
    exams,
    isLoading,
    resultsLoaded,
    attemptCountByExamId,
    onFocusExamHandled,
  ]);

  useEffect(() => {
    if (!highlightedExamId || !resultsLoaded) return;

    const exam = exams.find((e) => String(e._id) === highlightedExamId);
    if (!exam) return;

    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    const inWindow = now >= start && now <= end;
    const inAttempted = attemptedResultRows.some(
      (result) => getExamIdFromResult(result) === highlightedExamId
    );
    const inAvailable = availableActiveExams.some((e) => String(e._id) === highlightedExamId);
    const inUpcoming = upcomingExams.some((e) => String(e._id) === highlightedExamId);

    if (activeTab === 'attempted' && !inAttempted) {
      if (inAvailable) setActiveTab('available');
      else if (inUpcoming) setActiveTab('upcoming');
      return;
    }

    if (activeTab === 'available' && !inAvailable && inAttempted) {
      setActiveTab('attempted');
      return;
    }

    if (activeTab === 'upcoming' && !inUpcoming && inAvailable && inWindow) {
      setActiveTab('available');
    }
  }, [
    highlightedExamId,
    resultsLoaded,
    activeTab,
    exams,
    attemptedResultRows,
    availableActiveExams,
    upcomingExams,
    getExamIdFromResult,
  ]);

  const examTabChips = useMemo(
    () => {
      const chips = [
        {
          id: 'available',
          label: isB2cStudent ? 'Practice papers' : 'Available Exams',
          shortLabel: isB2cStudent ? 'Practice' : 'Available',
          borderColor: '#2563eb',
        },
        { id: 'attempted', label: 'Attempted Exams', shortLabel: 'Attempted', borderColor: '#7c3aed' },
        { id: 'ranking', label: 'My Rankings', shortLabel: 'Rankings', borderColor: '#ea580c' },
        { id: 'upcoming', label: 'Upcoming Exams', shortLabel: 'Upcoming', borderColor: '#16a34a' },
      ];
      if (!isB2cStudent) {
        chips.push({ id: 'omr', label: 'Offline Results', shortLabel: 'Offline', borderColor: '#0d9488' });
      }
      return chips;
    },
    [isB2cStudent]
  );

  const subjectFilterOptions = useMemo(
    () => [
      {
        value: 'all',
        label: 'All Subjects',
        count: classFilteredExams.length,
      },
      ...availableSubjectOptions.map((subject) => ({
        value: subject,
        label: subject.charAt(0).toUpperCase() + subject.slice(1),
        count: classFilteredExams.filter((exam) =>
          getExamSubjects(exam).includes(subject)
        ).length,
      })),
    ],
    [availableSubjectOptions, classFilteredExams]
  );

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <GlassPanel
        tone="strong"
        elevated
        colors={[...GLASS_VIOLET]}
        radius={STUDENT_RADIUS.xxl}
        style={[styles.header, compact && { marginBottom: 14 }]}
        contentStyle={styles.headerInner}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text-outline" size={22} color={STUDENT.primaryDark} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, compact && { fontSize: 24 }]}>
              {isB2cStudent ? 'Practice exams' : 'Exams'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isB2cStudent
                ? 'Take class-wise practice exams tied to your Board or Asli Prep Alpha / Beta / Gamma track.'
                : 'Practice papers, results, and rankings in one place.'}
            </Text>
          </View>
        </View>
        {isB2cStudent ? (
          <TouchableOpacity style={styles.generateExamButton} onPress={() => setShowGenerateExam(true)}>
            <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
            <Text style={styles.generateExamButtonText}>Generate Exam</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.filtersRow}>
          {studentClassNumber ? (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Class</Text>
              <View style={styles.classBadge}>
                <Text style={styles.classBadgeText}>Class {studentClassNumber}</Text>
              </View>
            </View>
          ) : null}
          <StudentFilterDropdown
            label="Subject"
            placeholder="All Subjects"
            value={examSubjectFilter}
            options={subjectFilterOptions}
            onChange={setExamSubjectFilter}
          />
        </View>
      </GlassPanel>

      <Modal visible={showGenerateExam} transparent animationType="fade" onRequestClose={() => setShowGenerateExam(false)}>
        <View style={styles.generatorOverlay}>
          <View style={styles.generatorSheet}>
            <View style={styles.generatorTitleRow}><Text style={styles.generatorTitle}>Generate your exam</Text><TouchableOpacity onPress={() => setShowGenerateExam(false)}><Ionicons name="close" size={22} color={STUDENT.text} /></TouchableOpacity></View>
            <Text style={styles.generatorSubtitle}>Builds a scored exam from questions available for your class and topic.</Text>
            <StudentFilterDropdown label="Board / Track" placeholder="Select" value={generateBoard} options={[{value:'CBSE',label:'CBSE'},{value:'IIT',label:'IIT'}]} onChange={(value) => { setGenerateBoard(value); setGenerateSubject(''); setGenerateTopic(''); }} />
            <StudentFilterDropdown label="Subject" placeholder={examGeneratorCascade.loadingSubjects ? 'Loading...' : 'Select subject'} value={generateSubject} options={examGeneratorCascade.subjects.map((value) => ({value,label:value}))} onChange={(value) => { setGenerateSubject(value); setGenerateTopic(''); }} />
            <StudentFilterDropdown label="Topic" placeholder={examGeneratorCascade.loadingTopics ? 'Loading...' : 'Select topic'} value={generateTopic} options={examGeneratorCascade.topics.map((value) => ({value,label:value}))} onChange={setGenerateTopic} />
            <StudentFilterDropdown label="Questions" placeholder="10 questions" value={generateQuestionCount} options={['10','15','20'].map((value) => ({value,label:`${value} questions`}))} onChange={setGenerateQuestionCount} />
            <TouchableOpacity style={[styles.generatorSubmit, (!generateSubject || !generateTopic || isGeneratingExam) && styles.generatorSubmitDisabled]} disabled={!generateSubject || !generateTopic || isGeneratingExam} onPress={generatePersonalExam}>
              {isGeneratingExam ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.generatorSubmitText}>Generate and start exam</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.tabsContainer}>
        <ChipNav
          chips={examTabChips}
          active={activeTab}
          onChange={(id) => {
            setActiveTab(id as typeof activeTab);
            setHighlightedExamId(null);
          }}
        />
      </View>

      {/* Available Exams Tab */}
      {activeTab === 'available' && (
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : availableActiveExams.length === 0 ? (
            <View style={styles.emptyState}>
              <GlassPanel tone="medium" radius={STUDENT_RADIUS.card} contentStyle={styles.emptyInner}>
                <Ionicons name="document-text-outline" size={40} color={STUDENT.primary} />
                <Text style={styles.emptyStateTitle}>
                  {isB2cStudent ? 'No practice exams open right now' : 'No Available Exams'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {isB2cStudent
                    ? `Practice papers for${studentClassNumber ? ` Class ${studentClassNumber}` : ' your class'} appear here when a public practice exam is published for your Board or IIT track.`
                    : 'No active exams right now. Check Upcoming for scheduled papers.'}
                </Text>
              </GlassPanel>
            </View>
          ) : (
            <View style={[styles.examsList, availableGridLayout.isGrid && styles.examsListGrid]}>
              {visibleAvailableExams.map((exam, index) => {
                const usedAttempts = attemptCountByExamId.get(String(exam._id)) || 0;
                const isCalendarFocus = highlightedExamId === String(exam._id);
                return (
                  <StudentExamPreviewCard
                    key={exam._id}
                    exam={exam}
                    usedAttempts={usedAttempts}
                    studentClassNumber={user?.classNumber}
                    focused={isCalendarFocus}
                    colorIndex={index}
                    style={
                      availableGridLayout.cardWidth != null
                        ? { width: availableGridLayout.cardWidth, alignSelf: 'flex-start' as const }
                        : undefined
                    }
                    onStartPress={() => handleStartExam(exam)}
                  />
                );
              })}
              {availableActiveExams.length > 3 ? (
                <TouchableOpacity
                  style={styles.availableCollapseButton}
                  onPress={() => setShowAllAvailableExams((value) => !value)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showAllAvailableExams }}
                >
                  <Ionicons
                    name={showAllAvailableExams ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={STUDENT.primaryDark}
                  />
                  <Text style={styles.availableCollapseText}>
                    {showAllAvailableExams
                      ? 'Show fewer tests'
                      : `Show ${availableActiveExams.length - 3} more tests`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      )}

      {/* Attempted Exams Tab */}
      {activeTab === 'attempted' && (
        <View style={styles.content}>
          {!resultsLoaded ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : attemptedResultRows.length === 0 ? (
            <View style={styles.emptyState}>
              <GlassPanel tone="medium" radius={STUDENT_RADIUS.card} contentStyle={styles.emptyInner}>
                <Ionicons name="checkmark-circle-outline" size={40} color={STUDENT.success} />
                <Text style={styles.emptyStateTitle}>No Attempted Exams</Text>
                <Text style={styles.emptyStateText}>
                  Finish an available paper and your results will show up here.
                </Text>
              </GlassPanel>
            </View>
          ) : (
            <View
              style={[
                styles.examsList,
                styles.attemptedListContent,
                attemptedGridLayout.isGrid && styles.attemptedListGrid,
              ]}
            >
              {attemptedResultRows.map((result, index) => {
                const examIdStr = getExamIdFromResult(result);
                if (!examIdStr) return null;
                const exam = findExamForResult(examIdStr, result);
                const scheme = ATTEMPTED_CARD_SCHEMES[index % ATTEMPTED_CARD_SCHEMES.length];
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                const attemptHistory = attemptHistoryByExamId.get(examIdStr) || [result];
                const totalAttempts = attemptHistory.length;
                const selectedRowId = selectedAttemptByExam[examIdStr];
                const displayResult =
                  (selectedRowId &&
                    attemptHistory.find((r) => getExamResultRowId(r) === selectedRowId)) ||
                  attemptHistory[0] ||
                  result;
                const displayPercentage = getDisplayPercentage(displayResult);
                const marksPercentage = getMarksPercentage(displayResult);
                const gradePct =
                  (displayResult.totalMarks || exam.totalMarks || 0) > 0
                    ? marksPercentage
                    : displayPercentage;
                const grade =
                  gradePct >= 70 ? 'Excellent' : gradePct >= 50 ? 'Good' : 'Needs Improvement';
                const gradeBg =
                  gradePct >= 70 ? '#16a34a' : gradePct >= 50 ? '#ca8a04' : '#dc2626';
                const totalMarksDisplay = displayResult.totalMarks || exam.totalMarks;
                const obtainedMarksDisplay = Number(displayResult.obtainedMarks ?? 0);
                const distributionSegments = buildQuestionDistributionSegments(displayResult);

                const isCalendarFocus = highlightedExamId === examIdStr;
                return (
                  <GlassPanel
                    key={examIdStr}
                    tone="strong"
                    elevated
                    radius={18}
                    style={[
                      styles.attemptedCard,
                      attemptedGridLayout.isGrid && styles.attemptedCardGridItem,
                      attemptedGridLayout.cardWidth != null
                        ? { width: attemptedGridLayout.cardWidth, alignSelf: 'flex-start' as const }
                        : null,
                      isCalendarFocus && styles.examCardFocused,
                      { borderColor: scheme.accent, borderWidth: 1.5 },
                    ]}
                    contentStyle={styles.attemptedCardInner}
                  >
                    <View style={[styles.attemptedCardBody, attemptedGridLayout.isGrid && styles.attemptedCardBodyGrid]}>
                    <Text style={styles.attemptedCardTitle} numberOfLines={isTablet ? 3 : 2}>
                      {exam.title}
                    </Text>
                    {exam.description ? (
                      <Text style={styles.attemptedCardDesc} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    ) : null}
                    <View style={styles.attemptedBadgeRow}>
                      <View
                        style={[
                          styles.attemptedTypeBadge,
                          {
                            backgroundColor: scheme.typeBadgeBg,
                            borderColor: `${scheme.accent}44`,
                          },
                        ]}
                      >
                        <Text style={[styles.attemptedTypeBadgeText, { color: scheme.typeBadgeText }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.attemptedClassBadge}>
                          <Text style={styles.attemptedClassBadgeText}>Class {cl}</Text>
                        </View>
                      ))}
                    </View>

                    {totalAttempts > 1 ? (
                      <View style={styles.attemptPickerSection}>
                        <Text style={styles.attemptPickerLabel}>View Attempt</Text>
                        <TouchableOpacity
                          style={[styles.attemptPickerTrigger, { borderColor: scheme.accent }]}
                          onPress={() => setAttemptPickerExamId(examIdStr)}
                        >
                          <View style={styles.attemptPickerValueWrap}>
                            <Text style={styles.attemptPickerValue} numberOfLines={1}>
                              {formatAttemptHistoryLabel(displayResult, totalMarksDisplay)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-down" size={18} color={STUDENT.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : attemptedGridLayout.isGrid ? (
                      <View style={styles.attemptPickerPlaceholder} />
                    ) : null}

                    <View style={[styles.attemptedCardMetrics, isTablet && styles.attemptedCardMetricsGrid]}>
                      <View
                        style={[
                          styles.attemptedScoreBox,
                          isTablet && styles.attemptedScoreBoxGrid,
                          { borderColor: gradeBg, borderWidth: 1.5 },
                        ]}
                      >
                        <View style={[styles.attemptedScoreRow, isTablet && styles.attemptedScoreRowGrid]}>
                          <DonutChart
                            size={isTablet ? 68 : 78}
                            centerLabel={`${Math.round(
                              totalMarksDisplay > 0 ? marksPercentage : displayPercentage
                            )}%`}
                            segments={distributionSegments}
                          />
                          <View style={styles.attemptedScoreTextWrap}>
                            <Text style={[styles.attemptedScoreMain, isTablet && styles.attemptedScoreMainGrid]}>
                              {obtainedMarksDisplay}
                              <Text style={styles.attemptedScoreDenom}>/{totalMarksDisplay}</Text>
                            </Text>
                            <Text style={styles.attemptedScoreLabel}>Marks</Text>
                            {!isTablet ? (
                              <Text style={styles.attemptedScoreMeta}>
                                {displayResult.correctAnswers || 0} Correct · {displayResult.wrongAnswers || 0} Wrong ·{' '}
                                {displayResult.unattempted || 0} Skipped
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={[styles.attemptedStatsList, isTablet && styles.attemptedStatsListGrid]}>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <View style={styles.attemptedStatsLabelWrap}>
                            <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                              Correct
                            </Text>
                          </View>
                          <Text style={styles.attemptedStatsValue}>{displayResult.correctAnswers || 0}</Text>
                        </View>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <View style={styles.attemptedStatsLabelWrap}>
                            <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                              Wrong
                            </Text>
                          </View>
                          <Text style={styles.attemptedStatsValue}>{displayResult.wrongAnswers || 0}</Text>
                        </View>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <View style={styles.attemptedStatsLabelWrap}>
                            <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                              Unattempted
                            </Text>
                          </View>
                          <Text style={styles.attemptedStatsValue}>{displayResult.unattempted || 0}</Text>
                        </View>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <View style={styles.attemptedStatsLabelWrap}>
                            <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                              Time
                            </Text>
                          </View>
                          <Text style={styles.attemptedStatsValue} numberOfLines={1}>
                            {displayResult.timeTaken
                              ? `${Math.floor(displayResult.timeTaken / 60)}m ${displayResult.timeTaken % 60}s`
                              : 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    </View>

                    <View
                      style={[
                        styles.attemptedCardFooter,
                        isTablet && styles.attemptedCardFooterAligned,
                        attemptedGridLayout.isGrid && styles.attemptedCardFooterGridPin,
                      ]}
                    >
                      <View
                        style={[
                          styles.attemptedGradeBadge,
                          isTablet && styles.attemptedGradeBadgeAligned,
                          { backgroundColor: gradeBg },
                        ]}
                      >
                        <Text style={styles.attemptedGradeText} numberOfLines={1}>
                          {grade}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.attemptedDetailsButton,
                          isTablet && styles.attemptedDetailsButtonGrid,
                          { borderColor: scheme.accent },
                        ]}
                        disabled={loadingExamResults}
                        onPress={() => void openAttemptedExamResults(exam, displayResult)}
                      >
                        <Ionicons name="eye-outline" size={18} color={STUDENT.primaryDark} />
                        <Text style={styles.attemptedDetailsButtonText} numberOfLines={1}>
                          View Details
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlassPanel>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Rankings Tab */}
      {activeTab === 'ranking' && (
        <View style={styles.content}>
          <RankingsTab rankings={rankings} />
        </View>
      )}

      {/* Upcoming Exams Tab */}
      {activeTab === 'upcoming' && (
        <View style={styles.content}>
          {upcomingExams.length === 0 ? (
            <View style={styles.emptyState}>
              <GlassPanel tone="medium" radius={STUDENT_RADIUS.card} contentStyle={styles.emptyInner}>
                <Ionicons name="calendar-outline" size={40} color={STUDENT.primary} />
                <Text style={styles.emptyStateTitle}>No Upcoming Exams</Text>
                <Text style={styles.emptyStateText}>
                  Nothing scheduled yet — check Available when a paper goes live.
                </Text>
              </GlassPanel>
            </View>
          ) : (
            <View style={[styles.examsList, upcomingGridLayout.isGrid && styles.examsListGrid]}>
              {upcomingExams.map((exam, index) => {
                const usedAttempts = attemptCountByExamId.get(String(exam._id)) || 0;
                const isCalendarFocus = highlightedExamId === String(exam._id);
                return (
                  <StudentExamPreviewCard
                    key={exam._id}
                    exam={exam}
                    usedAttempts={usedAttempts}
                    studentClassNumber={user?.classNumber}
                    focused={isCalendarFocus}
                    colorIndex={index}
                    variant="upcoming"
                    style={
                      upcomingGridLayout.cardWidth != null
                        ? { width: upcomingGridLayout.cardWidth, alignSelf: 'flex-start' as const }
                        : undefined
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Offline Results Tab */}
      {activeTab === 'omr' && (
        <View style={styles.content}>
          <OmrResultsView />
        </View>
      )}
    </ScrollView>

      <Modal
        visible={attemptPickerExamId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAttemptPickerExamId(null)}
      >
        <View style={styles.attemptPickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAttemptPickerExamId(null)}
          />
          <View style={styles.attemptPickerSheet}>
            <Text style={styles.attemptPickerSheetTitle}>View Attempt</Text>
            {(attemptPickerExamId ? attemptHistoryByExamId.get(attemptPickerExamId) : [])?.map(
              (attemptRow) => {
                const examIdStr = attemptPickerExamId!;
                const exam = findExamForResult(
                  examIdStr,
                  attemptHistoryByExamId.get(examIdStr)?.[0] || attemptRow
                );
                const rowId = getExamResultRowId(attemptRow);
                const selectedRowId = selectedAttemptByExam[examIdStr];
                const displayRowId =
                  selectedRowId ||
                  getExamResultRowId(attemptHistoryByExamId.get(examIdStr)?.[0] || attemptRow);
                const isSelected = rowId === displayRowId;
                return (
                  <TouchableOpacity
                    key={rowId}
                    style={[styles.attemptPickerOption, isSelected && styles.attemptPickerOptionActive]}
                    onPress={() => {
                      setSelectedAttemptByExam((prev) => ({ ...prev, [examIdStr]: rowId }));
                      setAttemptPickerExamId(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.attemptPickerOptionText,
                        isSelected && styles.attemptPickerOptionTextActive,
                      ]}
                    >
                      {formatAttemptHistoryLabel(attemptRow, exam.totalMarks)}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color="#ea580c" /> : null}
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>
      </Modal>

      {loadingExamResults ? (
        <Modal visible transparent animationType="fade">
          <View style={styles.resultsLoadingOverlay}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.resultsLoadingText}>Loading Exam Details...</Text>
          </View>
        </Modal>
      ) : null}

      {showExamResults && selectedExamForResults ? (
        <Modal
          visible={showExamResults}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowExamResults(false)}
        >
          <View style={styles.examResultsModal}>
          <ExamResultsView
            result={selectedExamForResults.result}
            examTitle={selectedExamForResults.exam.title}
            onBack={() => setShowExamResults(false)}
            onRetake={() => {
              setShowExamResults(false);
              handleStartExam(selectedExamForResults.exam);
            }}
            attemptsRemaining={Math.max(
              0,
              getMaxAttemptsForExam(selectedExamForResults.exam) -
                (attemptHistoryByExamId.get(String(selectedExamForResults.exam._id))?.length || 0)
            )}
          />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  generateExamButton: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: STUDENT.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  generateExamButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  generatorOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  generatorSheet: { backgroundColor: STUDENT.surface, borderRadius: 22, padding: 18, gap: 12, maxHeight: '90%' },
  generatorTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  generatorTitle: { fontSize: 20, fontWeight: '800', color: STUDENT.text },
  generatorSubtitle: { fontSize: 12, color: STUDENT.textMuted, marginBottom: 2 },
  generatorSubmit: { minHeight: 48, borderRadius: 13, backgroundColor: STUDENT.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  generatorSubmitDisabled: { opacity: 0.5 },
  generatorSubmitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  examResultsModal: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 110,
    flexGrow: 1,
  },
  scrollContentTablet: {
    width: '100%',
  },
  header: {
    marginBottom: STUDENT_SPACING.xl,
  },
  headerInner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 26,
    color: STUDENT.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: STUDENT.textSecondary,
  },
  filtersRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: STUDENT_SPACING.md,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    fontWeight: '600',
  },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: 1,
    borderColor: GLASS_ROW.border,
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  classBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730a3',
  },
  tabsContainer: {
    marginBottom: STUDENT_SPACING.lg,
  },
  shimmerWrap: {
    gap: STUDENT_SPACING.md,
    marginTop: STUDENT_SPACING.sm,
  },
  classPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.text,
  },
  content: {
    paddingTop: 4,
  },
  attemptedListContent: {
    paddingBottom: STUDENT_SPACING.xxl,
  },
  attemptedListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    alignContent: 'flex-start',
    gap: EXAMS_GRID_GAP,
  },
  examsListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    alignContent: 'flex-start',
    gap: EXAMS_GRID_GAP,
  },
  examCardWrap: {
    marginBottom: STUDENT_SPACING.md,
  },
  examCardFocused: {
    borderWidth: 2,
    borderColor: STUDENT.primary,
  },
  calendarFocusBanner: {
    borderWidth: 1,
    borderRadius: STUDENT_RADIUS.lg,
    padding: 14,
    marginBottom: STUDENT_SPACING.md,
    gap: 10,
  },
  calendarFocusUpcoming: {
    borderColor: '#fcd34d',
    backgroundColor: 'rgba(255,251,235,0.55)',
  },
  calendarFocusLive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  calendarFocusCompleted: {
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
  },
  calendarFocusEnded: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  calendarFocusTextWrap: {
    gap: 4,
  },
  calendarFocusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.text,
  },
  calendarFocusSub: {
    fontSize: 12,
    color: STUDENT.textSecondary,
    lineHeight: 18,
  },
  calendarFocusDismiss: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  calendarFocusDismissText: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  attemptedCard: {
    width: '100%',
    overflow: 'hidden',
  },
  attemptedCardInner: {
    padding: 16,
    gap: 14,
  },
  attemptedCardGridItem: {
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  attemptedCardBody: {
    gap: 14,
  },
  attemptedCardBodyGrid: {
    flexGrow: 1,
  },
  attemptedCardMetrics: {
    gap: 12,
  },
  attemptedCardMetricsTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  attemptedCardMetricsCompact: {
    gap: 10,
  },
  attemptedCardMetricsGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  attemptedCardFooter: {
    gap: 10,
  },
  attemptedCardFooterTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attemptedCardFooterCompact: {
    gap: 8,
  },
  attemptedCardFooterAligned: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
  },
  attemptedCardFooterGridPin: {
    marginTop: 'auto',
    flexShrink: 0,
  },
  attemptedGradeBadgeAligned: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    maxWidth: '46%',
    minHeight: 44,
    marginTop: 0,
  },
  attemptedCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
  },
  attemptedCardDesc: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    lineHeight: 18,
  },
  attemptedBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attemptedTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  attemptedTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attemptedClassBadge: {
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attemptedClassBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.text,
  },
  emptyState: {
    marginTop: 12,
  },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: STUDENT.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  examsList: {
    width: '100%',
    gap: EXAMS_GRID_GAP,
  },
  availableCollapseButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    backgroundColor: GLASS_ROW.fillStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  availableCollapseText: {
    color: STUDENT.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  examHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  examTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  examTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  examStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STUDENT.text,
  },
  examDescription: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  examStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  examStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examStatText: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  startButton: {
    backgroundColor: STUDENT.accent,
    paddingVertical: 12,
    borderRadius: STUDENT_RADIUS.sm,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonText: {
    color: STUDENT.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  resultStats: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  resultStat: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  attemptedScoreBox: {
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  attemptedScoreBoxTablet: {
    flex: 1,
    minWidth: 0,
    maxWidth: 300,
    justifyContent: 'center',
  },
  attemptedScoreBoxCompact: {
    width: '100%',
  },
  attemptedScoreBoxGrid: {
    width: '100%',
    maxWidth: '100%',
    alignItems: 'center',
  },
  attemptedScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  attemptedScoreRowGrid: {
    justifyContent: 'center',
    width: '100%',
  },
  attemptedScoreTextWrap: {
    flexShrink: 1,
    gap: 2,
  },
  attemptedScoreMain: {
    fontSize: 28,
    fontWeight: '800',
    color: STUDENT.text,
  },
  attemptedScoreMainCompact: {
    fontSize: 22,
  },
  attemptedScoreMainGrid: {
    fontSize: 24,
  },
  attemptedScoreDenom: {
    fontSize: 16,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  attemptedScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  attemptedScoreMeta: {
    fontSize: 11,
    color: STUDENT.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  attemptedStatsList: {
    gap: 8,
  },
  attemptedStatsListTablet: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  attemptedStatsListGrid: {
    width: '100%',
    flexGrow: 0,
    gap: 6,
  },
  attemptedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attemptedStatsRowTablet: {
    width: '100%',
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    alignItems: 'center',
  },
  attemptedStatsLabelWrap: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  attemptedStatsLabel: {
    fontSize: 12,
    color: STUDENT.textSecondary,
    fontWeight: '500',
    lineHeight: 16,
  },
  attemptedStatsValue: {
    flexShrink: 0,
    width: 64,
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.text,
    textAlign: 'right',
    lineHeight: 18,
  },
  attemptedGradeBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexShrink: 0,
  },
  attemptedGradeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  attemptedDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  attemptedDetailsButtonTablet: {
    flex: 1,
    marginTop: 0,
    minHeight: 44,
  },
  attemptedDetailsButtonGrid: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginTop: 0,
    minHeight: 44,
  },
  attemptedDetailsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
  },
  attemptPickerSection: {
    gap: 6,
    marginBottom: 4,
  },
  attemptPickerPlaceholder: {
    minHeight: 66,
  },
  attemptPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.textSecondary,
  },
  attemptPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: GLASS_ROW.fillStrong,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attemptPickerValueWrap: {
    flex: 1,
    minWidth: 0,
  },
  attemptPickerValue: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.text,
  },
  attemptPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  attemptPickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 4,
  },
  attemptPickerSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
    marginBottom: 8,
  },
  attemptPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  attemptPickerOptionActive: {
    backgroundColor: 'rgba(255,247,237,0.55)',
  },
  attemptPickerOptionText: {
    flex: 1,
    fontSize: 14,
    color: STUDENT.textSecondary,
    fontWeight: '500',
  },
  attemptPickerOptionTextActive: {
    color: STUDENT.text,
    fontWeight: '700',
  },
  resultsLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resultsLoadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

