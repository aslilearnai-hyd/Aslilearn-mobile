import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import api from '../../../src/services/api/api';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminScalePressable,
  useAdminTheme,
  useAdminListLayout,
  ADMIN_LIST_GRID_GAP,
  AdminGridList,
  AdminCardScrollBox,
  AdminStatsRow,
} from '../_ui';
import {
  SvgCheckbox,
  SvgIconBook,
  SvgIconCertificate,
  SvgIconClose,
  SvgIconEye,
  SvgIconMail,
  SvgIconPeople,
  SvgIconSchool,
} from './TeachersCardIcons';

const GRID_GAP = ADMIN_LIST_GRID_GAP;

interface ClassOption {
  id: string;
  classNumber: string;
  className: string;
  section?: string;
}

interface SubjectClass {
  id: string;
  classNumber: string;
  className: string;
  section?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacher?: {
    id: string;
    fullName: string;
    email: string;
  };
  classes?: SubjectClass[];
  classIds?: string[];
  grade?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

const toggleClassId = (classIds: string[], classId: string, checked: boolean) => {
  if (checked) return classIds.includes(classId) ? classIds : [...classIds, classId];
  return classIds.filter((id) => id !== classId);
};

const classNumberSortKey = (value: string) => {
  const n = parseInt(String(value || '').replace(/[^-\d]/g, ''), 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : Math.abs(n);
};

const compareAssignedClasses = (a: SubjectClass, b: SubjectClass) => {
  const aNum = classNumberSortKey(a.classNumber || a.className || '');
  const bNum = classNumberSortKey(b.classNumber || b.className || '');
  if (aNum !== bNum) return aNum - bNum;
  return String(a.section || '').localeCompare(String(b.section || ''), undefined, {
    sensitivity: 'base',
  });
};

const getClassItemLabel = (c: SubjectClass) => {
  const label = c.classNumber
    ? `Class ${c.classNumber}`
    : c.className?.trim() || 'Class';
  return c.section ? `${label}-${c.section}` : label;
};

const sortedAssignedClasses = (subject: Subject) =>
  [...(subject.classes || [])].sort(compareAssignedClasses);

const formatClassLabels = (subject: Subject) => {
  const list = sortedAssignedClasses(subject);
  if (!list.length) return '—';
  return list.map(getClassItemLabel).join(', ');
};

export default function SubjectsView() {
  const { colors, spacing, radius } = useAdminTheme();
  const { isTablet, gridColumns } = useAdminListLayout();
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState<Subject | null>(null);
  const [assignClassIds, setAssignClassIds] = useState<string[]>([]);

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = Array.isArray(data) ? data : data?.data || [];
      setClasses(
        (Array.isArray(classesData) ? classesData : [])
          .map((c: any) => ({
            id: String(c._id || c.id || ''),
            classNumber: String(c.classNumber || ''),
            className: c.name || c.className || `Class ${c.classNumber || ''}`,
            section: c.section ? String(c.section) : undefined,
          }))
          .sort(compareAssignedClasses)
      );
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/subjects');
      const data = response?.data;
      let subjectsData: any[] = [];
      if (Array.isArray(data)) {
        subjectsData = data;
      } else if (data?.data && Array.isArray(data.data)) {
        subjectsData = data.data;
      } else if (data?.subjects && Array.isArray(data.subjects)) {
        subjectsData = data.subjects;
      }

      const mappedSubjects = subjectsData.map((subject: any) => ({
        id: String(subject._id || subject.id || ''),
        name: subject.name || 'Unknown Subject',
        code: subject.code || '',
        description: subject.description || '',
        teacher: subject.teacher,
        classes: Array.isArray(subject.classes)
          ? subject.classes
              .map((c: any) => ({
                id: String(c.id || c._id || ''),
                classNumber: c.classNumber || '',
                className: c.className || c.name || `Class ${c.classNumber || ''}`,
                section: c.section,
              }))
              .sort(compareAssignedClasses)
          : [],
        classIds: Array.isArray(subject.classIds)
          ? subject.classIds.map(String)
          : Array.isArray(subject.classes)
            ? subject.classes.map((c: any) => String(c.id || c._id || ''))
            : [],
        grade: subject.grade || '',
        department: subject.department || '',
        isActive: subject.isActive !== false,
        createdAt: subject.createdAt || new Date().toISOString(),
      }));
      setSubjects(mappedSubjects);
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSubjects(), fetchClasses()]);
    setRefreshing(false);
  }, [fetchSubjects, fetchClasses]);

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjects;
    const query = searchTerm.toLowerCase();
    return subjects.filter(
      (subject) =>
        subject.name?.toLowerCase().includes(query) ||
        subject.code?.toLowerCase().includes(query) ||
        subject.department?.toLowerCase().includes(query) ||
        subject.teacher?.fullName?.toLowerCase().includes(query) ||
        subject.teacher?.email?.toLowerCase().includes(query),
    );
  }, [subjects, searchTerm]);

  const totalSubjects = subjects.length;
  const activeSubjects = subjects.filter((s) => s.isActive).length;
  const assignedSubjects = subjects.filter((s) => s.teacher).length;

  const openAssignSubject = (subject: Subject) => {
    setAssigningSubject(subject);
    setAssignClassIds(subject.classIds || subject.classes?.map((c) => c.id) || []);
    setIsAssignModalVisible(true);
  };

  const handleSaveAssignments = async () => {
    if (!assigningSubject) return;
    try {
      await api.put(`/api/admin/subjects/${assigningSubject.id}`, {
        classIds: assignClassIds,
      });
      setIsAssignModalVisible(false);
      setAssigningSubject(null);
      fetchSubjects();
      Alert.alert('Success', 'Class assignments updated!');
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to update assignments.');
    }
  };

  const showSubjectDetail = (subject: Subject) => {
    const lines = [
      `Code: ${subject.code || '—'}`,
      `Description: ${subject.description?.trim() ? subject.description : '—'}`,
      `Department: ${subject.department?.trim() ? subject.department : '—'}`,
      `Grade: ${subject.grade?.trim() ? subject.grade : '—'}`,
      `Assigned Classes: ${formatClassLabels(subject)}`,
      `Status: ${subject.isActive ? 'Active' : 'Inactive'}`,
      subject.teacher
        ? `Teacher: ${subject.teacher.fullName}\nEmail: ${subject.teacher.email || '—'}`
        : 'Teacher: Not Assigned',
    ];
    Alert.alert(subject.name, lines.join('\n\n'));
  };

  const renderClassPicker = (
    selectedIds: string[],
    onChange: (ids: string[]) => void
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Assign To Class(es)</Text>
      {classes.length === 0 ? (
        <Text style={styles.classPickerEmpty}>No classes yet. Add classes first.</Text>
      ) : (
        <ScrollView style={styles.classPickerScroll} nestedScrollEnabled>
          {classes.map((cls) => {
            const checked = selectedIds.includes(cls.id);
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classPickRow, checked && styles.classPickRowActive]}
                onPress={() =>
                  onChange(toggleClassId(selectedIds, cls.id, !checked))
                }
                activeOpacity={0.75}
              >
                <SvgCheckbox checked={checked} size={22} />
                <Text style={styles.classPickLabel}>
                  {cls.className} ({cls.classNumber}
                  {cls.section ? `-${cls.section}` : ''})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const DetailRow = ({
    icon,
    label,
    value,
    valueMuted,
  }: {
    icon: ReactNode;
    label: string;
    value: string;
    valueMuted?: boolean;
  }) => (
    <View style={[styles.kvRow, isTablet && styles.kvRowTablet]}>
      <View style={styles.kvRowLeft}>
        <View style={styles.detailIconWrap}>{icon}</View>
        <Text style={styles.kvLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[styles.kvValueWrap, isTablet && styles.kvValueWrapTablet]}>
        <Text
          style={[styles.kvValue, isTablet && styles.kvValueTablet, valueMuted && styles.kvValueMuted]}
          numberOfLines={isTablet ? 2 : 1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>
      </View>
    </View>
  );

  const renderSubjectCard = (subject: Subject, index: number) => (
    <AdminGlassCard
      delay={index * 60}
      style={[styles.subjectCard, isTablet && styles.subjectCardTablet]}
      noAnimation={isTablet}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.subjectAvatar,
            { backgroundColor: colors.primaryMuted, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.subjectAvatarText, { color: colors.primary }]}>
            {(subject.name || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <TouchableOpacity onPress={() => showSubjectDetail(subject)} activeOpacity={0.75}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {subject.name}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subject.code ? `#${subject.code}` : 'Open Details & Classes'}
          </Text>
        </View>
        <View
          style={[
            styles.activePill,
            {
              backgroundColor: subject.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
              borderColor: subject.isActive ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.3)',
            },
          ]}
        >
          <Text
            style={[
              styles.activePillText,
              { color: subject.isActive ? colors.success : colors.danger },
            ]}
          >
            {subject.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={[styles.kvBlock, isTablet && styles.kvBlockTablet]}>
        <DetailRow
          icon={<SvgIconBook size={18} color={colors.textMuted} />}
          label="Code:"
          value={subject.code?.trim() ? subject.code : '—'}
        />
        <DetailRow
          icon={<SvgIconCertificate />}
          label="Description:"
          value={subject.description?.trim() ? subject.description : '—'}
        />
        <DetailRow
          icon={<SvgIconSchool />}
          label="Department:"
          value={subject.department?.trim() ? subject.department : '—'}
        />
        <DetailRow
          icon={<SvgIconBook size={18} color={colors.textMuted} />}
          label="Grade:"
          value={subject.grade?.trim() ? subject.grade : '—'}
        />
        <DetailRow
          icon={<SvgIconPeople size={18} color={colors.textMuted} />}
          label="Teacher:"
          value={subject.teacher?.fullName?.trim() ? subject.teacher.fullName : 'No teacher assigned'}
          valueMuted={!subject.teacher}
        />
        <DetailRow
          icon={<SvgIconMail />}
          label="Email:"
          value={subject.teacher?.email?.trim() ? subject.teacher.email : '—'}
          valueMuted={!subject.teacher?.email}
        />
      </View>

      <View style={styles.cardFooter}>
      <View style={styles.assignedClassesBlock}>
        <Text style={styles.assignedClassesTitle}>Assigned Classes:</Text>
        {(subject.classes?.length ?? 0) > 0 ? (
          <AdminCardScrollBox style={styles.assignedClassesScroll}>
            {sortedAssignedClasses(subject).map((cls) => (
              <View key={cls.id} style={[styles.assignedClassItem, { backgroundColor: colors.primaryMuted, borderColor: colors.surfaceBorder }]}>
                <View style={[styles.assignedClassIconWrap, { backgroundColor: colors.surface }]}>
                  <SvgIconSchool size={16} color={colors.primary} />
                </View>
                <Text
                  style={[styles.assignedClassItemText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {getClassItemLabel(cls)}
                </Text>
              </View>
            ))}
          </AdminCardScrollBox>
        ) : (
          <View style={styles.noClassesAssignedWrap}>
            <Text style={styles.noClassesAssigned}>No classes assigned</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <AdminScalePressable
          style={[styles.squircleBtn, { borderColor: colors.primaryLight }]}
          onPress={() => showSubjectDetail(subject)}
          accessibilityLabel="View subject"
        >
          <SvgIconEye color={colors.primary} size={22} />
        </AdminScalePressable>
        <AdminScalePressable
          style={[styles.squircleBtn, { borderColor: colors.success }]}
          onPress={() => openAssignSubject(subject)}
          accessibilityLabel="Assign classes"
        >
          <SvgIconPeople color={colors.success} size={22} />
        </AdminScalePressable>
      </View>
      </View>
    </AdminGlassCard>
  );

  return (
    <>
    <AdminScreenShell
      refreshing={refreshing}
      onRefresh={onRefresh}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <View style={styles.innerShell}>
      <AdminSectionHeader
        title="Browse Subjects"
        subtitle="Assign classes to subjects created by Super Admin"
        icon="book-outline"
      />

      <AdminStatsRow
        items={[
          { label: 'Total', value: totalSubjects, icon: 'book', gradientIndex: 0 },
          { label: 'Active', value: activeSubjects, icon: 'checkmark-circle', gradientIndex: 2 },
          { label: 'Assigned', value: assignedSubjects, icon: 'people', gradientIndex: 1 },
        ]}
      />

      <AdminGlassCard delay={80} style={{ marginBottom: spacing.md, padding: spacing.md, gap: spacing.sm }}>
        <AdminSearchBar
          placeholder="Search subjects by name, code, teacher…"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </AdminGlassCard>

      {isLoading ? (
        <AdminSkeletonList count={4} />
      ) : filteredSubjects.length === 0 ? (
        <AdminEmptyState
          title="No Subjects Found"
          message="Try a different search. Subjects are managed by Super Admin."
          icon="book-outline"
        />
      ) : isTablet ? (
        <AdminGridList
          data={filteredSubjects}
          columns={gridColumns}
          keyExtractor={(item) => String(item.id)}
          renderItem={(item, index) => renderSubjectCard(item, index)}
        />
      ) : (
        <View style={styles.listContent}>
          {filteredSubjects.map((subject, index) => (
            <View key={String(subject.id || subject.code || `subject-${index}`)} style={styles.listCell}>
              {renderSubjectCard(subject, index)}
            </View>
          ))}
        </View>
      )}

      {/* Assign classes — admin cannot edit/delete subject metadata */}
      <Modal
        visible={isAssignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalHeader,
                {
                  backgroundColor: colors.surfaceGlass || colors.surface,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.surfaceBorder,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assign · {assigningSubject?.name || 'Subject'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsAssignModalVisible(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close assign form"
              >
                <SvgIconClose size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={{ color: colors.textMuted, marginBottom: 12, fontSize: 13 }}>
                Subjects are created by Super Admin. You can only assign classes.
              </Text>
              {renderClassPicker(assignClassIds, setAssignClassIds)}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAssignModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButtonSolid, { backgroundColor: colors.primary }]}
                onPress={handleSaveAssignments}
                activeOpacity={0.88}
              >
                <Text style={styles.submitButtonSolidText}>Save Assignments</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </AdminScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  innerShell: {
    width: '100%',
    flexDirection: 'column',
  },
  listContent: {
    gap: GRID_GAP,
    paddingBottom: 8,
    width: '100%',
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  listCell: {
    width: '100%',
    alignSelf: 'stretch',
  },
  subjectCard: {
    padding: 14,
  },
  subjectCardTablet: {
    width: '100%',
  },
  kvBlockTablet: {
    gap: 6,
  },
  cardFooter: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  subjectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  subjectAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  kvBlock: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kvRowTablet: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  kvRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    maxWidth: '42%',
  },
  detailIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kvLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  kvValueWrap: {
    flex: 1,
    minWidth: 0,
  },
  kvValueWrapTablet: {
    flex: 0,
    width: '100%',
  },
  kvValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  kvValueTablet: {
    width: '100%',
    textAlign: 'left',
    paddingLeft: 30,
  },
  kvValueMuted: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  squircleBtn: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  modalBody: {
    padding: 14,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  formTextArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButtonSolid: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonSolidText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  classPickerEmpty: {
    fontSize: 13,
    color: '#4F46E5',
    paddingVertical: 8,
  },
  classPickerScroll: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 8,
  },
  classPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  classPickRowActive: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  classPickLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  assignedClassesBlock: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
  },
  assignedClassesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  assignedClassesScroll: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: 'rgba(255,251,235,0.55)',
    padding: 8,
  },
  assignedClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  assignedClassIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedClassItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  noClassesAssignedWrap: {
    paddingVertical: 4,
  },
  noClassesAssigned: {
    fontSize: 13,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
});
