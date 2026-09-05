import { storageGetItem } from '../../src/lib/safe-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, useAnimatedProps } from 'react-native-reanimated';
import { API_BASE_URL } from '../../src/services/api/api';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { AnimatedStatInput, useCountUp } from '../../src/hooks/useCountUp';
import { Badge, DonutChart, EmptyState, ErrorState, LoadingState, SearchBar } from '../../src/components/ui';
import StudentScreenHeader from '../../src/components/student/StudentScreenHeader';
import { useSchoolOnlyGuard } from '../../src/components/b2c/SchoolOnlyGuard';
import GlassCard from '../../src/components/student/GlassCard';
import ChipNav from '../../src/components/student/ChipNav';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../src/theme/student';
import { getMarksPercentage, normalizeExamResultFromApi } from '../../src/lib/exam-analysis-helpers';

const SORT_CHIPS = [
  { id: 'recent', label: 'Recent' },
  { id: 'score', label: 'Score' },
  { id: 'subject', label: 'Subject' },
];

type ResultItem = {
  _id?: string;
  subject?: string;
  examName?: string;
  title?: string;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  createdAt?: string;
  passed?: boolean;
};

function AnimatedPctLabel({ pct, size }: { pct: number; size: number }) {
  const value = useCountUp(pct, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.round(value.value)}%`,
  }));

  return (
    <AnimatedStatInput
      editable={false}
      animatedProps={animatedProps as never}
      style={[styles.pctLabel, { width: size, height: size }]}
      underlineColorAndroid="transparent"
    />
  );
}

function ResultCard({ r, index }: { r: ResultItem; index: number }) {
  const pct = r.percentage ?? (r.score && r.totalMarks ? Math.round((r.score / r.totalMarks) * 100) : 0);
  const passed = r.passed ?? pct >= 40;
  const chartSize = 72;

  return (
    <GlassCard variant="glass" animate delay={index * 60} style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.chartWrap}>
          <DonutChart
            size={chartSize}
            segments={[
              { value: pct, color: passed ? STUDENT.success : STUDENT.danger },
              { value: 100 - pct, color: STUDENT.surfaceBorder },
            ]}
          />
          <AnimatedPctLabel pct={pct} size={chartSize} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{r.examName || r.title || 'Exam'}</Text>
          <Text style={styles.cardSub}>{r.subject || 'Subject'}</Text>
          <Text style={styles.cardMarks}>
            {r.score ?? '—'}/{r.totalMarks ?? '—'} Marks
          </Text>
          <Badge label={passed ? 'Pass' : 'Fail'} color={passed ? STUDENT.success : STUDENT.danger} size="sm" />
        </View>
      </View>
    </GlassCard>
  );
}

export default function StudentResults() {
  const blocked = useSchoolOnlyGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ResultItem[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'score' | 'subject'>('recent');

  useBackNavigation('/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await storageGetItem('authToken');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const [examRes, omrRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/exam-results`, { headers }),
        fetch(`${API_BASE_URL}/api/student/omr-results`, { headers }),
      ]);
      if (!examRes.ok && !omrRes.ok) throw new Error('Failed To Load Results');

      const examData = examRes.ok ? await examRes.json() : null;
      const omrData = omrRes.ok ? await omrRes.json() : null;

      const examList = Array.isArray(examData)
        ? examData
        : examData?.results || examData?.data || [];
      const examItems: ResultItem[] = Array.isArray(examList)
        ? examList.map((row: any) => {
            const normalized = normalizeExamResultFromApi(row);
            const subjects = Object.keys(normalized.subjectWiseScore || {});
            return {
              _id: normalized._id,
              examName: normalized.examTitle,
              title: normalized.examTitle,
              score: normalized.obtainedMarks,
              totalMarks: normalized.totalMarks,
              percentage:
                normalized.totalMarks > 0
                  ? Math.round(getMarksPercentage(normalized))
                  : Math.round(normalized.percentage),
              createdAt: normalized.completedAt,
              subject: subjects[0] || 'Exam',
            } satisfies ResultItem;
          })
        : [];

      const omrHistory = Array.isArray(omrData?.data?.history) ? omrData.data.history : [];
      const omrItems: ResultItem[] = omrHistory.map((row: any) => ({
        _id: row._id,
        examName: row.testTitle || 'OMR Test',
        title: row.testTitle || 'OMR Test',
        score: row.totalMarks,
        totalMarks: row.totalQuestions || row.totalMarks,
        percentage: Math.round(row.percentage || 0),
        createdAt: row.batchCreatedAt || row.testDate,
        subject: 'OMR',
      }));

      setItems([...omrItems, ...examItems]);
    } catch (e: any) {
      setError(e?.message || 'Could Not Load Results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((r) => (r.subject || r.examName || r.title || '').toLowerCase().includes(q));
    }
    if (sort === 'score') list.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    else if (sort === 'subject') list.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
    else list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }, [items, query, sort]);

  if (blocked) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StudentScreenHeader title="Offline Results" onBack={() => router.back()} />

      <View style={styles.filters}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Filter By Subject..." />
        <ChipNav chips={SORT_CHIPS} active={sort} onChange={(id) => setSort(id as typeof sort)} />
      </View>

      {loading ? (
        <LoadingState variant="list" style={{ padding: STUDENT_SPACING.lg }} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} style={{ margin: STUDENT_SPACING.lg }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="scan-outline" title="No Offline Results Yet" subtitle="Your Offline Exam Results Will Show Here." />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
            {filtered.map((r, index) => (
              <ResultCard key={r._id || `${r.subject}-${r.createdAt}`} r={r} index={index} />
            ))}
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  filters: { padding: STUDENT_SPACING.lg, gap: STUDENT_SPACING.md },
  list: { paddingHorizontal: STUDENT_SPACING.lg, paddingBottom: STUDENT_SPACING.xxxl },
  card: { marginBottom: STUDENT_SPACING.md },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: STUDENT_SPACING.lg },
  chartWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  pctLabel: {
    position: 'absolute',
    textAlign: 'center',
    ...STUDENT_TYPO.body,
    fontWeight: '800',
    color: STUDENT.text,
    padding: 0,
    margin: 0,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { ...STUDENT_TYPO.body, fontWeight: '800', color: STUDENT.text },
  cardSub: { ...STUDENT_TYPO.caption, color: STUDENT.textSecondary },
  cardMarks: { ...STUDENT_TYPO.caption, color: STUDENT.textMuted, marginBottom: STUDENT_SPACING.xs },
});
