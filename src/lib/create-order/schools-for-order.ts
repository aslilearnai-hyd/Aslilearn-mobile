import api from '../../services/api/api';
import type { School } from './types';

type AdminSchoolRow = {
  id?: string;
  schoolId?: string;
  schoolName?: string;
  place?: string;
  state?: string;
  isAsliPrepExclusive?: boolean;
  curriculumBoard?: string;
  board?: string;
  schoolDetails?: {
    city?: string;
    state?: string;
  };
};

export function mapAdminRowToSchool(row: AdminSchoolRow): School | null {
  const name = String(row.schoolName || '').trim();
  if (!name) return null;

  const city =
    String(row.schoolDetails?.city || row.place || row.state || '').trim() || '—';

  const brand = row.isAsliPrepExclusive
    ? 'Asli Prep'
    : String(row.curriculumBoard || row.board || 'Standard').trim();

  return {
    id: String(row.id || row.schoolId || ''),
    schoolId: String(row.schoolId || row.id || ''),
    name,
    city,
    brand,
    state: String(row.schoolDetails?.state || row.state || '').trim() || undefined,
  };
}

export async function fetchSchoolsForOrder(): Promise<School[]> {
  const response = await api.get('/api/super-admin/admins');
  const json = response?.data;
  const rows: AdminSchoolRow[] = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
      ? json.data
      : [];

  return rows
    .map(mapAdminRowToSchool)
    .filter((s): s is School => s !== null && Boolean(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}
