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

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  classNumber?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
}

export default function QuizzesView() {
  const { colors, spacing, radius, typo } = useAdminTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    subject: '',
    classNumber: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    totalQuestions: 20,
  });

  const fetchSubjects = async () => {
    try {
      const data = await adminService.getSubjects();
      setSubjects(data?.data || data?.subjects || data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getQuizzes();
      setQuizzes(data?.data || data || []);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    fetchSubjects();
  }, [fetchQuizzes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await adminService.createQuiz(newQuiz);
      Alert.alert('Success', 'Quiz created successfully');
      setIsCreateModalOpen(false);
      setNewQuiz({
        title: '',
        description: '',
        subject: '',
        classNumber: '',
        difficulty: 'medium',
        totalQuestions: 20,
      });
      fetchQuizzes();
    } catch (error) {
      console.error('Failed to create quiz:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof quiz.subject === 'object' ? quiz.subject?._id : quiz.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const subjectChips = [
    { id: 'all', label: 'All Subjects' },
    ...subjects.map((s) => ({ id: s._id || s.id, label: s.name })),
  ];

  if (isLoading && !refreshing) {
    return <AdminSkeletonList count={5} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
        <AdminSearchBar
          placeholder="Search Quizzes..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={{ marginBottom: spacing.sm }}
        />

        <AdminFilterChips chips={subjectChips} selected={filterSubject} onSelect={setFilterSubject} />
        <View style={{ height: spacing.md }} />

        {filteredQuizzes.length === 0 ? (
          <AdminEmptyState
            icon="help-circle-outline"
            title="No Quizzes Found"
            message="Create your first quiz to get started"
          />
        ) : (
          filteredQuizzes.map((quiz, index) => {
            const subjectName =
              typeof quiz.subject === 'object' ? quiz.subject?.name : quiz.subject || 'General';

            return (
              <AdminGlassCard key={quiz._id} delay={index * 50} style={{ marginBottom: spacing.sm }}>
                <View style={styles.quizHeader}>
                  <View style={[styles.quizIcon, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="help-circle" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.quizInfo}>
                    <Text style={[typo.section, { color: colors.text }]} numberOfLines={2}>
                      {quiz.title}
                    </Text>
                    <Text style={[styles.quizSubject, { color: colors.textMuted }]}>{subjectName}</Text>
                  </View>
                </View>

                {quiz.description ? (
                  <Text style={[styles.quizDescription, { color: colors.textMuted }]} numberOfLines={2}>
                    {quiz.description}
                  </Text>
                ) : null}

                <View style={[styles.quizMeta, { borderTopColor: colors.surfaceBorder }]}>
                  <View style={styles.metaItem}>
                    <Ionicons name="help-circle" size={16} color={colors.accent} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {quiz.totalQuestions} questions
                    </Text>
                  </View>
                  {quiz.classNumber ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="school" size={16} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        Class {quiz.classNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={quiz.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={quiz.isActive ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: quiz.isActive ? colors.success : colors.danger },
                    ]}
                  >
                    {quiz.isActive ? 'Active' : 'Inactive'}
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
        title="Create Quiz"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Quiz Title"
              placeholderTextColor={colors.textMuted}
              value={newQuiz.title}
              onChangeText={(text) => setNewQuiz({ ...newQuiz, title: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Quiz Description"
              placeholderTextColor={colors.textMuted}
              value={newQuiz.description}
              onChangeText={(text) => setNewQuiz({ ...newQuiz, description: text })}
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
                  onPress={() => setNewQuiz({ ...newQuiz, subject: subject._id || subject.id })}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radius.full,
                      backgroundColor:
                        newQuiz.subject === (subject._id || subject.id)
                          ? colors.primary
                          : colors.surface,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        newQuiz.subject === (subject._id || subject.id)
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

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Class Number</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newQuiz.classNumber}
                onChangeText={(text) => setNewQuiz({ ...newQuiz, classNumber: text })}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Total Questions</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="20"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newQuiz.totalQuestions.toString()}
                onChangeText={(text) => setNewQuiz({ ...newQuiz, totalQuestions: parseInt(text) || 20 })}
              />
            </View>
          </View>

          <AdminScalePressable
            onPress={handleCreateQuiz}
            style={[styles.createButton, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Text style={[styles.createButtonText, { color: colors.textInverse }]}>Create Quiz</Text>
          </AdminScalePressable>
        </ScrollView>
      </AdminModalShell>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, marginRight: 8 },
  quizHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  quizIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quizInfo: { flex: 1 },
  quizSubject: { fontSize: 14, marginTop: 4 },
  quizDescription: { fontSize: 14, marginBottom: 12 },
  quizMeta: { flexDirection: 'row', gap: 16, marginBottom: 12, paddingTop: 12, borderTopWidth: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14 },
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
