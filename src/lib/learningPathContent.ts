/**
 * Shared helpers for opening Asli Prep / subject content (videos vs Drive docs).
 */

export type LearningPathContentItem = {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
  fileUrl?: string;
  driveLink?: string;
  youtubeUrl?: string;
  description?: string;
  duration?: number;
  completed?: boolean;
  classNumber?: string | number | null;
  productCategory?: string | null;
  topic?: string;
  subject?: {
    _id?: string;
    name?: string;
    classNumber?: string | number | null;
    productCategory?: string | null;
  } | string;
};

export function isVideoContent(content: LearningPathContentItem): boolean {
  const t = (content.type || '').toLowerCase();
  if (t === 'video' || t === 'youtube' || t === 'lecture') return true;
  if (content.youtubeUrl) return true;
  const url = (content.fileUrl || content.driveLink || '').toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return true;
  if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url)) return true;
  return false;
}
