import { storageGetItem } from '../../../../src/lib/safe-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import { GlassPanel } from '../../../../src/components/ui';
import { STUDENT } from '../../../../src/theme/student';

type DailyHistoryRow = {
  dateKey: string;
  score: number | null;
};

type DailyStatus = {
  today: {
    dateKey: string;
    completed: boolean;
    score: number | null;
  };
  history: DailyHistoryRow[];
  nextUnlockDateKey: string;
  lockedUntilTomorrow: boolean;
};

type PanelQuiz = {
  _id: string;
  title: string;
  totalQuestions?: number;
  dailyPickCount?: number;
  questionBankSource?: string;
  activityType?: string;
  subject?: { name?: string } | string;
  isDaily: boolean;
};

function isDailyQuiz(q: any) {
  return q?.questionBankSource === 'daily-quiz-xlsx' || q?.activityType === 'daily';
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

export default function QuizPanelSection() {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<PanelQuiz[]>([]);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await storageGetItem('authToken');
      const [iqRes, dailyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/iq-rank-quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/student/daily-quiz-status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (dailyRes.ok) {
        const dailyJson = await dailyRes.json();
        setDailyStatus(dailyJson?.data || null);
      } else {
        setDailyStatus(null);
      }

      if (iqRes.ok) {
        const iqJson = await iqRes.json();
        const list = Array.isArray(iqJson?.data) ? iqJson.data : [];
        const mapped: PanelQuiz[] = list.map((q: any) => {
          const daily = isDailyQuiz(q);
          return {
            ...q,
            isDaily: daily,
            title: q.title || (daily ? 'Daily Quiz' : 'Quiz'),
            totalQuestions: daily
              ? Number(q.dailyPickCount) || Number(q.totalQuestions) || 5
              : Number(q.totalQuestions) || 0,
          };
        });
        mapped.sort((a, b) => Number(b.isDaily) - Number(a.isDaily));
        setQuizzes(mapped.slice(0, 4));
      } else {
        setQuizzes([]);
      }
    } catch {
      setQuizzes([]);
      setDailyStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openQuiz = (quiz: PanelQuiz) => {
    if (quiz.isDaily && dailyStatus?.lockedUntilTomorrow) {
      Alert.alert(
        'Already Completed',
        'You’ve finished today’s daily quiz. Tomorrow’s set unlocks after midnight (IST).'
      );
      return;
    }
    router.push({
      pathname: '/iq-rank-boost-quiz/[quizId]',
      params: { quizId: quiz._id },
    });
  };

  return (
    <GlassPanel style={styles.card} radius={18} tone="medium">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="locate" size={18} color="#0284c7" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Quiz</Text>
            <Text style={styles.subtitle}>Start A Quiz · See Your Previous %</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/iq-rank-boost-subjects')} activeOpacity={0.8}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#0284c7" />
        </View>
      ) : quizzes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="locate-outline" size={28} color="#7dd3fc" />
          <Text style={styles.emptyTitle}>No Quizzes Yet</Text>
          <Text style={styles.emptySub}>Assigned quizzes will show up here.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {quizzes.map((quiz) => {
            const dailyLocked = quiz.isDaily && Boolean(dailyStatus?.lockedUntilTomorrow);
            const prevPercent =
              quiz.isDaily && dailyStatus?.today?.completed
                ? dailyStatus.today.score
                : null;
            return (
              <View key={quiz._id} style={styles.item}>
                <View style={styles.itemTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {quiz.title}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {quiz.isDaily
                        ? 'Daily · Class Bank'
                        : typeof quiz.subject === 'object'
                          ? quiz.subject?.name || 'Quiz'
                          : 'Quiz'}
                    </Text>
                  </View>
                  <View style={[styles.badge, quiz.isDaily ? styles.badgeDaily : styles.badgeQuiz]}>
                    <Text style={[styles.badgeText, quiz.isDaily ? styles.badgeDailyText : styles.badgeQuizText]}>
                      {quiz.isDaily ? 'DAILY' : 'QUIZ'}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemMid}>
                  <View style={styles.qPill}>
                    <Ionicons name="time-outline" size={12} color="#0ea5e9" />
                    <Text style={styles.qPillText}>
                      {quiz.totalQuestions ? `${quiz.totalQuestions} Q` : 'Open'}
                    </Text>
                  </View>
                  {prevPercent != null ? (
                    <Text style={styles.prevPct}>{prevPercent}%</Text>
                  ) : (
                    <Text style={styles.notAttempted}>Not Attempted</Text>
                  )}
                </View>

                {dailyLocked ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.outlineBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        const key = dailyStatus?.today?.dateKey;
                        if (key) {
                          router.push({
                            pathname: '/daily-quiz-review',
                            params: { dateKey: key },
                          });
                        } else {
                          router.push('/iq-rank-boost-subjects');
                        }
                      }}
                    >
                      <Text style={styles.outlineBtnText}>View Today’s Result</Text>
                    </TouchableOpacity>
                    <View style={styles.lockedBtn}>
                      <Ionicons name="lock-closed" size={14} color="#64748b" />
                      <Text style={styles.lockedBtnText}>Locked Until Tomorrow</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => openQuiz(quiz)}>
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.startBtnText}>Start Quiz</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {dailyStatus || quizzes.some((q) => q.isDaily) ? (
        <View style={styles.extras}>
          <View style={styles.unlockCard}>
            <View style={styles.extraHeader}>
              <Ionicons name="lock-closed" size={14} color="#0369a1" />
              <Text style={styles.extraTitle}>Next Unlock</Text>
            </View>
            <Text style={styles.extraBody}>
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
            <View style={styles.prevHeader}>
              <View style={styles.extraHeader}>
                <Ionicons name="trophy" size={14} color="#0f766e" />
                <Text style={[styles.extraTitle, { color: '#0f766e' }]}>Previous Results</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/iq-rank-boost-subjects')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {dailyStatus?.history?.length ? (
              dailyStatus.history.slice(0, 5).map((row) => (
                <TouchableOpacity
                  key={row.dateKey}
                  style={styles.prevRow}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/daily-quiz-review',
                      params: { dateKey: row.dateKey },
                    })
                  }
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
                {dailyStatus
                  ? 'No saved daily scores yet. Complete today’s quiz to start your record.'
                  : 'Previous scores will appear here after you finish a daily quiz.'}
              </Text>
            )}
          </View>
        </View>
      ) : null}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  subtitle: { fontSize: 12, color: STUDENT.textMuted, marginTop: 1 },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  loadingBox: { paddingVertical: 28, alignItems: 'center' },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
  },
  emptyTitle: { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#475569' },
  emptySub: { marginTop: 2, fontSize: 11, color: '#94a3b8' },
  list: { gap: 10 },
  item: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    backgroundColor: '#f8fcff',
    padding: 12,
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemMeta: { marginTop: 2, fontSize: 11, color: '#64748b' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDaily: { backgroundColor: '#ccfbf1' },
  badgeQuiz: { backgroundColor: '#e0f2fe' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeDailyText: { color: '#0f766e' },
  badgeQuizText: { color: '#0369a1' },
  itemMid: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  qPillText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  prevPct: { fontSize: 13, fontWeight: '800', color: '#0f766e' },
  notAttempted: { fontSize: 12, color: '#94a3b8' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  outlineBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: '#0369a1' },
  lockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
  },
  lockedBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  extras: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
    gap: 10,
  },
  unlockCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    padding: 12,
  },
  extraHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  extraTitle: { fontSize: 12, fontWeight: '800', color: '#0369a1' },
  extraBody: { fontSize: 12, color: '#475569', lineHeight: 17 },
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
  prevHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  seeAll: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  prevRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  prevDate: { fontSize: 12, fontWeight: '600', color: '#334155' },
  prevScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  prevScore: { fontSize: 12, fontWeight: '800', color: '#0f766e' },
  prevEmpty: { marginTop: 4, fontSize: 11, color: '#64748b' },
});
