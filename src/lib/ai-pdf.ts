import api from '../services/api/api';
import { toEditablePlainText } from './ai-tool-generations';
import { fetchGeneratorBoardOptions } from './ai-generator';
import { compareClassLabels } from './curriculum-classes-storage';

export const AI_PDF_MAX_MB = 100;
export const AI_PDF_MAX_BYTES = AI_PDF_MAX_MB * 1024 * 1024;

export type UploadStep =
  | 'idle'
  | 'uploading'
  | 'indexing'
  | 'generating'
  | 'validating'
  | 'saving'
  | 'done'
  | 'error';

export const UPLOAD_STEP_MESSAGES: Record<UploadStep, string> = {
  idle: '',
  uploading: 'Uploading PDF...',
  indexing: 'Indexing PDF for RAG context...',
  generating: 'Generating tool content with Gemini (same structure as AI Generator)...',
  validating: 'Validating structured JSON...',
  saving: 'Saving generated records...',
  done: '',
  error: '',
};

export type PdfItem = {
  _id: string;
  board?: string;
  originalName: string;
  fileUrl: string;
  subject: string;
  classLabel: string;
  chapter: string;
  processingStatus: 'pending' | 'processing' | 'processed' | 'failed';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  toolType?: string;
  toolName?: string;
  topic?: string;
  subTopic?: string;
  contentType?: string;
  structuredContent?: unknown;
  renderContent?: unknown;
  chunkCount: number;
  uploadDate: string;
  generatedContent?: string;
  displayTitle?: string;
  recordKind?: 'generation' | 'pdf' | 'legacy';
  pdfId?: string;
  pdfCode?: string;
  generationNumber?: number;
  generationTitle?: string;
  markerLabel?: string;
  totalGenerations?: number;
  metadata?: Record<string, unknown>;
};

export type TokenUsageTotals = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  callCount: number;
};

export type TokenUsageSnapshot = {
  label?: string;
  totals: TokenUsageTotals;
  calls?: Array<{
    label: string;
    model?: string;
    provider?: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
};

export type TokenUsageSummary = TokenUsageTotals & {
  generationCount: number;
  totalCalls: number;
};

export type PdfAnalysis = {
  contentFamily: string;
  confidence: number;
  questionCount: number;
  extractionOk: boolean;
  useGemini: boolean;
  suggestedToolSlug: string;
  suggestedToolLabel: string;
  recommendedTools: { tool?: string; toolLabel?: string; confidence?: number }[];
};

export type ListMeta = {
  newGenerationCount?: number;
  legacyRecordCount?: number;
  orphanSourceCount?: number;
};

export type GroupedSubtopic = { subtopic: string; records: PdfItem[] };
export type GroupedTopic = { topic: string; subtopics: GroupedSubtopic[] };
export type GroupedSubject = { subject: string; topics: GroupedTopic[] };
export type GroupedClass = { classLabel: string; board: string; subjects: GroupedSubject[] };
export type GroupedTool = { tool: string; recordCount: number; classes: GroupedClass[] };

export const AI_PDF_TOOL_OPTIONS = [
  { value: 'activity-project-generator', label: 'Activity / Project Generator' },
  { value: 'project-idea-lab', label: 'Project Idea Lab' },
  { value: 'worksheet-mcq-generator', label: 'Worksheet & MCQ Generator' },
  { value: 'concept-mastery-helper', label: 'Concept Mastery Helper' },
  { value: 'lesson-planner', label: 'Lesson Planner' },
  { value: 'study-schedule-maker', label: 'Study Schedule Maker' },
  { value: 'homework-creator', label: 'Homework Creator' },
  { value: 'reading-practice-room', label: 'Reading Practice Room' },
  { value: 'story-passage-creator', label: 'Story and Passage Creator' },
  { value: 'short-notes-summaries-maker', label: 'Short Notes & Summaries' },
  { value: 'my-study-decks', label: 'My Study Decks' },
  { value: 'flashcard-generator', label: 'Flash Card Generator' },
  { value: 'daily-class-plan-maker', label: 'Daily Class Plan' },
  { value: 'mock-test-builder', label: 'Mock Test Builder' },
  { value: 'exam-question-paper-generator', label: 'Exam Question Paper Generator' },
  { value: 'smart-study-guide-generator', label: 'Smart Study Guide Generator' },
  { value: 'concept-breakdown-explainer', label: 'Concept Breakdown Explainer' },
  { value: 'smart-qa-practice-generator', label: 'Smart Q&A Practice Generator' },
  { value: 'chapter-summary-creator', label: 'Chapter Summary Creator' },
  { value: 'key-points-formula-extractor', label: 'Key Points Extractor' },
  { value: 'quick-assignment-builder', label: 'Quick Assignment Builder' },
].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));

const DEPRECATED_TOOLS = new Set<string>();

export function formatTokenCount(value: number) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function canonicalCurriculumBoardLabel(raw: string) {
  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s || s === '-') return s || '-';
  if (s.toUpperCase() === 'CBSC') return 'CBSE';
  return s;
}

export function getToolLabel(toolValue?: string) {
  return AI_PDF_TOOL_OPTIONS.find((t) => t.value === String(toolValue || '').trim())?.label || toolValue || '-';
}

export function isPdfGenerationRecord(record: Pick<PdfItem, 'recordKind'>): boolean {
  return record.recordKind === 'generation';
}

export function pdfGenerationBadge(record: PdfItem, fallbackIndex: number): string {
  if (record.recordKind === 'legacy') {
    if (record.generationNumber != null) return `Record ${record.generationNumber}`;
    return `Record ${fallbackIndex + 1}`;
  }
  if (record.generationNumber != null) {
    const label = String(record.markerLabel || 'Generation').trim();
    return `${label} ${record.generationNumber}`;
  }
  return `Record ${fallbackIndex + 1}`;
}

export function pdfRecordPreviewLine(record: PdfItem): string {
  const genTitle = String(record.generationTitle || '').trim();
  if (genTitle) return genTitle;
  if (record.generationNumber != null) {
    const label = String(record.markerLabel || 'Generation').trim();
    return `${label} ${record.generationNumber}`;
  }
  const preset = String(record.displayTitle || '').trim();
  if (preset) return preset;
  const rc =
    record.renderContent && typeof record.renderContent === 'object'
      ? (record.renderContent as Record<string, unknown>)
      : null;
  const sc =
    record.structuredContent && typeof record.structuredContent === 'object'
      ? (record.structuredContent as Record<string, unknown>)
      : null;
  const pick = (o: Record<string, unknown> | null) => {
    if (!o) return '';
    return String(o.concept_name || o.title || o.name || o.lesson_name || o.deckTitle || '').trim();
  };
  const fromStruct = pick(rc) || pick(sc);
  if (fromStruct) return fromStruct;
  const plain = toEditablePlainText(String(record.generatedContent || '')).split('\n').find((l) => l.trim());
  return plain?.slice(0, 120) || record.originalName || 'Generated content';
}

export function pdfRecordViewHint(record: PdfItem): string {
  const tool = getToolLabel(record.toolType);
  const parts = [tool, record.subject, record.topic || record.chapter].filter(Boolean);
  return parts.join(' · ') || 'Tap View for full generated content.';
}

export function mapApiPdfDetailToItem(data: Record<string, unknown>): PdfItem {
  return {
    _id: String(data._id || ''),
    board: String(data.board || ''),
    originalName: String(data.originalName || ''),
    fileUrl: String(data.fileUrl || ''),
    subject: String(data.subject || ''),
    classLabel: String(data.classLabel || ''),
    chapter: String(data.chapter || data.topic || ''),
    topic: String(data.topic || data.chapter || ''),
    subTopic: String(data.subTopic || ''),
    processingStatus: (data.processingStatus as PdfItem['processingStatus']) || 'pending',
    approvalStatus: data.approvalStatus as PdfItem['approvalStatus'],
    toolType: String(data.toolType || ''),
    contentType: String(data.contentType || ''),
    structuredContent: data.structuredContent,
    renderContent: data.renderContent,
    chunkCount: Number(data.chunkCount) || 0,
    uploadDate: String(data.uploadDate || data.createdAt || ''),
    generatedContent: String(data.generatedContent || ''),
    displayTitle: typeof data.displayTitle === 'string' ? data.displayTitle : undefined,
    recordKind: data.recordKind as PdfItem['recordKind'],
    pdfId: typeof data.pdfId === 'string' ? data.pdfId : undefined,
    pdfCode: typeof data.pdfCode === 'string' ? data.pdfCode : undefined,
    generationNumber: data.generationNumber != null ? Number(data.generationNumber) : undefined,
    generationTitle: typeof data.generationTitle === 'string' ? data.generationTitle : undefined,
    markerLabel: typeof data.markerLabel === 'string' ? data.markerLabel : undefined,
    totalGenerations: data.totalGenerations != null ? Number(data.totalGenerations) : undefined,
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  };
}

function compareChapterWiseLabels(a: string, b: string) {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

export function buildGroupedHierarchy(items: PdfItem[]): GroupedTool[] {
  const visible = items.filter(
    (item) => !DEPRECATED_TOOLS.has(String(item.toolType || '')) && !DEPRECATED_TOOLS.has(String(item.contentType || '')),
  );
  const byTool = new Map<string, Map<string, { classLabel: string; board: string; subjects: Map<string, Map<string, Map<string, PdfItem[]>>> }>>();

  for (const item of visible) {
    const tool = getToolLabel(item.toolType) || '-';
    const classKey = String(item.classLabel || '-').trim() || '-';
    const boardKey = canonicalCurriculumBoardLabel(String(item.board || '').trim() || '-');
    const classMapKey = `${classKey}||${boardKey}`;
    const subjectKey = String(item.subject || '-').trim() || '-';
    const topicKey = String(item.topic || item.chapter || '-').trim() || '-';
    const subtopicKey = String(item.subTopic || '-').trim() || '-';

    if (!byTool.has(tool)) byTool.set(tool, new Map());
    const classMap = byTool.get(tool)!;
    if (!classMap.has(classMapKey)) {
      classMap.set(classMapKey, { classLabel: classKey, board: boardKey, subjects: new Map() });
    }
    const classEntry = classMap.get(classMapKey)!;
    const subjectMap = classEntry.subjects;
    if (!subjectMap.has(subjectKey)) subjectMap.set(subjectKey, new Map());
    const topicMap = subjectMap.get(subjectKey)!;
    if (!topicMap.has(topicKey)) topicMap.set(topicKey, new Map());
    const subtopicMap = topicMap.get(topicKey)!;
    if (!subtopicMap.has(subtopicKey)) subtopicMap.set(subtopicKey, []);
    subtopicMap.get(subtopicKey)!.push(item);
  }

  const countNestedRecords = (classes: GroupedClass[]) =>
    classes.reduce(
      (toolSum, classNode) =>
        toolSum +
        classNode.subjects.reduce(
          (classSum, subjectNode) =>
            classSum +
            subjectNode.topics.reduce(
              (subjectSum, topicNode) =>
                subjectSum + topicNode.subtopics.reduce((topicSum, st) => topicSum + st.records.length, 0),
              0,
            ),
          0,
        ),
      0,
    );

  return Array.from(byTool.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map(([tool, classMap]) => {
      const classes = Array.from(classMap.entries())
        .sort(([, a], [, b]) => compareClassLabels(a.classLabel, b.classLabel) || a.board.localeCompare(b.board))
        .map(([, classEntry]) => ({
          classLabel: classEntry.classLabel,
          board: classEntry.board,
          subjects: Array.from(classEntry.subjects.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([subjectValue, topicMap]) => ({
              subject: subjectValue,
              topics: Array.from(topicMap.entries())
                .sort(([a], [b]) => compareChapterWiseLabels(a, b))
                .map(([topicValue, subtopicMap]) => ({
                  topic: topicValue,
                  subtopics: Array.from(subtopicMap.entries())
                    .sort(([a], [b]) => compareChapterWiseLabels(a, b))
                    .map(([subtopicValue, records]) => ({
                      subtopic: subtopicValue,
                      records: [...records].sort(
                        (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime(),
                      ),
                    })),
                })),
            })),
        }));
      return { tool, recordCount: countNestedRecords(classes), classes };
    });
}

export async function fetchAiPdfBoardOptions() {
  return fetchGeneratorBoardOptions();
}

export async function fetchAiPdfListPage(boardFilter: string, page: number) {
  const params: Record<string, string> = {
    summary: '1',
    limit: '500',
    page: String(page),
  };
  if (boardFilter && boardFilter !== '__all__') {
    params.board = boardFilter;
  }
  const response = await api.get<{
    success?: boolean;
    data?: PdfItem[];
    pagination?: { totalPages?: number; total?: number };
    listMeta?: ListMeta;
    tokenUsageSummary?: TokenUsageSummary;
    message?: string;
  }>('/api/pdf/list', { params, timeout: 180000 });
  if (response.data?.success === false) {
    throw new Error(response.data?.message || 'Could not load PDF list');
  }
  return {
    items: Array.isArray(response.data?.data) ? response.data.data.map((row) => mapApiPdfDetailToItem(row as unknown as Record<string, unknown>)) : [],
    totalPages: Math.max(1, Number(response.data?.pagination?.totalPages) || 1),
    listMeta: response.data?.listMeta ?? null,
    tokenUsageSummary: response.data?.tokenUsageSummary ?? null,
  };
}

export async function fetchAllAiPdfRecords(boardFilter: string) {
  const first = await fetchAiPdfListPage(boardFilter, 1);
  const all = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchAiPdfListPage(boardFilter, page);
    const seen = new Set(all.map((r) => r._id));
    all.push(...next.items.filter((r) => !seen.has(r._id)));
  }
  return {
    items: all,
    listMeta: first.listMeta,
    tokenUsageSummary: first.tokenUsageSummary,
  };
}

export async function analyzeAiPdfFile(file: { uri: string; name: string; mimeType?: string | null }) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name || 'document.pdf',
    type: file.mimeType || 'application/pdf',
  } as unknown as Blob);
  const response = await api.post<{ success: boolean; data?: PdfAnalysis; message?: string }>(
    '/api/pdf/analyze',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'PDF analysis failed');
  }
  const data = response.data.data || ({} as PdfAnalysis);
  return {
    contentFamily: String(data.contentFamily || 'UNKNOWN'),
    confidence: Number(data.confidence || 0),
    questionCount: Number(data.questionCount || 0),
    extractionOk: Boolean(data.extractionOk),
    useGemini: Boolean(data.useGemini),
    suggestedToolSlug: String(data.suggestedToolSlug || ''),
    suggestedToolLabel: String(data.suggestedToolLabel || ''),
    recommendedTools: Array.isArray(data.recommendedTools) ? data.recommendedTools : [],
  } as PdfAnalysis;
}

export type UploadPdfPayload = {
  file: { uri: string; name: string; mimeType?: string | null; size?: number | null };
  board: string;
  subject: string;
  subjectLabel: string;
  classLabel: string;
  topic: string;
  subTopic: string;
  toolType: string;
};

export async function uploadAiPdf(payload: UploadPdfPayload) {
  const formData = new FormData();
  formData.append('file', {
    uri: payload.file.uri,
    name: payload.file.name || 'document.pdf',
    type: payload.file.mimeType || 'application/pdf',
  } as unknown as Blob);
  formData.append('board', payload.board);
  formData.append('subject', payload.subject);
  formData.append('subjectLabel', payload.subjectLabel);
  formData.append('class', payload.classLabel);
  formData.append('chapter', payload.topic);
  formData.append('topic', payload.topic);
  formData.append('subTopic', String(payload.subTopic || '').trim());
  formData.append('toolType', payload.toolType);

  const response = await api.post<{
    success: boolean;
    message?: string;
    code?: string;
    data?: {
      totalSaved?: number;
      totalGenerationsFound?: number;
      pdfCode?: string;
      generationMarkerLabel?: string;
      extractedFromPdf?: number;
      generatedByAI?: number;
      tokenUsage?: TokenUsageSnapshot;
      classification?: { family?: string; confidence?: number; recommendedTools?: PdfAnalysis['recommendedTools'] };
      extraction?: { validationPassed?: boolean; retryCount?: number };
    };
  }>('/api/pdf/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  });

  if (!response.data?.success) {
    const err = new Error(response.data?.message || 'Upload failed') as Error & { code?: string };
    err.code = response.data?.code;
    throw err;
  }
  return response.data;
}

export async function fetchAiPdfRecord(id: string, recordKind?: PdfItem['recordKind']) {
  const endpoint = isPdfGenerationRecord({ recordKind: recordKind || 'pdf' })
    ? `/api/generations/${id}`
    : `/api/pdf/${id}`;
  const response = await api.get<{ success: boolean; data: Record<string, unknown>; message?: string }>(endpoint);
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Could not load record');
  }
  return mapApiPdfDetailToItem(response.data.data);
}

export async function deleteAiPdfRecord(id: string, recordKind?: PdfItem['recordKind']) {
  const endpoint = isPdfGenerationRecord({ recordKind: recordKind || 'pdf' })
    ? `/api/generations/${id}`
    : `/api/pdf/${id}`;
  const response = await api.delete<{ success: boolean; message?: string }>(endpoint);
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Delete failed');
  }
  return response.data;
}

export async function bulkDeleteAiPdfRecords(ids: string[]) {
  const response = await api.post<{ success: boolean; deletedCount?: number; failedCount?: number; message?: string }>(
    '/api/pdf/bulk-delete',
    { ids },
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Bulk delete failed');
  }
  return response.data;
}

export async function reviewAiPdfRecord(id: string, action: 'approve' | 'reject') {
  const response = await api.patch<{ success: boolean; message?: string }>(`/api/pdf/${id}/review`, { action });
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Review failed');
  }
  return response.data;
}

export function toDisplayPlainText(content: string) {
  return toEditablePlainText(content);
}

