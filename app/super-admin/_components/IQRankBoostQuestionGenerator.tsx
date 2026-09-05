import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '../../../src/components/ui';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import { extractClassNumberFromSubjectName } from '../../../src/lib/subject-names';
import {
  IQ_DIFFICULTIES,
  emptyGeneratorForm,
  sanitizeTopicStrings,
  type QuestionGeneratorFormState,
} from '../../../src/lib/iq-rank-boost';

type Subject = { _id: string; name: string; classNumber?: string | number };

type Props = {
  classNumber: number;
  onBack: () => void;
};

type PickerProps = {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

function OptionPicker({ visible, title, options, onSelect, onClose }: PickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((item) => (
              <Pressable
                key={item.value}
                style={styles.pickerItem}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={styles.pickerItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function IQRankBoostQuestionGenerator({ classNumber, onBack }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState<QuestionGeneratorFormState>(emptyGeneratorForm());
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [difficultyPickerOpen, setDifficultyPickerOpen] = useState(false);

  const fetchSubjectsForClass = useCallback(async () => {
    setIsLoadingSubjects(true);
    try {
      const response = await api.get('/api/super-admin/subjects');
      const data = response?.data;
      const allSubjects: Subject[] = data?.data || [];
      const currentClass = String(classNumber);
      const filtered = allSubjects.filter((subject) => {
        const classFromField =
          subject?.classNumber != null && String(subject.classNumber).trim() !== ''
            ? String(subject.classNumber).trim()
            : null;
        const classFromName = extractClassNumberFromSubjectName(subject?.name || '');
        return (classFromField || classFromName) === currentClass;
      });
      setSubjects(filtered);
    } catch {
      Alert.alert('Error', 'Failed to fetch subjects.');
      setSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [classNumber]);

  const fetchTopicsForClass = useCallback(async () => {
    if (!form.subject) {
      setTopics([]);
      return;
    }
    setIsLoadingTopics(true);
    try {
      const response = await api.get('/api/super-admin/content', {
        params: { classNumber, subjectId: form.subject },
      });
      const data = response?.data;
      const contentItems = data?.data || [];
      const rawTopics = contentItems
        .map((item: { topic?: string }) => String(item.topic || '').trim())
        .filter(Boolean);
      setTopics(sanitizeTopicStrings(rawTopics));
    } catch {
      setTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  }, [classNumber, form.subject]);

  useEffect(() => {
    fetchSubjectsForClass();
  }, [fetchSubjectsForClass]);

  useEffect(() => {
    fetchTopicsForClass();
  }, [fetchTopicsForClass]);

  useEffect(() => {
    if (form.subject && !subjects.some((s) => s._id === form.subject)) {
      setForm((p) => ({ ...p, subject: '', topic: '', subtopic: '' }));
      setTopics([]);
    }
  }, [subjects, form.subject]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s._id === form.subject),
    [subjects, form.subject]
  );

  const topicOptions = useMemo(
    () => [{ value: '', label: 'All Topics' }, ...topics.map((t) => ({ value: t, label: t }))],
    [topics]
  );

  const handleGenerate = async () => {
    if (!form.subject) {
      Alert.alert('Validation', 'Please select a subject.');
      return;
    }
    if (form.numberOfQuestions <= 0 || form.numberOfQuestions > 50) {
      Alert.alert('Validation', 'Number of questions must be between 1 and 50.');
      return;
    }
    setIsGenerating(true);
    setIsSuccess(false);
    setGeneratedQuestions([]);
    try {
      const response = await api.post('/api/super-admin/iq-rank-activities/generate-questions', {
        classNumber: classNumber.toString(),
        numberOfQuestions: form.numberOfQuestions,
        difficulty: form.difficulty,
        subjectId: form.subject,
        topic: form.topic || undefined,
        subtopic: form.subtopic || undefined,
      });
      const data = response?.data;
      if (data?.success) {
        const questions = data.data?.questions || [];
        setGeneratedQuestions(questions);
        setIsSuccess(true);
        Alert.alert(
          'Success',
          `Generated ${questions.length} question(s). A new quiz was created and is visible to students.`
        );
        setForm((p) => ({
          numberOfQuestions: 10,
          difficulty: 'medium',
          subject: p.subject,
          topic: p.topic,
          subtopic: p.subtopic,
        }));
      } else {
        throw new Error(data?.message || 'Failed to Generate Questions');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.message || 'Failed to generate questions.');
      setIsSuccess(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Generate Questions For Class {classNumber}</Text>
        <Text style={styles.subtitle}>Use AI To Generate MCQ Questions For Quiz Activities</Text>
      </View>

      <GlassPanel style={styles.card} radius={12} tone="strong">
        <Text style={styles.cardTitle}>Question Generation Settings</Text>
        <Text style={styles.cardDesc}>Configure The Parameters For AI-Generated Questions</Text>

        <Text style={styles.sectionLabel}>Filter Options</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Class</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} value={String(classNumber)} editable={false} />
          <Text style={styles.hint}>Current Class</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject *</Text>
          {isLoadingSubjects ? (
            <ActivityIndicator color="#f97316" />
          ) : subjects.length === 0 ? (
            <Text style={styles.hint}>No subjects available for this class.</Text>
          ) : (
            <Pressable style={styles.pickerField} onPress={() => setSubjectPickerOpen(true)}>
              <Text style={selectedSubject ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedSubject?.name || 'Select Subject'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#5B6779" />
            </Pressable>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Topic</Text>
          {isLoadingTopics ? (
            <ActivityIndicator color="#f97316" />
          ) : topics.length > 0 ? (
            <Pressable style={styles.pickerField} onPress={() => setTopicPickerOpen(true)}>
              <Text style={form.topic ? styles.pickerValue : styles.pickerPlaceholder}>
                {form.topic || 'All Topics (Optional)'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#5B6779" />
            </Pressable>
          ) : (
            <TextInput
              style={styles.input}
              value={form.topic}
              onChangeText={(v) => setForm((p) => ({ ...p, topic: v, subtopic: '' }))}
              placeholder="Enter Topic (Optional)"
            />
          )}
          <Text style={styles.hint}>Optional Filter</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subtopic</Text>
          <TextInput
            style={[styles.input, !form.topic && styles.inputDisabled]}
            value={form.subtopic}
            onChangeText={(v) => setForm((p) => ({ ...p, subtopic: v }))}
            placeholder="Enter Subtopic (Optional)"
            editable={!!form.topic}
          />
          <Text style={styles.hint}>Optional Filter</Text>
        </View>

        <Text style={styles.sectionLabel}>Generation Settings</Text>
        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Number Of Questions</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(form.numberOfQuestions)}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, numberOfQuestions: Math.max(0, parseInt(v, 10) || 0) }))
              }
              placeholder="10"
            />
            <Text style={styles.hint}>Between 1 And 50</Text>
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Difficulty Level</Text>
            <Pressable style={styles.pickerField} onPress={() => setDifficultyPickerOpen(true)}>
              <Text style={styles.pickerValue}>
                {IQ_DIFFICULTIES.find((d) => d.value === form.difficulty)?.label || form.difficulty}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#5B6779" />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.generateBtn, (isGenerating || !form.subject) && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating || !form.subject || form.numberOfQuestions <= 0}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>Generate Questions</Text>
          )}
        </Pressable>
      </GlassPanel>

      {isSuccess && generatedQuestions.length > 0 && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>
              Successfully Generated {generatedQuestions.length} Questions
            </Text>
            <Text style={styles.successText}>
              Questions have been saved and a new quiz was created for Class {classNumber}
              {selectedSubject ? ` (${selectedSubject.name})` : ''}.
            </Text>
          </View>
        </View>
      )}

      {generatedQuestions.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Generated Questions Preview</Text>
          <Text style={styles.previewDesc}>
            Preview of the {generatedQuestions.length} questions that were generated and saved
          </Text>
          {generatedQuestions.map((question, index) => (
            <GlassPanel key={index} style={styles.questionCard} radius={12} tone="strong">
              <View style={styles.questionHeader}>
                <View style={styles.questionTextWrap}>
                  <Text style={styles.questionText} numberOfLines={4}>
                    Q{index + 1}. {question.questionText || question.question}
                  </Text>
                </View>
                <View style={styles.difficultyChip}>
                  <Text style={styles.difficultyChipText}>
                    {question.difficulty || form.difficulty}
                  </Text>
                </View>
              </View>
              {Array.isArray(question.options) && question.options.length > 0 && (
                <View style={styles.optionsList}>
                  {question.options.map((option: any, optIndex: number) => {
                    const isCorrect =
                      option.isCorrect || option === question.correctAnswer;
                    const label = option.text || option;
                    return (
                      <View
                        key={optIndex}
                        style={[styles.optionRow, isCorrect && styles.optionRowCorrect]}
                      >
                        <Text style={styles.optionLabel}>{String.fromCharCode(65 + optIndex)}.</Text>
                        <View style={styles.optionTextWrap}>
                          <Text style={styles.optionText}>{label}</Text>
                        </View>
                        {isCorrect && <Text style={styles.correctMark}>✓</Text>}
                      </View>
                    );
                  })}
                </View>
              )}
              {question.explanation ? (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationText}>
                    <Text style={{ fontWeight: '700' }}>Explanation: </Text>
                    {question.explanation}
                  </Text>
                </View>
              ) : null}
            </GlassPanel>
          ))}
        </View>
      )}

      <OptionPicker
        visible={subjectPickerOpen}
        title="Select Subject"
        options={subjects.map((s) => ({ value: s._id, label: s.name }))}
        onSelect={(v) => setForm((p) => ({ ...p, subject: v, topic: '', subtopic: '' }))}
        onClose={() => setSubjectPickerOpen(false)}
      />
      <OptionPicker
        visible={topicPickerOpen}
        title="Select Topic"
        options={topicOptions}
        onSelect={(v) => setForm((p) => ({ ...p, topic: v, subtopic: '' }))}
        onClose={() => setTopicPickerOpen(false)}
      />
      <OptionPicker
        visible={difficultyPickerOpen}
        title="Difficulty"
        options={IQ_DIFFICULTIES.map((d) => ({ value: d.value, label: d.label }))}
        onSelect={(v) => setForm((p) => ({ ...p, difficulty: v }))}
        onClose={() => setDifficultyPickerOpen(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: { padding: 20, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8 },
  formGroup: { marginBottom: 14 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: 15, color: '#111827' },
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  hint: { fontSize: 11, color: '#5B6779', marginTop: 4 },
  pickerField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  pickerValue: { fontSize: 15, color: '#111827', flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: '#5B6779', flex: 1 },
  generateBtn: { marginTop: 8, backgroundColor: '#f97316', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBox: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 16, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 12, padding: 14 },
  successTitle: { fontWeight: '700', color: '#14532d', fontSize: 15 },
  successText: { fontSize: 13, color: '#166534', marginTop: 4 },
  previewSection: { marginHorizontal: 20, marginBottom: 16 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  previewDesc: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 12 },
  questionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', borderLeftWidth: 4, borderLeftColor: '#3b82f6', padding: 14, marginBottom: 12 },
  questionHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  questionTextWrap: { flex: 1, minWidth: 0 },
  questionText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  difficultyChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  difficultyChipText: { fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  optionsList: { marginTop: 10, gap: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9fafb', padding: 10, borderRadius: 8 },
  optionRowCorrect: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  optionLabel: { fontWeight: '700', color: '#374151' },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionText: { fontSize: 13, color: '#374151' },
  correctMark: { color: '#16a34a', fontWeight: '800' },
  explanationBox: { marginTop: 10, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 10 },
  explanationText: { fontSize: 13, color: '#374151' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemText: { fontSize: 16, color: '#111827' },
  pickerClose: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12 },
  pickerCloseText: { fontWeight: '600', color: '#374151' },
});
