import { storageGetItem } from '../../lib/safe-storage';
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '../../lib/api-config';
import { GlassPanel } from '../ui';

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject: { _id: string; name: string } | string;
  classNumber?: string;
  difficulty?: string;
  totalQuestions?: number;
  scheduleType?: string;
  activityType?: string;
  questionBankSource?: string;
  dailyPickCount?: number;
  createdAt?: string;
}

interface SubjectWithQuizzes {
  _id: string;
  name: string;
  quizzes: Quiz[];
  totalQuizzes: number;
  totalQuestions: number;
  difficulties: string[];
  latestScore?: number;
  isDaily?: boolean;
}

type DailyHistoryRow = {
  dateKey: string;
  score: number | null;
  correctCount?: number;
  totalQuestions?: number;
  completedAt?: string;
};

type DailyStatus = {
  today: {
    dateKey: string;
    completed: boolean;
    score: number | null;
    correctCount: number;
    totalQuestions: number;
    completedAt?: string | null;
  };
  history: DailyHistoryRow[];
  nextUnlockDateKey: string;
  lockedUntilTomorrow: boolean;
};

function isDailyQuiz(quiz: Quiz) {
  return quiz.questionBankSource === 'daily-quiz-xlsx' || quiz.activityType === 'daily';
}

function formatDateKeyLabel(dateKey: string) {
  try {
    const d = new Date(`${dateKey}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateKey;
  }
}

type Props = {
  embedded?: boolean;
};

export default function DailyQuizPanel({ embedded = false }: Props) {
  const [subjects, setSubjects] = useState<SubjectWithQuizzes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const loadedOnce = useRef(false);

  const openPreviousResult = useCallback((dateKey?: string) => {
    const key = String(dateKey || dailyStatus?.today?.dateKey || dailyStatus?.history?.[0]?.dateKey || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      Alert.alert('No Result Yet', 'Finish today’s daily quiz to view a saved review.');
      return;
    }
    router.push({ pathname: '/daily-quiz-review', params: { dateKey: key } });
  }, [dailyStatus]);

  const load = useCallback(async () => {
    try {
      if (!loadedOnce.current) setIsLoading(true);
      const token = await storageGetItem('authToken');
      const [quizzesResponse, resultsResponse, dailyStatusResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/iq-rank-quizzes`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-results`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/student/daily-quiz-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (dailyStatusResponse.ok) {
        const dailyJson = await dailyStatusResponse.json();
        if (dailyJson?.data) setDailyStatus(dailyJson.data as DailyStatus);
        else setDailyStatus(null);
      } else {
        setDailyStatus(null);
      }

      const scoreByQuiz = new Map<string, number>();
      const scoreBySubject = new Map<string, number>();
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = resultsData.data || [];
        results.forEach((result: any) => {
          if (result.quizId) scoreByQuiz.set(String(result.quizId), Number(result.score) || 0);
          if (result.subjectId) scoreBySubject.set(String(result.subjectId), Number(result.score) || 0);
        });
      }

      if (!quizzesResponse.ok) {
        setSubjects([]);
        return;
      }

      const quizzesData = await quizzesResponse.json();
      const quizzes: Quiz[] = Array.isArray(quizzesData.data) ? quizzesData.data : [];

      quizzes.sort((a, b) => Number(isDailyQuiz(b)) - Number(isDailyQuiz(a)));

      const subjectMap = new Map<string, SubjectWithQuizzes>();
      for (const quiz of quizzes) {
        const daily = isDailyQuiz(quiz);
        const subjectId = daily
          ? 'daily-quiz'
          : typeof quiz.subject === 'object'
            ? String(quiz.subject?._id || '')
            : String(quiz.subject || '');
        const subjectName = daily
          ? 'Daily Quiz'
          : typeof quiz.subject === 'object'
            ? String(quiz.subject?.name || 'Subject')
            : 'Subject';
        if (!subjectId) continue;
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            _id: subjectId,
            name: subjectName,
            quizzes: [],
            totalQuizzes: 0,
            totalQuestions: 0,
            difficulties: [],
            isDaily: daily,
            latestScore: scoreBySubject.get(
              typeof quiz.subject === 'object'
                ? String(quiz.subject?._id || '')
                : String(quiz.subject || ''),
            ),
          });
        }
        const bucket = subjectMap.get(subjectId)!;
        bucket.quizzes.push(quiz);
        bucket.totalQuizzes += 1;
        bucket.totalQuestions += Number(
          daily ? quiz.dailyPickCount || quiz.totalQuestions || 5 : quiz.totalQuestions || 0,
        );
        if (quiz.difficulty && !bucket.difficulties.includes(quiz.difficulty)) {
          bucket.difficulties.push(quiz.difficulty);
        }
        const quizScore = scoreByQuiz.get(String(quiz._id));
        if (quizScore != null) bucket.latestScore = quizScore;
      }

      const ordered = Array.from(subjectMap.values()).sort((a, b) => {
        if (a._id === 'daily-quiz') return -1;
        if (b._id === 'daily-quiz') return 1;
        return a.name.localeCompare(b.name);
      });
      setSubjects(ordered);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
      setSubjects([]);
    } finally {
      loadedOnce.current = true;
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <View>
      {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Loading Quizzes...</Text>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No Quizzes Available</Text>
            <Text style={styles.emptySubtext}>Quizzes Assigned To You Will Appear Here</Text>
          </View>
        ) : (
          <View style={[styles.subjectsList, embedded && styles.subjectsListEmbedded]}>
            {subjects.map((subject) => (
              <GlassPanel key={subject._id} style={styles.subjectCardInner} radius={12} tone="medium">
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectIcon}>
                    <Ionicons name="book" size={24} color="#0284c7" />
                  </View>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectStats}>
                      {subject.totalQuizzes} quizzes • {subject.totalQuestions} questions
                    </Text>
                  </View>
                  {subject.latestScore !== undefined ? (
                    <View style={styles.scoreBadge}>
                      <Ionicons name="trophy" size={16} color="#f59e0b" />
                      <Text style={styles.scoreText}>{subject.latestScore}%</Text>
                    </View>
                  ) : null}
                </View>

                {subject.difficulties.length > 0 ? (
                  <View style={styles.difficultiesRow}>
                    {subject.difficulties.map((diff) => (
                      <View
                        key={diff}
                        style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(diff) + '20' }]}
                      >
                        <Text style={[styles.difficultyText, { color: getDifficultyColor(diff) }]}>
                          {diff}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={{ gap: 8, marginTop: 10 }}>
                  {subject.quizzes.map((quiz) => {
                    const daily = isDailyQuiz(quiz);
                    const dailyLocked = daily && Boolean(dailyStatus?.lockedUntilTomorrow);
                    const todayScore =
                      daily && dailyStatus?.today?.completed
                        ? dailyStatus.today.score
                        : subject.latestScore;
                    return (
                      <View
                        key={quiz._id}
                        style={[styles.quizItem, daily && styles.quizItemDaily]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.quizItemTitle} numberOfLines={1}>
                            {quiz.title}
                          </Text>
                          <Text style={styles.quizItemMeta} numberOfLines={2}>
                            {daily
                              ? `Today · ${quiz.dailyPickCount || 5} Q · your class only`
                              : [
                                  quiz.scheduleType && quiz.scheduleType !== 'once'
                                    ? quiz.scheduleType
                                    : null,
                                  quiz.difficulty,
                                  quiz.totalQuestions != null ? `${quiz.totalQuestions} Q` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </Text>
                          {dailyLocked ? (
                            <Text style={styles.lockedHint}>
                              Today’s score {todayScore != null ? `${todayScore}%` : '—'} · unlocks{' '}
                              {dailyStatus?.nextUnlockDateKey
                                ? formatDateKeyLabel(dailyStatus.nextUnlockDateKey)
                                : 'Tomorrow'}
                            </Text>
                          ) : null}
                        </View>
                        {dailyLocked ? (
                          <View style={styles.quizActions}>
                            <TouchableOpacity
                              style={styles.outlineBtn}
                              activeOpacity={0.85}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={() => openPreviousResult(dailyStatus?.today?.dateKey)}
                            >
                              <Text style={styles.outlineBtnText}>View Result</Text>
                            </TouchableOpacity>
                            <View style={styles.lockedBtn}>
                              <Ionicons name="lock-closed" size={14} color="#64748b" />
                              <Text style={styles.lockedBtnText}>Locked</Text>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.startChip}
                            activeOpacity={0.85}
                            onPress={() =>
                              router.push({
                                pathname: '/iq-rank-boost-quiz/[quizId]',
                                params: {
                                  quizId: String(quiz._id),
                                  ...(embedded ? { from: 'learning' } : {}),
                                },
                              })
                            }
                          >
                            <Ionicons name="play" size={14} color="#fff" />
                            <Text style={styles.startChipText}>Start</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>

                {subject.isDaily || subject._id === 'daily-quiz' ? (
                  <View style={styles.dailyExtras}>
                    <View style={styles.unlockCard}>
                      <View style={styles.unlockHeader}>
                        <Ionicons name="lock-closed" size={14} color="#0369a1" />
                        <Text style={styles.unlockTitle}>Next Unlock</Text>
                      </View>
                      <Text style={styles.unlockBody}>
                        {dailyStatus?.lockedUntilTomorrow
                          ? 'Tomorrow’s daily quiz unlocks at midnight (IST).'
                          : 'Finish today’s daily quiz to keep your streak.'}
                      </Text>
                      <View style={styles.unlockPill}>
                        <Ionicons name="calendar" size={12} color="#0284c7" />
                        <Text style={styles.unlockPillText}>
                          Unlocks{' '}
                          {dailyStatus?.nextUnlockDateKey
                            ? formatDateKeyLabel(dailyStatus.nextUnlockDateKey)
                            : 'Tomorrow'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.prevCard}>
                      <View style={styles.unlockHeader}>
                        <Ionicons name="trophy" size={14} color="#0f766e" />
                        <Text style={[styles.unlockTitle, { color: '#0f766e' }]}>Previous Results</Text>
                      </View>
                      {dailyStatus?.history?.length ? (
                        dailyStatus.history.map((row) => (
                          <TouchableOpacity
                            key={row.dateKey}
                            style={styles.prevRow}
                            activeOpacity={0.8}
                            onPress={() => openPreviousResult(row.dateKey)}
                          >
                            <Text style={styles.prevDate}>{formatDateKeyLabel(row.dateKey)}</Text>
                            <View style={styles.prevScoreRow}>
                              <Text style={styles.prevScore}>
                                {row.score != null ? `${row.score}%` : '—'}
                              </Text>
                              <Ionicons name="chevron-forward" size={16} color="#38bdf8" />
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.prevEmpty}>
                          No saved daily scores yet. Finish today’s quiz to start your record.
                        </Text>
                      )}
                      <Text style={styles.prevHint}>Tap A Day To Review Answers</Text>
                    </View>
                  </View>
                ) : null}
              </GlassPanel>
            ))}
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1 },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b' },
  emptyContainer: { alignItems: 'center', padding: 48 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#334155' },
  emptySubtext: { marginTop: 4, fontSize: 13, color: '#64748b' },
  subjectsList: { padding: 16, gap: 12 },
  subjectsListEmbedded: { padding: 0, gap: 12 },
  subjectCardInner: { padding: 14 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  subjectStats: { fontSize: 12, color: '#64748b', marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  difficultiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  difficultyBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  difficultyText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  quizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quizItemDaily: {
    backgroundColor: '#f0f9ff',
    borderColor: '#7dd3fc',
  },
  quizItemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  quizItemMeta: { fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
  lockedHint: { marginTop: 4, fontSize: 11, color: '#0f766e', fontWeight: '600' },
  quizActions: { gap: 6, alignItems: 'stretch' },
  outlineBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outlineBtnText: { fontSize: 11, fontWeight: '700', color: '#0369a1', textAlign: 'center' },
  lockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lockedBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  startChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startChipText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  dailyExtras: { marginTop: 14, gap: 10 },
  unlockCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    padding: 12,
  },
  unlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  unlockTitle: { fontSize: 13, fontWeight: '800', color: '#0369a1' },
  unlockBody: { fontSize: 12, color: '#475569', lineHeight: 17 },
  unlockPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  unlockPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  prevCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    backgroundColor: '#fff',
    padding: 12,
  },
  prevRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 6,
  },
  prevDate: { fontSize: 13, fontWeight: '600', color: '#334155' },
  prevScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prevScore: { fontSize: 13, fontWeight: '800', color: '#0f766e' },
  prevEmpty: { fontSize: 12, color: '#64748b', marginTop: 4 },
  prevHint: { marginTop: 8, fontSize: 10, color: '#94a3b8' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  modalSub: { marginTop: 2, fontSize: 12, color: '#64748b' },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: { alignItems: 'center', paddingVertical: 40 },
  reviewScoreCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reviewScoreLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  reviewScoreValue: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 2 },
  reviewScoreMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  reviewQCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  reviewQTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewQLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  reviewBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#d1fae5' },
  badgeBad: { backgroundColor: '#fee2e2' },
  badgeSkip: { backgroundColor: '#f1f5f9' },
  reviewBadgeText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  reviewPrompt: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  reviewOpt: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reviewOptOk: { borderColor: '#6ee7b7', backgroundColor: '#ecfdf5' },
  reviewOptBad: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  reviewOptText: { fontSize: 13, color: '#334155' },
  reviewExplain: { marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' },
});
