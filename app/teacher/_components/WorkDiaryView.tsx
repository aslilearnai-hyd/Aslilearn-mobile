import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { sectionDisplayLabel } from '../../../src/lib/students-ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

const DIARY_FETCH_LIMIT = 60;
const CONTENT_PREVIEW_LENGTH = 120;

type DiaryMode = 'add' | 'history';

function formatClassLabel(c: any): string {
  if (c.classNumber) {
    const sec = c.section?.trim();
    return sec ? `Class ${c.classNumber} - ${sec}` : `Class ${c.classNumber}`;
  }
  return c.name || c.className || 'Class';
}

function entryClassLabel(entry: any): string {
  const meta = entryClassMeta(entry);
  if (meta.section) return `Class ${meta.classNumber} - ${meta.section}`;
  return `Class ${meta.classNumber}`;
}

function entryClassMeta(entry: any): { classNumber: string; section: string } {
  const ref = entry.classId;
  let classNumber = String(entry.classNumber || '').trim();
  let section = String(entry.section || '').trim();
  if (ref && typeof ref === 'object') {
    classNumber = classNumber || String(ref.classNumber || '').trim();
    section = section || String(ref.section || '').trim();
  }
  const display = String(entry.classDisplay || '').trim();
  if (display) {
    const withSection = display.match(/Class\s+(\d+)\s*[-–]\s*([A-Za-z0-9]+)/i);
    if (withSection) {
      classNumber = classNumber || withSection[1];
      section = section || withSection[2];
    } else {
      const classOnly = display.match(/Class\s+(\d+)/i);
      if (classOnly) classNumber = classNumber || classOnly[1];
    }
  }
  return { classNumber: classNumber || 'Other', section };
}

type DiarySectionGroup = {
  key: string;
  section: string;
  entries: any[];
};

type DiaryClassGroup = {
  classNumber: string;
  sections: DiarySectionGroup[];
  totalEntries: number;
};

function formatEntryDate(entry: any): string {
  const raw = entry.forDate || entry.date;
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(raw);
  }
}

export default function WorkDiaryView() {
  const scrollRef = useRef<ScrollView>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [mode, setMode] = useState<DiaryMode>('add');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<any | null>(null);
  const [expandedClassNumbers, setExpandedClassNumbers] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    classId: '',
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    load();
  }, []);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      if (refresh) {
        await teacherService.invalidateCache(`diary_${DIARY_FETCH_LIMIT}`);
      }
      const [diaryRes, classRes] = await Promise.all([
        teacherService.workDiary(DIARY_FETCH_LIMIT),
        teacherService.classes(),
      ]);
      setEntries(Array.isArray(diaryRes.data) ? diaryRes.data : []);
      const cls = Array.isArray(classRes.data) ? classRes.data : [];
      setClasses(cls);
      if (cls.length === 1 && !form.classId) {
        setForm((f) => ({ ...f, classId: String(cls[0]._id || cls[0].id) }));
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => String(c._id || c.id) === form.classId);

  const diaryClassGroups = useMemo<DiaryClassGroup[]>(() => {
    const classMap = new Map<string, Map<string, any[]>>();
    entries.forEach((entry) => {
      const { classNumber, section } = entryClassMeta(entry);
      const sectionKey = section || 'General';
      if (!classMap.has(classNumber)) classMap.set(classNumber, new Map());
      const sectionMap = classMap.get(classNumber)!;
      if (!sectionMap.has(sectionKey)) sectionMap.set(sectionKey, []);
      sectionMap.get(sectionKey)!.push(entry);
    });

    return Array.from(classMap.entries())
      .sort(([a], [b]) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      })
      .map(([classNumber, sectionMap]) => {
        const sections = Array.from(sectionMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([section, sectionEntries]) => ({
            key: `${classNumber}-${section}`,
            section,
            entries: sectionEntries.sort(
              (a, b) =>
                new Date(b.forDate || b.date || 0).getTime() -
                new Date(a.forDate || a.date || 0).getTime(),
            ),
          }));
        return {
          classNumber,
          sections,
          totalEntries: sections.reduce((sum, s) => sum + s.entries.length, 0),
        };
      });
  }, [entries]);

  useEffect(() => {
    if (mode !== 'history' || diaryClassGroups.length === 0) return;
    setExpandedClassNumbers(new Set(diaryClassGroups.map((g) => g.classNumber)));
    setExpandedSections(
      new Set(diaryClassGroups.flatMap((g) => g.sections.map((s) => s.key))),
    );
  }, [mode, diaryClassGroups]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const submit = async () => {
    if (!form.content.trim() || !form.classId) {
      Alert.alert('Required', "Select a class and enter today's work.");
      return;
    }
    setSaving(true);
    try {
      const res = await teacherService.createDiaryEntry({
        date: form.date,
        classId: form.classId,
        title: form.title.trim() || undefined,
        content: form.content.trim(),
      });
      const savedId = String(res?.data?._id || res?.data?.id || '');
      setForm({
        classId: form.classId,
        title: '',
        content: '',
        date: new Date().toISOString().slice(0, 10),
      });
      await load(true);
      setMode('history');
      if (savedId) {
        setHighlightId(savedId);
        if (selectedClass) {
          const cn = String(selectedClass.classNumber || '');
          const sec = String(selectedClass.section || '').trim() || 'General';
          setExpandedClassNumbers((prev) => new Set(prev).add(cn));
          setExpandedSections((prev) => new Set(prev).add(`${cn}-${sec}`));
        }
      }
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Could not save diary entry.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    Alert.alert('Delete', 'Remove this diary entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await teacherService.deleteDiaryEntry(id);
            await teacherService.invalidateCache(`diary_${DIARY_FETCH_LIMIT}`);
            setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
            if (detailEntry && (detailEntry._id || detailEntry.id) === id) {
              setDetailEntry(null);
            }
          } catch {
            Alert.alert('Error', 'Could not delete entry.');
          }
        },
      },
    ]);
  };

  const toggleClassNumber = (classNumber: string) => {
    setExpandedClassNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(classNumber)) next.delete(classNumber);
      else next.add(classNumber);
      return next;
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  const renderEntryCard = (entry: any) => {
    const id = String(entry._id || entry.id);
    const highlighted = highlightId === id;
    const preview =
      entry.content?.length > CONTENT_PREVIEW_LENGTH
        ? `${entry.content.slice(0, CONTENT_PREVIEW_LENGTH).trim()}…`
        : entry.content;

    return (
      <Pressable key={id} onPress={() => setDetailEntry(entry)}>
        <GlassPanel
          style={[styles.entry, highlighted && styles.entryHighlighted]}
          radius={TEACHER_RADIUS.md}
          tone="strong"
        >
        <View style={styles.entryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.entryDate}>{formatEntryDate(entry)}</Text>
          </View>
          <Pressable onPress={() => remove(id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={TEACHER.danger} />
          </Pressable>
        </View>
        {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
        <Text style={styles.entryContent} numberOfLines={4}>
          {preview}
        </Text>
        <View style={styles.readMoreRow}>
          <Text style={styles.readMoreText}>Tap To Read Full Entry</Text>
          <Ionicons name="chevron-forward" size={14} color={TEACHER.primaryLight} />
        </View>
        </GlassPanel>
      </Pressable>
    );
  };

  const renderHistory = () => (
    <>
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color={TEACHER.primary} />
        <Text style={styles.infoText}>
          Showing your latest {DIARY_FETCH_LIMIT} entries. Entries are kept until you delete them —
          you can remove any entry at any time.
        </Text>
      </View>

      <Text style={styles.recentTitle}>Past Entries By Class</Text>
      {entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No diary entries yet. Switch to &quot;Add entry&quot; to log today&apos;s work.
          </Text>
        </View>
      ) : (
        <GlassPanel style={styles.classListCard} radius={TEACHER_RADIUS.lg} tone="light">
          {diaryClassGroups.map((group) => {
            const classExpanded = expandedClassNumbers.has(group.classNumber);
            return (
              <View key={group.classNumber}>
                <Pressable
                  style={[styles.classRow, classExpanded && styles.classRowActive]}
                  onPress={() => toggleClassNumber(group.classNumber)}
                >
                  <Ionicons
                    name={classExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={18}
                    color={TEACHER.primary}
                  />
                  <View style={styles.classRowLabelWrap}>
                    <Text style={styles.classRowLabel}>{group.classNumber}</Text>
                  </View>
                  <Text style={styles.classRowCount}>
                    {group.totalEntries} Entr{group.totalEntries === 1 ? 'y' : 'ies'}
                  </Text>
                </Pressable>

                {classExpanded ? (
                  <View style={styles.classBody}>
                    {group.sections.map((section) => {
                      const sectionExpanded = expandedSections.has(section.key);
                      return (
                        <GlassPanel
                          key={section.key}
                          style={styles.sectionBlock}
                          radius={TEACHER_RADIUS.md}
                          tone="light"
                        >
                          <Pressable
                            style={[styles.sectionRow, sectionExpanded && styles.sectionRowActive]}
                            onPress={() => toggleSection(section.key)}
                          >
                            <Ionicons
                              name={sectionExpanded ? 'chevron-down' : 'chevron-forward'}
                              size={16}
                              color={TEACHER.primaryLight}
                            />
                            <View style={styles.sectionRowLabelWrap}>
                              <Text style={styles.sectionRowLabel}>
                                {sectionDisplayLabel(
                                  section.section === 'General' ? '' : section.section,
                                )}
                              </Text>
                            </View>
                            <Text style={styles.sectionRowCount}>
                              {section.entries.length} Entr
                              {section.entries.length === 1 ? 'y' : 'ies'}
                            </Text>
                          </Pressable>
                          {sectionExpanded ? (
                            <View style={styles.sectionBody}>
                              {section.entries.map((entry) => renderEntryCard(entry))}
                            </View>
                          ) : null}
                        </GlassPanel>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </GlassPanel>
      )}
    </>
  );

  const renderAddForm = () => (
    <GlassPanel style={styles.panel} radius={TEACHER_RADIUS.xl} tone="medium">
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="bookmark" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>New Diary Entry</Text>
          <Text style={styles.headerSub}>
            Log what you covered — visible to your students and school admin.
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Class & Section</Text>
      {classes.length === 0 ? (
        <Text style={styles.warnBox}>No classes assigned yet. Contact your administrator.</Text>
      ) : (
        <Pressable style={styles.selectTrigger} onPress={() => setClassPickerOpen(true)}>
          <Text style={selectedClass ? styles.selectValue : styles.selectPlaceholder}>
            {selectedClass ? formatClassLabel(selectedClass) : 'Select Class And Section'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={TEACHER.textMuted} />
        </Pressable>
      )}

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={form.date}
        onChangeText={(t) => setForm((f) => ({ ...f, date: t }))}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={TEACHER.textMuted}
        cursorColor={TEACHER.primary}
        selectionColor={TEACHER.primaryLight}
        caretHidden={false}
      />

      <Text style={styles.label}>Title (Optional)</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
        placeholder="E.g. Algebra — Quadratic Equations"
        placeholderTextColor={TEACHER.textMuted}
        cursorColor={TEACHER.primary}
        selectionColor={TEACHER.primaryLight}
        caretHidden={false}
      />

      <Text style={styles.label}>Today&apos;s Work</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.content}
        onChangeText={(t) => setForm((f) => ({ ...f, content: t }))}
        placeholder="Topics taught, activities, homework given, notes for parents..."
        placeholderTextColor={TEACHER.textMuted}
        multiline
        numberOfLines={5}
        cursorColor={TEACHER.primary}
        selectionColor={TEACHER.primaryLight}
        caretHidden={false}
        textAlignVertical="top"
      />

      <Pressable onPress={submit} disabled={saving || !form.classId}>
        <LinearGradient
          colors={[TEACHER.primary, TEACHER.primaryDark]}
          style={[styles.saveBtn, (!form.classId || saving) && { opacity: 0.5 }]}
        >
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Entry'}</Text>
        </LinearGradient>
      </Pressable>
    </GlassPanel>
  );

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, mode === 'add' && styles.modeChipActive]}
          onPress={() => setMode('add')}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={mode === 'add' ? TEACHER.textOnPrimary : TEACHER.primaryLight}
          />
          <Text style={[styles.modeChipText, mode === 'add' && styles.modeChipTextActive]}>
            Add Entry
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'history' && styles.modeChipActive]}
          onPress={() => setMode('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={mode === 'history' ? TEACHER.textOnPrimary : TEACHER.primaryLight}
          />
          <Text style={[styles.modeChipText, mode === 'history' && styles.modeChipTextActive]}>
            Past Entries ({entries.length})
          </Text>
        </Pressable>
      </View>

      {mode === 'add' ? renderAddForm() : renderHistory()}

      <Modal visible={classPickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setClassPickerOpen(false)}>
          {/* radius={0} so only the sheet's own top corners round. */}
          <GlassPanel style={styles.pickerSheet} radius={0} tone="strong">
            <Text style={styles.pickerTitle}>Select Class And Section</Text>
            {classes.map((c) => {
              const id = String(c._id || c.id);
              const selected = form.classId === id;
              return (
                <Pressable
                  key={id}
                  style={[styles.pickerItem, selected && styles.pickerItemActive]}
                  onPress={() => {
                    setForm((f) => ({ ...f, classId: id }));
                    setClassPickerOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, selected && styles.pickerItemTextActive]}>
                    {formatClassLabel(c)}
                  </Text>
                </Pressable>
              );
            })}
          </GlassPanel>
        </Pressable>
      </Modal>

      <Modal visible={!!detailEntry} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <GlassPanel style={styles.detailCard} radius={0} tone="strong">
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailDate}>{detailEntry ? formatEntryDate(detailEntry) : ''}</Text>
                <Text style={styles.detailClass}>
                  {detailEntry ? entryClassLabel(detailEntry) : ''}
                </Text>
              </View>
              <Pressable onPress={() => setDetailEntry(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={TEACHER.text} />
              </Pressable>
            </View>
            {detailEntry?.title ? (
              <Text style={styles.detailTitle}>{detailEntry.title}</Text>
            ) : null}
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailContent}>{detailEntry?.content}</Text>
            </ScrollView>
            <Pressable
              style={styles.detailDeleteBtn}
              onPress={() => detailEntry && remove(String(detailEntry._id || detailEntry.id))}
            >
              <Ionicons name="trash-outline" size={16} color={TEACHER.danger} />
              <Text style={styles.detailDeleteText}>Delete Entry</Text>
            </Pressable>
          </GlassPanel>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: TEACHER_RADIUS.pill,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
  },
  modeChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  modeChipText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  modeChipTextActive: { color: TEACHER.textOnPrimary },
  // GlassPanel supplies the frosted fill on these former opaque cards.
  panel: { ...glassCard, backgroundColor: 'transparent', borderRadius: TEACHER_RADIUS.xl, padding: 16 },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  headerSub: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700', color: TEACHER.text, marginBottom: 6, marginTop: 10 },
  warnBox: {
    borderWidth: 1,
    borderColor: TEACHER.warning,
    backgroundColor: 'rgba(255,184,48,0.12)',
    borderRadius: TEACHER_RADIUS.md,
    padding: 12,
    fontSize: 13,
    color: TEACHER.warning,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    padding: 14,
    backgroundColor: TEACHER.surfaceElevated,
  },
  selectValue: { fontSize: 15, color: TEACHER.text, fontWeight: '600' },
  selectPlaceholder: { fontSize: 15, color: TEACHER.textMuted },
  input: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    padding: 14,
    color: TEACHER.text,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: TEACHER_RADIUS.md,
    marginTop: 16,
  },
  saveBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700', fontSize: 15 },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: TEACHER_RADIUS.md,
    backgroundColor: TEACHER.navActiveBg,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  infoText: { flex: 1, fontSize: 12, color: TEACHER.textSecondary, lineHeight: 18 },
  recentTitle: { ...TEACHER_TYPO.label, color: TEACHER.textMuted, marginTop: 4 },
  emptyBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.lg,
    padding: 20,
    backgroundColor: 'rgba(123,80,255,0.07)',
  },
  emptyText: { fontSize: 13, color: TEACHER.textMuted, textAlign: 'center', lineHeight: 20 },
  entry: {
    borderRadius: TEACHER_RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  entryHighlighted: {
    borderColor: TEACHER.primary,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  classListCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    overflow: 'hidden',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  classRowActive: { backgroundColor: TEACHER.navActiveBg },
  classRowLabelWrap: { flex: 1, minWidth: 0 },
  classRowLabel: { fontSize: 18, fontWeight: '800', color: TEACHER.text },
  classRowCount: { fontSize: 13, color: TEACHER.textMuted },
  classBody: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(99,102,241,0.04)',
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  sectionBlock: {
    marginTop: 6,
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionRowActive: { backgroundColor: TEACHER.navActiveBg },
  sectionRowLabelWrap: { flex: 1, minWidth: 0 },
  sectionRowLabel: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  sectionRowCount: { fontSize: 12, color: TEACHER.textMuted },
  sectionBody: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
    backgroundColor: 'rgba(99,102,241,0.03)',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  entryDate: { fontSize: 13, fontWeight: '700', color: TEACHER.primaryLight },
  entryTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text, marginBottom: 6 },
  entryContent: { fontSize: 14, color: TEACHER.textMuted, lineHeight: 20 },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  readMoreText: { fontSize: 11, fontWeight: '600', color: TEACHER.primaryLight },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  pickerTitle: { ...TEACHER_TYPO.section, fontSize: 16, marginBottom: 12, color: TEACHER.text },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: TEACHER.surfaceBorder },
  pickerItemActive: { backgroundColor: TEACHER.navActiveBg },
  pickerItemText: { fontSize: 15, color: TEACHER.textSecondary },
  pickerItemTextActive: { fontWeight: '700', color: TEACHER.primaryLight },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  detailDate: { fontSize: 14, fontWeight: '700', color: TEACHER.primaryLight },
  detailClass: { fontSize: 12, color: TEACHER.textMuted, marginTop: 2 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: TEACHER.text, marginBottom: 12 },
  detailScroll: { maxHeight: 360 },
  detailContent: { fontSize: 15, color: TEACHER.text, lineHeight: 24 },
  detailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    padding: 12,
  },
  detailDeleteText: { fontSize: 14, fontWeight: '600', color: TEACHER.danger },
});
