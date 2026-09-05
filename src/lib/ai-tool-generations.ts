import api from '../services/api/api';
import type { McqQuestion } from './mcq-record-utils';
import { stripMarkdownSyntax } from './strip-markdown-syntax';

export type BranchItem = { value: string; count: number };

/** Collapse duplicate branch values (same tool slug) and sum their counts. */
export function dedupeBranchItems(items: BranchItem[]): BranchItem[] {
  const byValue = new Map<string, BranchItem>();
  for (const item of items) {
    const value = String(item.value || '').trim();
    if (!value) continue;
    const existing = byValue.get(value);
    if (!existing) {
      byValue.set(value, { value, count: Number(item.count) || 0 });
      continue;
    }
    existing.count += Number(item.count) || 0;
  }
  return Array.from(byValue.values());
}

export type BranchResponse = {
  success: boolean;
  data: {
    nextLevel: string;
    items?: BranchItem[];
    leaf?: boolean;
    matchSummary?: Record<string, string>;
  };
};

export type RecordRow = {
  _id: string;
  board?: string;
  toolName: string;
  toolDisplayName?: string;
  classLabel: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  createdAt?: string;
  preview: string;
  content?: string;
  metadata?: Record<string, unknown>;
};

export type PdfRecord = {
  toolDisplayName?: string;
  toolName?: string;
  classLabel?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  content?: string;
  createdAt?: string;
};

export const TOOL_LABELS: Record<string, string> = {
  'activity-project-generator': 'Activity & Project Generator',
  'worksheet-mcq-generator': 'Worksheet & MCQ Generator',
  'concept-mastery-helper': 'Concept Mastery Helper',
  'lesson-planner': 'Lesson Planner',
  'homework-creator': 'Homework Creator',
  'reading-practice-room': 'Reading Practice Room',
  'story-passage-creator': 'Story & Passage Creator',
  'short-notes-summaries-maker': 'Short Notes & Summaries',
  'my-study-decks': 'My Study Decks',
  'flashcard-generator': 'Flash Card Generator',
  'daily-class-plan-maker': 'Daily Class Plan',
  'mock-test-builder': 'Mock Test Builder',
  'exam-question-paper-generator': 'Exam Question Paper Generator',
  'smart-study-guide-generator': 'Smart Study Guide Generator',
  'concept-breakdown-explainer': 'Concept Breakdown Explainer',
  'smart-qa-practice-generator': 'Smart Q&A Practice Generator',
  'chapter-summary-creator': 'Chapter Summary Creator',
  'key-points-formula-extractor': 'Key Points Extractor',
  'quick-assignment-builder': 'Quick Assignment Builder',
};

export const BROWSE_STEPS = ['Tool', 'Class', 'Subject', 'Topic', 'Subtopic', 'Records'] as const;

export function humanizeToolId(id: string) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function labelEmpty(v: string) {
  return v === '' || v == null ? '(None)' : v;
}

export function toEditablePlainText(content: string) {
  return stripMarkdownSyntax(content);
}

export function questionsToStructuredPayload(questions: McqQuestion[]) {
  return questions.map((q) => ({
    question: q.question,
    options: q.options.map((o) => o.replace(/^[A-D]\)\s*/i, '').trim()),
    answer: q.answer.replace(/^[A-D]\)\s*/i, '').trim(),
    explanation: String(q.explanation || '').trim(),
  }));
}

export async function fetchBranch(params: Record<string, string>) {
  const response = await api.get<BranchResponse>('/api/super-admin/ai-tool-generations/children', {
    params,
  });
  return response.data;
}

export async function fetchMeta(params: Record<string, string> = {}) {
  const response = await api.get<{ success: boolean; data: { total: number; topicsCount?: number } }>(
    '/api/super-admin/ai-tool-generations/meta',
    { params },
  );
  return response.data;
}

export async function fetchBoardOptions() {
  const response = await api.get<{ data?: { boards?: string[] } }>(
    '/api/super-admin/ai-tool-topics/options',
  );
  return Array.isArray(response.data?.data?.boards) ? response.data.data.boards : [];
}

export async function fetchRecords(params: Record<string, string>, page = 1, limit = 20) {
  const response = await api.get<{
    success: boolean;
    data: { total: number; items: RecordRow[]; page: number; limit: number };
  }>('/api/super-admin/ai-tool-generations/records', {
    params: { ...params, page: String(page), limit: String(limit) },
  });
  return response.data;
}

export async function fetchDocument(id: string) {
  const response = await api.get<{ success: boolean; data: PdfRecord & { content: string; metadata?: Record<string, unknown> } }>(
    `/api/super-admin/ai-tool-generations/document/${id}`,
  );
  return response.data;
}

export async function updateDocument(id: string, content: string) {
  const response = await api.patch<{ success: boolean; data: PdfRecord & { content: string } }>(
    `/api/super-admin/ai-tool-generations/document/${id}`,
    { content },
  );
  return response.data;
}

export async function patchDocumentStructured(id: string, structuredContent: Record<string, unknown>) {
  const response = await api.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/api/super-admin/ai-tool-generations/document/${id}`,
    { structuredContent },
  );
  return response.data;
}

export async function deleteDocument(id: string) {
  const response = await api.delete<{ success: boolean; message?: string }>(
    `/api/super-admin/ai-tool-generations/document/${id}`,
  );
  return response.data;
}

export async function fetchExportBundle(params: Record<string, string>, maxDocs = 500) {
  const response = await api.get<{
    success: boolean;
    data: { truncated?: boolean; warning?: string; records: PdfRecord[] };
  }>('/api/super-admin/ai-tool-generations/export-bundle', {
    params: { ...params, maxDocs: String(maxDocs) },
  });
  return response.data;
}

export function buildExportText(records: PdfRecord[]) {
  return records
    .map((rec, idx) => {
      const header = [
        `--- Record ${idx + 1} ---`,
        rec.toolDisplayName ? `Tool: ${rec.toolDisplayName}` : '',
        rec.classLabel ? `Class: ${rec.classLabel}` : '',
        rec.subject ? `Subject: ${rec.subject}` : '',
        rec.topic ? `Topic: ${rec.topic}` : '',
        rec.subtopic ? `Subtopic: ${rec.subtopic}` : '',
        rec.createdAt ? `Created: ${new Date(rec.createdAt).toLocaleString()}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      return `${header}\n\n${toEditablePlainText(String(rec.content || ''))}`;
    })
    .join('\n\n');
}
