import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import IQRankBoostQuestionGenerator from './IQRankBoostQuestionGenerator';
import {
  type IQActivity,
  type IQActivityFormState,
  CLASS_NUMBERS,
  QUIZ_AUDIENCE_TYPES,
  QUIZ_SCHEDULE_TYPES,
  IQ_DIFFICULTIES,
  getClassStats,
  emptyActivityForm,
  buildQuizCreatePayload,
  normalizeActivitiesResponse,
} from '../../../src/lib/iq-rank-boost';

type SchoolOption = { _id: string; name: string };
type SubjectOption = { _id: string; name: string };

export default function IQRankBoostView() {
  const [activities, setActivities] = useState<IQActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IQActivityFormState>(emptyActivityForm());
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get('/api/super-admin/iq-rank-activities');
      setActivities(normalizeActivitiesResponse(response?.data));
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    try {
      const [adminsRes, subjectsRes] = await Promise.allSettled([
        api.get('/api/super-admin/admins'),
        api.get('/api/super-admin/subjects'),
      ]);
      if (adminsRes.status === 'fulfilled') {
        const list = Array.isArray(adminsRes.value?.data?.data)
          ? adminsRes.value.data.data
          : Array.isArray(adminsRes.value?.data)
            ? adminsRes.value.data
            : [];
        setSchools(
          list
            .map((admin: any) => ({
              _id: String(admin._id || admin.id || ''),
              name: String(admin.schoolName || admin.name || admin.email || 'School').trim(),
            }))
            .filter((s: SchoolOption) => s._id),
        );
      }
      if (subjectsRes.status === 'fulfilled') {
        const list = Array.isArray(subjectsRes.value?.data?.data)
          ? subjectsRes.value.data.data
          : Array.isArray(subjectsRes.value?.data)
            ? subjectsRes.value.data
            : [];
        setSubjects(
          list
            .map((s: any) => ({ _id: String(s._id || ''), name: String(s.name || '').trim() }))
            .filter((s: SubjectOption) => s._id && s.name),
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchLookups();
  }, [fetchActivities, fetchLookups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const recentQuizzes = useMemo(
    () => activities.slice(0, 12),
    [activities],
  );

  const toggleRole = (role: 'student' | 'teacher') => {
    const set = new Set(form.audienceRoles);
    if (set.has(role)) set.delete(role);
    else set.add(role);
    if (set.size === 0) set.add('student');
    setForm({ ...form, audienceRoles: Array.from(set) as Array<'student' | 'teacher'> });
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      Alert.alert('Missing Title', 'Enter a quiz title.');
      return;
    }
    if (!form.subject) {
      Alert.alert('Missing Subject', 'Select a subject.');
      return;
    }
    if (form.audienceType === 'schools' && form.targetSchools.length === 0) {
      Alert.alert('Select Schools', 'Choose at least one school.');
      return;
    }
    if (form.audienceType === 'specific_members' && !form.targetUserIdsText.trim()) {
      Alert.alert('Member IDs', 'Paste at least one user ID.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/api/super-admin/iq-rank-activities', buildQuizCreatePayload(form));
      setCreateOpen(false);
      setForm(emptyActivityForm());
      await fetchActivities();
      Alert.alert('Created', 'Quiz created successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to Create Quiz');
    } finally {
      setSaving(false);
    }
  };

  if (selectedClass !== null) {
    return (
      <IQRankBoostQuestionGenerator
        classNumber={selectedClass}
        onBack={() => {
          setSelectedClass(null);
          fetchActivities();
        }}
      />
    );
  }

  return (
    <>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Quiz</Text>
            <Text style={styles.headerSubtitle}>
              Daily or weekly quizzes for schools, trial users, or specific members
            </Text>
          </View>
          <Pressable
            style={styles.createBtn}
            onPress={() => {
              setForm(emptyActivityForm());
              setCreateOpen(true);
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Create</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Loading Quizzes...</Text>
          </View>
        ) : (
          <>
            <View style={styles.classGrid}>
              {CLASS_NUMBERS.map((classNum) => {
                const stats = getClassStats(activities, classNum);
                return (
                  <View key={classNum} style={styles.classCard}>
                    <LinearGradient
                      colors={['#0ea5e9', '#14b8a6']}
                      style={styles.classCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.classCardHeader}>
                        <View style={styles.classNumberBadge}>
                          <Text style={styles.classNumberText}>{classNum}</Text>
                        </View>
                        <View>
                          <Text style={styles.classCardTitle}>Class {classNum}</Text>
                          <Text style={styles.classCardDesc}>Quizzes</Text>
                        </View>
                      </View>

                      <View style={styles.statsList}>
                        <View style={styles.statRow}>
                          <Text style={styles.statLabel}>Quizzes:</Text>
                          <View style={styles.statBadge}>
                            <Text style={styles.statBadgeText}>{stats.total}</Text>
                          </View>
                        </View>
                        <View style={styles.statRow}>
                          <Text style={styles.statLabel}>Active:</Text>
                          <View style={styles.statBadge}>
                            <Text style={styles.statBadgeText}>{stats.active}</Text>
                          </View>
                        </View>
                        <View style={styles.statRow}>
                          <Text style={styles.statLabel}>Questions:</Text>
                          <Text style={styles.statValue}>{stats.questions}</Text>
                        </View>
                      </View>

                      <Pressable style={styles.addQuestionsBtn} onPress={() => setSelectedClass(classNum)}>
                        <Ionicons name="add" size={18} color="#0369a1" />
                        <Text style={styles.addQuestionsText}>Add Questions</Text>
                      </Pressable>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>

            <View style={styles.listSection}>
              <Text style={styles.listTitle}>All Quizzes</Text>
              {recentQuizzes.length === 0 ? (
                <Text style={styles.emptyList}>No quizzes yet. Tap Create to add one.</Text>
              ) : (
                recentQuizzes.map((quiz) => (
                  <View key={quiz._id} style={styles.quizRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.quizTitle} numberOfLines={1}>
                        {quiz.title}
                      </Text>
                      <Text style={styles.quizMeta} numberOfLines={1}>
                        {[
                          quiz.scheduleType && quiz.scheduleType !== 'once' ? quiz.scheduleType : null,
                          quiz.audienceType?.replace(/_/g, ' '),
                          quiz.classNumber ? `Class ${quiz.classNumber}` : null,
                          quiz.audienceRoles?.join('+'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: quiz.isActive ? '#dcfce7' : '#f1f5f9' },
                      ]}
                    >
                      <Text
                        style={{
                          color: quiz.isActive ? '#15803d' : '#64748b',
                          fontSize: 11,
                          fontWeight: '700',
                        }}
                      >
                        {quiz.isActive ? 'Active' : 'Off'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Quiz</Text>
              <Pressable onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={22} color="#334155" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(title) => setForm({ ...form, title })}
                placeholder="Quiz Title"
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={(description) => setForm({ ...form, description })}
                placeholder="Optional Description"
                multiline
              />
              <Text style={styles.label}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {subjects.slice(0, 40).map((s) => {
                  const on = form.subject === s._id;
                  return (
                    <Pressable
                      key={s._id}
                      onPress={() => setForm({ ...form, subject: s._id })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.label}>Class (Or All)</Text>
              <TextInput
                style={styles.input}
                value={form.classNumber}
                onChangeText={(classNumber) => setForm({ ...form, classNumber })}
                placeholder="all / 10 / 11"
              />
              <Text style={styles.label}>Schedule</Text>
              <View style={styles.chipRow}>
                {QUIZ_SCHEDULE_TYPES.map((opt) => {
                  const on = form.scheduleType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setForm({ ...form, scheduleType: opt.value })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>Audience</Text>
              <View style={styles.chipRow}>
                {QUIZ_AUDIENCE_TYPES.map((opt) => {
                  const on = form.audienceType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() =>
                        setForm({
                          ...form,
                          audienceType: opt.value,
                          trialOnly: opt.value === 'trial',
                          promptOnLogin: opt.value === 'trial' ? form.promptOnLogin : false,
                        })
                      }
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>Available To</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => toggleRole('student')}
                  style={[styles.chip, form.audienceRoles.includes('student') && styles.chipOn]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.audienceRoles.includes('student') && styles.chipTextOn,
                    ]}
                  >
                    Students
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleRole('teacher')}
                  style={[styles.chip, form.audienceRoles.includes('teacher') && styles.chipOn]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.audienceRoles.includes('teacher') && styles.chipTextOn,
                    ]}
                  >
                    Teachers
                  </Text>
                </Pressable>
              </View>
              {form.audienceType === 'schools' ? (
                <View style={styles.schoolBox}>
                  <Text style={styles.label}>Select Schools</Text>
                  {schools.slice(0, 60).map((school) => {
                    const on = form.targetSchools.includes(school._id);
                    return (
                      <Pressable
                        key={school._id}
                        style={styles.schoolRow}
                        onPress={() => {
                          const set = new Set(form.targetSchools);
                          if (on) set.delete(school._id);
                          else set.add(school._id);
                          setForm({ ...form, targetSchools: Array.from(set) });
                        }}
                      >
                        <Ionicons
                          name={on ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={on ? '#0284c7' : '#94a3b8'}
                        />
                        <Text style={styles.schoolName} numberOfLines={1}>
                          {school.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {form.audienceType === 'specific_members' ? (
                <>
                  <Text style={styles.label}>Member User IDs</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
                    value={form.targetUserIdsText}
                    onChangeText={(targetUserIdsText) => setForm({ ...form, targetUserIdsText })}
                    placeholder="Comma-Separated User IDs"
                    multiline
                  />
                </>
              ) : null}
              {form.audienceType === 'trial' ? (
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Prompt On Login</Text>
                  <Switch
                    value={form.promptOnLogin}
                    onValueChange={(promptOnLogin) => setForm({ ...form, promptOnLogin })}
                  />
                </View>
              ) : null}
              <Text style={styles.label}>Difficulty</Text>
              <View style={styles.chipRow}>
                {IQ_DIFFICULTIES.map((opt) => {
                  const on = form.difficulty === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setForm({ ...form, difficulty: opt.value })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                disabled={saving}
                onPress={() => void handleCreate()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Create Quiz</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: {
    padding: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 16,
  },
  classCard: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  classCardGradient: { padding: 14 },
  classCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  classNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classNumberText: { fontSize: 18, fontWeight: '800', color: '#0284c7' },
  classCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  classCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  statsList: { gap: 8, marginBottom: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 13, color: '#fff' },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  addQuestionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
  },
  addQuestionsText: { color: '#0369a1', fontWeight: '700', fontSize: 14 },
  listSection: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyList: { color: '#64748b', fontSize: 13 },
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  quizTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  quizMeta: { fontSize: 12, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 13, fontWeight: '700', color: '#334155' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
  },
  chipOn: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextOn: { color: '#0369a1' },
  schoolBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    maxHeight: 180,
  },
  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  schoolName: { flex: 1, fontSize: 13, color: '#334155' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
