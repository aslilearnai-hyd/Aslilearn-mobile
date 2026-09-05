import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  VISIBILITY_LABELS,
  createLiveSession,
  deleteLiveSession,
  emptyLiveSessionForm,
  fetchLiveSessions,
  fetchSchoolOptions,
  formFromSession,
  sessionSchoolNames,
  updateLiveSession,
  type LiveSession,
  type LiveSessionForm,
  type LiveSessionVisibility,
  type SchoolOption,
} from '../../../src/lib/live-sessions';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

type VisibilityPickerProps = {
  visible: boolean;
  value: LiveSessionVisibility;
  onSelect: (value: LiveSessionVisibility) => void;
  onClose: () => void;
};

function VisibilityPicker({ visible, value, onSelect, onClose }: VisibilityPickerProps) {
  const options: LiveSessionVisibility[] = ['teacher', 'student', 'both'];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Who Can See This Session?</Text>
          {options.map((option) => (
            <Pressable
              key={option}
              style={[styles.pickerItem, value === option && styles.pickerItemActive]}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
            >
              <Text style={styles.pickerItemText}>{VISIBILITY_LABELS[option]}</Text>
              {value === option ? <Ionicons name="checkmark" size={18} color="#0ea5e9" /> : null}
            </Pressable>
          ))}
          <Pressable style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type SchoolsModalProps = {
  visible: boolean;
  schools: SchoolOption[];
  selectedIds: string[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
};

function SchoolsModal({
  visible,
  schools,
  selectedIds,
  search,
  onSearchChange,
  onToggle,
  onSelectAll,
  onClear,
  onClose,
}: SchoolsModalProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.schoolName.toLowerCase().includes(q));
  }, [schools, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formModalWrap}>
        <View style={styles.formModalHeader}>
          <Text style={styles.formModalTitle}>Select Schools ({selectedIds.length})</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color="#64748b" />
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#5B6779" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search Schools..."
            placeholderTextColor="#5B6779"
          />
        </View>
        <View style={styles.schoolActions}>
          <Pressable onPress={onSelectAll}>
            <Text style={styles.schoolActionText}>Select All</Text>
          </Pressable>
          <Pressable onPress={onClear}>
            <Text style={styles.schoolActionText}>Clear</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.schoolList} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text style={styles.emptySchools}>No Schools Found</Text>
          ) : (
            filtered.map((school) => {
              const checked = selectedIds.includes(school.id);
              return (
                <Pressable
                  key={school.id}
                  style={[styles.schoolRow, checked && styles.schoolRowActive]}
                  onPress={() => onToggle(school.id)}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={checked ? '#0ea5e9' : '#5B6779'}
                  />
                  <Text style={styles.schoolRowText}>{school.schoolName}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
        <Pressable style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

type FormModalProps = {
  visible: boolean;
  editingId: string | null;
  form: LiveSessionForm;
  setForm: React.Dispatch<React.SetStateAction<LiveSessionForm>>;
  schools: SchoolOption[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

function SessionFormModal({
  visible,
  editingId,
  form,
  setForm,
  schools,
  submitting,
  onClose,
  onSubmit,
}: FormModalProps) {
  const [visibilityPicker, setVisibilityPicker] = useState(false);
  const [schoolsModal, setSchoolsModal] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');

  const filteredSchools = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.schoolName.toLowerCase().includes(q));
  }, [schools, schoolSearch]);

  const toggleSchool = (id: string) => {
    setForm((prev) => {
      const next = new Set(prev.schoolAdminIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, schoolAdminIds: [...next] };
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.formModalWrap}>
          <View style={styles.formModalHeader}>
            <Text style={styles.formModalTitle}>
              {editingId ? 'Edit Live Session' : 'Add Live Session'}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Session Name *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="e.g. Class 10 Maths — Live Doubt Session"
              placeholderTextColor="#5B6779"
            />

            <Text style={styles.fieldLabel}>YouTube Live Link *</Text>
            <TextInput
              style={styles.input}
              value={form.youtubeUrl}
              onChangeText={(v) => setForm((p) => ({ ...p, youtubeUrl: v }))}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor="#5B6779"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Schools * ({form.schoolAdminIds.length} Selected)</Text>
            <Pressable style={styles.pickerTrigger} onPress={() => setSchoolsModal(true)}>
              <Text style={styles.pickerTriggerText}>
                {form.schoolAdminIds.length === 0
                  ? 'Tap To Select Schools'
                  : `${form.schoolAdminIds.length} School${form.schoolAdminIds.length === 1 ? '' : 's'} Selected`}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </Pressable>

            <Text style={styles.fieldLabel}>Who Can See This Session? *</Text>
            <Pressable style={styles.pickerTrigger} onPress={() => setVisibilityPicker(true)}>
              <Text style={styles.pickerTriggerText}>{VISIBILITY_LABELS[form.visibility]}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </Pressable>

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="Short Note For Teachers/Students"
              placeholderTextColor="#5B6779"
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.formFooter}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtnWrap} onPress={onSubmit} disabled={submitting}>
              <LinearGradient colors={['#7dd3fc', '#2dd4bf']} style={styles.saveBtn}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Save'}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      <VisibilityPicker
        visible={visibilityPicker}
        value={form.visibility}
        onSelect={(value) => setForm((p) => ({ ...p, visibility: value }))}
        onClose={() => setVisibilityPicker(false)}
      />

      <SchoolsModal
        visible={schoolsModal}
        schools={schools}
        selectedIds={form.schoolAdminIds}
        search={schoolSearch}
        onSearchChange={setSchoolSearch}
        onToggle={toggleSchool}
        onSelectAll={() =>
          setForm((p) => ({ ...p, schoolAdminIds: filteredSchools.map((s) => s.id) }))
        }
        onClear={() => setForm((p) => ({ ...p, schoolAdminIds: [] }))}
        onClose={() => {
          setSchoolsModal(false);
          setSchoolSearch('');
        }}
      />
    </>
  );
}

export default function LiveSessionsView() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LiveSessionForm>(emptyLiveSessionForm());
  const [submitting, setSubmitting] = useState(false);
  const [schoolsPreviewId, setSchoolsPreviewId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      const [sessionList, schoolList] = await Promise.all([fetchLiveSessions(), fetchSchoolOptions()]);
      setSessions(sessionList);
      setSchools(schoolList);
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const names = sessionSchoolNames(session).join(' ');
      const haystack = `${session.title} ${session.description || ''} ${names}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sessions, searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyLiveSessionForm());
  };

  const openCreate = () => {
    resetForm();
    setFormVisible(true);
  };

  const openEdit = (session: LiveSession) => {
    setEditingId(session._id);
    setForm(formFromSession(session));
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.youtubeUrl.trim() || form.schoolAdminIds.length === 0) {
      Alert.alert('Validation', 'Session name, YouTube link, and at least one school are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await updateLiveSession(editingId, form);
        Alert.alert('Updated', 'Live session updated.');
      } else {
        await createLiveSession(form);
        Alert.alert('Saved', `Live session is visible in Edu OTT for ${form.schoolAdminIds.length} school(s).`);
      }
      closeForm();
      load(true);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to Save Live Session';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (session: LiveSession) => {
    Alert.alert('Remove Session', `Remove "${session.title}" from Edu OTT?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLiveSession(session._id);
            load(true);
          } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to Delete Session';
            Alert.alert('Error', message);
          }
        },
      },
    ]);
  };

  const previewSchools = schoolsPreviewId
    ? sessionSchoolNames(sessions.find((s) => s._id === schoolsPreviewId) || { _id: '', title: '', visibility: 'both' })
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Edu OTT — Live Sessions</Text>
          <Text style={styles.subtitle}>
            Paste an unlisted YouTube Live link and assign schools. Users watch inside AsliLearn.
          </Text>
        </View>
        <Pressable onPress={openCreate}>
          <LinearGradient colors={['#7dd3fc', '#2dd4bf']} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#5B6779" />
        <TextInput
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search By Session Or School..."
          placeholderTextColor="#5B6779"
        />
      </View>

      {isLoading && !sessions.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="videocam-outline" size={52} color="#5B6779" />
          <Text style={styles.emptyTitle}>No Live Sessions Yet</Text>
          <Text style={styles.emptySub}>Add a YouTube Live link for one or more schools to get started.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((session) => {
            const names = sessionSchoolNames(session);
            const preview = names.slice(0, 2).join(', ');
            const extra = names.length - 2;
            return (
              <View key={session._id} style={styles.card}>
                <Text style={styles.cardTitle}>{session.title}</Text>
                {session.youtubeUrl ? (
                  <Pressable onPress={() => Linking.openURL(session.youtubeUrl!)}>
                    <Text style={styles.youtubeLink} numberOfLines={1}>
                      {session.youtubeUrl}
                    </Text>
                  </Pressable>
                ) : null}
                {session.description ? (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {session.description}
                  </Text>
                ) : null}

                <Pressable
                  style={styles.schoolsBlock}
                  onPress={() => names.length > 0 && setSchoolsPreviewId(session._id)}
                >
                  <View style={styles.schoolsBadge}>
                    <Text style={styles.schoolsBadgeText}>
                      {names.length} School{names.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {names.length > 0 ? (
                    <Text style={styles.schoolsPreview} numberOfLines={2}>
                      {preview}
                      {extra > 0 ? ` +${extra} More` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.schoolsPreview}>No Schools Assigned</Text>
                  )}
                </Pressable>

                <View style={styles.visibilityRow}>
                  <Ionicons name="eye-outline" size={14} color="#6b7280" />
                  <Text style={styles.visibilityText}>
                    {VISIBILITY_LABELS[session.visibility] || session.visibility}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable style={styles.actionBtn} onPress={() => openEdit(session)}>
                    <Ionicons name="pencil" size={16} color="#111827" />
                    <Text style={styles.actionTxt}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(session)}>
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    <Text style={[styles.actionTxt, { color: '#dc2626' }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <SessionFormModal
        visible={formVisible}
        editingId={editingId}
        form={form}
        setForm={setForm}
        schools={schools}
        submitting={submitting}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <Modal
        visible={!!schoolsPreviewId}
        transparent
        animationType="slide"
        onRequestClose={() => setSchoolsPreviewId(null)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>
              {previewSchools.length} School{previewSchools.length === 1 ? '' : 's'} Assigned
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {previewSchools.map((name) => (
                <View key={name} style={styles.previewSchoolRow}>
                  <Ionicons name="school-outline" size={16} color="#5B6779" />
                  <Text style={styles.previewSchoolText}>{name}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.pickerClose} onPress={() => setSchoolsPreviewId(null)}>
              <Text style={styles.pickerCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchWrap: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, paddingRight: 8, marginLeft: 8, color: '#111827' },
  center: { alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: '#4b5563', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#5B6779', textAlign: 'center', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontWeight: '700', color: '#111827', fontSize: 16 },
  youtubeLink: { marginTop: 6, fontSize: 12, color: '#0284c7' },
  cardDescription: { marginTop: 6, fontSize: 12, color: '#6b7280', lineHeight: 17 },
  schoolsBlock: { marginTop: 10 },
  schoolsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  schoolsBadgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  schoolsPreview: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  visibilityText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionTxt: { fontSize: 12, fontWeight: '600', color: '#111827' },
  formModalWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  formModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formModalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  formScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickerTrigger: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTriggerText: { fontSize: 14, color: '#111827', flex: 1, marginRight: 8 },
  formFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: { fontWeight: '700', color: '#374151' },
  saveBtnWrap: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemActive: { backgroundColor: '#f0f9ff' },
  pickerItemText: { fontSize: 15, color: '#111827' },
  pickerClose: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  pickerCloseText: { fontWeight: '700', color: '#374151' },
  schoolActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  schoolActionText: { color: '#0ea5e9', fontWeight: '700', fontSize: 13 },
  schoolList: { flex: 1, paddingHorizontal: 16 },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  schoolRowActive: { backgroundColor: '#f0f9ff' },
  schoolRowText: { flex: 1, fontSize: 14, color: '#111827' },
  emptySchools: { textAlign: 'center', color: '#5B6779', padding: 24 },
  doneBtn: {
    margin: 16,
    backgroundColor: '#111827',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneBtnText: { color: '#fff', fontWeight: '700' },
  previewSchoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  previewSchoolText: { flex: 1, fontSize: 14, color: '#374151' },
});
