/** Book-Based AI Generation — all student & teacher curriculum tools (21). */

export type BookToolAudience = 'student' | 'teacher';

export type BookBasedTool = {
  id: string;
  name: string;
  description: string;
  audience: BookToolAudience;
};

export const BOOK_BASED_STUDENT_TOOL_IDS = [
  'smart-study-guide-generator',
  'smart-qa-practice-generator',
  'concept-breakdown-explainer',
  'chapter-summary-creator',
  'key-points-formula-extractor',
  'quick-assignment-builder',
  'my-study-decks',
  'mock-test-builder',
  'project-idea-lab',
  'reading-practice-room',
  'study-schedule-maker',
] as const;

export const BOOK_BASED_TEACHER_TOOL_IDS = [
  'activity-project-generator',
  'worksheet-mcq-generator',
  'concept-mastery-helper',
  'lesson-planner',
  'exam-question-paper-generator',
  'daily-class-plan-maker',
  'homework-creator',
  'story-passage-creator',
  'short-notes-summaries-maker',
  'flashcard-generator',
] as const;

export const BOOK_BASED_TOOLS: BookBasedTool[] = [
  { id: 'smart-study-guide-generator', name: 'Smart Study Guide Generator', description: 'Study guides aligned to textbook terminology.', audience: 'student' },
  { id: 'smart-qa-practice-generator', name: 'Smart Q&A Practice Generator', description: 'Practice Q&A sets using book definitions and examples.', audience: 'student' },
  { id: 'concept-breakdown-explainer', name: 'Concept Breakdown Explainer', description: 'Step-by-step concept breakdown from book passages.', audience: 'student' },
  { id: 'chapter-summary-creator', name: 'Chapter Summary Creator', description: 'Chapter summaries with concepts and recall questions from textbook chunks.', audience: 'student' },
  { id: 'key-points-formula-extractor', name: 'Key Points Extractor', description: 'Formulae, facts, and keywords from textbook chunks.', audience: 'student' },
  { id: 'quick-assignment-builder', name: 'Quick Assignment Builder', description: 'Assignments with concept questions grounded in book material.', audience: 'student' },
  { id: 'my-study-decks', name: 'My Study Decks', description: 'Flashcard decks grounded in textbook content.', audience: 'student' },
  { id: 'mock-test-builder', name: 'Mock Test Builder', description: 'Exam-style mock tests from uploaded books.', audience: 'student' },
  { id: 'project-idea-lab', name: 'Project Idea Lab', description: 'Student projects inspired by textbook topics and examples.', audience: 'student' },
  { id: 'reading-practice-room', name: 'Reading Practice Room', description: 'Reading practice from book passages (English, Hindi & Telugu only).', audience: 'student' },
  { id: 'study-schedule-maker', name: 'Study Schedule Maker', description: 'Study schedules aligned to textbook chapters.', audience: 'student' },
  { id: 'activity-project-generator', name: 'Activity / Project Generator', description: 'Teacher activity kits grounded in textbook content.', audience: 'teacher' },
  { id: 'worksheet-mcq-generator', name: 'Worksheet & MCQ Generator', description: 'Worksheets and MCQs grounded in book content.', audience: 'teacher' },
  { id: 'concept-mastery-helper', name: 'Concept Mastery Helper', description: 'Concept mastery notes from textbook material.', audience: 'teacher' },
  { id: 'lesson-planner', name: 'Lesson Planner', description: 'Lesson plans aligned to uploaded textbook chapters.', audience: 'teacher' },
  { id: 'exam-question-paper-generator', name: 'Exam Question Paper Generator', description: 'Full exam papers using book terminology.', audience: 'teacher' },
  { id: 'daily-class-plan-maker', name: 'Daily Class Plan', description: 'Day-wise classroom plans from textbook chapters.', audience: 'teacher' },
  { id: 'homework-creator', name: 'Homework Creator', description: 'Homework tasks grounded in textbook material.', audience: 'teacher' },
  { id: 'story-passage-creator', name: 'Story and Passage Creator', description: 'Story and passage sets from book content (English, Hindi & Telugu only).', audience: 'teacher' },
  { id: 'short-notes-summaries-maker', name: 'Short Notes & Summaries', description: 'Concise revision notes from book passages.', audience: 'teacher' },
  { id: 'flashcard-generator', name: 'Flash Card Generator', description: 'Teacher flashcard decks from textbook content.', audience: 'teacher' },
];

export type BookBasedToolId =
  | (typeof BOOK_BASED_STUDENT_TOOL_IDS)[number]
  | (typeof BOOK_BASED_TEACHER_TOOL_IDS)[number];

export const BOOK_BASED_STUDENT_TOOLS = BOOK_BASED_TOOLS.filter((t) => t.audience === 'student');
export const BOOK_BASED_TEACHER_TOOLS = BOOK_BASED_TOOLS.filter((t) => t.audience === 'teacher');

export const BOOK_GENERATOR_BATCH_SIZE = 25;
export const BOOK_GENERATOR_MAX_BATCH_SIZE = 25;
export const BOOK_GENERATOR_MAX_INR = 0;
export const BOOK_UNIQUENESS_TARGET = 50;
