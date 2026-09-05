import type { Ionicons } from '@expo/vector-icons';
import { TEACHER_AI_TOOLS } from './teacher-ai-tools';

export const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 10'];

export interface TeacherToolFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  dependsOn?: string;
  isNCERT?: boolean;
  isCascadeSubtopic?: boolean;
}

export interface TeacherToolConfig {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  fields: TeacherToolFieldConfig[];
}

const cascadeFields = (extra: TeacherToolFieldConfig[] = []): TeacherToolFieldConfig[] => [
  { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
  { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
  { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
  { name: 'subTopic', label: 'Sub Topic (Optional)', type: 'select', required: false, placeholder: 'Whole chapter', isCascadeSubtopic: true },
  ...extra,
];

const WORKSHEET_COMPOSITION_FIELDS: TeacherToolFieldConfig[] = [
  { name: 'countMcq', label: 'MCQs', type: 'number', required: false, placeholder: '5' },
  { name: 'countVsaq', label: 'VSAQs', type: 'number', required: false, placeholder: '3' },
  { name: 'countSaq', label: 'SAQs', type: 'number', required: false, placeholder: '3' },
  { name: 'countLaq', label: 'LAQs', type: 'number', required: false, placeholder: '1' },
  { name: 'countFib', label: 'Fill Blanks', type: 'number', required: false, placeholder: '2' },
];

const TEACHER_TOOL_CONFIGS: Record<string, Omit<TeacherToolConfig, 'icon' | 'color'>> = {
  'activity-project-generator': {
    name: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum',
    fields: [
      ...cascadeFields(),
      { name: 'className', label: 'Section (Optional)', type: 'text', placeholder: 'e.g., A, B, C' },
    ],
  },
  'worksheet-mcq-generator': {
    name: 'Worksheet & MCQ Generator',
    description: 'Design custom worksheets and MCQs with various question types',
    fields: cascadeFields(WORKSHEET_COMPOSITION_FIELDS),
  },
  'concept-mastery-helper': {
    name: 'Concept Mastery Helper',
    description: 'Break down complex concepts into digestible lessons',
    fields: cascadeFields(),
  },
  'lesson-planner': {
    name: 'Lesson Planner',
    description: 'Plan structured lessons with objectives and activities',
    fields: cascadeFields(),
  },
  'homework-creator': {
    name: 'Homework Creator',
    description: 'Generate meaningful homework assignments',
    fields: cascadeFields([
      { name: 'duration', label: 'Duration (Minutes)', type: 'number', placeholder: '30' },
    ]),
  },
  'story-passage-creator': {
    name: 'Story & Passage Creator',
    description: 'Generate engaging stories and reading passages (English, Hindi & Telugu only)',
    fields: cascadeFields([
      { name: 'length', label: 'Length', type: 'select', options: ['short', 'medium', 'long'] },
    ]),
  },
  'short-notes-summaries-maker': {
    name: 'Short Notes & Summaries Maker',
    description: 'Condense complex topics into concise notes',
    fields: cascadeFields(),
  },
  'flashcard-generator': {
    name: 'Flashcard Generator',
    description: 'Build study flashcards for quick revision',
    fields: cascadeFields(),
  },
  'daily-class-plan-maker': {
    name: 'Daily Class Plan Maker',
    description: 'Organize your daily teaching schedule efficiently',
    fields: [
      ...cascadeFields(),
      { name: 'date', label: 'Date *', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'timeSlots', label: 'Time Slots', type: 'text', placeholder: 'e.g., 9:00-10:00, 10:15-11:15' },
    ],
  },
  'exam-question-paper-generator': {
    name: 'Exam Question Paper Generator',
    description: 'Create comprehensive exam papers with varying difficulty',
    fields: cascadeFields(WORKSHEET_COMPOSITION_FIELDS),
  },
};

function metaFor(toolType: string) {
  return TEACHER_AI_TOOLS.find((t) => t.id === toolType);
}

export function getTeacherToolConfig(toolType: string): TeacherToolConfig | undefined {
  const base = TEACHER_TOOL_CONFIGS[toolType];
  if (!base) return undefined;
  const meta = metaFor(toolType);
  return {
    ...base,
    icon: (meta?.icon || 'sparkles') as keyof typeof Ionicons.glyphMap,
    color: meta?.color || '#2563eb',
  };
}

export function isTeacherToolType(toolType: string): boolean {
  return Boolean(TEACHER_TOOL_CONFIGS[toolType]);
}
