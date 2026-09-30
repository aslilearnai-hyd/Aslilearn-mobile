import { API_BASE_URL } from './api-config';

export function timetableImageSrc(imageUrl?: string | null): string {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}
