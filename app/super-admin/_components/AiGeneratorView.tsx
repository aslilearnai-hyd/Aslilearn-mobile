import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import { useCurriculumCascade } from '../../../src/hooks/useCurriculumCascade';
import {
  AI_GENERATOR_TOOLS,
  DIFFICULTY_OPTIONS,
  STUDENT_TOOL_IDS,
  TEACHER_TOOL_IDS,
  TEACHER_TOOL_LABELS,
  WORKSHEET_QUESTION_TYPES,
  type GeneratorRecord,
  type GroupedClass,
  type GroupedSubject,
  type GroupedSubtopic,
  type GroupedTool,
  type GroupedTopic,
  type ToolId,
  buildExtraParams,
  deleteAllGeneratorRecords,
  deleteGeneratorRecord,
  downloadGeneratorPdf,
  fetchGeneratorBoardOptions,
  fetchGeneratorRecord,
  fetchGeneratorRecords,
  generateAiBatch,
  releaseAiGeneratorLock,
  recordListPreviewText,
  toolRequiresTopic,
  updateGeneratorRecord,
} from '../../../src/lib/ai-generator';
import {
  filterSubjectsForAiTool,
  isLanguageExcludedTool,
  isStoryLanguageTool,
  isStoryPassageLanguageSubject,
  LANGUAGE_EXCLUDED_TOOL_ERROR,
} from '../../../src/lib/student-ai-tools';
import { GlassPanel } from '../../../src/components/ui';
import AiToolRecordPreview from '../../../src/components/ai-tools/AiToolRecordPreview';
import { extractMcqQuestionsFromRecord, isMcqTool } from '../../../src/lib/mcq-record-utils';
import {
  computeGeminiCostFromTokenUsage,
  emptyTokenTotals,
  formatCostInr,
  formatTokenCount,
  perRecordShareFromCost,
  type GeminiCostEstimate,
  type TokenTotals,
} from '../../../src/lib/gemini-token-cost';
import {
  GENERATION_RECORD_COUNT_MIN,
  GENERATION_RECORD_COUNT_MAX,
  generationRecordCountButtonLabel,
  isValidGenerationRecordCount,
  parseGenerationRecordCount,
  sanitizeGenerationRecordCountInput,
} from '../../../src/lib/generation-record-count';

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

function RecordRowItem({
  row,
  toolSlug,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  row: GeneratorRecord;
  toolSlug: string;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const mcqQs = isMcqTool(toolSlug)
    ? extractMcqQuestionsFromRecord({ toolName: toolSlug, generatedContent: String(row.generatedContent || '') })
    : [];

  return (
    <GlassPanel style={styles.recordCard} radius={10} tone="strong">
      <View style={styles.recordTop}>
        <Text style={styles.recordDate}>
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
        </Text>
        <View style={styles.recordActions}>
          <Pressable style={styles.actionOrange} onPress={() => onView(row._id)}>
            <Ionicons name="eye-outline" size={14} color="#c2410c" />
            <Text style={styles.actionOrangeText}>View</Text>
          </Pressable>
          <Pressable style={styles.actionBlue} onPress={() => onEdit(row._id)}>
            <Ionicons name="pencil-outline" size={14} color="#1d4ed8" />
            <Text style={styles.actionBlueText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.actionRed}
            onPress={() => onDelete(row._id)}
            disabled={deletingId === row._id}
          >
            <Ionicons name="trash-outline" size={14} color="#b91c1c" />
            <Text style={styles.actionRedText}>{deletingId === row._id ? 'Deleting…' : 'Delete'}</Text>
          </Pressable>
          <Pressable style={styles.actionGray} onPress={() => onPdf(row._id)}>
            <Ionicons name="download-outline" size={14} color="#334155" />
            <Text style={styles.actionGrayText}>PDF</Text>
          </Pressable>
        </View>
      </View>
      {mcqQs.length > 0 ? (
        mcqQs.map((q, i) => (
          <View key={`${row._id}-mcq-${i}`} style={styles.mcqBox}>
            <Text style={styles.mcqQ}>
              Q{i + 1}. {q.question}
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
        <Text style={styles.recordPreview} numberOfLines={4}>
          {recordListPreviewText(toolSlug, String(row.generatedContent || ''))}
        </Text>
      )}
    </GlassPanel>
  );
}

function SubtopicBlock({
  node,
  toolSlug,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  node: GroupedSubtopic;
  toolSlug: string;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>SUBTOPIC</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>{node.subtopicName}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          <Text style={styles.recordsCount}>
            {node.records.length} generation{node.records.length === 1 ? '' : 's'}
          </Text>
          {node.records.map((row) => (
            <RecordRowItem
              key={row._id}
              row={row}
              toolSlug={toolSlug}
              deletingId={deletingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPdf={onPdf}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function TopicBlock({
  node,
  toolSlug,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  node: GroupedTopic;
  toolSlug: string;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>TOPIC</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>{node.topicName || 'General'}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.subtopics.map((st, idx) => (
            <SubtopicBlock
              key={`${String(st.subtopicName || 'whole').trim() || 'whole'}::${idx}`}
              node={{
                ...st,
                subtopicName: String(st.subtopicName || '').trim() || 'Whole chapter',
              }}
              toolSlug={toolSlug}
              deletingId={deletingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPdf={onPdf}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function SubjectBlock({
  node,
  toolSlug,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  node: GroupedSubject;
  toolSlug: string;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>SUBJECT</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>{node.subjectName}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.topics.map((t) => (
            <TopicBlock
              key={t.topicName}
              node={t}
              toolSlug={toolSlug}
              deletingId={deletingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPdf={onPdf}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function ClassBlock({
  node,
  toolSlug,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  node: GroupedClass;
  toolSlug: string;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel style={styles.nestedBlock} radius={10} tone="medium">
      <Pressable style={styles.nestedTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.nestedLabel}>CLASS</Text>
        <View style={styles.nestedTitleWrap}>
          <Text style={styles.nestedTitle}>
            {node.className}
            {node.boardName ? ` (${node.boardName})` : ''}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
      </Pressable>
      {open ? (
        <View style={styles.nestedBody}>
          {node.subjects.map((s) => (
            <SubjectBlock
              key={s.subjectName}
              node={s}
              toolSlug={toolSlug}
              deletingId={deletingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPdf={onPdf}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function ToolRecordsBlock({
  node,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  node: GroupedTool;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.toolRecordsCard}>
      <Pressable style={styles.toolRecordsTrigger} onPress={() => setOpen((v) => !v)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolRecordsName}>{node.toolName}</Text>
          <Text style={styles.toolRecordsSlug}>{node.toolSlug}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </Pressable>
      {open ? (
        <View style={styles.toolRecordsBody}>
          <Text style={styles.classesHint}>Classes in this tool</Text>
          {node.classes.map((c) => (
            <ClassBlock
              key={`${node.toolSlug}-${c.className}-${c.boardName || ''}`}
              node={c}
              toolSlug={node.toolSlug}
              deletingId={deletingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPdf={onPdf}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AiGeneratorView() {
  const [board, setBoard] = useState('CBSE');
  const [recordsBoardFilter, setRecordsBoardFilter] = useState('CBSE');
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolId | ''>('');
  const [classNumber, setClassNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [questionType, setQuestionType] = useState('All Types');
  const [questionCount, setQuestionCount] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState('30');
  const [generationRecordCount, setGenerationRecordCount] = useState('10');
  const [forceGenerateNew, setForceGenerateNew] = useState(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    successCount: number;
    failedCount: number;
    batchSize: number;
    tokenUsage: TokenTotals;
    cost: GeminiCostEstimate;
    perRecordCost: { usd: number; inr: number };
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recordsTree, setRecordsTree] = useState<GroupedTool[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRecord, setActiveRecord] = useState<GeneratorRecord | null>(null);
  const [editRecord, setEditRecord] = useState<GeneratorRecord | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [boardPickerOpen, setBoardPickerOpen] = useState(false);
  const [recordsBoardPickerOpen, setRecordsBoardPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [subTopicPickerOpen, setSubTopicPickerOpen] = useState(false);
  const [questionTypePickerOpen, setQuestionTypePickerOpen] = useState(false);
  const [difficultyPickerOpen, setDifficultyPickerOpen] = useState(false);

  const {
    classOptions,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  } = useCurriculumCascade(classNumber || undefined, subject || undefined, topic || undefined, board || undefined);

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(selectedTool || '', subjects),
    [selectedTool, subjects],
  );

  const studentTools = useMemo(
    () => AI_GENERATOR_TOOLS.filter((t) => STUDENT_TOOL_IDS.includes(t.id)),
    [],
  );
  const teacherTools = useMemo(
    () => AI_GENERATOR_TOOLS.filter((t) => TEACHER_TOOL_IDS.includes(t.id)),
    [],
  );
  const currentTool = useMemo(
    () => AI_GENERATOR_TOOLS.find((t) => t.id === selectedTool),
    [selectedTool],
  );

  useEffect(() => {
    fetchGeneratorBoardOptions().then(setBoardOptions);
  }, []);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const result = await fetchGeneratorRecords(recordsBoardFilter);
      setRecordsTree(result.grouped);
      setRecordsTotal(result.total);
    } catch (err: any) {
      setRecordsTree([]);
      setRecordsTotal(0);
      Alert.alert('Records load failed', err?.friendlyMessage || err?.message || 'Could not load records.');
    } finally {
      setRecordsLoading(false);
    }
  }, [recordsBoardFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!isStoryLanguageTool(selectedTool)) return;
    if (!subject || isStoryPassageLanguageSubject(subject)) return;
    setSubject('');
    setTopic('');
    setSubTopic('');
  }, [selectedTool, subject]);

  useEffect(() => {
    if (!isLanguageExcludedTool(selectedTool)) return;
    if (!subject || !isStoryPassageLanguageSubject(subject)) return;
    setSubject('');
    setTopic('');
    setSubTopic('');
  }, [selectedTool, subject]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handleBoardChange = (value: string) => {
    setBoard(value);
    setClassNumber('');
    setSubject('');
    setTopic('');
    setSubTopic('');
  };

  const handleClassChange = (value: string) => {
    setClassNumber(value);
    setSubject('');
    setTopic('');
    setSubTopic('');
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setTopic('');
    setSubTopic('');
  };

  const handleTopicChange = (value: string) => {
    setTopic(value);
    setSubTopic('');
  };

  const handleToolSelect = (toolId: ToolId) => {
    setSelectedTool(toolId);
    if (isStoryLanguageTool(toolId) && subject && !isStoryPassageLanguageSubject(subject)) {
      setSubject('');
      setTopic('');
      setSubTopic('');
    }
    if (isLanguageExcludedTool(toolId) && subject && isStoryPassageLanguageSubject(subject)) {
      setSubject('');
      setTopic('');
      setSubTopic('');
    }
  };

  const buildGenerationPayload = (forceUnlock = false) => ({
    toolSlug: selectedTool as ToolId,
    toolName: currentTool?.name || selectedTool,
    board,
    className: classNumber,
    subjectName: subject,
    topicName: topic,
    subtopicName: subTopic,
    batchSize: parseGenerationRecordCount(generationRecordCount) || 10,
    forceGenerate: forceGenerateNew,
    forceGenerateNew,
    extraParams: buildExtraParams(selectedTool, questionType, questionCount, difficulty, duration),
    ...(forceUnlock ? { forceUnlock: true } : {}),
  });

  const generate = async (opts?: { forceUnlock?: boolean }) => {
    if (!selectedTool || !board || !classNumber || !subject || !subTopic) {
      Alert.alert('Missing fields', 'Tool, board, class, subject and sub topic are required.');
      return;
    }
    if (toolRequiresTopic(selectedTool) && !topic) {
      Alert.alert('Missing topic', 'Topic is required for this tool.');
      return;
    }
    if (isStoryLanguageTool(selectedTool) && !isStoryPassageLanguageSubject(subject)) {
      Alert.alert('English, Hindi, or Telugu only', 'This tool works only with English, Hindi, or Telugu subjects.');
      return;
    }
    if (isLanguageExcludedTool(selectedTool) && isStoryPassageLanguageSubject(subject)) {
      Alert.alert('Language subjects not supported', LANGUAGE_EXCLUDED_TOOL_ERROR);
      return;
    }
    if (!isValidGenerationRecordCount(generationRecordCount)) {
      Alert.alert(
        'Invalid record count',
        `Enter a whole number from ${GENERATION_RECORD_COUNT_MIN} to ${GENERATION_RECORD_COUNT_MAX}.`,
      );
      return;
    }
    setIsGenerating(true);
    setGenerationLocked(false);
    if (!opts?.forceUnlock) setLastBatchSummary(null);
    try {
      const result = await generateAiBatch(buildGenerationPayload(opts?.forceUnlock));
      const usage = result.tokenUsage;
      const tokenUsage = usage?.totals ? { ...emptyTokenTotals(), ...usage.totals } : emptyTokenTotals();
      const tokenCalls = Array.isArray(usage?.calls) ? usage.calls : [];
      const exchangeRateInr = Number(result.cost?.exchangeRateInr) || 95.11;
      const cost =
        result.cost && Number(result.cost.inr) >= 0
          ? (result.cost as GeminiCostEstimate)
          : computeGeminiCostFromTokenUsage({ totals: tokenUsage, calls: tokenCalls }, exchangeRateInr);
      const savedCount = Number(result.savedCount) || 0;
      const perRecord = perRecordShareFromCost(cost, savedCount || 1);
      setLastBatchSummary({
        successCount: savedCount,
        failedCount: Number(result.failedCount) || 0,
        batchSize: Number(result.batchSize) || parseGenerationRecordCount(generationRecordCount) || 10,
        tokenUsage,
        cost,
        perRecordCost: perRecord,
      });
      Alert.alert(
        savedCount > 0 ? 'Batch saved' : 'Batch failed',
        `${savedCount}/${result.batchSize || generationRecordCount} saved · ${formatTokenCount(tokenUsage.totalTokens)} tokens · ${formatCostInr(cost.inr)}`,
      );
      await loadRecords();
    } catch (err: any) {
      if (err?.locked) setGenerationLocked(true);
      Alert.alert('Generation failed', err?.friendlyMessage || err?.message || 'Could not generate.');
    } finally {
      setIsGenerating(false);
    }
  };

  const releaseLockAndRetry = async () => {
    try {
      await releaseAiGeneratorLock(buildGenerationPayload());
      setGenerationLocked(false);
      await generate({ forceUnlock: true });
    } catch (err: any) {
      Alert.alert('Could not clear lock', err?.message || 'Failed to clear lock.');
    }
  };

  const openView = async (id: string) => {
    try {
      const data = await fetchGeneratorRecord(id);
      setActiveRecord(data);
    } catch (err: any) {
      Alert.alert('Load failed', err?.friendlyMessage || err?.message || 'Could not load record.');
    }
  };

  const openEdit = async (id: string) => {
    try {
      const data = await fetchGeneratorRecord(id);
      setEditRecord(data);
      setEditContent(String(data.generatedContent || ''));
    } catch (err: any) {
      Alert.alert('Load failed', err?.friendlyMessage || err?.message || 'Could not load record.');
    }
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    if (!editContent.trim()) {
      Alert.alert('Missing content', 'Content cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateGeneratorRecord(editRecord._id, {
        generatedContent: editContent,
        toolName: editRecord.toolName,
        toolSlug: editRecord.toolSlug,
        className: editRecord.className,
        subjectName: editRecord.subjectName,
        topicName: editRecord.topicName,
        subtopicName: editRecord.subtopicName,
      });
      setEditRecord(null);
      await loadRecords();
    } catch (err: any) {
      Alert.alert('Update failed', err?.friendlyMessage || err?.message || 'Could not update.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRecord = (id: string) => {
    Alert.alert('Delete record', 'Delete this record permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await deleteGeneratorRecord(id);
            if (activeRecord?._id === id) setActiveRecord(null);
            await loadRecords();
          } catch (err: any) {
            Alert.alert('Delete failed', err?.friendlyMessage || err?.message || 'Could not delete.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const confirmDeleteAll = () => {
    const boardLabel = recordsBoardFilter === '__all__' ? 'all boards' : `board “${recordsBoardFilter}”`;
    Alert.alert(
      'Delete all records?',
      `This will permanently delete ${recordsTotal} AI Generator record${recordsTotal === 1 ? '' : 's'} for ${boardLabel}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAll(true);
            try {
              const json = await deleteAllGeneratorRecords(recordsBoardFilter);
              const count = Number(json?.data?.deletedCount ?? 0);
              Alert.alert('Deleted', json?.message || `Deleted ${count} record${count === 1 ? '' : 's'}.`);
              await loadRecords();
            } catch (err: any) {
              Alert.alert('Delete all failed', err?.friendlyMessage || err?.message || 'Could not delete all.');
            } finally {
              setIsDeletingAll(false);
            }
          },
        },
      ],
    );
  };

  const openPdf = async (id: string) => {
    try {
      await downloadGeneratorPdf(id);
    } catch (err: any) {
      Alert.alert('PDF failed', err?.message || 'Could not generate PDF.');
    }
  };

  const boardOptionsForPicker = boardOptions.map((b) => ({ value: b, label: b }));
  const recordsBoardOptions = [
    { value: '__all__', label: 'All boards' },
    ...boardOptions.map((b) => ({ value: b, label: b })),
  ];

  const viewMcqQs = activeRecord
    ? extractMcqQuestionsFromRecord({
        toolName: String(activeRecord.toolSlug || activeRecord.toolName || ''),
        generatedContent: String(activeRecord.generatedContent || ''),
        metadata: activeRecord.metadata,
      })
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      keyboardShouldPersistTaps="handled"
    >
      <GlassPanel style={styles.section} radius={14} tone="medium">
        <Text style={styles.sectionTitle}>Available Tools</Text>
        <Text style={styles.groupLabel}>Student</Text>
        <View style={styles.toolsGrid}>
          {studentTools.map((tool) => (
            <GlassPanel
              key={`student-${tool.id}`}
              style={[styles.toolCard, selectedTool === tool.id && styles.toolCardActive]}
              radius={12}
              tone="medium"
            >
              {/* Padding sits on the Pressable so the whole card stays tappable. */}
              <Pressable style={styles.toolCardInner} onPress={() => handleToolSelect(tool.id)}>
                <View style={styles.toolIcon}>
                  <Ionicons name="sparkles" size={16} color="#ea580c" />
                </View>
                <Text style={styles.toolName}>{tool.name}</Text>
                <Text style={styles.toolDesc}>{tool.description}</Text>
              </Pressable>
            </GlassPanel>
          ))}
        </View>
        <Text style={styles.groupLabel}>Teacher</Text>
        <View style={styles.toolsGrid}>
          {teacherTools.map((tool) => (
            <GlassPanel
              key={`teacher-${tool.id}`}
              style={[styles.toolCard, selectedTool === tool.id && styles.toolCardActive]}
              radius={12}
              tone="medium"
            >
              {/* Padding sits on the Pressable so the whole card stays tappable. */}
              <Pressable style={styles.toolCardInner} onPress={() => handleToolSelect(tool.id)}>
                <View style={styles.toolIcon}>
                  <Ionicons name="sparkles" size={16} color="#ea580c" />
                </View>
                <Text style={styles.toolName}>{TEACHER_TOOL_LABELS[tool.id] || tool.name}</Text>
                <Text style={styles.toolDesc}>{tool.description}</Text>
              </Pressable>
            </GlassPanel>
          ))}
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section} radius={14} tone="strong">
        <Text style={styles.sectionTitle}>Generate Content</Text>
        <Text style={styles.fieldLabel}>Selected Tool</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{currentTool?.name || 'No tool selected'}</Text>
        </View>
        {isStoryLanguageTool(selectedTool) ? (
          <Text style={styles.infoBanner}>English, Hindi, and Telugu subjects only for Story & Passage Creator.</Text>
        ) : null}
        {isLanguageExcludedTool(selectedTool) ? (
          <Text style={[styles.infoBanner, styles.infoBannerWarning]}>
            Not available for English, Hindi, or Telugu subjects.
          </Text>
        ) : null}

        <Text style={styles.fieldLabel}>Board</Text>
        <Pressable style={styles.selectField} onPress={() => setBoardPickerOpen(true)}>
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>{board || 'Select board'}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Class</Text>
        <Pressable
          style={[styles.selectField, (!board || loadingClasses) && styles.selectDisabled]}
          onPress={() => board && !loadingClasses && setClassPickerOpen(true)}
        >
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {!board ? 'Select board first' : loadingClasses ? 'Loading classes…' : classNumber || 'Select class'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Subject</Text>
        <Pressable
          style={[styles.selectField, (!classNumber || loadingSubjects) && styles.selectDisabled]}
          onPress={() => classNumber && !loadingSubjects && setSubjectPickerOpen(true)}
        >
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {!classNumber
                ? 'Select class first'
                : loadingSubjects
                  ? 'Loading subjects…'
                  : isStoryLanguageTool(selectedTool) && subjectsForTool.length === 0
                    ? 'English, Hindi, or Telugu only'
                    : isLanguageExcludedTool(selectedTool) && subjectsForTool.length === 0
                      ? 'Not available for English, Hindi, or Telugu'
                      : subject || 'Select subject'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>

        <Text style={styles.fieldLabel}>Topic</Text>
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

        {selectedTool === 'worksheet-mcq-generator' ? (
          <>
            <Text style={styles.fieldLabel}>Question Type</Text>
            <Pressable style={styles.selectField} onPress={() => setQuestionTypePickerOpen(true)}>
              <View style={styles.selectTextWrap}>
                <Text style={styles.selectText}>{questionType}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </Pressable>
          </>
        ) : null}

        {(
          selectedTool === 'worksheet-mcq-generator' ||
          selectedTool === 'smart-qa-practice-generator' ||
          selectedTool === 'mock-test-builder' ||
          selectedTool === 'exam-question-paper-generator' ||
          selectedTool === 'homework-creator'
        ) ? (
          <>
            <Text style={styles.fieldLabel}>Number of questions</Text>
            <TextInput
              style={styles.input}
              value={questionCount}
              onChangeText={setQuestionCount}
              keyboardType="number-pad"
              placeholder="e.g. 10"
            />
          </>
        ) : null}

        {selectedTool === 'smart-qa-practice-generator' ? (
          <>
            <Text style={styles.fieldLabel}>Difficulty</Text>
            <Pressable style={styles.selectField} onPress={() => setDifficultyPickerOpen(true)}>
              <View style={styles.selectTextWrap}>
                <Text style={styles.selectText}>{difficulty}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </Pressable>
          </>
        ) : null}

        {(selectedTool === 'homework-creator' ||
          selectedTool === 'mock-test-builder' ||
          selectedTool === 'quick-assignment-builder') && (
          <>
            <Text style={styles.fieldLabel}>Duration (minutes)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </>
        )}

        <Text style={styles.fieldLabel}>Records to generate ({GENERATION_RECORD_COUNT_MIN}–{GENERATION_RECORD_COUNT_MAX})</Text>
        <TextInput
          style={styles.input}
          value={generationRecordCount}
          keyboardType="number-pad"
          onChangeText={(v) => {
            const next = sanitizeGenerationRecordCountInput(v);
            if (next !== null) setGenerationRecordCount(next);
          }}
        />
        <Pressable style={styles.forceRow} onPress={() => setForceGenerateNew((v) => !v)}>
          <Ionicons name={forceGenerateNew ? 'checkbox' : 'square-outline'} size={20} color="#2563eb" />
          <View style={styles.forceTextWrap}>
            <Text style={styles.forceText}>Force generate new (even when topic has 1000+ records)</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.generateBtn, (isGenerating || !selectedTool) && styles.generateBtnDisabled]}
          onPress={() => void generate()}
          disabled={isGenerating || !selectedTool}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>
              {generationRecordCountButtonLabel(generationRecordCount, isGenerating)}
            </Text>
          )}
        </Pressable>
        {generationLocked ? (
          <Pressable style={styles.lockBtn} onPress={() => void releaseLockAndRetry()}>
            <Text style={styles.lockBtnText}>Clear lock & retry</Text>
          </Pressable>
        ) : null}
        {lastBatchSummary ? (
          <View style={styles.batchSummary}>
            <Text style={styles.batchSummaryTitle}>
              Last batch: {lastBatchSummary.successCount}/{lastBatchSummary.batchSize} saved
            </Text>
            <Text style={styles.batchSummaryLine}>
              {formatTokenCount(lastBatchSummary.tokenUsage.totalTokens)} tokens · Batch {formatCostInr(lastBatchSummary.cost.inr)}
              {lastBatchSummary.successCount > 0
                ? ` · ~${formatCostInr(lastBatchSummary.perRecordCost.inr)}/record`
                : ''}
            </Text>
          </View>
        ) : null}
      </GlassPanel>

      <GlassPanel style={styles.section} radius={14} tone="medium">
        <View style={styles.recordsHeader}>
          <Text style={styles.sectionTitle}>Records</Text>
          <Pressable
            style={[styles.deleteAllBtn, (recordsLoading || recordsTotal === 0 || isDeletingAll) && styles.deleteAllDisabled]}
            disabled={recordsLoading || recordsTotal === 0 || isDeletingAll}
            onPress={confirmDeleteAll}
          >
            <Ionicons name="trash-outline" size={14} color="#fff" />
            <Text style={styles.deleteAllText}>{isDeletingAll ? 'Deleting…' : 'Delete All'}</Text>
          </Pressable>
        </View>
        <Text style={styles.fieldLabel}>Filter by board</Text>
        <Pressable style={styles.selectField} onPress={() => setRecordsBoardPickerOpen(true)}>
          <View style={styles.selectTextWrap}>
            <Text style={styles.selectText}>
              {recordsBoardFilter === '__all__' ? 'All boards' : recordsBoardFilter}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>
        <Text style={styles.recordsHint}>
          Showing records for:{' '}
          <Text style={styles.recordsHintBold}>
            {recordsBoardFilter === '__all__' ? 'All boards' : recordsBoardFilter}
          </Text>
        </Text>

        {recordsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#f97316" />
            <Text style={styles.loadingText}>Loading records…</Text>
          </View>
        ) : recordsTree.length === 0 ? (
          <Text style={styles.emptyRecords}>
            No records found
            {recordsBoardFilter !== '__all__' ? ` for board “${recordsBoardFilter}”.` : '.'}
          </Text>
        ) : (
          recordsTree.map((toolNode) => (
            <ToolRecordsBlock
              key={toolNode.toolSlug}
              node={toolNode}
              deletingId={deletingId}
              onView={openView}
              onEdit={openEdit}
              onDelete={deleteRecord}
              onPdf={openPdf}
            />
          ))
        )}
      </GlassPanel>

      <Modal visible={!!activeRecord} animationType="slide" onRequestClose={() => setActiveRecord(null)}>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Generated Record</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close generated record"
              onPress={() => setActiveRecord(null)}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>
          <ScrollView style={styles.fullModalBody}>
            {viewMcqQs.length > 0 ? (
              viewMcqQs.map((q, idx) => (
                <View key={`view-mcq-${idx}`} style={styles.mcqBox}>
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
                toolType={String(activeRecord?.toolSlug || activeRecord?.toolName || '')}
                content={String(activeRecord?.generatedContent || '')}
                metadata={activeRecord?.metadata as Record<string, unknown> | undefined}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!editRecord} animationType="slide" onRequestClose={() => setEditRecord(null)}>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Edit Record</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close record editor"
              onPress={() => setEditRecord(null)}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>
          <ScrollView style={styles.fullModalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.editInput}
              multiline
              value={editContent}
              onChangeText={setEditContent}
              textAlignVertical="top"
            />
            <View style={styles.editFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditRecord(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={savingEdit}>
                <Text style={styles.saveBtnText}>{savingEdit ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <OptionPicker
        visible={boardPickerOpen}
        title="Select board"
        options={boardOptionsForPicker}
        onSelect={handleBoardChange}
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
        onSelect={handleClassChange}
        onClose={() => setClassPickerOpen(false)}
      />
      <OptionPicker
        visible={subjectPickerOpen}
        title="Select subject"
        options={subjectsForTool.map((s) => ({ value: s, label: s }))}
        onSelect={handleSubjectChange}
        onClose={() => setSubjectPickerOpen(false)}
      />
      <OptionPicker
        visible={topicPickerOpen}
        title="Select topic"
        options={topics.map((t) => ({ value: t, label: t }))}
        onSelect={handleTopicChange}
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
        visible={questionTypePickerOpen}
        title="Question type"
        options={WORKSHEET_QUESTION_TYPES.map((q) => ({ value: q, label: q }))}
        onSelect={setQuestionType}
        onClose={() => setQuestionTypePickerOpen(false)}
      />
      <OptionPicker
        visible={difficultyPickerOpen}
        title="Difficulty"
        options={DIFFICULTY_OPTIONS.map((d) => ({ value: d, label: d }))}
        onSelect={setDifficulty}
        onClose={() => setDifficultyPickerOpen(false)}
      />

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
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  toolsGrid: { gap: 10, marginBottom: 12 },
  toolCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  toolCardInner: { padding: 12 },
  toolCardActive: { borderColor: '#fb923c', backgroundColor: 'rgba(255,247,237,0.55)' },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  toolDesc: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 6 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#334155' },
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
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#FFFFFF',
  },
  generateBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.55 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  forceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  forceTextWrap: { flex: 1, minWidth: 0 },
  forceText: { fontSize: 12, color: '#475569' },
  lockBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  lockBtnText: { color: '#b45309', fontWeight: '700' },
  batchSummary: {
    marginTop: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  batchSummaryTitle: { fontWeight: '800', color: '#065f46', fontSize: 13 },
  batchSummaryLine: { color: '#047857', fontSize: 12 },
  recordsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteAllDisabled: { opacity: 0.5 },
  deleteAllText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  recordsHint: { fontSize: 12, color: '#64748b', marginTop: 8, marginBottom: 12 },
  recordsHintBold: { fontWeight: '600', color: '#334155' },
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 13, color: '#64748b' },
  emptyRecords: { fontSize: 13, color: '#64748b', paddingVertical: 16 },
  toolRecordsCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  toolRecordsTrigger: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  toolRecordsName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  toolRecordsSlug: { fontSize: 11, color: '#64748b', marginTop: 2 },
  toolRecordsBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 10, backgroundColor: '#f8fafc' },
  classesHint: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  nestedBlock: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  nestedTrigger: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  nestedLabel: { fontSize: 10, fontWeight: '700', color: '#5B6779' },
  nestedTitleWrap: { flex: 1, minWidth: 0 },
  nestedTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  nestedBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 8 },
  recordsCount: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 8 },
  recordCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  recordTop: { gap: 8, marginBottom: 8 },
  recordDate: { fontSize: 11, color: '#64748b' },
  recordActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionOrange: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,247,237,0.55)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  actionOrangeText: { fontSize: 11, fontWeight: '600', color: '#c2410c' },
  actionBlue: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  actionBlueText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  actionRed: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  actionRedText: { fontSize: 11, fontWeight: '600', color: '#b91c1c' },
  actionGray: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  actionGrayText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  recordPreview: { fontSize: 13, color: '#334155', lineHeight: 20, borderLeftWidth: 2, borderLeftColor: '#fed7aa', paddingLeft: 8 },
  mcqBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 },
  mcqQ: { fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  mcqOpt: { fontSize: 12, color: '#334155', marginTop: 6 },
  mcqAnswer: { fontSize: 11, color: '#047857', marginTop: 8, backgroundColor: '#ecfdf5', padding: 6, borderRadius: 6 },
  fullModal: { flex: 1, backgroundColor: '#FFFFFF' },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  fullModalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  fullModalBody: { flex: 1, padding: 16 },
  fullText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  editInput: {
    minHeight: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  editFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, marginBottom: 24 },
  cancelBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  saveBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%' },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerItemText: { fontSize: 15, color: '#334155' },
  pickerClose: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  pickerCloseText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
});
