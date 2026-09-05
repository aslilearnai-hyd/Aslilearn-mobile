/** Teacher Vidya AI tools — aligned with asli-frontend teacher dashboard Available Tools */

import { isAiToolVisibleForSubjects } from './student-ai-tools';

export type TeacherAiTool = {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Icon background / accent (orange, blue, teal — same as web) */
  color: string;
  route: string;
};

export const TEACHER_AI_TOOLS: TeacherAiTool[] = [
  {
    id: 'activity-project-generator',
    title: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum.',
    icon: 'sparkles',
    color: '#ea580c',
    route: '/teacher/tools/activity-project-generator',
  },
  {
    id: 'worksheet-mcq-generator',
    title: 'Worksheet & MCQ Generator',
    description: 'Design custom worksheets and MCQs with various question types.',
    icon: 'document-text',
    color: '#2563eb',
    route: '/teacher/tools/worksheet-mcq-generator',
  },
  {
    id: 'concept-mastery-helper',
    title: 'Concept Mastery Helper',
    description: 'Break down complex concepts into digestible lessons.',
    icon: 'bulb',
    color: '#0d9488',
    route: '/teacher/tools/concept-mastery-helper',
  },
  {
    id: 'lesson-planner',
    title: 'Lesson Planner',
    description: 'Plan structured lessons with objectives and activities.',
    icon: 'clipboard',
    color: '#d97706',
    route: '/teacher/tools/lesson-planner',
  },
  {
    id: 'exam-question-paper-generator',
    title: 'Exam Question Paper Generator',
    description: 'Create comprehensive exam papers with varying difficulty.',
    icon: 'help-circle',
    color: '#7c3aed',
    route: '/teacher/tools/exam-question-paper-generator',
  },
  {
    id: 'daily-class-plan-maker',
    title: 'Daily Class Plan Maker',
    description: 'Organize your daily teaching schedule efficiently.',
    icon: 'checkbox-outline',
    color: '#0d9488',
    route: '/teacher/tools/daily-class-plan-maker',
  },
  {
    id: 'homework-creator',
    title: 'Homework Creator',
    description: 'Generate meaningful homework assignments.',
    icon: 'rocket',
    color: '#db2777',
    route: '/teacher/tools/homework-creator',
  },
  {
    id: 'story-passage-creator',
    title: 'Story & Passage Creator',
    description: 'Generate stories and reading passages (English, Hindi & Telugu only).',
    icon: 'book-outline',
    color: '#d97706',
    route: '/teacher/tools/story-passage-creator',
  },
  {
    id: 'short-notes-summaries-maker',
    title: 'Short Notes & Summaries Maker',
    description: 'Condense complex topics into concise notes.',
    icon: 'layers',
    color: '#0d9488',
    route: '/teacher/tools/short-notes-summaries-maker',
  },
  {
    id: 'flashcard-generator',
    title: 'Flashcard Generator',
    description: 'Build study flashcards for quick revision.',
    icon: 'card',
    color: '#ea580c',
    route: '/teacher/tools/flashcard-generator',
  },
];

export const TEACHER_AI_TOOLS_SUBTITLE =
  'Select a tool to get started. All tools use Gemini AI to generate content based on your input.';

export function filterVisibleTeacherTools(subjectNames: string[]): TeacherAiTool[] {
  const seen = new Set<string>();
  return TEACHER_AI_TOOLS.filter((tool) => {
    if (seen.has(tool.id)) return false;
    if (
      tool.id !== 'story-passage-creator' &&
      !isAiToolVisibleForSubjects(tool.id, subjectNames)
    ) {
      return false;
    }
    seen.add(tool.id);
    return true;
  });
}
