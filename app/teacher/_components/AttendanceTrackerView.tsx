import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService from '../../../src/services/api/teacherService';
import { ActionButton, EmptyState, ErrorState, GlassPanel, LoadingState } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

type StudentRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  rollNo?: string;
  status?: 'present' | 'absent' | 'late';
};

export default function AttendanceTrackerView() {
  const [tab, setTab] = useState<'mark' | 'history'>('mark');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await teacherService.attendance();
      const data = res.data || {};
      const roster = data?.students || data?.roster || data?.data?.students || [];
      const hist = data?.history || data?.records || [];
      setStudents(
        (Array.isArray(roster) ? roster : []).map((s: StudentRow) => ({
          ...s,
          status: s.status || 'present',
        }))
      );
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (id: string, status: StudentRow['status']) => {
    setStudents((prev) => prev.map((s) => ((s._id || s.id) === id ? { ...s, status } : s)));
  };

  const markAllPresent = () => setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));

  const submit = async () => {
    setSubmitting(true);
    try {
      await teacherService.markAttendance({ students });
      await teacherService.invalidateCache('attendance');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState variant="list" />;

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {(['mark', 'history'] as const).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'mark' ? 'Mark' : 'History'}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <ErrorState message={error} onRetry={load} style={{ marginBottom: TEACHER_SPACING.md }} /> : null}

      {tab === 'mark' ? (
        <>
          <Pressable style={styles.bulkBtn} onPress={markAllPresent}>
            <Ionicons name="checkmark-done" size={16} color={TEACHER.primaryLight} />
            <Text style={styles.bulkText}>Mark All Present</Text>
          </Pressable>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {students.length === 0 ? (
              <EmptyState icon="people-outline" title="No Students" subtitle="Select a class to mark attendance." />
            ) : (
              students.map((s, index) => {
                const id = s._id || s.id || s.fullName || '';
                return (
                  <Animated.View
                    key={id}
                    entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}
                  >
                    <GlassPanel style={styles.row} radius={TEACHER_RADIUS.lg} tone="medium">
                      <View style={styles.rowBody}>
                        <View style={styles.rowInfo}>
                          <Text style={styles.name}>{s.fullName || s.name}</Text>
                          {s.rollNo ? <Text style={styles.roll}>Roll {s.rollNo}</Text> : null}
                        </View>
                        <View style={styles.statusRow}>
                          {(['present', 'absent', 'late'] as const).map((st) => (
                            <Pressable
                              key={st}
                              style={[
                                styles.statusBtn,
                                s.status === st && (st === 'present' ? styles.statusPresent : st === 'absent' ? styles.statusAbsent : styles.statusLate),
                              ]}
                              onPress={() => setStatus(String(id), st)}
                            >
                              <Text style={[styles.statusText, s.status === st && styles.statusTextActive]}>
                                {st[0].toUpperCase()}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </GlassPanel>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
          <ActionButton
            label="Submit Attendance"
            onPress={submit}
            loading={submitting}
            gradient={[TEACHER.primary, TEACHER.primaryDark]}
          />
        </>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {history.length === 0 ? (
            <EmptyState icon="time-outline" title="No History" subtitle="Past attendance records appear here." />
          ) : (
            history.map((h, i) => (
              <Animated.View key={i} entering={FadeInDown.duration(350).delay(Math.min(i * 60, 480))}>
                <GlassPanel style={styles.historyCard} radius={TEACHER_RADIUS.lg} tone="medium">
                  <Text style={styles.historyDate}>{h.date || h.createdAt || 'Record'}</Text>
                  <Text style={styles.historyMeta}>
                    Present: {h.present ?? '—'} • Absent: {h.absent ?? '—'}
                  </Text>
                </GlassPanel>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabs: { flexDirection: 'row', gap: TEACHER_SPACING.sm, marginBottom: TEACHER_SPACING.md },
  tab: {
    flex: 1,
    paddingVertical: TEACHER_SPACING.sm,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: TEACHER.navActiveBg, borderColor: TEACHER.primary },
  tabText: { ...TEACHER_TYPO.caption, color: TEACHER.textMuted },
  tabTextActive: { color: TEACHER.primaryLight },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: TEACHER_SPACING.sm, marginBottom: TEACHER_SPACING.md },
  bulkText: { color: TEACHER.primaryLight, fontWeight: '700', fontSize: 14 },
  list: { flex: 1, marginBottom: TEACHER_SPACING.md },
  listContent: { paddingBottom: 120 },
  row: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.sm,
  },
  rowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: { flex: 1 },
  name: { ...TEACHER_TYPO.body, fontWeight: '700', color: TEACHER.text },
  roll: { fontSize: 12, color: TEACHER.textMuted, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 4 },
  statusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  statusPresent: { backgroundColor: 'rgba(0,214,143,0.22)', borderColor: TEACHER.success },
  statusAbsent: { backgroundColor: 'rgba(255,77,106,0.22)', borderColor: TEACHER.danger },
  statusLate: { backgroundColor: 'rgba(255,184,48,0.22)', borderColor: TEACHER.warning },
  statusText: { fontSize: 12, color: TEACHER.textMuted, fontWeight: '800' },
  statusTextActive: { color: TEACHER.text },
  historyCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.sm,
  },
  historyDate: { fontWeight: '700', color: TEACHER.text },
  historyMeta: { fontSize: 14, color: TEACHER.textMuted, marginTop: 4 },
});
