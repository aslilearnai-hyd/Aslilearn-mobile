import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import HomeworkSubmissionsView from './HomeworkSubmissionsView';
import TrackProgressView from './TrackProgressView';
import WorkDiaryView from './WorkDiaryView';
import { SubNavChips, StudentListCard, TeacherPageHero } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import {
  buildAssignedClassRows,
  filterAssignedClassRows,
  groupAssignedClassesByNumber,
  sectionDisplayLabel,
  type AssignedClassRow,
  type StudentRow,
} from '../../../src/lib/students-ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

type StudentsSubTab = 'list' | 'track-progress' | 'submissions' | 'daily' | 'remarks';

const STUDENT_SUB_TABS = [
  { id: 'list', label: 'Student List', shortLabel: 'List', icon: 'people' as const },
  { id: 'track-progress', label: 'Track Progress', shortLabel: 'Progress', icon: 'bar-chart' as const },
  { id: 'submissions', label: 'Submissions', shortLabel: 'Submit', icon: 'document-text' as const },
  { id: 'daily', label: 'Diary', shortLabel: 'Diary', icon: 'bookmark' as const },
];

type Props = {
  initialSubTab?: StudentsSubTab;
  progressClassFilter?: string;
  progressStudentId?: string;
  onCloseStudentAnalysis?: () => void;
  hideSubNav?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  heroIcon?: keyof typeof Ionicons.glyphMap;
};

interface Student extends StudentRow {
  performance?: StudentRow['performance'];
}

export default function StudentsView({
  initialSubTab,
  progressClassFilter,
  progressStudentId,
  onCloseStudentAnalysis,
  hideSubNav,
  heroTitle = 'Students',
  heroSubtitle = 'Roster, Progress, Homework Submissions, And Daily Diary.',
  heroIcon = 'people-outline',
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<StudentsSubTab>(initialSubTab || 'list');
  const [assignedClassRows, setAssignedClassRows] = useState<AssignedClassRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedClassNumbers, setExpandedClassNumbers] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isRemarkModalVisible, setIsRemarkModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [isPositiveRemark, setIsPositiveRemark] = useState(true);
  const [selectedSubjectForRemark, setSelectedSubjectForRemark] = useState('general');
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchTeacherSubjects();
  }, []);

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const [classesRes, perfRes] = await Promise.all([
        teacherService.classes(),
        teacherService.studentsPerformance().catch(() => ({ data: [] as any[] })),
      ]);
      const classesData = Array.isArray(classesRes.data) ? classesRes.data : [];
      const perfData = Array.isArray(perfRes.data) ? perfRes.data : [];
      setAssignedClassRows(buildAssignedClassRows(classesData, perfData));
    } catch {
      setAssignedClassRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeacherSubjects = async () => {
    try {
      const res = await teacherService.subjects();
      setTeacherSubjects(asArray(res.data));
    } catch (error) {
      console.error('[StudentsView] Failed to fetch subjects:', error);
    }
  };

  const handleAddRemark = async () => {
    if (!selectedStudent) {
      Alert.alert('Validation', 'Please select a student first.');
      return;
    }
    if (!remarkText.trim()) {
      Alert.alert('Validation', 'Remark is required. Please enter a remark before submitting.');
      return;
    }

    setIsSubmittingRemark(true);
    try {
      await teacherService.sendRemark(selectedStudent.id, {
        remark: remarkText.trim(),
        subject: selectedSubjectForRemark !== 'general' ? selectedSubjectForRemark : null,
        isPositive: isPositiveRemark,
      });
      Alert.alert('Success', 'Remark added successfully!');
      setIsRemarkModalVisible(false);
      setRemarkText('');
      setSelectedStudent(null);
      setSelectedSubjectForRemark('general');
      setIsPositiveRemark(true);
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const classGroups = useMemo(
    () => groupAssignedClassesByNumber(filterAssignedClassRows(assignedClassRows, searchTerm)),
    [assignedClassRows, searchTerm],
  );

  const totalStudentCount = useMemo(
    () => assignedClassRows.reduce((sum, row) => sum + row.students.length, 0),
    [assignedClassRows],
  );

  const filteredStudentCount = useMemo(
    () => classGroups.reduce((sum, g) => sum + g.totalStudents, 0),
    [classGroups],
  );

  const toggleClassNumber = (classNumber: string) => {
    setExpandedClassNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(classNumber)) next.delete(classNumber);
      else next.add(classNumber);
      return next;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const renderClassWiseList = () => {
    if (classGroups.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyText}>
            {searchTerm.trim() ? 'No Students Match Your Search' : 'No Students In Assigned Classes'}
          </Text>
        </View>
      );
    }

    return (
      <GlassPanel style={styles.classListCard} radius={TEACHER_RADIUS.lg} tone="strong">
        <Text style={styles.classListTitle}>My Assigned Classes</Text>
        {classGroups.map((group) => {
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
                  {group.totalStudents} Student{group.totalStudents !== 1 ? 's' : ''}
                </Text>
              </Pressable>

              {classExpanded ? (
                <View style={styles.classBody}>
                  {group.sections.map((section) => {
                    const sectionExpanded = expandedSections.has(section.id);
                    return (
                      <GlassPanel
                        key={section.id}
                        style={styles.sectionBlock}
                        radius={TEACHER_RADIUS.md}
                        tone="light"
                      >
                        <Pressable
                          style={[styles.sectionRow, sectionExpanded && styles.sectionRowActive]}
                          onPress={() => toggleSection(section.id)}
                        >
                          <Ionicons
                            name={sectionExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={TEACHER.primaryLight}
                          />
                          <View style={styles.sectionRowLabelWrap}>
                            <Text style={styles.sectionRowLabel}>
                              {sectionDisplayLabel(section.section)}
                            </Text>
                          </View>
                          <Text style={styles.sectionRowCount}>
                            {section.students.length} Student
                            {section.students.length !== 1 ? 's' : ''}
                          </Text>
                        </Pressable>

                        {sectionExpanded ? (
                          <View style={styles.sectionBody}>
                            {section.students.map((student, index) => (
                              <Animated.View
                                key={student.id}
                                entering={FadeInDown.duration(350).delay(Math.min(index * 40, 320))}
                              >
                                <StudentListCard
                                  student={student}
                                  onAddRemark={() => {
                                    setSelectedStudent(student);
                                    setIsRemarkModalVisible(true);
                                  }}
                                />
                              </Animated.View>
                            ))}
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
    );
  };

  const analysisOnly = Boolean(progressStudentId);

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap}>
        <TeacherPageHero
          title={heroTitle}
          subtitle={heroSubtitle}
          icon={heroIcon}
        />
      </View>
      {!analysisOnly && !hideSubNav ? (
        <View style={styles.subNavBar}>
          <SubNavChips
            items={STUDENT_SUB_TABS}
            active={activeSubTab}
            onChange={(id) => setActiveSubTab(id as StudentsSubTab)}
            variant="students"
          />
        </View>
      ) : null}

      {activeSubTab === 'list' && !analysisOnly && !hideSubNav ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.countHeader}>
            <Text style={styles.countTitle}>{filteredStudentCount} Students</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalStudentCount}</Text>
            </View>
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students by name, email, or phone..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={TEACHER.textMuted}
            />
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={TEACHER.primary} />
            </View>
          ) : (
            renderClassWiseList()
          )}
        </ScrollView>
      ) : (
        <View style={styles.subTabBody}>
          {(activeSubTab === 'track-progress' || analysisOnly) && (
            <TrackProgressView
              initialClassFilter={progressClassFilter}
              initialStudentId={progressStudentId}
              analysisOnly={analysisOnly}
              onCloseAnalysis={onCloseStudentAnalysis}
            />
          )}
          {activeSubTab === 'submissions' && <HomeworkSubmissionsView />}
          {activeSubTab === 'daily' && <WorkDiaryView />}
        </View>
      )}

      {/* Add Remark Modal */}
      <Modal
        visible={isRemarkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRemarkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassPanel style={styles.modalContent} radius={24} tone="strong">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add Remark For {selectedStudent?.name}
              </Text>
              <TouchableOpacity onPress={() => setIsRemarkModalVisible(false)}>
                <Ionicons name="close" size={28} color={TEACHER.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Remark Type</Text>
                <View style={styles.remarkTypeButtons}>
                  <TouchableOpacity
                    style={[styles.remarkTypeButton, isPositiveRemark && styles.remarkTypeButtonActive]}
                    onPress={() => setIsPositiveRemark(true)}
                  >
                    <Text style={[styles.remarkTypeButtonText, isPositiveRemark && styles.remarkTypeButtonTextActive]}>
                      Positive
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.remarkTypeButton, !isPositiveRemark && styles.remarkTypeButtonActiveNegative]}
                    onPress={() => setIsPositiveRemark(false)}
                  >
                    <Text style={[styles.remarkTypeButtonText, !isPositiveRemark && styles.remarkTypeButtonTextActiveNegative]}>
                      Needs Improvement
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject (Optional)</Text>
                <View style={styles.subjectSelector}>
                  <Text style={styles.subjectSelectorText}>
                    {selectedSubjectForRemark === 'general' 
                      ? 'General Remark' 
                      : teacherSubjects.find(s => (s._id || s.id) === selectedSubjectForRemark)?.name || 'General Remark'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Remark *</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Enter Your Remark Here..."
                  value={remarkText}
                  onChangeText={setRemarkText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsRemarkModalVisible(false);
                  setRemarkText('');
                  setSelectedStudent(null);
                  setSelectedSubjectForRemark('general');
                  setIsPositiveRemark(true);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddRemark}
                disabled={isSubmittingRemark || !remarkText.trim()}
              >
                <LinearGradient
                  colors={[TEACHER.primary, TEACHER.primaryDark]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmittingRemark ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Remark</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so AppBackground's artwork shows through.
    backgroundColor: 'transparent',
  },
  heroWrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: TEACHER_SPACING.md,
  },
  subNavBar: {
    backgroundColor: 'transparent',
    paddingTop: TEACHER_SPACING.xs,
    zIndex: 20,
    elevation: 4,
  },
  countHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: TEACHER_SPACING.lg,
    marginTop: TEACHER_SPACING.sm,
    marginBottom: TEACHER_SPACING.sm,
  },
  countTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  countBadge: {
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: TEACHER.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabsContainer: {
    backgroundColor: TEACHER.surfaceElevated,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subTabsScroll: {
    paddingHorizontal: 20,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  subTabActive: {
    backgroundColor: '#d1fae5',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  subTabTextActive: {
    color: '#10b981',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    backgroundColor: TEACHER.surface,
    borderWidth: 2,
    borderColor: '#A5B4FC',
    borderRadius: TEACHER_RADIUS.pill,
    paddingHorizontal: 16,
    height: 46,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: TEACHER.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  classListCard: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.lg,
    ...glassCard,
    // GlassPanel supplies the frosted fill; glassCard's opaque bg would hide it.
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#A5B4FC',
  },
  classListTitle: {
    ...TEACHER_TYPO.label,
    color: TEACHER.textMuted,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: '#C7D2FE',
  },
  classRowActive: { backgroundColor: TEACHER.navActiveBg },
  classRowLabelWrap: { flex: 1, minWidth: 0 },
  classRowLabel: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  classRowCount: { fontSize: 12, color: TEACHER.textMuted },
  classBody: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    backgroundColor: 'rgba(99,102,241,0.04)',
    borderTopWidth: 2,
    borderTopColor: '#C7D2FE',
  },
  sectionBlock: {
    marginTop: 4,
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#A5B4FC',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  sectionRowActive: { backgroundColor: TEACHER.navActiveBg },
  sectionRowLabelWrap: { flex: 1, minWidth: 0 },
  sectionRowLabel: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  sectionRowCount: { fontSize: 11, color: TEACHER.textMuted },
  sectionBody: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 6,
    borderTopWidth: 2,
    borderTopColor: '#C7D2FE',
    backgroundColor: 'rgba(99,102,241,0.03)',
  },
  subTabBody: {
    flex: 1,
    minHeight: 0,
  },
  studentCard: {
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    elevation: 0,
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  studentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  remarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  remarkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  addRemarkButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addRemarkButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  addRemarkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginHorizontal: TEACHER_SPACING.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEACHER.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.40)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  modalTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
    marginBottom: 8,
  },
  remarkTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  remarkTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
  },
  remarkTypeButtonActive: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: TEACHER.success,
  },
  remarkTypeButtonActiveNegative: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: TEACHER.danger,
  },
  remarkTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
  remarkTypeButtonTextActive: {
    color: TEACHER.success,
  },
  remarkTypeButtonTextActiveNegative: {
    color: TEACHER.danger,
  },
  subjectSelector: {
    backgroundColor: TEACHER.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  subjectSelectorText: {
    fontSize: 16,
    color: TEACHER.text,
  },
  textArea: {
    backgroundColor: TEACHER.surface,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: TEACHER.text,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    minHeight: 120,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  progressList: {
    padding: 20,
    gap: 16,
  },
  progressCard: {
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    elevation: 0,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  studentClass: {
    fontSize: 12,
    color: '#5B6779',
    marginTop: 2,
  },
  progressMetrics: {
    gap: 16,
  },
  metricItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#5B6779',
  },
});





