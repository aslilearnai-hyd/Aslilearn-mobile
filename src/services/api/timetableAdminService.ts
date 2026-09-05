import { storageGetItem } from '../../lib/safe-storage';
import { API_BASE_URL } from '../../lib/api-config';
import api from './api';

export type TimetableFilters = {
  startDate?: string;
  endDate?: string;
  classId?: string;
  teacherId?: string;
  subjectId?: string;
  room?: string;
  status?: string;
  sessionType?: string;
  sectionId?: string;
};

function buildQuery(filters: TimetableFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function asArray(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data;
  }
  return [];
}

export async function fetchTimetableEntries(filters: TimetableFilters = {}) {
  const response = await api.get(`/api/timetable${buildQuery(filters)}`);
  return asArray(response?.data).filter(Boolean);
}

export async function createTimetableEntry(payload: Record<string, unknown>) {
  const response = await api.post('/api/timetable', payload);
  return response?.data;
}

export async function updateTimetableEntry(id: string, payload: Record<string, unknown>) {
  const response = await api.put(`/api/timetable/${id}`, payload);
  return response?.data;
}

export async function deleteTimetableEntry(id: string) {
  await api.delete(`/api/timetable/${id}`);
}

export async function bulkDeleteTimetable(filters: TimetableFilters) {
  const response = await api.post(`/api/timetable/bulk-delete${buildQuery(filters)}`);
  return response?.data as { deleted?: number };
}

export async function bulkDeleteRepeatGroup(groupId: string) {
  const response = await api.delete(`/api/timetable/group/${groupId}`);
  return response?.data as { deleted?: number };
}

export async function importTimetableCsv(
  uri: string,
  name: string,
  mimeType?: string,
  mode: 'import' | 'replace' | 'merge' = 'import'
) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name,
    type: mimeType || 'text/csv',
  } as unknown as Blob);
  formData.append('mode', mode);
  const response = await api.post('/api/timetable/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response?.data as { imported?: number; skipped?: number };
}

async function fetchCsvText(path: string): Promise<string> {
  const token = await storageGetItem('authToken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || 'Request failed');
  }
  return response.text();
}

export function exportTimetableCsv(filters: TimetableFilters = {}) {
  return fetchCsvText(`/api/timetable/export/csv${buildQuery(filters)}`);
}

export function downloadTimetableTemplate() {
  return fetchCsvText('/api/timetable/template/csv');
}
