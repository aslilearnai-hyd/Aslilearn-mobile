/**
 * Parse Story & Passage Creator output (JSON, markdown sections, legacy passages bundle).
 */

import { parseNumberedTemplateSections } from './ai-tool-display-content';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';

export type ResolveStoryOptions = {
  /** Force 19-section teacher vs 13-section reading layout when parsing markdown. */
  format?: 'teacher' | 'reading';
};

export type StoryQuestion = {
  question: string;
  answer?: string;
};

export type StoryPassageItem = {
  passageNumber: number;
  paragraph: string;
  questions: string[];
};

export type ParsedStory = {
  title: string;
  subtopicLinkPriorKnowledge?: string;
  topicSubtopicConnection?: string;
  priorKnowledgeRequired?: string;
  ncfAlignment?: string;
  preReadingPrompt?: string;
  alignment?: string;
  learningObjectives: string[];
  passage: string;
  vocabulary: string[];
  vocabularyPractice: string[];
  readRecallQuestions: StoryQuestion[];
  thinkInferQuestions: StoryQuestion[];
  applyConnectQuestions: StoryQuestion[];
  questions: StoryQuestion[]; // backward-compatible aggregate
  vocabularyGrammarPractice?: string;
  creativeResponseActivity?: string;
  answerKeySuggestedResponses?: string;
  commonMistakesToAvoid?: string;
  answerHints: string[];
  differentiationSupport?: string;
  differentiationExtension?: string;
  expectedLearningOutcomes?: string;
  realLifeApplication?: string;
  reflection?: string;
  meta?: {
    subject?: string;
    book?: string;
    chapter?: string;
    instructions?: string;
  };
};

export type ParsedPassagesBundle = {
  title: string;
  instructions?: string;
  meta?: ParsedStory['meta'];
  passages: StoryPassageItem[];
};

export type ResolvedStoryContent =
  | { mode: 'stories'; stories: ParsedStory[] }
  | { mode: 'passages'; bundle: ParsedPassagesBundle }
  | { mode: 'empty' };

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coerceArrayItemToText(x: unknown): string {
  if (x == null) return '';
  if (typeof x === 'string') return x.trim();
  if (typeof x === 'number' || typeof x === 'boolean') return String(x).trim();
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return str(
      o.question ||
        o.question_text ||
        o.questionText ||
        o.text ||
        o.prompt ||
        o.statement ||
        o.content ||
        o.label ||
        o.value,
    );
  }
  return '';
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(coerceArrayItemToText).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
      .filter((line) => line && line !== '[object Object]');
  }
  return [];
}

function toQuestions(v: unknown): StoryQuestion[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((q) => {
      if (typeof q === 'string') return { question: str(q) };
      if (q && typeof q === 'object') {
        const o = q as Record<string, unknown>;
        return {
          question: str(
            o.question || o.question_text || o.questionText || o.text || o.prompt || o.statement,
          ),
          answer: str(o.answer || o.hint || o.correctAnswer),
        };
      }
      return null;
    })
    .filter((q): q is StoryQuestion => !!q?.question);
}

function normalizeStoryFromObject(raw: Record<string, unknown>, fallbackTitle?: string): ParsedStory {
  const alignment =
    str(raw.alignment_block) ||
    [
      raw.nep_ncf_focus ? `NEP/NCF: ${str(raw.nep_ncf_focus)}` : '',
      raw.skill_focus ? `Skill focus: ${str(raw.skill_focus)}` : '',
      raw.udl_support || raw.udl ? `UDL: ${str(raw.udl_support || raw.udl)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  const subtopicLinkPriorKnowledge =
    str(raw.subtopic_link_prior_knowledge || raw.subtopicLinkPriorKnowledge) ||
    [
      str(raw.topic_subtopic_connection || raw.topic_and_subtopic_connection || raw.topicSubtopicConnection),
      str(raw.prior_knowledge_required || raw.priorKnowledgeRequired || raw.subtopic_link),
    ]
      .filter(Boolean)
      .join('\n') ||
    undefined;

  return {
    title: stripAiToolGenerationLabel(
      str(raw.reading_practice_title || raw.readingPracticeTitle || raw.title) ||
        fallbackTitle ||
        'Reading Practice',
      'Reading Practice',
    ),
    subtopicLinkPriorKnowledge,
    topicSubtopicConnection:
      str(raw.topic_subtopic_connection || raw.topic_and_subtopic_connection || raw.topicSubtopicConnection) ||
      undefined,
    priorKnowledgeRequired: str(raw.prior_knowledge_required || raw.priorKnowledgeRequired) || undefined,
    ncfAlignment:
      str(raw.ncf_competency_alignment || raw.ncf_alignment || raw.ncfAlignment || raw.alignment_block) ||
      undefined,
    preReadingPrompt: str(raw.pre_reading_thinking_prompt || raw.pre_reading_prompt || raw.preReadingPrompt) || undefined,
    alignment: alignment || undefined,
    learningObjectives: strArr(raw.learning_objectives || raw.objectives),
    passage: str(raw.passage || raw.content || raw.story_passage_content || raw.story_text),
    vocabulary: strArr(raw.vocabulary_warmup || raw.vocabulary_support || raw.vocabulary),
    vocabularyPractice: strArr(raw.vocabulary_practice || raw.vocabularyPractice),
    readRecallQuestions: toQuestions(
      raw.read_and_recall_questions ||
        raw.read_recall_questions ||
        raw.recall_questions ||
        raw.readAndRecallQuestions ||
        raw.comprehension_questions ||
        (!raw.think_and_infer_questions &&
        !raw.thinkAndInferQuestions &&
        !raw.apply_and_connect_questions &&
        !raw.applyAndConnectQuestions
          ? raw.questions
          : undefined),
    ),
    thinkInferQuestions: toQuestions(
      raw.think_and_infer_questions || raw.think_infer_questions || raw.infer_questions || raw.thinkAndInferQuestions,
    ),
    applyConnectQuestions: toQuestions(
      raw.apply_and_connect_questions ||
        raw.apply_connect_questions ||
        raw.connect_questions ||
        raw.applyAndConnectQuestions,
    ),
    questions: toQuestions(raw.questions || raw.comprehension_questions),
    vocabularyGrammarPractice: str(raw.vocabulary_grammar_practice || raw.vocabularyGrammarPractice) || undefined,
    creativeResponseActivity: str(raw.creative_response_activity || raw.creativeResponseActivity) || undefined,
    answerKeySuggestedResponses:
      str(raw.answer_key_suggested_responses || raw.answer_key || raw.answerKeySuggestedResponses) ||
      strArr(raw.answer_key_suggested_responses).join('\n') ||
      undefined,
    commonMistakesToAvoid: str(raw.common_mistakes_to_avoid || raw.commonMistakesToAvoid) || undefined,
    answerHints: strArr(raw.answer_key_suggested_responses || raw.answer_hints || raw.answer_key),
    differentiationSupport: str(raw.differentiation_support) || undefined,
    differentiationExtension: str(raw.differentiation_extension) || undefined,
    expectedLearningOutcomes:
      str(raw.expected_learning_outcomes || raw.expectedLearningOutcomes) ||
      strArr(raw.expected_learning_outcomes).join('\n') ||
      undefined,
    realLifeApplication: str(raw.real_life_application || raw.real_life_link) || undefined,
    reflection: str(raw.reflection_exit_ticket || raw.reflection_prompt) || undefined,
    meta: {
      subject: str(raw.subject) || undefined,
      book: str(raw.book) || undefined,
      chapter: str(raw.chapter || raw.topic) || undefined,
      instructions: str(raw.instructions) || undefined,
    },
  };
}

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === '{') depth++;
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('[');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === '[') depth++;
    else if (trimmed[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parsePassagesBundle(obj: Record<string, unknown>): ParsedPassagesBundle | null {
  const passages = Array.isArray(obj.passages) ? obj.passages : null;
  if (!passages?.length) return null;
  const items: StoryPassageItem[] = passages
    .map((p, i) => {
      const row = (p || {}) as Record<string, unknown>;
      return {
        passageNumber: Number(row.passage_number) || i + 1,
        paragraph: str(row.paragraph || row.passage || row.content),
        questions: strArr(row.questions),
      };
    })
    .filter((p) => p.paragraph);
  if (!items.length) return null;
  return {
    title: str(obj.title) || 'Reading passages',
    instructions: str(obj.instructions) || undefined,
    meta: {
      subject: str(obj.subject) || undefined,
      book: str(obj.book) || undefined,
      chapter: str(obj.chapter) || undefined,
    },
    passages: items,
  };
}

type StorySectionKey = keyof ParsedStory | 'alignment';

/** Reading Practice Room — 13 sections */
const READING_PRACTICE_SECTION_HINT: Record<number, StorySectionKey> = {
  1: 'title',
  2: 'subtopicLinkPriorKnowledge',
  3: 'learningObjectives',
  4: 'ncfAlignment',
  5: 'vocabulary',
  6: 'passage',
  7: 'readRecallQuestions',
  8: 'thinkInferQuestions',
  9: 'applyConnectQuestions',
  10: 'vocabularyPractice',
  11: 'answerKeySuggestedResponses',
  12: 'expectedLearningOutcomes',
  13: 'reflection',
};

/** Story and Passage Creator (teacher) — 19 sections */
const TEACHER_STORY_PASSAGE_SECTION_HINT: Record<number, StorySectionKey> = {
  1: 'title',
  2: 'topicSubtopicConnection',
  3: 'priorKnowledgeRequired',
  4: 'learningObjectives',
  5: 'ncfAlignment',
  6: 'vocabulary',
  7: 'preReadingPrompt',
  8: 'passage',
  9: 'readRecallQuestions',
  10: 'thinkInferQuestions',
  11: 'applyConnectQuestions',
  12: 'vocabularyGrammarPractice',
  13: 'creativeResponseActivity',
  14: 'answerKeySuggestedResponses',
  15: 'commonMistakesToAvoid',
  16: 'differentiationSupport',
  17: 'expectedLearningOutcomes',
  18: 'realLifeApplication',
  19: 'reflection',
};

const SECTION_HEADING_MD_RE = /^#{1,3}\s+(\d{1,2})\.\s*(.+?)\s*$/i;
const SECTION_PLAIN_RE = /^(\d{1,2})\.\s+(.+?)\s*$/i;

const READING_SECTION_TITLE_HINT: Record<number, RegExp> = {
  1: /reading\s+practice\s+title|story|passage\s+title/i,
  2: /subtopic.*prior|prior\s+knowledge/i,
  3: /learning\s+objective/i,
  4: /ncf|competency|learning\s+outcome/i,
  5: /vocabulary\s+warm/i,
  6: /^passage|story\s*\/?\s*story/i,
  7: /read.*recall/i,
  8: /think.*infer/i,
  9: /apply.*connect/i,
  10: /vocabulary\s+practice/i,
  11: /answer\s+key|suggested\s+response/i,
  12: /expected\s+learning\s+outcome/i,
  13: /reflection|exit\s+ticket/i,
};

const TEACHER_SECTION_TITLE_HINT: Record<number, RegExp> = {
  1: /story\s*\/?\s*passage\s*title|passage\s*title/i,
  2: /topic\s+and\s+subtopic/i,
  3: /prior\s+knowledge/i,
  4: /learning\s+objectives?/i,
  5: /ncf|competency|learning\s+outcome/i,
  6: /vocabulary\s+warm/i,
  7: /pre[-\s]?reading/i,
  8: /story\s*\/?\s*passage\s+content|^passage$/i,
  9: /read\s+and\s+recall/i,
  10: /think\s+and\s+infer/i,
  11: /apply\s+and\s+connect/i,
  12: /vocabulary\s+and\s+grammar/i,
  13: /creative\s+response/i,
  14: /answer\s+key|suggested\s+responses?/i,
  15: /common\s+mistakes/i,
  16: /differentiation/i,
  17: /expected\s+learning\s+outcomes?/i,
  18: /real[-\s]?life/i,
  19: /reflection|exit\s+ticket/i,
};

function detectStoryPassageFormat(text: string): 'teacher' | 'reading' {
  const t = String(text || '');
  if (
    /\b1[4-9]\.\s+/i.test(t) ||
    /creative\s+response\s+activity/i.test(t) ||
    /common\s+mistakes\s+to\s+avoid/i.test(t) ||
    /topic\s+and\s+subtopic\s+connection/i.test(t) ||
    /pre[-\s]?reading\s+thinking/i.test(t) ||
    /story\s*\/?\s*passage\s+content/i.test(t)
  ) {
    return 'teacher';
  }
  return 'reading';
}

/** Legacy story labels → 13-section Reading Practice Room index. */
function legacyStorySectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  if (/^alignment\s+block/i.test(t)) return 4;
  if (/^learning\s+objectives?/i.test(t)) return 3;
  if (/^passage$/i.test(t) || /^story\s*\/?\s*passage/i.test(t)) return 6;
  if (/^vocabulary\s+support/i.test(t)) return 5;
  if (/^comprehension\s+and\s+thinking/i.test(t)) return 7;
  if (/^answer\s+hints?/i.test(t)) return 11;
  if (/^differentiation/i.test(t)) return null;
  if (/^real[-\s]?life/i.test(t)) return null;
  if (/^reflection/i.test(t) || /^exit\s+ticket/i.test(t)) return 13;
  return null;
}

function sectionNumFromLine(line: string, format: 'teacher' | 'reading' = 'reading'): number | null {
  const trimmed = line.trim();
  const maxSection = format === 'teacher' ? 19 : 13;
  const titleHints = format === 'teacher' ? TEACHER_SECTION_TITLE_HINT : READING_SECTION_TITLE_HINT;

  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= maxSection) return n;
  }
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) {
    const n = Number(m[1]);
    const title = String(m[2] || '').trim();
    if (n >= 1 && n <= maxSection && titleHints[n]?.test(title)) return n;
    if (format === 'reading') {
      const legacy = legacyStorySectionNumFromTitle(title);
      if (legacy != null) return legacy;
    }
  }
  const bare = stripOrderedPrefix(trimmed).replace(/^#+\s*/, '').trim();
  if (format === 'reading') {
    const bareLegacy = legacyStorySectionNumFromTitle(bare);
    if (bareLegacy != null) return bareLegacy;
  }
  for (const [numStr, re] of Object.entries(titleHints)) {
    if (re.test(bare)) return Number(numStr);
  }
  return null;
}

function applyStorySectionBody(story: ParsedStory, key: StorySectionKey, body: string) {
  const text = body.replace(/\n{2,}/g, '\n').trim();
  if (!text) return;

  if (key === 'alignment') {
    story.alignment = text;
    return;
  }
  if (key === 'title') {
    story.title = text || story.title;
    return;
  }
  if (key === 'subtopicLinkPriorKnowledge') {
    story.subtopicLinkPriorKnowledge = text;
    return;
  }
  if (key === 'topicSubtopicConnection') {
    story.topicSubtopicConnection = text;
    return;
  }
  if (key === 'priorKnowledgeRequired') {
    story.priorKnowledgeRequired = text;
    return;
  }
  if (key === 'ncfAlignment') {
    story.ncfAlignment = text;
    return;
  }
  if (key === 'preReadingPrompt') {
    story.preReadingPrompt = text;
    return;
  }
  if (key === 'learningObjectives') {
    story.learningObjectives = linesToList(body);
    return;
  }
  if (key === 'passage') {
    story.passage = text;
    return;
  }
  if (key === 'vocabulary') {
    story.vocabulary = linesToList(body);
    return;
  }
  if (key === 'vocabularyPractice') {
    story.vocabularyPractice = linesToList(body);
    return;
  }
  if (key === 'readRecallQuestions') {
    story.readRecallQuestions = linesToOrderedList(body).map((q) => ({ question: q }));
    story.questions = story.readRecallQuestions;
    return;
  }
  if (key === 'thinkInferQuestions') {
    story.thinkInferQuestions = linesToOrderedList(body).map((q) => ({ question: q }));
    return;
  }
  if (key === 'applyConnectQuestions') {
    story.applyConnectQuestions = linesToOrderedList(body).map((q) => ({ question: q }));
    return;
  }
  if (key === 'vocabularyGrammarPractice') {
    story.vocabularyGrammarPractice = text;
    return;
  }
  if (key === 'creativeResponseActivity') {
    story.creativeResponseActivity = text;
    return;
  }
  if (key === 'answerKeySuggestedResponses') {
    story.answerKeySuggestedResponses = text;
    story.answerHints = linesToList(body);
    return;
  }
  if (key === 'commonMistakesToAvoid') {
    story.commonMistakesToAvoid = text;
    return;
  }
  if (key === 'differentiationSupport') {
    const support = body.match(/support:\s*(.+)/i);
    const ext = body.match(/extension:\s*(.+)/i);
    if (support) story.differentiationSupport = support[1].trim();
    if (ext) story.differentiationExtension = ext[1].trim();
    if (!support && !ext) story.differentiationSupport = text;
    return;
  }
  if (key === 'realLifeApplication') {
    story.realLifeApplication = text;
    return;
  }
  if (key === 'expectedLearningOutcomes') {
    story.expectedLearningOutcomes = text;
    return;
  }
  if (key === 'reflection') {
    story.reflection = text;
  }
}

function linesToList(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

/** Numbered lines inside a section (e.g. comprehension Q1–Qn) — do not treat as template headers */
function linesToOrderedList(body: string): string[] {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join(' ').trim();
    const cleaned = text.replace(/^\s*\d+[\).\s]+/i, '').trim();
    if (cleaned && cleaned !== '[object Object]') items.push(cleaned);
    buf = [];
  };

  for (const line of lines) {
    if (/^\d+[\).\s]+/.test(line)) {
      flush();
      buf.push(line.replace(/^\s*\d+[\).\s]+/i, '').trim());
    } else if (buf.length) {
      buf.push(line);
    } else if (line.startsWith('-') || line.startsWith('*')) {
      items.push(line.replace(/^\s*[-*•]\s*/, '').trim());
    } else if (line) {
      items.push(line);
    }
  }
  flush();
  return items.filter(Boolean);
}

function storyHasContent(s: ParsedStory): boolean {
  return !!(
    s.passage ||
    s.subtopicLinkPriorKnowledge ||
    s.topicSubtopicConnection ||
    s.priorKnowledgeRequired ||
    s.preReadingPrompt ||
    s.alignment ||
    s.ncfAlignment ||
    s.learningObjectives.length ||
    s.vocabulary.length ||
    s.vocabularyPractice.length ||
    s.vocabularyGrammarPractice ||
    s.creativeResponseActivity ||
    s.commonMistakesToAvoid ||
    s.differentiationSupport ||
    s.realLifeApplication ||
    s.questions.length ||
    s.readRecallQuestions.length ||
    s.thinkInferQuestions.length ||
    s.applyConnectQuestions.length ||
    s.answerHints.length ||
    s.answerKeySuggestedResponses ||
    s.expectedLearningOutcomes ||
    s.reflection
  );
}

function pickStr(a?: string, b?: string): string {
  const aa = String(a || '').trim();
  const bb = String(b || '').trim();
  return bb.length >= aa.length ? bb : aa;
}

function pickList(a: string[], b: string[]): string[] {
  return b.length >= a.length ? b : a;
}

function questionListIsBroken(items: StoryQuestion[]): boolean {
  return items.some((q) => !q.question || q.question === '[object Object]');
}

function pickQuestions(a: StoryQuestion[], b: StoryQuestion[]): StoryQuestion[] {
  const aBroken = questionListIsBroken(a);
  const bBroken = questionListIsBroken(b);
  if (aBroken && !bBroken) return b;
  if (bBroken && !aBroken) return a;
  return b.length >= a.length ? b : a;
}

export function mergeStory(base: ParsedStory = emptyStory(), md: ParsedStory = emptyStory()): ParsedStory {
  return {
    title: pickStr(md.title, base.title),
    subtopicLinkPriorKnowledge:
      pickStr(md.subtopicLinkPriorKnowledge, base.subtopicLinkPriorKnowledge) || undefined,
    topicSubtopicConnection:
      pickStr(md.topicSubtopicConnection, base.topicSubtopicConnection) || undefined,
    priorKnowledgeRequired:
      pickStr(md.priorKnowledgeRequired, base.priorKnowledgeRequired) || undefined,
    ncfAlignment: pickStr(md.ncfAlignment, base.ncfAlignment) || undefined,
    preReadingPrompt: pickStr(md.preReadingPrompt, base.preReadingPrompt) || undefined,
    alignment: pickStr(md.alignment, base.alignment) || undefined,
    learningObjectives: pickList(md.learningObjectives, base.learningObjectives),
    passage: pickStr(md.passage, base.passage),
    vocabulary: pickList(md.vocabulary, base.vocabulary),
    vocabularyPractice: pickList(md.vocabularyPractice, base.vocabularyPractice),
    readRecallQuestions: pickQuestions(md.readRecallQuestions, base.readRecallQuestions),
    thinkInferQuestions: pickQuestions(md.thinkInferQuestions, base.thinkInferQuestions),
    applyConnectQuestions: pickQuestions(md.applyConnectQuestions, base.applyConnectQuestions),
    questions: pickQuestions(md.questions, base.questions),
    vocabularyGrammarPractice:
      pickStr(md.vocabularyGrammarPractice, base.vocabularyGrammarPractice) || undefined,
    creativeResponseActivity:
      pickStr(md.creativeResponseActivity, base.creativeResponseActivity) || undefined,
    answerKeySuggestedResponses:
      pickStr(md.answerKeySuggestedResponses, base.answerKeySuggestedResponses) || undefined,
    commonMistakesToAvoid:
      pickStr(md.commonMistakesToAvoid, base.commonMistakesToAvoid) || undefined,
    expectedLearningOutcomes:
      pickStr(md.expectedLearningOutcomes, base.expectedLearningOutcomes) || undefined,
    answerHints: pickList(md.answerHints, base.answerHints),
    differentiationSupport:
      pickStr(md.differentiationSupport, base.differentiationSupport) || undefined,
    differentiationExtension:
      pickStr(md.differentiationExtension, base.differentiationExtension) || undefined,
    realLifeApplication: pickStr(md.realLifeApplication, base.realLifeApplication) || undefined,
    reflection: pickStr(md.reflection, base.reflection) || undefined,
    meta: { ...base.meta, ...md.meta },
  };
}

function emptyStory(title = 'Reading Practice'): ParsedStory {
  return {
    title,
    readRecallQuestions: [],
    thinkInferQuestions: [],
    applyConnectQuestions: [],
    learningObjectives: [],
    passage: '',
    vocabulary: [],
    vocabularyPractice: [],
    questions: [],
    answerHints: [],
  };
}

function hasDirectStoryPayload(o: Record<string, unknown>): boolean {
  return !!(
    o.title ||
    o.passage ||
    o.content ||
    o.story_passage_content ||
    o.alignment_block ||
    o.learning_objectives ||
    o.read_and_recall_questions ||
    o.readAndRecallQuestions ||
    o.think_and_infer_questions ||
    o.thinkAndInferQuestions ||
    o.apply_and_connect_questions ||
    o.applyAndConnectQuestions ||
    o.recall_questions ||
    o.infer_questions ||
    o.connect_questions
  );
}

function absorbStoryRawRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((x) => absorbStoryRawRecords(x));
  }
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const meta = o.metadata as Record<string, unknown> | undefined;
  const records: Record<string, unknown>[] = [];

  if (meta?.structuredContent && typeof meta.structuredContent === 'object') {
    records.push(...absorbStoryRawRecords(meta.structuredContent));
  }
  if (meta?.renderContent && typeof meta.renderContent === 'object') {
    records.push(...absorbStoryRawRecords(meta.renderContent));
  }
  if (o.structuredContent && typeof o.structuredContent === 'object') {
    records.push(...absorbStoryRawRecords(o.structuredContent));
  }
  if (o.renderContent && typeof o.renderContent === 'object') {
    records.push(...absorbStoryRawRecords(o.renderContent));
  }
  if (hasDirectStoryPayload(o)) {
    records.push(o);
  }
  if (records.length) return records;
  if (o.raw && typeof o.raw === 'object') return absorbStoryRawRecords(o.raw);
  return [];
}

function enrichStoryQuestionsFromTemplateMarkdown(
  story: ParsedStory,
  markdown: string,
  format: 'teacher' | 'reading',
): void {
  const needsRecall = !story.readRecallQuestions.length;
  const needsThink = !story.thinkInferQuestions.length;
  const needsApply = !story.applyConnectQuestions.length;
  if (!needsRecall && !needsThink && !needsApply) return;

  const { sections } = parseNumberedTemplateSections(markdown);
  const hintMap =
    format === 'teacher' ? TEACHER_STORY_PASSAGE_SECTION_HINT : READING_PRACTICE_SECTION_HINT;

  for (const sec of sections) {
    if (!sec.body?.trim()) continue;
    const key = hintMap[sec.num];
    if (!key) continue;
    if (key === 'readRecallQuestions' && needsRecall) {
      applyStorySectionBody(story, key, sec.body);
    }
    if (key === 'thinkInferQuestions' && needsThink) {
      applyStorySectionBody(story, key, sec.body);
    }
    if (key === 'applyConnectQuestions' && needsApply) {
      applyStorySectionBody(story, key, sec.body);
    }
  }
}

function applyStoryFormatToStories(stories: ParsedStory[], markdown: string, format?: 'teacher' | 'reading') {
  if (!markdown.trim() || !stories.length) return;
  const resolvedFormat = format ?? detectStoryPassageFormat(markdown);
  for (const story of stories) {
    enrichStoryQuestionsFromTemplateMarkdown(story, markdown, resolvedFormat);
  }
}

function parseStoryFromMarkdown(text: string, forcedFormat?: 'teacher' | 'reading'): ParsedStory | null {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return null;

  const format = forcedFormat ?? detectStoryPassageFormat(trimmed);
  const sectionHintMap =
    format === 'teacher' ? TEACHER_STORY_PASSAGE_SECTION_HINT : READING_PRACTICE_SECTION_HINT;

  const titleMatch = trimmed.match(/^##\s+(.+?)(?:\n|$)/m);
  let title = titleMatch ? titleMatch[1].replace(/^Story\s+\d+\s*:\s*/i, '').trim() : '';
  let bodyStart = titleMatch ? trimmed.slice(titleMatch.index! + titleMatch[0].length) : trimmed;

  if (!title) {
    const firstLine = bodyStart.split('\n').map((l) => l.trim()).find(Boolean) || '';
    if (firstLine && sectionNumFromLine(firstLine, format) == null && firstLine.length < 120) {
      title = firstLine.replace(/^\d+[\).\s]+/, '').trim();
      bodyStart = bodyStart.slice(bodyStart.indexOf(firstLine) + firstLine.length).replace(/^\n+/, '');
    }
  }
  if (!title) title = 'Story';
  title = stripAiToolGenerationLabel(title, 'Story');

  const sections = new Map<number, string>();
  const lines = bodyStart.split('\n');
  let current: number | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (current != null && buf.length) {
      const body = buf.join('\n').trim();
      if (body) sections.set(current, body);
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const n = sectionNumFromLine(line, format);
    if (n != null) {
      flush();
      current = n;
      continue;
    }
    if (current != null) buf.push(line);
  }
  flush();

  // Fallback: heading titles without reliable numbering.
  if (!sections.size) {
    const headingOnlyMap = new Map<number, string>();
    const headingPatterns =
      format === 'teacher'
        ? (Object.entries(TEACHER_SECTION_TITLE_HINT) as Array<[string, RegExp]>).map(
            ([num, re]) => [Number(num), re] as [number, RegExp],
          )
        : ([
            [1, /^reading\s+practice\s+title|story|passage\s+title/i],
            [2, /subtopic.*prior|prior\s+knowledge/i],
            [3, /learning\s+objectives?/i],
            [4, /ncf|competency|learning\s+outcome/i],
            [5, /vocabulary\s+warm/i],
            [6, /^passage|story\s*\/?\s*passage/i],
            [7, /read\s+and\s+recall/i],
            [8, /think\s+and\s+infer/i],
            [9, /apply\s+and\s+connect/i],
            [10, /vocabulary\s+practice/i],
            [11, /answer\s+key|suggested\s+response/i],
            [12, /expected\s+learning\s+outcome/i],
            [13, /reflection|exit\s+ticket/i],
          ] as Array<[number, RegExp]>);

    let cur: number | null = null;
    const b: string[] = [];
    const flush2 = () => {
      if (cur == null) return;
      const body2 = b.join('\n').trim();
      if (body2) headingOnlyMap.set(cur, body2);
      b.length = 0;
    };
    for (const rawLine of lines) {
      const cleaned = stripOrderedPrefix(rawLine).replace(/^#+\s*/, '').trim();
      let hit: number | null = null;
      for (const [num, re] of headingPatterns) {
        if (re.test(cleaned)) {
          hit = num;
          break;
        }
      }
      if (hit != null) {
        flush2();
        cur = hit;
        continue;
      }
      if (cur != null) b.push(rawLine);
    }
    flush2();
    for (const [k, v] of Array.from(headingOnlyMap.entries())) sections.set(k, v);
  }

  const story: ParsedStory = {
    title,
    readRecallQuestions: [],
    thinkInferQuestions: [],
    applyConnectQuestions: [],
    learningObjectives: [],
    passage: '',
    vocabulary: [],
    vocabularyPractice: [],
    questions: [],
    answerHints: [],
  };

  for (const [num, body] of Array.from(sections.entries())) {
    const key = sectionHintMap[num];
    if (!key) continue;
    applyStorySectionBody(story, key, body);
  }

  if (!storyHasContent(story)) return null;
  return story;
}

function parseAllStoriesFromMarkdown(text: string, forcedFormat?: 'teacher' | 'reading'): ParsedStory[] {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return [];

  let blocks = trimmed.split(/(?=^##\s+)/im).filter((b) => b.trim());
  if (blocks.length <= 1 && /^##\s+/im.test(trimmed)) {
    blocks = [trimmed];
  }

  const parsed = blocks
    .map((b) => parseStoryFromMarkdown(b, forcedFormat))
    .filter((s): s is ParsedStory => !!s);

  if (parsed.length) return parsed;

  const single = parseStoryFromMarkdown(trimmed, forcedFormat);
  return single ? [single] : [];
}

function parseFromUnknown(parsed: unknown): ResolvedStoryContent {
  if (!parsed) return { mode: 'empty' };

  if (Array.isArray(parsed)) {
    const stories = parsed
      .map((row, i) =>
        row && typeof row === 'object'
          ? normalizeStoryFromObject(row as Record<string, unknown>, 'Story')
          : null,
      )
      .filter((s): s is ParsedStory => !!s && storyHasContent(s));
    if (stories.length) return { mode: 'stories', stories };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const bundle = parsePassagesBundle(obj);
    if (bundle) return { mode: 'passages', bundle };

    const nested = obj.raw || obj.data || obj.story || obj.item;
    if (nested && typeof nested === 'object') {
      const inner = parseFromUnknown(nested);
      if (inner.mode !== 'empty') return inner;
    }
    if (Array.isArray(obj.stories)) {
      const inner = parseFromUnknown(obj.stories);
      if (inner.mode !== 'empty') return inner;
    }
    if (Array.isArray(obj.items)) {
      const inner = parseFromUnknown(obj.items);
      if (inner.mode !== 'empty') return inner;
    }

    const story = normalizeStoryFromObject(obj);
    if (storyHasContent(story)) {
      return { mode: 'stories', stories: [story] };
    }
  }

  return { mode: 'empty' };
}

function storiesFromText(text: string, forcedFormat?: 'teacher' | 'reading'): ParsedStory[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const fromArr = extractJsonArray(trimmed);
  if (fromArr) {
    const parsed = parseFromUnknown(fromArr);
    if (parsed.mode === 'stories') return parsed.stories;
    if (parsed.mode === 'passages') return [];
  }

  const fromObj = extractJsonObject(trimmed);
  if (fromObj) {
    const parsed = parseFromUnknown(fromObj);
    if (parsed.mode === 'stories') return parsed.stories;
  }

  try {
    const direct = JSON.parse(trimmed);
    const parsed = parseFromUnknown(direct);
    if (parsed.mode === 'stories') return parsed.stories;
  } catch {
    /* markdown */
  }

  return parseAllStoriesFromMarkdown(trimmed, forcedFormat);
}

export function resolveStoryFromPayload(
  content?: string,
  rawContent?: unknown,
  options?: ResolveStoryOptions,
): ResolvedStoryContent {
  const forcedFormat = options?.format;
  let formattedText = String(content || '').trim();
  const rawRecords: Record<string, unknown>[] = [];

  try {
    const parsed = JSON.parse(formattedText) as Record<string, unknown>;
    if (parsed.formatted != null) formattedText = String(parsed.formatted).trim();
    if (!formattedText && parsed.markdown) formattedText = String(parsed.markdown).trim();
    rawRecords.push(...absorbStoryRawRecords(parsed.raw));
    if (!rawRecords.length) rawRecords.push(...absorbStoryRawRecords(parsed));
  } catch {
    /* plain markdown */
  }

  rawRecords.push(...absorbStoryRawRecords(rawContent));

  const fromMd = formattedText ? storiesFromText(formattedText, forcedFormat) : [];
  const fromRecords = rawRecords
    .map((r) => normalizeStoryFromObject(r))
    .filter((s) => storyHasContent(s));

  if (fromRecords.length && fromMd.length) {
    const n = Math.max(fromRecords.length, fromMd.length);
    const stories = Array.from({ length: n }, (_, i) =>
      mergeStory(fromRecords[i] ?? fromRecords[fromRecords.length - 1], fromMd[i] ?? fromMd[fromMd.length - 1]),
    );
    applyStoryFormatToStories(stories, formattedText, forcedFormat);
    return { mode: 'stories', stories };
  }
  if (fromRecords.length) {
    const stories = fromRecords;
    applyStoryFormatToStories(stories, formattedText, forcedFormat);
    return { mode: 'stories', stories };
  }
  if (fromMd.length) {
    applyStoryFormatToStories(fromMd, formattedText, forcedFormat);
    return { mode: 'stories', stories: fromMd };
  }

  return resolveStoryContent(formattedText, rawContent, options);
}

export function resolveStoryContent(
  content?: string,
  rawData?: unknown,
  options?: ResolveStoryOptions,
): ResolvedStoryContent {
  const forcedFormat = options?.format;
  const text = String(content || '').trim();
  const fromRaw = rawData ? parseFromUnknown(rawData) : { mode: 'empty' as const };
  const fromMd = text ? storiesFromText(text, forcedFormat) : [];

  if (fromRaw.mode === 'passages') {
    if (!fromMd.length) return fromRaw;
  }

  if (fromMd.length && fromRaw.mode === 'stories') {
    const n = Math.max(fromMd.length, fromRaw.stories.length);
    const stories = Array.from({ length: n }, (_, i) =>
      mergeStory(
        fromRaw.stories[i] ?? fromRaw.stories[fromRaw.stories.length - 1] ?? emptyStory(),
        fromMd[i] ?? fromMd[fromMd.length - 1] ?? emptyStory(),
      ),
    );
    applyStoryFormatToStories(stories, text, forcedFormat);
    return { mode: 'stories', stories };
  }

  if (fromMd.length) {
    applyStoryFormatToStories(fromMd, text, forcedFormat);
    return { mode: 'stories', stories: fromMd };
  }

  if (fromRaw.mode !== 'empty') {
    if (fromRaw.mode === 'stories') {
      applyStoryFormatToStories(fromRaw.stories, text, forcedFormat);
    }
    return fromRaw;
  }

  if (text.length > 80) {
    return {
      mode: 'stories',
      stories: [
        {
          ...emptyStory('Reading passage'),
          passage: text,
          readRecallQuestions: [],
          thinkInferQuestions: [],
          applyConnectQuestions: [],
        },
      ],
    };
  }

  return { mode: 'empty' };
}
