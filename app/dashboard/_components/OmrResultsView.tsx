import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import omrService, { type OmrStudentRow, type SubjectScore } from '../../../src/services/api/omrService';
import { exportCsvFile, buildCsvContent } from '../../../src/utils/csvExport';
import {
  STUDENT,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';
import GlassPanel from '../../../src/components/ui/GlassPanel';

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

function subjectMax(s?: SubjectScore): number {
  if (!s) return 20;
  const attempted = (s.r || 0) + (s.w || 0) + (s.l || 0);
  return attempted > 0 ? attempted : 20;
}

function subjectPct(s?: SubjectScore): number {
  const max = subjectMax(s);
  if (!max) return 0;
  return Math.round(((s?.marks || 0) / max) * 100);
}

function formatTestDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const SUBJECT_META = [
  { key: 'Physics', field: 'physics' as const, bar: '#0EA5E9', chipBg: '#F0F9FF', chipText: '#075985' },
  { key: 'Chemistry', field: 'chemistry' as const, bar: '#10B981', chipBg: '#ECFDF5', chipText: '#065F46' },
  { key: 'Mathematics', field: 'maths' as const, bar: '#F97316', chipBg: '#FFF7ED', chipText: '#9A3412' },
  { key: 'Biology', field: 'biology' as const, bar: '#8B5CF6', chipBg: '#F5F3FF', chipText: '#5B21B6' },
];

export default function OmrResultsView() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<OmrStudentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await omrService.getStudentResults();
      const list: OmrStudentRow[] = Array.isArray(data?.history)
        ? data.history
        : data?.latest
          ? [data.latest]
          : [];
      setHistory(list);
      setSelectedId((prev) => {
        if (prev && list.some((h) => h._id === prev)) return prev;
        return list[0]?._id || null;
      });
    } catch (err: any) {
      setError(err?.friendlyMessage || err?.message || 'Failed To Load Offline Results');
      setHistory([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => history.find((h) => h._id === selectedId) || history[0] || null,
    [history, selectedId]
  );

  const selectedIndex = useMemo(
    () => (selected ? history.findIndex((h) => h._id === selected._id) : -1),
    [history, selected]
  );

  const trend = useMemo(() => {
    if (selectedIndex < 0 || selectedIndex >= history.length - 1) return null;
    const prev = history[selectedIndex + 1];
    if (!prev || !selected) return null;
    return Math.round(((selected.percentage || 0) - (prev.percentage || 0)) * 10) / 10;
  }, [history, selected, selectedIndex]);

  const subjects = useMemo(() => {
    if (!selected) return [];
    return SUBJECT_META.map((meta) => ({
      ...meta,
      score: selected[meta.field],
    })).filter((s) => subjectMax(s.score) > 0 || (s.score?.marks || 0) > 0);
  }, [selected]);

  const downloadReport = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const rows: Array<[string, string]> = [
        ['Test', selected.testTitle || ''],
        ['Test No', selected.testNo || ''],
        ['Percentage', String(selected.percentage ?? '')],
        ['Total Marks', String(selected.totalMarks ?? '')],
        ['Rank', String(selected.finalRank ?? selected.testRank ?? '')],
        ...subjects.map(
          (s) => [s.key, `${s.score?.marks || 0}/${subjectMax(s.score)}`] as [string, string]
        ),
      ];
      const csv = buildCsvContent(['Field', 'Value'], rows);
      await exportCsvFile(csv, `omr-result-${selected.testNo || selected._id}.csv`);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could Not Export CSV');
    } finally {
      setExporting(false);
    }
  };

  const rank = selected?.finalRank ?? selected?.testRank;
  const scorePct = Math.min(100, Math.max(0, Number(selected?.percentage) || 0));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={STUDENT.primary} />
        <Text style={styles.muted}>Loading Offline Results…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={STUDENT.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selected) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="scan-outline" size={36} color="#FB923C" />
        </View>
        <Text style={styles.emptyTitle}>No Offline Results Yet</Text>
        <Text style={styles.emptyBody}>
          When your school uploads an OMR score sheet and links your Candidate ID, scores show up
          here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.scrollContent}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Offline Results</Text>
          <Text style={styles.sectionSub}>
            Sheet Scores From Your School
            {history.length ? ` · ${history.length} Test${history.length === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => void downloadReport()}
          disabled={exporting}
        >
          <Ionicons name="download-outline" size={16} color="#9A3412" />
          <Text style={styles.downloadText}>{exporting ? '…' : 'CSV'}</Text>
        </TouchableOpacity>
      </View>

      {history.length > 1 ? (
        <TouchableOpacity style={styles.examPicker} onPress={() => setPickerOpen(true)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerLabel}>Exam</Text>
            <Text style={styles.pickerValue} numberOfLines={1}>
              {selected.testTitle || `Test #${selected.testNo || selected._id}`}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={STUDENT.textMuted} />
        </TouchableOpacity>
      ) : null}

      <GlassPanel
        tone="strong"
        elevated
        colors={['#FFF7ED', '#FFFFFF']}
        radius={STUDENT_RADIUS.xxl}
        style={styles.hero}
        contentStyle={styles.heroInner}
      >
        <View style={styles.ringWrap}>
          <View style={styles.ringOuter}>
            <View style={[styles.ringFill, { height: `${scorePct}%` as any }]} />
            <View style={styles.ringCenter}>
              <Text style={styles.ringPct}>{selected.percentage}%</Text>
              <Text style={styles.ringGrade}>Grade {gradeFor(scorePct)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroMeta}>
          <Text style={styles.overallLabel}>Overall score</Text>
          <Text style={styles.testTitle}>{selected.testTitle || 'OMR Test'}</Text>
          <View style={styles.metaRow}>
            {formatTestDate(selected.testDate) ? (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={13} color={STUDENT.textMuted} />
                <Text style={styles.metaChipText}>{formatTestDate(selected.testDate)}</Text>
              </View>
            ) : null}
            {selected.testNo ? (
              <View style={styles.metaChip}>
                <Ionicons name="pricetag-outline" size={13} color={STUDENT.textMuted} />
                <Text style={styles.metaChipText}>Test {selected.testNo}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Marks</Text>
              <Text style={styles.statValue}>{selected.totalMarks}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Rank</Text>
              <View style={styles.rankRow}>
                <Ionicons name="medal-outline" size={16} color="#F59E0B" />
                <Text style={styles.statValue}>{rank ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Trend</Text>
              {trend != null ? (
                <Text
                  style={[
                    styles.statValue,
                    { color: trend >= 0 ? STUDENT.success : STUDENT.danger, fontSize: 16 },
                  ]}
                >
                  {trend >= 0 ? '+' : ''}
                  {trend}%
                </Text>
              ) : (
                <Text style={[styles.statValue, { color: STUDENT.textMuted }]}>—</Text>
              )}
            </View>
          </View>
        </View>
      </GlassPanel>

      <Text style={styles.blockTitle}>Subject Performance</Text>
      <View style={styles.subjectGrid}>
        {subjects.map((s) => {
          const max = subjectMax(s.score);
          const marks = s.score?.marks || 0;
          const pct = subjectPct(s.score);
          return (
            <View key={s.key} style={styles.subjectCard}>
              <View style={styles.subjectTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{s.key}</Text>
                  <Text style={styles.subjectRwl}>
                    Right {s.score?.r ?? 0} · Wrong {s.score?.w ?? 0} · Left {s.score?.l ?? 0}
                  </Text>
                </View>
                <View style={[styles.gradeChip, { backgroundColor: s.chipBg }]}>
                  <Text style={[styles.gradeChipText, { color: s.chipText }]}>{gradeFor(pct)}</Text>
                </View>
              </View>
              <View style={styles.subjectMarksRow}>
                <Text style={styles.subjectMarks}>
                  {marks}
                  <Text style={styles.subjectMax}> / {max}</Text>
                </Text>
                <Text style={styles.subjectPct}>{pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: s.bar }]} />
              </View>
            </View>
          );
        })}
      </View>

      {history.length > 1 ? (
        <>
          <Text style={styles.blockTitle}>All OMR Tests</Text>
          <View style={styles.historyList}>
            {history.map((h) => {
              const active = h._id === selected._id;
              return (
                <TouchableOpacity
                  key={h._id}
                  style={[styles.historyRow, active && styles.historyRowActive]}
                  onPress={() => setSelectedId(h._id)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {h.testTitle}
                    </Text>
                    <Text style={styles.historySub}>
                      {formatTestDate(h.testDate) || `Test #${h.testNo || '—'}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyPct}>{h.percentage}%</Text>
                    <Text style={styles.historyRank}>
                      Rank {h.finalRank ?? h.testRank ?? '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choose OMR Exam</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {history.map((h) => (
                <TouchableOpacity
                  key={h._id}
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedId(h._id);
                    setPickerOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowTitle} numberOfLines={2}>
                      {h.testTitle || `Test #${h.testNo || h._id}`}
                    </Text>
                    <Text style={styles.modalRowSub}>
                      {h.percentage}%
                      {formatTestDate(h.testDate) ? ` · ${formatTestDate(h.testDate)}` : ''}
                    </Text>
                  </View>
                  {h._id === selected._id ? (
                    <Ionicons name="checkmark-circle" size={20} color={STUDENT.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 8, gap: 12 },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
  },
  muted: { color: STUDENT.textMuted, fontSize: 13 },
  errorText: { color: STUDENT.danger, textAlign: 'center', paddingHorizontal: 24, fontSize: 14 },
  retryBtn: {
    marginTop: 4,
    backgroundColor: STUDENT.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FED7AA',
    backgroundColor: 'rgba(255,247,237,0.7)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  emptyBody: {
    marginTop: 6,
    textAlign: 'center',
    color: STUDENT.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sectionTitle: { ...STUDENT_TYPO.section, fontSize: 18, color: STUDENT.text },
  sectionSub: { marginTop: 2, fontSize: 12, color: STUDENT.textMuted },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  downloadText: { color: '#9A3412', fontWeight: '700', fontSize: 12 },
  examPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerLabel: { fontSize: 11, color: STUDENT.textMuted, fontWeight: '600' },
  pickerValue: { fontSize: 14, fontWeight: '700', color: STUDENT.text, marginTop: 2 },
  hero: { marginTop: 2 },
  heroInner: { padding: STUDENT_SPACING.md, gap: 14 },
  ringWrap: { alignItems: 'center' },
  ringOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderColor: '#FFEDD5',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#FFF7ED',
  },
  ringFill: {
    width: '100%',
    backgroundColor: '#F97316',
    opacity: 0.25,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 24, fontWeight: '800', color: STUDENT.text },
  ringGrade: {
    fontSize: 10,
    fontWeight: '700',
    color: STUDENT.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroMeta: { gap: 6 },
  overallLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  testTitle: { fontSize: 17, fontWeight: '800', color: STUDENT.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontSize: 12, color: STUDENT.textMuted },
  statGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: STUDENT.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: { marginTop: 2, fontSize: 18, fontWeight: '800', color: STUDENT.text },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  blockTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: STUDENT.text,
  },
  subjectGrid: { gap: 10 },
  subjectCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
  },
  subjectTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  subjectName: { fontSize: 15, fontWeight: '800', color: STUDENT.text },
  subjectRwl: { marginTop: 2, fontSize: 11, color: STUDENT.textMuted },
  gradeChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gradeChipText: { fontSize: 11, fontWeight: '800' },
  subjectMarksRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  subjectMarks: { fontSize: 20, fontWeight: '800', color: STUDENT.text },
  subjectMax: { fontSize: 13, fontWeight: '600', color: STUDENT.textMuted },
  subjectPct: { fontSize: 13, fontWeight: '700', color: STUDENT.textSecondary },
  barTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
  historyList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  historyRowActive: { backgroundColor: '#FFF7ED' },
  historyTitle: { fontSize: 13, fontWeight: '700', color: STUDENT.text },
  historySub: { marginTop: 2, fontSize: 11, color: STUDENT.textMuted },
  historyPct: { fontSize: 14, fontWeight: '800', color: STUDENT.text },
  historyRank: { marginTop: 2, fontSize: 11, color: STUDENT.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text, marginBottom: 10 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  modalRowTitle: { fontSize: 14, fontWeight: '700', color: STUDENT.text },
  modalRowSub: { marginTop: 2, fontSize: 12, color: STUDENT.textMuted },
});
