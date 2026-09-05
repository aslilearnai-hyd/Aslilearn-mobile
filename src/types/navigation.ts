export type RootStackParamList = {
  '(tabs)': undefined;
  'auth/login': undefined;
  'auth/register': undefined;
  'dashboard': undefined;
  'learning-paths': undefined;
  'subject/[id]': { id: string };
  'quiz/[id]': { id: string };
  'ai-tutor': undefined;
  'profile': undefined;
  'admin/dashboard': undefined;
  'admin/subject/[id]': { id: string };
  'admin/subjects': undefined;
  'teacher/dashboard': undefined;
  'teacher/subject/[id]': { id: string };
  'super-admin/login': undefined;
  'super-admin-dashboard': undefined;
  'super-admin/dashboard': undefined;
  'student-exams': undefined;
  'practice-tests': undefined;
  'onboarding': undefined;
};

export type StudentDashboardParams = {
  tab?: 'home' | 'learning' | 'eduott' | 'exams' | 'results' | 'timetable' | 'vidya';
};
export type TeacherDashboardParams = {
  tab?: 'dashboard' | 'students' | 'eduott' | 'learning-paths' | 'vidya-ai';
};
export type AdminDashboardParams = {
  tab?: 'overview' | 'students' | 'classes' | 'teachers' | 'vidya-ai' | 'eduott' | 'learning-paths';
};
export type SuperAdminDashboardParams = {
  tab?: 'dashboard' | 'admins' | 'analytics' | 'vidya-ai' | 'settings';
};


