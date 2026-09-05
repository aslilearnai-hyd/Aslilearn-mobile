import { activitiesPayloadIsComplete } from './parse-activity-markdown';
import { isStudyGuideComplete, resolveStudyGuideFromPayload } from './parse-smart-study-guide';
import { resolveStudentAiApiToolType } from './student-ai-tools';
import { parseAiToolClassNumber } from './school-program';
import {
  countNumberedTemplateSections,
  resolveRichDisplayContent,
} from './ai-tool-display-content';
import { buildAiToolViewerContent } from './ai-tool-response-payload';

export type AiToolFieldConfig = {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
};

const AI_TOOL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidAiToolDate(value: unknown): boolean {
  const raw = String(value ?? '').trim();
  if (!AI_TOOL_DATE_RE.test(raw)) return false;
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function sanitizeAiToolDateValue(value: unknown): string {
  const raw = String(value ?? '').trim();
  return isValidAiToolDate(raw) ? raw : '';
}

export type AiToolGenerationMeta = {
  source?: string;
  sourceLabel?: string;
  matchType?: string | null;
  totalCandidates?: number;
  selectedIndex?: number;
  aiUnavailable?: boolean;
  chunksUsed?: number;
  structuredContent?: unknown;
  renderContent?: unknown;
  practiceExamId?: string;
  practiceExamPath?: string;
  practiceQuestionCount?: number;
  citations?: Array<{
    index: number;
    subject: string;
    classLabel: string;
    chapter: string;
    score: string;
    preview: string;
  }>;
};

export type AiToolGenerateSuccess = {
  ok: true;
  content: string;
  rawContent: unknown;
  metadata: AiToolGenerationMeta | null;
  fromAiFailure: boolean;
};

export type AiToolGenerateFailure = {
  ok: false;
  title: string;
  message: string;
  code?: string;
  fallbackMessage: string;
};

export type AiToolGenerateResult = AiToolGenerateSuccess | AiToolGenerateFailure;

function activitiesFromRaw(rawContent: unknown) {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities;
  return undefined;
}

export function validateActivityToolDisplay(
  _toolType: string,
  _content: string,
  _rawContent: unknown,
  _variant: 'student' | 'teacher',
): string | null {
  // Delivery no longer blocks incomplete stored content — always show what the API returned.
  return null;
}

export function validateStudyGuideToolDisplay(
  _toolType: string,
  _content: string,
  _rawContent: unknown,
): string | null {
  // Delivery no longer blocks incomplete stored content — always show what the API returned.
  return null;
}

type ValidateOptions = {
  config: { fields: AiToolFieldConfig[] };
  formParams: Record<string, unknown>;
  toolType?: string;
  isReadingPractice?: boolean;
  requireBoard?: boolean;
};

export function validateAiToolForm({
  config,
  formParams,
  toolType = '',
  isReadingPractice = false,
  requireBoard = true,
}: ValidateOptions): string | null {
  const requiredFields = config.fields.filter((f) => f.required);
  const missingFields = requiredFields.filter((f) => !formParams[f.name]);

  if (missingFields.length > 0) {
    return `Please fill in: ${missingFields.map((f) => f.label).join(', ')}`;
  }

  if (requireBoard && !formParams.board) {
    return 'Please select a board.';
  }

  // Subject/tool pairing and language gates are not client delivery blockers.

  const dateField = config.fields.find((f) => f.name === 'date' || f.type === 'date');
  if (dateField) {
    const raw = formParams.date ?? formParams[dateField.name];
    if (raw != null && String(raw).trim() !== '' && !isValidAiToolDate(raw)) {
      return 'Please pick a valid date (YYYY-MM-DD).';
    }
  }

  return null;
}

function parseResponseBody(responseText: string): {
  success?: boolean;
  data?: {
    content?: string;
    rawData?: unknown;
    structuredContent?: unknown;
    renderContent?: unknown;
    metadata?: AiToolGenerationMeta;
  };
  content?: string;
  message?: string;
  code?: string;
} {
  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {};
  }
}

function resolveApiError(data: ReturnType<typeof parseResponseBody>, response: Response, responseText: string): AiToolGenerateResult {
  const code = data?.code;
  const message = data.message || responseText || `Server error: ${response.status}`;

  if (
    code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    code === 'AI_TOOL_WRONG_TYPE' ||
    (response.status === 404 &&
      (code === 'AI_TOOL_DATA_NOT_FOUND' ||
        code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
        code === 'AI_TOOL_WRONG_TYPE'))
  ) {
    return {
      ok: false,
      title: 'No content found',
      message:
        message ||
        'No saved content matched this selection yet. Try Generate again shortly.',
      code,
      fallbackMessage:
        message ||
        'No saved content matched this selection yet. Try Generate again shortly.',
    };
  }

  if (response.status === 503 && code === 'AI_UNAVAILABLE_NO_FALLBACK') {
    return {
      ok: false,
      title: 'AI unavailable',
      message:
        message ||
        'No stored content matched this selection yet. Try again shortly.',
      code,
      fallbackMessage:
        message ||
        'No stored content matched this selection yet. Try again shortly.',
    };
  }

  return {
    ok: false,
    title: 'Error',
    message: message || 'AI generation failed',
    code,
    fallbackMessage: message || 'Failed to generate content. Please try again.',
  };
}

const CLIENT_VALIDATION_ERROR =
  /invalid subject|topic is required|sub topic is required|class number and subject are required|only available for english and hindi|not available for english, hindi, or telugu|incomplete for|missing sections|not in the correct tool format/i;

export function isAiToolClientValidationError(message: string): boolean {
  return CLIENT_VALIDATION_ERROR.test(message);
}

export function resolveAiToolApiInlineMessage(
  data: { message?: string; code?: string },
  toolName?: string,
): string {
  const message = data.message || '';
  if (message) return message;

  if (data.code === 'AI_TOOL_WRONG_TYPE' || data.code === 'AI_TOOL_CONTENT_INCOMPLETE') {
    return `No saved ${toolName || 'content'} matched this selection yet. Try Generate again shortly.`;
  }
  if (data.code === 'AI_TOOL_DATA_NOT_FOUND') {
    return `No ${toolName || 'tool'} content found for this selection yet. Try Generate again shortly.`;
  }
  if (data.code === 'AI_UNAVAILABLE_NO_FALLBACK') {
    return 'No stored content matched this selection yet. Try again shortly.';
  }

  return 'No saved content matched this selection yet.';
}

export function isAiToolInlineOnlyError(code?: string): boolean {
  return (
    code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    code === 'AI_TOOL_WRONG_TYPE' ||
    code === 'AI_TOOL_DATA_NOT_FOUND' ||
    code === 'AI_UNAVAILABLE_NO_FALLBACK'
  );
}

const STRUCTURED_AI_TOOL_SLUGS = new Set([
  'short-notes-summaries-maker',
  'concept-mastery-helper',
  'study-schedule-maker',
  'lesson-planner',
  'my-study-decks',
  'flashcard-generator',
  'worksheet-mcq-generator',
  'homework-creator',
  'daily-class-plan-maker',
]);

export function shouldWrapAiToolStructuredPayload(toolType: string): boolean {
  return STRUCTURED_AI_TOOL_SLUGS.has(String(toolType || '').trim());
}

export async function fetchAiToolGeneratedContentFallback({
  apiBaseUrl,
  token,
  classLabel,
  subject,
  topic,
  subTopic,
  toolType,
  board,
}: {
  apiBaseUrl: string;
  token: string;
  classLabel: string;
  subject: string;
  topic: string;
  subTopic: string;
  toolType: string;
  board?: string;
}): Promise<AiToolGenerateResult> {
  const params = new URLSearchParams({
    class: classLabel,
    subject,
    topic,
    subTopic,
    toolType,
  });
  if (board) params.set('board', board);

  const response = await fetch(`${apiBaseUrl}/api/teacher/ai/generated-content?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      title: 'Error',
      message: 'Fallback lookup failed',
      fallbackMessage: 'Fallback lookup failed. Please try again.',
    };
  }

  const data = await response.json();
  const fallbackContent = data?.data?.generatedContent ?? data?.data?.content ?? '';

  if (
    data?.code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    data?.code === 'AI_TOOL_WRONG_TYPE' ||
    (data?.success && !data?.data)
  ) {
    // Still deliver body when present — incomplete is not a UI gate.
    if (String(fallbackContent).trim().length > 0) {
      const fallbackRaw =
        data?.data?.structuredContent ?? data?.data?.rawData ?? data?.data?.raw ?? null;
      return {
        ok: true,
        content: String(fallbackContent),
        rawContent: fallbackRaw,
        metadata: {
          matchType: data?.data?.matchType,
          totalCandidates: data?.data?.totalCandidates,
          selectedIndex: data?.data?.selectedIndex,
          source: data?.data?.source,
          sourceLabel: data?.data?.sourceLabel,
        },
        fromAiFailure: false,
      };
    }
    return {
      ok: false,
      title: 'No content found',
      message:
        data?.message ||
        'No saved content matched this selection yet. Try Generate again shortly.',
      code: data?.code,
      fallbackMessage:
        data?.message ||
        'No saved content matched this selection yet. Try Generate again shortly.',
    };
  }

  if (data?.success && String(fallbackContent).trim().length > 0) {
    const fallbackRaw =
      data?.data?.structuredContent ?? data?.data?.rawData ?? data?.data?.raw ?? null;
    return {
      ok: true,
      content: String(fallbackContent),
      rawContent: fallbackRaw,
      metadata: {
        matchType: data?.data?.matchType,
        totalCandidates: data?.data?.totalCandidates,
        selectedIndex: data?.data?.selectedIndex,
        source: data?.data?.source,
        sourceLabel: data?.data?.sourceLabel,
      },
      fromAiFailure: false,
    };
  }

  return {
    ok: false,
    title: 'Generation failed',
    message: data?.message || 'No saved copy matched this selection.',
    fallbackMessage: data?.message || 'No saved copy matched this selection.',
  };
}

export async function executeAiToolGenerate({
  endpoint,
  token,
  requestBody,
}: {
  endpoint: string;
  token: string;
  requestBody: Record<string, unknown>;
}): Promise<AiToolGenerateResult> {
  const bodyWithUnique = {
    ...requestBody,
    uniqueSeed:
      String(requestBody.uniqueSeed || '').trim() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyWithUnique),
  });

  const responseText = await response.text();
  const data = parseResponseBody(responseText);

  if (!response.ok) {
    const softContent = String(data?.data?.content || data?.content || '').trim();
    if (softContent) {
      return {
        ok: true,
        content: softContent,
        rawContent:
          data.data?.rawData ??
          data.data?.structuredContent ??
          data.data?.metadata?.structuredContent ??
          data.data?.metadata?.renderContent ??
          null,
        metadata: data.data?.metadata ?? null,
        fromAiFailure: false,
      };
    }
    return resolveApiError(data, response, responseText);
  }

  const content = data.data?.content || data.content || '';
  if (!data.success || !String(content).trim()) {
    return {
      ok: false,
      title: 'Error',
      message: data.message || 'AI returned empty response',
      code: data.code,
      fallbackMessage: data.message || 'AI returned empty response. Please try again.',
    };
  }

  const fromAiFailure = !!data.data?.metadata?.aiUnavailable;

  return {
    ok: true,
    content: String(content),
    rawContent:
      data.data?.rawData ??
      data.data?.structuredContent ??
      data.data?.metadata?.structuredContent ??
      data.data?.metadata?.renderContent ??
      null,
    metadata: data.data?.metadata ?? null,
    fromAiFailure,
  };
}

/** Match web: wrap structured tools as `{ formatted, raw }` when rawData is present. */
export function resolveAiToolDisplayType(
  toolType: string,
  role: 'student' | 'teacher',
): string {
  if (role === 'student') {
    return resolveStudentAiApiToolType(toolType);
  }
  return String(toolType || '').trim();
}

export function storeAiToolSuccessPayload(
  toolType: string,
  content: string,
  rawContent: unknown,
  role: 'student' | 'teacher'
): { generatedContent: string; rawGeneratedContent: unknown } {
  const { displayContent, rawContent: normalizedRaw } = buildAiToolViewerContent(content, rawContent);
  return {
    generatedContent: displayContent,
    rawGeneratedContent: normalizedRaw ?? rawContent ?? null,
  };
}

export const WHOLE_CHAPTER_VALUE = '__WHOLE_CHAPTER__';

export function resolveSubTopicForRequest(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === WHOLE_CHAPTER_VALUE) return '';
  const norm = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    norm === 'whole chapter' ||
    norm === 'wholechapter' ||
    norm === 'all subtopics' ||
    norm === 'entire chapter'
  ) {
    return '';
  }
  return raw;
}

export function buildTeacherAiRequestBody(
  toolType: string,
  formParams: Record<string, unknown>,
  selectedBoard: string,
  mapGradeLevel: (board: string | undefined, gradeLevel: string | undefined) => string | undefined
) {
  const selectedClass = mapGradeLevel(
    selectedBoard,
    typeof formParams.gradeLevel === 'string' ? formParams.gradeLevel : undefined
  );
  const selectedSubject = formParams.subject || formParams.subjects;
  const selectedTopic = formParams.topic || '';
  const selectedSubTopic = resolveSubTopicForRequest(formParams.subTopic);
  const selectedSection = formParams.section || formParams.className || '';

  const compositionTools = new Set([
    'worksheet-mcq-generator',
    'exam-question-paper-generator',
  ]);
  const questionComposition = compositionTools.has(toolType)
    ? {
        mcq: parseInt(String(formParams.countMcq || '0'), 10) || 0,
        vsaq: parseInt(String(formParams.countVsaq || '0'), 10) || 0,
        saq: parseInt(String(formParams.countSaq || '0'), 10) || 0,
        laq: parseInt(String(formParams.countLaq || '0'), 10) || 0,
        fib: parseInt(String(formParams.countFib || '0'), 10) || 0,
      }
    : undefined;

  return {
    toolType,
    ...formParams,
    classNumber: parseAiToolClassNumber(selectedClass),
    subject: selectedSubject,
    topic: selectedTopic,
    section: selectedSection,
    questionCount: formParams.questionCount ? parseInt(String(formParams.questionCount), 10) : undefined,
    duration: formParams.duration ? parseInt(String(formParams.duration), 10) : undefined,
    subTopic: selectedSubTopic,
    chapterScope: !selectedSubTopic,
    productCategory:
      formParams.productCategory === 'NONE' || formParams.productCategory === 'GENERAL'
        ? ''
        : String(formParams.productCategory || formParams.batch || ''),
    questionComposition,
    board: selectedBoard,
    gradeLevel: selectedClass,
  };
}

export function buildStudentAiRequestBody(
  apiToolType: string,
  formParams: Record<string, unknown>,
  selectedBoard: string,
  mapGradeLevel: (board: string | undefined, gradeLevel: string | undefined) => string | undefined
) {
  const mappedTopic = String(
    formParams.topic ||
      formParams.concept ||
      formParams.chapter ||
      formParams.projectTopic ||
      ''
  ).trim();
  const selectedSubTopic = resolveSubTopicForRequest(formParams.subTopic);

  const gradeLevel = mapGradeLevel(
    selectedBoard,
    typeof formParams.gradeLevel === 'string' ? formParams.gradeLevel : undefined
  );

  return {
    toolType: apiToolType,
    ...formParams,
    board: selectedBoard,
    gradeLevel,
    subject: formParams.subject || formParams.subjects,
    topic: mappedTopic,
    subTopic: selectedSubTopic,
    chapterScope: !selectedSubTopic,
    productCategory:
      formParams.productCategory === 'NONE' || formParams.productCategory === 'GENERAL'
        ? ''
        : String(formParams.productCategory || formParams.batch || ''),
  };
}

/** Student generate: single POST (matches web — fallback only on network errors in the page). */
export async function executeStudentAiToolGenerate({
  apiBaseUrl,
  token,
  apiToolType,
  formParams,
  selectedBoard,
  mapGradeLevel,
}: {
  apiBaseUrl: string;
  token: string;
  apiToolType: string;
  formParams: Record<string, unknown>;
  selectedBoard: string;
  mapGradeLevel: (board: string | undefined, gradeLevel: string | undefined) => string | undefined;
}): Promise<AiToolGenerateResult> {
  const requestBody = buildStudentAiRequestBody(apiToolType, formParams, selectedBoard, mapGradeLevel);
  return executeAiToolGenerate({
    endpoint: `${apiBaseUrl}/api/student/ai/tool`,
    token,
    requestBody,
  });
}
