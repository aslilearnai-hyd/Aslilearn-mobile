import { storageGetItem } from '../src/lib/safe-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';

type DailyReviewQuestion = {
  questionText: string;
  options?: { text: string; isCorrect?: boolean }[];
  correctAnswer?: string;
  userAnswer?: string | null;
  isCorrect?: boolean;
  explanation?: string;
};

type DailyReviewPayload = {
  dateKey: string;
  score: number;
  correctCount: number;
  incorrectCount: number;
  unattempted: number;
  totalQuestions: number;
  questions: DailyReviewQuestion[];
};

function asParam(value?: string | string[]) {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
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

export default function DailyQuizReviewScreen() {
  const params = useLocalSearchParams<{ dateKey?: string }>();
  const dateKey = asParam(params.dateKey);
  const [dashboardPath, setDashboardPath] = useState('/dashboard');
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<DailyReviewPayload | null>(null);

  useEffect(() => {
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(dashboardPath);
  }, [dashboardPath]);

  useEffect(() => {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      setLoading(false);
      setReview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = await storageGetItem('authToken');
        const res = await fetch(
          `${API_BASE_URL}/api/student/daily-quiz-result/${encodeURIComponent(dateKey)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.success || !json?.data) {
          Alert.alert('Could not open result', json?.message || 'No saved review for that day.');
          setReview(null);
          return;
        }
        setReview(json.data as DailyReviewPayload);
      } catch {
        if (!cancelled) {
          Alert.alert('Could not open result', 'Check your connection and try again.');
          setReview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {review ? `Daily quiz · ${formatDateKeyLabel(review.dateKey)}` : 'Previous result'}
          </Text>
          <Text style={styles.sub}>
            {loading ? 'Loading your saved review…' : 'Your saved answers and score'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading review…</Text>
        </View>
      ) : review ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={['#0ea5e9', '#0d9488']} style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{review.score}%</Text>
            <Text style={styles.scoreMeta}>
              {review.correctCount}/{review.totalQuestions} correct
            </Text>
          </LinearGradient>
          {(review.questions || []).map((q, index) => {
            const expected = q.correctAnswer || q.options?.find((o) => o.isCorrect)?.text || '';
            const userAnswer = q.userAnswer;
            const isCorrect = q.isCorrect ?? Boolean(userAnswer && userAnswer === expected);
            const isAnswered = Boolean(userAnswer);
            return (
              <View key={`q-${index}`} style={styles.qCard}>
                <View style={styles.qTop}>
                  <Text style={styles.qLabel}>Q{index + 1}</Text>
                  <View
                    style={[
                      styles.badge,
                      isCorrect ? styles.badgeOk : isAnswered ? styles.badgeBad : styles.badgeSkip,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Skipped'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.prompt}>{q.questionText}</Text>
                {(q.options || []).map((option, optIndex) => {
                  const selected = userAnswer === option.text;
                  const correctOpt = Boolean(option.isCorrect) || option.text === expected;
                  return (
                    <View
                      key={`${index}-opt-${optIndex}`}
                      style={[
                        styles.opt,
                        correctOpt && styles.optOk,
                        selected && !correctOpt && styles.optBad,
                      ]}
                    >
                      <Text style={styles.optText}>
                        {String.fromCharCode(65 + optIndex)}. {option.text}
                      </Text>
                    </View>
                  );
                })}
                {q.explanation ? <Text style={styles.explain}>{q.explanation}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={42} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No review found</Text>
          <Text style={styles.emptySub}>This day’s daily quiz result is not saved yet.</Text>
          <TouchableOpacity style={styles.backChip} onPress={goBack} activeOpacity={0.85}>
            <Text style={styles.backChipText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sub: { marginTop: 2, fontSize: 13, color: '#64748b' },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b' },
  scoreCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  scoreLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  scoreValue: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 2 },
  scoreMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  qCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  qTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#d1fae5' },
  badgeBad: { backgroundColor: '#fee2e2' },
  badgeSkip: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  prompt: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  opt: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optOk: { borderColor: '#6ee7b7', backgroundColor: '#ecfdf5' },
  optBad: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  optText: { fontSize: 13, color: '#334155' },
  explain: { marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '800', color: '#334155' },
  emptySub: { marginTop: 4, fontSize: 13, color: '#64748b', textAlign: 'center' },
  backChip: {
    marginTop: 16,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backChipText: { color: '#fff', fontWeight: '800' },
});
