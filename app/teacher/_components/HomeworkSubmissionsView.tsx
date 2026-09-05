import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

type HomeworkGroup = {
  homework: any;
  submissions: any[];
};

export default function HomeworkSubmissionsView() {
  const [groups, setGroups] = useState<HomeworkGroup[]>([]);
  const [studentRows, setStudentRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHw, setExpandedHw] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<any | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({
    title: '',
    classNumber: '',
    subject: '',
    topic: '',
    deadline: '',
    description: '',
    fileUrl: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [hwRes, classRes, subRes] = await Promise.all([
        teacherService.homeworkSubmissionsGrouped(),
        teacherService.classes(),
        teacherService.subjects(),
      ]);
      const raw = hwRes.data?.homeworks ?? [];
      setGroups(
        (Array.isArray(raw) ? raw : []).map((item: any) => ({
          homework: item.homework || item,
          submissions: item.submissions || [],
        }))
      );
      setStudentRows(Array.isArray(hwRes.data?.students) ? hwRes.data.students : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    } catch {
      setGroups([]);
      setStudentRows([]);
    } finally {
      setLoading(false);
    }
  };

  const classList = useMemo(() => {
    const set = new Set<string>();
    studentRows.forEach((row) => {
      const cn = row.student?.classNumber || row.classNumber;
      if (cn) set.add(String(cn));
    });
    classes.forEach((c) => {
      if (c.classNumber) set.add(String(c.classNumber));
    });
    return Array.from(set).sort();
  }, [studentRows, classes]);

  const toggleHw = (id: string) => {
    setExpandedHw((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClass = (cn: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cn)) next.delete(cn);
      else next.add(cn);
      return next;
    });
  };

  const submitHomework = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Title is required.');
      return;
    }
    try {
      await teacherService.createHomework({
        title: form.title,
        classNumber: form.classNumber,
        subject: form.subject,
        topic: form.topic,
        deadline: form.deadline,
        description: form.description,
        fileUrl: form.fileUrl,
      });
      setShowCreate(false);
      setForm({ title: '', classNumber: '', subject: '', topic: '', deadline: '', description: '', fileUrl: '' });
      load();
      Alert.alert('Created', 'Homework assignment created.');
    } catch {
      Alert.alert('Error', 'Could not create homework.');
    }
  };

  const submitGrade = async () => {
    if (!gradeTarget || !grade) return;
    try {
      await teacherService.gradeHomework(gradeTarget._id, {
        grade: parseFloat(grade),
        feedback: feedback.trim(),
      });
      setGradeTarget(null);
      setGrade('');
      setFeedback('');
      load();
    } catch {
      Alert.alert('Error', 'Could not save grade.');
    }
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <GlassPanel style={styles.headerCard} radius={TEACHER_RADIUS.xl} tone="medium">
        <View style={styles.headerCardInner}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.headerIcon}>
              <Ionicons name="document-text" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Homework Submissions</Text>
              <Text style={styles.headerSub}>View And Manage Student Homework Submissions</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowCreate(true)}>
            <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.createBtn}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createBtnText}>Create Homework</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.sectionCard} radius={TEACHER_RADIUS.xl} tone="strong">
        <View style={styles.sectionCardInner}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={18} color={TEACHER.primaryLight} />
            <Text style={styles.sectionTitle}>Homework Submissions</Text>
          </View>
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={TEACHER.textMuted} />
              <Text style={styles.emptyText}>No Homework Assignments Found For Your Assigned Subjects</Text>
            </View>
          ) : (
            groups.map((group) => {
              const hw = group.homework;
              const id = String(hw._id || hw.id);
              const isOpen = expandedHw.has(id);
              const deadline = hw.deadline ? new Date(hw.deadline) : null;
              const overdue = deadline && deadline < new Date() && group.submissions.length === 0;

              return (
                <GlassPanel key={id} style={styles.hwCard} radius={TEACHER_RADIUS.lg} tone="light">
                  <Pressable
                    style={[styles.hwHeader, overdue && styles.hwOverdue]}
                    onPress={() => toggleHw(id)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.hwTitleRow}>
                        <Text style={styles.hwTitle}>{hw.title || 'Untitled Homework'}</Text>
                        {overdue ? (
                          <View style={styles.badgeRed}><Text style={styles.badgeRedText}>Overdue</Text></View>
                        ) : deadline && deadline >= new Date() ? (
                          <View style={styles.badgeYellow}><Text style={styles.badgeYellowText}>Active</Text></View>
                        ) : null}
                      </View>
                      <Text style={styles.hwMeta}>
                        Subject: {hw.subject?.name || hw.subject || 'N/A'}
                        {hw.classNumber ? ` · Class: ${hw.classNumber}` : ''}
                      </Text>
                      {deadline ? (
                        <Text style={[styles.deadline, overdue && { color: TEACHER.danger }]}>
                          Deadline: {deadline.toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={TEACHER.textMuted} />
                  </Pressable>
                  {isOpen ? (
                    <View style={styles.subs}>
                      {group.submissions.length === 0 ? (
                        <Text style={styles.noSubs}>No Submissions Yet</Text>
                      ) : (
                        group.submissions.map((sub: any) => {
                          const student = sub.student || sub.studentId || {};
                          return (
                            <View key={sub._id} style={styles.subRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.subName}>{student.fullName || student.name || 'Student'}</Text>
                                <Text style={styles.subMeta}>{student.email || ''}</Text>
                                {sub.submittedAt ? (
                                  <Text style={styles.subMeta}>Submitted {new Date(sub.submittedAt).toLocaleString()}</Text>
                                ) : null}
                              </View>
                              <Pressable style={styles.gradeBtn} onPress={() => {
                                setGradeTarget(sub);
                                setGrade(sub.grade != null ? String(sub.grade) : '');
                                setFeedback(sub.feedback || '');
                              }}>
                                <Text style={styles.gradeBtnText}>Grade</Text>
                              </Pressable>
                            </View>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </GlassPanel>
              );
            })
          )}
        </View>
      </GlassPanel>

      <GlassPanel style={styles.sectionCard} radius={TEACHER_RADIUS.xl} tone="strong">
        <View style={styles.sectionCardInner}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={18} color={TEACHER.primaryLight} />
            <Text style={styles.sectionTitle}>Submissions By Students</Text>
          </View>
          {classList.length === 0 ? (
            <Text style={styles.emptyText}>No classes assigned yet.</Text>
          ) : (
            classList.map((classNum) => {
              const open = expandedClasses.has(classNum);
              const rows = studentRows.filter((row) => {
                const cn = row.student?.classNumber || row.classNumber;
                return String(cn) === classNum;
              });
              return (
                <View key={classNum} style={styles.classBlock}>
                  <Pressable style={styles.classHeader} onPress={() => toggleClass(classNum)}>
                    <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={TEACHER.primaryLight} />
                    <View style={styles.classTitleWrap}>
                      <Text style={styles.classTitle}>{classNum}</Text>
                    </View>
                    <Text style={styles.classCount}>{rows.length} Student{rows.length !== 1 ? 's' : ''}</Text>
                  </Pressable>
                  {open ? (
                    rows.map((row) => {
                      const student = row.student || {};
                      const subs = row.submissions || [];
                      return (
                        <View key={student._id || student.id || classNum} style={styles.studentSubBlock}>
                          <Text style={styles.subName}>{student.fullName || student.name || 'Student'}</Text>
                          <Text style={styles.subMeta}>{subs.length} Submission{subs.length !== 1 ? 's' : ''}</Text>
                          {subs.slice(0, 3).map((sub: any, i: number) => (
                            <Text key={i} style={styles.subMeta}>
                              {sub.homeworkId?.title || sub.title || 'Homework'}
                              {sub.grade != null ? ` · Grade: ${sub.grade}%` : ''}
                            </Text>
                          ))}
                        </View>
                      );
                    })
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </GlassPanel>

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalCardContent}
            >
              <Text style={styles.modalTitle}>Create Homework</Text>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}             placeholderTextColor={TEACHER.textMuted} />
              <Text style={styles.label}>Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {classes.map((c) => {
                  const num = String(c.classNumber || c.name);
                  const sel = form.classNumber === num;
                  return (
                    <Pressable key={c._id || c.id} style={[styles.chip, sel && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, classNumber: num }))}>
                      <Text style={[styles.chipText, sel && styles.chipTextActive]}>{num}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.label}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {subjects.map((s) => {
                  const name = s.name;
                  const sel = form.subject === name;
                  return (
                    <Pressable key={s._id || s.id} style={[styles.chip, sel && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, subject: name }))}>
                      <Text style={[styles.chipText, sel && styles.chipTextActive]}>{name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.label}>Topic</Text>
              <TextInput style={styles.input} value={form.topic} onChangeText={(t) => setForm((f) => ({ ...f, topic: t }))}             placeholderTextColor={TEACHER.textMuted} />
              <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={form.deadline} onChangeText={(t) => setForm((f) => ({ ...f, deadline: t }))}             placeholderTextColor={TEACHER.textMuted} />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.area]} value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline             placeholderTextColor={TEACHER.textMuted} />
              <Pressable onPress={submitHomework}>
                <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Create</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!gradeTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Grade Submission</Text>
            <TextInput style={styles.input} value={grade} onChangeText={setGrade} keyboardType="numeric" placeholder="Marks"             placeholderTextColor={TEACHER.textMuted} />
            <TextInput style={[styles.input, styles.area]} value={feedback} onChangeText={setFeedback} placeholder="Feedback"             placeholderTextColor={TEACHER.textMuted} multiline />
            <Pressable onPress={submitGrade}>
              <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Grade</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setGradeTarget(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 14 },
  // GlassPanel wraps children in its own view, so the card's `gap` lives on
  // an inner row instead of the panel itself.
  headerCard: { ...glassCard, backgroundColor: 'transparent', borderRadius: TEACHER_RADIUS.xl, padding: 16 },
  headerCardInner: { gap: 14 },
  headerLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.primaryLight },
  headerSub: { fontSize: 13, color: TEACHER.textMuted, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12 },
  createBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  sectionCard: { ...glassCard, backgroundColor: 'transparent', borderRadius: TEACHER_RADIUS.xl, padding: 14 },
  sectionCardInner: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { ...TEACHER_TYPO.section, fontSize: 17, color: TEACHER.text },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: TEACHER.textMuted, textAlign: 'center', marginTop: 8 },
  hwCard: { borderWidth: 1, borderColor: TEACHER.surfaceBorder, borderRadius: TEACHER_RADIUS.lg, overflow: 'hidden', marginBottom: 10 },
  // No fill: the surrounding hwCard glass reads through this header row.
  hwHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  hwOverdue: { borderLeftWidth: 4, borderLeftColor: TEACHER.danger },
  hwTitleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  hwTitle: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  hwMeta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  deadline: { fontSize: 12, color: TEACHER.textMuted, marginTop: 2 },
  badgeRed: { backgroundColor: 'rgba(255,77,106,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeRedText: { fontSize: 10, fontWeight: '700', color: TEACHER.danger },
  badgeYellow: { backgroundColor: 'rgba(255,184,48,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeYellowText: { fontSize: 10, fontWeight: '700', color: TEACHER.warning },
  subs: { padding: 12, backgroundColor: 'rgba(123,80,255,0.07)' },
  noSubs: { fontSize: 13, color: TEACHER.textMuted, fontStyle: 'italic' },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: TEACHER.surfaceBorder },
  subName: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  subMeta: { fontSize: 11, color: TEACHER.textMuted, marginTop: 2 },
  gradeBtn: { borderWidth: 1, borderColor: TEACHER.surfaceBorder, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: TEACHER.surfaceElevated },
  gradeBtnText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  classBlock: { borderBottomWidth: 1, borderBottomColor: TEACHER.surfaceBorder },
  classHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  classTitleWrap: { flex: 1, minWidth: 0 },
  classTitle: { fontSize: 16, fontWeight: '700', color: TEACHER.text },
  classCount: { fontSize: 11, color: TEACHER.textMuted },
  studentSubBlock: { marginLeft: 24, paddingBottom: 10, borderLeftWidth: 2, borderLeftColor: TEACHER.surfaceBorder, paddingLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TEACHER.cardGradient[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalCardContent: {
    paddingBottom: 12,
  },
  modalTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: TEACHER.textMuted, marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: TEACHER.surfaceBorder, borderRadius: TEACHER_RADIUS.md, padding: 12, color: TEACHER.text, backgroundColor: TEACHER.surfaceElevated },
  area: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: TEACHER.surfaceBorder, backgroundColor: TEACHER.surfaceElevated },
  chipActive: { borderColor: TEACHER.primary, backgroundColor: TEACHER.navActiveBg },
  chipText: { fontSize: 12, color: TEACHER.textMuted, fontWeight: '600' },
  chipTextActive: { color: TEACHER.primaryLight, fontWeight: '700' },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelText: { color: TEACHER.textMuted, fontWeight: '600' },
});
