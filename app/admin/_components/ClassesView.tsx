import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgCheckbox } from './TeachersCardIcons';
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

type ClassTab = 'classes' | 'assign-subjects' | 'promote-class';

interface Student {
  id: string;
  name: string;
  email: string;
  status?: 'active' | 'inactive';
}

interface ClassTeacher {
  id: string;
  name: string;
  email: string;
}

interface ClassItem {
  id: string;
  name: string;
  classNumber: string;
  section?: string;
  description?: string;
  studentCount: number;
  students?: Student[];
  teachers?: ClassTeacher[];
  assignedSubjects?: any[];
  createdAt: string;
}

interface SubjectRow {
  id: string;
  _id: string;
  name: string;
  code?: string;
  description?: string;
  board?: string;
  variantIds?: string[];
  classes?: { id: string; classNumber?: string; section?: string }[];
}

const CLASS_TABS: { id: ClassTab; label: string; lines: [string, string?]; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'classes', label: 'Classes', lines: ['Classes'], icon: 'school' },
  { id: 'assign-subjects', label: 'Assign Subjects', lines: ['Assign', 'Subjects'], icon: 'book' },
  { id: 'promote-class', label: 'Promote Class', lines: ['Promote', 'Class'], icon: 'arrow-up' },
];

const normalizeClassNumber = (value: string) =>
  String(value || '')
    .replace(/^class\s*/i, '')
    .trim();

const subjectIdsMatch = (a: string, b: string) => String(a) === String(b);

const subjectRowMatchesStoredId = (row: SubjectRow, storedId: string) => {
  const ids = new Set(
    [row.id, row._id, ...(row.variantIds || [])].filter(Boolean).map(String)
  );
  return ids.has(String(storedId));
};

const GRID_GAP = ADMIN_LIST_GRID_GAP;

export default function ClassesView() {
  const { colors, spacing } = useAdminTheme();
  const { isTablet, gridColumns, modalMaxWidth } = useAdminListLayout();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ClassTab>('classes');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [classCardTabById, setClassCardTabById] = useState<Record<string, 'teachers' | 'students'>>({});
  /** Phone: rosters stay closed until opened — avoids mounting every student under every class. */
  const [rosterOpenById, setRosterOpenById] = useState<Record<string, boolean>>({});
  const [isAddClassModalVisible, setIsAddClassModalVisible] = useState(false);
  const [isEditClassModalVisible, setIsEditClassModalVisible] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [isDeleteAllModalVisible, setIsDeleteAllModalVisible] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [newClass, setNewClass] = useState({ classNumber: '', section: '', description: '' });
  const [editClass, setEditClass] = useState({ classNumber: '', section: '', description: '' });

  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState('');
  const [selectedSectionForSubjects, setSelectedSectionForSubjects] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isAssigningSubjects, setIsAssigningSubjects] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);

  const [selectedClassesForPromotion, setSelectedClassesForPromotion] = useState<Set<string>>(
    new Set()
  );
  const [isPromoting, setIsPromoting] = useState(false);

  const userEditedAssignRef = useRef(false);
  const assignTargetKeyRef = useRef('');

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/subjects');
      const data = response?.data;
      const subjectsArray = Array.isArray(data) ? data : data?.data || [];
      setSubjects(
        (Array.isArray(subjectsArray) ? subjectsArray : []).map((subject: any) => ({
          _id: String(subject._id || subject.id || ''),
          id: String(subject._id || subject.id || ''),
          name: String(subject.name || '')
            .split('__deleted__')[0]
            .trim(),
          code: subject.code,
          description: subject.description,
          board: subject.board,
          variantIds: Array.isArray(subject.variantIds)
            ? subject.variantIds.map(String)
            : [String(subject._id || subject.id)],
          classes: Array.isArray(subject.classes)
            ? subject.classes.map((c: any) => ({
                id: String(c.id || c._id || ''),
                classNumber: c.classNumber,
                section: c.section,
              }))
            : [],
        }))
      );
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = Array.isArray(data) ? data : data?.data || [];
      const mappedClasses = classesData.map((cls: any) => ({
        id: String(cls._id || cls.id || ''),
        name:
          cls.name ||
          `Class ${cls.classNumber || ''}${cls.section ? `-${cls.section}` : ''}`,
        classNumber: String(cls.classNumber || 'N/A'),
        section: cls.section || '',
        description: cls.description || 'Auto-created for student',
        studentCount: cls.students?.length || cls.studentCount || 0,
        students: (cls.students || []).map((student: any) => ({
          id: String(student._id || student.id || ''),
          name: student.fullName || student.name || 'Unknown Student',
          email: student.email || '',
          status: student.isActive !== false ? 'active' : 'inactive',
        })),
        teachers: (cls.teachers || []).map((teacher: any) => ({
          id: String(teacher._id || teacher.id || teacher.email || ''),
          name: teacher.fullName || teacher.name || 'Unknown Teacher',
          email: teacher.email || '',
        })),
        assignedSubjects: cls.assignedSubjects || [],
        createdAt: cls.createdAt || new Date().toISOString(),
      }));
      setClasses(mappedClasses);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchClasses(), fetchSubjects()]);
    setRefreshing(false);
  }, [fetchClasses, fetchSubjects]);

  const findClassForAssignSelection = useCallback(
    (classNumber: string, section: string): ClassItem | undefined => {
      const wantNum = normalizeClassNumber(classNumber);
      const wantSection = String(section || '').toUpperCase();
      return classes.find(
        (c) =>
          normalizeClassNumber(c.classNumber) === wantNum &&
          String(c.section || '').toUpperCase() === wantSection
      );
    },
    [classes]
  );

  const sectionsForSelectedClass = useMemo(() => {
    if (!selectedClassForSubjects) return [];
    return classes
      .filter(
        (c) =>
          normalizeClassNumber(c.classNumber) === normalizeClassNumber(selectedClassForSubjects) &&
          c.section
      )
      .sort((a, b) => String(a.section).localeCompare(String(b.section)));
  }, [classes, selectedClassForSubjects]);

  const resolveSubjectIdsForClass = useCallback(
    (classItem: ClassItem | undefined): string[] => {
      if (!classItem || subjects.length === 0) return [];
      const classId = String(classItem.id);
      const resolved = new Set<string>();

      for (const subj of classItem.assignedSubjects || []) {
        const storedId = String(subj.id || subj._id || '');
        if (!storedId) continue;
        const row = subjects.find((s) => subjectRowMatchesStoredId(s, storedId));
        if (row) resolved.add(String(row.id || row._id));
        else {
          const byName = subjects.find(
            (s) => s.name && subj.name && s.name.toLowerCase() === subj.name.toLowerCase()
          );
          if (byName) resolved.add(String(byName.id || byName._id));
        }
      }

      for (const row of subjects) {
        const linked = row.classes || [];
        if (linked.some((c) => subjectIdsMatch(String(c.id), classId))) {
          resolved.add(String(row.id || row._id));
        }
      }

      return [...resolved];
    },
    [subjects]
  );

  const assignTargetKey =
    selectedClassForSubjects && selectedSectionForSubjects
      ? `${normalizeClassNumber(selectedClassForSubjects)}|${String(selectedSectionForSubjects).toUpperCase()}`
      : '';

  useEffect(() => {
    if (!assignTargetKey) {
      assignTargetKeyRef.current = '';
      userEditedAssignRef.current = false;
      setSelectedSubjectIds([]);
      return;
    }

    if (assignTargetKeyRef.current !== assignTargetKey) {
      assignTargetKeyRef.current = assignTargetKey;
      userEditedAssignRef.current = false;
    }

    if (userEditedAssignRef.current) return;

    const [classNumber, section] = assignTargetKey.split('|');
    const classForSection = findClassForAssignSelection(classNumber, section);
    setSelectedSubjectIds(resolveSubjectIdsForClass(classForSection));
  }, [assignTargetKey, findClassForAssignSelection, resolveSubjectIdsForClass]);

  const filteredClasses = useMemo(() => {
    let filtered = classes;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (cls) =>
          cls.name.toLowerCase().includes(query) ||
          cls.classNumber.toLowerCase().includes(query) ||
          cls.section?.toLowerCase().includes(query)
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter((cls) =>
        cls.assignedSubjects?.some(
          (subj: any) => (subj.name || subj.id || subj._id) === selectedSubject
        )
      );
    }

    return filtered;
  }, [classes, searchTerm, selectedSubject]);

  const classSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          classes.flatMap(
            (cls) => cls.assignedSubjects?.map((subj: any) => subj.name || subj.id || subj._id) || []
          )
        )
      ).filter(Boolean),
    [classes]
  );

  const uniqueClassNumbers = useMemo(
    () =>
      Array.from(new Set(classes.map((c) => c.classNumber).filter(Boolean))).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }),
    [classes]
  );

  const totalStudents = useMemo(
    () => classes.reduce((sum, cls) => sum + cls.studentCount, 0),
    [classes]
  );

  const avgClassSize = useMemo(
    () => (classes.length > 0 ? Math.round(totalStudents / classes.length) : 0),
    [classes.length, totalStudents]
  );

  const handleAddClass = async () => {
    if (!newClass.classNumber.trim() || !newClass.section.trim()) {
      Alert.alert('Error', 'Please fill in Class Number and Section.');
      return;
    }

    try {
      await api.post('/api/admin/classes', {
        classNumber: newClass.classNumber.trim(),
        section: newClass.section.trim().toUpperCase(),
        description: newClass.description.trim(),
      });
      setNewClass({ classNumber: '', section: '', description: '' });
      setIsAddClassModalVisible(false);
      fetchClasses();
      Alert.alert('Success', 'Class added successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to add class. Please try again.');
    }
  };

  const openEditClassModal = (cls: ClassItem) => {
    setEditingClassId(cls.id);
    setEditClass({
      classNumber: String(cls.classNumber || ''),
      section: String(cls.section || '').toUpperCase(),
      description: cls.description || '',
    });
    setIsEditClassModalVisible(true);
  };

  const handleEditClass = async () => {
    if (!editingClassId) return;
    const sectionValue = editClass.section.trim().toUpperCase();
    if (!editClass.classNumber.trim() || !sectionValue) {
      Alert.alert('Error', 'Please fill in Class Number and Section.');
      return;
    }
    if (!/^[A-Z0-9]{1,3}$/i.test(sectionValue)) {
      Alert.alert('Error', 'Section must be 1–3 letters or numbers (e.g. A, D, E1).');
      return;
    }

    setIsSavingClass(true);
    try {
      await api.put(`/api/admin/classes/${editingClassId}`, {
        classNumber: editClass.classNumber.trim(),
        section: sectionValue,
        description: editClass.description.trim(),
      });
      setEditingClassId(null);
      setEditClass({ classNumber: '', section: '', description: '' });
      setIsEditClassModalVisible(false);
      fetchClasses();
      Alert.alert('Success', 'Class updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to update class. Please try again.');
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    Alert.alert('Delete Class', 'Are you sure you want to delete this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/admin/classes/${classId}`);
            fetchClasses();
            Alert.alert('Success', 'Class deleted successfully!');
          } catch (error: any) {
            Alert.alert('Error', error?.friendlyMessage || 'Failed to delete class.');
          }
        },
      },
    ]);
  };

  const handleDeleteAllClasses = async () => {
    setIsDeletingAll(true);
    try {
      await api.delete('/api/admin/classes/delete-all');
      setIsDeleteAllModalVisible(false);
      fetchClasses();
      Alert.alert('Success', `All ${classes.length} classes deleted successfully!`);
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to delete all classes.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const toCanonicalSubjectIds = (ids: string[]) => {
    const canonical = new Set<string>();
    for (const raw of ids) {
      const row = subjects.find((s) => subjectRowMatchesStoredId(s, raw));
      const id = String(row?.id || row?._id || raw).trim();
      if (/^[a-f\d]{24}$/i.test(id)) canonical.add(id);
    }
    return [...canonical];
  };

  const handleAssignSubjects = async () => {
    if (!selectedClassForSubjects || !selectedSectionForSubjects) {
      Alert.alert('Validation Error', 'Please select a class number and section.');
      return;
    }

    const classForSection = findClassForAssignSelection(
      selectedClassForSubjects,
      selectedSectionForSubjects
    );

    if (!classForSection?.id) {
      Alert.alert('Class not found', 'Could not find this class section.');
      return;
    }

    setIsAssigningSubjects(true);
    try {
      const response = await api.post(
        `/api/admin/classes/by-id/${encodeURIComponent(classForSection.id)}/assign-subjects`,
        { subjectIds: toCanonicalSubjectIds(selectedSubjectIds) }
      );
      if (response?.data?.success !== false) {
        userEditedAssignRef.current = false;
        await fetchClasses();
        await fetchSubjects();
        Alert.alert(
          'Success',
          response?.data?.message ||
            `Subjects saved for Class ${selectedClassForSubjects} Section ${selectedSectionForSubjects}`
        );
      } else {
        Alert.alert('Error', response?.data?.message || 'Failed to assign subjects.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to assign subjects.');
    } finally {
      setIsAssigningSubjects(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    userEditedAssignRef.current = true;
    setSelectedSubjectIds((prev) => {
      const key = String(subjectId);
      const exists = prev.some((id) => subjectIdsMatch(id, key));
      return exists ? prev.filter((id) => !subjectIdsMatch(id, key)) : [...prev, key];
    });
  };

  const togglePromotionClass = (classId: string) => {
    setSelectedClassesForPromotion((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  const handlePromoteClasses = async () => {
    if (selectedClassesForPromotion.size === 0) {
      Alert.alert('No Classes Selected', 'Please select at least one class to promote.');
      return;
    }

    const classIds = Array.from(selectedClassesForPromotion);
    Alert.alert(
      'Promote Classes',
      `Are you sure you want to promote ${classIds.length} class(es)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            setIsPromoting(true);
            try {
              const response = await api.post('/api/admin/classes/promote', { classIds });
              if (response?.data?.success !== false) {
                setSelectedClassesForPromotion(new Set());
                fetchClasses();
                Alert.alert(
                  'Success',
                  `Successfully promoted ${response?.data?.promotedCount || classIds.length} class(es)!`
                );
              } else {
                Alert.alert('Error', response?.data?.message || 'Failed to promote classes.');
              }
            } catch (error: any) {
              Alert.alert('Error', error?.friendlyMessage || 'Failed to promote classes.');
            } finally {
              setIsPromoting(false);
            }
          },
        },
      ]
    );
  };

  const renderPickerModal = (
    visible: boolean,
    title: string,
    options: { label: string; value: string }[],
    selected: string,
    onSelect: (value: string) => void,
    onClose: () => void
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerSheet,
            modalMaxWidth != null && { maxWidth: modalMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={styles.pickerList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerItem, selected === opt.value && styles.pickerItemActive]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selected === opt.value && styles.pickerItemTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderClassCard = (cls: ClassItem, index: number) => {
    const teacherCount = cls.teachers?.length ?? 0;
    const studentCount = cls.students?.length ?? 0;
    const detailTab = classCardTabById[cls.id] ?? 'teachers';

    const renderTeacherRows = (limit?: number) => {
      const rows = limit != null ? cls.teachers!.slice(0, limit) : cls.teachers!;
      const hidden = teacherCount - rows.length;
      return teacherCount > 0 ? (
        <>
          {rows.map((teacher) => (
          <View
            key={teacher.id}
            style={[styles.teacherItem, { backgroundColor: colors.primaryMuted, borderColor: colors.surfaceBorder }]}
          >
            <View style={[styles.teacherAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.teacherAvatarText}>
                {(teacher.name || 'T').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName} numberOfLines={1}>
                {teacher.name}
              </Text>
              <Text style={styles.teacherEmail} numberOfLines={1}>
                {teacher.email}
              </Text>
            </View>
            <View style={styles.teacherBadge}>
              <Text style={styles.teacherBadgeText}>Teacher</Text>
            </View>
          </View>
          ))}
          {hidden > 0 ? (
            <Text style={styles.listEmptyText}>+{hidden} more teachers</Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.listEmptyText}>No teachers assigned</Text>
      );
    };

    const renderStudentRows = (limit?: number) => {
      const rows = limit != null ? cls.students!.slice(0, limit) : cls.students!;
      const hidden = studentCount - rows.length;
      return studentCount > 0 ? (
        <>
          {rows.map((student) => (
          <View key={student.id} style={styles.studentItem}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName} numberOfLines={1}>
                {student.name}
              </Text>
              <Text style={styles.studentEmail} numberOfLines={1}>
                {student.email}
              </Text>
            </View>
            <View
              style={[
                styles.studentStatusBadge,
                student.status === 'active' ? styles.studentStatusActive : styles.studentStatusInactive,
              ]}
            >
              <Text style={styles.studentStatusText}>{student.status || 'active'}</Text>
            </View>
          </View>
          ))}
          {hidden > 0 ? (
            <Text style={styles.noStudentsText}>+{hidden} more students</Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.noStudentsText}>No students assigned to this class</Text>
      );
    };

    const rosterOpen = rosterOpenById[cls.id] ?? false;

    return (
      <AdminGlassCard
        delay={index * 60}
        style={[styles.classCard, isTablet && styles.classCardTablet]}
        noAnimation={isTablet}
      >
        <View style={styles.classHeader}>
          <View style={[styles.classIconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="school" size={22} color={colors.primary} />
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className} numberOfLines={2}>
              {cls.name}
            </Text>
            <Text style={styles.classDescription} numberOfLines={2}>
              {cls.description}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        <View style={[styles.statsBlock, isTablet && styles.statsBlockTablet]}>
          <View style={[styles.statRow, isTablet && styles.statRowTablet]}>
            <View style={styles.statLeft}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Students:</Text>
            </View>
            <Text style={[styles.statValue, isTablet && styles.statValueTablet, { color: colors.text }]}>
              {cls.studentCount ?? 0}
            </Text>
          </View>
          <View style={[styles.statRow, isTablet && styles.statRowTablet]}>
            <View style={styles.statLeft}>
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Teachers:</Text>
            </View>
            <Text
              style={[
                styles.statValue,
                isTablet && styles.statValueTablet,
                { color: teacherCount === 0 ? colors.primary : colors.text },
              ]}
            >
              {teacherCount > 0
                ? `${teacherCount} ${teacherCount === 1 ? 'teacher' : 'teachers'}`
                : 'No teachers assigned'}
            </Text>
          </View>
          {cls.section ? (
            <View style={[styles.statRow, isTablet && styles.statRowTablet]}>
              <View style={styles.statLeft}>
                <Ionicons name="school-outline" size={16} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Section:</Text>
              </View>
              <Text style={[styles.statValue, isTablet && styles.statValueTablet, { color: colors.text }]}>
                {cls.section}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.cardFooter, isTablet && styles.cardFooterTablet]}>
          {isTablet ? (
            <>
              <View style={styles.cardDetailTabs}>
                <TouchableOpacity
                  style={[
                    styles.cardDetailTab,
                    detailTab === 'teachers' && [
                      styles.cardDetailTabActive,
                      { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setClassCardTabById((prev) => ({ ...prev, [cls.id]: 'teachers' }))}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.cardDetailTabText,
                      detailTab === 'teachers' && { color: colors.primary },
                    ]}
                  >
                    Teachers ({teacherCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cardDetailTab,
                    detailTab === 'students' && [
                      styles.cardDetailTabActive,
                      { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setClassCardTabById((prev) => ({ ...prev, [cls.id]: 'students' }))}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.cardDetailTabText,
                      detailTab === 'students' && { color: colors.primary },
                    ]}
                  >
                    Students ({studentCount})
                  </Text>
                </TouchableOpacity>
              </View>
              <AdminCardScrollBox style={styles.cardDetailScrollTablet}>
                {detailTab === 'teachers' ? renderTeacherRows(12) : renderStudentRows(12)}
              </AdminCardScrollBox>
            </>
          ) : rosterOpen ? (
            <>
              {teacherCount > 0 && (
                <View style={styles.teachersBlock}>
                  <Text style={styles.blockTitle}>Assigned teachers:</Text>
                  <AdminCardScrollBox style={styles.teachersScroll}>{renderTeacherRows(8)}</AdminCardScrollBox>
                </View>
              )}
              <View style={styles.studentsBlock}>
                <Text style={[styles.blockTitle, styles.studentsBlockTitlePhone]}>Students list:</Text>
                <AdminCardScrollBox style={styles.studentsScroll}>{renderStudentRows(8)}</AdminCardScrollBox>
              </View>
              <TouchableOpacity
                style={[styles.rosterToggleBtn, { borderColor: colors.surfaceBorder }]}
                onPress={() => setRosterOpenById((prev) => ({ ...prev, [cls.id]: false }))}
                activeOpacity={0.85}
              >
                <Text style={[styles.rosterToggleText, { color: colors.primary }]}>Hide roster</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.rosterToggleBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.primaryMuted }]}
              onPress={() => setRosterOpenById((prev) => ({ ...prev, [cls.id]: true }))}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <Text style={[styles.rosterToggleText, { color: colors.primary }]}>
                Show roster ({teacherCount} teachers · {studentCount} students)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.classActionsRow, isTablet && styles.classActionsRowTablet]}>
          <TouchableOpacity
            style={[
              styles.editClassBtn,
              isTablet && styles.editClassBtnTablet,
              { borderColor: colors.surfaceBorder, backgroundColor: colors.surface },
            ]}
            onPress={() => openEditClassModal(cls)}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={[styles.editClassBtnText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteClassBtn,
              isTablet && styles.deleteClassBtnTablet,
              { borderColor: colors.dangerMuted, backgroundColor: colors.dangerMuted },
            ]}
            onPress={() => handleDeleteClass(cls.id)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.deleteClassBtnText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </AdminGlassCard>
    );
  };

  const promotableGroups = useMemo(() => {
    const grouped = classes
      .filter((c) => {
        const clean = c.classNumber.replace(/[^-\d]/g, '');
        const num = parseInt(clean, 10);
        const abs = Math.abs(num);
        return !Number.isNaN(num) && abs >= 1 && abs <= 12;
      })
      .reduce<Record<string, ClassItem[]>>((acc, item) => {
        if (!acc[item.classNumber]) acc[item.classNumber] = [];
        acc[item.classNumber].push(item);
        return acc;
      }, {});

    return Object.keys(grouped)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^-\d]/g, ''), 10);
        const numB = parseInt(b.replace(/[^-\d]/g, ''), 10);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map((classNum) => ({
        classNum,
        items: grouped[classNum].sort((a, b) =>
          String(a.section || '').localeCompare(String(b.section || ''))
        ),
      }));
  }, [classes]);

  return (
    <>
    <AdminScreenShell
      refreshing={refreshing}
      onRefresh={onRefresh}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <View style={styles.innerShell}>
      <AdminSectionHeader
        title="Class Management"
        subtitle="Organize and manage your classes and students"
        icon="school-outline"
      />

      {/* Tabs */}
      <View style={[styles.tabBarWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.tabRow}>
          {CLASS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabBtn,
                  active && styles.tabBtnActiveShell,
                  active && { backgroundColor: colors.navActiveBg, borderColor: colors.primaryMuted },
                ]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <View style={[styles.tabBtnInner, { backgroundColor: active ? 'transparent' : colors.bg }]}>
                  <View style={styles.tabBtnContent}>
                    <Ionicons
                      name={tab.icon}
                      size={20}
                      color={active ? colors.navActiveText : colors.textMuted}
                    />
                    <View style={styles.tabLabelWrap}>
                      {tab.lines.map((line, idx) => (
                        <Text
                          key={`${tab.id}-${idx}`}
                          style={[
                            styles.tabBtnText,
                            active && { color: colors.navActiveText },
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {line}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <AdminStatsRow
        items={[
          { label: 'Classes', value: classes.length, icon: 'school', gradientIndex: 0 },
          { label: 'Students', value: totalStudents, icon: 'people', gradientIndex: 1 },
          { label: 'Avg Size', value: avgClassSize, icon: 'stats-chart', gradientIndex: 2 },
          { label: 'Subjects', value: classSubjects.length, icon: 'book-outline', gradientIndex: 3 },
        ]}
      />

      {activeTab === 'classes' && (
        <View style={styles.classesTabContent}>
          <AdminGlassCard delay={80} style={{ marginBottom: spacing.md, padding: spacing.md, gap: spacing.sm }}>
            <View style={styles.toolbarFilters}>
              <AdminSearchBar
                placeholder="Search Classes..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />

              <TouchableOpacity
                style={[
                  styles.selectTrigger,
                  { borderColor: colors.surfaceBorder, backgroundColor: colors.surface },
                ]}
                onPress={() => setSubjectPickerOpen(true)}
              >
                <Text style={[styles.selectTriggerText, { color: colors.text }]}>
                  {selectedSubject === 'all' ? 'All Subjects' : selectedSubject}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              {classes.length > 0 && (
                <AdminScalePressable
                  style={[styles.deleteAllBtn, { backgroundColor: colors.dangerMuted }]}
                  onPress={() => setIsDeleteAllModalVisible(true)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.deleteAllBtnText, { color: colors.danger }]}>Delete All</Text>
                </AdminScalePressable>
              )}
              <AdminScalePressable
                style={[styles.addClassBtn, { backgroundColor: colors.primaryMuted }]}
                onPress={() => setIsAddClassModalVisible(true)}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addClassBtnText, { color: colors.primary }]}>Add Class</Text>
              </AdminScalePressable>
            </View>
          </AdminGlassCard>

          {isLoading ? (
            <AdminSkeletonList count={4} />
          ) : filteredClasses.length === 0 ? (
            <AdminEmptyState
              title="No Classes Found"
              message="Create your first class using Add Class above."
              icon="school-outline"
            />
          ) : isTablet ? (
            <AdminGridList
              data={filteredClasses}
              columns={gridColumns}
              keyExtractor={(item) => String(item.id)}
              renderItem={(item, index) => renderClassCard(item, index)}
            />
          ) : (
            <View style={styles.listContent}>
              {filteredClasses.map((cls, index) => (
                <View key={cls.id} style={styles.listCell}>
                  {renderClassCard(cls, index)}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'assign-subjects' && (
        <AdminGlassCard delay={80} style={styles.panelCard}>
          <Text style={[styles.panelTitle, { color: colors.primary }]}>Assign Subjects To Class</Text>
          <Text style={styles.panelSubtitle}>
            Select a class, section, and subjects for that section only
          </Text>

          <Text style={styles.fieldLabel}>Select Class Number *</Text>
          <TouchableOpacity style={styles.selectTrigger} onPress={() => setClassPickerOpen(true)}>
            <Text style={styles.selectTriggerText}>
              {selectedClassForSubjects
                ? `Class ${selectedClassForSubjects}`
                : 'Choose a class number'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Select Section *</Text>
          <TouchableOpacity
            style={[
              styles.selectTrigger,
              !selectedClassForSubjects && styles.selectDisabled,
            ]}
            onPress={() => selectedClassForSubjects && setSectionPickerOpen(true)}
            disabled={!selectedClassForSubjects}
          >
            <Text style={styles.selectTriggerText}>
              {selectedSectionForSubjects
                ? `Section ${selectedSectionForSubjects}`
                : selectedClassForSubjects
                  ? 'Choose a section'
                  : 'Select class first'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>

          {selectedClassForSubjects && selectedSectionForSubjects ? (
            <Text style={styles.assignHint}>
              Subjects will be assigned to Class {selectedClassForSubjects} Section{' '}
              {selectedSectionForSubjects} only.
            </Text>
          ) : null}

          <Text style={styles.fieldLabel}>Select Subjects *</Text>
          {subjects.length === 0 ? (
            <Text style={styles.emptyHint}>No subjects available. Create subjects first.</Text>
          ) : (
            <ScrollView style={styles.subjectPickScroll} nestedScrollEnabled>
              <View style={styles.subjectPickGrid}>
              {subjects.map((subject) => {
                const subjectKey = String(subject.id || subject._id);
                const checked = selectedSubjectIds.some((id) => subjectIdsMatch(id, subjectKey));
                return (
                  <TouchableOpacity
                    key={subjectKey}
                    style={[
                      styles.subjectPickRow,
                      checked && styles.subjectPickRowActive,
                    ]}
                    onPress={() => handleSubjectToggle(subjectKey)}
                  >
                    <SvgCheckbox checked={checked} size={22} />
                    <View style={styles.subjectPickText}>
                      <Text style={styles.subjectPickName}>{subject.name}</Text>
                      {subject.code ? (
                        <Text style={styles.subjectPickMeta}>Code: {subject.code}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
              </View>
            </ScrollView>
          )}

          <View style={styles.panelFooter}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                userEditedAssignRef.current = false;
                assignTargetKeyRef.current = '';
                setSelectedClassForSubjects('');
                setSelectedSectionForSubjects('');
                setSelectedSubjectIds([]);
              }}
              disabled={isAssigningSubjects}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!selectedClassForSubjects || !selectedSectionForSubjects || isAssigningSubjects) &&
                  styles.btnDisabled,
              ]}
              onPress={handleAssignSubjects}
              disabled={
                !selectedClassForSubjects || !selectedSectionForSubjects || isAssigningSubjects
              }
            >
              <LinearGradient
                colors={[...colors.fabGradient]}
                style={styles.saveBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isAssigningSubjects ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </AdminGlassCard>
      )}

      {activeTab === 'promote-class' && (
        <AdminGlassCard delay={80} style={styles.panelCard}>
          <Text style={[styles.panelTitle, { color: colors.success }]}>Promote Classes</Text>
          <Text style={styles.panelSubtitle}>
            Promote classes to the next grade level. Class 12 becomes Finished Academic Career.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="warning-outline" size={20} color="#2563eb" />
            <View style={styles.infoBoxTextWrap}>
              <Text style={styles.infoBoxText}>
                Select classes to promote. All students in selected classes move to the new class. This
                cannot be undone.
              </Text>
            </View>
          </View>

          <ScrollView style={styles.promoteScroll} nestedScrollEnabled>
            {promotableGroups.length === 0 ? (
              <Text style={styles.emptyHint}>
                No classes available for promotion (Class 1–12 only).
              </Text>
            ) : (
              <View style={styles.promoteGrid}>
              {promotableGroups.map(({ classNum, items }) => (
                <View key={classNum} style={styles.promoteGroup}>
                  <View style={styles.promoteGroupHeader}>
                    <Text style={styles.promoteGroupTitle}>Class {classNum}</Text>
                    <View style={styles.promoteGroupBadge}>
                      <Text style={styles.promoteGroupBadgeText}>
                        {items.length} section{items.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  {items.map((classItem) => {
                    const clean = classItem.classNumber.replace(/[^-\d]/g, '');
                    const absNum = Math.abs(parseInt(clean, 10));
                    const willFinish = absNum === 12;
                    const isSelected = selectedClassesForPromotion.has(classItem.id);
                    return (
                      <TouchableOpacity
                        key={classItem.id}
                        style={[styles.promoteItem, isSelected && styles.promoteItemActive]}
                        onPress={() => togglePromotionClass(classItem.id)}
                      >
                        <SvgCheckbox checked={isSelected} size={22} />
                        <View style={styles.promoteItemText}>
                          <Text style={styles.promoteItemTitle}>
                            Section {classItem.section || '—'}
                          </Text>
                          <Text style={styles.promoteItemMeta}>
                            {classItem.studentCount} students →{' '}
                            {willFinish ? 'Finished Academic Career' : `Class ${absNum + 1}`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.panelFooter}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setSelectedClassesForPromotion(new Set())}
              disabled={isPromoting || selectedClassesForPromotion.size === 0}
            >
              <Text style={styles.clearBtnText}>Clear Selection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (isPromoting || selectedClassesForPromotion.size === 0) && styles.btnDisabled,
              ]}
              onPress={handlePromoteClasses}
              disabled={isPromoting || selectedClassesForPromotion.size === 0}
            >
              <LinearGradient
                colors={[colors.success, '#10b981']}
                style={styles.saveBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isPromoting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="arrow-up" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      Promote {selectedClassesForPromotion.size} Class
                      {selectedClassesForPromotion.size !== 1 ? 'es' : ''}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </AdminGlassCard>
      )}

      </View>

      {renderPickerModal(
        subjectPickerOpen,
        'Filter by subject',
        [{ label: 'All Subjects', value: 'all' }, ...classSubjects.map((s) => ({ label: s, value: s }))],
        selectedSubject,
        setSelectedSubject,
        () => setSubjectPickerOpen(false)
      )}

      {renderPickerModal(
        classPickerOpen,
        'Select Class Number',
        uniqueClassNumbers.map((cn) => {
          const sections = classes.filter((c) => c.classNumber === cn);
          const total = sections.reduce((sum, c) => sum + (c.studentCount || 0), 0);
          return {
            label: `Class ${cn} (${sections.length} section${sections.length !== 1 ? 's' : ''}, ${total} students)`,
            value: cn,
          };
        }),
        selectedClassForSubjects,
        (value) => {
          userEditedAssignRef.current = false;
          assignTargetKeyRef.current = '';
          setSelectedClassForSubjects(value);
          setSelectedSectionForSubjects('');
          setSelectedSubjectIds([]);
        },
        () => setClassPickerOpen(false)
      )}

      {renderPickerModal(
        sectionPickerOpen,
        'Select Section',
        sectionsForSelectedClass.map((c) => ({
          label: `Section ${c.section} (${c.studentCount || 0} students)`,
          value: String(c.section),
        })),
        selectedSectionForSubjects,
        setSelectedSectionForSubjects,
        () => setSectionPickerOpen(false)
      )}

      <Modal
        visible={isDeleteAllModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isDeletingAll && setIsDeleteAllModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, modalMaxWidth != null && { maxWidth: modalMaxWidth }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={24} color="#dc2626" />
              <Text style={styles.modalTitleDanger}>Delete All Classes?</Text>
            </View>
            <Text style={styles.modalBodyText}>
              This will permanently delete all {classes.length} classes. This action cannot be undone.
            </Text>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsDeleteAllModalVisible(false)}
                disabled={isDeletingAll}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleDeleteAllClasses}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.dangerButtonText}>Delete All Classes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAddClassModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddClassModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, modalMaxWidth != null && { maxWidth: modalMaxWidth }]}>
            <View style={[styles.modalHeaderSky, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalTitleWhite}>Add New Class</Text>
              <TouchableOpacity
                onPress={() => setIsAddClassModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close add class form"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Class Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 6, 7, 10"
                  value={newClass.classNumber}
                  onChangeText={(text) => setNewClass({ ...newClass, classNumber: text })}
                  placeholderTextColor="#5B6779"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Section *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="A, B, or C"
                  value={newClass.section}
                  onChangeText={(text) =>
                    setNewClass({ ...newClass, section: text.toUpperCase().slice(0, 1) })
                  }
                  maxLength={1}
                  autoCapitalize="characters"
                  placeholderTextColor="#5B6779"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Optional Description"
                  value={newClass.description}
                  onChangeText={(text) => setNewClass({ ...newClass, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#5B6779"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddClassModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButtonWrap} onPress={handleAddClass}>
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Add Class</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEditClassModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isSavingClass) {
            setIsEditClassModalVisible(false);
            setEditingClassId(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, modalMaxWidth != null && { maxWidth: modalMaxWidth }]}>
            <View style={[styles.modalHeaderSky, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalTitleWhite}>Edit Class</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!isSavingClass) {
                    setIsEditClassModalVisible(false);
                    setEditingClassId(null);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Close edit class form"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Class Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 6, 7, 10"
                  value={editClass.classNumber}
                  onChangeText={(text) => setEditClass({ ...editClass, classNumber: text })}
                  placeholderTextColor="#5B6779"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Section *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="A, B, or C"
                  value={editClass.section}
                  onChangeText={(text) =>
                    setEditClass({
                      ...editClass,
                      section: text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3),
                    })
                  }
                  maxLength={3}
                  autoCapitalize="characters"
                  placeholderTextColor="#5B6779"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Optional Description"
                  value={editClass.description}
                  onChangeText={(text) => setEditClass({ ...editClass, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#5B6779"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={isSavingClass}
                onPress={() => {
                  setIsEditClassModalVisible(false);
                  setEditingClassId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButtonWrap}
                onPress={handleEditClass}
                disabled={isSavingClass}
              >
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSavingClass ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  innerShell: {
    width: '100%',
    flexDirection: 'column',
  },
  classesTabContent: {
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
  toolbarFilters: {
    gap: 10,
  },
  tabBarWrap: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabBtnActiveShell: {},
  tabBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    minHeight: 72,
  },
  tabBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    minHeight: 72,
    borderRadius: 12,
  },
  tabBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabelWrap: {
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 46, fontSize: 15, color: '#0f172a' },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectDisabled: { opacity: 0.55 },
  selectTriggerText: { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  deleteAllBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  deleteAllBtnText: { fontWeight: '700', fontSize: 14 },
  addClassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  addClassBtnText: { fontWeight: '700', fontSize: 14 },
  classCard: { padding: 14, marginBottom: 0 },
  classCardTablet: {
    width: '100%',
    minHeight: 468,
    flexDirection: 'column',
  },
  cardFooter: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  cardFooterTablet: {
    flex: 1,
    minHeight: 0,
    marginBottom: 10,
  },
  classHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  classIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classInfo: { flex: 1, minWidth: 0 },
  className: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  classDescription: { fontSize: 12, color: '#64748b' },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  statsBlock: { gap: 4, marginBottom: 12 },
  statsBlockTablet: { gap: 6 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statRowTablet: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 13, color: '#0369a1', fontWeight: '600' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#0c4a6e' },
  statValueTablet: {
    paddingLeft: 24,
    textAlign: 'left',
  },
  statValueMuted: { color: '#0ea5e9', fontWeight: '600' },
  blockTitle: { fontSize: 13, fontWeight: '800', color: '#0c4a6e', marginBottom: 8 },
  rosterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  rosterToggleText: { fontSize: 13, fontWeight: '700' },
  teachersBlock: { marginBottom: 12 },
  teachersScroll: { width: '100%', maxWidth: '100%', alignSelf: 'stretch', maxHeight: 160 },
  cardDetailTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  cardDetailTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  cardDetailTabActive: {
    borderWidth: 1,
  },
  cardDetailTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  cardDetailScrollTablet: {
    width: '100%',
    height: 196,
    maxHeight: 196,
  },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  teacherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  teacherInfo: { flex: 1, minWidth: 0 },
  teacherName: { fontSize: 14, fontWeight: '700', color: '#0c4a6e' },
  teacherEmail: { fontSize: 12, color: '#64748b' },
  teacherBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  teacherBadgeText: { fontSize: 10, fontWeight: '700', color: '#0369a1' },
  studentsBlock: { marginBottom: 12 },
  studentsBlockTitlePhone: { marginBottom: 8 },
  studentsScroll: { width: '100%', maxWidth: '100%', alignSelf: 'stretch', maxHeight: 200 },
  listEmptyText: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingVertical: 8 },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  studentName: { fontSize: 13, fontWeight: '700', color: '#0c4a6e' },
  studentEmail: { fontSize: 12, color: '#64748b' },
  studentStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  studentStatusActive: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#10b981' },
  studentStatusInactive: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' },
  studentStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  noStudentsText: { fontSize: 13, color: '#64748b', textAlign: 'center', paddingVertical: 8 },
  classActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  classActionsRowTablet: {
    marginTop: 0,
  },
  editClassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
  },
  editClassBtnTablet: {
    flexShrink: 0,
  },
  editClassBtnText: { fontSize: 13, fontWeight: '700', color: '#0284c7' },
  deleteClassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    marginTop: 0,
    width: undefined,
  },
  deleteClassBtnTablet: {
    flexShrink: 0,
    marginTop: 0,
  },
  deleteClassBtnText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  panelCard: { marginBottom: 16, padding: 16 },
  panelTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  panelSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8, marginTop: 8 },
  assignHint: { fontSize: 13, color: '#64748b', marginVertical: 8 },
  subjectPickScroll: { maxHeight: 280, marginTop: 8 },
  subjectPickGrid: {
    gap: 8,
  },
  subjectPickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  subjectPickRowActive: { borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.08)' },
  subjectPickText: { flex: 1 },
  subjectPickName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  subjectPickMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  clearBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  clearBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  saveBtn: { borderRadius: 12, overflow: 'hidden', minWidth: 100 },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoBoxTextWrap: { flex: 1, minWidth: 0 },
  infoBoxText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },
  promoteScroll: { maxHeight: 360 },
  promoteGrid: {
    gap: 0,
  },
  promoteGroup: { marginBottom: 16 },
  promoteGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  promoteGroupTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  promoteGroupBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  promoteGroupBadgeText: { fontSize: 11, color: '#64748b' },
  promoteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 8,
  },
  promoteItemActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  promoteItemText: { flex: 1 },
  promoteItemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  promoteItemMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  loadingContainer: { paddingVertical: 32, alignItems: 'center' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  pickerList: { maxHeight: 360 },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
  },
  pickerItemActive: { backgroundColor: 'rgba(15, 118, 110, 0.12)' },
  pickerItemText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  pickerItemTextActive: { color: '#4F46E5' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  modalHeaderSky: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  modalTitleDanger: { fontSize: 17, fontWeight: '800', color: '#991b1b', flex: 1 },
  modalTitleWhite: { fontSize: 17, fontWeight: '800', color: '#fff' },
  modalBodyText: { padding: 16, fontSize: 14, color: '#64748b', lineHeight: 20 },
  modalBody: { padding: 14 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#111827',
  },
  formTextArea: { minHeight: 72, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  dangerButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  dangerButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  submitButtonWrap: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  submitButtonGradient: { padding: 12, alignItems: 'center' },
  submitButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
