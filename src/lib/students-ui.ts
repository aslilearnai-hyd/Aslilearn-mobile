import { formatClassSectionLabel, formatPersonName } from './teacher-text';

export const STUDENTS_UI = {
  emerald: '#059669',
  emeraldDark: '#047857',
  emeraldLight: '#d1fae5',
  emeraldBorder: '#a7f3d0',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  indigo: '#4f46e5',
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
};

export type StudentPerformance = {
  overallProgress?: number;
  learningProgress?: number;
  totalExams?: number;
  averageMarks?: number;
  averagePercentage?: number;
  dailyAverageWatchTime?: number;
  recentExamTitle?: string | null;
  recentPercentage?: number | null;
};

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  isActive?: boolean;
  lastLogin?: string | null;
  assignedClass?: { _id?: string; classNumber?: string; section?: string };
  performance?: StudentPerformance;
};

export function progressTier(pct: number): 'good' | 'avg' | 'low' {
  if (pct >= 70) return 'good';
  if (pct >= 50) return 'avg';
  return 'low';
}

export function progressColors(tier: 'good' | 'avg' | 'low') {
  if (tier === 'good') return { bg: '#dcfce7', text: '#166534', bar: '#22c55e' };
  if (tier === 'avg') return { bg: '#fef9c3', text: '#854d0e', bar: '#eab308' };
  return { bg: '#fee2e2', text: '#991b1b', bar: '#ef4444' };
}

export function formatClassBadge(student: StudentRow): string {
  if (student.assignedClass) {
    const num = student.assignedClass.classNumber || student.classNumber;
    const sec = student.assignedClass.section || '';
    const raw = `${num || ''}${sec || ''}`.trim();
    if (!raw) return 'N/A';
    return formatClassSectionLabel(raw);
  }
  if (!student.classNumber) return 'N/A';
  return formatClassSectionLabel(student.classNumber);
}

export function formatLastLogin(lastLogin?: string | null): { date: string; time: string } | null {
  if (!lastLogin) return null;
  try {
    const d = new Date(lastLogin);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return null;
  }
}

export function mapStudentRow(raw: any): StudentRow {
  return {
    id: String(raw._id || raw.id || ''),
    name: raw.fullName || raw.name || 'Unknown Student',
    email: raw.email || '',
    classNumber: raw.classNumber || 'N/A',
    phone: raw.phone || '',
    isActive: raw.isActive !== false,
    lastLogin: raw.lastLogin || null,
    assignedClass: raw.assignedClass || null,
    performance: raw.performance || {},
  };
}

export function mergeStudentsWithPerformance(students: any[], perfRows: any[]): StudentRow[] {
  const perfMap = new Map<string, StudentPerformance>();
  (Array.isArray(perfRows) ? perfRows : []).forEach((row) => {
    const id = String(row._id || row.id || '');
    if (id) perfMap.set(id, row.performance || row);
  });

  return (Array.isArray(students) ? students : []).map((s) => {
    const mapped = mapStudentRow(s);
    const perf = perfMap.get(mapped.id);
    if (perf) mapped.performance = { ...mapped.performance, ...perf };
    return mapped;
  });
}

export function performerCounts(students: StudentRow[]) {
  let high = 0;
  let average = 0;
  let needAttention = 0;
  students.forEach((s) => {
    const pct = s.performance?.overallProgress ?? 0;
    if (pct >= 70) high += 1;
    else if (pct >= 50) average += 1;
    else needAttention += 1;
  });
  return { high, average, needAttention };
}

export function progressStatusLabel(pct: number): string {
  if (pct >= 70) return 'Good Progress';
  if (pct >= 50) return 'Average';
  return 'Needs Improvement';
}

export function studentClassKey(student: StudentRow): string {
  const cls = student.assignedClass?.classNumber || student.classNumber;
  return cls && cls !== 'N/A' ? String(cls) : '';
}

export type AssignedClassRow = {
  id: string;
  classNumber: string;
  section?: string;
  label: string;
  students: StudentRow[];
};

export type ClassGroup = {
  classNumber: string;
  sections: AssignedClassRow[];
  totalStudents: number;
};

export function sectionDisplayLabel(section?: string): string {
  const trimmed = String(section || '').trim();
  if (!trimmed) return 'General';
  return `Section ${trimmed}`;
}

function mapPerfStudentRow(s: any): StudentRow {
  return {
    id: String(s._id || s.id),
    name: formatPersonName(s.fullName || s.name || 'Student'),
    email: s.email || '',
    classNumber: s.classNumber || 'N/A',
    phone: s.phone || '',
    assignedClass: s.assignedClass,
    lastLogin: s.lastLogin || null,
    isActive: s.isActive !== false,
    performance: s.performance || {},
  };
}

/** Build class → section rows from teacher assigned classes + performance data. */
export function buildAssignedClassRows(classesData: any[], perfData: any[]): AssignedClassRow[] {
  const perfMap = new Map<string, any>();
  (Array.isArray(perfData) ? perfData : []).forEach((s: any) => {
    const id = String(s._id || s.id);
    if (id) perfMap.set(id, s);
  });

  const rows: AssignedClassRow[] = (Array.isArray(classesData) ? classesData : []).map((cls: any) => {
    const classId = String(cls._id || cls.id);
    const classNumber = String(cls.classNumber || '');
    const section = cls.section ? String(cls.section) : undefined;
    const label = String(
      cls.name ||
        cls.className ||
        (classNumber && section ? `${classNumber}${section}` : classNumber || 'Class'),
    );
    const classStudents: StudentRow[] = [];
    const seen = new Set<string>();

    (Array.isArray(perfData) ? perfData : []).forEach((s: any) => {
      const sid = String(s._id || s.id);
      const assignedId = String(s.assignedClass?._id || s.assignedClass || '');
      if (!sid || seen.has(sid) || assignedId !== classId) return;
      seen.add(sid);
      classStudents.push(mapPerfStudentRow(s));
    });

    (Array.isArray(cls.students) ? cls.students : []).forEach((s: any) => {
      const sid = String(s.id || s._id);
      if (!sid || seen.has(sid)) return;
      seen.add(sid);
      const perf = perfMap.get(sid);
      classStudents.push(
        perf
          ? mapPerfStudentRow(perf)
          : {
              id: sid,
              name: formatPersonName(s.name || s.fullName || 'Student'),
              email: s.email || '',
              classNumber: classNumber || 'N/A',
              phone: s.phone || '',
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

  return rows;
}

export function groupAssignedClassesByNumber(rows: AssignedClassRow[]): ClassGroup[] {
  const map = new Map<string, AssignedClassRow[]>();
  rows.forEach((row) => {
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
      sections: sections.sort((a, b) => (a.section || '').localeCompare(b.section || '')),
      totalStudents: sections.reduce((sum, s) => sum + s.students.length, 0),
    }));
}

export function filterAssignedClassRows(rows: AssignedClassRow[], searchTerm: string): AssignedClassRow[] {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return rows;
  return rows
    .map((row) => ({
      ...row,
      students: row.students.filter(
        (student) =>
          student.name.toLowerCase().includes(q) ||
          student.email.toLowerCase().includes(q) ||
          (student.phone && student.phone.toLowerCase().includes(q)) ||
          (student.classNumber && student.classNumber.toLowerCase().includes(q)),
      ),
    }))
    .filter((row) => row.students.length > 0);
}

export function buildProgressAiSummaryPayload(
  filtered: StudentRow[],
  remarks: any[],
  homeworkByStudent: Map<string, { assigned: number; submitted: number }>,
  totalHomeworkAssigned: number,
  scopeLabel: string,
) {
  const studentIds = new Set(filtered.map((s) => s.id).filter(Boolean));
  const relevantRemarks = remarks.filter((r) => {
    const sid = String(r.studentId?._id || r.studentId || r.student?._id || '');
    return sid && studentIds.has(sid);
  });

  const studentDetails = filtered.map((s) => {
    const perf = s.performance || {};
    const hw = homeworkByStudent.get(s.id) || { assigned: totalHomeworkAssigned, submitted: 0 };
    return {
      name: s.name || s.email,
      totalExams: perf.totalExams ?? 0,
      averagePercentage: perf.averagePercentage ?? null,
      overallProgress: perf.overallProgress ?? 0,
      learningProgress: perf.learningProgress ?? 0,
      dailyAverageWatchTime: perf.dailyAverageWatchTime ?? 0,
      homeworkAssigned: hw.assigned,
      homeworkSubmitted: hw.submitted,
    };
  });

  const withExams = filtered.filter((s) => (s.performance?.totalExams ?? 0) > 0);
  const examScores = withExams
    .map((s) => s.performance?.averagePercentage)
    .filter((p): p is number => p != null && p > 0);
  const avgExam =
    examScores.length > 0 ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0;
  const avgOverall =
    filtered.length > 0
      ? filtered.reduce((sum, s) => sum + (s.performance?.overallProgress ?? 0), 0) / filtered.length
      : 0;
  const withLearning = filtered.filter((s) => (s.performance?.learningProgress ?? 0) > 0);
  const avgLearning =
    withLearning.length > 0
      ? withLearning.reduce((sum, s) => sum + (s.performance?.learningProgress ?? 0), 0) /
        withLearning.length
      : 0;
  const withUsage = filtered.filter((s) => (s.performance?.dailyAverageWatchTime ?? 0) > 0);
  const avgWatch =
    withUsage.length > 0
      ? withUsage.reduce((sum, s) => sum + (s.performance?.dailyAverageWatchTime ?? 0), 0) /
        withUsage.length
      : 0;

  return {
    scopeLabel,
    studentCount: filtered.length,
    avgExamScore: avgExam,
    studentsWithExams: withExams.length,
    avgOverallProgress: avgOverall,
    avgLearningProgress: avgLearning,
    avgDailyUsageMinutes: avgWatch,
    studentsWithUsage: withUsage.length,
    students: studentDetails,
    remarksSample: relevantRemarks.slice(0, 8).map((r) => ({
      studentName:
        r.studentId?.fullName ||
        filtered.find(
          (s) =>
            String(r.studentId?._id || r.studentId) === s.id ||
            String(r.student?._id) === s.id,
        )?.name ||
        'Student',
      text: r.remark,
      isPositive: r.isPositive,
    })),
  };
}
