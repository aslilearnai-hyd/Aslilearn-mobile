import api from './api';

export type SubjectScore = {
  r?: number;
  w?: number;
  l?: number;
  marks?: number;
};

export type OmrStudentRow = {
  _id: string;
  percentage: number;
  totalMarks: number;
  totalQuestions?: number;
  correct?: number;
  wrong?: number;
  left?: number;
  finalRank?: number | null;
  testRank?: number | null;
  maths?: SubjectScore;
  physics?: SubjectScore;
  chemistry?: SubjectScore;
  biology?: SubjectScore;
  testTitle?: string;
  testDate?: string | null;
  testNo?: string;
};

export type OmrStudentPayload = {
  latest?: OmrStudentRow | null;
  trend?: number | null;
  history?: OmrStudentRow[];
};

export type OmrTeacherRow = {
  _id: string;
  candidateId: string;
  percentage: number;
  totalMarks: number;
  finalRank?: number | null;
  testRank?: number | null;
  testTitle?: string;
  testNo?: string;
  maths?: { marks?: number };
  physics?: { marks?: number };
  chemistry?: { marks?: number };
  biology?: { marks?: number };
  student?: {
    _id: string;
    fullName: string;
    email: string;
    classNumber?: string;
    section?: string;
  } | null;
};

export type OmrBatch = {
  _id: string;
  testNo?: string;
  testTitle: string;
  testDate?: string | null;
  rowCount: number;
  assignedCount: number;
  unassignedCount?: number;
  sourceFileName?: string;
  createdAt?: string;
};

export type OmrAdminRow = {
  _id: string;
  candidateId: string;
  candidateName?: string;
  fatherName?: string;
  group?: string;
  other?: string;
  maths?: SubjectScore;
  physics?: SubjectScore;
  chemistry?: SubjectScore;
  biology?: SubjectScore;
  totalQuestions?: number;
  attempted?: number;
  correct?: number;
  wrong?: number;
  left?: number;
  rightPct?: number;
  wrongPct?: number;
  totalMarks: number;
  percentage: number;
  testRank?: number | null;
  finalRank?: number | null;
  groupRank?: number | null;
  userId?: string | null;
  suggestedUserId?: string | null;
  student?: {
    _id: string;
    fullName: string;
    email: string;
    classNumber?: string;
    section?: string;
  } | null;
};

export type OmrStudentOption = {
  _id: string;
  fullName: string;
  email: string;
  classNumber?: string;
  section?: string;
};

function unwrapData<T>(payload: any): T {
  if (payload?.success && payload?.data !== undefined) return payload.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return payload as T;
}

const omrService = {
  getStudentResults: async (): Promise<OmrStudentPayload> => {
    const res = await api.get('/api/student/omr-results');
    return unwrapData<OmrStudentPayload>(res.data) || {};
  },

  getTeacherResults: async (): Promise<OmrTeacherRow[]> => {
    const res = await api.get('/api/teacher/omr-results');
    const data = unwrapData<OmrTeacherRow[] | { rows?: OmrTeacherRow[] }>(res.data);
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any)?.rows)) return (data as any).rows;
    return [];
  },

  listAdminBatches: async (): Promise<OmrBatch[]> => {
    const res = await api.get('/api/admin/omr-results/batches');
    const data = unwrapData<OmrBatch[]>(res.data);
    return Array.isArray(data) ? data : [];
  },

  getAdminBatch: async (
    batchId: string
  ): Promise<{ batch: OmrBatch; rows: OmrAdminRow[] }> => {
    const res = await api.get(`/api/admin/omr-results/batches/${batchId}`);
    const data = unwrapData<{ batch: OmrBatch; rows: OmrAdminRow[] }>(res.data);
    return {
      batch: data?.batch,
      rows: Array.isArray(data?.rows) ? data.rows : [],
    };
  },

  assignAdminRows: async (
    batchId: string,
    assignments: Array<{ rowId: string; userId: string | null }>
  ) => {
    const res = await api.post(`/api/admin/omr-results/batches/${batchId}/assign`, {
      assignments,
    });
    return res.data;
  },

  uploadAdminResults: async (file: {
    uri: string;
    name?: string | null;
    mimeType?: string | null;
  }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'omr-scores.csv',
      type:
        file.mimeType ||
        (file.name?.endsWith('.xlsx')
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : file.name?.endsWith('.xls')
            ? 'application/vnd.ms-excel'
            : 'text/csv'),
    } as any);
    const res = await api.post('/api/admin/omr-results/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data;
  },

  listAdminStudents: async (): Promise<OmrStudentOption[]> => {
    const res = await api.get('/api/admin/students');
    const payload = res.data;
    const raw = payload?.data || payload?.students || payload || [];
    const seen = new Set<string>();
    return (Array.isArray(raw) ? raw : [])
      .map((s: any) => ({
        _id: String(s._id || s.id || ''),
        fullName: s.fullName || s.name || '',
        email: s.email || '',
        classNumber: s.classNumber || s.assignedClass?.classNumber || '',
        section: s.section || s.assignedClass?.section || '',
      }))
      .filter((s: OmrStudentOption) => {
        if (!s._id || seen.has(s._id)) return false;
        seen.add(s._id);
        return true;
      })
      .sort((a: OmrStudentOption, b: OmrStudentOption) =>
        (a.fullName || a.email).localeCompare(b.fullName || b.email, undefined, {
          sensitivity: 'base',
        })
      );
  },
};

export default omrService;
