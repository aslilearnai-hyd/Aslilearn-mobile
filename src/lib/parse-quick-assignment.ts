export type AssignmentQuestion = {
  question: string;
  options: string[];
  answer: string;
  marks?: number;
  questionNumber?: number;
};

export type QuickAssignmentContent = {
  title: string;
  learningObjectives: string[];
  instructions: string;
  conceptQuestions: AssignmentQuestion[];
  applicationTasks: string[];
  realLifeActivity: string;
  creativeQuestion: string;
  collaborativeTask: string;
  challengeQuestion: string;
  assessmentRubric: string;
  expectedOutcomes: string[];
};

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => cleanText(v)).filter(Boolean);
  const s = cleanText(value);
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

function normalizeOptions(entry: Record<string, unknown>): string[] {
  const raw = entry.options ?? entry.choices ?? entry.option_list;
  if (Array.isArray(raw)) {
    return raw.map((o) => cleanText(o)).filter(Boolean);
  }
  return [];
}

function normalizeQuestions(raw: unknown): AssignmentQuestion[] {
  const rows = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  const out: AssignmentQuestion[] = [];

  for (const entry of rows) {
    if (!entry || typeof entry !== 'object') {
      const q = cleanText(entry);
      if (q) out.push({ question: q, options: [], answer: '' });
      continue;
    }
    const row = entry as Record<string, unknown>;
    const question = cleanText(row.question || row.prompt || row.text);
    if (!question) continue;
    const marksRaw = row.marks ?? row.mark;
    const marks =
      marksRaw != null && marksRaw !== '' && !Number.isNaN(Number(marksRaw))
        ? Number(marksRaw)
        : undefined;
    const qNumRaw = row.question_number ?? row.questionNumber ?? row.sl_no;
    const questionNumber =
      qNumRaw != null && qNumRaw !== '' && !Number.isNaN(Number(qNumRaw)) ? Number(qNumRaw) : undefined;
    out.push({
      question,
      options: normalizeOptions(row),
      answer: cleanText(row.answer || row.correctAnswer),
      marks,
      questionNumber,
    });
  }

  const seen = new Set<string>();
  return out.filter((q) => {
    const key = q.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectSectionNumFromTitle(title: string): number {
  const t = String(title || '').toLowerCase();
  if (/assignment\s*title|^title$/.test(t)) return 1;
  if (/learning objectives/.test(t)) return 2;
  if (/instructions/.test(t)) return 3;
  if (/concept[\s-]*based/.test(t)) return 4;
  if (/application/.test(t)) return 5;
  if (/real[\s-]*life|competency/.test(t)) return 6;
  if (/creative/.test(t)) return 7;
  if (/collaborative|discussion/.test(t)) return 8;
  if (/challenge|advanced/.test(t)) return 9;
  if (/assessment|rubric|marking/.test(t)) return 10;
  if (/expected learning|learning outcomes/.test(t)) return 11;
  return 0;
}

function parseNumberedSections(markdown: string): Map<number, string> {
  const lines = String(markdown || '').split('\n');
  const sections = new Map<number, string[]>();
  let current = 0;

  for (const raw of lines) {
    const line = raw.trim();
    const sectionOnly = line.match(/^section\s+(\d{1,2})\s*$/i);
    if (sectionOnly) {
      current = Number(sectionOnly[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const byBareTitle = detectSectionNumFromTitle(line);
    if (byBareTitle > 0 && line.length < 100 && !line.startsWith('-')) {
      current = byBareTitle;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const match = line.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+)$/);
    if (match) {
      const byTitle = detectSectionNumFromTitle(match[2]);
      let num = byTitle > 0 ? byTitle : Number(match[1]);
      if (num === 11) num = 10;
      if (num === 13) num = 11;
      current = num;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current > 0 && sections.has(current)) {
      sections.get(current)!.push(raw);
    }
  }

  const result = new Map<number, string>();
  for (const [num, bodyLines] of sections.entries()) {
    const chunk = cleanText(bodyLines.join('\n'));
    const existing = result.get(num) || '';
    result.set(num, existing ? `${existing}\n\n${chunk}` : chunk);
  }
  return result;
}

function parseConceptQuestionsBlock(text: string): AssignmentQuestion[] {
  const out: AssignmentQuestion[] = [];
  let current: AssignmentQuestion | null = null;

  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const qMatch = line.match(/^(?:Q|Question)?\s*(\d+)[\.\):]\s*(.+)$/i);
    if (qMatch) {
      if (current) out.push(current);
      current = {
        questionNumber: Number(qMatch[1]),
        question: cleanText(qMatch[2]),
        options: [],
        answer: '',
      };
      continue;
    }
    const numMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numMatch && !/^(\d+)[\.\)]\s*[A-Da-d][\.\)]/.test(line)) {
      if (current) out.push(current);
      current = {
        questionNumber: Number(numMatch[1]),
        question: cleanText(numMatch[2]),
        options: [],
        answer: '',
      };
      continue;
    }
    const optMatch = line.match(/^[A-Da-d][\.\)]\s+(.+)$/);
    if (optMatch && current) {
      current.options.push(cleanText(optMatch[1]));
      continue;
    }
    const ansMatch = line.match(/^(?:Answer|Ans)[\s:]+(.+)$/i);
    if (ansMatch && current) {
      current.answer = cleanText(ansMatch[1]);
      continue;
    }
    const marksMatch = line.match(/^Marks?\s*:\s*(\d+)/i);
    if (marksMatch && current) {
      current.marks = Number(marksMatch[1]);
    }
  }
  if (current) out.push(current);
  return out.length ? out : normalizeQuestions(
    parseListBlockAsQuestions(text),
  );
}

function parseListBlockAsQuestions(text: string): AssignmentQuestion[] {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+\.\s+(.+?)(?:\s*\((\d+)\s*marks?\))?$/i);
      if (m) {
        return {
          question: cleanText(m[1]),
          marks: m[2] ? Number(m[2]) : undefined,
          options: [],
          answer: '',
          questionNumber: i + 1,
        };
      }
      return { question: line.replace(/^\d+\.\s+/, ''), options: [], answer: '', questionNumber: i + 1 };
    });
}

function parseListBlock(text: string): string[] {
  const out: string[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+(.+)$/);
    if (m) out.push(cleanText(m[1]));
    else if (t.startsWith('- ') || t.startsWith('• ')) out.push(cleanText(t.replace(/^[-*•]\s+/, '')));
  }
  return out.filter(Boolean);
}

export function normalizeQuickAssignmentRecord(raw: Record<string, unknown>): QuickAssignmentContent {
  const title = cleanText(
    raw.assignment_title || raw.title || raw.assignmentTitle || raw.name,
  );
  const conceptRaw = [
    ...(Array.isArray(raw.concept_based_questions) ? raw.concept_based_questions : []),
    ...(Array.isArray(raw.questions) ? raw.questions : []),
    ...(Array.isArray(raw.practice_questions) ? raw.practice_questions : []),
  ];
  if (cleanText(raw.question)) {
    conceptRaw.push({
      question: raw.question,
      options: raw.options,
      answer: raw.answer,
      marks: raw.marks,
      question_number: raw.question_number,
    });
  }

  return {
    title: title || 'Assignment',
    learningObjectives: toList(raw.learning_objectives ?? raw.objectives ?? raw.learningObjectives),
    instructions: cleanText(
      raw.instructions ?? raw.instructions_to_students ?? raw.student_instructions,
    ),
    conceptQuestions: normalizeQuestions(conceptRaw),
    applicationTasks: toList(
      raw.application_oriented_tasks ?? raw.application_tasks ?? raw.applicationTasks,
    ),
    realLifeActivity: cleanText(
      raw.real_life_competency_activity ??
        raw.real_life_activity ??
        raw.real_life_observation_task,
    ),
    creativeQuestion: cleanText(
      raw.creative_thinking_question ?? raw.creative_question ?? raw.creativeThinkingQuestion,
    ),
    collaborativeTask: cleanText(
      raw.collaborative_discussion_task ??
        raw.discussion_task ??
        raw.collaborative_task,
    ),
    challengeQuestion: cleanText(
      raw.challenge_question_advanced ?? raw.challenge_question ?? raw.challenge,
    ),
    assessmentRubric: cleanText(
      raw.assessment_criteria_rubric ??
        raw.marking_criteria ??
        raw.marking_scheme ??
        raw.rubric,
    ),
    expectedOutcomes: toList(
      raw.expected_learning_outcomes ?? raw.learning_outcomes ?? raw.expectedLearningOutcomes,
    ),
  };
}

function extractSources(rawContent?: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const push = (v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(v as Record<string, unknown>);
  };
  push(rawContent);
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    const r = rawContent as Record<string, unknown>;
    if (r.kind === 'quickAssignment') push(r);
    push(r.renderContent);
    push(r.structuredContent);
    if (r.metadata && typeof r.metadata === 'object') {
      push((r.metadata as Record<string, unknown>).structuredContent);
    }
  }
  return out;
}

function fromMarkdown(markdown: string): QuickAssignmentContent {
  const numbered = parseNumberedSections(markdown);
  const title =
    cleanText(
      String(markdown || '')
        .split('\n')
        .map((l) => l.trim())
        .find((l) => /^#\s+/.test(l) && !/^##\s+/.test(l))
        ?.replace(/^#+\s*/, '') || '',
    ) ||
    cleanText(numbered.get(1) || '') ||
    'Assignment';

  return {
    title,
    learningObjectives: parseListBlock(numbered.get(2) || ''),
    instructions: cleanText(numbered.get(3) || ''),
    conceptQuestions: parseConceptQuestionsBlock(numbered.get(4) || ''),
    applicationTasks: parseListBlock(numbered.get(5) || ''),
    realLifeActivity: cleanText(numbered.get(6) || ''),
    creativeQuestion: cleanText(numbered.get(7) || ''),
    collaborativeTask: cleanText(numbered.get(8) || ''),
    challengeQuestion: cleanText(numbered.get(9) || ''),
    assessmentRubric: cleanText(numbered.get(10) || ''),
    expectedOutcomes: parseListBlock(numbered.get(11) || ''),
  };
}

function mergeAssignment(
  base: QuickAssignmentContent,
  patch: QuickAssignmentContent,
): QuickAssignmentContent {
  return {
    title: base.title || patch.title,
    learningObjectives: base.learningObjectives.length ? base.learningObjectives : patch.learningObjectives,
    instructions: base.instructions || patch.instructions,
    conceptQuestions: base.conceptQuestions.length ? base.conceptQuestions : patch.conceptQuestions,
    applicationTasks: base.applicationTasks.length ? base.applicationTasks : patch.applicationTasks,
    realLifeActivity: base.realLifeActivity || patch.realLifeActivity,
    creativeQuestion: base.creativeQuestion || patch.creativeQuestion,
    collaborativeTask: base.collaborativeTask || patch.collaborativeTask,
    challengeQuestion: base.challengeQuestion || patch.challengeQuestion,
    assessmentRubric: base.assessmentRubric || patch.assessmentRubric,
    expectedOutcomes: base.expectedOutcomes.length ? base.expectedOutcomes : patch.expectedOutcomes,
  };
}

function hasBody(c: QuickAssignmentContent): boolean {
  return (
    Boolean(c.instructions) ||
    c.learningObjectives.length > 0 ||
    c.conceptQuestions.length > 0 ||
    c.applicationTasks.length > 0 ||
    Boolean(c.realLifeActivity) ||
    Boolean(c.creativeQuestion) ||
    Boolean(c.collaborativeTask) ||
    Boolean(c.challengeQuestion) ||
    Boolean(c.assessmentRubric) ||
    c.expectedOutcomes.length > 0
  );
}

export function resolveQuickAssignmentFromPayload(
  content: string,
  rawContent?: unknown,
): { assignment: QuickAssignmentContent | null; markdownFallback: string | null } {
  const sources = extractSources(rawContent);
  let assignment: QuickAssignmentContent | null = null;

  for (const src of sources) {
    const next = normalizeQuickAssignmentRecord(src);
    assignment = assignment ? mergeAssignment(assignment, next) : next;
  }

  try {
    const t = String(content || '').trim();
    if (t.startsWith('{')) {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        const next = normalizeQuickAssignmentRecord(j.structuredContent as Record<string, unknown>);
        assignment = assignment ? mergeAssignment(assignment, next) : next;
      }
    }
  } catch {
    /* ignore */
  }

  const fromMd = fromMarkdown(content);
  assignment = assignment ? mergeAssignment(assignment, fromMd) : fromMd;

  if (!hasBody(assignment)) {
    return { assignment: null, markdownFallback: content || null };
  }

  return { assignment, markdownFallback: null };
}

export function quickAssignmentViewerPayloadFromRecord(
  record?: {
    generatedContent?: string;
    content?: string;
    structuredContent?: unknown;
    metadata?: { structuredContent?: unknown };
    renderContent?: unknown;
  } | null,
): { content: string; rawContent?: unknown } {
  const text = String(record?.generatedContent || record?.content || '').trim();
  const rawContent =
    record?.renderContent ??
    record?.structuredContent ??
    (record?.metadata && typeof record.metadata === 'object'
      ? (record.metadata as { structuredContent?: unknown }).structuredContent
      : record);
  return { content: text, rawContent };
}

export function looksLikeQuickAssignmentContent(text: string): boolean {
  const sample = String(text || '').slice(0, 16000);
  if (!sample.trim()) return false;
  return (
    /quick\s*assignment\s*builder/i.test(sample) ||
    /assignment\s*title/i.test(sample) ||
    /concept[\s-]*based\s*questions/i.test(sample) ||
    /application[\s-]*oriented\s*tasks/i.test(sample) ||
    /assessment\s*criteria\s*\/\s*rubric/i.test(sample) ||
    /(?:^|\n)\s*#{0,3}\s*4\.\s*Concept-based Questions/im.test(sample)
  );
}
