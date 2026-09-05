export function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getExamSubjectLabel(exam: any): string {
  if (typeof exam?.subject === 'string' && exam.subject.trim()) return exam.subject;
  if (Array.isArray(exam?.subjects) && exam.subjects.length > 0) return exam.subjects.join(', ');
  return exam?.subject?.name || 'Exam';
}

export function eachLocalDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= endDay.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type ExamDayRole = 'start' | 'end' | 'middle' | 'single';

export function getExamDayRole(day: Date, start: Date, end: Date): ExamDayRole {
  const dayKey = formatCalendarDateKey(day);
  const startKey = formatCalendarDateKey(start);
  const endKey = formatCalendarDateKey(end);
  if (startKey === endKey) return 'single';
  if (dayKey === startKey) return 'start';
  if (dayKey === endKey) return 'end';
  return 'middle';
}

export function isDateWithinExamWindow(day: Date, exam: any): boolean {
  const start = parseCalendarDate(exam?.startDate);
  if (!start) return false;
  const end = parseCalendarDate(exam?.endDate) ?? start;
  const key = formatCalendarDateKey(day);
  const startKey = formatCalendarDateKey(start);
  const endKey = formatCalendarDateKey(end);
  return key >= startKey && key <= endKey;
}

export type ExamCalendarEntry = {
  id: string;
  type: 'exam';
  title: string;
  subject: string;
  date: Date;
  source: any;
  examDayRole: ExamDayRole;
  windowStart: Date;
  windowEnd: Date;
};

export function buildExamCalendarEntries(exams: any[]): ExamCalendarEntry[] {
  const entries: ExamCalendarEntry[] = [];
  for (const exam of exams) {
    const start = parseCalendarDate(exam?.startDate);
    const end = parseCalendarDate(exam?.endDate) || start;
    if (!start || !end) continue;
    const examId = String(exam._id || exam.id || '');
    if (!examId) continue;

    const markerDays =
      formatCalendarDateKey(start) === formatCalendarDateKey(end)
        ? [new Date(start.getFullYear(), start.getMonth(), start.getDate())]
        : [
            new Date(start.getFullYear(), start.getMonth(), start.getDate()),
            new Date(end.getFullYear(), end.getMonth(), end.getDate()),
          ];

    for (const day of markerDays) {
      const slot = new Date(day);
      const role = getExamDayRole(day, start, end);
      if (role === 'end') {
        slot.setHours(end.getHours(), end.getMinutes(), 0, 0);
      } else {
        slot.setHours(start.getHours(), start.getMinutes(), 0, 0);
      }
      entries.push({
        id: examId,
        type: 'exam',
        title: exam.title || exam.examTitle || 'Exam',
        subject: getExamSubjectLabel(exam),
        date: slot,
        source: exam,
        examDayRole: role,
        windowStart: start,
        windowEnd: end,
      });
    }
  }
  return entries;
}

export type DayExamMarkers = {
  quizCount: number;
  examStartCount: number;
  examEndCount: number;
  examMiddleCount: number;
  examSingleCount: number;
  totalCount: number;
};

export function buildDayExamMarkers(
  entries: { type: string; examDayRole?: ExamDayRole }[]
): DayExamMarkers {
  let quizCount = 0;
  let examStartCount = 0;
  let examEndCount = 0;
  let examMiddleCount = 0;
  let examSingleCount = 0;

  for (const entry of entries) {
    if (entry.type === 'quiz') {
      quizCount += 1;
      continue;
    }
    if (entry.type !== 'exam') continue;
    switch (entry.examDayRole) {
      case 'start':
        examStartCount += 1;
        break;
      case 'end':
        examEndCount += 1;
        break;
      case 'middle':
        examMiddleCount += 1;
        break;
      default:
        examSingleCount += 1;
        break;
    }
  }

  return {
    quizCount,
    examStartCount,
    examEndCount,
    examMiddleCount,
    examSingleCount,
    totalCount: entries.length,
  };
}

export function formatExamWindowDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatExamEventDetail(entry: ExamCalendarEntry): string {
  const startLabel = formatExamWindowDate(entry.windowStart);
  const endLabel = formatExamWindowDate(entry.windowEnd);
  const openTime = entry.windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const closeTime = entry.windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  switch (entry.examDayRole) {
    case 'start':
      return `Opens ${openTime} · Window until ${endLabel}`;
    case 'end':
      return `Closes ${closeTime} · Opened ${startLabel}`;
    case 'middle':
      return `Active window · ${startLabel} – ${endLabel}`;
    default:
      return `${openTime} – ${closeTime} · ${startLabel}`;
  }
}

export function getExamDayRoleLabel(role: ExamDayRole | undefined): string | null {
  switch (role) {
    case 'start':
      return 'OPENS';
    case 'end':
      return 'CLOSES';
    case 'middle':
      return 'ACTIVE';
    case 'single':
      return 'EXAM DAY';
    default:
      return null;
  }
}

export type SchoolEventCalendarEntry = {
  id: string;
  type: 'event';
  title: string;
  subject: string;
  date: Date;
  source: any;
  description?: string;
};

export function buildSchoolEventCalendarEntries(events: any[]): SchoolEventCalendarEntry[] {
  const entries: SchoolEventCalendarEntry[] = [];
  for (const event of events) {
    const title = String(event?.title || event?.name || 'School event');
    const start = parseCalendarDate(event?.startDate || event?.date);
    const end = parseCalendarDate(event?.endDate || event?.startDate || event?.date) || start;
    if (!start || !end) continue;
    const id = String(event?.id || event?._id || title);
    for (const day of eachLocalDayInRange(start, end)) {
      const slot = new Date(day);
      slot.setHours(start.getHours(), start.getMinutes(), 0, 0);
      entries.push({
        id,
        type: 'event',
        title,
        subject: 'School event',
        date: slot,
        source: event,
        description: String(event?.description || ''),
      });
    }
  }
  return entries;
}
