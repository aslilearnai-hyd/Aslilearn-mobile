import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import omrService, { type OmrTeacherRow } from '../../../src/services/api/omrService';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../../src/theme/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TeacherPageHero } from '../../../src/components/teacher';

export default function OmrResultsView() {
  const [rows, setRows] = useState<OmrTeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await omrService.getTeacherResults();
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.friendlyMessage || err?.message || 'Failed to load offline results');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = r.student?.fullName || '';
      const email = r.student?.email || '';
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        (r.candidateId || '').toLowerCase().includes(q) ||
        (r.testTitle || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={TEACHER.primary} />
      }
    >
      <TeacherPageHero
        title="Offline Results"
        subtitle="Offline scores for students in your classes (after school admin assigns Candidate IDs)."
        icon="scan-outline"
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={TEACHER.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Student Or Test"
          placeholderTextColor={TEACHER.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEACHER.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="scan-outline" size={40} color="#FDBA74" />
          <Text style={styles.emptyTitle}>No Offline Results Yet</Text>
          <Text style={styles.emptyBody}>
            Ask your school admin to upload the OMR Score List and assign candidates to students.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((r) => (
            <View key={r._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {r.student?.fullName || 'Student'}
                  </Text>
                  <Text style={styles.studentMeta} numberOfLines={1}>
                    {r.student?.classNumber
                      ? `Class ${r.student.classNumber}${r.student.section || ''}`
                      : r.candidateId}
                  </Text>
                </View>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctText}>{r.percentage}%</Text>
                </View>
              </View>
              <Text style={styles.testTitle} numberOfLines={2}>
                {r.testTitle || 'OMR Test'}
              </Text>
              <Text style={styles.testNo}>#{r.testNo || '—'}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Rank</Text>
                  <Text style={styles.statValue}>{r.finalRank ?? r.testRank ?? '—'}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Marks</Text>
                  <Text style={styles.statValue}>{r.totalMarks}</Text>
                </View>
                <View style={[styles.stat, { flex: 1.4 }]}>
                  <Text style={styles.statLabel}>M / P / C / B</Text>
                  <Text style={styles.statValueSmall}>
                    {r.maths?.marks ?? 0}/{r.physics?.marks ?? 0}/{r.chemistry?.marks ?? 0}/
                    {r.biology?.marks ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: TEACHER_SPACING.md, paddingBottom: 40, gap: 12 },
  header: { padding: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  subtitle: { marginTop: 2, fontSize: 12, color: TEACHER.textMuted, lineHeight: 16 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEACHER.text, paddingVertical: 0 },
  center: { paddingVertical: 48, alignItems: 'center' },
  emptyCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  emptyBody: { textAlign: 'center', fontSize: 13, color: TEACHER.textMuted, lineHeight: 18 },
  errorText: { color: TEACHER.danger, textAlign: 'center', fontSize: 13 },
  retryBtn: {
    marginTop: 6,
    backgroundColor: TEACHER.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  list: { gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: 16,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  studentName: { fontSize: 15, fontWeight: '800', color: TEACHER.text },
  studentMeta: { marginTop: 2, fontSize: 12, color: TEACHER.textMuted },
  pctBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pctText: { fontWeight: '800', color: '#C2410C', fontSize: 14 },
  testTitle: { marginTop: 10, fontSize: 13, fontWeight: '600', color: TEACHER.textSecondary },
  testNo: { marginTop: 2, fontSize: 11, color: TEACHER.textMuted },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEACHER.textMuted,
    textTransform: 'uppercase',
  },
  statValue: { marginTop: 2, fontSize: 16, fontWeight: '800', color: TEACHER.text },
  statValueSmall: { marginTop: 2, fontSize: 13, fontWeight: '700', color: TEACHER.text },
});
