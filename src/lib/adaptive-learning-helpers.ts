export const ADAPTIVE_RECOMMENDATIONS_PER_SUBJECT_MAX = 2;

export type AdaptiveRecommendedItem = {
  kind: string;
  _id: string;
  title: string;
  displayType: string;
  relevance?: number;
};

const ADAPTIVE_TYPE_PICK_ORDER = [
  'quiz',
  'exam',
  'video',
  'pdf',
  'practice',
  'assignment',
  'audio',
  'exam-paper',
  'other',
] as const;

function adaptiveItemTypeKey(item: AdaptiveRecommendedItem): string {
  const kind = (item.kind || '').toLowerCase();
  if (kind === 'quiz' || kind === 'exam') return kind;
  const display = (item.displayType || '').toLowerCase();
  if (display === 'video') return 'video';
  if (display === 'pdf') return 'pdf';
  if (display === 'practice') return 'practice';
  if (display === 'assignment') return 'assignment';
  if (display === 'audio') return 'audio';
  if (display.includes('previous') || display.includes('paper')) return 'exam-paper';
  return display || 'other';
}

/** Show 1–2 items per subject — highest relevance first, second prefers a different type. */
export function capAdaptiveRecommendationsPerSubject<T extends AdaptiveRecommendedItem>(
  items: T[],
  maxPerSubject = ADAPTIVE_RECOMMENDATIONS_PER_SUBJECT_MAX
): T[] {
  if (!items?.length) return [];
  if (items.length <= maxPerSubject) return items;

  const picked: T[] = [items[0]];
  if (maxPerSubject <= 1) return picked;

  const firstType = adaptiveItemTypeKey(items[0]);
  const usedIds = new Set([items[0]._id]);

  for (const typeKey of ADAPTIVE_TYPE_PICK_ORDER) {
    if (typeKey === firstType) continue;
    const match = items.find(
      (item) => !usedIds.has(item._id) && adaptiveItemTypeKey(item) === typeKey
    );
    if (match) {
      picked.push(match);
      return picked;
    }
  }

  const fallback = items.find((item) => !usedIds.has(item._id));
  if (fallback) picked.push(fallback);

  return picked;
}
