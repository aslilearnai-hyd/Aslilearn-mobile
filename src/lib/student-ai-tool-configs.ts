import type { Ionicons } from '@expo/vector-icons';

export const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 10'];

export interface StudentToolFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  dependsOn?: string;
  getOptions?: (value: string) => string[];
  isNCERT?: boolean;
  isCascadeSubtopic?: boolean;
}

export interface StudentToolConfig {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  fields: StudentToolFieldConfig[];
}

const cascadeFields = (extra: StudentToolFieldConfig[] = []): StudentToolFieldConfig[] => [
  { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
  { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
  { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
  { name: 'subTopic', label: 'Sub Topic (Optional)', type: 'select', required: false, placeholder: 'Whole chapter', isCascadeSubtopic: true },
  ...extra,
];

export const STUDENT_TOOL_CONFIGS: Record<string, StudentToolConfig> = {
  'smart-study-guide-generator': {
    name: 'Smart Study Guide Generator',
    description: '11-section premium study guides with concepts, formulae, practice MCQs, and revision notes',
    icon: 'bookmark',
    color: '#fb923c',
    fields: cascadeFields(),
  },
  'concept-breakdown-explainer': {
    name: 'Concept Breakdown Explainer',
    description: '9-section concept breakdown with steps, Indian-context examples, and thinking prompts',
    icon: 'bulb',
    color: '#3b82f6',
    fields: cascadeFields(),
  },
  'smart-qa-practice-generator': {
    name: 'Smart Q&A Practice Generator',
    description: 'Generate practice questions with detailed answers',
    icon: 'help-circle',
    color: '#fb923c',
    fields: cascadeFields([
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '10' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'] },
    ]),
  },
  'chapter-summary-creator': {
    name: 'Chapter Summary Creator',
    description: 'Create concise summaries of chapters and topics',
    icon: 'document-text',
    color: '#3b82f6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'chapter', label: 'Chapter/Topic *', type: 'select', required: true, placeholder: 'Select chapter/topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic (Optional)', type: 'select', required: false, placeholder: 'Whole chapter', isCascadeSubtopic: true },
    ],
  },
  'key-points-formula-extractor': {
    name: 'Key Points Extractor',
    description: '10-section revision sheet: concepts, definitions, formulae, keywords, exam points, and one-minute summary',
    icon: 'key',
    color: '#14b8a6',
    fields: cascadeFields(),
  },
  'quick-assignment-builder': {
    name: 'Quick Assignment Builder',
    description: '11-section assignment with concept questions, application tasks, rubric, and learning outcomes',
    icon: 'clipboard',
    color: '#fb923c',
    fields: cascadeFields(),
  },
  'my-study-decks': {
    name: 'My Study Decks',
    description: '12-section study decks with flashcards, difficulty tags, and self-check',
    icon: 'albums',
    color: '#ec4899',
    fields: cascadeFields(),
  },
  'mock-test-builder': {
    name: 'Mock Test Builder',
    description: '12-section mock tests with question paper, answer key, solutions, and remedial guidance',
    icon: 'checkmark-circle',
    color: '#6366f1',
    fields: cascadeFields([
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '20' },
      { name: 'duration', label: 'Test Duration (minutes)', type: 'number', placeholder: '90' },
      { name: 'difficulty', label: 'Difficulty Mix', type: 'select', options: ['easy', 'medium', 'hard', 'mixed'] },
    ]),
  },
  'project-idea-lab': {
    name: 'Project Idea Lab',
    description: 'Discover student project ideas with safety, observation, and self-assessment sections',
    icon: 'grid',
    color: '#eab308',
    fields: cascadeFields(),
  },
  'reading-practice-room': {
    name: 'Reading Practice Room',
    description: 'Reading practice sets with passage, vocabulary, and recall/infer/connect questions (English, Hindi & Telugu only)',
    icon: 'document-text',
    color: '#3b82f6',
    fields: cascadeFields(),
  },
  'study-schedule-maker': {
    name: 'Study Schedule Maker',
    description: 'Build a timed study schedule with concept slots, practice, and self-checkpoints',
    icon: 'calendar',
    color: '#8b5cf6',
    fields: cascadeFields(),
  },
};

// Legacy route ids resolve to their canonical config via
// resolveStudentToolConfigKey() (src/lib/student-ai-tools.ts) before this
// lookup ever runs, so 'flashcard-generator', 'activity-project-generator',
// 'story-passage-creator', 'lesson-planner', and 'exam-question-paper-generator'
// never need — and must not have — their own entries above (they'd be dead
// code, unreachable and easy to let drift out of sync).

export function getStudentToolConfig(toolType: string): StudentToolConfig | undefined {
  return STUDENT_TOOL_CONFIGS[toolType];
}
