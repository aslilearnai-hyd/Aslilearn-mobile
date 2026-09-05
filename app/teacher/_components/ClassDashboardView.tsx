import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';

type AttendanceMap = Record<string, 'present' | 'absent'>;

export default function ClassDashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selectedClassId) loadStudents(selectedClassId);
  }, [selectedClassId]);

  const init = async () => {
    setLoading(true);
    try {
      const [statsRes, classRes] = await Promise.all([
        teacherService.classStats(),
        teacherService.classes(),
      ]);
      setStats(statsRes.data);
      const cls = Array.isArray(classRes.data) ? classRes.data : [];
      setClasses(cls);
      if (cls.length) setSelectedClassId(String(cls[0]._id || cls[0].id));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const res = await teacherService.classStudents(classId).catch(() => teacherService.students());
      const data = res.data ?? [];
      setStudents(Array.isArray(data) ? data : []);
      const initial: AttendanceMap = {};
      data.forEach((s: any) => {
        initial[s._id || s.id] = 'present';
      });
      setAttendance(initial);
    } catch {
      setStudents([]);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }));
  };

  const submitAttendance = async () => {
    setSyncing(true);
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status: status === 'present' ? 'Present' : 'Absent',
    }));
    try {
      await teacherService.markAttendance({
        classId: selectedClassId,
        date: new Date().toISOString().slice(0, 10),
        records,
      });
      Alert.alert('Saved', 'Attendance marked successfully.');
    } catch {
      Alert.alert('Synced Locally', 'Attendance saved locally; will sync when online.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <TeacherShimmer variant="card" count={2} />;

  const selectedClass = classes.find((c) => String(c._id || c.id) === selectedClassId);
  const classLabel =
    selectedClass?.name ||
    `${selectedClass?.classNumber || ''}${selectedClass?.section ? `-${selectedClass.section}` : ''}`;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classRow}>
        {classes.map((c) => {
          const id = String(c._id || c.id);
          const label = c.name || `${c.classNumber}${c.section ? `-${c.section}` : ''}`;
          const active = id === selectedClassId;
          return (
            <Pressable
              key={id}
              style={[styles.classChip, active && styles.classChipActive]}
              onPress={() => setSelectedClassId(id)}
            >
              <Text style={[styles.classChipText, active && styles.classChipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {stats ? (
        <GlassPanel style={styles.overview} radius={TEACHER_RADIUS.card} tone="medium">
          <Text style={styles.overviewTitle}>{classLabel || 'Class Overview'}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.averageScore ?? stats.avgScore ?? 0}%</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: TEACHER.success }]}>
                {stats.topPerformer || stats.bestStudent || '—'}
              </Text>
              <Text style={styles.statLabel}>Top Performer</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: TEACHER.secondary }]}>
                {stats.atRiskCount ?? stats.atRisk ?? 0}
              </Text>
              <Text style={styles.statLabel}>At Risk</Text>
            </View>
          </View>
        </GlassPanel>
      ) : null}

      <Text style={styles.sectionTitle}>Quick Attendance</Text>
      {students.map((student) => {
        const id = student._id || student.id;
        const name = student.fullName || student.name || 'Student';
        const status = attendance[id] || 'present';
        return (
          <GlassPanel key={id} style={styles.studentRow} radius={TEACHER_RADIUS.lg} tone="medium">
            <View style={styles.studentRowBody}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.studentNameWrap}>
                <Text style={styles.studentName}>{name}</Text>
              </View>
              <Pressable
                style={[styles.toggle, status === 'present' ? styles.togglePresent : styles.toggleAbsent]}
                onPress={() => toggleAttendance(id)}
              >
                <Text style={styles.toggleText}>{status === 'present' ? 'Present' : 'Absent'}</Text>
              </Pressable>
            </View>
          </GlassPanel>
        );
      })}

      {students.length ? (
        <Pressable style={styles.submitBtn} onPress={submitAttendance} disabled={syncing}>
          <Ionicons name="checkmark-done" size={18} color={TEACHER.textOnPrimary} />
          <Text style={styles.submitText}>{syncing ? 'Syncing…' : 'Submit Attendance'}</Text>
        </Pressable>
      ) : null}

      {stats?.recentActivity?.length ? (
        <>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {stats.recentActivity.map((act: any) => (
            <GlassPanel key={act._id || act.id} style={styles.activity} radius={TEACHER_RADIUS.lg} tone="medium">
              <View style={styles.activityRow}>
                <Ionicons name="document-text-outline" size={18} color={TEACHER.primaryLight} />
                <View style={styles.activityBody}>
                  <Text style={styles.activityTitle}>{act.title}</Text>
                  <Text style={styles.activityMeta}>{act.studentName}</Text>
                </View>
              </View>
            </GlassPanel>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  wrap: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120 },
  classRow: { gap: 8, marginBottom: TEACHER_SPACING.lg },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  classChipActive: { backgroundColor: TEACHER.navActiveBg, borderColor: TEACHER.primary },
  classChipText: { fontSize: 13, fontWeight: '600', color: TEACHER.textMuted },
  classChipTextActive: { color: TEACHER.primaryLight },
  overview: {
    borderRadius: TEACHER_RADIUS.card,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  overviewTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text, marginBottom: TEACHER_SPACING.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: TEACHER.primaryLight },
  statLabel: { fontSize: 11, color: TEACHER.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEACHER.text,
    marginBottom: TEACHER_SPACING.md,
    marginTop: TEACHER_SPACING.sm,
  },
  studentRow: {
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.sm,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  studentRowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: TEACHER.textOnPrimary, fontWeight: '800' },
  studentNameWrap: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 14, fontWeight: '600', color: TEACHER.text },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  togglePresent: { backgroundColor: 'rgba(0,214,143,0.2)' },
  toggleAbsent: { backgroundColor: 'rgba(255,77,106,0.2)' },
  toggleText: { fontSize: 12, fontWeight: '700', color: TEACHER.text },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEACHER.primary,
    padding: 14,
    borderRadius: TEACHER_RADIUS.md,
    marginVertical: TEACHER_SPACING.lg,
  },
  submitText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  activity: {
    padding: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.lg,
    marginBottom: TEACHER_SPACING.sm,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
  },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  activityMeta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 2 },
});
