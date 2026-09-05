import { API_BASE_URL } from '../lib/api-config';
import { extractYouTubeId } from './contentPreview';

export type EduOTTVideoLike = {
  thumbnailUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  youtubeUrl?: string | null;
  isYouTubeVideo?: boolean;
};

export { extractYouTubeId };

export function resolveYouTubeUrl(video: EduOTTVideoLike): string | null {
  const candidates = [video.youtubeUrl, video.videoUrl, video.fileUrl].filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0,
  );
  for (const url of candidates) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return url;
  }
  return null;
}

function normalizeThumbnailUrl(thumbnailUrl: string): string {
  const trimmed = thumbnailUrl.trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('//') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/${trimmed}`;
}

/** Ordered candidates — higher resolution first for tablet / large cards. */
export function getEduOTTThumbnailUrls(video: EduOTTVideoLike): string[] {
  const urls: string[] = [];
  if (video.thumbnailUrl?.trim()) {
    urls.push(normalizeThumbnailUrl(video.thumbnailUrl));
  }
  const youtubeUrl = resolveYouTubeUrl(video);
  if (youtubeUrl) {
    const id = extractYouTubeId(youtubeUrl);
    if (id) {
      urls.push(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`);
      urls.push(`https://img.youtube.com/vi/${id}/sddefault.jpg`);
      urls.push(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
    }
  }
  return [...new Set(urls)];
}

export function getEduOTTThumbnailUrl(video: EduOTTVideoLike): string | null {
  const urls = getEduOTTThumbnailUrls(video);
  return urls[0] ?? null;
}

type DurationSource = {
  duration?: number | null;
  durationSeconds?: number | null;
};

export function resolveContentDurationSeconds(source: DurationSource): number {
  if (source.durationSeconds != null && Number(source.durationSeconds) > 0) {
    return Math.round(Number(source.durationSeconds));
  }
  const raw = Number(source.duration);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw >= 600) return Math.round(raw);
  return Math.round(raw * 60);
}

/** Card badge format — e.g. 1:43, 8:05 */
export function formatEduOTTDurationLabel(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  if (sec <= 0) return '';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export type LiveSessionLike = {
  _id?: string;
  status?: 'scheduled' | 'live' | 'ended' | 'cancelled' | string;
};

export function canJoinLiveSession(session: LiveSessionLike): boolean {
  const status = session.status || 'live';
  return ['live', 'scheduled'].includes(status);
}
