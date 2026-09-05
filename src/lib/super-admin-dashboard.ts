import api from '../services/api/api';

export type DashboardStats = {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  courses: number;
  assessments: number;
  exams: number;
  examResults: number;
  activeVideos: number;
  activeAssessments: number;
  avgExamsPerStudent: number;
  contentEngagement: number;
  contentVolume: number;
  passRate: number;
  activeStudents: number;
  activeStudentsPercentage: number;
  averageScore: number | string;
};

export type RealtimeAnalytics = {
  overallMetrics?: {
    totalStudents?: number;
    totalExams?: number;
    totalExamResults?: number;
    overallAverage?: number;
  };
  topScorersByExam?: Array<{
    examId?: string;
    examTitle?: string;
    topScorers?: Array<{
      studentId?: string;
      studentName?: string;
      studentEmail?: string;
      percentage?: number;
      marks?: number;
      totalMarks?: number;
      score?: number;
    }>;
  }>;
  lowPerformingAdmins?: Array<{
    adminId?: string;
    adminName?: string;
    adminEmail?: string;
    averageScore?: number;
    totalStudents?: number;
    totalExams?: number;
  }>;
  adminAnalytics?: Array<{
    adminId?: string;
    adminName?: string;
    adminEmail?: string;
    averageScore?: number;
    totalStudents?: number;
    totalExams?: number;
  }>;
  insights?: Array<{
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    generatedAt?: string;
  }>;
};

export function normalizeDashboardStats(raw: Record<string, unknown> | null | undefined): DashboardStats {
  const n = raw || {};
  return {
    totalUsers: Number(n.totalUsers || n.users || 0),
    totalStudents: Number(n.totalStudents || n.students || 0),
    totalTeachers: Number(n.totalTeachers || n.teachers || 0),
    totalAdmins: Number(n.totalAdmins || n.admins || 0),
    courses: Number(n.courses || 0),
    assessments: Number(n.assessments || 0),
    exams: Number(n.exams || 0),
    examResults: Number(n.examResults || 0),
    activeVideos: Number(n.activeVideos || 0),
    activeAssessments: Number(n.activeAssessments || 0),
    avgExamsPerStudent: Number(n.avgExamsPerStudent || 0),
    contentVolume: Number(n.contentVolume ?? n.contentEngagement ?? 0),
    contentEngagement: Number(n.contentVolume ?? n.contentEngagement ?? 0),
    passRate: Number(n.passRate || 0),
    activeStudents: Number(n.activeStudents || 0),
    activeStudentsPercentage: Number(n.activeStudentsPercentage || 0),
    averageScore: (n.averageScore as number | string) ?? 0,
  };
}

function isRetryableNetworkError(err: any) {
  return Boolean(
    err?.isNetworkError ||
      err?.isTimeout ||
      err?.code === 'ERR_NETWORK' ||
      err?.code === 'ECONNABORTED' ||
      String(err?.message || '').toLowerCase().includes('network error') ||
      String(err?.message || '').toLowerCase().includes('timeout'),
  );
}

async function getDashboardStatsOnce(): Promise<DashboardStats> {
  try {
    const response = await api.get('/api/super-admin/dashboard/stats');
    const payload = response?.data;
    return normalizeDashboardStats((payload?.data || payload?.stats || payload) as Record<string, unknown>);
  } catch (primaryErr: any) {
    if (primaryErr?.response?.status === 404) {
      const fallbackResponse = await api.get('/api/super-admin/stats');
      const payload = fallbackResponse?.data;
      return normalizeDashboardStats((payload?.data || payload?.stats || payload) as Record<string, unknown>);
    }
    throw primaryErr;
  }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getDashboardStatsOnce();
    } catch (err: any) {
      lastError = err;
      if (!isRetryableNetworkError(err) || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function fetchRealtimeAnalytics(): Promise<RealtimeAnalytics | null> {
  try {
    const response = await api.get('/api/super-admin/analytics/realtime');
    const payload = response?.data;
    if (payload?.success === false) return null;
    return (payload?.data || payload) ?? null;
  } catch {
    return null;
  }
}
