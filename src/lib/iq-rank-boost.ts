export type IQActivityType = 'iq-test' | 'rank-boost' | 'challenge' | 'quiz' | 'daily' | 'weekly';
export type IQDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type QuizScheduleType = 'once' | 'daily' | 'weekly';
export type QuizAudienceType =
  | 'all_schools'
  | 'schools'
  | 'trial'
  | 'all_members'
  | 'specific_members';

export interface IQActivity {
  _id: string;
  title: string;
  description: string;
  type: IQActivityType;
  difficulty: IQDifficulty;
  points: number;
  duration: number;
  subject?: { _id: string; name: string };
  board?: string;
  classNumber?: string;
  questions: number;
  isActive: boolean;
  trialOnly?: boolean;
  promptOnLogin?: boolean;
  scheduleType?: QuizScheduleType;
  audienceType?: QuizAudienceType;
  audienceRoles?: Array<'student' | 'teacher'>;
  targetSchools?: string[];
  targetUserIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  participants?: number;
  averageScore?: number;
  completionRate?: number;
}

export interface IQActivityFormState {
  title: string;
  description: string;
  type: IQActivityType;
  difficulty: IQDifficulty;
  points: number;
  duration: number;
  subject: string;
  board: string;
  classNumber: string;
  questions: number;
  isActive: boolean;
  scheduleType: QuizScheduleType;
  audienceType: QuizAudienceType;
  audienceRoles: Array<'student' | 'teacher'>;
  targetSchools: string[];
  targetUserIdsText: string;
  trialOnly: boolean;
  promptOnLogin: boolean;
}

export interface QuestionGeneratorFormState {
  numberOfQuestions: number;
  difficulty: string;
  subject: string;
  topic: string;
  subtopic: string;
}

export const IQ_ACTIVITY_TYPES = [
  { value: 'quiz' as const, label: 'Quiz' },
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'challenge' as const, label: 'Challenge' },
];

export const QUIZ_SCHEDULE_TYPES = [
  { value: 'once' as const, label: 'One-time' },
  { value: 'daily' as const, label: 'Daily quiz' },
  { value: 'weekly' as const, label: 'Weekly quiz' },
];

export const QUIZ_AUDIENCE_TYPES = [
  { value: 'all_schools' as const, label: 'All schools' },
  { value: 'schools' as const, label: 'Specific school(s)' },
  { value: 'trial' as const, label: 'Trial members' },
  { value: 'all_members' as const, label: 'All members' },
  { value: 'specific_members' as const, label: 'Specific members' },
];

export const IQ_DIFFICULTIES = [
  { value: 'easy' as const, label: 'Easy' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'hard' as const, label: 'Hard' },
  { value: 'expert' as const, label: 'Expert' },
];

export const CLASS_NUMBERS = [6, 7, 8, 9, 10, 11, 12] as const;

export const emptyActivityForm = (): IQActivityFormState => ({
  title: '',
  description: '',
  type: 'quiz',
  difficulty: 'medium',
  points: 100,
  duration: 30,
  subject: '',
  board: '',
  classNumber: 'all',
  questions: 10,
  isActive: true,
  scheduleType: 'once',
  audienceType: 'all_schools',
  audienceRoles: ['student'],
  targetSchools: [],
  targetUserIdsText: '',
  trialOnly: false,
  promptOnLogin: false,
});

export const emptyGeneratorForm = (): QuestionGeneratorFormState => ({
  numberOfQuestions: 10,
  difficulty: 'medium',
  subject: '',
  topic: '',
  subtopic: '',
});

export const activityFormFromActivity = (activity: IQActivity): IQActivityFormState => ({
  title: activity.title,
  description: activity.description,
  type: activity.type,
  difficulty: activity.difficulty,
  points: activity.points,
  duration: activity.duration,
  subject: activity.subject?._id || '',
  board: activity.board || '',
  classNumber: activity.classNumber || 'all',
  questions: activity.questions,
  isActive: activity.isActive,
  scheduleType:
    activity.scheduleType ||
    (activity.type === 'daily' ? 'daily' : activity.type === 'weekly' ? 'weekly' : 'once'),
  audienceType: activity.audienceType || (activity.trialOnly ? 'trial' : 'all_schools'),
  audienceRoles: activity.audienceRoles?.length ? activity.audienceRoles : ['student'],
  targetSchools: (activity.targetSchools || []).map(String),
  targetUserIdsText: (activity.targetUserIds || []).map(String).join(', '),
  trialOnly: Boolean(activity.trialOnly),
  promptOnLogin: Boolean(activity.promptOnLogin),
});

export function buildQuizCreatePayload(form: IQActivityFormState) {
  const targetUserIds = String(form.targetUserIdsText || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: form.title,
    description: form.description,
    type:
      form.scheduleType === 'daily' ? 'daily' : form.scheduleType === 'weekly' ? 'weekly' : 'quiz',
    difficulty: form.difficulty,
    points: form.points,
    duration: form.duration,
    subject: form.subject,
    board: form.board,
    classNumber: form.classNumber || 'all',
    questions: form.questions,
    isActive: form.isActive,
    scheduleType: form.scheduleType,
    audienceType: form.audienceType,
    audienceRoles: form.audienceRoles,
    targetSchools: form.audienceType === 'schools' ? form.targetSchools : [],
    targetUserIds: form.audienceType === 'specific_members' ? targetUserIds : [],
    trialOnly: form.audienceType === 'trial',
    promptOnLogin: form.audienceType === 'trial' ? form.promptOnLogin : false,
  };
}

export const getClassStats = (activities: IQActivity[], classNum: number) => {
  const classActivities = activities.filter(
    (a) => a.classNumber === classNum.toString() && !a.trialOnly,
  );
  return {
    total: classActivities.length,
    active: classActivities.filter((a) => a.isActive).length,
    questions: classActivities.reduce((sum, a) => sum + (a.questions || 0), 0),
    participants: classActivities.reduce((sum, a) => sum + (a.participants || 0), 0),
  };
};

export const getTypeIconName = (type: string): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap => {
  switch (type) {
    case 'daily':
      return 'sunny-outline';
    case 'weekly':
      return 'calendar-outline';
    case 'challenge':
      return 'locate-outline';
    case 'quiz':
    default:
      return 'trophy-outline';
  }
};

export const getTypeColorStyle = (type: string) => {
  switch (type) {
    case 'daily':
      return { bg: '#ecfeff', text: '#0e7490' };
    case 'weekly':
      return { bg: '#f0fdf4', text: '#15803d' };
    case 'challenge':
      return { bg: '#fee2e2', text: '#b91c1c' };
    case 'quiz':
    default:
      return { bg: '#e0f2fe', text: '#0369a1' };
  }
};

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'hard':
      return '#ef4444';
    case 'expert':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
};

export function sanitizeTopicStrings(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const t = String(r ?? '').trim();
    if (!t) continue;
    const k = t.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export const normalizeActivitiesResponse = (payload: unknown): IQActivity[] => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: IQActivity[] }).data
      : [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item: any) => ({
      _id: String(item?._id || ''),
      title: String(item?.title || ''),
      description: String(item?.description || ''),
      type: (item?.type || 'quiz') as IQActivityType,
      difficulty: (item?.difficulty || 'medium') as IQDifficulty,
      points: Number(item?.points ?? 0),
      duration: Number(item?.duration ?? 0),
      subject: item?.subject,
      board: item?.board,
      classNumber: item?.classNumber != null ? String(item.classNumber) : undefined,
      questions: Number(item?.questions ?? 0),
      isActive: item?.isActive !== false,
      trialOnly: Boolean(item?.trialOnly),
      promptOnLogin: Boolean(item?.promptOnLogin),
      scheduleType: (item?.scheduleType || 'once') as QuizScheduleType,
      audienceType: (item?.audienceType ||
        (item?.trialOnly ? 'trial' : 'all_schools')) as QuizAudienceType,
      audienceRoles: Array.isArray(item?.audienceRoles) ? item.audienceRoles : ['student'],
      targetSchools: Array.isArray(item?.targetSchools)
        ? item.targetSchools.map((id: any) => String(id?._id || id))
        : [],
      targetUserIds: Array.isArray(item?.targetUserIds)
        ? item.targetUserIds.map((id: any) => String(id?._id || id))
        : [],
      createdAt: item?.createdAt,
      updatedAt: item?.updatedAt,
      participants: Number(item?.participants ?? 0),
      averageScore: Number(item?.averageScore ?? 0),
      completionRate: Number(item?.completionRate ?? 0),
    }))
    .filter((a) => a._id);
};
