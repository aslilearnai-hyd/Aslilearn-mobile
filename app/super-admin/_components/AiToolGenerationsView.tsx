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
  Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import {
  BROWSE_STEPS,
  TOOL_LABELS,
  type BranchItem,
  type RecordRow,
  buildExportText,
  dedupeBranchItems,
  deleteDocument,
  fetchBoardOptions,
  fetchBranch,
  fetchDocument,
  fetchExportBundle,
  fetchMeta,
  fetchRecords,
  humanizeToolId,
  labelEmpty,
  patchDocumentStructured,
  questionsToStructuredPayload,
  toEditablePlainText,
  updateDocument,
} from '../../../src/lib/ai-tool-generations';
import { extractMcqQuestionsFromRecord, isMcqTool } from '../../../src/lib/mcq-record-utils';
import AiToolRecordPreview from '../../../src/components/ai-tools/AiToolRecordPreview';
import { GlassPanel } from '../../../src/components/ui';

type BoardPickerProps = {
  visible: boolean;
  boards: string[];
  current: string;
  onSelect: (board: string) => void;
  onClose: () => void;
};

function BoardPicker({ visible, boards, current, onSelect, onClose }: BoardPickerProps) {
  const options = [{ value: '', label: 'All boards' }, ...boards.map((b) => ({ value: b, label: b }))];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Records board</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((item) => (
              <Pressable
                key={item.value || '__all__'}
                style={[styles.pickerItem, current === item.value && styles.pickerItemActive]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={styles.pickerItemText}>{item.label}</Text>
                {current === item.value ? (
                  <Ionicons name="checkmark" size={18} color="#f97316" />
                ) : null}
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

function RecordsSection({ parents }: { parents: Record<string, string> }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<RecordRow[]>([]);
  const [viewRow, setViewRow] = useState<RecordRow | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<RecordRow | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingQuestionKey, setDeletingQuestionKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRecords(parents, page, 20);
      setTotal(r.data.total);
      setItems(r.data.items);
    } catch {
      setTotal(0);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [parents, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDoc = async (row: RecordRow) => {
    setViewRow(row);
    const initialText = String(row.content || row.preview || '').trim();
    setFullText(initialText || '(No content available)');
    try {
      const r = await fetchDocument(row._id);
      setFullText(String(r.data.content || ''));
    } catch {
      /* keep list payload */
    }
  };

  const removeQuestionFromRecord = async (row: RecordRow, questionIndex: number) => {
    const qs = extractMcqQuestionsFromRecord(row);
    if (questionIndex < 0 || questionIndex >= qs.length) return;
    const nextQs = qs.filter((_, i) => i !== questionIndex);
    const key = `${row._id}:${questionIndex}`;
    setDeletingQuestionKey(key);
    try {
      const prev = (row.metadata?.structuredContent as Record<string, unknown>) || {};
      await patchDocumentStructured(row._id, {
        ...prev,
        questions: questionsToStructuredPayload(nextQs),
      });
      await load();
      if (viewRow && viewRow._id === row._id) {
        const r = await fetchDocument(row._id);
        setFullText(String(r.data.content || ''));
      }
    } catch {
      Alert.alert('Update failed', 'Could not remove question.');
    } finally {
      setDeletingQuestionKey(null);
    }
  };

  const openEdit = async (row: RecordRow) => {
    setEditRow(row);
    setEditContent('');
    try {
      const r = await fetchDocument(row._id);
      setEditContent(toEditablePlainText(r.data.content || ''));
    } catch {
      Alert.alert('Failed', 'Could not load content for editing.');
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    if (!editContent.trim()) {
      Alert.alert('Missing content', 'Content cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateDocument(editRow._id, editContent);
      setEditRow(null);
      await load();
      if (viewRow && viewRow._id === editRow._id) {
        setFullText(editContent);
      }
    } catch {
      Alert.alert('Update failed', 'Could not update record.');
    } finally {
      setSavingEdit(false);
    }
  };

  const removeRow = (row: RecordRow) => {
    Alert.alert('Delete record', 'Delete this record permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(row._id);
          try {
            await deleteDocument(row._id);
            if (viewRow && viewRow._id === row._id) {
              setViewRow(null);
              setFullText(null);
            }
            await load();
          } catch {
            Alert.alert('Delete failed', 'Could not delete record.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const exportSubtopic = async () => {
    setExporting(true);
    try {
      const r = await fetchExportBundle(parents, 500);
      const text = buildExportText(r.data.records);
      const title = `${parents.toolName || 'tool'}_${parents.subtopic || 'sub'}`;
      await Share.share({ message: text, title });
    } catch {
      Alert.alert('Export failed', 'Could not export records.');
    } finally {
      setExporting(false);
    }
  };

  const viewMcqQs =
    viewRow && fullText != null
      ? extractMcqQuestionsFromRecord({
          toolName: String(viewRow.toolName || parents.toolName || ''),
          content: fullText,
          generatedContent: fullText,
          metadata: viewRow.metadata,
        })
      : [];

  return (
    <GlassPanel style={styles.recordsCard} radius={12} tone="medium">
      <View style={styles.recordsHeader}>
        <View style={styles.recordsHeaderLeft}>
          <View style={styles.recordsIcon}>
            <Ionicons name="documents-outline" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recordsTitle}>Records</Text>
            <Text style={styles.recordsSubtitle} numberOfLines={1}>
              {total} generation{total !== 1 ? 's' : ''} · {labelEmpty(parents.subtopic || '')}
            </Text>
          </View>
        </View>
        <Pressable style={styles.exportBtn} onPress={exportSubtopic} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={14} color="#fff" />
              <Text style={styles.exportBtnText}>Export</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.recordsBody}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.mutedText}>Loading records…</Text>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyRecords}>No records for this path.</Text>
        ) : (
          items.map((row) => {
            const mcqQs = isMcqTool(parents.toolName) ? extractMcqQuestionsFromRecord(row) : [];
            return (
              <GlassPanel key={row._id} style={styles.recordItem} radius={10} tone="strong">
                <View style={styles.recordMeta}>
                  <Text style={styles.recordDate}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </Text>
                  <View style={styles.boardBadge}>
                    <Text style={styles.boardBadgeText}>{row.board || '—'}</Text>
                  </View>
                </View>
                <View style={styles.recordActions}>
                  <Pressable style={styles.actionBtnOrange} onPress={() => openDoc(row)}>
                    <Ionicons name="eye-outline" size={14} color="#c2410c" />
                    <Text style={styles.actionBtnOrangeText}>View</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtnBlue} onPress={() => openEdit(row)}>
                    <Ionicons name="pencil-outline" size={14} color="#1d4ed8" />
                    <Text style={styles.actionBtnBlueText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionBtnRed}
                    onPress={() => removeRow(row)}
                    disabled={deletingId === row._id}
                  >
                    <Ionicons name="trash-outline" size={14} color="#b91c1c" />
                    <Text style={styles.actionBtnRedText}>
                      {deletingId === row._id ? 'Deleting…' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
                {mcqQs.length > 0 ? (
                  mcqQs.map((q, qIdx) => (
                    <GlassPanel
                      key={`${row._id}-mcq-${qIdx}`}
                      style={styles.mcqCard}
                      radius={10}
                      tone="strong"
                    >
                      <View style={styles.mcqHeader}>
                        <View style={styles.mcqQuestionWrap}>
                          <Text style={styles.mcqQuestion}>
                            Q{qIdx + 1}. {q.question}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => removeQuestionFromRecord(row, qIdx)}
                          disabled={deletingQuestionKey === `${row._id}:${qIdx}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete question ${qIdx + 1}`}
                        >
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                        </Pressable>
                      </View>
                      {q.options.map((opt, j) => (
                        <Text key={j} style={styles.mcqOption}>
                          ○ {opt}
                        </Text>
                      ))}
                      {q.answer ? (
                        <Text style={styles.mcqAnswer}>Answer: {q.answer}</Text>
                      ) : null}
                      {q.explanation ? (
                        <Text style={styles.mcqExplanation}>Explanation: {q.explanation}</Text>
                      ) : null}
                    </GlassPanel>
                  ))
                ) : (
                  <Text style={styles.recordPreview} numberOfLines={4}>
                    {toEditablePlainText(String(row.content || row.preview || ''))}
                  </Text>
                )}
              </GlassPanel>
            );
          })
        )}

        {total > 20 ? (
          <View style={styles.pagination}>
            {/* Padding moved to the inner Pressable so the tap target stays the full button. */}
            <GlassPanel
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              radius={10}
              tone="medium"
            >
              <Pressable
                style={styles.pageBtnInner}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </Pressable>
            </GlassPanel>
            <Text style={styles.pageInfo}>
              Page {page} · {total} total
            </Text>
            <GlassPanel
              style={[styles.pageBtn, page * 20 >= total && styles.pageBtnDisabled]}
              radius={10}
              tone="medium"
            >
              <Pressable
                style={styles.pageBtnInner}
                disabled={page * 20 >= total}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </Pressable>
            </GlassPanel>
          </View>
        ) : null}
      </View>

      <Modal visible={!!viewRow} animationType="slide" onRequestClose={() => setViewRow(null)}>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Generated content</Text>
            <Pressable
              onPress={() => setViewRow(null)}
              accessibilityRole="button"
              accessibilityLabel="Close generated content"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>
          <ScrollView style={styles.fullModalBody} contentContainerStyle={{ paddingBottom: 32 }}>
            {fullText == null ? (
              <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
            ) : viewMcqQs.length > 0 ? (
              viewMcqQs.map((q, idx) => (
                <View key={`dlg-q-${idx}`} style={[styles.mcqCard, styles.mcqCardOpaque]}>
                  <View style={styles.mcqQuestionWrap}>
                    <Text style={styles.mcqQuestion}>
                      Q{idx + 1}. {q.question}
                    </Text>
                  </View>
                  {q.options.map((opt, j) => (
                    <Text key={j} style={styles.mcqOption}>
                      ○ {opt}
                    </Text>
                  ))}
                  {q.answer ? <Text style={styles.mcqAnswer}>Answer: {q.answer}</Text> : null}
                  {q.explanation ? (
                    <Text style={styles.mcqExplanation}>Explanation: {q.explanation}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <AiToolRecordPreview
                toolType={String(viewRow?.toolName || parents.toolName || '')}
                content={fullText}
                metadata={viewRow?.metadata as Record<string, unknown> | undefined}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!editRow} animationType="slide" onRequestClose={() => setEditRow(null)}>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Edit content</Text>
            <Pressable
              onPress={() => setEditRow(null)}
              accessibilityRole="button"
              accessibilityLabel="Close editor"
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
              placeholder="Update content..."
              textAlignVertical="top"
            />
            <View style={styles.editActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditRow(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={savingEdit}>
                <Text style={styles.saveBtnText}>{savingEdit ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </GlassPanel>
  );
}

function SubtopicLeafRow({
  toolName,
  classLabel,
  board,
  subject,
  topic,
  item,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  subject: string;
  topic: string;
  item: BranchItem;
}) {
  const [open, setOpen] = useState(false);
  const parents = useMemo(
    () => ({
      ...(board ? { board } : {}),
      toolName,
      classLabel,
      subject,
      topic,
      subtopic: item.value,
    }),
    [board, toolName, classLabel, subject, topic, item.value],
  );

  return (
    <View style={styles.subtopicLeaf}>
      <Pressable style={styles.subtopicLeafTrigger} onPress={() => setOpen((v) => !v)}>
        <View style={styles.subtopicLeafLeft}>
          <Ionicons name="git-branch-outline" size={14} color="#d97706" style={styles.rowIcon} />
          <View style={styles.subtopicValueWrap}>
            <Text style={styles.subtopicLabel}>Subtopic</Text>
            <Text style={styles.subtopicValue}>{labelEmpty(item.value)}</Text>
          </View>
        </View>
        <View style={styles.subtopicLeafRight}>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{item.count}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.subtopicLeafBody}>
          <RecordsSection parents={parents} />
        </View>
      ) : null}
    </View>
  );
}

function TopicRow({
  toolName,
  classLabel,
  board,
  subject,
  topic,
  label,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  subject: string;
  topic: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    if (!open || subs !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({
          ...(board ? { board } : {}),
          toolName,
          classLabel,
          subject,
          topic,
        });
        setSubs(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, subs, toolName, classLabel, subject, topic, board]);

  return (
    <GlassPanel style={styles.topicCard} radius={10} tone="medium">
      <Pressable style={styles.topicTrigger} onPress={() => setOpen((v) => !v)}>
        <Ionicons name="bookmark-outline" size={16} color="#0d9488" style={styles.rowIcon} />
        <View style={styles.topicTitleWrap}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Topic</Text>
          </View>
          <Text style={styles.topicTitle}>{label}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" style={styles.rowChevron} />
      </Pressable>
      {open ? (
        <View style={styles.topicBody}>
          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.mutedText}>Loading subtopics…</Text>
            </View>
          ) : null}
          {subs?.map((s) => (
            <SubtopicLeafRow
              key={`${topic}:${s.value}:${s.count}`}
              toolName={toolName}
              classLabel={classLabel}
              board={board}
              subject={subject}
              topic={topic}
              item={s}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function SubjectRow({
  toolName,
  classLabel,
  board,
  subject,
  label,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  subject: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    if (!open || topics !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({
          ...(board ? { board } : {}),
          toolName,
          classLabel,
          subject,
        });
        setTopics(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, topics, toolName, classLabel, subject, board]);

  return (
    <GlassPanel style={styles.subjectCard} radius={10} tone="medium">
      <Pressable style={styles.subjectTrigger} onPress={() => setOpen((v) => !v)}>
        <Ionicons name="book-outline" size={16} color="#6366f1" style={styles.rowIcon} />
        <View style={styles.subjectTitleWrap}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Subject</Text>
          </View>
          <Text style={styles.subjectTitle}>{label}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" style={styles.rowChevron} />
      </Pressable>
      {open ? (
        <View style={styles.subjectBody}>
          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.mutedText}>Loading topics…</Text>
            </View>
          ) : null}
          {topics?.map((t) => (
            <TopicRow
              key={`${subject}:${t.value}:${t.count}`}
              toolName={toolName}
              classLabel={classLabel}
              board={board}
              subject={subject}
              topic={t.value}
              label={labelEmpty(t.value)}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function ClassBlock({
  toolName,
  classLabel,
  board,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<BranchItem[] | null>(null);
  const classTitle = classLabel === '' ? '(No class label)' : classLabel;

  useEffect(() => {
    if (!open || subjects !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({ ...(board ? { board } : {}), toolName, classLabel });
        setSubjects(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, subjects, toolName, classLabel, board]);

  return (
    <GlassPanel style={styles.classBlock} radius={12} tone="medium">
      <Pressable style={styles.classTrigger} onPress={() => setOpen((v) => !v)}>
        <View style={styles.classTitleWrap}>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>Class</Text>
          </View>
          <Text style={styles.classTitle}>{classTitle}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" style={styles.rowChevron} />
      </Pressable>
      {open ? (
        <View style={styles.classBody}>
          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.mutedText}>Loading subjects…</Text>
            </View>
          ) : null}
          {subjects?.map((s) => (
            <SubjectRow
              key={`${s.value}:${s.count}`}
              toolName={toolName}
              classLabel={classLabel}
              board={board}
              subject={s.value}
              label={labelEmpty(s.value)}
            />
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}

function ClassSection({ toolName, board }: { toolName: string; board?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    if (!open || classes !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({ ...(board ? { board } : {}), toolName });
        setClasses(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, classes, toolName, board]);

  return (
    <View style={styles.classSection}>
      {/* Padding moved to the inner Pressable so the tap target stays the full row. */}
      <GlassPanel style={styles.classSectionTrigger} radius={10} tone="medium">
        <Pressable style={styles.classSectionTriggerInner} onPress={() => setOpen((v) => !v)}>
          <Ionicons name="school-outline" size={18} color="#475569" />
          <View style={styles.classSectionTitleWrap}>
            <Text style={styles.classSectionTitle}>Classes in this tool</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5B6779" />
        </Pressable>
      </GlassPanel>
      {open ? (
        <View style={styles.classSectionBody}>
          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.mutedText}>Loading classes…</Text>
            </View>
          ) : null}
          {classes?.map((c) => (
            <ClassBlock
              key={`${c.value}:${c.count}`}
              toolName={toolName}
              classLabel={c.value}
              board={board}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ToolSection({
  tool,
  displayName,
  board,
}: {
  tool: BranchItem;
  displayName?: string;
  board?: string;
}) {
  const [open, setOpen] = useState(false);
  const title = displayName || humanizeToolId(tool.value);

  return (
    <GlassPanel style={styles.toolCard} radius={14} tone="medium">
      <Pressable style={styles.toolTrigger} onPress={() => setOpen((v) => !v)}>
        <View style={styles.toolIcon}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
        <View style={styles.toolTriggerBody}>
          <Text style={styles.toolTitle}>{title}</Text>
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>{tool.count} saved</Text>
          </View>
          <Text style={styles.toolId}>{tool.value}</Text>
          <Text style={styles.toolHint}>
            {open ? 'Hide classes & paths' : 'Expand to browse class → subject → topic → records'}
          </Text>
        </View>
      </Pressable>
      {open ? (
        <View style={styles.toolBody}>
          <ClassSection toolName={tool.value} board={board} />
        </View>
      ) : null}
    </GlassPanel>
  );
}

export default function AiToolGenerationsView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metaTotal, setMetaTotal] = useState<number | null>(null);
  const [metaTopicsCount, setMetaTopicsCount] = useState<number | null>(null);
  const [tools, setTools] = useState<BranchItem[] | null>(null);
  const [board, setBoard] = useState('CBSE');
  const [boards, setBoards] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [boardPickerOpen, setBoardPickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const params: Record<string, string> = board ? { board } : {};
      const [meta, branch, boardList] = await Promise.all([
        fetchMeta(params),
        fetchBranch(params),
        fetchBoardOptions(),
      ]);
      setMetaTotal(meta.data.total);
      setMetaTopicsCount(meta.data.topicsCount ?? 0);
      setTools(dedupeBranchItems(branch.data.items || []));
      setBoards(boardList);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [board]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const sortedTools = useMemo(() => {
    if (!tools) return [];
    return [...tools].sort((a, b) => a.value.localeCompare(b.value));
  }, [tools]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
    >
      {/* Padding lives on heroInner so the full-bleed accent bar is not inset by it. */}
      <GlassPanel style={styles.hero} radius={16} tone="medium">
        <View style={styles.heroAccent} />
        <View style={styles.heroInner}>
          <View style={styles.heroBadge}>
            <Ionicons name="layers-outline" size={14} color="#c2410c" />
            <Text style={styles.heroBadgeText}>Super Admin · Saved AI output</Text>
          </View>
          <Text style={styles.heroTitle}>AI tool data</Text>
          <Text style={styles.heroDesc}>
            Browse generations from teacher tools. Open each tool to drill down; use Export on a subtopic to
            share that slice.
          </Text>

          <View style={styles.statsGrid}>
            <GlassPanel style={styles.statCard} radius={14} tone="medium">
              <View style={[styles.statIcon, { backgroundColor: '#f97316' }]}>
                <Ionicons name="documents-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.statLabel}>Total generations</Text>
              <Text style={styles.statHint}>Each run may include many questions or sections.</Text>
              {loading ? (
                <ActivityIndicator color="#f97316" style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.statValue}>{metaTotal ?? '—'}</Text>
              )}
            </GlassPanel>

            <GlassPanel style={styles.statCard} radius={14} tone="medium">
              <View style={[styles.statIcon, { backgroundColor: '#1e293b' }]}>
                <Ionicons name="construct-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.statLabel}>Tools with data</Text>
              <Text style={styles.statHint}>Distinct teacher tools with saved generations</Text>
              {loading ? (
                <ActivityIndicator color="#f97316" style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.statValue}>{sortedTools.length}</Text>
              )}
            </GlassPanel>

            <GlassPanel style={styles.statCard} radius={14} tone="medium">
              <View style={[styles.statIcon, { backgroundColor: '#4f46e5' }]}>
                <Ionicons name="book-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.statLabel}>Topics covered</Text>
              <Text style={styles.statHint}>Distinct topic names across all saved generations</Text>
              {loading ? (
                <ActivityIndicator color="#f97316" style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.statValue}>{metaTopicsCount ?? '—'}</Text>
              )}
            </GlassPanel>
          </View>

          <View style={styles.browsePath}>
            <Text style={styles.browsePathLabel}>Browse path</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.browseSteps}>
                {BROWSE_STEPS.map((step, i) => (
                  <View key={step} style={styles.browseStepRow}>
                    {i > 0 ? <Ionicons name="chevron-forward" size={12} color="#5B6779" /> : null}
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{step}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </GlassPanel>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>By tool</Text>
          <Text style={styles.sectionSubtitle}>
            Records Board: <Text style={styles.sectionSubtitleBold}>{board || 'All Boards'}</Text>
          </Text>
        </View>
        {/* Padding moved to the inner Pressable so the tap target stays the full button. */}
        <GlassPanel style={styles.boardBtn} radius={10} tone="medium">
          <Pressable style={styles.boardBtnInner} onPress={() => setBoardPickerOpen(true)}>
            <View style={styles.boardBtnTextWrap}>
              <Text style={styles.boardBtnText} numberOfLines={1}>
                {board || 'All boards'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color="#475569" />
          </Pressable>
        </GlassPanel>
      </View>

      <GlassPanel style={styles.toolsCard} radius={14} tone="medium">
        <View style={styles.toolsCardInner}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.mutedText}>Loading hierarchy…</Text>
            </View>
          ) : null}

          {!loading && error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!loading && !error && sortedTools.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="layers-outline" size={40} color="#5B6779" />
              <Text style={styles.emptyTitle}>No saved generations yet</Text>
              <Text style={styles.emptyDesc}>
                When teachers generate content from AI tools, new runs are stored here automatically.
              </Text>
            </View>
          ) : null}

          {!loading &&
            !error &&
            sortedTools.map((t) => (
              <ToolSection
                key={t.value}
                tool={t}
                displayName={TOOL_LABELS[t.value]}
                board={board}
              />
            ))}
        </View>
      </GlassPanel>

      <BoardPicker
        visible={boardPickerOpen}
        boards={boards}
        current={board}
        onSelect={setBoard}
        onClose={() => setBoardPickerOpen(false)}
      />

      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  hero: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  heroInner: { padding: 16 },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#f97316',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,247,237,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 12,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: '#9a3412' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  heroDesc: { fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 20 },
  statsGrid: { gap: 12, marginTop: 16 },
  statCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statHint: { fontSize: 11, color: '#5B6779', marginTop: 4, lineHeight: 16 },
  statValue: { fontSize: 32, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  browsePath: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  browsePathLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5B6779',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  browseSteps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  browseStepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBadgeText: { fontSize: 11, color: '#334155' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sectionSubtitleBold: { fontWeight: '600', color: '#334155' },
  boardBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    maxWidth: 140,
  },
  boardBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boardBtnTextWrap: { flex: 1, minWidth: 0 },
  boardBtnText: { fontSize: 13, color: '#334155' },
  toolsCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  toolsCardInner: { gap: 12 },
  centerBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  mutedText: { fontSize: 13, color: '#64748b' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#991b1b', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  toolCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    overflow: 'hidden',
  },
  toolTrigger: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  toolTriggerBody: { flex: 1, minWidth: 0, gap: 6 },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  toolId: { fontSize: 10, color: '#64748b', fontFamily: 'monospace' },
  toolHint: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  savedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffedd5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savedBadgeText: { fontSize: 11, fontWeight: '600', color: '#9a3412' },
  rowIcon: { marginTop: 2 },
  rowChevron: { marginTop: 2 },
  toolBody: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  classSection: { gap: 8 },
  classSectionTrigger: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  classSectionTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  classSectionTitleWrap: { flex: 1, minWidth: 0 },
  classSectionTitle: { fontSize: 13, fontWeight: '600', color: '#334155' },
  classSectionBody: { gap: 10, marginTop: 8 },
  classBlock: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
  },
  classTrigger: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  classBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  classTitleWrap: { flex: 1, minWidth: 0 },
  classTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  classBody: { borderTopWidth: 1, borderTopColor: '#ffedd5', padding: 8, gap: 8, backgroundColor: '#fffaf5' },
  subjectCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  subjectTrigger: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10 },
  subjectTitleWrap: { flex: 1, minWidth: 0, gap: 4 },
  subjectTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', lineHeight: 18 },
  levelBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelBadgeText: { fontSize: 9, color: '#64748b' },
  subjectBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 8, gap: 8, backgroundColor: '#f8fafc' },
  topicCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  topicTrigger: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10 },
  topicTitleWrap: { flex: 1, minWidth: 0, gap: 4 },
  topicTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', lineHeight: 18 },
  topicBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 8, gap: 8 },
  subtopicLeaf: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  subtopicLeafTrigger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 10,
    gap: 8,
  },
  subtopicLeafLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6, minWidth: 0 },
  subtopicLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  subtopicValueWrap: { flex: 1, minWidth: 0 },
  subtopicValue: { fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 18 },
  subtopicLeafRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  countPill: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  subtopicLeafBody: { borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 8 },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  recordsCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  recordsHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordsTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  recordsSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  recordsBody: { padding: 12, gap: 10 },
  emptyRecords: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  recordItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  recordMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  recordDate: { fontSize: 11, color: '#64748b' },
  boardBadge: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  boardBadgeText: { fontSize: 10, color: '#475569' },
  recordActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  actionBtnOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,247,237,0.55)',
  },
  actionBtnOrangeText: { fontSize: 11, fontWeight: '600', color: '#c2410c' },
  actionBtnBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  actionBtnBlueText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  actionBtnRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  actionBtnRedText: { fontSize: 11, fontWeight: '600', color: '#b91c1c' },
  recordPreview: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#fed7aa',
    paddingLeft: 10,
  },
  mcqCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  // The same card is reused inside a native Modal, where the app background —
  // and therefore the glass blur — does not render. Keep that copy opaque.
  mcqCardOpaque: { backgroundColor: '#FFFFFF' },
  mcqHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  mcqQuestionWrap: { flex: 1, minWidth: 0 },
  mcqQuestion: { fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  mcqOption: { fontSize: 12, color: '#334155', marginTop: 6, lineHeight: 18 },
  mcqAnswer: {
    fontSize: 11,
    color: '#047857',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
  },
  mcqExplanation: {
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  pageBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  pageBtnInner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  pageInfo: { fontSize: 12, color: '#64748b' },
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
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemActive: { backgroundColor: 'rgba(255,247,237,0.55)' },
  pickerItemText: { fontSize: 15, color: '#334155' },
  pickerClose: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  pickerCloseText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
});
