import api from '../services/api/api';

export type CalendarEventType = 'exam' | 'holiday' | 'custom' | 'school_event';

export type CalendarEventRecord = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: CalendarEventType;
  examId?: string;
  description?: string;
  meta?: {
    examType?: string;
    subject?: string;
    duration?: number;
    schoolNames?: string[];
    schoolIds?: string[];
    isSchoolSpecific?: boolean;
  };
};

export type CalendarAdmin = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  schoolName?: string;
};

export type QuickAddFormState = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: 'low' | 'medium' | 'high';
  category: 'custom' | 'holiday' | 'school_event';
  notes: string;
};

export type ExamCalendarPrefill = {
  startDate: string;
  endDate: string;
  filterType: 'all-schools' | 'specific-schools';
  selectedSchools: string[];
};

export const EXAM_CALENDAR_PREFILL_KEY = 'examCalendarPrefill';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TYPE_STYLES: Record<
  CalendarEventType,
  { bar: string; dot: string; label: string; text: string }
> = {
  exam: { bar: '#2563eb', dot: '#3b82f6', label: 'Exam', text: '#1e40af' },
  holiday: { bar: '#059669', dot: '#10b981', label: 'Holiday', text: '#065f46' },
  custom: { bar: '#f97316', dot: '#fb923c', label: 'Custom', text: '#c2410c' },
  school_event: { bar: '#7c3aed', dot: '#8b5cf6', label: 'School', text: '#5b21b6' },
};

export function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeSchoolLabel(value?: string) {
  return (value || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyQuickAddForm(date = new Date()): QuickAddFormState {
  return {
    title: '',
    date: toDateInput(date),
    startTime: '09:00',
    endTime: '10:00',
    priority: 'medium',
    category: 'custom',
    notes: '',
  };
}

export function buildCalendarDays(currentDate: Date): Date[] {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const days: Date[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function buildEventsByDateKey(
  events: CalendarEventRecord[],
  calendarDays: Date[]
): Record<string, CalendarEventRecord[]> {
  const map: Record<string, CalendarEventRecord[]> = {};
  const visibleStart = stripTime(calendarDays[0]);
  const visibleEnd = stripTime(calendarDays[calendarDays.length - 1]);
  events.forEach((ev) => {
    const start = stripTime(new Date(ev.startDate));
    const end = stripTime(new Date(ev.endDate));
    const boundedStart = Math.max(start, visibleStart);
    const boundedEnd = Math.min(end, visibleEnd);
    if (boundedEnd < boundedStart) return;
    for (let t = boundedStart; t <= boundedEnd; t += 24 * 60 * 60 * 1000) {
      const key = new Date(t).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
  });
  return map;
}

export function filterMonthlyEvents(events: CalendarEventRecord[], currentDate: Date) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startMs = monthStart.getTime();
  const endMs = monthEnd.getTime();
  return events
    .filter((ev) => {
      const evStart = new Date(ev.startDate).getTime();
      const evEnd = new Date(ev.endDate).getTime();
      return evStart <= endMs && evEnd >= startMs;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function groupMonthlyEventsByDate(monthlyEvents: CalendarEventRecord[]) {
  const grouped = monthlyEvents.reduce<Record<string, CalendarEventRecord[]>>((acc, event) => {
    const key = new Date(event.startDate).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
  return Object.entries(grouped).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );
}

export function normalizeCalendarEvents(payload: unknown): CalendarEventRecord[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: CalendarEventRecord[] }).data
      : [];
  if (!Array.isArray(list)) return [];
  return list.map((ev) => ({
    ...ev,
    id: String(ev.id || (ev as { _id?: string })._id || ''),
  })).filter((ev) => ev.id);
}

export function mapAdminFromApi(admin: Record<string, unknown>): CalendarAdmin {
  return {
    id: String(admin.id || admin._id || ''),
    _id: admin._id ? String(admin._id) : undefined,
    name: String(admin.schoolName || admin.name || admin.email || 'School'),
    email: String(admin.email || ''),
    schoolName: admin.schoolName ? String(admin.schoolName) : undefined,
  };
}

export function sortAdmins(admins: CalendarAdmin[]) {
  return [...admins].sort((a, b) => {
    const aLabel = normalizeSchoolLabel(a.schoolName || a.name || a.email);
    const bLabel = normalizeSchoolLabel(b.schoolName || b.name || b.email);
    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
  });
}

export function buildExamPrefill(date: Date, selectedSchoolId: string): ExamCalendarPrefill {
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(date);
  end.setHours(21, 0, 0, 0);
  return {
    startDate: toDatetimeLocal(start),
    endDate: toDatetimeLocal(end),
    filterType: selectedSchoolId !== 'all' ? 'specific-schools' : 'all-schools',
    selectedSchools: selectedSchoolId !== 'all' ? [selectedSchoolId] : [],
  };
}

const CALENDAR_PATHS = ['/api/super-admin/calendar/events', '/api/calendar/events'] as const;

export async function fetchCalendarEvents(month: string, schoolId?: string) {
  const params: Record<string, string> = { month };
  if (schoolId && schoolId !== 'all') params.schoolId = schoolId;

  let lastError: unknown;
  for (const path of CALENDAR_PATHS) {
    try {
      const response = await api.get(path, { params });
      return normalizeCalendarEvents(response?.data);
    } catch (err: any) {
      lastError = err;
      if (err?.response?.status !== 404) throw err;
    }
  }
  throw lastError;
}

export async function createCalendarEvent(body: Record<string, unknown>) {
  let lastError: unknown;
  for (const path of CALENDAR_PATHS) {
    try {
      const response = await api.post(path, body);
      return response?.data;
    } catch (err: any) {
      lastError = err;
      if (err?.response?.status !== 404) throw err;
    }
  }
  throw lastError;
}

export function resolveEventSchoolLabel(
  event: CalendarEventRecord,
  admins: CalendarAdmin[],
  selectedSchoolId: string,
  selectedSchoolLabel: string
) {
  const schoolNamesFromEvent = event.meta?.schoolNames || [];
  const schoolIdsFromEvent = event.meta?.schoolIds || [];
  const schoolNamesFromIds = schoolIdsFromEvent
    .map((schoolId) => {
      const school = admins.find((a) => (a.id || a._id) === schoolId);
      return school?.schoolName || school?.name || school?.email || '';
    })
    .filter(Boolean);
  const resolvedSchoolNames =
    schoolNamesFromEvent.length > 0 ? schoolNamesFromEvent : schoolNamesFromIds;
  if (resolvedSchoolNames.length > 0) return resolvedSchoolNames.join(', ');
  if (event.meta?.isSchoolSpecific === false) return 'All Schools';
  if (selectedSchoolId !== 'all' && selectedSchoolLabel) return selectedSchoolLabel;
  return 'Specific Schools';
}
