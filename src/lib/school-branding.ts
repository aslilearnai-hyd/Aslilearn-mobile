import { API_BASE_URL } from './api-config';

export type SchoolBranding = {
  schoolName: string;
  schoolLogo: string | null;
};

export function resolveSchoolLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  const trimmed = String(logoUrl).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

/** School name + logo for the member's assigned school (admin, teacher, student). */
export function getSchoolBranding(user?: {
  schoolName?: string;
  schoolLogo?: string;
  assignedAdmin?: { schoolName?: string; schoolLogo?: string };
  school?: { name?: string; schoolLogo?: string };
} | null): SchoolBranding | null {
  if (!user) return null;

  const schoolName = String(
    user.schoolName || user.assignedAdmin?.schoolName || user.school?.name || ''
  ).trim();
  const logoRaw = String(
    user.schoolLogo || user.assignedAdmin?.schoolLogo || user.school?.schoolLogo || ''
  ).trim();

  if (!schoolName && !logoRaw) return null;

  return {
    schoolName,
    schoolLogo: resolveSchoolLogoUrl(logoRaw),
  };
}
