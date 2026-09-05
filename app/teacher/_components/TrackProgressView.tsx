import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { formatPersonName } from '../../../src/lib/teacher-text';
import TeacherExamPaperReview from './TeacherExamPaperReview';
import {
  buildProgressAiSummaryPayload,
  formatClassBadge,
  formatLastLogin,
  performerCounts,
  progressStatusLabel,
  progressTier,
  type StudentRow,
} from '../../../src/lib/students-ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, PERFORMANCE_COLORS, glassCard } from '../../../src/theme/teacher';

type Props = {
  initialClassFilter?: string;
  initialStudentId?: string;
  /** When true, show only the student analysis screen (no progress class tree). */
  analysisOnly?: boolean;
  onCloseAnalysis?: () => void;
};

type AssignedClassRow = {
  id: string;
  classNumber: string;
  section?: string;
  label: string;
  students: StudentRow[];
};

type ClassGroup = {
  classNumber: string;
  sections: AssignedClassRow[];
  totalStudents: number;
};

function classDisplayLabel(row: Pick<AssignedClassRow, 'classNumber' | 'section' | 'label'>) {
  if (row.classNumber && row.section) return `${row.classNumber}${row.section}`;
  return row.classNumber || row.label;
}

function sectionDisplayLabel(section?: string) {
  const trimmed = String(section || '').trim();
  if (!trimmed) return 'General';
  return `Section ${trimmed}`;
}

function matchesClassFilter(row: AssignedClassRow, filter: string) {
  const f = filter.trim();
  if (!f) return false;
  return (
    row.id === f ||
    row.classNumber === f ||
    row.label === f ||
    classDisplayLabel(row) === f
  );
}

function mapPerfToStudentRow(s: any): StudentRow {
  return {
    id: String(s._id || s.id),
    name: formatPersonName(s.fullName || s.name || 'Student'),
    email: s.email || '',
    classNumber: s.classNumber || 'N/A',
    assignedClass: s.assignedClass,
    lastLogin: s.lastLogin || null,
    isActive: s.isActive !== false,
    performance: s.performance || {},
  };
}

const IMPROVEMENT_GRADIENT = ['#FFFBEB', '#FFF7ED', '#FFFFFF'] as const;

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  variant = 'default',
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: ReactNode;
  variant?: 'default' | 'improvement';
}) {
  if (variant === 'improvement') {
    return (
      <LinearGradient colors={[...IMPROVEMENT_GRADIENT]} style={styles.improvementCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={20} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
      </LinearGradient>
    );
  }

  return (
    <GlassPanel style={styles.sectionCard} radius={TEACHER_RADIUS.xl} tone="strong">
      <View style={styles.sectionCardInner}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={20} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
      </View>
    </GlassPanel>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function tierBarColor(tier: 'good' | 'avg' | 'low') {
  if (tier === 'good') return PERFORMANCE_COLORS.good;
  if (tier === 'avg') return PERFORMANCE_COLORS.average;
  return PERFORMANCE_COLORS['at-risk'];
}

function tierPillStyle(tier: 'good' | 'avg' | 'low') {
  const color = tierBarColor(tier);
  return { bg: `${color}22`, text: color };
}

function computeClassStats(classStudents: StudentRow[]) {
  const withExams = classStudents.filter((s) => (s.performance?.totalExams ?? 0) > 0);
  const examScores = withExams
    .map((s) => s.performance?.averagePercentage ?? 0)
    .filter((p) => p > 0);
  const avgExam = examScores.length ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0;
  const avgOverall =
    classStudents.length > 0
      ? classStudents.reduce((sum, s) => sum + (s.performance?.overallProgress ?? 0), 0) /
        classStudents.length
      : 0;
  return { withExams: withExams.length, avgExam, avgOverall, performers: performerCounts(classStudents) };
}

function StudentProgressRow({
  student,
  onView,
}: {
  student: StudentRow;
  onView: () => void;
}) {
  const overall = student.performance?.overallProgress ?? 0;
  const tier = progressTier(overall);
  const colors = tierPillStyle(tier);
  const initial = student.name.charAt(0).toUpperCase();

  return (
    <GlassPanel style={styles.studentRow} radius={TEACHER_RADIUS.md} tone="medium">
      <View style={styles.studentRowInner}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>{initial}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.listName} numberOfLines={1}>{student.name}</Text>
          <Text style={styles.listSub} numberOfLines={1}>{student.email}</Text>
          <View style={styles.studentMeta}>
            <View style={[styles.pill, { backgroundColor: colors.bg }]}>
              <Text style={[styles.pillText, { color: colors.text }]}>
                {overall > 0 ? `${overall.toFixed(0)}%` : 'No Data'}
              </Text>
            </View>
            <Text style={styles.studentMetaText}>
              {(student.performance?.totalExams ?? 0)} Exams ·{' '}
              {(student.performance?.dailyAverageWatchTime ?? 0).toFixed(0)} Min/Day
            </Text>
          </View>
        </View>
        <Pressable style={styles.viewBtn} onPress={onView}>
          <Ionicons name="eye-outline" size={14} color={TEACHER.primaryLight} />
          <Text style={styles.viewBtnText}>View</Text>
        </Pressable>
      </View>
    </GlassPanel>
  );
}

export default function TrackProgressView({
  initialClassFilter,
  initialStudentId,
  analysisOnly = false,
  onCloseAnalysis,
}: Props) {
  const [assignedClassRows, setAssignedClassRows] = useState<AssignedClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [homeworkGroups, setHomeworkGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClassNumbers, setExpandedClassNumbers] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [detailStudent, setDetailStudent] = useState<StudentRow | null>(null);
  const [detailAiText, setDetailAiText] = useState('');
  const [detailAiLoading, setDetailAiLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [classesRes, perfRes, remarksRes, hwRes] = await Promise.all([
        teacherService.classes(),
        teacherService.studentsPerformance(),
        teacherService.trackProgressRemarks(),
        teacherService.homeworkSubmissionsGrouped().catch(() => ({ data: { homeworks: [] } })),
      ]);

      const classesData = Array.isArray(classesRes.data) ? classesRes.data : [];
      const perfData = Array.isArray(perfRes.data) ? perfRes.data : [];
      const perfMap = new Map<string, any>();
      perfData.forEach((s: any) => {
        const id = String(s._id || s.id);
        if (id) perfMap.set(id, s);
      });

      const rows: AssignedClassRow[] = classesData.map((cls: any) => {
        const classId = String(cls._id || cls.id);
        const classNumber = String(cls.classNumber || '');
        const section = cls.section ? String(cls.section) : undefined;
        const label = String(cls.name || cls.className || classDisplayLabel({ classNumber, section, label: '' }));
        const classStudents: StudentRow[] = [];
        const seen = new Set<string>();

        perfData.forEach((s: any) => {
          const sid = String(s._id || s.id);
          const assignedId = String(s.assignedClass?._id || s.assignedClass || '');
          if (!sid || seen.has(sid) || assignedId !== classId) return;
          seen.add(sid);
          classStudents.push(mapPerfToStudentRow(s));
        });

        (Array.isArray(cls.students) ? cls.students : []).forEach((s: any) => {
          const sid = String(s.id || s._id);
          if (!sid || seen.has(sid)) return;
          seen.add(sid);
          const perf = perfMap.get(sid);
          classStudents.push(
            perf
              ? mapPerfToStudentRow(perf)
              : {
                  id: sid,
                  name: formatPersonName(s.name || s.fullName || 'Student'),
                  email: s.email || '',
                  classNumber: classNumber || 'N/A',
                  assignedClass: { _id: classId, classNumber, section },
                  performance: {},
                },
          );
        });

        classStudents.sort((a, b) => a.name.localeCompare(b.name));

        return { id: classId, classNumber, section, label, students: classStudents };
      });

      rows.sort((a, b) => {
        const na = Number(a.classNumber);
        const nb = Number(b.classNumber);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.classNumber.localeCompare(b.classNumber);
      });

      const assignedStudents = rows.flatMap((row) => row.students);
      const assignedStudentIds = new Set(assignedStudents.map((s) => s.id));

      setAssignedClassRows(rows);
      setStudents(assignedStudents);
      setRemarks(
        (Array.isArray(remarksRes.data) ? remarksRes.data : []).filter((r) => {
          const sid = String(r.studentId?._id || r.studentId || r.student?._id || '');
          return sid && assignedStudentIds.has(sid);
        }),
      );
      setHomeworkGroups(Array.isArray(hwRes.data?.homeworks) ? hwRes.data.homeworks : []);

      if (initialClassFilter) {
        const match = rows.find((row) => matchesClassFilter(row, initialClassFilter));
        if (match) {
          setExpandedClassNumbers(new Set([match.classNumber]));
          setExpandedSections(new Set([match.id]));
        } else if (rows.some((row) => row.classNumber === initialClassFilter)) {
          setExpandedClassNumbers(new Set([initialClassFilter]));
        }
      }
    } catch {
      setAssignedClassRows([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const { homeworkByStudent, totalHomeworkAssigned } = useMemo(() => {
    const map = new Map<string, { assigned: number; submitted: number }>();
    const total = homeworkGroups.length;
    homeworkGroups.forEach((item: any) => {
      const subs = item.submissions || [];
      subs.forEach((sub: any) => {
        const sid = String(sub.studentId?._id || sub.studentId || sub.student?._id || '');
        if (!sid) return;
        const cur = map.get(sid) || { assigned: total, submitted: 0 };
        cur.submitted += 1;
        map.set(sid, cur);
      });
    });
    return { homeworkByStudent: map, totalHomeworkAssigned: total };
  }, [homeworkGroups]);

  const classGroups = useMemo<ClassGroup[]>(() => {
    const map = new Map<string, AssignedClassRow[]>();
    assignedClassRows.forEach((row) => {
      const key = row.classNumber || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      })
      .map(([classNumber, sections]) => ({
        classNumber,
        sections: sections.sort((a, b) =>
          (a.section || '').localeCompare(b.section || ''),
        ),
        totalStudents: sections.reduce((sum, s) => sum + s.students.length, 0),
      }));
  }, [assignedClassRows]);

  const remarksForStudent = useCallback(
    (studentId: string) =>
      remarks.filter((r) => {
        const sid = r.studentId?._id || r.studentId || r.student?._id;
        return String(sid) === studentId;
      }),
    [remarks]
  );

  const getHomeworkStats = (studentId: string) =>
    homeworkByStudent.get(studentId) || { assigned: totalHomeworkAssigned, submitted: 0 };

  const fetchAiInsights = async (targetStudents: StudentRow[], scope: string) => {
    const summary = buildProgressAiSummaryPayload(
      targetStudents,
      remarks,
      homeworkByStudent,
      totalHomeworkAssigned,
      scope,
    );
    const res = await teacherService.progressAiInsights({ summary });
    return res?.summary || res?.data?.summary || res?.insights || 'No insights available.';
  };

  const openStudentDetail = async (student: StudentRow) => {
    setDetailStudent(student);
    setDetailAiText('');
    setDetailAiLoading(true);
    try {
      setDetailAiText(
        await fetchAiInsights([student], `Student: ${student.name || student.email || 'selected'}`)
      );
    } catch {
      setDetailAiText('Could not load improvement analysis.');
    } finally {
      setDetailAiLoading(false);
    }
  };

  useEffect(() => {
    if (!initialStudentId || !students.length) return;
    const student = students.find((s) => s.id === initialStudentId);
    if (!student) return;
    const classRow = assignedClassRows.find((row) =>
      row.students.some((s) => s.id === student.id),
    );
    if (classRow) {
      setExpandedClassNumbers(new Set([classRow.classNumber]));
      setExpandedSections(new Set([classRow.id]));
    }
    openStudentDetail(student);
  }, [initialStudentId, students, assignedClassRows]);

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

  const renderStudentDetail = (student: StudentRow) => {
    const perf = student.performance || {};
    const hw = getHomeworkStats(student.id);
    const overall = perf.overallProgress ?? 0;
    const learning = perf.learningProgress ?? 0;
    const tier = progressTier(overall);
    const examAvg = perf.averagePercentage;
    const lastLogin = formatLastLogin(student.lastLogin);

    return (
      <>
        <View style={styles.detailHeader}>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>{formatClassBadge(student)}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: tierPillStyle(tier).bg }]}>
            <Text style={[styles.pillText, { color: tierPillStyle(tier).text }]}>
              {progressStatusLabel(overall)}
            </Text>
          </View>
          <View style={[styles.statusBadge, student.isActive !== false ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, student.isActive !== false ? styles.statusActiveText : styles.statusInactiveText]}>
              {student.isActive !== false ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <SectionCard title="Exams Performance" icon="locate" iconColor="#2563EB">
          <View style={styles.metricGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{perf.totalExams ?? 0}</Text>
              <Text style={styles.metricLbl}>Exams Taken</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>
                {examAvg != null && examAvg > 0 ? `${examAvg.toFixed(1)}%` : 'No Data'}
              </Text>
              <Text style={styles.metricLbl}>Average Score</Text>
            </View>
          </View>
          {perf.recentExamTitle ? (
            <Text style={styles.listSub}>
              Recent: {perf.recentExamTitle} ({(perf.recentPercentage ?? 0).toFixed(0)}%)
            </Text>
          ) : (
            <Text style={styles.emptyLine}>No recent exam data.</Text>
          )}
        </SectionCard>

        <SectionCard title="Usage & Overall Progress" icon="trending-up" iconColor="#059669">
          <View style={styles.progressRow}>
            <Text style={styles.progressLbl}>Overall Progress</Text>
            <Text style={styles.progressPct}>{overall.toFixed(1)}%</Text>
          </View>
          <ProgressBar value={overall} color={tierBarColor(tier)} />
          <View style={[styles.progressRow, { marginTop: 10 }]}>
            <Text style={styles.progressLbl}>Learning Progress</Text>
            <Text style={styles.progressPct}>
              {learning > 0 ? `${learning.toFixed(1)}%` : 'No Data'}
            </Text>
          </View>
          {learning > 0 ? <ProgressBar value={learning} color="#3B82F6" /> : null}
          <Text style={[styles.listSub, { marginTop: 8 }]}>
            {(perf.dailyAverageWatchTime ?? 0) > 0
              ? `${(perf.dailyAverageWatchTime ?? 0).toFixed(1)} Min/Day Avg On Platform`
              : 'No Usage Data Yet'}
          </Text>
          <View style={styles.metricGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{hw.submitted}/{hw.assigned}</Text>
              <Text style={styles.metricLbl}>Homework Submitted</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>
                {lastLogin ? lastLogin.date : 'Never'}
              </Text>
              <Text style={styles.metricLbl}>Last Activity</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Remarks" icon="chatbubbles" iconColor="#0284C7">
          {remarksForStudent(student.id).length === 0 ? (
            <Text style={styles.emptyLine}>No remarks yet for this student.</Text>
          ) : (
            remarksForStudent(student.id).map((r) => (
              <View
                key={r._id}
                style={[
                  styles.remarkItem,
                  r.isPositive ? styles.remarkPositive : styles.remarkNeedsWork,
                ]}
              >
                <Text style={styles.remarkText}>{r.remark}</Text>
                <Text style={styles.remarkMeta}>
                  {r.isPositive ? 'Positive' : 'Needs Improvement'}
                  {r.subject?.name ? ` · ${r.subject.name}` : ''}
                  {r.teacherId?.fullName ? ` · ${r.teacherId.fullName}` : ''}
                  {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Areas For Improvement" icon="bulb" iconColor="#D97706" variant="improvement">
          <View style={styles.aiHeader}>
            <Text style={styles.sectionHint}>Recommendation based on exams, usage, homework & remarks</Text>
            <Pressable
              style={styles.refreshBtn}
              onPress={async () => {
                setDetailAiLoading(true);
                try {
                  setDetailAiText(
                    await fetchAiInsights(
                      [student],
                      `Student: ${student.name || student.email || 'selected'}`
                    )
                  );
                } finally {
                  setDetailAiLoading(false);
                }
              }}
              disabled={detailAiLoading}
            >
              <Ionicons name="refresh" size={14} color={TEACHER.warning} />
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>
          {detailAiLoading ? (
            <ActivityIndicator color={TEACHER.primary} />
          ) : (
            <Text style={styles.aiText}>{detailAiText || 'No analysis available.'}</Text>
          )}
        </SectionCard>
      </>
    );
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  const closeDetail = () => {
    setDetailStudent(null);
    setDetailAiText('');
    if (analysisOnly) onCloseAnalysis?.();
  };

  const detailBody = detailStudent ? (
    <>
      <Text style={styles.modalTitle}>{detailStudent.name}</Text>
      <Text style={styles.listSub}>{detailStudent.email}</Text>
      {renderStudentDetail(detailStudent)}
      <Pressable
        style={styles.closeBtn}
        onPress={closeDetail}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeBtnText}>Close</Text>
        <Ionicons name="close" size={18} color={TEACHER.danger} />
      </Pressable>
    </>
  ) : null;

  if (analysisOnly) {
    if (loading && !detailStudent) {
      return <TeacherShimmer variant="list" count={4} />;
    }

    const missing =
      Boolean(initialStudentId) &&
      !loading &&
      students.length > 0 &&
      !students.some((s) => s.id === initialStudentId);

    return (
      <View style={styles.root}>
        <Modal
          visible={!!detailStudent || missing}
          transparent
          animationType="slide"
          onRequestClose={closeDetail}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalCardContent}
                keyboardShouldPersistTaps="handled"
              >
                {missing ? (
                  <>
                    <Text style={styles.modalTitle}>Student Not Found</Text>
                    <Text style={styles.listSub}>This student is not in your assigned classes.</Text>
                    <Pressable
                      style={styles.closeBtn}
                      onPress={() => onCloseAnalysis?.()}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                    >
                      <Text style={styles.closeBtnText}>Close</Text>
                      <Ionicons name="close" size={18} color={TEACHER.danger} />
                    </Pressable>
                  </>
                ) : (
                  detailBody
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GlassPanel style={styles.headerCard} radius={TEACHER_RADIUS.xl} tone="medium">
          <View style={styles.headerCardRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="bar-chart" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Track Student Progress</Text>
              <Text style={styles.headerSub}>
                Expand Class → Section → Individual Student Progress
              </Text>
            </View>
          </View>
        </GlassPanel>

        <GlassPanel style={styles.classListCard} radius={TEACHER_RADIUS.lg} tone="strong">
          <Text style={styles.classListTitle}>My Assigned Classes</Text>
          {classGroups.length === 0 ? (
            <View style={styles.classEmptyBlock}>
              <Ionicons name="school-outline" size={32} color={TEACHER.textMuted} />
              <Text style={styles.classEmptyTitle}>No Classes Assigned</Text>
              <Text style={styles.emptyLine}>Contact your administrator to get class assignments.</Text>
            </View>
          ) : (
            classGroups.map((group) => {
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
                        const stats = computeClassStats(section.students);
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
                                {section.students.length > 0 ? (
                                  <View style={styles.classSummary}>
                                    <Text style={styles.classSummaryText}>
                                      Avg Exam {stats.avgExam.toFixed(1)}% · Avg Progress{' '}
                                      {stats.avgOverall.toFixed(1)}%
                                    </Text>
                                  </View>
                                ) : null}
                                {section.students.length === 0 ? (
                                  <Text style={[styles.emptyLine, styles.classBodyEmpty]}>
                                    No students in this section yet.
                                  </Text>
                                ) : (
                                  section.students.map((student) => (
                                    <StudentProgressRow
                                      key={student.id}
                                      student={student}
                                      onView={() => openStudentDetail(student)}
                                    />
                                  ))
                                )}
                              </View>
                            ) : null}
                          </GlassPanel>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </GlassPanel>

        <TeacherExamPaperReview
          classNumber={
            expandedClassNumbers.size === 1
              ? [...expandedClassNumbers][0]
              : initialClassFilter || 'all'
          }
        />
      </ScrollView>

      <Modal visible={!!detailStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalCardContent}>
              {detailBody}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  root: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 12 },
  headerCard: {
    ...glassCard,
    // GlassPanel supplies the frosted fill; glassCard's opaque bg would hide it.
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.xl,
    padding: 16,
    marginTop: 4,
  },
  headerCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
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
  classListCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    overflow: 'hidden',
  },
  classListTitle: {
    ...TEACHER_TYPO.label,
    color: TEACHER.textMuted,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  classEmptyBlock: { padding: 24, alignItems: 'center', gap: 8 },
  classEmptyTitle: { fontSize: 16, fontWeight: '700', color: TEACHER.text },
  classBodyEmpty: { paddingHorizontal: 6, paddingBottom: 10 },
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
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
    backgroundColor: 'rgba(99,102,241,0.03)',
  },
  classSummary: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 2,
  },
  classSummaryText: { fontSize: 11, color: TEACHER.textMuted },
  studentRow: {
    padding: 10,
    marginBottom: 8,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  studentRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TEACHER.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 16, fontWeight: '800', color: TEACHER.primaryDark },
  studentInfo: { flex: 1, minWidth: 0 },
  studentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  studentMetaText: { fontSize: 10, color: TEACHER.textMuted },
  sectionCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.xl,
    padding: 14,
    marginTop: 12,
  },
  sectionCardInner: {
    gap: 10,
  },
  improvementCard: {
    borderRadius: TEACHER_RADIUS.xl,
    padding: 14,
    gap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    ...TEACHER.shadow.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...TEACHER_TYPO.body, fontWeight: '800', color: TEACHER.text },
  sectionHint: { fontSize: 11, color: TEACHER.textMuted, flex: 1 },
  listName: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  listSub: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  progressLbl: { fontSize: 12, color: TEACHER.textMuted },
  progressPct: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  progressTrack: { height: 8, backgroundColor: TEACHER.surfaceBorder, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: TEACHER.primary + '44',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: TEACHER.surfaceElevated,
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: TEACHER.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshText: { fontSize: 11, fontWeight: '700', color: TEACHER.warning },
  aiText: { fontSize: 13, color: TEACHER.textMuted, lineHeight: 20 },
  emptyLine: { fontSize: 13, color: TEACHER.textMuted, fontStyle: 'italic' },
  detailHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 4 },
  classBadge: { backgroundColor: TEACHER.navActiveBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  classBadgeText: { fontSize: 11, fontWeight: '700', color: TEACHER.primaryLight },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: '#166534' },
  statusInactiveText: { color: '#991B1B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TEACHER.cardGradient[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
  },
  modalCardContent: { paddingBottom: 12 },
  modalTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text, marginBottom: 4 },
  remarkItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: TEACHER_RADIUS.md,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  remarkPositive: { backgroundColor: '#F0FDF4', borderLeftColor: '#22C55E' },
  remarkNeedsWork: { backgroundColor: 'rgba(255,247,237,0.55)', borderLeftColor: '#F97316' },
  remarkText: { fontSize: 14, color: TEACHER.text },
  remarkMeta: { fontSize: 11, color: TEACHER.textMuted, marginTop: 4 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  metric: {
    width: '47%',
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  metricVal: { fontSize: 18, fontWeight: '800', color: TEACHER.primaryLight },
  metricLbl: { fontSize: 11, color: TEACHER.textMuted, marginTop: 4, textAlign: 'center' },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  closeBtnText: { color: TEACHER.danger, fontWeight: '700' },
});
