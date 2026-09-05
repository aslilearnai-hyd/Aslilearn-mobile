import { addDays, format, isValid, parseISO, startOfWeek } from 'date-fns';

export const TIMETABLE_HOUR_START = 9;
export const TIMETABLE_HOUR_END = 17;

export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type TimetableEntryLike = {
  _id?: string;
  id?: string;
  day?: string;
  dayOfWeek?: string;
  date?: string;
  startTime: string;
  endTime: string;
  subject?: string;
  subjectId?: string | { name?: string; fullName?: string };
  classNumber?: string | number;
  section?: string;
  sectionId?: string;
  classId?: string | { _id?: string; classNumber?: string | number; section?: string };
  teacherId?: string | { _id?: string; fullName?: string; name?: string };
  room?: string;
  status?: string;
  sessionType?: string;
  colorTag?: string;
};

export type UnifiedScheduleEntry = {
  id: string;
  date: string;
  endDateKey?: string;
  /** Full ISO datetime from API (exams / admin events). */
  startAt?: string;
  endAt?: string;
  startTime: string;
  endTime: string;
  title: string;
  room?: string;
  eventType: 'class' | 'exam' | 'admin_event';
  subject?: string;
  classNumber?: string;
  description?: string;
  removable?: boolean;
};

export function isExamBoundaryDate(date: Date, entry: UnifiedScheduleEntry): boolean {
  if (entry.eventType !== 'exam') return false;
  const key = dateKeyForDate(date);
  const endKey = entry.endDateKey || entry.date;
  return key === entry.date || key === endKey;
}

export function getExamBoundaryMarkers(
  date: Date,
  entries: UnifiedScheduleEntry[],
): { isStart: boolean; isEnd: boolean } {
  const key = dateKeyForDate(date);
  let isStart = false;
  let isEnd = false;

  entries.forEach((entry) => {
    if (entry.eventType !== 'exam') return;
    const endKey = entry.endDateKey || entry.date;
    if (key === entry.date) isStart = true;
    if (key === endKey) isEnd = true;
  });

  return { isStart, isEnd };
}

export function parseScheduleInstant(raw?: string): Date | null {
  if (!raw) return null;
  const parsed = parseISO(String(raw));
  return isValid(parsed) ? parsed : null;
}

/** One-line schedule label for list cards. */
export function formatEventScheduleSummary(entry: UnifiedScheduleEntry): string {
  if (entry.eventType === 'class') {
    return `${entry.startTime} – ${entry.endTime}`;
  }

  const start = parseScheduleInstant(entry.startAt);
  const end = parseScheduleInstant(entry.endAt) || start;
  if (!start || !end) return `${entry.startTime} – ${entry.endTime}`;

  const endKey = entry.endDateKey || entry.date;
  const sameDay = entry.date === endKey;

  if (sameDay) {
    const timePart =
      entry.startTime === entry.endTime
        ? entry.startTime
        : `${entry.startTime} – ${entry.endTime}`;
    return `${format(start, 'MMM d, yyyy')} · ${timePart}`;
  }

  return `${format(start, 'MMM d, yyyy')}, ${entry.startTime} → ${format(end, 'MMM d, yyyy')}, ${entry.endTime}`;
}

export function formatEventScheduleDetail(entry: UnifiedScheduleEntry): {
  mode: 'class' | 'single' | 'range';
  startLabel: string;
  endLabel?: string;
} {
  if (entry.eventType === 'class') {
    return {
      mode: 'class',
      startLabel: `${entry.startTime} – ${entry.endTime}`,
    };
  }

  const start = parseScheduleInstant(entry.startAt);
  const end = parseScheduleInstant(entry.endAt) || start;
  if (!start) {
    return { mode: 'single', startLabel: `${entry.startTime} – ${entry.endTime}` };
  }

  const startLabel = format(start, 'EEE, MMM d, yyyy · HH:mm');
  if (!end || start.getTime() === end.getTime()) {
    return { mode: 'single', startLabel };
  }

  return {
    mode: 'range',
    startLabel,
    endLabel: format(end, 'EEE, MMM d, yyyy · HH:mm'),
  };
}

export interface GridPlacement {
  entry: TimetableEntryLike;
  dayIndex: WeekdayIndex;
  slotHour: number;
}

export function rawRefName(v: string | { name?: string; fullName?: string } | undefined): string {
  if (!v || typeof v === 'string') return typeof v === 'string' ? v.trim() : '';
  return String(v.name || v.fullName || '').trim();
}

export function isDeletedSubjectName(raw: string): boolean {
  const s = String(raw || '').trim();
  if (!s) return false;
  if (/__deleted__/i.test(s)) return true;
  if (/__dele[a-z]*$/i.test(s)) return true;
  if (/_deleted?$/i.test(s)) return true;
  return false;
}

export function cleanSubjectDisplayName(raw: string): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  const cut = s.search(/__deleted__/i);
  if (cut >= 0) s = s.slice(0, cut);
  s = s.replace(/__dele[a-z]*$/i, '');
  s = s.replace(/_deleted?$/i, '');
  return s.replace(/_+$/g, '').trim();
}

export function refName(v: string | { name?: string; fullName?: string } | undefined): string {
  return cleanSubjectDisplayName(rawRefName(v));
}

export function sanitizeTimetableEntries(entries: TimetableEntryLike[]): TimetableEntryLike[] {
  const cleaned: TimetableEntryLike[] = [];
  for (const entry of entries || []) {
    if (!entry || entry.status === 'Cancelled') continue;
    const rawSubject = rawRefName(entry.subjectId as any) || String(entry.subject || '');
    if (isDeletedSubjectName(rawSubject)) continue;
    const display = cleanSubjectDisplayName(rawSubject);
    let next = entry;
    if (typeof entry.subjectId === 'object' && entry.subjectId && display && display !== rawSubject) {
      next = { ...entry, subjectId: { ...entry.subjectId, name: display }, subject: display };
    } else if (display && entry.subject && display !== entry.subject) {
      next = { ...entry, subject: display };
    }
    cleaned.push(next);
  }

  const seen = new Set<string>();
  const out: TimetableEntryLike[] = [];
  for (const entry of cleaned) {
    const dayIndex = entryWeekdayIndex(entry);
    const subject =
      (refName(entry.subjectId as any) || cleanSubjectDisplayName(String(entry.subject || ''))).toLowerCase() ||
      'class';
    const key = `${dayIndex}|${entry.startTime}|${entry.endTime}|${subject}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatHourLabel(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export function formatSlotRange(hour: number): string {
  const start = `${String(hour).padStart(2, '0')}:00`;
  const end = `${String(hour + 1).padStart(2, '0')}:00`;
  return `${start} – ${end}`;
}

export function getTimeSlots(): number[] {
  const slots: number[] = [];
  for (let h = TIMETABLE_HOUR_START; h <= TIMETABLE_HOUR_END; h += 1) slots.push(h);
  return slots;
}

export function entryDateKey(entry: TimetableEntryLike): string {
  const raw = entry.date;
  if (typeof raw === 'string') return raw.slice(0, 10);
  if (raw) return format(new Date(raw), 'yyyy-MM-dd');
  return '';
}

export function entryWeekdayIndex(entry: TimetableEntryLike): WeekdayIndex | null {
  const day = (entry.dayOfWeek || entry.day || '').trim().toLowerCase();
  if (day.startsWith('mon')) return 0;
  if (day.startsWith('tue')) return 1;
  if (day.startsWith('wed')) return 2;
  if (day.startsWith('thu')) return 3;
  if (day.startsWith('fri')) return 4;
  if (day.startsWith('sat')) return 5;

  const key = entryDateKey(entry);
  if (!key) return null;
  const dow = parseISO(key).getDay();
  if (dow >= 1 && dow <= 6) return (dow - 1) as WeekdayIndex;
  return null;
}

export function todayWeekdayIndex(now = new Date()): WeekdayIndex | null {
  const dow = now.getDay();
  if (dow >= 1 && dow <= 6) return (dow - 1) as WeekdayIndex;
  return null;
}

export function getSlotHour(startTime: string): number | null {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (Number.isNaN(hour) || hour < TIMETABLE_HOUR_START || hour > TIMETABLE_HOUR_END) return null;
  return hour;
}

export function buildWeekdayPlacements(entries: TimetableEntryLike[]): GridPlacement[] {
  const seen = new Set<string>();
  const placements: GridPlacement[] = [];
  for (const entry of sanitizeTimetableEntries(entries)) {
    if (!entry) continue;
    const dayIndex = entryWeekdayIndex(entry);
    const slotHour = getSlotHour(entry.startTime);
    if (dayIndex === null || slotHour === null) continue;
    const classKey =
      entry.classId != null && typeof entry.classId === 'object'
        ? String(entry.classId._id || entry.classId.classNumber || '')
        : String(entry.classId || entry.classNumber || '');
    const subject = (refName(entry.subjectId as any) || String(entry.subject || 'class')).toLowerCase();
    const dedupeKey = `${dayIndex}-${slotHour}-${entry.startTime}-${classKey}-${entry.sectionId || entry.section || ''}-${subject}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    placements.push({ entry, dayIndex, slotHour });
  }
  return placements;
}

export function getCellEntries(placements: GridPlacement[], dayIndex: WeekdayIndex, slotHour: number) {
  return placements.filter((p) => p.dayIndex === dayIndex && p.slotHour === slotHour).map((p) => p.entry);
}

export function teacherSlotLabel(entry: TimetableEntryLike | null | undefined): string {
  if (!entry) return '—';
  const parts: string[] = [];
  const classId = entry.classId;
  const classNum =
    classId != null && typeof classId === 'object' && classId.classNumber != null
      ? String(classId.classNumber)
      : entry.classNumber != null
        ? String(entry.classNumber)
        : '';
  if (classNum) parts.push(`Class ${classNum}`);
  const section =
    entry.sectionId ||
    entry.section ||
    (classId != null && typeof classId === 'object' ? classId.section : '');
  if (section) parts.push(`Sec ${section}`);
  if (entry.room?.trim()) parts.push(`Room ${entry.room.trim()}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function getWeekStart(anchor = new Date()): Date {
  return startOfWeek(anchor, { weekStartsOn: 1 });
}

export function formatWeekRange(weekStart: Date): string {
  return `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
}

export function weekdayNameForDate(date: Date): string {
  return format(date, 'EEEE');
}

export function dateKeyForDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function timetableEntriesForDate(
  entries: TimetableEntryLike[],
  date: Date
): UnifiedScheduleEntry[] {
  const fullDay = weekdayNameForDate(date);
  const dateKey = dateKeyForDate(date);

  return entries
    .filter((e) => {
      const day = (e.dayOfWeek || e.day || '').trim();
      if (!day) return false;
      return day === fullDay || day.toLowerCase().startsWith(fullDay.slice(0, 3).toLowerCase());
    })
    .map((e) => ({
      id: `${e._id || e.id || 'slot'}-${dateKey}`,
      date: dateKey,
      startTime: e.startTime,
      endTime: e.endTime,
      title: refName(e.subjectId) || e.subject || teacherSlotLabel(e) || 'Class',
      eventType: 'class' as const,
      subject: refName(e.subjectId) || e.subject || '',
      classNumber:
        e.classNumber != null
          ? String(e.classNumber)
          : e.classId != null && typeof e.classId === 'object' && e.classId.classNumber != null
            ? String(e.classId.classNumber)
            : '',
      room: e.room,
      removable: false,
    }));
}

export function hasTimetableOnDate(entries: TimetableEntryLike[], date: Date): boolean {
  return timetableEntriesForDate(entries, date).length > 0;
}

export function getSubjectColor(subject: string): { bg: string; border: string; text: string } {
  const s = subject.toLowerCase();
  if (s.includes('physics')) return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' };
  if (s.includes('biology') || s.includes('bio')) return { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' };
  if (s.includes('english') || s.includes('eng')) return { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' };
  if (s.includes('math')) return { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' };
  if (s.includes('chem')) return { bg: '#fdf2f8', border: '#fbcfe8', text: '#9d174d' };
  return { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' };
}
