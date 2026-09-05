import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, glassCard } from '../../../src/theme/teacher';

export default function HomeworkCreatorView() {
  const [homework, setHomework] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    classId: '',
    subject: '',
    dueDate: '',
    description: '',
    driveLink: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [hwRes, classRes, subRes] = await Promise.all([
        teacherService.homeworkSubmissions(),
        teacherService.classes(),
        teacherService.subjects(),
      ]);
      const subs = hwRes.data ?? [];
      const grouped = groupByAssignment(subs);
      setHomework(grouped);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    } catch {
      setHomework([]);
    } finally {
      setLoading(false);
    }
  };

  const groupByAssignment = (subs: any[]) => {
    const map = new Map<string, any>();
    subs.forEach((s) => {
      const key = s.homeworkId || s.assignmentTitle || s.title || 'Unknown';
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: s.assignmentTitle || s.title || 'Homework',
          subject: s.subject,
          dueDate: s.dueDate,
          submitted: 0,
          total: 0,
        });
      }
      const item = map.get(key)!;
      item.total += 1;
      if (s.status === 'Submitted' || s.submittedAt) item.submitted += 1;
    });
    return Array.from(map.values());
  };

  const submit = async () => {
    if (!form.title.trim() || !form.classId) {
      Alert.alert('Required', 'Title and class are required.');
      return;
    }
    try {
      await teacherService.createHomework({
        title: form.title,
        classId: form.classId,
        subject: form.subject,
        dueDate: form.dueDate,
        description: form.description,
        driveLink: form.driveLink,
      });
      setShowForm(false);
      setForm({ title: '', classId: '', subject: '', dueDate: '', description: '', driveLink: '' });
      load();
      Alert.alert('Created', 'Homework assignment created.');
    } catch {
      Alert.alert('Error', 'Could not create homework.');
    }
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.addBtnGrad}>
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color={TEACHER.textOnPrimary} />
          <Text style={styles.addBtnText}>{showForm ? 'Cancel' : 'Create Homework'}</Text>
        </LinearGradient>
      </Pressable>

      {showForm ? (
        <GlassPanel style={styles.form} radius={TEACHER_RADIUS.lg} tone="strong">
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} placeholderTextColor={TEACHER.textMuted} placeholder="Assignment Title" />
          <Text style={styles.label}>Class</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {classes.map((c) => {
              const id = String(c._id || c.id);
              const label = c.name || `${c.classNumber}${c.section ? `-${c.section}` : ''}`;
              const sel = form.classId === id;
              return (
                <Pressable key={id} style={[styles.chip, sel && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, classId: id }))}>
                  <Text style={[styles.chipText, sel && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.label}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {subjects.map((s) => {
              const name = s.name || s.title;
              const sel = form.subject === name;
              return (
                <Pressable key={s._id || s.id} style={[styles.chip, sel && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, subject: name }))}>
                  <Text style={[styles.chipText, sel && styles.chipTextActive]}>{name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.label}>Due Date</Text>
          <TextInput style={styles.input} value={form.dueDate} onChangeText={(t) => setForm((f) => ({ ...f, dueDate: t }))} placeholder="YYYY-MM-DD" placeholderTextColor={TEACHER.textMuted} />
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.area]} value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline placeholderTextColor={TEACHER.textMuted} />
          <Text style={styles.label}>Drive Link (Optional)</Text>
          <TextInput style={styles.input} value={form.driveLink} onChangeText={(t) => setForm((f) => ({ ...f, driveLink: t }))} placeholder="https://..." placeholderTextColor={TEACHER.textMuted} />
          <Pressable style={styles.saveBtn} onPress={submit}>
            <Text style={styles.saveBtnText}>Create Assignment</Text>
          </Pressable>
        </GlassPanel>
      ) : null}

      {homework.map((hw, index) => (
        <Animated.View key={hw.id} entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}>
          <GlassPanel style={styles.card} radius={TEACHER_RADIUS.lg} tone="medium">
            <Text style={styles.cardTitle}>{hw.title}</Text>
            <Text style={styles.cardMeta}>{hw.subject || 'General'} · Due {hw.dueDate || '—'}</Text>
            <View style={styles.progressRow}>
              <Ionicons name="people-outline" size={16} color={TEACHER.primaryLight} />
              <Text style={styles.progressText}>
                {hw.submitted}/{hw.total} Submitted
              </Text>
            </View>
          </GlassPanel>
        </Animated.View>
      ))}

      {!homework.length && !showForm ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={40} color={TEACHER.textMuted} />
          <Text style={styles.emptyText}>No Homework Assignments Yet</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  wrap: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, backgroundColor: 'transparent' },
  addBtn: { borderRadius: TEACHER_RADIUS.md, overflow: 'hidden', marginBottom: TEACHER_SPACING.lg },
  addBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14,
  },
  addBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  form: {
    ...glassCard, backgroundColor: 'transparent', padding: TEACHER_SPACING.lg, marginBottom: TEACHER_SPACING.lg,
  },
  label: { fontSize: 12, fontWeight: '700', color: TEACHER.textMuted, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.sm,
    padding: 12,
    color: TEACHER.text,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  area: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  chipActive: { borderColor: TEACHER.primary, backgroundColor: TEACHER.navActiveBg },
  chipText: { fontSize: 12, color: TEACHER.textMuted, fontWeight: '600' },
  chipTextActive: { color: TEACHER.primaryLight },
  saveBtn: {
    backgroundColor: TEACHER.primary,
    padding: 14,
    borderRadius: TEACHER_RADIUS.md,
    alignItems: 'center',
    marginTop: TEACHER_SPACING.lg,
  },
  saveBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  card: {
    ...glassCard, backgroundColor: 'transparent', borderRadius: TEACHER_RADIUS.lg, padding: TEACHER_SPACING.lg, marginBottom: TEACHER_SPACING.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  cardMeta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  progressText: { fontSize: 13, color: TEACHER.textSecondary, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.textMuted, marginTop: 12 },
});
