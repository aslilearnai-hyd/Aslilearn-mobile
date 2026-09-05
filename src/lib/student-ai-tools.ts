/** Student Vidya AI tools — aligned with asli-frontend/src/pages/ai-tutor.tsx */

import { extractPlainSubjectName } from './subject-names';

export type StudentAiTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

export const READING_PRACTICE_TOOL_ID = 'reading-practice-room';

export const STUDENT_AI_TOOLS: StudentAiTool[] = [
  {
    id: 'ai-chat',
    name: 'AI Chat Assistant',
    description: 'Get Instant Help With Your Questions And Doubts',
    icon: 'chatbubble-outline',
    color: '#3b82f6',
  },
  {
    id: 'smart-study-guide-generator',
    name: 'Smart Study Guide Generator',
    description: 'Create Personalized Study Guides Tailored To Your Needs',
    icon: 'bookmark-outline',
    color: '#fb923c',
  },
  {
    id: 'concept-breakdown-explainer',
    name: 'Concept Breakdown Explainer',
    description: 'Break Down Complex Concepts Into Simple Explanations',
    icon: 'bulb-outline',
    color: '#3b82f6',
  },
  {
    id: 'smart-qa-practice-generator',
    name: 'Smart Q&A Practice Generator',
    description: 'Generate Practice Questions With Detailed Answers',
    icon: 'help-circle-outline',
    color: '#fb923c',
  },
  {
    id: 'chapter-summary-creator',
    name: 'Chapter Summary Creator',
    description: 'Create Concise Summaries Of Chapters And Topics',
    icon: 'document-text-outline',
    color: '#3b82f6',
  },
  // Key Points Extractor and Quick Assignment Builder are retired — kept out
  // of the grid (matching asli-frontend/src/pages/ai-tutor.tsx) so students
  // can't generate into a discontinued tool. Their configs/themes/renderers
  // stay in place for existing generated content, same as web.
  {
    id: 'my-study-decks',
    name: 'My Study Decks',
    description: 'Create Personalized Flashcards For Revision',
    icon: 'albums-outline',
    color: '#ec4899',
  },
  {
    id: 'project-idea-lab',
    name: 'Project Idea Lab',
    description: 'Discover Activity And Project Ideas By Topic',
    icon: 'grid-outline',
    color: '#eab308',
  },
  {
    id: 'reading-practice-room',
    name: 'Reading Practice Room',
    description: 'Practice Stories And Passages (English, Hindi & Telugu only)',
    icon: 'document-outline',
    color: '#3b82f6',
  },
  {
    id: 'study-schedule-maker',
    name: 'Study Schedule Maker',
    description: 'Build A Focused Lesson And Study Schedule',
    icon: 'calendar-outline',
    color: '#8b5cf6',
  },
];

const STORY_LANGUAGE_TOOL_IDS = new Set([
  'story-passage-creator',
  READING_PRACTICE_TOOL_ID,
]);

/** Tools that must not be used with English, Hindi, or Telugu subjects. */
export const LANGUAGE_EXCLUDED_TOOL_IDS = [
  'worksheet-mcq-generator',
  'short-notes-summaries-maker',
  'concept-mastery-helper',
  'daily-class-plan-maker',
  'concept-breakdown-explainer',
  'chapter-summary-creator',
  'key-points-formula-extractor',
] as const;

const LANGUAGE_EXCLUDED_TOOL_ID_SET = new Set<string>(LANGUAGE_EXCLUDED_TOOL_IDS);

export const LANGUAGE_EXCLUDED_TOOL_ERROR =
  'This tool is not available for English, Hindi, or Telugu subjects.';

export function isStoryLanguageTool(toolType: string): boolean {
  return STORY_LANGUAGE_TOOL_IDS.has(String(toolType || '').trim());
}

export function isLanguageExcludedTool(toolType: string): boolean {
  return LANGUAGE_EXCLUDED_TOOL_ID_SET.has(String(toolType || '').trim());
}

export function filterSubjectsForAiTool(_toolType: string, subjects: string[]): string[] {
  // Dashboard delivery: do not hide subjects by tool language rules — show all and
  // let the API return whatever saved content exists for the selection.
  return Array.isArray(subjects) ? subjects.filter(Boolean) : [];
}

/** IIT / NEET / JEE boards in AI Tools — STEM only. */
export function isIitAiToolBoard(board?: string | null): boolean {
  const compact = String(board || '')
    .toUpperCase()
    .replace(/[\s/\\-]+/g, '');
  return compact.includes('IIT') || compact.includes('NEET') || compact.includes('JEE');
}

const IIT_STEM_PLAIN_KEYS = new Set([
  'physics',
  'phy',
  'chemistry',
  'chem',
  'maths',
  'math',
  'mathematics',
  'biology',
  'bio',
]);

export function isIitStemSubject(subject: string | undefined | null): boolean {
  const raw = String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/\b(iit|neet|jee)\b/g, ' ')
    .replace(/[/_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return false;
  const plain = extractPlainSubjectName(raw).toLowerCase().trim();
  if (IIT_STEM_PLAIN_KEYS.has(plain)) return true;
  const first = plain.split(/\s+/)[0];
  return Boolean(first && IIT_STEM_PLAIN_KEYS.has(first));
}

export function filterSubjectsForIitBoard(subjects: string[]): string[] {
  return subjects.filter(isIitStemSubject);
}

const STORY_LANGUAGE_PLAIN_KEYS = new Set(['eng', 'english', 'hin', 'hindi', 'tel', 'telugu']);

export function isStoryPassageLanguageSubject(subject: string | undefined | null): boolean {
  const raw = String(subject || '').trim();
  if (!raw) return false;
  if (/(telugu|తెలుగు)/i.test(raw)) return true;
  if (/(hindi|हिंदी|हिन्दी)/i.test(raw)) return true;
  if (/english/i.test(raw)) return true;

  const plain = extractPlainSubjectName(raw).toLowerCase().trim();
  if (STORY_LANGUAGE_PLAIN_KEYS.has(plain)) return true;
  if (plain.includes('english') || plain.includes('hindi') || plain.includes('telugu')) return true;
  return false;
}

export function hasStoryPassageLanguageSubject(subjects: string[]): boolean {
  return subjects.some(isStoryPassageLanguageSubject);
}

export function hasNonLanguageSubject(subjects: string[]): boolean {
  return subjects.some((s) => !isStoryPassageLanguageSubject(s));
}

export function filterVisibleStudentTools(
  subjectNames: string[],
  opts?: { includeChat?: boolean },
): StudentAiTool[] {
  const seen = new Set<string>();
  return STUDENT_AI_TOOLS.filter((tool) => {
    if (tool.id === 'ai-chat') return Boolean(opts?.includeChat);
    if (seen.has(tool.id)) return false;
    if (!isAiToolVisibleForSubjects(tool.id, subjectNames)) return false;
    seen.add(tool.id);
    return true;
  });
}

/** Whether a tool card should appear on Vidya dashboard for the user's assigned subjects. */
export function isAiToolVisibleForSubjects(toolId: string, subjectNames: string[]): boolean {
  const id = String(toolId || '').trim();
  if (isStoryLanguageTool(id)) {
    if (subjectNames.length === 0) return true;
    return hasStoryPassageLanguageSubject(subjectNames);
  }
  if (isLanguageExcludedTool(id)) {
    if (subjectNames.length === 0) return true;
    return hasNonLanguageSubject(subjectNames);
  }
  return true;
}

/** @deprecated Use isAiToolVisibleForSubjects */
export const isStudentToolVisibleForSubjects = isAiToolVisibleForSubjects;

/** Canonical backend + display tool id for student routes (legacy aliases → real student tool). */
export function resolveStudentAiToolDisplayType(toolType: string): string {
  return resolveStudentAiApiToolType(toolType);
}

/** Map route/legacy ids to backend toolType (same as web student/tools). */
export function resolveStudentAiApiToolType(toolType: string): string {
  switch (toolType) {
    case 'activity-project-generator':
      return 'project-idea-lab';
    case 'lesson-planner':
      return 'study-schedule-maker';
    case 'story-passage-creator':
      return 'reading-practice-room';
    case 'flashcard-generator':
      return 'my-study-decks';
    case 'exam-question-paper-generator':
      return 'mock-test-builder';
    case 'ai-chat-assistant':
      return 'ai-chat';
    default:
      return toolType;
  }
}

export function resolveStudentToolConfigKey(toolType: string): string {
  if (toolType === 'project-idea-lab' || toolType === 'activity-project-generator') {
    return 'project-idea-lab';
  }
  if (toolType === 'study-schedule-maker' || toolType === 'lesson-planner') {
    return 'study-schedule-maker';
  }
  if (toolType === 'reading-practice-room' || toolType === 'story-passage-creator') {
    return 'reading-practice-room';
  }
  if (toolType === 'my-study-decks' || toolType === 'flashcard-generator') {
    return 'my-study-decks';
  }
  if (toolType === 'mock-test-builder' || toolType === 'exam-question-paper-generator') {
    return 'mock-test-builder';
  }
  return toolType;
}
