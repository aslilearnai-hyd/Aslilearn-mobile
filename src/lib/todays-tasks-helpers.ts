import { storageGetItem, storageSetItem } from './safe-storage';

const SCHEDULE_KEY = 'completed_schedule_items';

export function getContentTypeLabel(type: string) {
  if (type === 'Video') return 'Watch';
  if (type === 'TextBook' || type === 'Workbook') return 'Read';
  if (type === 'Material') return 'Review';
  return 'Complete';
}

export function getSubjectName(contentItem: any): string {
  if (typeof contentItem.subjectId === 'object' && contentItem.subjectId?.name) {
    return contentItem.subjectId.name;
  }
  if (typeof contentItem.subject === 'string') return contentItem.subject;
  if (typeof contentItem.subject === 'object' && contentItem.subject?.name) {
    return contentItem.subject.name;
  }
  return 'Unknown Subject';
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getTaskTimeLabel(item: any, isQuiz: boolean) {
  const candidate =
    item?.startTime ||
    item?.scheduledTime ||
    item?.startDate ||
    item?.deadline ||
    item?.dueDate ||
    item?.scheduledDate;
  if (candidate) {
    const dt = new Date(candidate);
    if (!Number.isNaN(dt.getTime())) {
      const itemDay = formatDateKey(dt);
      const todayDay = formatDateKey(new Date());
      if (itemDay !== todayDay) {
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  }
  if (isQuiz && item?.duration) return `${item.duration} min`;
  return 'Anytime';
}

export async function loadCompletedScheduleIds(): Promise<Set<string>> {
  const todayKey = new Date().toDateString();
  try {
    const stored = await storageGetItem(SCHEDULE_KEY);
    if (!stored) return new Set();
    const data = JSON.parse(stored);
    if (data.date && Array.isArray(data.completedIds)) {
      if (data.date === todayKey) return new Set(data.completedIds.map(String));
      await storageSetItem(
        SCHEDULE_KEY,
        JSON.stringify({ date: todayKey, completedIds: [] })
      );
      return new Set();
    }
    if (Array.isArray(data)) return new Set(data.map(String));
  } catch {
    /* ignore */
  }
  return new Set();
}

export async function saveCompletedScheduleIds(ids: Set<string>) {
  const todayKey = new Date().toDateString();
  await storageSetItem(
    SCHEDULE_KEY,
    JSON.stringify({ date: todayKey, completedIds: Array.from(ids) })
  );
}

export async function collectCompletedContentIds(subjectIds: string[] = []): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const subjectId of subjectIds) {
    try {
      const stored = await storageGetItem(`completed_content_${subjectId}`);
      if (!stored) continue;
      const list = JSON.parse(stored);
      if (Array.isArray(list)) list.forEach((id: string) => ids.add(String(id)));
    } catch {
      /* ignore */
    }
  }
  const scheduleIds = await loadCompletedScheduleIds();
  scheduleIds.forEach((id) => ids.add(id));
  return ids;
}

export type ScheduleCompletionStats = {
  totalContent: number;
  completedContent: number;
  totalQuizzes: number;
  completedQuizzes: number;
  total: number;
  completed: number;
  completionPercent: number;
};

export function collectSubjectIdsFromContent(allContent: any[]): string[] {
  const ids = new Set<string>();
  for (const item of allContent) {
    const raw = item?.subjectId ?? item?.subject;
    if (typeof raw === 'object' && raw?._id) ids.add(String(raw._id));
    else if (typeof raw === 'object' && raw?.id) ids.add(String(raw.id));
    else if (raw) ids.add(String(raw));
  }
  return Array.from(ids);
}

/** Overall content + quiz completion (web dashboard parity). */
export async function buildScheduleCompletionStats(
  allContent: any[],
  allQuizzes: any[],
  subjectIds: string[] = []
): Promise<ScheduleCompletionStats> {
  const mergedSubjectIds = [
    ...new Set([...subjectIds, ...collectSubjectIdsFromContent(allContent)]),
  ];
  const completedContentIds = await collectCompletedContentIds(mergedSubjectIds);
  const trackableContent = allContent.filter(
    (content) => String(content.type || '').toLowerCase() !== 'homework'
  );
  const completedContent = trackableContent.filter((content) =>
    completedContentIds.has(String(content._id || content.id))
  ).length;
  const completedQuizzes = allQuizzes.filter(
    (quiz) => quiz.hasAttempted || quiz.completedAt
  ).length;
  const totalContent = trackableContent.length;
  const totalQuizzes = allQuizzes.length;
  const total = totalContent + totalQuizzes;
  const completed = completedContent + completedQuizzes;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    totalContent,
    completedContent,
    totalQuizzes,
    completedQuizzes,
    total,
    completed,
    completionPercent,
  };
}
