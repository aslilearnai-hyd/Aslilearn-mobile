import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import { parseClassBoardLabel } from '../../../src/lib/board-label';
import {
  getCurriculumClassLabels,
  saveCurriculumClass,
} from '../../../src/lib/curriculum-classes-storage';
import {
  BOARD_CODE,
  CONTENT_TYPE_OPTIONS,
  CONTENT_TYPE_SECTIONS,
  INDIAN_STATE_OPTIONS,
  SYLLABUS_OPTIONS,
  type ContentFormState,
  type ContentItem,
  type ContentType,
  type SubjectItem,
  type SyllabusBoard,
  buildClassBoardOptions,
  buildSubjectsForClass,
  contentFormFromItem,
  contentIconName,
  contentMatchesClassBoard,
  emptyContentForm,
  filterContentForSubject,
  getVideoContentDisplayTitle,
  isCatalogSubjectId,
  isInferredSubjectId,
  isMongoObjectId,
  isValidContentSourceUrl,
  isValidGradeClassNumber,
  isVideoNumber,
  mapSubjectFromApi,
  normalizeClassNumber,
  normalizeContentRows,
  normalizeMediaUrl,
  normalizeServerContentFileUrl,
  resolveCatalogSubjectIdForSave,
  syllabusLabel,
  videoNumberOnly,
} from '../../../src/lib/subject-content-utils';
import {
  extractClassNumberFromSubjectName,
  extractPlainSubjectName,
} from '../../../src/lib/subject-names';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import { GlassPanel } from '../../../src/components/ui';

function OptionPicker({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[] | string[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const items = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {items.map((item) => (
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

export default function SubjectContentManagementView() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [manualClassLabels, setManualClassLabels] = useState<string[]>([]);
  const [selectedClassLabel, setSelectedClassLabel] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassNumber, setNewClassNumber] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSyllabus, setNewSubjectSyllabus] = useState<SyllabusBoard>('CBSE');
  const [newSubjectState, setNewSubjectState] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectSyllabus, setEditSubjectSyllabus] = useState<SyllabusBoard>('CBSE');
  const [editSubjectState, setEditSubjectState] = useState('');
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState<ContentFormState>(emptyContentForm());
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [picker, setPicker] = useState<
    | { kind: 'syllabus-add' }
    | { kind: 'syllabus-edit' }
    | { kind: 'state-add' }
    | { kind: 'state-edit' }
    | { kind: 'content-type' }
    | null
  >(null);

  const fetchSubjects = useCallback(async () => {
    setIsLoadingSubjects(true);
    try {
      setError('');
      const res = await api.get('/api/super-admin/subjects?includeInactive=true');
      const data = res?.data;
      const list = data?.success && Array.isArray(data.data) ? data.data : data?.data || data || [];
      setSubjects(Array.isArray(list) ? list.map(mapSubjectFromApi) : []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load subjects.');
    } finally {
      setIsLoadingSubjects(false);
    }
  }, []);

  const fetchContents = useCallback(async () => {
    setIsLoadingContents(true);
    try {
      setError('');
      let merged: ContentItem[] = [];
      try {
        const res = await api.get('/api/super-admin/content?includeInactive=true');
        const data = res?.data;
        if (data?.success && Array.isArray(data.data)) {
          merged = normalizeContentRows(data.data);
        }
      } catch {
        const boards = ['ASLI_EXCLUSIVE_SCHOOLS', 'CBSE', 'STATE'];
        const byId = new Map<string, ContentItem>();
        for (const board of boards) {
          try {
            const res = await api.get(`/api/super-admin/boards/${board}/content?includeInactive=true`);
            const data = res?.data;
            if (data?.success && Array.isArray(data.data)) {
              normalizeContentRows(data.data).forEach((row) => byId.set(String(row._id), row));
            }
          } catch {
            /* skip board */
          }
        }
        merged = Array.from(byId.values());
      }
      setContents(merged);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load content.');
    } finally {
      setIsLoadingContents(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    const labels = await getCurriculumClassLabels();
    setManualClassLabels(labels);
    await Promise.all([fetchSubjects(), fetchContents()]);
  }, [fetchSubjects, fetchContents]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const classOptions = useMemo(
    () => buildClassBoardOptions(subjects, contents),
    [subjects, contents]
  );

  const displayClassOptions = useMemo(() => {
    const merged = new Set([...classOptions, ...manualClassLabels]);
    return Array.from(merged).sort((a, b) => {
      const pa = parseClassBoardLabel(a);
      const pb = parseClassBoardLabel(b);
      const na = parseInt(pa.classNum, 10);
      const nb = parseInt(pb.classNum, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return a.localeCompare(b);
    });
  }, [classOptions, manualClassLabels]);

  useEffect(() => {
    if (!selectedClassLabel && displayClassOptions.length > 0) {
      setSelectedClassLabel(displayClassOptions[0]);
    }
  }, [displayClassOptions, selectedClassLabel]);

  const selectedClassParsed = useMemo(
    () => parseClassBoardLabel(selectedClassLabel || ''),
    [selectedClassLabel]
  );
  const selectedClassNumber = selectedClassParsed.classNum
    ? normalizeClassNumber(selectedClassParsed.classNum)
    : '';
  const selectedBoard = selectedClassParsed.board;

  const subjectsForClass = useMemo(
    () => buildSubjectsForClass(subjects, contents, selectedClassNumber, selectedBoard),
    [subjects, contents, selectedClassNumber, selectedBoard]
  );

  useEffect(() => {
    if (!selectedClassNumber) {
      setSelectedSubjectId(null);
      return;
    }
    if (subjectsForClass.length === 0) {
      setSelectedSubjectId(null);
      return;
    }
    const stillValid = subjectsForClass.some((s) => String(s._id) === String(selectedSubjectId));
    if (!stillValid) {
      const catalog =
        subjectsForClass.find((s) => isCatalogSubjectId(s._id, subjects)) ?? subjectsForClass[0];
      setSelectedSubjectId(catalog._id);
    }
  }, [selectedClassNumber, subjectsForClass, selectedSubjectId, subjects]);

  const filteredContents = useMemo(() => {
    if (!selectedSubjectId || !selectedClassNumber) return [];
    return filterContentForSubject(
      contents,
      subjects,
      selectedSubjectId,
      selectedClassNumber,
      subjectsForClass,
      selectedBoard
    );
  }, [contents, subjects, selectedSubjectId, selectedClassNumber, selectedBoard, subjectsForClass]);

  const contentSections = useMemo(() => {
    const known = new Set(CONTENT_TYPE_SECTIONS.flatMap((s) => s.types));
    const sections = CONTENT_TYPE_SECTIONS.map(({ title, types }) => ({
      title,
      items: filteredContents.filter((c) => types.includes(c.type)),
    }));
    const other = filteredContents.filter((c) => !known.has(c.type));
    if (other.length > 0) sections.push({ title: 'Other', items: other });
    return sections.filter((s) => s.items.length > 0);
  }, [filteredContents]);

  const contentCountForClass = useMemo(() => {
    if (!selectedClassNumber) return 0;
    return contents.filter((item) =>
      contentMatchesClassBoard(item, subjects, selectedClassNumber, selectedBoard)
    ).length;
  }, [contents, subjects, selectedClassNumber, selectedBoard]);

  const handleSaveClass = async () => {
    const num = newClassNumber.trim().replace(/^class\s*/i, '');
    if (!num || !/^\d{1,2}$/.test(num)) {
      Alert.alert('Enter a class number', 'Use a number like 6, 7, 10, or 12.');
      return;
    }
    const label = `Class ${num}`;
    const alreadyListed =
      classOptions.includes(label) || manualClassLabels.includes(label);
    if (!alreadyListed) {
      const saved = await saveCurriculumClass({
        classNumber: num,
        description: newClassDescription.trim(),
        label,
      });
      if (!saved) {
        Alert.alert('Class already exists', `${label} is already in the list.`);
        return;
      }
    }
    setManualClassLabels((prev) => (prev.includes(label) ? prev : [...prev, label]));
    setSelectedClassLabel(label);
    setSelectedSubjectId(null);
    setIsAddClassOpen(false);
    setNewClassNumber('');
    setNewClassDescription('');
    Alert.alert('Class added', `${label} selected. Use Add Subject to add subjects.`);
  };

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim() || !selectedClassNumber) {
      Alert.alert('Validation', 'Subject name is required.');
      return;
    }
    if (newSubjectSyllabus === 'STATE' && !newSubjectState.trim()) {
      Alert.alert('Validation', 'Select a state for State syllabus.');
      return;
    }
    setIsSavingSubject(true);
    try {
      const body: Record<string, string> = {
        name: `${newSubjectName.trim()}_${selectedClassNumber}`,
        board: newSubjectSyllabus,
        classNumber: selectedClassNumber,
      };
      if (newSubjectSyllabus === 'STATE') body.stateName = newSubjectState.trim();
      await api.post('/api/super-admin/subjects', body);
      setIsAddSubjectOpen(false);
      setNewSubjectName('');
      await fetchSubjects();
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || 'Failed to create subject.');
    } finally {
      setIsSavingSubject(false);
    }
  };

  const openEditSubject = (subject: SubjectItem) => {
    setEditingSubject(subject);
    setEditSubjectName(extractPlainSubjectName(subject.name));
    const b = (subject.board || BOARD_CODE).toUpperCase() as SyllabusBoard;
    setEditSubjectSyllabus(
      b === 'CBSE' || b === 'STATE' || b === 'ASLI_EXCLUSIVE_SCHOOLS' ? b : 'CBSE'
    );
    setEditSubjectState(subject.stateName?.trim() || '');
    setIsEditSubjectOpen(true);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editSubjectName.trim() || !selectedClassNumber) {
      Alert.alert('Validation', 'Subject name is required.');
      return;
    }
    if (editSubjectSyllabus === 'STATE' && !editSubjectState.trim()) {
      Alert.alert('Validation', 'Select a state for State syllabus.');
      return;
    }
    setIsSavingSubject(true);
    try {
      await api.put(`/api/super-admin/subjects/${editingSubject._id}`, {
        name: `${editSubjectName.trim()}_${selectedClassNumber}`,
        classNumber: selectedClassNumber,
        board: editSubjectSyllabus,
        ...(editSubjectSyllabus === 'STATE'
          ? { stateName: editSubjectState.trim() }
          : { stateName: '' }),
      });
      setIsEditSubjectOpen(false);
      setEditingSubject(null);
      await fetchSubjects();
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || 'Failed to update subject.');
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleDeleteSubject = (subjectId: string) => {
    Alert.alert('Delete subject', 'Remove this subject from the catalog?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/super-admin/subjects/${subjectId}`);
            if (selectedSubjectId === subjectId) setSelectedSubjectId(null);
            await fetchSubjects();
            await fetchContents();
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage || 'Delete failed.');
          }
        },
      },
    ]);
  };

  const openAddContent = () => {
    setEditingContentId(null);
    setContentForm(emptyContentForm());
    setIsContentModalOpen(true);
  };

  const openEditContent = (item: ContentItem) => {
    setEditingContentId(item._id);
    setContentForm(contentFormFromItem(item));
    setIsContentModalOpen(true);
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('contentType', contentForm.type);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'upload',
        type: asset.mimeType || 'application/octet-stream',
      } as any);
      const res = await api.post(
        `/api/super-admin/content/upload-file?contentType=${encodeURIComponent(contentForm.type)}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const data = res?.data;
      if (data?.success && data.fileUrl) {
        setContentForm((p) => ({
          ...p,
          fileUrl: normalizeServerContentFileUrl(data.fileUrl),
        }));
        Alert.alert('Uploaded', 'File uploaded. Save content to apply.');
      } else {
        Alert.alert('Upload failed', data?.message || 'Could not upload file.');
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err?.friendlyMessage || err?.message || 'Upload error.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedClassNumber || !selectedSubjectId) {
      Alert.alert('Validation', 'Select a class and subject first.');
      return;
    }
    if (!contentForm.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    const chapterNum = videoNumberOnly(contentForm.chapter);
    const moduleNum = videoNumberOnly(contentForm.module);
    if (contentForm.type === 'Video') {
      if ((contentForm.chapter && !isVideoNumber(chapterNum)) ||
          (contentForm.module && !isVideoNumber(moduleNum))) {
        Alert.alert('Validation', 'Chapter and module must be numbers only.');
        return;
      }
    }
    const fileUrlForSave = normalizeServerContentFileUrl(contentForm.fileUrl) || contentForm.fileUrl.trim();
    if (!isValidContentSourceUrl(fileUrlForSave, contentForm.type)) {
      Alert.alert(
        'Invalid source',
        contentForm.type === 'Video'
          ? 'Enter a valid video URL (https).'
          : contentForm.type === 'Audio'
            ? 'Upload a file or enter a valid audio URL.'
            : 'Upload a file first (/uploads/...).'
      );
      return;
    }
    if (isInferredSubjectId(selectedSubjectId)) {
      Alert.alert('Catalog subject required', 'Add a catalog subject first, then add content.');
      return;
    }
    const resolvedSubjectId =
      resolveCatalogSubjectIdForSave(
        selectedSubjectId,
        subjects,
        selectedClassNumber,
        subjectsForClass
      ) || (isMongoObjectId(selectedSubjectId) ? selectedSubjectId : null);
    if (!resolvedSubjectId) {
      Alert.alert('Subject required', 'Create this subject in the catalog first.');
      return;
    }
    const subj =
      subjects.find((s) => String(s._id) === String(resolvedSubjectId)) ??
      subjectsForClass.find((s) => String(s._id) === String(resolvedSubjectId));
    if (!subj) {
      Alert.alert('Error', 'Could not resolve subject.');
      return;
    }
    const subBoard = (subj.board || BOARD_CODE).toUpperCase() as SyllabusBoard;
    const normalizedSubBoard: SyllabusBoard =
      subBoard === 'CBSE' || subBoard === 'STATE' || subBoard === 'ASLI_EXCLUSIVE_SCHOOLS'
        ? subBoard
        : 'CBSE';
    if (normalizedSubBoard === 'STATE' && !(subj.stateName || '').trim()) {
      Alert.alert('Subject incomplete', 'Edit the subject and set a state first.');
      return;
    }

    setIsSavingContent(true);
    try {
      const body: Record<string, unknown> = {
        title: contentForm.title.trim(),
        description: contentForm.description.trim() || undefined,
        fileUrl: fileUrlForSave,
        classNumber: selectedClassNumber,
      };
      if (contentForm.thumbnailUrl.trim()) body.thumbnailUrl = contentForm.thumbnailUrl.trim();
      if (contentForm.date.trim()) body.date = contentForm.date.trim();
      if (contentForm.type === 'Video') {
        body.chapter = chapterNum || undefined;
        body.module = moduleNum || undefined;
      }
      if (contentForm.duration.trim()) {
        const d = parseInt(contentForm.duration, 10);
        if (!Number.isNaN(d)) body.duration = d;
      }
      if (!editingContentId) {
        body.type = contentForm.type;
        body.board = normalizedSubBoard;
        body.subject = resolvedSubjectId;
        body.stateName =
          normalizedSubBoard === 'STATE' ? String(subj.stateName || '').trim() : '';
        await api.post('/api/super-admin/content', body);
      } else {
        body.board = normalizedSubBoard;
        body.stateName =
          normalizedSubBoard === 'STATE' ? String(subj.stateName || '').trim() : '';
        await api.put(`/api/super-admin/content/${editingContentId}`, body);
      }
      setIsContentModalOpen(false);
      setEditingContentId(null);
      await fetchContents();
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || 'Failed to save content.');
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleDeleteContent = (contentId: string) => {
    Alert.alert('Delete content', 'Remove this content item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/super-admin/content/${contentId}`);
            await fetchContents();
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage || 'Delete failed.');
          }
        },
      },
    ]);
  };

  const previewContent = (item: ContentItem) => {
    const url = normalizeMediaUrl(item.fileUrl) || item.fileUrl;
    if (!url) {
      Alert.alert('Missing URL', 'No file URL for this item.');
      return;
    }
    openContentPreview(router, {
      _id: item._id,
      title: getVideoContentDisplayTitle(item),
      type: item.type,
      fileUrl: url,
      fileUrls: item.fileUrls,
      driveLink: url.includes('drive.google') ? url : undefined,
    });
  };

  const isUploadType = (type: ContentType) =>
    type !== 'Video';

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
        }
      >
        <Text style={styles.pageTitle}>Subject & Content Management</Text>
        <Text style={styles.pageSubtitle}>
          Manage subjects and learning content by class — same as web.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Classes */}
        <GlassPanel style={styles.panel} radius={14} tone="medium">
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Classes</Text>
            <Pressable style={styles.orangeBtn} onPress={() => setIsAddClassOpen(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.orangeBtnText}>Add Class</Text>
            </Pressable>
          </View>
          {displayClassOptions.length === 0 && !isLoadingSubjects ? (
            <Text style={styles.hint}>
              No classes yet. Tap Add Class, then Add Subject.
            </Text>
          ) : (
            displayClassOptions.map((label) => (
              <Pressable
                key={label}
                style={[styles.classRow, selectedClassLabel === label && styles.classRowActive]}
                onPress={() => {
                  setSelectedClassLabel(label);
                  setSelectedSubjectId(null);
                }}
              >
                <Text style={[styles.classText, selectedClassLabel === label && styles.classTextActive]}>
                  {label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#5B6779" />
              </Pressable>
            ))
          )}
        </GlassPanel>

        {/* Subjects */}
        <GlassPanel style={styles.panel} radius={14} tone="medium">
          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Subjects under Class</Text>
              <Text style={styles.hint}>
                {selectedClassLabel
                  ? `Showing subjects for ${selectedClassLabel}`
                  : 'Select a class'}
              </Text>
            </View>
            <Pressable
              style={[styles.orangeBtn, !selectedClassNumber && styles.btnDisabled]}
              onPress={() => {
                setNewSubjectName('');
                setNewSubjectSyllabus('CBSE');
                setNewSubjectState('');
                setIsAddSubjectOpen(true);
              }}
              disabled={!selectedClassNumber}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.orangeBtnText}>Add Subject</Text>
            </Pressable>
          </View>
          {isLoadingSubjects ? (
            <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 16 }} />
          ) : !selectedClassNumber ? (
            <Text style={styles.hint}>Select a class from the list above.</Text>
          ) : subjectsForClass.length === 0 ? (
            <View style={{ paddingVertical: 12 }}>
              <Text style={styles.hint}>No subjects for this class. Use Add Subject.</Text>
              {contentCountForClass > 0 ? (
                <Text style={styles.warnHint}>
                  {contentCountForClass} content item(s) exist but are not linked to a catalog subject.
                </Text>
              ) : null}
            </View>
          ) : (
            subjectsForClass.map((subj) => {
              const active = selectedSubjectId === subj._id;
              const canManage = !isInferredSubjectId(subj._id) && isMongoObjectId(subj._id);
              const inCatalog = isCatalogSubjectId(subj._id, subjects);
              return (
                <View key={subj._id} style={[styles.subjectRow, active && styles.subjectRowActive]}>
                  <Pressable style={styles.subjectMain} onPress={() => setSelectedSubjectId(subj._id)}>
                    <View style={styles.subjectIcon}>
                      <Ionicons name="book-outline" size={16} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectName}>{extractPlainSubjectName(subj.name)}</Text>
                      <View style={styles.badgeRow}>
                        {syllabusLabel(subj.board) ? (
                          <Text style={styles.badge}>{syllabusLabel(subj.board)}</Text>
                        ) : null}
                        {subj.board === 'STATE' && subj.stateName ? (
                          <Text style={styles.badgeMuted}>{subj.stateName}</Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                  {canManage ? (
                    <View style={styles.subjectActions}>
                      {inCatalog ? (
                        <Pressable
                          onPress={() => openEditSubject(subj)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${extractPlainSubjectName(subj.name)}`}
                        >
                          <Ionicons name="create-outline" size={18} color="#0284c7" />
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => handleDeleteSubject(subj._id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${extractPlainSubjectName(subj.name)}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </GlassPanel>

        {/* Content */}
        <GlassPanel style={styles.panel} radius={14} tone="medium">
          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Content under Subject</Text>
              <Text style={styles.hint}>
                {selectedSubjectId ? 'Linked content for selected subject' : 'Select a subject'}
              </Text>
            </View>
            <Pressable
              style={[styles.tealBtn, (!selectedClassNumber || !selectedSubjectId) && styles.btnDisabled]}
              onPress={openAddContent}
              disabled={!selectedClassNumber || !selectedSubjectId}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.orangeBtnText}>Add Content</Text>
            </Pressable>
          </View>
          {isLoadingContents ? (
            <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 16 }} />
          ) : !selectedSubjectId ? (
            <Text style={styles.hint}>Select a subject to view content.</Text>
          ) : filteredContents.length === 0 ? (
            <Text style={styles.hint}>No content yet. Use Add Content.</Text>
          ) : (
            contentSections.map((section) => (
              <View key={section.title} style={styles.contentSection}>
                <Text style={styles.sectionHeading}>{section.title}</Text>
                {section.items.map((content) => (
                  <GlassPanel key={content._id} style={styles.contentCard} radius={12} tone="medium">
                    <View style={styles.contentCardInner}>
                      <LinearGradient
                        colors={['#e0f2fe', '#ccfbf1']}
                        style={styles.contentThumb}
                      >
                        <Ionicons
                          name={contentIconName(content.type)}
                          size={32}
                          color="#0284c7"
                        />
                        {content.type === 'Video' && content.duration ? (
                          <Text style={styles.durationBadge}>{content.duration} mins</Text>
                        ) : null}
                      </LinearGradient>
                      <View style={styles.contentBody}>
                        <Text style={styles.contentTitle} numberOfLines={2}>
                          {getVideoContentDisplayTitle(content)}
                        </Text>
                        <View style={styles.badgeRow}>
                          {syllabusLabel(content.board) ? (
                            <Text style={styles.badge}>{syllabusLabel(content.board)}</Text>
                          ) : null}
                          {content.board === 'STATE' && content.stateName ? (
                            <Text style={styles.badgeMuted}>{content.stateName}</Text>
                          ) : null}
                        </View>
                        {content.date ? (
                          <Text style={styles.contentDate}>
                            {new Date(content.date).toLocaleDateString()}
                          </Text>
                        ) : null}
                        <View style={styles.contentActions}>
                          <Pressable style={styles.openBtn} onPress={() => previewContent(content)}>
                            <Ionicons name="eye-outline" size={14} color="#0284c7" />
                            <Text style={styles.openBtnText}>Preview</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => openEditContent(content)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${getVideoContentDisplayTitle(content)}`}
                          >
                            <Ionicons name="create-outline" size={18} color="#0284c7" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteContent(content._id)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${getVideoContentDisplayTitle(content)}`}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </GlassPanel>
                ))}
              </View>
            ))
          )}
        </GlassPanel>
      </ScrollView>

      {/* Add Class Modal */}
      <Modal visible={isAddClassOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Class</Text>
            <TextInput
              style={styles.input}
              placeholder="Class number (e.g. 10)"
              keyboardType="number-pad"
              value={newClassNumber}
              onChangeText={setNewClassNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={newClassDescription}
              onChangeText={setNewClassDescription}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setIsAddClassOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveClass}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Subject Modal */}
      <Modal visible={isAddSubjectOpen} animationType="slide">
        <View style={styles.formModal}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>Add Subject</Text>
            <Pressable
              onPress={() => setIsAddSubjectOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close add subject form"
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView style={styles.formScroll}>
            <TextInput
              style={styles.input}
              placeholder="Subject name (e.g. Chemistry)"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
            />
            <Pressable style={styles.pickerTrigger} onPress={() => setPicker({ kind: 'syllabus-add' })}>
              <Text>{SYLLABUS_OPTIONS.find((o) => o.value === newSubjectSyllabus)?.label || 'Syllabus'}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </Pressable>
            {newSubjectSyllabus === 'STATE' ? (
              <Pressable style={styles.pickerTrigger} onPress={() => setPicker({ kind: 'state-add' })}>
                <Text>{newSubjectState || 'Select state'}</Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </Pressable>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setIsAddSubjectOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, isSavingSubject && { opacity: 0.6 }]}
              onPress={handleSaveSubject}
              disabled={isSavingSubject}
            >
              <Text style={styles.saveBtnText}>{isSavingSubject ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Subject Modal */}
      <Modal visible={isEditSubjectOpen} animationType="slide">
        <View style={styles.formModal}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>Edit Subject</Text>
            <Pressable
              onPress={() => setIsEditSubjectOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close edit subject form"
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView style={styles.formScroll}>
            <TextInput style={styles.input} value={editSubjectName} onChangeText={setEditSubjectName} placeholder="Subject name" />
            <Pressable style={styles.pickerTrigger} onPress={() => setPicker({ kind: 'syllabus-edit' })}>
              <Text>{SYLLABUS_OPTIONS.find((o) => o.value === editSubjectSyllabus)?.label || 'Syllabus'}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </Pressable>
            {editSubjectSyllabus === 'STATE' ? (
              <Pressable style={styles.pickerTrigger} onPress={() => setPicker({ kind: 'state-edit' })}>
                <Text>{editSubjectState || 'Select state'}</Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </Pressable>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setIsEditSubjectOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, isSavingSubject && { opacity: 0.6 }]}
              onPress={handleUpdateSubject}
              disabled={isSavingSubject}
            >
              <Text style={styles.saveBtnText}>{isSavingSubject ? 'Updating…' : 'Update'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Content Modal */}
      <Modal visible={isContentModalOpen} animationType="slide">
        <View style={styles.formModal}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>{editingContentId ? 'Edit Content' : 'Add Content'}</Text>
            <Pressable
              onPress={() => setIsContentModalOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close content form"
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Title *"
              value={contentForm.title}
              onChangeText={(v) => setContentForm((p) => ({ ...p, title: v }))}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              value={contentForm.description}
              onChangeText={(v) => setContentForm((p) => ({ ...p, description: v }))}
            />
            {!editingContentId ? (
              <Pressable style={styles.pickerTrigger} onPress={() => setPicker({ kind: 'content-type' })}>
                <Text>Type: {contentForm.type}</Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </Pressable>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={contentForm.date}
              onChangeText={(v) => setContentForm((p) => ({ ...p, date: v }))}
            />
            {contentForm.type === 'Video' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Chapter (number)"
                  keyboardType="number-pad"
                  value={contentForm.chapter}
                  onChangeText={(v) => setContentForm((p) => ({ ...p, chapter: v }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Module (number)"
                  keyboardType="number-pad"
                  value={contentForm.module}
                  onChangeText={(v) => setContentForm((p) => ({ ...p, module: v }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Duration (minutes)"
                  keyboardType="number-pad"
                  value={contentForm.duration}
                  onChangeText={(v) => setContentForm((p) => ({ ...p, duration: v }))}
                />
              </>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder={contentForm.type === 'Video' ? 'Video URL (https) *' : 'File URL or upload below *'}
              value={contentForm.fileUrl}
              onChangeText={(v) => setContentForm((p) => ({ ...p, fileUrl: v }))}
              autoCapitalize="none"
            />
            {isUploadType(contentForm.type) ? (
              <Pressable
                style={[styles.uploadBtn, isUploadingFile && { opacity: 0.6 }]}
                onPress={handleUploadFile}
                disabled={isUploadingFile}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>
                  {isUploadingFile ? 'Uploading…' : 'Upload file'}
                </Text>
              </Pressable>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Topic (optional)"
              value={contentForm.topic}
              onChangeText={(v) => setContentForm((p) => ({ ...p, topic: v }))}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setIsContentModalOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, isSavingContent && { opacity: 0.6 }]}
              onPress={handleSaveContent}
              disabled={isSavingContent}
            >
              <Text style={styles.saveBtnText}>
                {isSavingContent ? 'Saving…' : editingContentId ? 'Update' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <OptionPicker
        visible={picker?.kind === 'syllabus-add'}
        title="Syllabus"
        options={[...SYLLABUS_OPTIONS]}
        onSelect={(v) => setNewSubjectSyllabus(v as SyllabusBoard)}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker?.kind === 'syllabus-edit'}
        title="Syllabus"
        options={[...SYLLABUS_OPTIONS]}
        onSelect={(v) => setEditSubjectSyllabus(v as SyllabusBoard)}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker?.kind === 'state-add'}
        title="State"
        options={INDIAN_STATE_OPTIONS}
        onSelect={setNewSubjectState}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker?.kind === 'state-edit'}
        title="State"
        options={INDIAN_STATE_OPTIONS}
        onSelect={setEditSubjectState}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker?.kind === 'content-type'}
        title="Content type"
        options={CONTENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
        onSelect={(v) => setContentForm((p) => ({ ...p, type: v as ContentType }))}
        onClose={() => setPicker(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  errorText: { color: '#dc2626', fontSize: 12, marginBottom: 8 },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  panelTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 2 },
  warnHint: { fontSize: 12, color: '#b45309', marginTop: 8 },
  orangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fb923c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2dd4bf',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orangeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  classRowActive: { borderColor: '#38bdf8', backgroundColor: '#f0f9ff' },
  classText: { fontWeight: '600', color: '#334155' },
  classTextActive: { color: '#0284c7' },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  subjectRowActive: { borderColor: '#38bdf8', backgroundColor: '#f0f9ff' },
  subjectMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  subjectActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
    color: '#0369a1',
    backgroundColor: '#f0f9ff',
  },
  badgeMuted: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  contentSection: { marginTop: 8 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
    marginBottom: 10,
  },
  contentCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  // Row layout governed the card's children, so it moves inside the panel.
  contentCardInner: {
    flexDirection: 'row',
  },
  contentThumb: {
    width: 88,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  contentBody: { flex: 1, padding: 10 },
  contentTitle: { fontWeight: '700', fontSize: 13, color: '#0f172a' },
  contentDate: { fontSize: 11, color: '#5B6779', marginTop: 4 },
  contentActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 'auto' },
  openBtnText: { color: '#0284c7', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  formModal: { flex: 1, backgroundColor: '#FFFFFF' },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  formScroll: { flex: 1, padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#334155' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f97316', alignItems: 'center' },
  saveBtnText: { fontWeight: '700', color: '#fff' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, padding: 16, maxHeight: '70%' },
  pickerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerItemText: { fontSize: 15, color: '#0f172a' },
  pickerClose: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10 },
  pickerCloseText: { fontWeight: '700', color: '#334155' },
});
