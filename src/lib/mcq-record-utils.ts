/**
 * Parse MCQ / worksheet question data from AI tool generation records.
 */

export type McqQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
};

const MCQ_TOOLS = new Set([
  'worksheet-mcq-generator',
  'homework-creator',
  'exam-question-paper-generator',
  'smart-qa-practice-generator',
  'quick-assignment-builder',
]);

export function isMcqTool(toolName?: string): boolean {
  return MCQ_TOOLS.has(String(toolName || '').trim());
}

function parseQuestionBlob(blob: string): McqQuestion[] {
  const cleaned = String(blob || '')
    .replace(/\s+/g, ' ')
    .replace(/Correct Answer\s*:/gi, 'Answer:')
    .trim();
  if (!cleaned) return [];

  const segments = cleaned
    .split(/\s*(?:Q(?:uestion)?\s*\d+[\.\):]|(?:^|\s)\d+[\.\)])\s*/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments
    .map((segment) => {
      const explanationMatch = segment.match(/Explanation\s*:\s*([^]+)$/i);
      const explanationRaw = explanationMatch ? explanationMatch[1].trim() : '';
      const beforeExplanation = explanationMatch ? segment.slice(0, explanationMatch.index).trim() : segment;
      const answerMatch = beforeExplanation.match(/Answer\s*:\s*([^]+)$/i);
      const answerRaw = answerMatch ? answerMatch[1].trim() : '';
      const withoutAnswer = answerMatch ? beforeExplanation.slice(0, answerMatch.index).trim() : beforeExplanation;
      const optionMatches = Array.from(
        withoutAnswer.matchAll(/([A-D])[\).]\s*([^]+?)(?=(?:\s+[A-D][\).]\s*)|$)/gi),
      );
      const options = optionMatches
        .map((m) => `${m[1].toUpperCase()}) ${String(m[2] || '').trim()}`)
        .filter(Boolean);
      const questionText =
        optionMatches.length > 0
          ? withoutAnswer.slice(0, optionMatches[0].index).trim()
          : withoutAnswer.trim();
      return {
        question: questionText.replace(/^\W+/, '').trim(),
        options,
        answer: answerRaw,
        explanation: explanationRaw,
      };
    })
    .filter((entry) => entry.question);
}

function normalizeOptions(entry: Record<string, unknown>): string[] {
  if (!Array.isArray(entry?.options)) return [];
  return (entry.options as unknown[])
    .map((opt: unknown, idx: number) => {
      const text = String(opt || '').trim();
      if (!text) return '';
      if (/^[A-D][\).]/i.test(text)) return text.replace(/^([A-D])\./i, '$1)');
      return `${String.fromCharCode(65 + idx)}) ${text}`;
    })
    .filter(Boolean);
}

function toQuestionArray(value: unknown): McqQuestion[] {
  const baseRows = (Array.isArray(value) ? value : [])
    .flatMap((entry: Record<string, unknown>) => {
      const questionRaw = String(entry?.question || entry?.prompt || entry?.text || '').trim();
      const answerRaw = String(entry?.answer || entry?.correctAnswer || '').trim();
      const explanationRaw = String(entry?.explanation || entry?.solution || entry?.reason || '').trim();
      const options = normalizeOptions(entry);
      const looksMergedBlob =
        questionRaw.length > 240 ||
        /\bQ(?:uestion)?\s*\d+[\.\):]/i.test(questionRaw) ||
        (/A[\).]/i.test(questionRaw) && /B[\).]/i.test(questionRaw) && /C[\).]/i.test(questionRaw));
      if (looksMergedBlob) {
        return parseQuestionBlob(questionRaw);
      }
      return [
        {
          question: questionRaw,
          options,
          answer: answerRaw,
          explanation: explanationRaw,
        },
      ];
    })
    .filter((entry) => entry.question);

  return baseRows.filter(
    (entry, idx, arr) => arr.findIndex((q) => q.question.toLowerCase() === entry.question.toLowerCase()) === idx,
  );
}

function stripMarkdownLeader(text: string): string {
  const lines = String(text || '').split(/\n/);
  let start = 0;
  while (start < lines.length && /^\s*#+\s/.test(lines[start])) start += 1;
  while (start < lines.length && /^\s*(\*\*|__)?\s*(Class|Subject|Topic|Tool)[:\s]/i.test(lines[start])) {
    start += 1;
  }
  return lines.slice(start).join('\n').trim();
}

function tryParseJsonContent(text: string): McqQuestion[] {
  const t = String(text || '').trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return [];
  try {
    const parsed = JSON.parse(t) as unknown;
    const questions =
      (parsed as { questions?: unknown })?.questions ??
      (parsed as { structuredContent?: { questions?: unknown } })?.structuredContent?.questions;
    if (Array.isArray(questions)) return toQuestionArray(questions);
  } catch {
    /* ignore */
  }
  return [];
}

export function extractMcqQuestionsFromRecord(row: {
  toolName?: string;
  content?: string;
  generatedContent?: string;
  metadata?: unknown;
}): McqQuestion[] {
  if (!isMcqTool(row.toolName)) return [];

  const meta = row.metadata as Record<string, unknown> | undefined;
  const structured = meta?.structuredContent as Record<string, unknown> | undefined;
  const render = meta?.renderContent as Record<string, unknown> | undefined;

  const fromStructured = structured?.questions ?? render?.questions;
  if (Array.isArray(fromStructured) && fromStructured.length > 0) {
    const parsed = toQuestionArray(fromStructured);
    if (parsed.length > 0) return parsed;
  }

  const rawText = String(row.content || row.generatedContent || '').trim();
  const fromJson = tryParseJsonContent(rawText);
  if (fromJson.length > 0) return fromJson;

  let body = stripMarkdownLeader(rawText);
  if (body) {
    const numberedStart = body.search(/\d+[\.\)]\s*[A-Za-z\u00C0-\u024F]/);
    if (numberedStart > 40) {
      body = body.slice(numberedStart).trim();
    }
    const fromBlob = parseQuestionBlob(body);
    if (fromBlob.length > 0) return fromBlob;
    const fromNumbered = parseQuestionBlob(body.replace(/^---+\s*/m, ''));
    if (fromNumbered.length > 0) return fromNumbered;
  }

  return [];
}
