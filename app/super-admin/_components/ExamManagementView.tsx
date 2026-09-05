import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
  Pressable,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../src/services/api/api';
import { exportCsvFile } from '../../../src/utils/csvExport';
import { AdminGridList, useAdminListLayout } from '../../admin/_ui';
import { EXAM_CALENDAR_PREFILL_KEY } from '../../../src/lib/super-admin-calendar';
import { getExamClassStrings } from '../../../src/lib/exam-classes';
import { GlassPanel } from '../../../src/components/ui';
import DateTimePickerField, { parseDateTimeLocal } from '../../../src/components/shared/DateTimePickerField';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import {
  type Exam,
  type SchoolOption,
  type ExamFormState,
  type QuestionFormState,
  type PdfQuestionRow,
  type BulkQuestionUploadMode,
  BOARDS,
  EXAM_TYPES,
  EXAM_SUBJECTS,
  CLASS_OPTIONS,
  emptyExamForm,
  emptyQuestionForm,
  questionFormFromExisting,
  normalizeExamFromApi,
  examFormFromExam,
  buildExamSavePayload,
  validateExamForm,
  filterExams,
  dedupeExams,
  groupExamsByClass,
  sortClassSectionKeys,
  getClassWiseStats,
  getExamTypeBadgeStyle,
  getBoardLabel,
  getExamSubjects,
  mapAdminToSchool,
  EXAM_CSV_TEMPLATE,
  QUESTION_CSV_TEMPLATE,
  buildQuestionPayload,
  validateQuestionForm,
  normalizePdfRowSubjectSlug,
  normalizeDisplayText,
} from '../../../src/lib/exam-management';

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

function ChipToggle({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function UploadResultsBox({
  success,
  errors,
}: {
  success: number;
  errors: string[];
}) {
  const hasErrors = errors.length > 0;
  return (
    <View style={[styles.uploadResults, hasErrors ? styles.uploadResultsWarn : styles.uploadResultsOk]}>
      <Text style={styles.uploadResultsTitle}>
        {success > 0 ? `Successfully created ${success} item(s)` : 'No items created'}
      </Text>
      {hasErrors && (
        <ScrollView style={{ maxHeight: 100 }}>
          {errors.map((err, idx) => (
            <Text key={idx} style={styles.uploadErrorLine}>
              • {err}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function ExamManagementView() {
  const { isTablet, gridColumns, gridCellWidth } = useAdminListLayout();
  const [exams, setExams] = useState<Exam[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('all-schools');
  const [selectedClass, setSelectedClass] = useState('all-classes');
  const [error, setError] = useState('');

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [examForm, setExamForm] = useState<ExamFormState>(emptyExamForm());
  const [classSearch, setClassSearch] = useState('');

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [examCsvFile, setExamCsvFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [isUploadingExamCsv, setIsUploadingExamCsv] = useState(false);
  const [examCsvResults, setExamCsvResults] = useState<{ success: number; errors: string[] } | null>(null);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(emptyQuestionForm());
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkQuestionUploadMode>('csv');
  const [questionCsvFile, setQuestionCsvFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [questionPdfFile, setQuestionPdfFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [isUploadingQuestionCsv, setIsUploadingQuestionCsv] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isUploadingExtracted, setIsUploadingExtracted] = useState(false);
  const [pdfQuestionRows, setPdfQuestionRows] = useState<PdfQuestionRow[]>([]);
  const [questionCsvResults, setQuestionCsvResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [allowDuplicateQuestions, setAllowDuplicateQuestions] = useState(true);
  const [isDeletingExam, setIsDeletingExam] = useState<string | null>(null);
  const [isUploadingQuestionImage, setIsUploadingQuestionImage] = useState(false);

  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [quickAddPickerOpen, setQuickAddPickerOpen] = useState(false);
  const [examTypePickerOpen, setExamTypePickerOpen] = useState(false);
  const [boardPickerOpen, setBoardPickerOpen] = useState(false);
  const questionsModalScrollRef = useRef<ScrollView>(null);
  const questionFormOffsetRef = useRef(0);
  const questionOffsetsRef = useRef<Record<string, number>>({});
  const pendingScrollQuestionIdRef = useRef<string | null>(null);

  const fetchExams = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/api/super-admin/exams');
      const data = response?.data;
      const raw: Exam[] = data?.success ? data.data || [] : Array.isArray(data) ? data : data?.data || [];
      setExams(raw.map(normalizeExamFromApi));
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch exams.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSchools = useCallback(async () => {
    setIsLoadingSchools(true);
    try {
      const response = await api.get('/api/super-admin/admins');
      const data = response?.data;
      const adminsList = Array.isArray(data) ? data : data?.data || [];
      const mapped = adminsList
        .map((admin: Record<string, unknown>) => mapAdminToSchool(admin))
        .filter((s: SchoolOption) => s.id)
        .sort((a: SchoolOption, b: SchoolOption) =>
          normalizeDisplayText(a.name).localeCompare(normalizeDisplayText(b.name), undefined, { sensitivity: 'base' })
        );
      setSchools(mapped);
    } catch {
      // non-blocking
    } finally {
      setIsLoadingSchools(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    fetchSchools();
  }, [fetchExams, fetchSchools]);

  useEffect(() => {
    const loadCalendarPrefill = async () => {
      try {
        const raw = await AsyncStorage.getItem(EXAM_CALENDAR_PREFILL_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(EXAM_CALENDAR_PREFILL_KEY);
        const prefill = JSON.parse(raw) as {
          startDate?: string;
          endDate?: string;
          filterType?: 'all-schools' | 'specific-schools';
          selectedSchools?: string[];
        };
        setExamForm((prev) => ({
          ...prev,
          startDate: prefill.startDate ?? prev.startDate,
          endDate: prefill.endDate ?? prev.endDate,
          filterType: prefill.filterType ?? prev.filterType,
          selectedSchools: Array.isArray(prefill.selectedSchools)
            ? prefill.selectedSchools
            : prev.selectedSchools,
        }));
        setIsExamModalOpen(true);
      } catch {
        await AsyncStorage.removeItem(EXAM_CALENDAR_PREFILL_KEY);
      }
    };
    loadCalendarPrefill();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams();
  };

  const dedupedFilteredExams = useMemo(() => {
    const filtered = filterExams(exams, selectedSchool, selectedClass, searchQuery);
    return dedupeExams(filtered);
  }, [exams, selectedSchool, selectedClass, searchQuery]);

  const groupedExams = useMemo(() => groupExamsByClass(dedupedFilteredExams), [dedupedFilteredExams]);
  const classSectionKeys = useMemo(() => sortClassSectionKeys(Object.keys(groupedExams)), [groupedExams]);
  const classWiseStats = useMemo(() => getClassWiseStats(dedupedFilteredExams), [dedupedFilteredExams]);

  const schoolFilterOptions = useMemo(
    () => [{ value: 'all-schools', label: 'All Schools' }, ...schools.map((s) => ({ value: s.id, label: s.name }))],
    [schools]
  );

  const classFilterOptions = useMemo(
    () => [{ value: 'all-classes', label: 'All Classes' }, ...CLASS_OPTIONS.map((c) => ({ value: c, label: `Class ${c}` }))],
    []
  );

  const shareTemplate = async (content: string, title: string) => {
    try {
      const filename = title.toLowerCase().endsWith('.csv') ? title : `${title.replace(/\s+/g, '_')}.csv`;
      await exportCsvFile(content, filename);
    } catch {
      Alert.alert('Download failed', 'Could not download CSV template.');
    }
  };

  const openCreateExam = () => {
    setIsEditing(false);
    setEditingExamId(null);
    setExamForm(emptyExamForm());
    setClassSearch('');
    setIsExamModalOpen(true);
  };

  const openEditExam = (exam: Exam) => {
    setIsEditing(true);
    setEditingExamId(exam._id);
    setExamForm(examFormFromExam(exam));
    setClassSearch('');
    if (exam.isSchoolSpecific && schools.length === 0) fetchSchools();
    setIsExamModalOpen(true);
  };

  const handleSaveExam = async () => {
    const validationError = validateExamForm(examForm);
    if (validationError) {
      Alert.alert('Validation', validationError);
      return;
    }
    setIsSavingExam(true);
    try {
      const payload = buildExamSavePayload(examForm);
      if (isEditing && editingExamId) {
        await api.put(`/api/super-admin/exams/${editingExamId}`, payload);
      } else {
        await api.post('/api/super-admin/exams', payload);
      }
      setIsExamModalOpen(false);
      setIsEditing(false);
      setEditingExamId(null);
      setExamForm(emptyExamForm());
      fetchExams();
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.response?.data?.message || 'Failed to save exam.');
    } finally {
      setIsSavingExam(false);
    }
  };

  const handleDeleteExam = (examId: string) => {
    Alert.alert(
      'Delete Exam',
      'Are you sure? This will also delete all associated questions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingExam(examId);
            try {
              await api.delete(`/api/super-admin/exams/${examId}`);
              fetchExams();
            } catch (err: any) {
              Alert.alert('Error', err?.friendlyMessage || 'Failed to delete exam.');
            } finally {
              setIsDeletingExam(null);
            }
          },
        },
      ]
    );
  };

  const pickExamCsv = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setExamCsvFile({ uri: asset.uri, name: asset.name || 'exams.csv', mimeType: asset.mimeType });
    setExamCsvResults(null);
  };

  const handleExamCsvUpload = async () => {
    if (!examCsvFile) {
      Alert.alert('Validation', 'Please select a CSV or Excel file.');
      return;
    }
    setIsUploadingExamCsv(true);
    setExamCsvResults(null);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: examCsvFile.uri,
        name: examCsvFile.name,
        type: examCsvFile.mimeType || 'text/csv',
      } as any);
      const res = await api.post('/api/super-admin/exams/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res?.data;
      if (data?.success) {
        setExamCsvResults({ success: data.created || data.data?.length || 0, errors: data.errors || [] });
        setExamCsvFile(null);
        fetchExams();
      } else {
        setExamCsvResults({ success: 0, errors: [data?.message || 'Upload failed'] });
      }
    } catch (err: any) {
      setExamCsvResults({
        success: 0,
        errors: [err?.friendlyMessage || err?.response?.data?.message || 'Upload failed'],
      });
    } finally {
      setIsUploadingExamCsv(false);
    }
  };

  const scrollQuestionsModalTo = (y: number) => {
    questionsModalScrollRef.current?.scrollTo({
      y: Math.max(0, y - 16),
      animated: true,
    });
  };

  const fetchQuestions = async (examId: string, opts?: { silent?: boolean; keepScrollToQuestionId?: string | null }) => {
    const focusId =
      opts?.keepScrollToQuestionId != null
        ? String(opts.keepScrollToQuestionId)
        : pendingScrollQuestionIdRef.current;
    if (!opts?.silent) {
      setIsLoadingQuestions(true);
    }
    try {
      const response = await api.get(`/api/super-admin/exams/${examId}/questions`);
      const data = response?.data;
      if (data?.success) {
        setQuestions(data.data || []);
      } else {
        const examRes = await api.get(`/api/super-admin/exams/${examId}`);
        const examData = examRes?.data;
        if (examData?.success && examData.data?.questions) {
          setQuestions(examData.data.questions);
        } else {
          setQuestions([]);
        }
      }
      if (focusId) {
        requestAnimationFrame(() => {
          const y = questionOffsetsRef.current[focusId];
          if (typeof y === 'number') {
            scrollQuestionsModalTo(y);
          }
          pendingScrollQuestionIdRef.current = null;
        });
      }
    } catch {
      setQuestions([]);
    } finally {
      if (!opts?.silent) {
        setIsLoadingQuestions(false);
      }
    }
  };

  const openQuestionsModal = (exam: Exam) => {
    setSelectedExam(exam);
    setQuestionForm(emptyQuestionForm());
    setEditingQuestionId(null);
    setQuestionCsvFile(null);
    setQuestionPdfFile(null);
    setPdfQuestionRows([]);
    setQuestionCsvResults(null);
    setBulkMode('csv');
    setIsQuestionModalOpen(true);
    fetchQuestions(exam._id);
  };

  const closeQuestionsModal = () => {
    setIsQuestionModalOpen(false);
    setSelectedExam(null);
    setQuestions([]);
    setQuestionCsvFile(null);
    setQuestionPdfFile(null);
    setPdfQuestionRows([]);
    setQuestionCsvResults(null);
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm());
  };

  const handleEditQuestion = (q: any) => {
    if (!q?._id) return;
    setEditingQuestionId(String(q._id));
    setQuestionForm(questionFormFromExisting(q));
    setBulkMode('csv');
    requestAnimationFrame(() => {
      scrollQuestionsModalTo(questionFormOffsetRef.current || 0);
    });
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm());
  };

  const handleAddQuestion = async () => {
    if (!selectedExam) return;
    if (!editingQuestionId && bulkMode === 'pdf' && pdfQuestionRows.length > 0) {
      await handleUploadExtractedQuestions();
      return;
    }
    const validationError = validateQuestionForm(questionForm);
    if (validationError) {
      Alert.alert('Validation', validationError);
      return;
    }
    setIsAddingQuestion(true);
    const editingIdSnapshot = editingQuestionId ? String(editingQuestionId) : null;
    try {
      const payload = buildQuestionPayload(questionForm, selectedExam.board, false);
      const isEditing = Boolean(editingQuestionId);
      const res = isEditing
        ? await api.put(
            `/api/super-admin/exams/${selectedExam._id}/questions/${editingQuestionId}`,
            payload
          )
        : await api.post(`/api/super-admin/exams/${selectedExam._id}/questions`, payload);
      const data = res?.data;
      if (data?.success) {
        setQuestionForm(emptyQuestionForm());
        setEditingQuestionId(null);
        if (Array.isArray(data.questions)) {
          setQuestions(data.questions);
          if (editingIdSnapshot) {
            requestAnimationFrame(() => {
              const y = questionOffsetsRef.current[editingIdSnapshot];
              if (typeof y === 'number') scrollQuestionsModalTo(y);
            });
          }
        } else {
          pendingScrollQuestionIdRef.current = editingIdSnapshot;
          fetchQuestions(selectedExam._id, {
            silent: true,
            keepScrollToQuestionId: editingIdSnapshot,
          });
        }
        fetchExams();
        Alert.alert('Success', isEditing ? 'Question updated.' : 'Question added.');
      } else if (
        !isEditing &&
        res?.status === 409 &&
        String(data?.message || '').toLowerCase().includes('duplicate')
      ) {
        Alert.alert(
          'Duplicate Question',
          'A question with the same text AND image already exists.\n\nReplace will DELETE the existing question. Cancel keeps it.\n\nDifferent image questions are not duplicates.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                const replacePayload = buildQuestionPayload(questionForm, selectedExam.board, true);
                await api.post(`/api/super-admin/exams/${selectedExam._id}/questions`, replacePayload);
                setQuestionForm(emptyQuestionForm());
                fetchQuestions(selectedExam._id, { silent: questions.length > 0 });
                fetchExams();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data?.message || (isEditing ? 'Failed to update question.' : 'Failed to add question.'));
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          (editingQuestionId ? 'Failed to update question.' : 'Failed to add question.')
      );
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleQuestionImageUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['image/*'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsUploadingQuestionImage(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.name || 'question.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      const res = await api.post('/api/super-admin/upload-question-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res?.data;
      if (data?.success && data.imageUrl) {
        setQuestionForm((p) => ({ ...p, questionImage: data.imageUrl }));
        Alert.alert('Uploaded', 'Question image saved.');
      } else {
        Alert.alert('Upload failed', data?.message || 'Could not upload image.');
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err?.friendlyMessage || 'Upload error.');
    } finally {
      setIsUploadingQuestionImage(false);
    }
  };

  const pickQuestionCsv = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setQuestionCsvFile({ uri: asset.uri, name: asset.name || 'questions.csv', mimeType: asset.mimeType });
    setQuestionCsvResults(null);
  };

  const handleQuestionCsvUpload = async () => {
    if (!selectedExam || !questionCsvFile) {
      Alert.alert('Validation', 'Select a CSV file and ensure an exam is selected.');
      return;
    }
    setIsUploadingQuestionCsv(true);
    setQuestionCsvResults(null);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: questionCsvFile.uri,
        name: questionCsvFile.name,
        type: questionCsvFile.mimeType || 'text/csv',
      } as any);
      formData.append('allowDuplicates', allowDuplicateQuestions ? 'true' : 'false');
      const res = await api.post(
        `/api/super-admin/exams/${selectedExam._id}/questions/bulk-upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const data = res?.data;
      if (data?.success) {
        setQuestionCsvResults({
          success: data.created || data.data?.length || 0,
          errors: data.errors || [],
        });
        setQuestionCsvFile(null);
        fetchQuestions(selectedExam._id);
        fetchExams();
      } else {
        setQuestionCsvResults({ success: 0, errors: [data?.message || 'Upload failed'] });
      }
    } catch (err: any) {
      setQuestionCsvResults({
        success: 0,
        errors: [err?.friendlyMessage || 'Upload failed'],
      });
    } finally {
      setIsUploadingQuestionCsv(false);
    }
  };

  const pickQuestionPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: 'application/pdf',
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setQuestionPdfFile({ uri: asset.uri, name: asset.name || 'questions.pdf', mimeType: asset.mimeType });
    setPdfQuestionRows([]);
  };

  const handleExtractPdfQuestions = async () => {
    if (!selectedExam || !questionPdfFile) {
      Alert.alert('Validation', 'Select a PDF file.');
      return;
    }
    setIsExtractingPdf(true);
    setPdfQuestionRows([]);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: questionPdfFile.uri,
        name: questionPdfFile.name,
        type: questionPdfFile.mimeType || 'application/pdf',
      } as any);
      formData.append('fastMode', 'true');
      let usedProtected = false;
      let res;
      try {
        res = await api.post(
          `/api/super-admin/exams/${selectedExam._id}/questions/pdf-convert`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
        );
      } catch (err: any) {
        if (err?.response?.status === 404) {
          usedProtected = true;
          res = await api.post(
            `/api/super-admin/protected/exams/${selectedExam._id}/questions/pdf-convert`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
          );
        } else {
          throw err;
        }
      }
      let data = res?.data;

      // Async job: short POST + poll (avoids nginx 5 min 504)
      if (data?.async && data?.jobId) {
        const jobId = String(data.jobId);
        const jobPath = usedProtected
          ? `/api/super-admin/protected/exams/${selectedExam._id}/questions/pdf-convert/jobs/${jobId}`
          : `/api/super-admin/exams/${selectedExam._id}/questions/pdf-convert/jobs/${jobId}`;
        const deadline = Date.now() + 30 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 2500));
          const pollRes = await api.get(jobPath, { timeout: 30000 });
          const poll = pollRes?.data;
          if (poll?.status === 'failed' || poll?.success === false) {
            Alert.alert('Extraction failed', poll?.message || 'PDF extraction failed.');
            return;
          }
          if (poll?.status === 'completed' && Array.isArray(poll?.data)) {
            data = poll;
            break;
          }
        }
      }

      const rows = Array.isArray(data?.data) ? data.data : data?.data?.rows || data?.rows || [];
      if (!data?.success || !Array.isArray(rows) || rows.length === 0) {
        Alert.alert('Extraction failed', data?.message || 'No extractable questions found in PDF.');
        return;
      }
      setPdfQuestionRows(rows);
    } catch (err: any) {
      Alert.alert('Extraction failed', err?.friendlyMessage || err?.response?.data?.message || 'PDF extraction failed.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const mapPdfRowToPayload = (row: PdfQuestionRow) => {
    const optionTexts = [row.option1, row.option2, row.option3, row.option4]
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    const options = optionTexts.map((text) => ({ text, isCorrect: false }));
    const type = row.questionType;
    const sharedMatterText = String(row.sharedMatterText || row.passageText || '').trim();
    const sharedMatterId = String(row.sharedMatterId || row.passageId || '').trim();
    const base = {
      questionText: String(row.questionText || '').trim(),
      questionType: type,
      subject: String(row.subject || 'maths').trim().toLowerCase(),
      marks: Number(row.marks || 1) || 1,
      negativeMarks: 0,
      explanation: String(row.explanation || '').trim() || undefined,
      board: selectedExam?.board,
      sharedMatterId: sharedMatterId || undefined,
      sharedMatterText: sharedMatterText || undefined,
      sharedMatterKind: row.sharedMatterKind || undefined,
      assertionText: String(row.assertionText || '').trim() || undefined,
      reasonText: String(row.reasonText || '').trim() || undefined,
      matchColumnI: Array.isArray(row.matchColumnI) && row.matchColumnI.length ? row.matchColumnI : undefined,
      matchColumnII: Array.isArray(row.matchColumnII) && row.matchColumnII.length ? row.matchColumnII : undefined,
    } as Record<string, unknown>;

    if (type === 'integer') {
      const n = Number(String(row.correctAnswer || '').trim());
      return { ...base, options: [], correctAnswer: Number.isFinite(n) ? n : row.correctAnswer };
    }
    const answerText = String(row.correctAnswer || '').trim();
    if (type === 'multiple') {
      const answerSet = new Set(answerText.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
      options.forEach((opt) => {
        if (answerSet.has(String(opt.text || '').trim().toLowerCase())) opt.isCorrect = true;
      });
      return { ...base, options, correctAnswer: options.filter((o) => o.isCorrect).map((o) => o.text) };
    }
    const idx = options.findIndex((o) => String(o.text || '').trim().toLowerCase() === answerText.toLowerCase());
    if (idx >= 0) options[idx].isCorrect = true;
    return { ...base, options, correctAnswer: idx >= 0 ? options[idx].text : answerText };
  };

  const handleUploadExtractedQuestions = async () => {
    if (!selectedExam || pdfQuestionRows.length === 0) return;
    const invalid = pdfQuestionRows.some((r) => !normalizePdfRowSubjectSlug(r.subject));
    if (invalid) {
      Alert.alert('Validation', 'Some questions have invalid or missing subjects. Fix before uploading.');
      return;
    }
    setIsUploadingExtracted(true);
    try {
      const payloads = pdfQuestionRows.map(mapPdfRowToPayload);
      let res;
      try {
        res = await api.post(
          `/api/super-admin/exams/${selectedExam._id}/questions/bulk-upload`,
          { questions: payloads, allowDuplicates: allowDuplicateQuestions },
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        if (err?.response?.status === 404) {
          res = await api.post(
            `/api/super-admin/protected/exams/${selectedExam._id}/questions/bulk-upload`,
            { questions: payloads, allowDuplicates: allowDuplicateQuestions }
          );
        } else {
          throw err;
        }
      }
      const data = res?.data;
      if (data?.success) {
        Alert.alert('Success', `Uploaded ${data.created || payloads.length} question(s).`);
        setPdfQuestionRows([]);
        setQuestionPdfFile(null);
        fetchQuestions(selectedExam._id);
        fetchExams();
      } else {
        Alert.alert('Error', data?.message || 'Upload failed.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || 'Could not upload extracted questions.');
    } finally {
      setIsUploadingExtracted(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!selectedExam) return;
    Alert.alert('Delete Question', 'Remove this question?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/super-admin/exams/${selectedExam._id}/questions/${questionId}`);
            fetchQuestions(selectedExam._id);
            fetchExams();
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage || 'Failed to delete question.');
          }
        },
      },
    ]);
  };

  const handleDeleteAllQuestions = () => {
    if (!selectedExam || questions.length === 0) return;
    Alert.alert(
      'Delete All Questions',
      `Delete all ${questions.length} question(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/super-admin/exams/${selectedExam._id}/questions`);
              fetchQuestions(selectedExam._id);
              fetchExams();
            } catch (err: any) {
              Alert.alert('Error', err?.friendlyMessage || 'Failed to delete questions.');
            }
          },
        },
      ]
    );
  };

  const toggleAssignedClass = (cls: string) => {
    setExamForm((p) => {
      const has = p.assignedClasses.includes(cls);
      const next = has ? p.assignedClasses.filter((c) => c !== cls) : [...p.assignedClasses, cls];
      return { ...p, assignedClasses: next, classNumber: next[0] || '' };
    });
  };

  const toggleSubject = (subject: typeof EXAM_SUBJECTS[number]['value']) => {
    setExamForm((p) => {
      const has = p.subjects.includes(subject);
      return {
        ...p,
        subjects: has ? p.subjects.filter((s) => s !== subject) : [...p.subjects, subject],
      };
    });
  };

  const toggleTargetSchool = (schoolId: string) => {
    setExamForm((p) => {
      const has = p.selectedSchools.includes(schoolId);
      return {
        ...p,
        selectedSchools: has
          ? p.selectedSchools.filter((id) => id !== schoolId)
          : [...p.selectedSchools, schoolId],
      };
    });
  };

  const filteredClassOptions = CLASS_OPTIONS.filter((cls) =>
    `Class ${cls}`.toLowerCase().includes(classSearch.toLowerCase())
  );

  const pdfSubjectInvalid = pdfQuestionRows.some((r) => !normalizePdfRowSubjectSlug(r.subject));

  const renderExamCard = (exam: Exam) => {
    const examClassLabels = getExamClassStrings(exam);
    const examSubjects = getExamSubjects(exam);
    const typeStyle = getExamTypeBadgeStyle(exam.examType);
    return (
      <GlassPanel key={exam._id} style={[styles.examCard, isTablet && styles.examCardTablet]} radius={12} tone="medium">
        <View style={styles.examCardTop}>
          <Text style={styles.examCardTitle} numberOfLines={isTablet ? 2 : undefined}>
            {exam.title}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
                {EXAM_TYPES.find((t) => t.value === exam.examType)?.label || exam.examType}
              </Text>
            </View>
            <View style={[styles.statusBadge, exam.isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={styles.statusBadgeText}>{exam.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
            <View style={styles.boardBadge}>
              <Text style={styles.boardBadgeText}>{getBoardLabel(exam.board)}</Text>
            </View>
          </View>
        </View>
        {exam.description ? (
          <Text style={styles.examDescription} numberOfLines={isTablet ? 3 : 2}>
            {exam.description}
          </Text>
        ) : null}
        <View style={[styles.detailGrid, isTablet && styles.detailGridTablet]}>
          <View style={[styles.detailRow, isTablet && styles.detailRowTablet]}>
            {isTablet ? (
              <View style={styles.detailRowLeft}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.detailLabel}>Duration:</Text>
              </View>
            ) : (
              <Ionicons name="time-outline" size={14} color="#6b7280" />
            )}
            <Text style={[styles.detailText, isTablet && styles.detailTextTablet]}>{exam.duration} min</Text>
          </View>
          <View style={[styles.detailRow, isTablet && styles.detailRowTablet]}>
            {isTablet ? (
              <View style={styles.detailRowLeft}>
                <Ionicons name="book-outline" size={14} color="#6b7280" />
                <Text style={styles.detailLabel}>Questions:</Text>
              </View>
            ) : (
              <Ionicons name="book-outline" size={14} color="#6b7280" />
            )}
            <Text style={[styles.detailText, isTablet && styles.detailTextTablet]} numberOfLines={isTablet ? 2 : undefined}>
              {exam.totalQuestions} questions · {exam.totalMarks} marks
            </Text>
          </View>
          <View style={[styles.detailRow, isTablet && styles.detailRowTablet]}>
            {isTablet ? (
              <View style={styles.detailRowLeft}>
                <Ionicons name="eye-outline" size={14} color="#6b7280" />
                <Text style={styles.detailLabel}>Attempts:</Text>
              </View>
            ) : (
              <Ionicons name="eye-outline" size={14} color="#6b7280" />
            )}
            <Text style={[styles.detailText, isTablet && styles.detailTextTablet]}>{exam.maxAttempts || 1} attempt(s)</Text>
          </View>
          {exam.startDate ? (
            <View style={[styles.detailRow, isTablet && styles.detailRowTablet]}>
              {isTablet ? (
                <View style={styles.detailRowLeft}>
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text style={styles.detailLabel}>Dates:</Text>
                </View>
              ) : (
                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              )}
              <Text style={[styles.detailText, isTablet && styles.detailTextTablet]} numberOfLines={isTablet ? 2 : undefined}>
                {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.subjectRow}>
          {examSubjects.map((subj) => (
            <View key={`${exam._id}-${subj}`} style={styles.subjectChip}>
              <Text style={styles.subjectChipText} numberOfLines={1}>
                {EXAM_SUBJECTS.find((x) => x.value === subj)?.label || subj}
              </Text>
            </View>
          ))}
          {examClassLabels.map((cls, idx) => (
            <View key={`${exam._id}-cls-${idx}`} style={styles.classChip}>
              <Text style={styles.classChipText}>Class {cls}</Text>
            </View>
          ))}
          {Array.isArray(exam.questions) && exam.questions.length > 0 && (
            <View style={styles.qCountChip}>
              <Text style={styles.qCountChipText}>{exam.questions.length} Q</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          {/* Padding lives on the inner Pressables so the tap target stays the full button. */}
          <View style={styles.cardActions}>
            <GlassPanel style={[styles.cardActionBtn, isTablet && styles.cardActionBtnTablet]} radius={8} tone="medium">
              <Pressable style={[styles.cardActionBtnInner, isTablet && styles.cardActionBtnInnerTablet]} onPress={() => openEditExam(exam)}>
                <Ionicons name="create-outline" size={16} color="#374151" />
                <Text style={styles.cardActionText}>Edit</Text>
              </Pressable>
            </GlassPanel>
            <GlassPanel style={[styles.cardActionBtn, isTablet && styles.cardActionBtnTablet]} radius={8} tone="medium">
              <Pressable style={[styles.cardActionBtnInner, isTablet && styles.cardActionBtnInnerTablet]} onPress={() => openQuestionsModal(exam)}>
                <Ionicons name="add" size={16} color="#0f766e" />
                <Text style={[styles.cardActionText, { color: '#0f766e' }]} numberOfLines={1}>
                  Add
                </Text>
              </Pressable>
            </GlassPanel>
            <GlassPanel
              style={[styles.cardActionBtn, styles.deleteActionBtn, isTablet && styles.cardActionBtnTablet]}
              radius={8}
              tone="medium"
            >
              <Pressable
                style={[styles.cardActionBtnInner, isTablet && styles.cardActionBtnInnerTablet]}
                onPress={() => handleDeleteExam(exam._id)}
                disabled={isDeletingExam === exam._id}
              >
                {isDeletingExam === exam._id ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </>
                )}
              </Pressable>
            </GlassPanel>
          </View>
        </View>
      </GlassPanel>
    );
  };

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Exam Management</Text>
          <Text style={styles.headerSubtitle}>Create and manage exams</Text>
        </View>
        <View style={[styles.headerActions, isTablet && styles.headerActionsTablet]}>
          {/* Padding moved inward so the whole button stays tappable. */}
          <GlassPanel style={styles.outlineButton} radius={8} tone="medium">
            <TouchableOpacity style={styles.outlineButtonInner} onPress={() => setIsCsvModalOpen(true)}>
              <Ionicons name="cloud-upload-outline" size={18} color="#16a34a" />
              <Text style={styles.outlineButtonTextGreen}>Upload CSV</Text>
            </TouchableOpacity>
          </GlassPanel>
          <TouchableOpacity style={styles.addButton} onPress={openCreateExam}>
            <LinearGradient colors={['#7dd3fc', '#2dd4bf']} style={styles.addButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Create Exam</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {classWiseStats.length > 0 && (
        isTablet ? (
          <View style={styles.statsWrapTablet}>
            {classWiseStats.map((item) => (
              <View key={item.cls} style={styles.statBadgeTablet}>
                <Text style={styles.statBadgeText} numberOfLines={1}>
                  {item.cls === 'unassigned' ? 'Unassigned' : `Class ${item.cls}`} → {item.count} Exams
                </Text>
              </View>
            ))}
          </View>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsContent}>
          {classWiseStats.map((item) => (
            <View key={item.cls} style={styles.statBadge}>
              <Text style={styles.statBadgeText}>
                {item.cls === 'unassigned' ? 'Unassigned' : `Class ${item.cls}`} → {item.count} Exams
              </Text>
            </View>
          ))}
        </ScrollView>
        )
      )}

      <View style={[styles.filtersCard, isTablet && styles.filtersCardTablet]}>
        {/* Padding moved to the inner Pressables so the full select stays tappable. */}
        {dedupedFilteredExams.length > 0 && (
          <GlassPanel style={styles.filterSelect} radius={8} tone="medium">
            <Pressable style={styles.filterSelectInner} onPress={() => setQuickAddPickerOpen(true)}>
              <Ionicons name="help-circle-outline" size={16} color="#6b7280" />
              <View style={styles.filterSelectTextWrap}>
                <Text style={styles.filterSelectText}>Quick Add Questions</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#5B6779" />
            </Pressable>
          </GlassPanel>
        )}
        <GlassPanel style={styles.filterSelect} radius={8} tone="medium">
          <Pressable style={styles.filterSelectInner} onPress={() => setSchoolPickerOpen(true)}>
            <Ionicons name="school-outline" size={16} color="#6b7280" />
            <View style={styles.filterSelectTextWrap}>
              <Text style={styles.filterSelectText} numberOfLines={1}>
                {schoolFilterOptions.find((o) => o.value === selectedSchool)?.label || 'All Schools'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#5B6779" />
          </Pressable>
        </GlassPanel>
        <GlassPanel style={styles.filterSelect} radius={8} tone="medium">
          <Pressable style={styles.filterSelectInner} onPress={() => setClassPickerOpen(true)}>
            <Ionicons name="school" size={16} color="#6b7280" />
            <View style={styles.filterSelectTextWrap}>
              <Text style={styles.filterSelectText}>
                {classFilterOptions.find((o) => o.value === selectedClass)?.label || 'All Classes'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#5B6779" />
          </Pressable>
        </GlassPanel>
        <GlassPanel style={styles.countBadge} radius={8} tone="medium">
          <Text style={styles.countBadgeText}>
            {dedupedFilteredExams.length} {dedupedFilteredExams.length === 1 ? 'Exam' : 'Exams'}
          </Text>
        </GlassPanel>
      </View>

      <View style={styles.searchContainer}>
        <GlassPanel style={styles.searchInputContainer} radius={12} tone="strong">
          <View style={styles.searchInputContainerInner}>
            <Ionicons name="search" size={20} color="#5B6779" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exams by title, description, or type..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#5B6779"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear exam search"
              >
                <Ionicons name="close-circle" size={20} color="#5B6779" />
              </TouchableOpacity>
            )}
          </View>
        </GlassPanel>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading exams...</Text>
        </View>
      ) : dedupedFilteredExams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>
            {searchQuery || selectedSchool !== 'all-schools' || selectedClass !== 'all-classes'
              ? 'No exams found matching your filters'
              : 'No exams yet'}
          </Text>
          <Text style={styles.emptyHint}>Create your first exam to get started</Text>
        </View>
      ) : (
        classSectionKeys.map((classKey) => {
          const classLabel = classKey === 'unassigned' ? 'Unassigned Class' : `Class ${classKey}`;
          const classExams = groupedExams[classKey];
          return (
            <View key={classKey} style={styles.classSection}>
              <Text style={styles.classSectionTitle}>{classLabel}</Text>
              {isTablet ? (
                <AdminGridList
                  data={classExams}
                  columns={gridColumns}
                  gridCellWidth={gridCellWidth}
                  keyExtractor={(item) => item._id}
                  renderItem={(exam) => renderExamCard(exam)}
                />
              ) : (
                classExams.map((exam) => renderExamCard(exam))
              )}
            </View>
          );
        })
      )}

      {/* Create / Edit Exam Modal */}
      <Modal visible={isExamModalOpen} animationType="slide" onRequestClose={() => setIsExamModalOpen(false)}>
        <View style={styles.formModalWrap}>
          <View style={styles.formModalHeader}>
            <Text style={styles.formModalTitle}>{isEditing ? 'Edit Exam' : 'Create New Exam'}</Text>
            <Pressable
              onPress={() => setIsExamModalOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close exam form"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.formModalBody}
            contentContainerStyle={styles.formModalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.formHint}>
              Create a new exam for students. Make it available to all schools or specific schools only.
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Exam Title *</Text>
              <TextInput style={styles.formInput} value={examForm.title} onChangeText={(v) => setExamForm((p) => ({ ...p, title: v }))} placeholder="e.g., JEE Mains Mock Test 2024" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, styles.textArea]} value={examForm.description} onChangeText={(v) => setExamForm((p) => ({ ...p, description: v }))} multiline numberOfLines={3} placeholder="Brief description" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Exam Visibility *</Text>
              <View style={styles.segmentRow}>
                <ChipToggle label="All Schools" selected={examForm.filterType === 'all-schools'} onPress={() => setExamForm((p) => ({ ...p, filterType: 'all-schools', selectedSchools: [] }))} />
                <ChipToggle label="Specific Schools" selected={examForm.filterType === 'specific-schools'} onPress={() => { setExamForm((p) => ({ ...p, filterType: 'specific-schools' })); if (schools.length === 0) fetchSchools(); }} />
              </View>
            </View>
            {examForm.filterType === 'specific-schools' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Schools *</Text>
                {isLoadingSchools ? (
                  <ActivityIndicator color="#f97316" />
                ) : schools.length === 0 ? (
                  <Text style={styles.formHint}>No schools available</Text>
                ) : (
                  <ScrollView
                    style={styles.checkboxListScroll}
                    contentContainerStyle={styles.checkboxListContent}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {schools.map((school) => (
                      <Pressable key={school.id} style={styles.checkboxRow} onPress={() => toggleTargetSchool(school.id)}>
                        <Ionicons
                          name={examForm.selectedSchools.includes(school.id) ? 'checkbox' : 'square-outline'}
                          size={20}
                          color="#f97316"
                        />
                        <Text style={styles.checkboxLabel}>{school.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Exam Type *</Text>
              <Pressable style={styles.pickerField} onPress={() => setExamTypePickerOpen(true)}>
                <Text>{EXAM_TYPES.find((t) => t.value === examForm.examType)?.label}</Text>
                <Ionicons name="chevron-down" size={18} color="#5B6779" />
              </Pressable>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Assigned Classes *</Text>
              <TextInput style={styles.formInput} value={classSearch} onChangeText={setClassSearch} placeholder="Search class..." />
              {examForm.assignedClasses.length > 0 ? (
                <View style={styles.chipWrap}>
                  {examForm.assignedClasses.map((cls) => (
                    <View key={cls} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>Class {cls}</Text>
                      <Pressable
                        onPress={() => toggleAssignedClass(cls)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove Class ${cls}`}
                      >
                        <Ionicons name="close" size={14} color="#0369a1" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <ScrollView
                style={styles.checkboxListScroll}
                contentContainerStyle={styles.checkboxListContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {filteredClassOptions.map((cls) => (
                  <Pressable key={cls} style={styles.checkboxRow} onPress={() => toggleAssignedClass(cls)}>
                    <Ionicons name={examForm.assignedClasses.includes(cls) ? 'checkbox' : 'square-outline'} size={20} color="#f97316" />
                    <Text style={styles.checkboxLabel}>Class {cls}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subjects *</Text>
              <ScrollView
                style={styles.checkboxListScroll}
                contentContainerStyle={styles.checkboxListContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {EXAM_SUBJECTS.map((subject) => (
                  <Pressable key={subject.value} style={styles.checkboxRow} onPress={() => toggleSubject(subject.value)}>
                    <Ionicons name={examForm.subjects.includes(subject.value) ? 'checkbox' : 'square-outline'} size={20} color="#f97316" />
                    <Text style={styles.checkboxLabel}>{subject.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>No. of Attempts *</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={examForm.maxAttempts} onChangeText={(v) => setExamForm((p) => ({ ...p, maxAttempts: v }))} placeholder="1" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Board</Text>
              <Pressable style={styles.pickerField} onPress={() => setBoardPickerOpen(true)}>
                <Text>{getBoardLabel(examForm.board)}</Text>
                <Ionicons name="chevron-down" size={18} color="#5B6779" />
              </Pressable>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Duration (min) *</Text>
                <TextInput style={styles.formInput} keyboardType="numeric" value={examForm.duration} onChangeText={(v) => setExamForm((p) => ({ ...p, duration: v }))} placeholder="180" />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Questions *</Text>
                <TextInput style={styles.formInput} keyboardType="numeric" value={examForm.totalQuestions} onChangeText={(v) => setExamForm((p) => ({ ...p, totalQuestions: v }))} placeholder="90" />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Total Marks *</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={examForm.totalMarks} onChangeText={(v) => setExamForm((p) => ({ ...p, totalMarks: v }))} placeholder="360" />
            </View>
            <View style={styles.formGroup}>
              <DateTimePickerField
                label="Start Date *"
                value={examForm.startDate}
                onChange={(startDate) => setExamForm((p) => ({ ...p, startDate }))}
              />
            </View>
            <View style={styles.formGroup}>
              <DateTimePickerField
                label="End Date *"
                value={examForm.endDate}
                minimumDate={examForm.startDate ? parseDateTimeLocal(examForm.startDate) : undefined}
                onChange={(endDate) => setExamForm((p) => ({ ...p, endDate }))}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Instructions</Text>
              <TextInput style={[styles.formInput, styles.textArea]} value={examForm.instructions} onChangeText={(v) => setExamForm((p) => ({ ...p, instructions: v }))} multiline numberOfLines={4} placeholder="Exam instructions and guidelines" />
            </View>
          </ScrollView>
          <View style={styles.formModalFooter}>
            <Pressable style={styles.cancelButton} onPress={() => setIsExamModalOpen(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            {isEditing && editingExamId ? (
              <Pressable
                style={[styles.cancelButton, { borderColor: '#99f6e4' }]}
                onPress={() => {
                  const exam =
                    exams.find((e) => String(e._id) === String(editingExamId)) ||
                    ({ _id: editingExamId, title: examForm.title } as Exam);
                  setIsExamModalOpen(false);
                  openQuestionsModal(exam);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: '#0f766e' }]}>Add Questions</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.submitButton} onPress={handleSaveExam} disabled={isSavingExam}>
              {isSavingExam ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.submitButtonText}>{isEditing ? 'Update Exam' : 'Create Exam'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Bulk Exam CSV Modal */}
      <Modal visible={isCsvModalOpen} animationType="slide" transparent onRequestClose={() => setIsCsvModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Upload Exams via CSV</Text>
              <Pressable
                onPress={() => setIsCsvModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close bulk exam upload"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.templateBox}>
                <Text style={styles.templateTitle}>Need a template?</Text>
                <Pressable style={styles.templateBtn} onPress={() => shareTemplate(EXAM_CSV_TEMPLATE, 'Exam CSV Template')}>
                  <Ionicons name="download-outline" size={16} color="#2563eb" />
                  <Text style={styles.templateBtnText}>Share Template</Text>
                </Pressable>
              </View>
              <Text style={styles.formHint}>
                Columns: title, description, examType, classNumber, subject, maxAttempts, board, duration, totalQuestions, totalMarks, instructions, startDate, endDate, filterType, targetSchools
              </Text>
              <Pressable style={styles.filePickBtn} onPress={pickExamCsv}>
                <Ionicons name="document-outline" size={20} color="#2563eb" />
                <Text style={styles.filePickText}>{examCsvFile ? examCsvFile.name : 'Select CSV or Excel file'}</Text>
              </Pressable>
              {examCsvResults && <UploadResultsBox success={examCsvResults.success} errors={examCsvResults.errors} />}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => { setIsCsvModalOpen(false); setExamCsvFile(null); setExamCsvResults(null); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.submitButton, styles.greenSubmit]} onPress={handleExamCsvUpload} disabled={isUploadingExamCsv || !examCsvFile}>
                {isUploadingExamCsv ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Upload CSV</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Questions Modal */}
      <Modal visible={isQuestionModalOpen} animationType="slide" onRequestClose={closeQuestionsModal}>
        <View style={styles.formModalWrap}>
          <View style={styles.formModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formModalTitle}>Manage Questions</Text>
              <Text style={styles.formModalSubtitle} numberOfLines={1}>{selectedExam?.title}</Text>
            </View>
            <Pressable
              onPress={closeQuestionsModal}
              accessibilityRole="button"
              accessibilityLabel="Close questions manager"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView
            ref={questionsModalScrollRef}
            style={styles.formModalBody}
            contentContainerStyle={styles.formModalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.bulkModeRow}>
              <ChipToggle label="Upload CSV/XLSX" selected={bulkMode === 'csv'} onPress={() => setBulkMode('csv')} />
              <ChipToggle label="Upload from PDF" selected={bulkMode === 'pdf'} onPress={() => setBulkMode('pdf')} />
            </View>
            {bulkMode === 'csv' ? (
              <View style={styles.bulkSection}>
                <View style={styles.templateBox}>
                  <Pressable style={styles.templateBtn} onPress={() => shareTemplate(QUESTION_CSV_TEMPLATE, 'Question CSV Template')}>
                    <Ionicons name="download-outline" size={16} color="#2563eb" />
                    <Text style={styles.templateBtnText}>Share Question Template</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.filePickBtn} onPress={pickQuestionCsv}>
                  <Ionicons name="document-outline" size={20} color="#2563eb" />
                  <Text style={styles.filePickText}>{questionCsvFile ? questionCsvFile.name : 'Select CSV or Excel file'}</Text>
                </Pressable>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Allow duplicate questions</Text>
                  <Switch value={allowDuplicateQuestions} onValueChange={setAllowDuplicateQuestions} trackColor={{ true: '#fdba74' }} />
                </View>
                {questionCsvResults && <UploadResultsBox success={questionCsvResults.success} errors={questionCsvResults.errors} />}
                <Pressable style={[styles.submitButton, styles.greenSubmit, { marginTop: 8 }]} onPress={handleQuestionCsvUpload} disabled={isUploadingQuestionCsv || !questionCsvFile}>
                  {isUploadingQuestionCsv ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Upload Questions CSV</Text>}
                </Pressable>
              </View>
            ) : (
              <View style={styles.bulkSection}>
                <Pressable style={styles.filePickBtn} onPress={pickQuestionPdf}>
                  <Ionicons name="document-outline" size={20} color="#2563eb" />
                  <Text style={styles.filePickText}>{questionPdfFile ? questionPdfFile.name : 'Select PDF file'}</Text>
                </Pressable>
                <Pressable style={[styles.submitButton, { marginTop: 8, backgroundColor: '#4f46e5' }]} onPress={handleExtractPdfQuestions} disabled={isExtractingPdf || !questionPdfFile}>
                  {isExtractingPdf ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Extract Questions from PDF</Text>}
                </Pressable>
                {pdfQuestionRows.length > 0 && (
                  <View style={styles.pdfPreview}>
                    <Text style={styles.pdfPreviewTitle}>Preview ({pdfQuestionRows.length} questions)</Text>
                    {pdfSubjectInvalid && (
                      <Text style={styles.pdfPreviewWarn}>Some questions have invalid subjects. Review before uploading.</Text>
                    )}
                    {pdfQuestionRows.slice(0, 10).map((row) => (
                      <View key={row.row} style={styles.pdfPreviewRow}>
                        <Text style={styles.pdfPreviewQ} numberOfLines={2}>#{row.row} {row.questionText}</Text>
                        <Text style={styles.pdfPreviewMeta}>{row.questionType} · {row.subject} · {row.marks} marks</Text>
                      </View>
                    ))}
                    {pdfQuestionRows.length > 10 && (
                      <Text style={styles.formHint}>+ {pdfQuestionRows.length - 10} more...</Text>
                    )}
                    <Pressable style={[styles.submitButton, styles.greenSubmit, { marginTop: 8 }]} onPress={handleUploadExtractedQuestions} disabled={isUploadingExtracted || pdfSubjectInvalid}>
                      {isUploadingExtracted ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Upload These Questions</Text>}
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <View
              style={styles.divider}
              onLayout={(e) => {
                questionFormOffsetRef.current = e.nativeEvent.layout.y;
              }}
            />
            <Text style={styles.sectionTitle}>
              {editingQuestionId ? 'Edit Question' : 'Add Single Question'}
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Question Type</Text>
              <View style={styles.segmentRow}>
                {(['mcq', 'multiple', 'integer', 'assertion_reason', 'match_following'] as const).map((t) => (
                  <ChipToggle
                    key={t}
                    label={
                      t === 'assertion_reason'
                        ? 'A/R'
                        : t === 'match_following'
                          ? 'MATCH'
                          : t.toUpperCase()
                    }
                    selected={questionForm.questionType === t}
                    onPress={() => setQuestionForm((p) => ({ ...p, questionType: t }))}
                  />
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subject</Text>
              <View style={styles.segmentRow}>
                {EXAM_SUBJECTS.map((s) => (
                  <ChipToggle key={s.value} label={s.label} selected={questionForm.subject === s.value} onPress={() => setQuestionForm((p) => ({ ...p, subject: s.value }))} />
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Question Text</Text>
              <TextInput style={[styles.formInput, styles.textArea]} value={questionForm.questionText} onChangeText={(v) => setQuestionForm((p) => ({ ...p, questionText: v }))} multiline placeholder="Enter question text" />
            </View>
            <Pressable style={styles.filePickBtn} onPress={handleQuestionImageUpload} disabled={isUploadingQuestionImage}>
              {isUploadingQuestionImage ? <ActivityIndicator color="#2563eb" /> : (
                <>
                  <Ionicons name="image-outline" size={20} color="#2563eb" />
                  <Text style={styles.filePickText}>{questionForm.questionImage ? 'Image uploaded' : 'Upload question image (optional)'}</Text>
                </>
              )}
            </Pressable>
            {(questionForm.questionType === 'mcq' ||
              questionForm.questionType === 'multiple' ||
              questionForm.questionType === 'assertion_reason' ||
              questionForm.questionType === 'match_following') && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Options</Text>
                {questionForm.options.map((opt, idx) => (
                  <TextInput
                    key={idx}
                    style={[styles.formInput, { marginBottom: 8 }]}
                    value={opt}
                    onChangeText={(v) => {
                      const next = [...questionForm.options];
                      next[idx] = v;
                      setQuestionForm((p) => ({ ...p, options: next }));
                    }}
                    placeholder={`Option ${idx + 1}`}
                  />
                ))}
              </View>
            )}
            {(questionForm.questionType === 'mcq' ||
              questionForm.questionType === 'assertion_reason' ||
              questionForm.questionType === 'match_following') && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Correct Answer (option text)</Text>
                <TextInput style={styles.formInput} value={questionForm.correctAnswer} onChangeText={(v) => setQuestionForm((p) => ({ ...p, correctAnswer: v }))} placeholder="Exact option text" />
              </View>
            )}
            {questionForm.questionType === 'multiple' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Correct Answers (comma-separated option texts)</Text>
                <TextInput
                  style={styles.formInput}
                  value={questionForm.correctAnswers.join(', ')}
                  onChangeText={(v) => setQuestionForm((p) => ({ ...p, correctAnswers: v.split(',').map((x) => x.trim()) }))}
                  placeholder="Option A, Option C"
                />
              </View>
            )}
            {questionForm.questionType === 'integer' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Integer Answer</Text>
                <TextInput style={styles.formInput} keyboardType="numeric" value={questionForm.integerAnswer} onChangeText={(v) => setQuestionForm((p) => ({ ...p, integerAnswer: v }))} placeholder="e.g., 42" />
              </View>
            )}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Marks</Text>
                <TextInput style={styles.formInput} keyboardType="numeric" value={questionForm.marks} onChangeText={(v) => setQuestionForm((p) => ({ ...p, marks: v }))} />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Negative Marks</Text>
                <TextInput style={styles.formInput} keyboardType="numeric" value={questionForm.negativeMarks} onChangeText={(v) => setQuestionForm((p) => ({ ...p, negativeMarks: v }))} />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Explanation (optional)</Text>
              <TextInput style={[styles.formInput, styles.textArea]} value={questionForm.explanation} onChangeText={(v) => setQuestionForm((p) => ({ ...p, explanation: v }))} multiline />
            </View>
            <Pressable style={styles.submitButton} onPress={handleAddQuestion} disabled={isAddingQuestion}>
              {isAddingQuestion ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.submitButtonText}>
                  {editingQuestionId
                    ? 'Update Question'
                    : bulkMode === 'pdf' && pdfQuestionRows.length > 0
                      ? 'Upload Extracted Questions'
                      : 'Add Question'}
                </Text>
              )}
            </Pressable>
            {editingQuestionId ? (
              <Pressable style={styles.cancelEditButton} onPress={handleCancelEditQuestion}>
                <Text style={styles.cancelEditText}>Cancel edit</Text>
              </Pressable>
            ) : null}

            <View style={styles.divider} />
            <View style={styles.questionsHeader}>
              <Text style={styles.sectionTitle}>Existing Questions ({questions.length})</Text>
              {questions.length > 0 && (
                <Pressable onPress={handleDeleteAllQuestions}>
                  <Text style={styles.deleteAllText}>Delete All</Text>
                </Pressable>
              )}
            </View>
            {isLoadingQuestions ? (
              <ActivityIndicator color="#f97316" style={{ marginVertical: 16 }} />
            ) : questions.length === 0 ? (
              <Text style={styles.formHint}>No questions yet for this exam.</Text>
            ) : (
              questions.map((q, idx) => (
                <View
                  key={q._id || idx}
                  style={[
                    styles.questionItem,
                    editingQuestionId === String(q._id) ? styles.questionItemEditing : null,
                  ]}
                  onLayout={(e) => {
                    if (q?._id) {
                      questionOffsetsRef.current[String(q._id)] = e.nativeEvent.layout.y;
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questionIndex}>Q{idx + 1}</Text>
                    <Text style={styles.questionText} numberOfLines={3}>
                      {q.questionText || q.text || 'Image question'}
                    </Text>
                    <Text style={styles.questionMeta}>
                      {q.questionType || 'mcq'} · {q.subject || '—'} · {q.marks ?? 1} marks
                    </Text>
                  </View>
                  <View style={styles.questionActions}>
                    {q._id ? (
                      <Pressable
                        onPress={() => handleEditQuestion(q)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit question ${idx + 1}`}
                        style={styles.questionActionBtn}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={editingQuestionId === String(q._id) ? '#0284c7' : '#334155'}
                        />
                      </Pressable>
                    ) : null}
                    {q._id ? (
                      <Pressable
                        onPress={() => handleDeleteQuestion(q._id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete question ${idx + 1}`}
                        style={styles.questionActionBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#dc2626" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <OptionPicker
        visible={schoolPickerOpen}
        title="Filter by School"
        options={schoolFilterOptions}
        onSelect={setSelectedSchool}
        onClose={() => setSchoolPickerOpen(false)}
      />
      <OptionPicker
        visible={classPickerOpen}
        title="Filter by Class"
        options={classFilterOptions}
        onSelect={setSelectedClass}
        onClose={() => setClassPickerOpen(false)}
      />
      <OptionPicker
        visible={quickAddPickerOpen}
        title="Quick Add Questions"
        options={dedupedFilteredExams.map((e) => ({
          value: e._id,
          label: `${e.title}${Array.isArray(e.questions) && e.questions.length ? ` (${e.questions.length} Q)` : ''}`,
        }))}
        onSelect={(id) => {
          const exam = dedupedFilteredExams.find((e) => e._id === id);
          if (exam) openQuestionsModal(exam);
        }}
        onClose={() => setQuickAddPickerOpen(false)}
      />
      <OptionPicker
        visible={examTypePickerOpen}
        title="Exam Type"
        options={EXAM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        onSelect={(v) => setExamForm((p) => ({ ...p, examType: v as ExamFormState['examType'] }))}
        onClose={() => setExamTypePickerOpen(false)}
      />
      <OptionPicker
        visible={boardPickerOpen}
        title="Board"
        options={BOARDS.map((b) => ({ value: b.value, label: b.label }))}
        onSelect={(v) => setExamForm((p) => ({ ...p, board: v }))}
        onClose={() => setBoardPickerOpen(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  content: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: { padding: 20, paddingBottom: 12 },
  headerTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#6b7280' },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  headerActionsTablet: { marginTop: 0, flexShrink: 0, justifyContent: 'flex-end' },
  outlineButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  outlineButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineButtonTextGreen: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  addButton: { borderRadius: 8, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsRow: { marginBottom: 12 },
  statsContent: { paddingHorizontal: 20, gap: 8 },
  statsWrapTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statBadgeTablet: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statBadgeText: { color: '#0369a1', fontWeight: '600', fontSize: 12 },
  filtersCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  filtersCardTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  filterSelect: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  filterSelectInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterSelectTextWrap: { flex: 1, minWidth: 0 },
  filterSelectText: { fontSize: 14, color: '#111827' },
  countBadge: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 10, paddingVertical: 6 },
  countBadgeText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchInputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  searchInputContainerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, color: '#111827', paddingVertical: 12, paddingRight: 8 },
  clearButton: { padding: 4 },
  classSection: { paddingHorizontal: 20, marginBottom: 24 },
  classSectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8 },
  examCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  examCardTablet: {
    marginHorizontal: 0,
    marginBottom: 0,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  examCardTop: { marginBottom: 8 },
  examCardTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusActive: { backgroundColor: '#d1fae5' },
  statusInactive: { backgroundColor: '#f3f4f6' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  boardBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  boardBadgeText: { fontSize: 11, fontWeight: '700', color: '#c2410c' },
  examDescription: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  detailGrid: { gap: 6, marginBottom: 10 },
  detailGridTablet: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailRowTablet: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailLabel: { fontSize: 11, color: '#5B6779', fontWeight: '600' },
  detailText: { fontSize: 13, color: '#4b5563' },
  detailTextTablet: { fontSize: 12 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  subjectChip: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subjectChipText: { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },
  classChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  classChipText: { fontSize: 10, color: '#374151', fontWeight: '600' },
  qCountChip: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qCountChipText: { fontSize: 10, color: '#92400e', fontWeight: '700' },
  cardFooter: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  cardActionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardActionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardActionBtnTablet: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  cardActionBtnInnerTablet: {
    justifyContent: 'center',
  },
  cardActionText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  deleteActionBtn: { borderColor: '#fecaca' },
  deleteActionText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  errorText: { color: '#dc2626', paddingHorizontal: 20, marginBottom: 8, fontSize: 13 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#5B6779', marginTop: 16, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#5B6779', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  formModalWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  formModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  formModalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  formModalSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  formModalBody: { flex: 1 },
  formModalBodyContent: { padding: 20, paddingBottom: 32 },
  formModalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  formHint: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  formInput: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 12 },
  pickerField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipSelected: { backgroundColor: 'rgba(255,247,237,0.55)', borderColor: '#f97316' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextSelected: { color: '#c2410c' },
  checkboxListScroll: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    maxHeight: 200,
    marginTop: 8,
  },
  checkboxListContent: { padding: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkboxLabel: { fontSize: 14, color: '#111827', flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 4 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  selectedChipText: { fontSize: 12, color: '#0369a1', fontWeight: '600' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  submitButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center' },
  greenSubmit: { backgroundColor: '#16a34a' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  templateBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, marginBottom: 12 },
  templateTitle: { fontSize: 13, fontWeight: '600', color: '#1e3a8a' },
  templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  templateBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  filePickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 12, padding: 14, marginBottom: 8 },
  filePickText: { flex: 1, fontSize: 14, color: '#374151' },
  uploadResults: { padding: 12, borderRadius: 12, marginTop: 8 },
  uploadResultsOk: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  uploadResultsWarn: { backgroundColor: 'rgba(255,251,235,0.55)', borderWidth: 1, borderColor: '#fde68a' },
  uploadResultsTitle: { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  uploadErrorLine: { fontSize: 12, color: '#92400e' },
  bulkModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  bulkSection: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  switchLabel: { fontSize: 14, color: '#374151' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  pdfPreview: { marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  pdfPreviewTitle: { fontWeight: '700', marginBottom: 8 },
  pdfPreviewWarn: { color: '#92400e', fontSize: 12, marginBottom: 8 },
  pdfPreviewRow: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 8 },
  pdfPreviewQ: { fontSize: 13, color: '#111827' },
  pdfPreviewMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  questionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  deleteAllText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  questionItem: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', alignItems: 'center' },
  questionItemEditing: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingHorizontal: 8,
    borderBottomColor: '#bae6fd',
  },
  questionActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  questionActionBtn: { padding: 8 },
  cancelEditButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelEditText: { color: '#334155', fontWeight: '600', fontSize: 14 },
  questionIndex: { fontSize: 11, fontWeight: '700', color: '#5B6779' },
  questionText: { fontSize: 14, color: '#111827', marginTop: 2 },
  questionMeta: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemText: { fontSize: 16, color: '#111827' },
  pickerClose: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12 },
  pickerCloseText: { fontWeight: '600', color: '#374151' },
});
