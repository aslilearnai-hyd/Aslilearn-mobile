import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

interface Remark {
  _id: string;
  student?: {
    _id: string;
    fullName: string;
    email: string;
  };
  studentId?: {
    _id: string;
    fullName: string;
    email: string;
  };
  subject?: string | { _id: string; name: string };
  text?: string;
  remark?: string;
  isPositive: boolean;
  createdAt: string;
  createdBy?: {
    _id: string;
    fullName: string;
  };
}

export default function TeacherRemarksView() {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('general');
  const [remarkText, setRemarkText] = useState('');
  const [isPositive, setIsPositive] = useState(true);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  useEffect(() => {
    fetchRemarks();
    fetchStudents();
    fetchSubjects();
  }, []);

  const fetchRemarks = async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.remarks();
      setRemarks(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch remarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await teacherService.students();
      setStudents(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await teacherService.subjects();
      setSubjects(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleCreateRemark = async () => {
    if (!selectedStudent || !remarkText.trim()) {
      Alert.alert('Validation Error', 'Please Select A Student And Enter A Remark');
      return;
    }

    try {
      await teacherService.createRemark({
        studentId: selectedStudent,
        subject: selectedSubject,
        text: remarkText.trim(),
        isPositive,
      });
      Alert.alert('Success', 'Remark Added Successfully');
      setIsCreateModalOpen(false);
      setSelectedStudent('');
      setRemarkText('');
      setSelectedSubject('general');
      setIsPositive(true);
      await teacherService.invalidateCache('remarks');
      fetchRemarks();
    } catch {
      Alert.alert('Error', 'Failed to add remark');
    }
  };

  const filteredRemarks = remarks.filter(remark => {
    const matchesStudent = filterStudent === 'all' || remark.student?._id === filterStudent;
    const matchesSubject = filterSubject === 'all' || remark.subject === filterSubject;
    return matchesStudent && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEACHER.primary} />
        <Text style={styles.loadingText}>Loading Remarks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <GlassPanel style={styles.filtersContainer} radius={TEACHER_RADIUS.lg} tone="light">
        <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterStudent === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStudent('all')}
          >
            <Text style={[styles.filterChipText, filterStudent === 'all' && styles.filterChipTextActive]}>
              All Students
            </Text>
          </TouchableOpacity>
          {students.map(student => (
            <TouchableOpacity
              key={student._id || student.id}
              style={[styles.filterChip, filterStudent === (student._id || student.id) && styles.filterChipActive]}
              onPress={() => setFilterStudent(student._id || student.id)}
            >
              <Text style={[styles.filterChipText, filterStudent === (student._id || student.id) && styles.filterChipTextActive]}>
                {student.fullName || student.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, filterSubject === (subject._id || subject.id || subject.name) && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id || subject.id || subject.name)}
            >
              <Text style={[styles.filterChipText, filterSubject === (subject._id || subject.id || subject.name) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </GlassPanel>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setIsCreateModalOpen(true)} activeOpacity={0.85}>
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.addButtonGrad}>
          <Ionicons name="add" size={24} color={TEACHER.textOnPrimary} />
          <Text style={styles.addButtonText}>Add Remark</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Remarks List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {filteredRemarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color={TEACHER.textMuted} />
            <Text style={styles.emptyText}>No Remarks Found</Text>
            <Text style={styles.emptySubtext}>Add Your First Remark To Get Started</Text>
          </View>
        ) : (
          filteredRemarks.map((remark, index) => (
            <Animated.View key={remark._id} entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}>
              <GlassPanel style={styles.remarkCard} radius={TEACHER_RADIUS.lg} tone="strong">
              <View style={styles.remarkHeader}>
                <View style={styles.studentInfo}>
                  <View style={[styles.remarkIcon, remark.isPositive ? styles.remarkIconPositive : styles.remarkIconNegative]}>
                    <Ionicons
                      name={remark.isPositive ? 'thumbs-up' : 'thumbs-down'}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>{remark.student?.fullName || remark.studentId?.fullName || 'Unknown Student'}</Text>
                    <Text style={styles.studentEmail}>{remark.student?.email || remark.studentId?.email || ''}</Text>
                  </View>
                </View>
                <View style={[styles.typeBadge, remark.isPositive ? styles.typeBadgePositive : styles.typeBadgeNegative]}>
                  <Text style={[styles.typeBadgeText, remark.isPositive ? styles.typeBadgeTextPositive : styles.typeBadgeTextNegative]}>
                    {remark.isPositive ? 'Positive' : 'Needs Improvement'}
                  </Text>
                </View>
              </View>

              <View style={styles.remarkContent}>
                <Text style={styles.subjectLabel}>
                  Subject: {typeof remark.subject === 'object' ? remark.subject?.name || 'General' : remark.subject || 'General'}
                </Text>
                <Text style={styles.remarkText}>{remark.remark || remark.text}</Text>
              </View>

              <View style={styles.remarkFooter}>
                <Text style={styles.createdBy}>
                  By {remark.createdBy?.fullName || 'Teacher'}
                </Text>
                <Text style={styles.createdAt}>
                  {new Date(remark.createdAt).toLocaleDateString()}
                </Text>
              </View>
              </GlassPanel>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCreateModalOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Remark</Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Ionicons name="close" size={24} color={TEACHER.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Student *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {students.map(student => (
                  <TouchableOpacity
                    key={student._id || student.id}
                    style={[
                      styles.studentChip,
                      selectedStudent === (student._id || student.id) && styles.studentChipActive
                    ]}
                    onPress={() => setSelectedStudent(student._id || student.id)}
                  >
                    <Text style={[
                      styles.studentChipText,
                      selectedStudent === (student._id || student.id) && styles.studentChipTextActive
                    ]}>
                      {student.fullName || student.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.subjectChip,
                    selectedSubject === 'general' && styles.subjectChipActive
                  ]}
                  onPress={() => setSelectedSubject('general')}
                >
                  <Text style={[
                    styles.subjectChipText,
                    selectedSubject === 'general' && styles.subjectChipTextActive
                  ]}>
                    General
                  </Text>
                </TouchableOpacity>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      selectedSubject === (subject._id || subject.id || subject.name) && styles.subjectChipActive
                    ]}
                    onPress={() => setSelectedSubject(subject._id || subject.id || subject.name)}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      selectedSubject === (subject._id || subject.id || subject.name) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, isPositive && styles.typeButtonActive]}
                  onPress={() => setIsPositive(true)}
                >
                  <Ionicons name="thumbs-up" size={20} color={isPositive ? TEACHER.textOnPrimary : TEACHER.textMuted} />
                  <Text style={[styles.typeButtonText, isPositive && styles.typeButtonTextActive]}>
                    Positive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, !isPositive && styles.typeButtonActive]}
                  onPress={() => setIsPositive(false)}
                >
                  <Ionicons name="thumbs-down" size={20} color={!isPositive ? TEACHER.textOnPrimary : TEACHER.textMuted} />
                  <Text style={[styles.typeButtonText, !isPositive && styles.typeButtonTextActive]}>
                    Needs Improvement
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Remark *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter Your Remark..."
                placeholderTextColor={TEACHER.textMuted}
                value={remarkText}
                onChangeText={setRemarkText}
                multiline
                numberOfLines={6}
              />
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateRemark} activeOpacity={0.85}>
              <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.createButtonGrad}>
                <Text style={styles.createButtonText}>Add Remark</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 12,
    ...TEACHER_TYPO.body,
    color: TEACHER.textMuted,
  },
  filtersContainer: {
    ...glassCard,
    // GlassPanel supplies the frosted fill.
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    margin: TEACHER_SPACING.lg,
    marginBottom: 0,
  },
  // Child layout, kept inside GlassPanel's content wrapper.
  filtersRow: {
    gap: 12,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  filterChipTextActive: {
    color: TEACHER.textOnPrimary,
  },
  addButton: {
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
    margin: TEACHER_SPACING.lg,
  },
  addButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    color: TEACHER.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: TEACHER_SPACING.lg,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...TEACHER_TYPO.section,
    fontSize: 20,
    color: TEACHER.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: TEACHER.textMuted,
    textAlign: 'center',
  },
  remarkCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
  },
  remarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  remarkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remarkIconPositive: {
    backgroundColor: TEACHER.success,
  },
  remarkIconNegative: {
    backgroundColor: TEACHER.danger,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    ...TEACHER_TYPO.body,
    fontWeight: '700',
    color: TEACHER.text,
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgePositive: {
    backgroundColor: 'rgba(0,214,143,0.18)',
    borderWidth: 1,
    borderColor: TEACHER.success,
  },
  typeBadgeNegative: {
    backgroundColor: 'rgba(255,77,106,0.18)',
    borderWidth: 1,
    borderColor: TEACHER.danger,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadgeTextPositive: {
    color: TEACHER.success,
  },
  typeBadgeTextNegative: {
    color: TEACHER.danger,
  },
  remarkContent: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  subjectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEACHER.textMuted,
    marginBottom: 8,
  },
  remarkText: {
    fontSize: 14,
    color: TEACHER.text,
    lineHeight: 20,
  },
  remarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  createdBy: {
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  createdAt: {
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
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
    fontSize: 20,
    color: TEACHER.text,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.sm,
    padding: 12,
    fontSize: 16,
    color: TEACHER.text,
    backgroundColor: TEACHER.surfaceElevated,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  studentChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginRight: 8,
  },
  studentChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  studentChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  studentChipTextActive: {
    color: TEACHER.textOnPrimary,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginRight: 8,
  },
  subjectChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  subjectChipTextActive: {
    color: TEACHER.textOnPrimary,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.sm,
    padding: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: TEACHER.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
  typeButtonTextActive: {
    color: TEACHER.textOnPrimary,
  },
  createButton: {
    borderRadius: TEACHER_RADIUS.sm,
    overflow: 'hidden',
    marginTop: 8,
  },
  createButtonGrad: {
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: TEACHER.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});


