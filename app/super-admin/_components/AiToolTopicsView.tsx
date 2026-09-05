import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import {
  type TopicFormState,
  type TopicRow,
  bulkDeleteTopics,
  buildDisplayTopicName,
  classNumberFromLabel,
  createTopic,
  deleteTopic,
  emptyTopicForm,
  fetchTopicBoards,
  fetchTopicHierarchy,
  fetchTopicOptions,
  fetchTopicRows,
  filterVisibleRows,
  type TopicHierarchyTree,
  normalizeClassLabel,
  sortNatural,
  topicFormFromRow,
  updateTopic,
} from '../../../src/lib/ai-tool-topics';
import { sortChapterWiseLabels } from '../../../src/lib/curriculum-chapter-sort';

type TopicOptionsData = {
  boards?: string[];
  classes?: string[];
  subjects?: string[];
  topics?: string[];
  subTopics?: string[];
};

const EMPTY_TOPIC_OPTIONS: TopicOptionsData = {};

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

type HierarchyColumnProps = {
  title: string;
  items: string[];
  selected: string;
  disabled: boolean;
  onSelect: (item: string) => void;
};

function HierarchyColumn({ title, items, selected, disabled, onSelect }: HierarchyColumnProps) {
  return (
    <View style={styles.hierarchyColumn}>
      <Text style={styles.hierarchyTitle}>{title}</Text>
      <ScrollView style={styles.hierarchyList} nestedScrollEnabled>
        {items.length === 0 ? (
          <Text style={styles.hierarchyEmpty}>
            {disabled ? 'Select previous level' : `No ${title.toLowerCase()} found`}
          </Text>
        ) : (
          items.map((item) => {
            const isActive = selected === item;
            return (
              <Pressable
                key={item}
                style={[styles.hierarchyItem, isActive && styles.hierarchyItemActive]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.hierarchyItemText, isActive && styles.hierarchyItemTextActive]} numberOfLines={2}>
                  {item}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export default function AiToolTopicsView() {
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubTopic, setSelectedSubTopic] = useState('');
  const [availableBoards, setAvailableBoards] = useState<string[]>([]);
  const [hierarchyTree, setHierarchyTree] = useState<TopicHierarchyTree | null>(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicFormState>(emptyTopicForm());
  const [submitting, setSubmitting] = useState(false);
  const [isCustomBoard, setIsCustomBoard] = useState(false);
  const [customBoard, setCustomBoard] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClass, setCustomClass] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [dialogClassOptions, setDialogClassOptions] = useState<string[]>([]);
  const [dialogSubjectOptions, setDialogSubjectOptions] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState<'class' | 'subject' | null>(null);

  const [boardPickerOpen, setBoardPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const fetchRows = useCallback(async () => {
    if (!selectedTopic && !search.trim()) {
      setRows([]);
      setTotal(0);
      return;
    }
    setIsLoadingRows(true);
    setError('');
    try {
      const result = await fetchTopicRows({
        search,
        board: selectedBoard,
        classLabel: selectedClass,
        subject: selectedSubject,
        topicName: selectedTopic,
        subTopic: selectedSubTopic,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load AI tool topics.');
      setRows([]);
      setTotal(0);
    } finally {
      setIsLoadingRows(false);
    }
  }, [search, selectedBoard, selectedClass, selectedSubject, selectedTopic, selectedSubTopic]);

  const loadBoards = useCallback(async () => {
    try {
      const boards = await fetchTopicBoards();
      setAvailableBoards(sortNatural(boards));
    } catch {
      setAvailableBoards([]);
    }
  }, []);

  const loadBoardHierarchy = useCallback(async (board: string) => {
    if (!board) {
      setHierarchyTree(null);
      return;
    }
    setLoadingHierarchy(true);
    try {
      const tree = await fetchTopicHierarchy(board);
      setHierarchyTree(tree);
    } catch {
      setHierarchyTree(null);
    } finally {
      setLoadingHierarchy(false);
    }
  }, []);

  const hierarchyClasses = useMemo(
    () => (hierarchyTree ? sortNatural(Object.keys(hierarchyTree)) : []),
    [hierarchyTree],
  );

  const hierarchySubjects = useMemo(() => {
    if (!hierarchyTree || !selectedClass) return [];
    return sortNatural(Object.keys(hierarchyTree[selectedClass] || {}));
  }, [hierarchyTree, selectedClass]);

  const hierarchyTopics = useMemo(() => {
    if (!hierarchyTree || !selectedClass || !selectedSubject) return [];
    return sortChapterWiseLabels(
      Object.keys(hierarchyTree[selectedClass]?.[selectedSubject] || {}),
    );
  }, [hierarchyTree, selectedClass, selectedSubject]);

  const hierarchySubTopics = useMemo(() => {
    if (!hierarchyTree || !selectedClass || !selectedSubject || !selectedTopic) return [];
    return sortNatural(
      hierarchyTree[selectedClass]?.[selectedSubject]?.[selectedTopic] || [],
    );
  }, [hierarchyTree, selectedClass, selectedSubject, selectedTopic]);

  const fetchDialogOptions = useCallback(async (boardValue: string, classLabelValue: string) => {
    try {
      const [classesData, subjectsData] = await Promise.all([
        boardValue ? fetchTopicOptions({ board: boardValue }) : Promise.resolve(EMPTY_TOPIC_OPTIONS),
        boardValue && classLabelValue
          ? fetchTopicOptions({ board: boardValue, classLabel: classLabelValue })
          : Promise.resolve(EMPTY_TOPIC_OPTIONS),
      ]);
      setDialogClassOptions(sortNatural(classesData.classes || []));
      setDialogSubjectOptions(sortNatural(subjectsData.subjects || []));
    } catch {
      setDialogClassOptions([]);
      setDialogSubjectOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    loadBoardHierarchy(selectedBoard);
  }, [selectedBoard, loadBoardHierarchy]);

  useEffect(() => {
    if (!isDialogOpen) return;
    fetchDialogOptions(form.board, form.classLabel);
  }, [isDialogOpen, form.board, form.classLabel, fetchDialogOptions]);

  const visibleRows = useMemo(() => filterVisibleRows(rows, selectedTopic), [rows, selectedTopic]);

  const refreshHierarchy = useCallback(async () => {
    await Promise.all([loadBoards(), loadBoardHierarchy(selectedBoard)]);
  }, [loadBoards, loadBoardHierarchy, selectedBoard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRows(), refreshHierarchy()]);
    setRefreshing(false);
  };

  const resetCustomFields = () => {
    setIsCustomBoard(false);
    setCustomBoard('');
    setIsCustomClass(false);
    setCustomClass('');
    setIsCustomSubject(false);
    setCustomSubject('');
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyTopicForm());
    resetCustomFields();
    setIsDialogOpen(true);
  };

  const openEdit = (row: TopicRow) => {
    setEditingId(row._id);
    setForm(topicFormFromRow(row));
    resetCustomFields();
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!form.board || !form.classLabel || !form.subject || !form.topicName || !form.subTopic) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateTopic(editingId, form);
      } else {
        await createTopic(form);
      }
      setIsDialogOpen(false);
      setForm(emptyTopicForm());
      resetCustomFields();
      setEditingId(null);
      await Promise.all([fetchRows(), refreshHierarchy()]);
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.response?.data?.message || 'Failed to save topic.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Delete topic', 'Delete this topic/sub topic mapping?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTopic(id);
            await Promise.all([fetchRows(), refreshHierarchy()]);
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage || 'Failed to delete topic.');
          }
        },
      },
    ]);
  };

  const bulkDelete = (scope: 'class' | 'subject') => {
    if (!selectedBoard) {
      Alert.alert('Validation', 'Please select a board first.');
      return;
    }
    if (scope === 'class' && !selectedClass) {
      Alert.alert('Validation', 'Please select a class to delete.');
      return;
    }
    if (scope === 'subject' && (!selectedClass || !selectedSubject)) {
      Alert.alert('Validation', 'Please select board, class, and subject to delete subject mappings.');
      return;
    }

    const confirmMessage =
      scope === 'class'
        ? `Delete all AI Tool Topic mappings for ${selectedBoard} / ${selectedClass}?`
        : `Delete all AI Tool Topic mappings for ${selectedBoard} / ${selectedClass} / ${selectedSubject}?`;

    Alert.alert('Confirm bulk delete', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBulkDeleting(scope);
          try {
            const payload: { board: string; classLabel?: string; subject?: string } = {
              board: selectedBoard,
            };
            if (selectedClass) payload.classLabel = selectedClass;
            if (scope === 'subject' && selectedSubject) payload.subject = selectedSubject;
            const json = await bulkDeleteTopics(payload);
            if (json?.success === false) {
              throw new Error(json?.message || 'Failed to bulk delete');
            }
            const count = Number(json?.data?.modifiedCount || 0);
            Alert.alert('Deleted', `Deleted ${count} topic mappings.`);
            setSelectedTopic('');
            setSelectedSubTopic('');
            await Promise.all([fetchRows(), refreshHierarchy()]);
          } catch (err: any) {
            Alert.alert('Error', err?.message || err?.friendlyMessage || 'Failed to bulk delete.');
          } finally {
            setBulkDeleting(null);
          }
        },
      },
    ]);
  };

  const boardPickerOptions = useMemo(
    () => [
      ...availableBoards.map((b) => ({ value: b, label: b })),
      { value: '__custom__', label: '+ New Board' },
    ],
    [availableBoards],
  );

  const classPickerOptions = useMemo(
    () => [
      ...dialogClassOptions.map((c) => ({
        value: classNumberFromLabel(c),
        label: c,
      })),
      { value: '__custom__', label: '+ New Class' },
    ],
    [dialogClassOptions],
  );

  const subjectPickerOptions = useMemo(
    () => [
      ...dialogSubjectOptions.map((s) => ({ value: s, label: s })),
      { value: '__custom__', label: '+ New Subject' },
    ],
    [dialogSubjectOptions],
  );

  const formBoardLabel = isCustomBoard ? customBoard || 'Enter board' : form.board || 'Select board';
  const formClassLabel = isCustomClass
    ? customClass
      ? normalizeClassLabel(customClass)
      : 'Enter class number'
    : form.classLabel || 'Select class';
  const formSubjectLabel = isCustomSubject ? customSubject || 'Enter subject' : form.subject || 'Select subject';

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Tool Topics Management</Text>
        <Text style={styles.headerSubtitle}>
          Manage Board → Class → Subject → Topic → Sub Topic hierarchy for AI tools.
        </Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#5B6779" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search label / topic / sub topic"
            placeholderTextColor="#5B6779"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Topic</Text>
        </Pressable>
      </View>

      <View style={styles.hierarchyPanel}>
        {loadingHierarchy ? (
          <View style={styles.hierarchyLoading}>
            <ActivityIndicator size="small" color="#f97316" />
            <Text style={styles.hierarchyLoadingText}>Loading hierarchy…</Text>
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardTabs}>
          {availableBoards.map((board) => {
            const isActive = selectedBoard === board;
            return (
              <Pressable
                key={board}
                style={[styles.boardTab, isActive && styles.boardTabActive]}
                onPress={() => {
                  if (selectedBoard === board) return;
                  setSelectedBoard(board);
                  setSelectedClass('');
                  setSelectedSubject('');
                  setSelectedTopic('');
                  setSelectedSubTopic('');
                }}
              >
                <Text style={[styles.boardTabText, isActive && styles.boardTabTextActive]}>{board}</Text>
              </Pressable>
            );
          })}
          {availableBoards.length === 0 ? (
            <Text style={styles.hierarchyEmpty}>No boards found — add a topic to create one.</Text>
          ) : null}
        </ScrollView>

        <HierarchyColumn
          title="Classes"
          items={hierarchyClasses}
          selected={selectedClass}
          disabled={!selectedBoard}
          onSelect={(item) => {
            setSelectedClass(item);
            setSelectedSubject('');
            setSelectedTopic('');
            setSelectedSubTopic('');
          }}
        />
        <HierarchyColumn
          title="Subjects"
          items={hierarchySubjects}
          selected={selectedSubject}
          disabled={!selectedClass}
          onSelect={(item) => {
            setSelectedSubject(item);
            setSelectedTopic('');
            setSelectedSubTopic('');
          }}
        />
        <HierarchyColumn
          title="Topics"
          items={hierarchyTopics}
          selected={selectedTopic}
          disabled={!selectedSubject}
          onSelect={(item) => {
            setSelectedTopic(item);
            setSelectedSubTopic('');
          }}
        />
        <HierarchyColumn
          title="Sub Topics"
          items={hierarchySubTopics}
          selected={selectedSubTopic}
          disabled={!selectedTopic}
          onSelect={setSelectedSubTopic}
        />

        <View style={styles.bulkActions}>
          <Pressable
            style={[styles.bulkBtnClass, (!selectedBoard || !selectedClass || bulkDeleting) && styles.bulkBtnDisabled]}
            disabled={!selectedBoard || !selectedClass || bulkDeleting !== null}
            onPress={() => bulkDelete('class')}
          >
            <Ionicons name="trash-outline" size={14} color="#b45309" />
            <Text style={styles.bulkBtnClassText}>
              {bulkDeleting === 'class' ? 'Deleting Class…' : 'Delete Selected Class'}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.bulkBtnSubject,
              (!selectedBoard || !selectedClass || !selectedSubject || bulkDeleting) && styles.bulkBtnDisabled,
            ]}
            disabled={!selectedBoard || !selectedClass || !selectedSubject || bulkDeleting !== null}
            onPress={() => bulkDelete('subject')}
          >
            <Ionicons name="trash-outline" size={14} color="#b91c1c" />
            <Text style={styles.bulkBtnSubjectText}>
              {bulkDeleting === 'subject' ? 'Deleting Subject…' : 'Delete Selected Subject'}
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <View style={styles.tableHeaderCell}>
            <Text style={styles.tableHeaderCellText}>Board</Text>
          </View>
          <View style={styles.tableHeaderCell}>
            <Text style={styles.tableHeaderCellText}>Class</Text>
          </View>
          <View style={[styles.tableHeaderCell, { flex: 1.2 }]}>
            <Text style={styles.tableHeaderCellText}>Subject</Text>
          </View>
        </View>
        <View style={styles.tableHeader}>
          <View style={[styles.tableHeaderCell, { flex: 1.4 }]}>
            <Text style={styles.tableHeaderCellText}>Topic Name</Text>
          </View>
          <View style={[styles.tableHeaderCell, { flex: 1.2 }]}>
            <Text style={styles.tableHeaderCellText}>Sub Topic</Text>
          </View>
          <View style={[styles.tableHeaderCell, { width: 72 }]}>
            <Text style={styles.tableHeaderCellText}>Actions</Text>
          </View>
        </View>

        {isLoadingRows ? (
          <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 24 }} />
        ) : !selectedTopic && !search.trim() ? (
          <Text style={styles.tablePlaceholder}>Select a topic above to view its sub topics below.</Text>
        ) : visibleRows.length === 0 ? (
          <Text style={styles.tablePlaceholder}>No AI tool topics found.</Text>
        ) : (
          visibleRows.map((row) => (
            <View key={row._id} style={styles.tableRow}>
              <View style={styles.rowMeta}>
                <Text style={styles.rowChip}>{row.board}</Text>
                <Text style={styles.rowChip}>{row.classLabel}</Text>
                <Text style={styles.rowChip}>{row.subject}</Text>
              </View>
              <Text style={styles.rowTopic}>{buildDisplayTopicName(row.label, row.topicName)}</Text>
              <Text style={styles.rowSubTopic}>{row.subTopic}</Text>
              <View style={styles.rowActions}>
                <Pressable style={styles.iconBtn} onPress={() => openEdit(row)}>
                  <Ionicons name="pencil-outline" size={16} color="#334155" />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => remove(row._id)}>
                  <Ionicons name="trash-outline" size={16} color="#334155" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.totalText}>
        Total records: {selectedTopic || search.trim() ? visibleRows.length : 0}
        {total > visibleRows.length ? ` (${total} matched)` : ''}
      </Text>

      <Modal visible={isDialogOpen} animationType="slide" onRequestClose={() => setIsDialogOpen(false)}>
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>{editingId ? 'Edit AI Tool Topic' : 'Add AI Tool Topic'}</Text>
            <Pressable onPress={() => setIsDialogOpen(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>
          <ScrollView style={styles.dialogBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.dialogDesc}>
              Create hierarchy mapping for Board, Class, Subject, Topic and Sub Topic.
            </Text>

            <Text style={styles.fieldLabel}>Board *</Text>
            <Pressable style={styles.selectField} onPress={() => setBoardPickerOpen(true)}>
              <Text style={styles.selectFieldText}>{formBoardLabel}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </Pressable>
            {isCustomBoard ? (
              <TextInput
                style={styles.input}
                placeholder="Enter board name"
                value={customBoard}
                onChangeText={(value) => {
                  setCustomBoard(value);
                  setForm((p) => ({ ...p, board: value }));
                }}
              />
            ) : null}

            <Text style={styles.fieldLabel}>Class *</Text>
            <Pressable style={styles.selectField} onPress={() => setClassPickerOpen(true)}>
              <Text style={styles.selectFieldText}>{formClassLabel}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </Pressable>
            {isCustomClass ? (
              <TextInput
                style={styles.input}
                placeholder="Enter class number"
                keyboardType="number-pad"
                value={customClass}
                onChangeText={(value) => {
                  const digitsOnly = value.replace(/\D/g, '');
                  setCustomClass(digitsOnly);
                  setForm((p) => ({ ...p, classLabel: normalizeClassLabel(digitsOnly) }));
                }}
              />
            ) : null}

            <Text style={styles.fieldLabel}>Subject *</Text>
            <Pressable style={styles.selectField} onPress={() => setSubjectPickerOpen(true)}>
              <Text style={styles.selectFieldText}>{formSubjectLabel}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </Pressable>
            {isCustomSubject ? (
              <TextInput
                style={styles.input}
                placeholder="Enter subject name"
                value={customSubject}
                onChangeText={(value) => {
                  setCustomSubject(value);
                  setForm((p) => ({ ...p, subject: value }));
                }}
              />
            ) : null}

            <Text style={styles.sectionLabel}>Topic</Text>

            <Text style={styles.fieldLabel}>Label (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chapter 1"
              value={form.label}
              onChangeText={(value) => setForm((p) => ({ ...p, label: value }))}
            />

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter topic name"
              value={form.topicName}
              onChangeText={(value) => setForm((p) => ({ ...p, topicName: value }))}
            />

            <Text style={styles.fieldLabel}>Sub Topic *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter sub topic"
              value={form.subTopic}
              onChangeText={(value) => setForm((p) => ({ ...p, subTopic: value }))}
            />

            <View style={styles.dialogFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setIsDialogOpen(false)} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={save} disabled={submitting}>
                <Text style={styles.saveBtnText}>{submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <OptionPicker
        visible={boardPickerOpen}
        title="Select board"
        options={boardPickerOptions}
        onSelect={(v) => {
          if (v === '__custom__') {
            setIsCustomBoard(true);
            setForm((p) => ({ ...p, board: customBoard || '' }));
          } else {
            setIsCustomBoard(false);
            setCustomBoard('');
            setForm((p) => ({ ...p, board: v }));
          }
        }}
        onClose={() => setBoardPickerOpen(false)}
      />

      <OptionPicker
        visible={classPickerOpen}
        title="Select class"
        options={classPickerOptions}
        onSelect={(v) => {
          if (v === '__custom__') {
            setIsCustomClass(true);
            setForm((p) => ({ ...p, classLabel: customClass || '' }));
          } else {
            setIsCustomClass(false);
            setCustomClass('');
            setForm((p) => ({ ...p, classLabel: normalizeClassLabel(v) }));
          }
        }}
        onClose={() => setClassPickerOpen(false)}
      />

      <OptionPicker
        visible={subjectPickerOpen}
        title="Select subject"
        options={subjectPickerOptions}
        onSelect={(v) => {
          if (v === '__custom__') {
            setIsCustomSubject(true);
            setForm((p) => ({ ...p, subject: customSubject || '' }));
          } else {
            setIsCustomSubject(false);
            setCustomSubject('');
            setForm((p) => ({ ...p, subject: v }));
          }
        }}
        onClose={() => setSubjectPickerOpen(false)}
      />

      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  content: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 20 },
  toolbar: { paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hierarchyPanel: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  hierarchyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  hierarchyLoadingText: { fontSize: 13, color: '#64748b' },
  boardTabs: { flexDirection: 'row', gap: 8, paddingBottom: 12, marginBottom: 4 },
  boardTab: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  boardTabActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  boardTabText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  boardTabTextActive: { color: '#1d4ed8' },
  hierarchyColumn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  hierarchyTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  hierarchyList: { maxHeight: 180 },
  hierarchyEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f8fafc',
  },
  hierarchyItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  hierarchyItemActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  hierarchyItemText: { fontSize: 13, color: '#334155' },
  hierarchyItemTextActive: { color: '#1d4ed8', fontWeight: '600' },
  bulkActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  bulkBtnClass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,251,235,0.55)',
  },
  bulkBtnClassText: { fontSize: 12, fontWeight: '600', color: '#b45309' },
  bulkBtnSubject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
  },
  bulkBtnSubjectText: { fontSize: 12, fontWeight: '600', color: '#b91c1c' },
  bulkBtnDisabled: { opacity: 0.45 },
  errorText: { color: '#dc2626', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  tableSection: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderCell: { flex: 1, padding: 10, minWidth: 0 },
  tableHeaderCellText: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tablePlaceholder: { textAlign: 'center', color: '#64748b', fontSize: 13, padding: 24 },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 12,
    gap: 6,
  },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowChip: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    backgroundColor: 'rgba(255,247,237,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rowTopic: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowSubTopic: { fontSize: 13, color: '#475569' },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  totalText: { fontSize: 12, color: '#64748b', paddingHorizontal: 16, paddingVertical: 12 },
  dialog: { flex: 1, backgroundColor: '#FFFFFF' },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1, paddingRight: 12 },
  dialogBody: { flex: 1, padding: 16 },
  dialogDesc: { fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 10 },
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
  selectFieldText: { fontSize: 14, color: '#0f172a', flex: 1, paddingRight: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  dialogFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, marginBottom: 24 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  saveBtn: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
