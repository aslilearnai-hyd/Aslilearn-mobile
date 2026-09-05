import api from '../services/api/api';

export type LiveSessionVisibility = 'teacher' | 'student' | 'both';

export type LiveSessionSchool = {
  _id: string;
  schoolName?: string;
  fullName?: string;
};

export type LiveSession = {
  _id: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  visibility: LiveSessionVisibility;
  adminId?: LiveSessionSchool;
  schoolAdminIds?: LiveSessionSchool[];
  schoolNames?: string[];
  createdAt?: string;
};

export type SchoolOption = {
  id: string;
  schoolName: string;
};

export type LiveSessionForm = {
  title: string;
  youtubeUrl: string;
  schoolAdminIds: string[];
  visibility: LiveSessionVisibility;
  description: string;
};

export const VISIBILITY_LABELS: Record<LiveSessionVisibility, string> = {
  teacher: 'Teachers only',
  student: 'Students only',
  both: 'Teachers & Students',
};

function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export function mapSchoolOption(raw: Record<string, unknown>): SchoolOption | null {
  const adminId = String(raw.adminUserId || raw.id || raw._id || '').trim();
  if (!adminId || !isMongoObjectId(adminId)) return null;
  return {
    id: adminId,
    schoolName: String(raw.schoolName || raw.name || 'Unnamed school'),
  };
}

export function sessionSchoolNames(session: LiveSession): string[] {
  const names: string[] = [];
  if (session.schoolNames?.length) {
    names.push(...session.schoolNames);
  } else if (session.schoolAdminIds?.length) {
    for (const school of session.schoolAdminIds) {
      if (school?.schoolName) names.push(school.schoolName);
    }
  } else if (session.adminId?.schoolName) {
    names.push(session.adminId.schoolName);
  }
  return [...new Set(names.filter(Boolean))];
}

export function emptyLiveSessionForm(): LiveSessionForm {
  return {
    title: '',
    youtubeUrl: '',
    schoolAdminIds: [],
    visibility: 'both',
    description: '',
  };
}

export function formFromSession(session: LiveSession): LiveSessionForm {
  const schoolIds =
    session.schoolAdminIds?.map((s) => String(s._id)).filter(Boolean) ||
    (session.adminId?._id ? [String(session.adminId._id)] : []);

  return {
    title: session.title || '',
    youtubeUrl: session.youtubeUrl || '',
    schoolAdminIds: schoolIds,
    visibility: session.visibility || 'both',
    description: session.description || '',
  };
}

export async function fetchLiveSessions(): Promise<LiveSession[]> {
  const response = await api.get('/api/super-admin/streams');
  const data = response?.data;
  return data?.data || data?.streams || data || [];
}

export async function fetchSchoolOptions(): Promise<SchoolOption[]> {
  const response = await api.get('/api/super-admin/admins');
  const data = response?.data;
  const list = data?.data || data?.admins || data || [];
  return list
    .map((item: Record<string, unknown>) => mapSchoolOption(item))
    .filter((school: SchoolOption | null): school is SchoolOption => school !== null);
}

export async function createLiveSession(form: LiveSessionForm): Promise<void> {
  await api.post('/api/super-admin/live-sessions', {
    title: form.title.trim(),
    youtubeUrl: form.youtubeUrl.trim(),
    schoolAdminIds: form.schoolAdminIds,
    visibility: form.visibility,
    description: form.description.trim(),
    status: 'live',
  });
}

export async function updateLiveSession(id: string, form: LiveSessionForm): Promise<void> {
  await api.put(`/api/super-admin/live-sessions/${id}`, {
    title: form.title.trim(),
    youtubeUrl: form.youtubeUrl.trim(),
    schoolAdminIds: form.schoolAdminIds,
    visibility: form.visibility,
    description: form.description.trim(),
    status: 'live',
  });
}

export async function deleteLiveSession(id: string): Promise<void> {
  await api.delete(`/api/streams/${id}`);
}
