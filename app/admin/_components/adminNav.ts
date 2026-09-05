export type AdminNavView =
  | 'overview'
  | 'analytics'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'subjects'
  | 'exams'
  | 'omr-results'
  | 'assessments'
  | 'quizzes'
  | 'learning-paths'
  | 'eduott'
  | 'videos'
  | 'timetable'
  | 'calendar'
  | 'school-management'
  | 'vidya-ai';

type NavItem = {
  id: AdminNavView;
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
};

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: 'bar-chart-outline' },
  { id: 'students', label: 'Students', icon: 'people-outline' },
  { id: 'classes', label: 'Classes', icon: 'school-outline' },
  { id: 'teachers', label: 'Teachers', icon: 'person-circle-outline' },
  { id: 'subjects', label: 'Subjects', icon: 'book-outline' },
  { id: 'exams', label: 'Exams', icon: 'document-text-outline' },
  { id: 'omr-results', label: 'Offline Results', icon: 'scan-outline' },
  { id: 'learning-paths', label: 'Learning Paths', icon: 'locate-outline' },
  { id: 'eduott', label: 'EduOTT', icon: 'play-outline' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar-number-outline' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline' },
];

export function adminNavLabel(view: AdminNavView): string {
  return ADMIN_NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Dashboard';
}
