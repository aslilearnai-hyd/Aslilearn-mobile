import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import { useCurriculumCascade } from '../../../src/hooks/useCurriculumCascade';
import {
  AI_PDF_MAX_BYTES,
  AI_PDF_MAX_MB,
  AI_PDF_TOOL_OPTIONS,
  UPLOAD_STEP_MESSAGES,
  type GroupedClass,
  type GroupedSubject,
  type GroupedSubtopic,
  type GroupedTool,
  type GroupedTopic,
  type ListMeta,
  type PdfAnalysis,
  type PdfItem,
  type TokenUsageSnapshot,
  type TokenUsageSummary,
  type UploadStep,
  analyzeAiPdfFile,
  buildGroupedHierarchy,
  bulkDeleteAiPdfRecords,
  deleteAiPdfRecord,
  fetchAiPdfBoardOptions,
  fetchAiPdfRecord,
  fetchAllAiPdfRecords,
  formatTokenCount,
  getToolLabel,
  pdfGenerationBadge,
  pdfRecordPreviewLine,
  pdfRecordViewHint,
  toDisplayPlainText,
  uploadAiPdf,
} from '../../../src/lib/ai-pdf';
import {
  filterSubjectsForAiTool,
  isLanguageExcludedTool,
  isStoryLanguageTool,
  isStoryPassageLanguageSubject,
  LANGUAGE_EXCLUDED_TOOL_ERROR,
} from '../../../src/lib/student-ai-tools';
import { extractMcqQuestionsFromRecord, isMcqTool } from '../../../src/lib/mcq-record-utils';
import { GlassPanel } from '../../../src/components/ui';
import AiToolRecordPreview from '../../../src/components/ai-tools/AiToolRecordPreview';

type PickerFile = { uri: string; name: string; mimeType?: string | null; size?: number | null };

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

function RecordCard({
  record,
  index,
  deletingId,
  onView,
  onDelete,
}: {
  record: PdfItem;
  index: number;
  deletingId: string | null;
  onView: (record: PdfItem) => void;
  onDelete: (record: PdfItem) => void;
}) {
  return (
    <GlassPanel style={styles.recordCard} radius={12} tone="strong">
      <View style={styles.recordTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.recordBadges}>
            <View style={styles.genBadge}>
              <Text style={styles.genBadgeText}>{pdfGenerationBadge(record, index)}</Text>
            </View>
            {record.pdfCode ? <Text style={styles.pdfCode}>{record.pdfCode}</Text> : null}
          </View>
          <Text style={styles.recordDate}>{new Date(record.uploadDate).toLocaleString()}</Text>
          <Text style={styles.recordTitle} numberOfLines={2}>
            {pdfRecordPreviewLine(record)}
          </Text>
        </View>
        <View style={styles.approvalBadge}>
          <Text style={styles.approvalText}>{record.approvalStatus || 'pending'}</Text>
        </View>
      </View>
      <Text style={styles.recordHint}>{pdfRecordViewHint(record)}</Text>
      <View style={styles.recordActions}>
        <Pressable style={styles.viewBtn} onPress={() => onView(record)}>
          <Ionicons name="eye-outline" size={14} color="#fff" />
          <Text style={styles.viewBtnText}>View</Text>
        </Pressable>
        <Pressable
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${pdfRecordPreviewLine(record)}`}
          onPress={() => onDelete(record)}
          disabled={deletingId === record._id}
        >
          <Ionicons name="trash-outline" size={14} color="#b91c1c" />
        </Pressable>
      </View>
    </GlassPanel>
  );
}

function SubtopicSection({
  node,
  subtopicKey,
  deletingSubtopicKey,
  deletingId,
  onDeleteAll,
  onView,
  onDelete,
}: {
  node: GroupedSubtopic;
  subtopicKey: string;
  deletingSubtopicKey: string | null;
  deletingId: string | null;
  onDeleteAll: (records: PdfItem[], label: string, key: string) => void;
  onView: (record: PdfItem) => void;
  onDelete: (record: PdfItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>Subtopic</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle} numberOfLines={2}>
            {node.subtopic}
          </Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{node.records.length}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.records.length > 0 ? (
            <Pressable
              style={styles.deleteAllBtn}
              disabled={deletingSubtopicKey === subtopicKey || !!deletingId}
              onPress={() => onDeleteAll(node.records, node.subtopic, subtopicKey)}
            >
              <Ionicons name="trash-outline" size={14} color="#b91c1c" />
              <Text style={styles.deleteAllText}>
                {deletingSubtopicKey === subtopicKey ? 'Deleting…' : `Delete all (${node.records.length})`}
              </Text>
            </Pressable>
          ) : null}
          {node.records.map((record, idx) => (
            <RecordCard
              key={record._id}
              record={record}
              index={idx}
              deletingId={deletingId}
              onView={onView}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function TopicSection({
  node,
  tool,
  classLabel,
  board,
  subject,
  deletingSubtopicKey,
  deletingId,
  onDeleteAll,
  onView,
  onDelete,
}: {
  node: GroupedTopic;
  tool: string;
  classLabel: string;
  board: string;
  subject: string;
  deletingSubtopicKey: string | null;
  deletingId: string | null;
  onDeleteAll: (records: PdfItem[], label: string, key: string) => void;
  onView: (record: PdfItem) => void;
  onDelete: (record: PdfItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>Topic</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>{node.topic}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.subtopics.map((st) => (
            <SubtopicSection
              key={st.subtopic}
              node={st}
              subtopicKey={`subtopic:${tool}:${classLabel}:${board}:${subject}:${node.topic}:${st.subtopic}`}
              deletingSubtopicKey={deletingSubtopicKey}
              deletingId={deletingId}
              onDeleteAll={onDeleteAll}
              onView={onView}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function SubjectSection({
  node,
  tool,
  classLabel,
  board,
  deletingSubtopicKey,
  deletingId,
  onDeleteAll,
  onView,
  onDelete,
}: {
  node: GroupedSubject;
  tool: string;
  classLabel: string;
  board: string;
  deletingSubtopicKey: string | null;
  deletingId: string | null;
  onDeleteAll: (records: PdfItem[], label: string, key: string) => void;
  onView: (record: PdfItem) => void;
  onDelete: (record: PdfItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>Subject</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>{node.subject}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.topics.map((t) => (
            <TopicSection
              key={t.topic}
              node={t}
              tool={tool}
              classLabel={classLabel}
              board={board}
              subject={node.subject}
              deletingSubtopicKey={deletingSubtopicKey}
              deletingId={deletingId}
              onDeleteAll={onDeleteAll}
              onView={onView}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function ClassSection({
  node,
  tool,
  deletingSubtopicKey,
  deletingId,
  onDeleteAll,
  onView,
  onDelete,
}: {
  node: GroupedClass;
  tool: string;
  deletingSubtopicKey: string | null;
  deletingId: string | null;
  onDeleteAll: (records: PdfItem[], label: string, key: string) => void;
  onView: (record: PdfItem) => void;
  onDelete: (record: PdfItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>Class</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>{node.classLabel}</Text>
        </View>
        <View style={styles.boardChip}>
          <Text style={styles.boardChipText}>{node.board || '-'}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.subjects.map((s) => (
            <SubjectSection
              key={s.subject}
              node={s}
              tool={tool}
              classLabel={node.classLabel}
              board={node.board}
              deletingSubtopicKey={deletingSubtopicKey}
              deletingId={deletingId}
              onDeleteAll={onDeleteAll}
              onView={onView}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function ToolSection({
  node,
  deletingSubtopicKey,
  deletingId,
  onDeleteAll,
  onView,
  onDelete,
}: {
  node: GroupedTool;
  deletingSubtopicKey: string | null;
  deletingId: string | null;
  onDeleteAll: (records: PdfItem[], label: string, key: string) => void;
  onView: (record: PdfItem) => void;
  onDelete: (record: PdfItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.toolCard}>
      <Pressable style={styles.toolTrigger} onPress={() => setOpen((v) => !v)}>
        <Ionicons name="construct-outline" size={18} color="#ea580c" />
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>{node.tool}</Text>
          <Text style={styles.toolCount}>
            {node.recordCount} generation{node.recordCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </Pressable>
      {open ? (
        <View style={styles.toolBody}>
          {node.classes.map((c) => (
            <ClassSection
              key={`${node.tool}:${c.classLabel}:${c.board}`}
              node={c}
              tool={node.tool}
              deletingSubtopicKey={deletingSubtopicKey}
              deletingId={deletingId}
              onDeleteAll={onDeleteAll}
              onView={onView}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AiPdfView() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listLoadError, setListLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [overallTokenSummary, setOverallTokenSummary] = useState<TokenUsageSummary | null>(null);

  const [board, setBoard] = useState('CBSE');
  const [recordsBoardFilter, setRecordsBoardFilter] = useState('__all__');
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [classLabel, setClassLabel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [toolType, setToolType] = useState('');

  const [pdfFile, setPdfFile] = useState<PickerFile | null>(null);
  const [pdfAnalysis, setPdfAnalysis] = useState<PdfAnalysis | null>(null);
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [uploadError, setUploadError] = useState('');
  const [lastUploadResult, setLastUploadResult] = useState<{ totalSaved: number } | null>(null);
  const [lastTokenUsage, setLastTokenUsage] = useState<TokenUsageSnapshot | null>(null);

  const [activeRecord, setActiveRecord] = useState<PdfItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSubtopicKey, setDeletingSubtopicKey] = useState<string | null>(null);

  const [boardPickerOpen, setBoardPickerOpen] = useState(false);
  const [recordsBoardPickerOpen, setRecordsBoardPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [subTopicPickerOpen, setSubTopicPickerOpen] = useState(false);
  const [toolPickerOpen, setToolPickerOpen] = useState(false);

  const {
    classOptions,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  } = useCurriculumCascade(classLabel || undefined, subject || undefined, topic || undefined, board || undefined);

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(toolType, subjects),
    [toolType, subjects],
  );

  const groupedHierarchy = useMemo(() => buildGroupedHierarchy(items), [items]);
  const visibleCount = useMemo(
    () => groupedHierarchy.reduce((sum, t) => sum + t.recordCount, 0),
    [groupedHierarchy],
  );

  useEffect(() => {
    fetchAiPdfBoardOptions().then(setBoardOptions);
  }, []);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setListLoadError(null);
    try {
      const result = await fetchAllAiPdfRecords(recordsBoardFilter);
      setItems(result.items);
      setListMeta(result.listMeta);
      setOverallTokenSummary(result.tokenUsageSummary);
    } catch (err: any) {
      setItems([]);
      setListLoadError(err?.friendlyMessage || err?.message || 'Could not load PDF list');
    } finally {
      setIsLoading(false);
    }
  }, [recordsBoardFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!isStoryLanguageTool(toolType)) return;
    if (!subject || isStoryPassageLanguageSubject(subject)) return;
    setSubject('');
    setTopic('');
    setSubTopic('');
  }, [toolType, subject]);

  useEffect(() => {
    if (!isLanguageExcludedTool(toolType)) return;
    if (!subject || !isStoryPassageLanguageSubject(subject)) return;
    setSubject('');
    setTopic('');
    setSubTopic('');
  }, [toolType, subject]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchList();
    setRefreshing(false);
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: 'application/pdf',
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const size = asset.size ?? null;
    if (size != null && size > AI_PDF_MAX_BYTES) {
      Alert.alert('File too large', `Maximum size is ${AI_PDF_MAX_MB} MB.`);
      return;
    }
    const file: PickerFile = {
      uri: asset.uri,
      name: asset.name || 'document.pdf',
      mimeType: asset.mimeType,
      size,
    };
    setPdfFile(file);
    setUploadError('');
    setPdfAnalysis(null);
    setAnalyzingPdf(true);
    try {
      const analysis = await analyzeAiPdfFile(file);
      setPdfAnalysis(analysis);
    } catch (err: any) {
      Alert.alert('Analysis skipped', err?.friendlyMessage || err?.message || 'PDF analysis failed');
    } finally {
      setAnalyzingPdf(false);
    }
  };

  const handleUpload = async () => {
    if (!pdfFile || !board || !subject || !classLabel || !topic || !toolType) {
      const msg = 'Choose a PDF file, board, class, subject, topic, and tool.';
      setUploadError(msg);
      Alert.alert('Missing fields', msg);
      return;
    }
    if (isStoryLanguageTool(toolType) && !isStoryPassageLanguageSubject(subject)) {
      const msg = 'Story & Passage Creator works only with English, Hindi, or Telugu subjects.';
      setUploadError(msg);
      Alert.alert('English, Hindi, or Telugu only', msg);
      return;
    }
    if (isLanguageExcludedTool(toolType) && isStoryPassageLanguageSubject(subject)) {
      setUploadError(LANGUAGE_EXCLUDED_TOOL_ERROR);
      Alert.alert('Language subjects not supported', LANGUAGE_EXCLUDED_TOOL_ERROR);
      return;
    }
    if ((pdfFile.size ?? 0) > AI_PDF_MAX_BYTES) {
      const msg = `PDF is larger than ${AI_PDF_MAX_MB} MB.`;
      setUploadError(msg);
      Alert.alert('File too large', msg);
      return;
    }
    setIsUploading(true);
    setUploadStep('uploading');
    setUploadError('');
    setLastUploadResult(null);
    setLastTokenUsage(null);
    try {
      setUploadStep('indexing');
      setUploadStep('generating');
      setUploadStep('validating');
      const json = await uploadAiPdf({
        file: pdfFile,
        board,
        subject,
        subjectLabel: subject,
        classLabel,
        topic,
        subTopic,
        toolType,
      });
      setUploadStep('saving');
      const totalSaved = Number(json.data?.totalSaved || 1);
      setUploadStep('done');
      setLastUploadResult({ totalSaved });
      setLastTokenUsage(json.data?.tokenUsage?.totals ? json.data.tokenUsage : null);
      setPdfFile(null);
      setPdfAnalysis(null);
      Alert.alert(
        'PDF processed',
        `${totalSaved} record${totalSaved !== 1 ? 's' : ''} saved successfully.`,
      );
      await fetchList();
    } catch (err: any) {
      setUploadStep('error');
      const message = err?.friendlyMessage || err?.message || 'Generate failed';
      setUploadError(message);
      Alert.alert('Generate failed', message);
    } finally {
      setIsUploading(false);
    }
  };

  const openView = async (record: PdfItem) => {
    setActiveRecord(record);
    setViewLoading(true);
    try {
      const detail = await fetchAiPdfRecord(record._id, record.recordKind);
      setActiveRecord(detail);
      setItems((prev) => prev.map((row) => (row._id === record._id ? { ...row, ...detail } : row)));
    } catch (err: any) {
      setActiveRecord(null);
      Alert.alert('Load failed', err?.friendlyMessage || err?.message || 'Could not load record');
    } finally {
      setViewLoading(false);
    }
  };

  const deleteRecord = (record: PdfItem) => {
    Alert.alert('Delete record', 'Delete this record permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(record._id);
          try {
            await deleteAiPdfRecord(record._id, record.recordKind);
            setItems((prev) => prev.filter((r) => r._id !== record._id));
            if (activeRecord?._id === record._id) setActiveRecord(null);
          } catch (err: any) {
            Alert.alert('Delete failed', err?.friendlyMessage || err?.message || 'Could not delete');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const deleteAllSubtopic = (records: PdfItem[], label: string, key: string) => {
    const ids = records.map((r) => r._id).filter(Boolean);
    if (ids.length === 0) return;
    Alert.alert(
      'Delete all',
      `Delete all ${ids.length} record${ids.length !== 1 ? 's' : ''} in subtopic “${label}”?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingSubtopicKey(key);
            try {
              const json = await bulkDeleteAiPdfRecords(ids);
              const deletedIds = new Set(ids);
              setItems((prev) => prev.filter((r) => !deletedIds.has(r._id)));
              if (activeRecord && deletedIds.has(activeRecord._id)) setActiveRecord(null);
              Alert.alert('Deleted', `Removed ${Number(json.deletedCount ?? ids.length)} record(s).`);
            } catch (err: any) {
              Alert.alert('Delete failed', err?.friendlyMessage || err?.message || 'Could not delete');
            } finally {
              setDeletingSubtopicKey(null);
            }
          },
        },
      ],
    );
  };

  const viewMcqQs = activeRecord
    ? extractMcqQuestionsFromRecord({
        toolName: String(activeRecord.toolType || ''),
        generatedContent: String(activeRecord.generatedContent || ''),
        metadata: activeRecord.metadata,
      })
    : [];

  const recordsBoardOptions = [
    { value: '__all__', label: 'All boards' },
    ...boardOptions.map((b) => ({ value: b, label: b })),
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      <GlassPanel style={styles.section} radius={14} tone="strong">
        <Text style={styles.sectionTitle}>AI PDF</Text>

        <Text style={styles.fieldLabel}>Upload PDF file *</Text>
        <Pressable style={styles.fileBtn} onPress={pickPdf} disabled={isUploading}>
          <Ionicons name="document-outline" size={20} color="#2563eb" />
          <View style={styles.fileBtnTextWrap}>
            <Text style={styles.fileBtnText}>{pdfFile ? pdfFile.name : 'Choose PDF file'}</Text>
          </View>
        </Pressable>
        {pdfFile ? (
          <Text style={styles.fileHint}>
            Selected: {pdfFile.name}
            {pdfFile.size != null ? ` (${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB · max ${AI_PDF_MAX_MB} MB)` : ''}
          </Text>
        ) : (
          <Text style={styles.fileHint}>
            Choose PDF (max {AI_PDF_MAX_MB} MB), fill class → subject → topic → tool, then Generate.
          </Text>
        )}
        {analyzingPdf ? <Text style={styles.analysisLoading}>Analyzing PDF content (no LLM)…</Text> : null}
        {pdfAnalysis && !analyzingPdf ? (
          <View style={styles.analysisBox}>
            <Text style={styles.analysisLine}>
              Detected family: {pdfAnalysis.contentFamily} ({pdfAnalysis.confidence}% confidence)
              {pdfAnalysis.questionCount > 0 ? ` · ${pdfAnalysis.questionCount} questions` : ''}
            </Text>
            <Text style={styles.analysisLine}>
              Extraction: {pdfAnalysis.extractionOk ? 'content found (zero-LLM path)' : 'may need AI fallback'}
              {pdfAnalysis.useGemini ? ' · low confidence' : ' · no Gemini needed'}
            </Text>
            {pdfAnalysis.suggestedToolSlug && pdfAnalysis.suggestedToolSlug !== toolType ? (
              <Pressable onPress={() => setToolType(pdfAnalysis.suggestedToolSlug)}>
                <Text style={styles.suggestLink}>
                  Use suggested: {pdfAnalysis.suggestedToolLabel || getToolLabel(pdfAnalysis.suggestedToolSlug)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Board *</Text>
        <Pressable style={styles.selectField} onPress={() => setBoardPickerOpen(true)}>
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>{board || 'Select board'}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Class *</Text>
        <Pressable
          style={[styles.selectField, (!board || loadingClasses) && styles.selectDisabled]}
          onPress={() => board && !loadingClasses && setClassPickerOpen(true)}
        >
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {!board ? 'Select board first' : loadingClasses ? 'Loading classes…' : classLabel || 'Select class'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Subject *</Text>
        <Pressable
          style={[styles.selectField, (!classLabel || loadingSubjects) && styles.selectDisabled]}
          onPress={() => classLabel && !loadingSubjects && setSubjectPickerOpen(true)}
        >
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {!classLabel ? 'Select class first' : loadingSubjects ? 'Loading subjects…' : subject || 'Select subject'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Topic *</Text>
        <Pressable
          style={[styles.selectField, (!subject || loadingTopics) && styles.selectDisabled]}
          onPress={() => subject && !loadingTopics && setTopicPickerOpen(true)}
        >
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {!subject ? 'Select class & subject first' : loadingTopics ? 'Loading topics…' : topic || 'Select topic'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Sub Topic</Text>
        <Pressable
          style={[styles.selectField, (!topic || loadingSubtopics) && styles.selectDisabled]}
          onPress={() => topic && !loadingSubtopics && setSubTopicPickerOpen(true)}
        >
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {!topic ? 'Select topic first' : loadingSubtopics ? 'Loading sub topics…' : subTopic || 'Select sub topic'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Tool *</Text>
        <Pressable style={styles.selectField} onPress={() => setToolPickerOpen(true)}>
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>{toolType ? getToolLabel(toolType) : 'Select tool'}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>
        {isStoryLanguageTool(toolType) ? (
          <Text style={styles.infoBanner}>English, Hindi, and Telugu subjects only for Story & Passage Creator.</Text>
        ) : null}
        {isLanguageExcludedTool(toolType) ? (
          <Text style={[styles.infoBanner, styles.infoBannerWarning]}>
            Not available for English, Hindi, or Telugu subjects.
          </Text>
        ) : null}

        <Pressable
          style={[styles.generateBtn, isUploading && styles.generateBtnDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>Generate</Text>
          )}
        </Pressable>

        {uploadStep !== 'idle' && uploadStep !== 'done' && uploadStep !== 'error' ? (
          <View style={styles.stepBox}>
            <ActivityIndicator color="#2563eb" size="small" />
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepText}>{UPLOAD_STEP_MESSAGES[uploadStep]}</Text>
            </View>
          </View>
        ) : null}

        {uploadStep === 'done' && lastUploadResult ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              {lastUploadResult.totalSaved} record{lastUploadResult.totalSaved !== 1 ? 's' : ''} saved successfully
            </Text>
            {lastTokenUsage?.totals ? (
              <Text style={styles.successSub}>
                Tokens: {formatTokenCount(lastTokenUsage.totals.totalTokens)} total (
                {formatTokenCount(lastTokenUsage.totals.promptTokens)} in /{' '}
                {formatTokenCount(lastTokenUsage.totals.completionTokens)} out, {lastTokenUsage.totals.callCount} LLM
                calls)
              </Text>
            ) : null}
          </View>
        ) : null}

        {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}
      </GlassPanel>

      <GlassPanel style={styles.section} radius={14} tone="medium">
        <Text style={styles.sectionTitle}>Saved PDF records</Text>
        <Text style={styles.recordsHint}>
          Showing:{' '}
          <Text style={styles.recordsHintBold}>
            {recordsBoardFilter === '__all__' ? 'All boards' : recordsBoardFilter}
          </Text>
          {!isLoading && visibleCount > 0 ? (
            <Text>
              {' '}
              · {visibleCount} record{visibleCount !== 1 ? 's' : ''} in {groupedHierarchy.length} tool
              {groupedHierarchy.length !== 1 ? 's' : ''}
              {listMeta ? ` (${Number(listMeta.legacyRecordCount || 0)} legacy` : ''}
              {listMeta && Number(listMeta.newGenerationCount || 0) > 0
                ? ` · ${Number(listMeta.newGenerationCount)} new)`
                : listMeta
                  ? ')'
                  : ''}
            </Text>
          ) : null}
        </Text>
        {overallTokenSummary && overallTokenSummary.generationCount > 0 ? (
          <Text style={styles.tokenSummary}>
            Overall token usage: {formatTokenCount(overallTokenSummary.totalTokens)} tokens across{' '}
            {overallTokenSummary.generationCount} generation
            {overallTokenSummary.generationCount !== 1 ? 's' : ''}
          </Text>
        ) : null}

        <Text style={styles.fieldLabel}>Filter by board</Text>
        <Pressable style={styles.selectField} onPress={() => setRecordsBoardPickerOpen(true)}>
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {recordsBoardFilter === '__all__' ? 'All boards' : recordsBoardFilter}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.loadingText}>Loading hierarchy…</Text>
          </View>
        ) : listLoadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{listLoadError}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchList}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : groupedHierarchy.length === 0 ? (
          <Text style={styles.emptyText}>
            No saved AI content records
            {recordsBoardFilter !== '__all__' ? ` for board “${recordsBoardFilter}”.` : ' yet.'}
          </Text>
        ) : (
          groupedHierarchy.map((toolNode) => (
            <ToolSection
              key={toolNode.tool}
              node={toolNode}
              deletingSubtopicKey={deletingSubtopicKey}
              deletingId={deletingId}
              onDeleteAll={deleteAllSubtopic}
              onView={openView}
              onDelete={deleteRecord}
            />
          ))
        )}
      </GlassPanel>

      <Modal visible={!!activeRecord} animationType="slide" onRequestClose={() => setActiveRecord(null)}>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fullModalTitle}>
                {activeRecord ? pdfRecordPreviewLine(activeRecord) : 'Generation content'}
              </Text>
              {activeRecord ? (
                <Text style={styles.fullModalSub}>
                  {getToolLabel(activeRecord.toolType)}
                  {activeRecord.topic ? ` · ${activeRecord.topic}` : ''}
                  {activeRecord.subTopic ? ` · ${activeRecord.subTopic}` : ''}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close record view"
              onPress={() => setActiveRecord(null)}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>
          <ScrollView style={styles.fullModalBody}>
            {viewLoading ? (
              <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />
            ) : viewMcqQs.length > 0 && isMcqTool(activeRecord?.toolType) ? (
              viewMcqQs.map((q, idx) => (
                <View key={`mcq-${idx}`} style={styles.mcqBox}>
                  <Text style={styles.mcqQ}>
                    Q{idx + 1}. {q.question}
                  </Text>
                  {q.options.map((opt, j) => (
                    <Text key={j} style={styles.mcqOpt}>
                      ○ {opt}
                    </Text>
                  ))}
                  {q.answer ? <Text style={styles.mcqAnswer}>Answer: {q.answer}</Text> : null}
                </View>
              ))
            ) : (
              <AiToolRecordPreview
                toolType={String(activeRecord?.toolType || activeRecord?.toolName || '')}
                content={String(activeRecord?.generatedContent || '')}
                metadata={activeRecord?.metadata as Record<string, unknown> | undefined}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <OptionPicker
        visible={boardPickerOpen}
        title="Select board"
        options={boardOptions.map((b) => ({ value: b, label: b }))}
        onSelect={(v) => {
          setBoard(v);
          setClassLabel('');
          setSubject('');
          setTopic('');
          setSubTopic('');
        }}
        onClose={() => setBoardPickerOpen(false)}
      />
      <OptionPicker
        visible={recordsBoardPickerOpen}
        title="Filter by board"
        options={recordsBoardOptions}
        onSelect={setRecordsBoardFilter}
        onClose={() => setRecordsBoardPickerOpen(false)}
      />
      <OptionPicker
        visible={classPickerOpen}
        title="Select class"
        options={classOptions.map((c) => ({ value: c, label: c }))}
        onSelect={(v) => {
          setClassLabel(v);
          setSubject('');
          setTopic('');
          setSubTopic('');
        }}
        onClose={() => setClassPickerOpen(false)}
      />
      <OptionPicker
        visible={subjectPickerOpen}
        title="Select subject"
        options={subjectsForTool.map((s) => ({ value: s, label: s }))}
        onSelect={(v) => {
          setSubject(v);
          setTopic('');
          setSubTopic('');
        }}
        onClose={() => setSubjectPickerOpen(false)}
      />
      <OptionPicker
        visible={topicPickerOpen}
        title="Select topic"
        options={topics.map((t) => ({ value: t, label: t }))}
        onSelect={(v) => {
          setTopic(v);
          setSubTopic('');
        }}
        onClose={() => setTopicPickerOpen(false)}
      />
      <OptionPicker
        visible={subTopicPickerOpen}
        title="Select sub topic"
        options={subtopics.map((st) => ({ value: st, label: st }))}
        onSelect={setSubTopic}
        onClose={() => setSubTopicPickerOpen(false)}
      />
      <OptionPicker
        visible={toolPickerOpen}
        title="Select tool"
        options={AI_PDF_TOOL_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
        onSelect={setToolType}
        onClose={() => setToolPickerOpen(false)}
      />

      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  section: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 6 },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#eff6ff',
  },
  fileBtnTextWrap: { flex: 1, minWidth: 0 },
  fileBtnText: { fontSize: 14, color: '#1d4ed8', fontWeight: '600' },
  fileHint: { fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 18 },
  analysisLoading: { fontSize: 12, color: '#1d4ed8', marginTop: 8 },
  analysisBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  analysisLine: { fontSize: 12, color: '#334155', lineHeight: 18 },
  suggestLink: { fontSize: 12, color: '#1d4ed8', textDecorationLine: 'underline', marginTop: 4 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  selectDisabled: { opacity: 0.55 },
  selectTextWrap: { flex: 1, minWidth: 0 },
  selectText: { fontSize: 14, color: '#0f172a', paddingRight: 8 },
  infoBanner: {
    marginTop: 8,
    fontSize: 12,
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 10,
  },
  infoBannerWarning: {
    color: '#92400e',
    backgroundColor: 'rgba(255,251,235,0.55)',
    borderColor: '#fcd34d',
  },
  generateBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
  },
  stepTextWrap: { flex: 1, minWidth: 0 },
  stepText: { fontSize: 13, color: '#1d4ed8' },
  successBox: {
    marginTop: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  successText: { fontSize: 13, color: '#047857', fontWeight: '600' },
  successSub: { fontSize: 12, color: '#065f46', marginTop: 4 },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
  },
  recordsHint: { fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  recordsHintBold: { fontWeight: '600', color: '#334155' },
  tokenSummary: { fontSize: 12, color: '#475569', marginBottom: 8 },
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 13, color: '#64748b' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
  },
  errorBoxText: { color: '#991b1b', fontSize: 13 },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  emptyText: { fontSize: 13, color: '#64748b', paddingVertical: 16 },
  toolCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  toolTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  toolTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  toolCount: { fontSize: 12, color: '#64748b', marginTop: 2 },
  toolBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 10, backgroundColor: '#f8fafc' },
  nestedBlock: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  nestedTrigger: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  nestedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B6779',
    textTransform: 'uppercase',
  },
  nestedTitleWrap: { flex: 1, minWidth: 0 },
  nestedTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  boardChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  boardChipText: { fontSize: 10, color: '#475569' },
  countPill: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  nestedBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 8 },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
  },
  deleteAllText: { fontSize: 12, fontWeight: '600', color: '#b91c1c' },
  recordCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recordTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  recordBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  genBadge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  genBadgeText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  pdfCode: { fontSize: 10, color: '#5B6779', fontFamily: 'monospace' },
  recordDate: { fontSize: 11, color: '#64748b', marginTop: 4 },
  recordTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 4 },
  approvalBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  approvalText: { fontSize: 10, fontWeight: '600', color: '#1d4ed8', textTransform: 'capitalize' },
  recordHint: {
    fontSize: 12,
    color: '#64748b',
    borderLeftWidth: 2,
    borderLeftColor: '#bfdbfe',
    paddingLeft: 8,
    marginBottom: 10,
  },
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
  },
  viewBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
  },
  fullModal: { flex: 1, backgroundColor: '#FFFFFF' },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  fullModalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  fullModalSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  fullModalBody: { flex: 1, padding: 16 },
  fullText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  mcqBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 },
  mcqQ: { fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  mcqOpt: { fontSize: 13, color: '#334155', marginTop: 6 },
  mcqAnswer: { fontSize: 12, color: '#047857', marginTop: 8, backgroundColor: '#ecfdf5', padding: 6, borderRadius: 6 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerItemText: { fontSize: 15, color: '#334155' },
  pickerClose: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  pickerCloseText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
});
