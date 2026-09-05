import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../../src/theme/teacher';
import { GLASS_ROW, GLASS_VIOLET } from '../../../src/theme/glass';

interface Assessment {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  type: 'quiz' | 'exam' | 'assignment' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  questions?: number;
  isActive: boolean;
  createdAt: string;
}

const TYPE_ACCENT: Record<string, string> = {
  quiz: '#6366F1',
  exam: '#F97316',
  assignment: '#14B8A6',
  project: '#8B5CF6',
};

export default function TeacherAssessmentsView() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    description: '',
    subject: '',
    type: 'quiz' as 'quiz' | 'exam' | 'assignment' | 'project',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 60,
    totalMarks: 100,
    passingMarks: 50,
    questions: 20,
  });

  useEffect(() => {
    fetchAssessments();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await teacherService.subjects();
      setSubjects(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchAssessments = async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.assessments();
      setAssessments(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.title || !newAssessment.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await teacherService.createAssessment(newAssessment);
      Alert.alert('Success', 'Assessment created successfully');
      setIsCreateModalOpen(false);
      setNewAssessment({
        title: '',
        description: '',
        subject: '',
        type: 'quiz',
        difficulty: 'medium',
        duration: 60,
        totalMarks: 100,
        passingMarks: 50,
        questions: 20,
      });
      await teacherService.invalidateCache('assessments');
      fetchAssessments();
    } catch (error) {
      console.error('Failed to create assessment:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId =
      typeof assessment.subject === 'object' ? assessment.subject?._id : assessment.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEACHER.primary} />
        <Text style={styles.loadingText}>Loading Assessments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassPanel
        tone="strong"
        elevated
        colors={[...GLASS_VIOLET]}
        radius={TEACHER_RADIUS.xl}
        style={styles.header}
        contentStyle={styles.headerInner}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <Ionicons name="clipboard-outline" size={22} color={TEACHER.primaryDark} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Assessments</Text>
            <Text style={styles.headerSubtitle}>
              Quizzes, exams, and assignments for your classes.
            </Text>
          </View>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.filtersContainer} radius={TEACHER_RADIUS.lg} tone="light">
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Assessments..."
            placeholderTextColor={TEACHER.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text
              style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}
            >
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[
                styles.filterChip,
                filterSubject === (subject._id || subject.id) && styles.filterChipActive,
              ]}
              onPress={() => setFilterSubject(subject._id || subject.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterSubject === (subject._id || subject.id) && styles.filterChipTextActive,
                ]}
              >
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </GlassPanel>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsCreateModalOpen(true)}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.addButtonGrad}>
          <Ionicons name="add" size={24} color={TEACHER.textOnPrimary} />
          <Text style={styles.addButtonText}>Create Assessment</Text>
        </LinearGradient>
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {filteredAssessments.length === 0 ? (
          <GlassPanel tone="medium" radius={TEACHER_RADIUS.card} contentStyle={styles.emptyInner}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={28} color={TEACHER.primary} />
            </View>
            <Text style={styles.emptyText}>No Assessments Found</Text>
            <Text style={styles.emptySubtext}>Create Your First Assessment To Get Started</Text>
          </GlassPanel>
        ) : (
          filteredAssessments.map((assessment, index) => {
            const subjectName =
              typeof assessment.subject === 'object'
                ? assessment.subject?.name
                : assessment.subject || 'General';
            const accent = TYPE_ACCENT[assessment.type] || TEACHER.primary;

            return (
              <Animated.View
                key={assessment._id}
                entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}
              >
                <GlassPanel
                  style={styles.assessmentCard}
                  contentStyle={styles.assessmentInner}
                  radius={TEACHER_RADIUS.lg}
                  tone="strong"
                  elevated
                >
                  <View style={[styles.accentBar, { backgroundColor: accent }]} />
                  <View style={styles.assessmentHeader}>
                    <View style={[styles.assessmentIcon, { backgroundColor: `${accent}22` }]}>
                      <Ionicons name="clipboard-outline" size={22} color={accent} />
                    </View>
                    <View style={styles.assessmentInfo}>
                      <Text style={styles.assessmentTitle} numberOfLines={2}>
                        {assessment.title}
                      </Text>
                      <Text style={styles.assessmentSubject}>{subjectName}</Text>
                    </View>
                    <View
                      style={[
                        styles.typePill,
                        { backgroundColor: `${accent}22`, borderColor: `${accent}44` },
                      ]}
                    >
                      <Text style={[styles.typePillText, { color: accent }]}>
                        {assessment.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {assessment.description ? (
                    <Text style={styles.assessmentDescription} numberOfLines={2}>
                      {assessment.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaChips}>
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={14} color={TEACHER.textMuted} />
                      <Text style={styles.metaText}>{assessment.duration} min</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="trophy-outline" size={14} color={TEACHER.textMuted} />
                      <Text style={styles.metaText}>{assessment.totalMarks} marks</Text>
                    </View>
                    {assessment.questions ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="help-circle-outline" size={14} color={TEACHER.textMuted} />
                        <Text style={styles.metaText}>
                          {Array.isArray(assessment.questions)
                            ? assessment.questions.length
                            : assessment.questions}{' '}
                          Qs
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={assessment.isActive ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={assessment.isActive ? TEACHER.success : TEACHER.danger}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: assessment.isActive ? TEACHER.success : TEACHER.danger },
                      ]}
                    >
                      {assessment.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </GlassPanel>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Assessment</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color={TEACHER.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Assessment Title"
                value={newAssessment.title}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Assessment Description"
                value={newAssessment.description}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      newAssessment.subject === (subject._id || subject.id) &&
                        styles.subjectChipActive,
                    ]}
                    onPress={() =>
                      setNewAssessment({
                        ...newAssessment,
                        subject: subject._id || subject.id,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        newAssessment.subject === (subject._id || subject.id) &&
                          styles.subjectChipTextActive,
                      ]}
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['quiz', 'exam', 'assignment', 'project'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, newAssessment.type === type && styles.typeChipActive]}
                    onPress={() => setNewAssessment({ ...newAssessment, type: type as any })}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        newAssessment.type === type && styles.typeChipTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Duration (Min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  keyboardType="numeric"
                  value={newAssessment.duration.toString()}
                  onChangeText={(text) =>
                    setNewAssessment({ ...newAssessment, duration: parseInt(text) || 60 })
                  }
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Total Marks</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={newAssessment.totalMarks.toString()}
                  onChangeText={(text) =>
                    setNewAssessment({ ...newAssessment, totalMarks: parseInt(text) || 100 })
                  }
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateAssessment}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[TEACHER.primary, TEACHER.primaryDark]}
                style={styles.createButtonGrad}
              >
                <Text style={styles.createButtonText}>Create Assessment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: TEACHER_SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 12,
    ...TEACHER_TYPO.body,
    color: TEACHER.textMuted,
  },
  header: {
    marginTop: TEACHER_SPACING.sm,
    marginBottom: TEACHER_SPACING.md,
  },
  headerInner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  headerTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 22,
    color: TEACHER.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: TEACHER.textSecondary,
  },
  filtersContainer: {
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_ROW.fillStrong,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    paddingHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
    height: 48,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    ...TEACHER_TYPO.body,
    color: TEACHER.text,
  },
  filterScroll: { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  filterChipTextActive: { color: TEACHER.textOnPrimary },
  addButton: {
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: TEACHER_SPACING.md,
  },
  addButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    color: TEACHER.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  content: { flex: 1 },
  contentInner: { paddingBottom: 120, gap: 10 },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '800',
    color: TEACHER.text,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: TEACHER.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  assessmentCard: { width: '100%', overflow: 'hidden' },
  assessmentInner: { padding: 16, paddingLeft: 18, gap: 10 },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assessmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentInfo: { flex: 1, minWidth: 0 },
  assessmentTitle: {
    ...TEACHER_TYPO.body,
    fontWeight: '800',
    color: TEACHER.text,
    marginBottom: 2,
  },
  assessmentSubject: { fontSize: 13, color: TEACHER.textMuted },
  typePill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  assessmentDescription: {
    fontSize: 13,
    color: TEACHER.textSecondary,
    lineHeight: 18,
  },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  modalTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text },
  modalContent: { flex: 1, padding: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.sm,
    padding: 12,
    fontSize: 16,
    color: TEACHER.text,
    backgroundColor: GLASS_ROW.fillStrong,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 16 },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    marginRight: 8,
  },
  subjectChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  subjectChipTextActive: { color: TEACHER.textOnPrimary },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  typeChipTextActive: { color: TEACHER.textOnPrimary },
  createButton: {
    borderRadius: TEACHER_RADIUS.sm,
    overflow: 'hidden',
    marginTop: 8,
  },
  createButtonGrad: { padding: 16, alignItems: 'center' },
  createButtonText: {
    color: TEACHER.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
