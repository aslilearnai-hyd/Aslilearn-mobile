import { sortContentsChapterWise } from './video-chapter-schedule';
import {
  getLibraryContentClassNumber,
  getLibraryContentProductCategory,
} from './library-content-labels';

export const CONTENT_TYPE_ORDER = [
  'Video',
  'TextBook',
  'Workbook',
  'Material',
  'Audio',
  'Homework',
] as const;

export type LearningPathContentType = (typeof CONTENT_TYPE_ORDER)[number] | string;

export type GroupableContent = {
  _id: string;
  type: string;
  [key: string]: unknown;
};

export type LearningPathClassGroup<T extends GroupableContent> = {
  key: string;
  label: string;
  items: T[];
};

export type LearningPathSection<T extends GroupableContent> = {
  type: string;
  items: T[];
  iit?: boolean;
  classGroups?: LearningPathClassGroup<T>[];
};

const TRACK_ORDER = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'];

function classSortValue(value: string): number {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

function sortIitItemsByClassAndTrack<T extends GroupableContent>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const classDiff =
      classSortValue(getLibraryContentClassNumber(a)) - classSortValue(getLibraryContentClassNumber(b));
    if (classDiff !== 0) return classDiff;
    const trackA = getLibraryContentProductCategory(a);
    const trackB = getLibraryContentProductCategory(b);
    const trackDiff =
      (TRACK_ORDER.indexOf(trackA) === -1 ? 99 : TRACK_ORDER.indexOf(trackA)) -
      (TRACK_ORDER.indexOf(trackB) === -1 ? 99 : TRACK_ORDER.indexOf(trackB));
    if (trackDiff !== 0) return trackDiff;
    return String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true });
  });
}

export function groupContentsByType<T extends GroupableContent>(items: T[]): { type: string; items: T[] }[] {
  const grouped = items.reduce<Record<string, T[]>>((acc, item) => {
    const type = item.type?.trim() || 'Content';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const ordered = [
    ...CONTENT_TYPE_ORDER.filter((type) => grouped[type]?.length),
    ...Object.keys(grouped).filter((type) => !CONTENT_TYPE_ORDER.includes(type as (typeof CONTENT_TYPE_ORDER)[number])),
  ];

  return ordered.map((type) => ({
    type,
    items:
      String(type).toLowerCase() === 'video'
        ? sortContentsChapterWise(grouped[type])
        : grouped[type],
  }));
}

/** Board type sections, then one IIT section with Class 6 / Class 7 groups inside. */
export function groupLearningPathContentsWithIit<T extends GroupableContent>(
  items: T[],
  isIit: (item: T) => boolean,
): LearningPathSection<T>[] {
  const board = items.filter((item) => !isIit(item));
  const iit = items.filter(
    (item) => isIit(item) && String(item.type || '').toLowerCase() !== 'video',
  );
  const sections: LearningPathSection<T>[] = groupContentsByType(board).map((s) => ({
    ...s,
    iit: false,
  }));
  if (iit.length === 0) return sections;

  const sortedIit = sortIitItemsByClassAndTrack(iit);
  const byClass = new Map<string, T[]>();
  for (const item of sortedIit) {
    const classNumber = getLibraryContentClassNumber(item);
    const key = classNumber || '';
    const list = byClass.get(key);
    if (list) list.push(item);
    else byClass.set(key, [item]);
  }

  const classKeys = Array.from(byClass.keys()).sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return classSortValue(a) - classSortValue(b);
  });

  const classGroups: LearningPathClassGroup<T>[] = classKeys.map((classNumber) => ({
    key: classNumber || 'other',
    label: classNumber ? `Class ${classNumber}` : 'Other',
    items: byClass.get(classNumber) || [],
  }));

  sections.push({
    type: 'IIT',
    items: sortedIit,
    iit: true,
    classGroups,
  });
  return sections;
}
