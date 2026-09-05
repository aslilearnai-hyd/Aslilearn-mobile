import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../../src/services/api/adminService';
import {
  AdminScreenShell,
  AdminSearchBar,
  AdminFilterChips,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminFAB,
  AdminModalShell,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

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

export default function AssessmentsView() {
  const { colors, spacing, radius, typo } = useAdminTheme();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
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

  const fetchSubjects = async () => {
    try {
      const data = await adminService.getSubjects();
      setSubjects(data?.data || data?.subjects || data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchAssessments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getAssessments();
      setAssessments(data?.data || data || []);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
    fetchSubjects();
  }, [fetchAssessments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssessments();
  }, [fetchAssessments]);

  const handleCreateAssessment = async () => {
    if (!newAssessment.title || !newAssessment.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await adminService.createAssessment(newAssessment);
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
      fetchAssessments();
    } catch (error) {
      console.error('Failed to create assessment:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    Alert.alert(
      'Delete Assessment',
      'Are you sure you want to delete this assessment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteAssessment(id);
              fetchAssessments();
            } catch (error) {
              console.error('Failed to delete assessment:', error);
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return colors.danger;
      case 'quiz': return colors.primary;
      case 'assignment': return colors.success;
      case 'project': return colors.accent;
      default: return colors.textMuted;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return colors.success;
      case 'medium': return colors.warning;
      case 'hard': return colors.danger;
      default: return colors.textMuted;
    }
  };

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof assessment.subject === 'object' ? assessment.subject?._id : assessment.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    const matchesType = filterType === 'all' || assessment.type === filterType;
    return matchesSearch && matchesSubject && matchesType;
  });

  const subjectChips = [
    { id: 'all', label: 'All Subjects' },
    ...subjects.map((s) => ({ id: s._id || s.id, label: s.name })),
  ];

  const typeChips = ['all', 'quiz', 'exam', 'assignment', 'project'].map((type) => ({
    id: type,
    label: type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1),
  }));

  if (isLoading && !refreshing) {
    return <AdminSkeletonList count={5} />;
  }

  const renderChipRow = (
    label: string,
    options: string[],
    selected: string,
    onSelect: (v: string) => void
  ) => (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const active = selected === opt;
          return (
            <AdminScalePressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={[
                styles.chip,
                {
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.surfaceBorder,
                },
              ]}
            >
              <Text style={{ color: active ? colors.textInverse : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </AdminScalePressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
        <AdminSearchBar
          placeholder="Search Assessments..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={{ marginBottom: spacing.sm }}
        />

        <AdminFilterChips chips={subjectChips} selected={filterSubject} onSelect={setFilterSubject} />
        <View style={{ height: spacing.sm }} />
        <AdminFilterChips chips={typeChips} selected={filterType} onSelect={setFilterType} />
        <View style={{ height: spacing.md }} />

        {filteredAssessments.length === 0 ? (
          <AdminEmptyState
            icon="document-text-outline"
            title="No Assessments Found"
            message="Create your first assessment to get started"
          />
        ) : (
          filteredAssessments.map((assessment, index) => {
            const subjectName =
              typeof assessment.subject === 'object'
                ? assessment.subject?.name
                : assessment.subject || 'General';
            const typeColor = getTypeColor(assessment.type);
            const difficultyColor = getDifficultyColor(assessment.difficulty);

            return (
              <AdminGlassCard key={assessment._id} delay={index * 50} style={{ marginBottom: spacing.sm }}>
                <View style={styles.assessmentHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                      {assessment.type.toUpperCase()}
                    </Text>
                  </View>
                  <AdminScalePressable
                    onPress={() => handleDeleteAssessment(assessment._id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete assessment ${assessment.title}`}
                  >
                    <Ionicons name="trash" size={20} color={colors.danger} />
                  </AdminScalePressable>
                </View>

                <Text style={[typo.section, { color: colors.text }]}>{assessment.title}</Text>
                {assessment.description ? (
                  <Text style={[styles.assessmentDescription, { color: colors.textMuted }]} numberOfLines={2}>
                    {assessment.description}
                  </Text>
                ) : null}

                <View style={styles.assessmentMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="book" size={16} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{subjectName}</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
                    <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                      {assessment.difficulty}
                    </Text>
                  </View>
                </View>

                <View style={[styles.assessmentStats, { borderTopColor: colors.surfaceBorder }]}>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={16} color={colors.primary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                      {assessment.duration} min
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="trophy" size={16} color={colors.warning} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                      {assessment.totalMarks} marks
                    </Text>
                  </View>
                  {assessment.questions ? (
                    <View style={styles.statItem}>
                      <Ionicons name="help-circle" size={16} color={colors.accent} />
                      <Text style={[styles.statText, { color: colors.textSecondary }]}>
                        {assessment.questions} questions
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={assessment.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={assessment.isActive ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: assessment.isActive ? colors.success : colors.danger },
                    ]}
                  >
                    {assessment.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </AdminGlassCard>
            );
          })
        )}
      </AdminScreenShell>

      <AdminFAB onPress={() => setIsCreateModalOpen(true)} icon="add" />

      <AdminModalShell
        visible={isCreateModalOpen}
        title="Create Assessment"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Assessment Title"
              placeholderTextColor={colors.textMuted}
              value={newAssessment.title}
              onChangeText={(text) => setNewAssessment({ ...newAssessment, title: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Assessment Description"
              placeholderTextColor={colors.textMuted}
              value={newAssessment.description}
              onChangeText={(text) => setNewAssessment({ ...newAssessment, description: text })}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {subjects.map((subject) => (
                <AdminScalePressable
                  key={subject._id || subject.id}
                  onPress={() => setNewAssessment({ ...newAssessment, subject: subject._id || subject.id })}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radius.full,
                      backgroundColor:
                        newAssessment.subject === (subject._id || subject.id)
                          ? colors.primary
                          : colors.surface,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        newAssessment.subject === (subject._id || subject.id)
                          ? colors.textInverse
                          : colors.textSecondary,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {subject.name}
                  </Text>
                </AdminScalePressable>
              ))}
            </ScrollView>
          </View>

          {renderChipRow('Type', ['quiz', 'exam', 'assignment', 'project'], newAssessment.type, (v) =>
            setNewAssessment({ ...newAssessment, type: v as any })
          )}
          {renderChipRow('Difficulty', ['easy', 'medium', 'hard'], newAssessment.difficulty, (v) =>
            setNewAssessment({ ...newAssessment, difficulty: v as any })
          )}

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Duration (Min)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newAssessment.duration.toString()}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, duration: parseInt(text) || 60 })}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Total Marks</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="100"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newAssessment.totalMarks.toString()}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, totalMarks: parseInt(text) || 100 })}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Passing Marks</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="50"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newAssessment.passingMarks.toString()}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, passingMarks: parseInt(text) || 50 })}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Questions</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="20"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newAssessment.questions?.toString() || '20'}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, questions: parseInt(text) || 20 })}
              />
            </View>
          </View>

          <AdminScalePressable
            onPress={handleCreateAssessment}
            style={[styles.createButton, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Text style={[styles.createButtonText, { color: colors.textInverse }]}>Create Assessment</Text>
          </AdminScalePressable>
        </ScrollView>
      </AdminModalShell>
    </>
  );
}

const styles = StyleSheet.create({
  chipLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, marginRight: 8 },
  assessmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  assessmentDescription: { fontSize: 14, marginBottom: 12, marginTop: 4 },
  assessmentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14 },
  difficultyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  difficultyText: { fontSize: 12, fontWeight: '700' },
  assessmentStats: { flexDirection: 'row', gap: 16, marginBottom: 12, paddingTop: 12, borderTopWidth: 1 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 14, fontWeight: '600' },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 16 },
  createButton: { padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  createButtonText: { fontSize: 16, fontWeight: '700' },
});
