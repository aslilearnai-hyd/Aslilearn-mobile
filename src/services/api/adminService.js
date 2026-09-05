import api from './api';

/** In-memory SWR cache — single shared reference for admin dashboard data. */
const CACHE_TTL_MS = 5 * 60 * 1000;

const memory = {
  stats: null,
  analytics: null,
};

let statsInflight = null;
let analyticsInflight = null;

function isFresh(entry) {
  return entry != null && Date.now() - entry.ts < CACHE_TTL_MS;
}

function unwrapPayload(responseData) {
  return responseData?.data?.data ?? responseData?.data ?? responseData ?? {};
}

/** Sync peek for instant first paint (no network). */
export function peekDashboardStats() {
  return memory.stats?.data ?? null;
}

export function peekStudentAnalytics() {
  return memory.analytics?.data ?? null;
}

export function clearAdminDashboardCache() {
  memory.stats = null;
  memory.analytics = null;
  statsInflight = null;
  analyticsInflight = null;
}

/**
 * Shared dashboard stats. Returns cached payload when fresh unless force=true.
 * Concurrent callers share one in-flight request (single cache reference).
 */
const getDashboardStats = async ({ force = false } = {}) => {
  if (!force && isFresh(memory.stats)) {
    return memory.stats.data;
  }

  if (!force && statsInflight) {
    return statsInflight;
  }

  const hadStale = memory.stats?.data ?? null;

  statsInflight = (async () => {
    try {
      const response = await api.get('/api/admin/dashboard/stats');
      const payload = unwrapPayload(response?.data);
      const normalized = {
        totalStudents: payload.totalStudents || 0,
        totalTeachers: payload.totalTeachers || 0,
        totalClasses: payload.totalClasses || 0,
        activeUsers: payload.activeUsers || 0,
      };
      memory.stats = { data: normalized, ts: Date.now() };
      return normalized;
    } catch (error) {
      if (hadStale) return hadStale;
      throw error;
    } finally {
      statsInflight = null;
    }
  })();

  return statsInflight;
};

const getStudentAnalytics = async ({ force = false } = {}) => {
  if (!force && isFresh(memory.analytics)) {
    return memory.analytics.data;
  }

  if (!force && analyticsInflight) {
    return analyticsInflight;
  }

  const hadStale = memory.analytics?.data ?? null;

  analyticsInflight = (async () => {
    try {
      const response = await api.get('/api/admin/students/analytics');
      const payload = unwrapPayload(response?.data);
      const normalized = {
        classDistribution: payload.classDistribution || [],
        performanceMetrics: payload.performanceMetrics || {
          averageScore: 0,
          totalExamsTaken: 0,
          topPerformers: [],
        },
        subjectPerformance: payload.subjectPerformance || [],
      };
      memory.analytics = { data: normalized, ts: Date.now() };
      return normalized;
    } catch (error) {
      if (hadStale) return hadStale;
      throw error;
    } finally {
      analyticsInflight = null;
    }
  })();

  return analyticsInflight;
};

const getAnalytics = async () => {
  const response = await api.get('/api/admin/analytics');
  return response?.data;
};

const getTeachers = async () => {
  const response = await api.get('/api/admin/teachers');
  return response?.data;
};

const getSubjects = async () => {
  const response = await api.get('/api/admin/subjects');
  return response?.data;
};

const getVideos = async () => {
  const response = await api.get('/api/admin/videos');
  return response?.data;
};

const createVideo = async (body) => {
  const response = await api.post('/api/admin/videos', body);
  return response?.data;
};

const deleteVideo = async (id) => {
  const response = await api.delete(`/api/admin/videos/${id}`);
  return response?.data;
};

const getQuizzes = async () => {
  const response = await api.get('/api/admin/quizzes');
  return response?.data;
};

const createQuiz = async (body) => {
  const response = await api.post('/api/admin/quizzes', body);
  return response?.data;
};

const getAssessments = async () => {
  const response = await api.get('/api/admin/assessments');
  return response?.data;
};

const createAssessment = async (body) => {
  const response = await api.post('/api/admin/assessments', body);
  return response?.data;
};

const deleteAssessment = async (id) => {
  const response = await api.delete(`/api/admin/assessments/${id}`);
  return response?.data;
};

const getSchoolSettings = async () => {
  const response = await api.get('/api/admin/school-settings');
  return response?.data;
};

const updateSchoolSettings = async (body) => {
  const response = await api.put('/api/admin/school-settings', body);
  return response?.data;
};

const downloadReport = async (type, format = 'csv') => {
  if (format === 'csv') {
    return api.get('/api/admin/reports', {
      params: { type, format },
      responseType: 'text',
    });
  }
  const response = await api.get('/api/admin/reports', {
    params: { type, format },
  });
  return response;
};

export default {
  getDashboardStats,
  getStudentAnalytics,
  peekDashboardStats,
  peekStudentAnalytics,
  clearAdminDashboardCache,
  getAnalytics,
  getTeachers,
  getSubjects,
  getVideos,
  createVideo,
  deleteVideo,
  getQuizzes,
  createQuiz,
  getAssessments,
  createAssessment,
  deleteAssessment,
  getSchoolSettings,
  updateSchoolSettings,
  downloadReport,
};
