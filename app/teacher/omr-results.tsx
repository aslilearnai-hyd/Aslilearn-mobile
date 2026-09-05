import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../../src/services/api/api';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { EmptyState, ErrorState, LoadingState, GlassPanel } from '../../src/components/ui';
import { TEACHER, TEACHER_SPACING } from '../../src/theme/teacher';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Row = {
  _id: string;
  percentage: number;
  totalMarks: number;
  finalRank?: number | null;
  testTitle?: string;
  testNo?: string;
  student?: { fullName?: string; classNumber?: string; section?: string } | null;
};

export default function TeacherOmrResultsScreen() {
  useBackNavigation('/teacher/dashboard', false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/api/teacher/omr-results');
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e: any) {
      setError(e?.friendlyMessage || e?.message || 'Could not load results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEACHER.text} />
        </Pressable>
        <Text style={styles.title}>Offline Results</Text>
      </View>

      {loading ? (
        <LoadingState message="Loading Results…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No Offline Results"
          description="Scores appear after school admin uploads and assigns candidates."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          {rows.map((r) => (
            <GlassPanel key={r._id} style={styles.card}>
              <Text style={styles.name}>{r.student?.fullName || 'Student'}</Text>
              <Text style={styles.meta}>
                {r.student?.classNumber
                  ? `${r.student.classNumber}${r.student.section || ''}`
                  : ''}{' '}
                · {r.testTitle || 'OMR Test'}
              </Text>
              <View style={styles.row}>
                <Text style={styles.pct}>{r.percentage}%</Text>
                <Text style={styles.rank}>Rank {r.finalRank ?? '—'}</Text>
              </View>
            </GlassPanel>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TEACHER.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TEACHER_SPACING.md,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: TEACHER.text },
  list: { padding: TEACHER_SPACING.md, gap: 10, paddingBottom: 40 },
  card: { padding: 14 },
  name: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  meta: { marginTop: 4, fontSize: 12, color: TEACHER.textMuted },
  row: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  pct: { fontSize: 18, fontWeight: '800', color: TEACHER.primary },
  rank: { fontSize: 13, color: TEACHER.textMuted, fontWeight: '600' },
});
