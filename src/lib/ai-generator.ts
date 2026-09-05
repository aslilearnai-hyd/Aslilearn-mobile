import { storageGetItem } from './safe-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';
import api from '../services/api/api';
import { API_BASE_URL } from './api-config';
import { sortNatural } from './ai-tool-topics';
import { toEditablePlainText } from './ai-tool-generations';

export type ToolId =
  | 'activity-project-generator'
  | 'project-idea-lab'
  | 'worksheet-mcq-generator'
  | 'concept-mastery-helper'
  | 'lesson-planner'
  | 'study-schedule-maker'
  | 'homework-creator'
  | 'reading-practice-room'
  | 'story-passage-creator'
  | 'short-notes-summaries-maker'
  | 'my-study-decks'
  | 'flashcard-generator'
  | 'daily-class-plan-maker'
  | 'mock-test-builder'
  | 'exam-question-paper-generator'
  | 'smart-study-guide-generator'
  | 'concept-breakdown-explainer'
  | 'smart-qa-practice-generator'
  | 'chapter-summary-creator'
  | 'key-points-formula-extractor'
  | 'quick-assignment-builder';

export type AiToolDef = { id: ToolId; name: string; description: string };

export const AI_GENERATOR_TOOLS: AiToolDef[] = [
  { id: 'project-idea-lab', name: 'Project Idea Lab', description: '14-point student project format with safety, observation table, creative output, and self-assessment.' },
  { id: 'activity-project-generator', name: 'Activity / Project Generator', description: '13-point teacher activity kit with teacher and student instructions and assessment rubric.' },
  { id: 'worksheet-mcq-generator', name: 'Worksheet & MCQ Generator', description: 'Design worksheets and exam-quality MCQs.' },
  { id: 'concept-mastery-helper', name: 'Concept Mastery Helper', description: 'Generate concept explanations and mastery notes.' },
  { id: 'study-schedule-maker', name: 'Study Schedule Maker', description: '13-point student study schedule with plan table, concept slot, and self-assessment.' },
  { id: 'lesson-planner', name: 'Lesson Planner', description: '14-point teacher lesson plan with classroom activities and formative assessment.' },
  { id: 'homework-creator', name: 'Homework Creator', description: 'Generate homework tasks and practice sets.' },
  { id: 'reading-practice-room', name: 'Reading Practice Room', description: '13-section reading practice with recall, infer, and connect questions (English, Hindi & Telugu only).' },
  { id: 'story-passage-creator', name: 'Story and Passage Creator', description: '19-section teacher story and passage sets (English, Hindi & Telugu only).' },
  { id: 'short-notes-summaries-maker', name: 'Short Notes & Summaries', description: 'Create concise revision notes.' },
  { id: 'my-study-decks', name: 'My Study Decks', description: '12-section student study decks with flashcard set, difficulty tags, and self-check.' },
  { id: 'flashcard-generator', name: 'Flash Card Generator', description: '5-block teacher deck: Context, Foundations, HOTS Task/Solution cards, Study Aids, and Wrap-Up.' },
  { id: 'daily-class-plan-maker', name: 'Daily Class Plan', description: 'Create day-wise classroom plans.' },
  { id: 'mock-test-builder', name: 'Mock Test Builder', description: '12-section mock tests with question paper, answer key, solutions, and remedial guidance.' },
  { id: 'exam-question-paper-generator', name: 'Exam Question Paper Generator', description: '6-section exam papers: title/instructions and sections A–E.' },
  { id: 'smart-study-guide-generator', name: 'Smart Study Guide Generator', description: '11-section study guides with overview, concepts, practice questions, and improvement tips.' },
  { id: 'concept-breakdown-explainer', name: 'Concept Breakdown Explainer', description: '9-section concept breakdown with Indian-context examples and thinking prompts.' },
  { id: 'smart-qa-practice-generator', name: 'Smart Q&A Practice Generator', description: '11-section practice sets with MCQs, sections A–G, and answer key with explanations.' },
  { id: 'chapter-summary-creator', name: 'Chapter Summary Creator', description: '10-section chapter summaries with concepts, revision notes, and recall questions.' },
  { id: 'key-points-formula-extractor', name: 'Key Points Extractor', description: '10-section key points: concepts, definitions, formulae, keywords, exam points, mnemonics, and one-minute summary.' },
  { id: 'quick-assignment-builder', name: 'Quick Assignment Builder', description: '11-section assignment: objectives, concept questions, application tasks, rubric, and learning outcomes.' },
];

export const STUDENT_TOOL_IDS: ToolId[] = [
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
];

export const TEACHER_TOOL_IDS: ToolId[] = [
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
];

export const TEACHER_TOOL_LABELS: Partial<Record<ToolId, string>> = {
  'activity-project-generator': 'Activity / Project Generator',
  'worksheet-mcq-generator': 'Worksheet & MCQ Generator',
  'concept-mastery-helper': 'Concept Mastery Helper',
  'lesson-planner': 'Lesson Planner',
  'exam-question-paper-generator': 'Exam Question Paper Generator',
  'daily-class-plan-maker': 'Daily Class Plan Maker',
  'homework-creator': 'Homework Creator',
  'short-notes-summaries-maker': 'Short Notes & Summarizer',
};

export const TOPIC_OPTIONAL_TOOLS: ToolId[] = [
  'lesson-planner',
  'study-schedule-maker',
  'activity-project-generator',
  'project-idea-lab',
  'reading-practice-room',
  'story-passage-creator',
];

export const WORKSHEET_QUESTION_TYPES = ['Single Option', 'Multiple Option', 'Integer Type', 'All Types'] as const;
export const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'] as const;

export type GeneratorRecord = {
  _id: string;
  generatedContent: string;
  createdAt?: string;
  metadata?: { structuredContent?: unknown };
  toolName?: string;
  toolSlug?: string;
  className?: string;
  subjectName?: string;
  topicName?: string;
  subtopicName?: string;
  board?: string;
};

export type GroupedSubtopic = { subtopicName: string; records: GeneratorRecord[] };
export type GroupedTopic = { topicName: string; subtopics: GroupedSubtopic[] };
export type GroupedSubject = { subjectName: string; topics: GroupedTopic[] };
export type GroupedClass = { className: string; boardName?: string; subjects: GroupedSubject[] };
export type GroupedTool = { toolName: string; toolSlug: string; classes: GroupedClass[] };

/** Merge API groups that share the same toolSlug so React list keys stay unique. */
export function dedupeGroupedTools(grouped: GroupedTool[]): GroupedTool[] {
  const bySlug = new Map<string, GroupedTool>();
  for (const node of grouped) {
    const slug = String(node.toolSlug || node.toolName || '').trim();
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, {
        toolName: node.toolName,
        toolSlug: slug,
        classes: [...(node.classes || [])],
      });
      continue;
    }
    existing.classes = [...existing.classes, ...(node.classes || [])];
  }
  return Array.from(bySlug.values());
}

export function toDisplayPlainText(content: string) {
  return toEditablePlainText(content);
}

export function recordListPreviewText(toolSlug: string, generatedContent: string) {
  const text = toDisplayPlainText(generatedContent);
  if (toolSlug === 'mock-test-builder') {
    const first = text.split('\n').find((l) => l.trim()) || 'Mock Test';
    return first.slice(0, 120);
  }
  return text;
}

export function toolRequiresTopic(toolId: ToolId | '') {
  if (!toolId) return true;
  return !TOPIC_OPTIONAL_TOOLS.includes(toolId);
}

export function buildExtraParams(
  selectedTool: ToolId | '',
  questionType: string,
  questionCount: string,
  difficulty: string,
  duration: string,
) {
  const payload: Record<string, unknown> = {};
  const countTools = new Set([
    'worksheet-mcq-generator',
    'smart-qa-practice-generator',
    'mock-test-builder',
    'exam-question-paper-generator',
    'homework-creator',
  ]);
  if (selectedTool && countTools.has(selectedTool)) {
    const n = Number(questionCount);
    payload.questionCount = Number.isFinite(n) && n > 0 ? Math.min(40, Math.max(1, Math.floor(n))) : 10;
    payload.numberOfQuestions = payload.questionCount;
  }
  if (selectedTool === 'worksheet-mcq-generator') {
    payload.questionType = questionType;
  }
  if (selectedTool === 'smart-qa-practice-generator') {
    payload.questionType = questionType;
    payload.difficulty = difficulty;
  }
  if (
    selectedTool === 'homework-creator' ||
    selectedTool === 'mock-test-builder' ||
    selectedTool === 'quick-assignment-builder'
  ) {
    payload.duration = Number(duration) || 30;
  }
  return payload;
}

export async function fetchGeneratorBoardOptions() {
  try {
    const response = await api.get<{ data?: { boards?: string[] } }>(
      '/api/super-admin/ai-tool-topics/options',
    );
    const boards = response.data?.data?.boards;
    if (Array.isArray(boards) && boards.length > 0) {
      return sortNatural(boards.map((b) => String(b || '').trim()).filter(Boolean));
    }
  } catch {
    /* fallback below */
  }
  try {
    const response = await api.get<{ data?: { items?: Array<{ board?: string }> } }>(
      '/api/super-admin/ai-tool-topics',
      { params: { page: 1, limit: 200 } },
    );
    const items = response.data?.data?.items || [];
    const boards = Array.from(
      new Set(items.map((row) => String(row?.board || '').trim()).filter(Boolean)),
    );
    return sortNatural(boards);
  } catch {
    return [];
  }
}

export async function fetchGeneratorRecords(boardFilter: string) {
  const params: Record<string, string> = {};
  if (boardFilter && boardFilter !== '__all__') {
    params.board = boardFilter;
  }
  const response = await api.get<{
    success: boolean;
    data?: { grouped?: GroupedTool[]; total?: number };
    message?: string;
  }>('/api/ai-generator/records', { params });
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to load records');
  }
  const grouped = Array.isArray(response.data.data?.grouped) ? response.data.data.grouped : [];
  return {
    grouped: dedupeGroupedTools(grouped),
    total: Number(response.data.data?.total || 0),
  };
}

export type GeneratePayload = {
  toolSlug: ToolId;
  toolName: string;
  board: string;
  className: string;
  subjectName: string;
  topicName: string;
  subtopicName: string;
  extraParams: Record<string, unknown>;
};

export type GenerateBatchPayload = GeneratePayload & {
  batchSize: number;
  forceGenerate?: boolean;
  forceGenerateNew?: boolean;
  forceUnlock?: boolean;
};

export type GenerateBatchResult = {
  savedCount: number;
  failedCount: number;
  batchSize: number;
  failures?: string[];
  tokenUsage?: {
    totals?: Partial<{ promptTokens: number; completionTokens: number; totalTokens: number; callCount: number }>;
    calls?: Array<{ model?: string; promptTokens?: number; completionTokens?: number }>;
  };
  cost?: {
    usd: number;
    inr: number;
    exchangeRateInr?: number;
    model?: string;
    pricingNote?: string;
    perRecordUsd?: number;
    perRecordInr?: number;
  };
  locked?: boolean;
};

export async function generateAiBatch(payload: GenerateBatchPayload) {
  const response = await api.post<{ success: boolean; data?: GenerateBatchResult; message?: string }>(
    '/api/ai-generator/generate-batch',
    payload,
  );
  const data = response.data?.data;
  if (response.status === 409 || data?.locked) {
    const err = new Error(response.data?.message || 'Generation locked');
    (err as Error & { locked?: boolean }).locked = true;
    throw err;
  }
  if (!response.data?.success && !data?.savedCount) {
    throw new Error(response.data?.message || 'Batch generation failed');
  }
  return { ...(data || {}), success: Boolean(response.data?.success), message: response.data?.message };
}

export async function releaseAiGeneratorLock(payload: Partial<GenerateBatchPayload>) {
  const response = await api.post<{ success: boolean; message?: string; data?: { released?: number } }>(
    '/api/ai-generator/release-lock',
    payload,
  );
  if (!response.data?.success) throw new Error(response.data?.message || 'Failed to release lock');
  return response.data;
}

export async function generateAiContent(payload: GeneratePayload) {
  const response = await api.post<{ success: boolean; message?: string }>(
    '/api/ai-generator/generate',
    payload,
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Generation failed');
  }
  return response.data;
}

export async function fetchGeneratorRecord(id: string) {
  const response = await api.get<{ success: boolean; data: GeneratorRecord; message?: string }>(
    `/api/ai-generator/records/${id}`,
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to fetch record');
  }
  return response.data.data;
}

export async function updateGeneratorRecord(
  id: string,
  payload: {
    generatedContent: string;
    toolName?: string;
    toolSlug?: string;
    className?: string;
    subjectName?: string;
    topicName?: string;
    subtopicName?: string;
  },
) {
  const response = await api.put<{ success: boolean; message?: string }>(
    `/api/ai-generator/records/${id}`,
    payload,
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Update failed');
  }
  return response.data;
}

export async function deleteGeneratorRecord(id: string) {
  const response = await api.delete<{ success: boolean; message?: string }>(
    `/api/ai-generator/records/${id}`,
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Delete failed');
  }
  return response.data;
}

export async function deleteAllGeneratorRecords(boardFilter: string) {
  const params: Record<string, string> = {};
  if (boardFilter && boardFilter !== '__all__') {
    params.board = boardFilter;
  }
  const response = await api.delete<{
    success: boolean;
    data?: { deletedCount?: number };
    message?: string;
  }>('/api/ai-generator/records/all', { params });
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Delete all failed');
  }
  return response.data;
}

export async function downloadGeneratorPdf(recordId: string) {
  const token = await storageGetItem('authToken');
  const url = `${API_BASE_URL}/api/ai-generator/pdf/${recordId}`;
  const path = `${FileSystem.cacheDirectory}ai-generator-${recordId}.pdf`;
  const result = await FileSystem.downloadAsync(url, path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  await Share.share({ url: result.uri, title: 'AI Generator PDF' });
}
