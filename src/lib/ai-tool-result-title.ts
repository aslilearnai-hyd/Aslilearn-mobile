import { resolveStudentAiApiToolType } from './student-ai-tools';
import { formatAiToolText } from './title-case';

/** Light display-type resolve — keep ResultShell off the WebView/HTML import graph. */
function resolveDisplayType(toolType: string, variant: 'student' | 'teacher'): string {
  if (variant === 'student') return resolveStudentAiApiToolType(toolType);
  return String(toolType || '').trim();
}

const RESULT_TITLES: Record<string, string> = {
  'smart-study-guide-generator': 'Your smart study guide',
  'concept-breakdown-explainer': 'Your concept breakdown',
  'smart-qa-practice-generator': 'Your practice Q&A',
  'chapter-summary-creator': 'Your chapter summary',
  'key-points-formula-extractor': 'Your key points sheet',
  'quick-assignment-builder': 'Your assignment',
  'my-study-decks': 'Your study deck',
  'mock-test-builder': 'Your mock test',
  'project-idea-lab': 'Your project idea lab',
  'reading-practice-room': 'Your reading studio',
  'study-schedule-maker': 'Your study schedule',
  'activity-project-generator': 'Your activities & projects',
  'worksheet-mcq-generator': 'Your worksheet',
  'concept-mastery-helper': 'Your concept mastery guide',
  'lesson-planner': 'Your lesson plan',
  'exam-question-paper-generator': 'Your exam paper',
  'daily-class-plan-maker': 'Your daily class plan',
  'homework-creator': 'Your homework',
  'story-passage-creator': 'Your story & passage',
  'short-notes-summaries-maker': 'Your short notes',
  'flashcard-generator': 'Your flashcard deck',
};

export function getAiToolResultTitle(
  toolType: string,
  variant: 'student' | 'teacher' = 'student',
): string {
  const displayType = resolveDisplayType(toolType, variant);
  return formatAiToolText(RESULT_TITLES[displayType] || 'Generated Content');
}
