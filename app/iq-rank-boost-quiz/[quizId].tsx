import { storageGetItem } from '../../src/lib/safe-storage';
import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../src/lib/api-config';
import { GlassPanel } from '../../src/components/ui';
import { STUDENT } from '../../src/theme/student';
import {
  setStudentDashboardTabIntent,
  setLearningPathsSubTabIntent,
} from '../../src/lib/dashboard-tab-intent';

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation?: string;
  difficulty: string;
  subject: {
    _id: string;
    name: string;
  } | string;
}

const LIST_PATH = '/dashboard';

function resolveCorrectAnswer(question: Question): string {
  if (question.correctAnswer) return String(question.correctAnswer);
  const correct = question.options?.find((o) => o.isCorrect);
  return correct?.text ? String(correct.text) : '';
}

function asParam(value?: string | string[]) {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

export default function IQRankBoostQuiz() {
  const params = useLocalSearchParams<{ quizId: string; from?: string }>();
  const quizId = asParam(params.quizId);
  const fromLearning = asParam(params.from) === 'learning';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState('Quiz');
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
  } | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyMeta, setDailyMeta] = useState<{
    dateKey?: string;
    completed?: boolean;
    score?: number;
    pickCount?: number;
  } | null>(null);
  const [lockedUntilTomorrow, setLockedUntilTomorrow] = useState(false);

  useEffect(() => {
    if (quizId) void fetchQuiz();
  }, [quizId]);

  const goToQuizList = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fromLearning) {
      setStudentDashboardTabIntent('learning');
      setLearningPathsSubTabIntent('quizzes');
      router.replace('/dashboard');
      return;
    }
    router.replace('/iq-rank-boost-subjects');
  }, [fromLearning]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goToQuizList();
      return true;
    });
    return () => sub.remove();
  }, [goToQuizList]);

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      setHasStarted(false);
      setIsSubmitted(false);
      setResults(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      const token = await storageGetItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-questions?quizId=${encodeURIComponent(String(quizId))}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const fetched = data.data || data.questions || [];
        const dailyBank =
          data.quiz?.questionBankSource === 'daily-quiz-xlsx' ||
          data.quiz?.activityType === 'daily' ||
          Boolean(data.daily);
        setIsDaily(Boolean(dailyBank));
        setDailyMeta(data.daily || null);
        // Keep API order for daily (category spread). Only shuffle one-off quizzes.
        setQuestions(dailyBank ? fetched : [...fetched].sort(() => Math.random() - 0.5));
        if (data.quiz?.title) setQuizTitle(String(data.quiz.title));
        const subject = data.quiz?.subject || fetched[0]?.subject;
        if (subject) {
          setSubjectName(typeof subject === 'object' ? subject?.name || '' : '');
        }

        if (dailyBank && data.daily?.completed) {
          const total = Number(data.daily.pickCount) || fetched.length || 5;
          let score = data.daily.score != null ? Number(data.daily.score) : null;
          let correct = 0;
          try {
            const statusRes = await fetch(`${API_BASE_URL}/api/student/daily-quiz-status`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (statusRes.ok) {
              const statusJson = await statusRes.json();
              const today = statusJson?.data?.today;
              if (today?.completed) {
                const t = Number(today.totalQuestions) || total;
                correct = Number(today.correctCount) || 0;
                score = today.score != null ? Number(today.score) : score;
                setResults({
                  total: t,
                  correct,
                  incorrect: Math.max(0, t - correct),
                  unattempted: 0,
                  score: score ?? 0,
                });
                setIsSubmitted(true);
                setLockedUntilTomorrow(true);
                setHasStarted(true);
                return;
              }
            }
          } catch {
            /* fall through */
          }
          if (score != null) {
            setResults({
              total,
              correct: 0,
              incorrect: 0,
              unattempted: 0,
              score,
            });
            setIsSubmitted(true);
            setLockedUntilTomorrow(true);
            setHasStarted(true);
          }
        }
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const questionId = questions[currentQuestionIndex]._id;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    questions.forEach((question) => {
      const userAnswer = answers[question._id];
      const expected = resolveCorrectAnswer(question);
      if (!userAnswer) unattempted += 1;
      else if (userAnswer === expected) correct += 1;
      else incorrect += 1;
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setResults({ total: questions.length, correct, incorrect, unattempted, score });
    setIsSubmitted(true);

    try {
      const token = await storageGetItem('authToken');
      const subjectId =
        questions.length > 0 && questions[0].subject
          ? typeof questions[0].subject === 'object'
            ? questions[0].subject._id
            : questions[0].subject
          : null;

      const res = await fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-result`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          subjectId,
          subject: subjectId,
          totalQuestions: questions.length,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          unattempted,
          score,
          answers,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 || data?.code === 'DAILY_QUIZ_ALREADY_COMPLETED') {
        setLockedUntilTomorrow(true);
        Alert.alert(
          'Already completed today',
          data?.message || 'Come back tomorrow for a new daily quiz.',
        );
        return;
      }
      if (!res.ok || !data?.success) {
        Alert.alert(
          'Could not save result',
          data?.message || 'Your score is shown, but saving failed. Try again later.',
        );
        return;
      }
      if (data?.daily?.lockedUntilTomorrow || isDaily) {
        setLockedUntilTomorrow(true);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Could not save result', 'Check your connection and try again.');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion._id] : null;
  const answeredCount = Object.keys(answers).length;
  const progress =
    questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const scoreColors = useMemo(() => {
    const s = results?.score ?? 0;
    if (s >= 80) return ['#10b981', '#0d9488'] as const;
    if (s >= 50) return ['#0284c7', '#4f46e5'] as const;
    return ['#f43f5e', '#f97316'] as const;
  }, [results?.score]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={STUDENT.primary} />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoading && questions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={42} color="#94a3b8" />
          <Text style={styles.emptyText}>No questions available</Text>
          <Text style={styles.emptySub}>
            This quiz may not be assigned to your class or trial account.
          </Text>
          <TouchableOpacity style={styles.nextButton} onPress={() => goToQuizList()}>
            <Text style={styles.nextButtonText}>Back to quizzes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasStarted && !isSubmitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.lobbyScroll} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#0284c7', '#0d9488']} style={styles.lobbyHero}>
            <TouchableOpacity onPress={() => goToQuizList()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.lobbyEyebrow}>{isDaily ? 'TODAY’S SET' : 'READY TO START'}</Text>
            <Text style={styles.lobbyTitle}>{quizTitle}</Text>
            {subjectName ? <Text style={styles.lobbySub}>{subjectName}</Text> : null}
          </LinearGradient>
          <GlassPanel style={styles.lobbyCard} radius={18}>
            <Text style={styles.lobbyCardTitle}>
              {isDaily ? `${questions.length} questions for your class` : `${questions.length} questions`}
            </Text>
            <Text style={styles.lobbyCardBody}>
              {isDaily
                ? 'Same style every day: 5 questions from IQ, reasoning, vocab, maths & science — only from your class bank. Different set tomorrow.'
                : 'Answer carefully. You can jump between questions before submitting.'}
            </Text>
            {dailyMeta?.completed || lockedUntilTomorrow ? (
              <Text style={styles.lobbyDone}>
                You already completed today’s set. Come back tomorrow for a new quiz.
              </Text>
            ) : null}
            {dailyMeta?.completed || lockedUntilTomorrow ? (
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: '#94a3b8' }]}
                onPress={() => goToQuizList()}
              >
                <Ionicons name="lock-closed" size={18} color="#fff" />
                <Text style={styles.startBtnText}>Locked until tomorrow</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.startBtn} onPress={() => setHasStarted(true)}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.startBtnText}>Start quiz</Text>
              </TouchableOpacity>
            )}
          </GlassPanel>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isSubmitted && results) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[...scoreColors]} style={styles.resultsHero}>
            <Text style={styles.resultsEyebrow}>Quiz complete</Text>
            <Text style={styles.resultsTitle} numberOfLines={2}>
              {quizTitle}
            </Text>
            {subjectName ? <Text style={styles.resultsSubject}>{subjectName}</Text> : null}
            <View style={styles.scoreRow}>
              <Text style={styles.scoreBig}>{results.score}%</Text>
              <Text style={styles.scoreHint}>score</Text>
            </View>
            <View style={styles.statsRow}>
              {[
                { label: 'Total', value: results.total },
                { label: 'Correct', value: results.correct },
                { label: 'Wrong', value: results.incorrect },
                { label: 'Skipped', value: results.unattempted },
              ].map((stat) => (
                <View key={stat.label} style={styles.statPill}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.heroBtn} onPress={() => goToQuizList()}>
              <Text style={styles.heroBtnText}>Back to quizzes</Text>
            </TouchableOpacity>
            {lockedUntilTomorrow || isDaily ? (
              <Text style={[styles.lobbyDone, { color: 'rgba(255,255,255,0.95)', marginTop: 10 }]}>
                Today’s set is saved. Next daily quiz unlocks tomorrow.
              </Text>
            ) : null}
          </LinearGradient>

          <Text style={styles.reviewHeading}>Review</Text>
          {questions.map((question, index) => {
            const userAnswer = answers[question._id];
            const expected = resolveCorrectAnswer(question);
            const isCorrect = Boolean(userAnswer && userAnswer === expected);
            const isAnswered = Boolean(userAnswer);
            return (
              <GlassPanel key={question._id} style={styles.reviewCard} radius={16}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewQ}>Q{index + 1}</Text>
                  <View
                    style={[
                      styles.reviewBadge,
                      isCorrect
                        ? styles.badgeOk
                        : isAnswered
                          ? styles.badgeBad
                          : styles.badgeSkip,
                    ]}
                  >
                    <Text style={styles.reviewBadgeText}>
                      {isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Skipped'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewPrompt}>{question.questionText}</Text>
                {(question.options || []).map((option, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const selected = userAnswer === option.text;
                  const correctOpt = option.isCorrect || option.text === expected;
                  return (
                    <View
                      key={`${question._id}-opt-${optIndex}`}
                      style={[
                        styles.reviewOpt,
                        correctOpt && styles.reviewOptOk,
                        selected && !correctOpt && styles.reviewOptBad,
                      ]}
                    >
                      <Text style={styles.reviewOptText}>
                        {letter}. {option.text}
                      </Text>
                    </View>
                  );
                })}
                {question.explanation ? (
                  <View style={styles.explainBox}>
                    <Text style={styles.explainText}>
                      <Text style={styles.explainLabel}>Why: </Text>
                      {question.explanation}
                    </Text>
                  </View>
                ) : null}
              </GlassPanel>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={42} color="#94a3b8" />
          <Text style={styles.emptyText}>No questions available</Text>
          <Text style={styles.emptySub}>
            This quiz may not be assigned to your class or trial account.
          </Text>
          <TouchableOpacity style={styles.nextButton} onPress={() => goToQuizList()}>
            <Text style={styles.nextButtonText}>Back to quizzes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#0284c7', '#4f46e5']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => goToQuizList()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>QUIZ</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {quizTitle}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subjectName ? `${subjectName} · ` : ''}Q{currentQuestionIndex + 1} of {questions.length}
              {` · ${answeredCount} answered`}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <GlassPanel style={styles.questionCard} radius={18}>
          <View style={styles.questionMeta}>
            <View style={styles.qPill}>
              <Text style={styles.qPillText}>Q{currentQuestionIndex + 1}</Text>
            </View>
            {currentQuestion.difficulty ? (
              <Text style={styles.diffText}>{String(currentQuestion.difficulty)}</Text>
            ) : null}
          </View>
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
        </GlassPanel>

        <View style={styles.optionsList}>
          {(currentQuestion.options || []).map((option, index) => {
            const selected = selectedAnswer === option.text;
            const letter = String.fromCharCode(65 + index);
            return (
              <Pressable
                key={`${currentQuestion._id}-${index}`}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => handleAnswerSelect(option.text)}
              >
                <View style={[styles.optionBullet, selected && styles.optionBulletSelected]}>
                  <Text style={[styles.optionBulletText, selected && styles.optionBulletTextSelected]}>
                    {letter}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.text}
                </Text>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selected ? '#0284c7' : '#cbd5e1'}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.jumpLabel}>Jump to question</Text>
        <View style={styles.jumpRow}>
          {questions.map((q, index) => {
            const answered = Boolean(answers[q._id]);
            const current = index === currentQuestionIndex;
            return (
              <TouchableOpacity
                key={q._id}
                style={[
                  styles.jumpBtn,
                  current && styles.jumpCurrent,
                  !current && answered && styles.jumpAnswered,
                ]}
                onPress={() => setCurrentQuestionIndex(index)}
              >
                <Text
                  style={[
                    styles.jumpBtnText,
                    current && styles.jumpBtnTextCurrent,
                    !current && answered && styles.jumpBtnTextAnswered,
                  ]}
                >
                  {index + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          disabled={currentQuestionIndex === 0}
          onPress={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentQuestionIndex === 0 ? '#94a3b8' : '#0284c7'}
          />
          <Text
            style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestionIndex < questions.length - 1 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={() => void handleSubmit()}>
            <Text style={styles.nextButtonText}>Submit quiz</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyText: { fontSize: 17, color: '#334155', fontWeight: '800' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  header: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: '#fff' },
  content: { flex: 1 },
  contentInner: { paddingBottom: 24 },
  questionCard: { margin: 16, marginBottom: 12, padding: 18 },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qPill: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qPillText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  diffText: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'capitalize' },
  questionText: { fontSize: 17, fontWeight: '700', color: '#0f172a', lineHeight: 26 },
  optionsList: { paddingHorizontal: 16, gap: 10, marginBottom: 18 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  optionSelected: { borderColor: '#0284c7', backgroundColor: '#e0f2fe' },
  optionBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBulletSelected: { backgroundColor: '#0284c7' },
  optionBulletText: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  optionBulletTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 15, color: '#334155', fontWeight: '600' },
  optionTextSelected: { color: '#0c4a6e', fontWeight: '800' },
  jumpLabel: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  jumpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  jumpBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpCurrent: { backgroundColor: '#0284c7' },
  jumpAnswered: { backgroundColor: '#d1fae5' },
  jumpBtnText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  jumpBtnTextCurrent: { color: '#fff' },
  jumpBtnTextAnswered: { color: '#065f46' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { fontSize: 14, fontWeight: '700', color: '#0284c7' },
  navButtonTextDisabled: { color: '#94a3b8' },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  nextButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  lobbyScroll: { paddingBottom: 40 },
  lobbyHero: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  lobbyEyebrow: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lobbyTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 6 },
  lobbySub: { color: 'rgba(255,255,255,0.9)', marginTop: 6, fontSize: 14 },
  lobbyCard: { marginHorizontal: 16, marginTop: -12, padding: 18 },
  lobbyCardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  lobbyCardBody: { fontSize: 13, lineHeight: 19, color: '#64748b', marginBottom: 14 },
  lobbyDone: { fontSize: 12, color: '#0d9488', fontWeight: '600', marginBottom: 12 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  resultsScroll: { paddingBottom: 40 },
  resultsHero: {
    margin: 16,
    borderRadius: 24,
    padding: 20,
  },
  resultsEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  resultsTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  resultsSubject: { color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16, marginBottom: 16 },
  scoreBig: { color: '#fff', fontSize: 48, fontWeight: '900' },
  scoreHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 10 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 70,
  },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  heroBtn: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  reviewHeading: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  reviewCard: { marginHorizontal: 16, marginBottom: 12, padding: 14 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewQ: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  reviewBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#d1fae5' },
  badgeBad: { backgroundColor: '#fee2e2' },
  badgeSkip: { backgroundColor: '#e2e8f0' },
  reviewBadgeText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  reviewPrompt: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  reviewOpt: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  reviewOptOk: { borderColor: '#86efac', backgroundColor: '#ecfdf5' },
  reviewOptBad: { borderColor: '#fca5a5', backgroundColor: '#fff1f2' },
  reviewOptText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  explainBox: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    padding: 10,
  },
  explainLabel: { fontWeight: '800' },
  explainText: { fontSize: 13, color: '#0c4a6e', lineHeight: 18 },
});
