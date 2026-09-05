import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import omrService, {
  type OmrAdminRow,
  type OmrBatch,
  type OmrStudentOption,
} from '../../../src/services/api/omrService';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminScalePressable,
  AdminStatsRow,
  AdminModalShell,
  useAdminTheme,
} from '../_ui';

const ADMIN_OMR_READ_ONLY = true;

function n(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return String(v);
}

function formatStudentLabel(s: OmrStudentOption) {
  return `${s.fullName || s.email}${s.classNumber ? ` (${s.classNumber}${s.section || ''})` : ''}`;
}

export default function OmrResultsView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [batches, setBatches] = useState<OmrBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<OmrAdminRow[]>([]);
  const [batchMeta, setBatchMeta] = useState<OmrBatch | null>(null);
  const [students, setStudents] = useState<OmrStudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [search, setSearch] = useState('');
  const [assignDrafts, setAssignDrafts] = useState<Record<string, string>>({});
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [assignRowId, setAssignRowId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

  const loadBatches = useCallback(async () => {
    const list = await omrService.listAdminBatches();
    setBatches(list);
    return list;
  }, []);

  const loadBatchDetail = useCallback(async (batchId: string) => {
    const data = await omrService.getAdminBatch(batchId);
    setBatchMeta(data.batch);
    setRows(data.rows);
    const drafts: Record<string, string> = {};
    for (const row of data.rows) {
      drafts[row._id] = row.userId || row.suggestedUserId || '';
    }
    setAssignDrafts(drafts);
  }, []);

  const loadStudents = useCallback(async () => {
    const list = await omrService.listAdminStudents();
    setStudents(list);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBatches(), loadStudents()])
      .then(([list]) => {
        if (list?.[0]?._id) setSelectedBatchId(list[0]._id);
      })
      .catch((err: any) => {
        Alert.alert('Could not load results', err?.friendlyMessage || err?.message || 'Request failed');
      })
      .finally(() => setLoading(false));
  }, [loadBatches, loadStudents]);

  useEffect(() => {
    if (!selectedBatchId) {
      setRows([]);
      setBatchMeta(null);
      return;
    }
    loadBatchDetail(selectedBatchId).catch((err: any) => {
      Alert.alert('Batch Load Failed', err?.friendlyMessage || err?.message || 'Request failed');
    });
  }, [selectedBatchId, loadBatchDetail]);

  const studentById = useMemo(() => {
    const map = new Map<string, OmrStudentOption>();
    for (const s of students) map.set(s._id, s);
    return map;
  }, [students]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterUnassigned && r.userId) return false;
      if (!q) return true;
      const studentLabel = r.student
        ? `${r.student.fullName} ${r.student.email}`.toLowerCase()
        : '';
      return (
        r.candidateId.toLowerCase().includes(q) ||
        (r.candidateName || '').toLowerCase().includes(q) ||
        (r.fatherName || '').toLowerCase().includes(q) ||
        (r.group || '').toLowerCase().includes(q) ||
        studentLabel.includes(q)
      );
    });
  }, [rows, search, filterUnassigned]);

  const unassignedCount = useMemo(
    () =>
      batchMeta
        ? Math.max(0, (batchMeta.rowCount || 0) - (batchMeta.assignedCount || 0))
        : 0,
    [batchMeta]
  );

  const resolveAssignValue = (rowId: string) => {
    const raw = assignDrafts[rowId] || '';
    if (raw && studentById.has(raw)) return raw;
    return '';
  };

  const assignRow = useMemo(
    () => (assignRowId ? rows.find((r) => r._id === assignRowId) || null : null),
    [assignRowId, rows]
  );

  const assignStudentMatches = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay = `${s.fullName} ${s.email} ${s.classNumber || ''}${s.section || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, assignSearch]);

  const pickCsvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/csv',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPickedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const handleUpload = async () => {
    if (!pickedFile) return;
    setUploading(true);
    try {
      const data = await omrService.uploadAdminResults({
        uri: pickedFile.uri,
        name: pickedFile.name,
        mimeType: pickedFile.mimeType,
      });
      if (!data?.success) throw new Error(data?.message || 'Upload failed');
      Alert.alert(
        'OMR scores imported',
        `${data.message || 'Upload complete'}${
          data.data?.autoAssigned ? ` · ${data.data.autoAssigned} auto-assigned` : ''
        }`
      );
      setUploadOpen(false);
      setPickedFile(null);
      const list = await loadBatches();
      if (data.data?.batch?._id) setSelectedBatchId(data.data.batch._id);
      else if (list?.[0]?._id) setSelectedBatchId(list[0]._id);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.friendlyMessage || err?.message || 'Could not import file');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedBatchId) return;
    const assignments = Object.entries(assignDrafts)
      .map(([rowId, userId]) => {
        const row = rows.find((r) => r._id === rowId);
        const current = row?.userId || '';
        const next = userId && studentById.has(userId) ? userId : '';
        if (current === next) return null;
        return { rowId, userId: next || null };
      })
      .filter(Boolean) as Array<{ rowId: string; userId: string | null }>;

    if (!assignments.length) {
      Alert.alert('No changes', 'Change at least one student assignment first.');
      return;
    }

    setSavingAssign(true);
    try {
      const data = await omrService.assignAdminRows(selectedBatchId, assignments);
      if (!data?.success) throw new Error(data?.message || 'Assign failed');
      Alert.alert('Assignments saved', data.message || 'Saved');
      await Promise.all([loadBatches(), loadBatchDetail(selectedBatchId)]);
    } catch (err: any) {
      Alert.alert('Assign failed', err?.friendlyMessage || err?.message || 'Could not save');
    } finally {
      setSavingAssign(false);
    }
  };

  if (loading) {
    return (
      <AdminScreenShell>
        <AdminSkeletonList count={4} />
      </AdminScreenShell>
    );
  }

  return (
    <AdminScreenShell>
      <AdminSectionHeader
        title="Offline Results"
        subtitle={
          ADMIN_OMR_READ_ONLY
            ? 'View offline test scores and student mappings for your school.'
            : 'Upload Score List CSV/Excel and map Candidate IDs to students.'
        }
      />

      {ADMIN_OMR_READ_ONLY ? (
        <AdminGlassCard style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Offline results are uploaded by the platform team. Contact support if a new test needs
            to be added.
          </Text>
        </AdminGlassCard>
      ) : null}

      {!ADMIN_OMR_READ_ONLY ? (
      <View style={styles.actionsRow}>
        <AdminScalePressable
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          onPress={() => setUploadOpen(true)}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Upload CSV</Text>
        </AdminScalePressable>
        <AdminScalePressable
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => void handleSaveAssignments()}
          disabled={!selectedBatchId || savingAssign}
        >
          <Ionicons name="link-outline" size={16} color="#fff" />
          <Text style={[styles.actionBtnText, { color: '#fff' }]}>
            {savingAssign ? 'Saving…' : 'Save Assignments'}
          </Text>
        </AdminScalePressable>
      </View>
      ) : null}

      <AdminScalePressable
        style={[styles.batchPicker, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
        onPress={() => setBatchPickerOpen(true)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Uploaded Test</Text>
          <Text style={[styles.pickerValue, { color: colors.text }]} numberOfLines={1}>
            {batchMeta?.testTitle || 'Select an uploaded OMR score list'}
          </Text>
          {batchMeta ? (
            <Text style={[styles.pickerMeta, { color: colors.textMuted }]} numberOfLines={1}>
              Test #{batchMeta.testNo || '—'} · {batchMeta.rowCount} rows · Assigned{' '}
              {batchMeta.assignedCount}/{batchMeta.rowCount}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </AdminScalePressable>

      <AdminStatsRow
        items={[
          { label: 'Batches', value: String(batches.length), icon: 'layers-outline' },
          { label: 'Rows', value: String(batchMeta?.rowCount ?? 0), icon: 'list-outline' },
          {
            label: 'Unassigned',
            value: String(unassignedCount),
            icon: 'alert-circle-outline',
            gradientIndex: unassignedCount > 0 ? 2 : 0,
          },
        ]}
      />

      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <AdminSearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search candidate, name, student…"
          />
        </View>
        <AdminScalePressable
          style={[
            styles.filterChip,
            filterUnassigned
              ? { backgroundColor: '#D97706' }
              : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: 1 },
          ]}
          onPress={() => setFilterUnassigned((v) => !v)}
        >
          <Ionicons
            name="warning-outline"
            size={14}
            color={filterUnassigned ? '#fff' : colors.textSecondary}
          />
          <Text
            style={{
              color: filterUnassigned ? '#fff' : colors.textSecondary,
              fontWeight: '700',
              fontSize: 12,
            }}
          >
            Unassigned
          </Text>
        </AdminScalePressable>
      </View>

      {!selectedBatchId ? (
        <AdminEmptyState
          icon="scan-outline"
          title="No score list selected"
          message="Upload a Score List CSV from OMR scanning to get started."
        />
      ) : filteredRows.length === 0 ? (
        <AdminEmptyState
          icon="search-outline"
          title="No rows match"
          message="Try clearing search or the unassigned filter."
        />
      ) : (
        <View style={{ gap: spacing.sm, paddingBottom: spacing.xl }}>
          {unassignedCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>
                {unassignedCount} candidates need student mapping
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#065F46" />
              <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 12 }}>All Assigned</Text>
            </View>
          )}

          {filteredRows.map((row) => {
            const assignedId = resolveAssignValue(row._id);
            const assigned = assignedId ? studentById.get(assignedId) : null;
            return (
              <AdminGlassCard key={row._id} style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.candidateId, { color: colors.text }]} numberOfLines={1}>
                      {row.candidateId}
                    </Text>
                    <Text style={[styles.candidateName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {row.candidateName || '—'}
                      {row.group ? ` · ${row.group}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.pctPill, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>{n(row.percentage)}%</Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <Text style={[styles.metric, { color: colors.textMuted }]}>
                    Marks {n(row.totalMarks)} · Rank {n(row.finalRank ?? row.testRank)}
                  </Text>
                  <Text style={[styles.metric, { color: colors.textMuted }]}>
                    M/P/C/B {n(row.maths?.marks)}/{n(row.physics?.marks)}/{n(row.chemistry?.marks)}/
                    {n(row.biology?.marks)}
                  </Text>
                </View>

                {!ADMIN_OMR_READ_ONLY ? (
                  <AdminScalePressable
                    style={[styles.assignBtn, { borderColor: colors.surfaceBorder }]}
                    onPress={() => {
                      setAssignRowId(row._id);
                      setAssignSearch('');
                    }}
                  >
                    <Ionicons name="person-add-outline" size={15} color={colors.primary} />
                    <Text style={[styles.assignBtnText, { color: colors.text }]} numberOfLines={1}>
                      {assigned ? formatStudentLabel(assigned) : 'Search student…'}
                    </Text>
                  </AdminScalePressable>
                ) : (
                  <Text style={[styles.assignBtnText, { color: colors.textMuted }]} numberOfLines={2}>
                    {assigned
                      ? formatStudentLabel(assigned)
                      : row.student
                        ? formatStudentLabel({
                            _id: row.student._id,
                            fullName: row.student.fullName,
                            email: row.student.email,
                            classNumber: row.student.classNumber,
                            section: row.student.section,
                          })
                        : 'Not assigned'}
                  </Text>
                )}
              </AdminGlassCard>
            );
          })}
        </View>
      )}

      {/* Batch picker */}
      <AdminModalShell
        visible={batchPickerOpen}
        title="Select OMR Test"
        onClose={() => setBatchPickerOpen(false)}
      >
        {batches.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 24 }}>
            No uploads yet
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 360 }}>
            {batches.map((b) => {
              const left = Math.max(0, (b.rowCount || 0) - (b.assignedCount || 0));
              const active = b._id === selectedBatchId;
              return (
                <AdminScalePressable
                  key={b._id}
                  style={[styles.pickerRow, active && { backgroundColor: colors.primaryMuted }]}
                  onPress={() => {
                    setSelectedBatchId(b._id);
                    setBatchPickerOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{b.testTitle}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {left > 0 ? `${left} unassigned` : 'All Assigned'} · {b.rowCount} rows
                    </Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </AdminScalePressable>
              );
            })}
          </ScrollView>
        )}
      </AdminModalShell>

      {/* Assign student */}
      {!ADMIN_OMR_READ_ONLY ? (
      <AdminModalShell
        visible={!!assignRowId}
        title="Assign Student"
        onClose={() => {
          setAssignRowId(null);
          setAssignSearch('');
        }}
        footer={
          <View style={styles.modalFooter}>
            <AdminScalePressable
              style={[styles.footerGhost, { borderColor: colors.surfaceBorder }]}
              onPress={() => {
                if (!assignRowId) return;
                setAssignDrafts((prev) => ({ ...prev, [assignRowId]: '' }));
                setAssignRowId(null);
                setAssignSearch('');
              }}
              disabled={!assignRowId || !resolveAssignValue(assignRowId)}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Clear</Text>
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.footerPrimary, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              onPress={() => {
                setAssignRowId(null);
                setAssignSearch('');
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </AdminScalePressable>
          </View>
        }
      >
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 10 }}>
          {assignRow
            ? `Pick a school student for Candidate ID ${assignRow.candidateId}.`
            : 'Search and pick a school student.'}
        </Text>
        <TextInput
          value={assignSearch}
          onChangeText={setAssignSearch}
          placeholder="Search by name, email, or class…"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.assignSearch,
            {
              borderColor: colors.surfaceBorder,
              color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
            },
          ]}
        />
        <FlatList
          data={assignStudentMatches}
          keyExtractor={(item) => item._id}
          style={{ maxHeight: 280, marginTop: 10 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 24 }}>
              {students.length === 0 ? 'No students found for this school' : 'No students match'}
            </Text>
          }
          renderItem={({ item }) => {
            const selected = assignRowId && resolveAssignValue(assignRowId) === item._id;
            return (
              <AdminScalePressable
                style={[styles.studentRow, selected ? { backgroundColor: '#ECFDF5' } : null]}
                onPress={() => {
                  if (!assignRowId) return;
                  setAssignDrafts((prev) => ({ ...prev, [assignRowId]: item._id }));
                  setAssignRowId(null);
                  setAssignSearch('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{formatStudentLabel(item)}</Text>
                  {item.email ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                      {item.email}
                    </Text>
                  ) : null}
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={18} color="#059669" /> : null}
              </AdminScalePressable>
            );
          }}
        />
      </AdminModalShell>
      ) : null}

      {/* Upload */}
      {!ADMIN_OMR_READ_ONLY ? (
      <AdminModalShell
        visible={uploadOpen}
        title="Upload OMR Score List"
        onClose={() => {
          if (uploading) return;
          setUploadOpen(false);
          setPickedFile(null);
        }}
        footer={
          <View style={styles.modalFooter}>
            <AdminScalePressable
              style={[styles.footerGhost, { borderColor: colors.surfaceBorder }]}
              onPress={() => {
                setUploadOpen(false);
                setPickedFile(null);
              }}
              disabled={uploading}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.footerPrimary, { backgroundColor: colors.primary }]}
              onPress={() => void handleUpload()}
              disabled={!pickedFile || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>Import Scores</Text>
              )}
            </AdminScalePressable>
          </View>
        }
      >
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
          CSV/Excel columns should match the OMR export (Candidate ID, subject R/W/L/Mk, ranks,
          percentage). Then assign each candidate to a student.
        </Text>
        <AdminScalePressable
          style={[styles.pickFileBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
          onPress={() => void pickCsvFile()}
        >
          <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {pickedFile ? 'Change File' : 'Choose CSV / Excel'}
          </Text>
        </AdminScalePressable>
        {pickedFile ? (
          <View style={[styles.fileChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={{ color: '#065F46', fontSize: 12, flex: 1 }} numberOfLines={2}>
              {pickedFile.name}
            </Text>
          </View>
        ) : null}
      </AdminModalShell>
      ) : null}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnText: { fontWeight: '700', fontSize: 13 },
  batchPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pickerLabel: { fontSize: 11, fontWeight: '600' },
  pickerValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  pickerMeta: { fontSize: 11, marginTop: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rowCard: { padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  candidateId: { fontSize: 15, fontWeight: '800' },
  candidateName: { marginTop: 2, fontSize: 12 },
  pctPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  metricsRow: { marginTop: 10, gap: 2 },
  metric: { fontSize: 12 },
  assignBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assignBtnText: { flex: 1, fontSize: 13, fontWeight: '600' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  modalFooter: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  footerGhost: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerPrimary: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  assignSearch: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  fileChip: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
