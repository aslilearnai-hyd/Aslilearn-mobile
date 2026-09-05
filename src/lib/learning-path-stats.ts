import { isVideoContent } from './learningPathContent';
import { CONTENT_TYPE_ORDER } from './learning-path-content-groups';

export type LearningPathDisplayStats = {
  textbooks: number;
  materials: number;
  videos: number;
};

function canonicalContentType(item: { type?: string; contentType?: string }): string | null {
  const raw = String(item?.type || item?.contentType || '').trim();
  if (!raw) return null;
  return CONTENT_TYPE_ORDER.find((t) => t.toLowerCase() === raw.toLowerCase()) || raw;
}

/** Map catalog content into Textbooks / Materials / Videos tiles (no double-counting). */
export function countLearningPathDisplayStats(
  contents: readonly { type?: string; contentType?: string }[] | null | undefined
): LearningPathDisplayStats {
  let textbooks = 0;
  let materials = 0;
  let videos = 0;

  for (const item of contents || []) {
    const type = canonicalContentType(item);
    if (!type) {
      if (isVideoContent(item)) videos += 1;
      continue;
    }
    switch (type) {
      case 'TextBook':
      case 'Workbook':
        textbooks += 1;
        break;
      case 'Material':
      case 'Homework':
      case 'Audio':
        materials += 1;
        break;
      case 'Video':
        videos += 1;
        break;
      default:
        if (isVideoContent(item)) videos += 1;
        break;
    }
  }

  return { textbooks, materials, videos };
}

export function learningPathStatsTotal(stats: LearningPathDisplayStats): number {
  return stats.textbooks + stats.materials + stats.videos;
}
