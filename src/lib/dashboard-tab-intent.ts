/**
 * One-shot dashboard tab intents.
 * Kept in memory (not the URL) so a reload always opens the default home tab,
 * while back-from-tools / deep links can still land on a specific section.
 */

export type StudentDashboardTabIntent =
  | 'home'
  | 'learning'
  | 'eduott'
  | 'exams'
  | 'results'
  | 'timetable'
  | 'vidya';

export type TeacherDashboardTabIntent =
  | 'dashboard'
  | 'overview'
  | 'classes'
  | 'students'
  | 'eduott'
  | 'learning-paths'
  | 'vidya-ai'
  | 'calendar'
  | 'results'
  | 'settings'
  | 'reports';

export type AdminDashboardTabIntent =
  | 'overview'
  | 'analytics'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'subjects'
  | 'exams'
  | 'assessments'
  | 'quizzes'
  | 'learning-paths'
  | 'eduott'
  | 'videos'
  | 'timetable'
  | 'calendar'
  | 'vidya-ai';

/** Subset commonly deep-linked via legacy ?tab= on super-admin. */
export type SuperAdminDashboardTabIntent =
  | 'dashboard'
  | 'admins'
  | 'analytics'
  | 'vidya-ai'
  | 'settings'
  | 'board'
  | 'subjects-and-content'
  | 'exams'
  | 'subscriptions'
  | 'ai-generator'
  | 'ai-tool-topics'
  | 'ai-tool-generations';

let studentIntent: StudentDashboardTabIntent | null = null;
let teacherIntent: TeacherDashboardTabIntent | null = null;
let adminIntent: AdminDashboardTabIntent | null = null;
let superAdminIntent: SuperAdminDashboardTabIntent | null = null;

/** Student Learning tab chips: subjects catalog vs quizzes list. */
export type LearningPathsSubTabIntent = 'subjects' | 'quizzes';

let learningPathsSubTabIntent: LearningPathsSubTabIntent | null = null;

export function setLearningPathsSubTabIntent(tab: LearningPathsSubTabIntent) {
  learningPathsSubTabIntent = tab;
}

export function consumeLearningPathsSubTabIntent(): LearningPathsSubTabIntent | null {
  const next = learningPathsSubTabIntent;
  learningPathsSubTabIntent = null;
  return next;
}

export function setStudentDashboardTabIntent(tab: StudentDashboardTabIntent) {
  studentIntent = tab;
}

export function consumeStudentDashboardTabIntent(): StudentDashboardTabIntent | null {
  const next = studentIntent;
  studentIntent = null;
  return next;
}

export function setTeacherDashboardTabIntent(tab: TeacherDashboardTabIntent) {
  teacherIntent = tab;
}

export function consumeTeacherDashboardTabIntent(): TeacherDashboardTabIntent | null {
  const next = teacherIntent;
  teacherIntent = null;
  return next;
}

export function setAdminDashboardTabIntent(tab: AdminDashboardTabIntent) {
  adminIntent = tab;
}

export function consumeAdminDashboardTabIntent(): AdminDashboardTabIntent | null {
  const next = adminIntent;
  adminIntent = null;
  return next;
}

export function setSuperAdminDashboardTabIntent(tab: SuperAdminDashboardTabIntent) {
  superAdminIntent = tab;
}

export function consumeSuperAdminDashboardTabIntent(): SuperAdminDashboardTabIntent | null {
  const next = superAdminIntent;
  superAdminIntent = null;
  return next;
}
