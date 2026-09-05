import { storageGetItem } from '../../src/lib/safe-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../../src/hooks/useBackNavigation';
import MathRenderer from '../../src/components/MathRenderer';
import { GlassPanel } from '../../src/components/ui';

type Question = {
  _id?: string;
  question: string;
  type?: 'multiple-choice' | 'true-false' | 'short-answer' | string;
  options?: string[] | Array<{ text?: string; label?: string } | string>;
  correctAnswer?: string | string[] | number | boolean;
  explanation?: string;
  points?: number;
};

type Quiz = {
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  difficulty?: string;
  questions: Question[];
  totalPoints?: number;
};

type QuizResults = {
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  totalPoints: number;
  percentage: number;
};

function questionKey(q: Question, index: number) {
  return String(q._id || q.question || index);
}

function normalizeOptions(q: Question): string[] {
  const raw = Array.isArray(q.options) ? q.options : [];
  const mapped = raw
    .map((opt) => {
      if (typeof opt === 'string') return opt.trim();
      if (opt && typeof opt === 'object') {
        return String(opt.text || opt.label || '').trim();
      }
      return String(opt ?? '').trim();
    })
    .filter(Boolean);

  if (mapped.length) return mapped;
  if (q.type === 'true-false') return ['True', 'False'];
  return [];
}

function formatTime(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function answersMatch(correct: unknown, given: string): boolean {
  if (correct == null && correct !== 0 && correct !== false) return false;
  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
  if (Array.isArray(correct)) {
    return correct.some((c) => norm(c) === norm(given));
  }
  // numeric index → option text handled by caller
  return norm(correct) === norm(given);
}

export default function QuizPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [dashboardPath, setDashboardPath] = useState('/dashboard');
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  const timeLeftRef = useRef(timeLeft);
  const quizRef = useRef(quiz);

  answersRef.current = answers;
  timeLeftRef.current = timeLeft;
  quizRef.current = quiz;

  useEffect(() => {
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const token = await storageGetItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/quizzes/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          if (!cancelled) {
            setQuiz(null);
            setLoadError('Failed to fetch quiz. Please try again.');
          }
          return;
        }
        const data = await response.json();
        const payload = (data?.data || data?.quiz || data) as Quiz;
        const questions = Array.isArray(payload?.questions) ? payload.questions : [];
        if (!cancelled) {
          setQuiz({
            ...payload,
            _id: String(payload?._id || id),
            title: payload?.title || 'Quiz',
            questions,
            totalPoints:
              Number(payload?.totalPoints) ||
              questions.reduce((sum, q) => sum + (Number(q.points) > 0 ? Number(q.points) : 1), 0) ||
              questions.length,
          });
          setCurrentQuestionIndex(0);
          setAnswers({});
          setIsSubmitted(false);
          setResults(null);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        if (!cancelled) {
          setQuiz(null);
          setLoadError('An error occurred while fetching the quiz.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const computeLocalResults = useCallback((activeQuiz: Quiz, answerMap: Record<string, string>) => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalScore = 0;
    const totalPoints =
      Number(activeQuiz.totalPoints) ||
      activeQuiz.questions.reduce((sum, q) => sum + (Number(q.points) > 0 ? Number(q.points) : 1), 0) ||
      activeQuiz.questions.length;

    activeQuiz.questions.forEach((question, index) => {
      const qid = questionKey(question, index);
      const userAnswer = answerMap[qid];
      const opts = normalizeOptions(question);
      const pts = Number(question.points) > 0 ? Number(question.points) : 1;

      if (!userAnswer) {
        unattempted++;
        return;
      }

      let correctValue: unknown = question.correctAnswer;
      if (typeof correctValue === 'number' && opts[correctValue] != null) {
        correctValue = opts[correctValue];
      }

      if (answersMatch(correctValue, userAnswer)) {
        correct++;
        totalScore += pts;
      } else {
        incorrect++;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    return {
      total: activeQuiz.questions.length,
      correct,
      incorrect,
      unattempted,
      score: totalScore,
      totalPoints,
      percentage,
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    const activeQuiz = quizRef.current;
    if (!activeQuiz || submittingRef.current || isSubmitted) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setIsSubmitted(true);

    const answerMap = answersRef.current;
    const local = computeLocalResults(activeQuiz, answerMap);
    setResults(local);

    const durationSec = Math.max(0, Number(activeQuiz.duration || 0) * 60);
    const timeTaken = Math.max(0, durationSec - timeLeftRef.current);

    // Server grader expects an array aligned to question index (option text / value).
    const answerPayload = activeQuiz.questions.map((q, index) => {
      const qid = questionKey(q, index);
      const value = answerMap[qid];
      return value
        ? { questionId: q._id || qid, questionIndex: index, answer: value }
        : { questionId: q._id || qid, questionIndex: index, answer: null };
    });

    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/quizzes/${activeQuiz._id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: answerPayload,
          timeTaken,
        }),
      });

      if (response.ok) {
        const body = await response.json();
        const serverScore = body?.data?.score;
        const serverTotal = body?.data?.totalPoints;
        if (typeof serverScore === 'number' && serverScore >= 0) {
          const totalPoints = Number(serverTotal) || local.totalPoints;
          const percentage = totalPoints > 0 ? Math.round((serverScore / totalPoints) * 100) : local.percentage;
          setResults({
            ...local,
            score: serverScore,
            totalPoints,
            percentage,
          });
        }
      } else {
        Alert.alert(
          'Could not save quiz',
          'Your score is shown here, but it was not saved. Check your connection and try again so it also appears on the web.',
        );
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert(
        'Could not save quiz',
        'Check your connection and try again so this attempt is saved for web and mobile.',
      );
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [computeLocalResults, isSubmitted]);

  // Timer — start only after quiz loads; match web (duration minutes → seconds)
  useEffect(() => {
    if (!quiz || isSubmitted) return;
    const seconds = Math.max(0, Math.round(Number(quiz.duration || 10) * 60));
    setTimeLeft(seconds);
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz?._id, isSubmitted, handleSubmit]);

  const handleAnswerSelect = (qid: string, option: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: option }));
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  };

  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  const qid = currentQuestion ? questionKey(currentQuestion, currentQuestionIndex) : '';
  const options = useMemo(
    () => (currentQuestion ? normalizeOptions(currentQuestion) : []),
    [currentQuestion],
  );
  const progress =
    quiz && quiz.questions.length
      ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100
      : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading quiz…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!quiz || !quiz.questions.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.notFoundWrap}>
          <Ionicons name="alert-circle-outline" size={56} color="#cbd5e1" />
          <Text style={styles.notFoundTitle}>Quiz Not Found</Text>
          <Text style={styles.notFoundSub}>
            {loadError ||
              "The quiz you're looking for doesn't exist or you don't have access to it."}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace(dashboardPath as any)}>
            <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <GlassPanel style={styles.topBar} radius={0} bordered={false}>
        <View style={styles.topBarRow}>
          <Pressable
            onPress={() => {
              if (isSubmitted) {
                router.replace(dashboardPath as any);
                return;
              }
              Alert.alert('Leave quiz?', 'Your progress will be lost if you leave now.', [
                { text: 'Stay', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => router.back() },
              ]);
            }}
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {quiz.title}
            </Text>
            <Text style={styles.topSub} numberOfLines={1}>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </Text>
          </View>
          {!isSubmitted ? (
            <View style={styles.timerPill}>
              <Ionicons name="time-outline" size={16} color="#dc2626" />
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            </View>
          ) : null}
        </View>
      </GlassPanel>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card — match web */}
        <View style={styles.headerCard}>
          {quiz.description ? <Text style={styles.description}>{quiz.description}</Text> : null}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="help-circle-outline" size={14} color="#64748b" />
              <Text style={styles.metaText}>{quiz.questions.length} Questions</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="trophy-outline" size={14} color="#64748b" />
              <Text style={styles.metaText}>{quiz.totalPoints || quiz.questions.length} Points</Text>
            </View>
            {quiz.difficulty ? (
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>{quiz.difficulty}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {isSubmitted && results ? (
          <View style={styles.resultsCard}>
            <View style={styles.resultsTitleRow}>
              <Ionicons name="trophy" size={28} color="#eab308" />
              <Text style={styles.resultsTitle}>Quiz Results</Text>
            </View>
            <Text style={styles.resultsPct}>{results.percentage}%</Text>
            <Text style={styles.resultsScore}>
              Score: {results.score} / {results.totalPoints} points
            </Text>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, styles.statCorrect]}>
                <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
                <Text style={[styles.statValue, { color: '#166534' }]}>{results.correct}</Text>
                <Text style={[styles.statLabel, { color: '#16a34a' }]}>Correct</Text>
              </View>
              <View style={[styles.statBox, styles.statIncorrect]}>
                <Ionicons name="close-circle" size={28} color="#dc2626" />
                <Text style={[styles.statValue, { color: '#991b1b' }]}>{results.incorrect}</Text>
                <Text style={[styles.statLabel, { color: '#dc2626' }]}>Incorrect</Text>
              </View>
              <View style={[styles.statBox, styles.statSkip]}>
                <Ionicons name="document-text-outline" size={28} color="#64748b" />
                <Text style={[styles.statValue, { color: '#334155' }]}>{results.unattempted}</Text>
                <Text style={[styles.statLabel, { color: '#64748b' }]}>Unattempted</Text>
              </View>
            </View>

            <Pressable
              style={styles.dashboardBtn}
              onPress={() => router.replace(dashboardPath as any)}
            >
              <Text style={styles.dashboardBtnText}>Back to Dashboard</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.questionCard}>
            <View style={styles.questionStem}>
              <MathRenderer formula={currentQuestion?.question || ''} inline={false} />
            </View>

            <View style={styles.optionsList}>
              {options.map((option, index) => {
                const optionLabel = String.fromCharCode(65 + index);
                const isSelected = answers[qid] === option;
                return (
                  <Pressable
                    key={`${qid}-${index}`}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => handleAnswerSelect(qid, option)}
                  >
                    <View
                      style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          isSelected && styles.optionLetterTextSelected,
                        ]}
                      >
                        {optionLabel}
                      </Text>
                    </View>
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                    >
                      {option}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />
                    ) : null}
                  </Pressable>
                );
              })}
              {!options.length ? (
                <Text style={styles.noOptions}>No options available for this question.</Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {!isSubmitted ? (
        <GlassPanel style={styles.footer} radius={0} bordered={false}>
          <View style={styles.navRow}>
            <Pressable
              style={[styles.navBtn, currentQuestionIndex === 0 && styles.navBtnDisabled]}
              onPress={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <Ionicons name="arrow-back" size={16} color="#111827" />
              <Text style={styles.navBtnText}>Previous</Text>
            </Pressable>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <Pressable style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                style={[styles.submitBtn, isSubmitting && styles.navBtnDisabled]}
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Quiz</Text>
                )}
              </Pressable>
            )}
          </View>
        </GlassPanel>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: '#64748b' },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  notFoundTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  notFoundSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.9)',
  },
  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { padding: 4 },
  topTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  topSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timerText: { fontSize: 14, fontWeight: '800', color: '#dc2626' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 14 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  description: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  difficultyBadge: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#f8fafc',
  },
  difficultyText: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'capitalize' },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', backgroundColor: '#a855f7', borderRadius: 999 },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  questionStem: { width: '100%' },
  optionsList: { gap: 10 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  optionCardSelected: {
    borderColor: '#a855f7',
    backgroundColor: '#faf5ff',
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterSelected: { backgroundColor: '#a855f7' },
  optionLetterText: { fontSize: 13, fontWeight: '800', color: '#374151' },
  optionLetterTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 15, color: '#111827', lineHeight: 21 },
  optionTextSelected: { color: '#5b21b6', fontWeight: '600' },
  noOptions: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  resultsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultsTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  resultsPct: {
    fontSize: 52,
    fontWeight: '900',
    color: '#7c3aed',
    textAlign: 'center',
  },
  resultsScore: { textAlign: 'center', color: '#64748b', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  statCorrect: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statIncorrect: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statSkip: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  dashboardBtn: {
    marginTop: 4,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dashboardBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.9)',
  },
  navRow: { flexDirection: 'row', gap: 10 },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  navBtnDisabled: { opacity: 0.45 },
  navBtnText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#a855f7',
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  submitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
