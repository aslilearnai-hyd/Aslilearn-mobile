/**
 * Parse Concept Mastery Helper content into canonical 12-section concept objects.
 */

export type NormalizedConcept = {
  sl: number;
  conceptName: string;
  difficulty?: string;
  simpleDefinition: string;
  whyImportant: string;
  priorKnowledge: string;
  explanation: string;
  diagramSuggestion: string;
  realLifeExamples: string;
  misconceptions: string[];
  conceptCheckQuestions: string[];
  keyPoints: string[];
  examTips: string;
  hotsQuestion: string;
  reflectionPrompt: string;
};

export type ResolvedConceptMastery = {
  concepts: NormalizedConcept[];
  markdownFallback: string | null;
};

const SECTION_BY_NUMBER: Record<
  number,
  { key: keyof NormalizedConcept; list?: boolean }
> = {
  1: { key: 'simpleDefinition' },
  2: { key: 'whyImportant' },
  3: { key: 'priorKnowledge' },
  4: { key: 'explanation' },
  5: { key: 'diagramSuggestion' },
  6: { key: 'realLifeExamples' },
  7: { key: 'misconceptions', list: true },
  8: { key: 'conceptCheckQuestions', list: true },
  9: { key: 'keyPoints', list: true },
  10: { key: 'examTips' },
  11: { key: 'hotsQuestion' },
  12: { key: 'reflectionPrompt' },
};

const SECTION_TITLE_HINT: Record<number, RegExp> = {
  1: /simple\s+definition/i,
  2: /why\s+this\s+concept|important/i,
  3: /prior\s+knowledge/i,
  4: /step-by-step|explanation/i,
  5: /diagram|visuali[sz]ation/i,
  6: /real[-\s]?life/i,
  7: /misconception|common\s+mistake/i,
  8: /concept\s+check/i,
  9: /key\s+points/i,
  10: /exam\s+tips?/i,
  11: /higher[-\s]?order|hots/i,
  12: /self[-\s]?reflection|reflection\s+prompt|^reflection$/i,
};

/** Stricter match for plain `N. Title` lines so in-section numbered steps are not treated as headers. */
const STRICT_SECTION_TITLE: Record<number, RegExp> = {
  1: /simple\s+definition/i,
  2: /why\s+(?:this\s+)?concept.*important|why.*important/i,
  3: /prior\s+knowledge/i,
  4: /step[\s-]*by[\s-]*step.*explanation/i,
  5: /diagram.*(?:\/|visual)|visuali[sz]ation\s+suggestion/i,
  6: /real[\s-]*life\s+example/i,
  7: /misconception|common\s+mistake/i,
  8: /concept\s+check/i,
  9: /key\s+points?\s+(?:to\s+)?remember|key\s+points?/i,
  10: /exam\s+tips?/i,
  11: /higher[\s-]*order|hots/i,
  12: /(?:self[\s-]*)?reflection\s+prompt|quick\s+self[\s-]*reflection|^reflection$/i,
};

const SECTION_HEADING_MD_RE = /^#{1,4}\s*\*{0,2}(\d{1,2})\.\s*(.+?)\*{0,2}\s*$/i;
const SECTION_HEADING_BOLD_RE = /^\*{1,2}(\d{1,2})\.\s*(.+?)\*{1,2}\s*$/i;
const SECTION_PLAIN_RE = /^(\d{1,2})\.\s+(.+?)\s*$/i;

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coalesceLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => stripOrderedPrefix(String(x ?? ''))).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v.split(/\n+/).map(stripOrderedPrefix).filter(Boolean);
  }
  return [];
}

function coalesceText(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => coalesceText(x)).filter(Boolean).join('\n');
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return coalesceText(o.text ?? o.content ?? o.body ?? o.prompt ?? o.value ?? o.markdown);
  }
  return String(v ?? '').trim();
}

function stripHtmlBasic(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  for (const [num, hint] of Object.entries(SECTION_TITLE_HINT)) {
    if (hint.test(t)) return Number(num);
  }
  return null;
}

/** True when a numbered line is a canonical template section heading (not an in-section sub-step). */
function isLikelyFullSectionTitle(
  n: number,
  title: string,
  opts?: { plainLine?: boolean },
): boolean {
  const t = String(title || '')
    .replace(/[:–—-]\s*$/g, '')
    .trim();
  if (!t || t.length > 120) return false;

  const byTitle = sectionNumFromTitle(t);
  if (byTitle != null && byTitle !== n) return false;

  const hint = SECTION_TITLE_HINT[n];
  if (!hint?.test(t)) return false;

  if (opts?.plainLine) {
    const strict = STRICT_SECTION_TITLE[n];
    if (!strict?.test(t)) return false;
  }

  const words = t.split(/\s+/).filter(Boolean);
  if (n === 4) {
    return /step[\s-]*by[\s-]*step/i.test(t) && /explanation|procedure/i.test(t);
  }
  if (n === 12) {
    return /reflection/i.test(t);
  }
  return words.length >= 2 || t.length >= 14;
}

function mapHeadingToSection(n: number, title: string): number | null {
  const cleanTitle = String(title || '').trim();
  if (n >= 1 && n <= 12) {
    if (!cleanTitle) return n;
    if (isLikelyFullSectionTitle(n, cleanTitle)) return n;
    return sectionNumFromTitle(cleanTitle);
  }
  return sectionNumFromTitle(cleanTitle);
}

function templateSectionNumberFromLine(line: string): number | null {
  const trimmed = line.trim();
  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) {
    const mapped = mapHeadingToSection(Number(m[1]), m[2]);
    if (mapped != null) return mapped;
  }
  m = trimmed.match(SECTION_HEADING_BOLD_RE);
  if (m) {
    const mapped = mapHeadingToSection(Number(m[1]), m[2]);
    if (mapped != null) return mapped;
  }
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) {
    const n = Number(m[1]);
    const titlePart = String(m[2] || '').trim();
    // Subtopic lines like "1.1 What Makes Science Different" are not section headers
    if (/^\d/.test(titlePart)) return null;
    if (n >= 1 && n <= 12 && isLikelyFullSectionTitle(n, titlePart, { plainLine: true })) return n;
  }
  return null;
}

function lineIsTemplateSectionHeader(line: string): boolean {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  const num = templateSectionNumberFromLine(trimmed);
  return num != null;
}

function countCanonicalSectionHeaders(text: string): number {
  let count = 0;
  for (const line of text.split('\n')) {
    if (templateSectionNumberFromLine(line.trim()) != null) count += 1;
  }
  return count;
}

function extractDocumentTitle(text: string): string {
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t === '---' || /^CONTENT\s*:?/i.test(t)) continue;
    if (templateSectionNumberFromLine(t) != null) continue;
    if (/^concept\s+mastery/i.test(t)) continue;
    const cleaned = t
      .replace(/^#+\s*/, '')
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^[-*•]\s*/, '')
      .trim();
    if (cleaned.length >= 3 && cleaned.length <= 200) return cleaned;
  }
  return '';
}

function conceptNameLooksLikeSectionTitle(name: string): boolean {
  return sectionNumFromTitle(name) != null;
}

/** Parse one sub-topic document that contains sections 1–12 in a single block. */
export function parseSingleConceptDocument(content: string, defaultName = 'Concept'): NormalizedConcept | null {
  const text = String(content || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text || countCanonicalSectionHeaders(text) < 1) return null;
  const title = extractDocumentTitle(text) || defaultName;
  const concept = parseConceptMarkdownBlock(text, title, 0);
  return conceptHasVisibleContent(concept) ? concept : null;
}

/** Remove duplicate section headings and stray markdown-only lines from section bodies. */
function cleanSectionProse(text: string): string {
  const lines = String(text || '').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed === '**' || trimmed === '*' || trimmed === '---') continue;
    if (trimmed && lineIsTemplateSectionHeader(trimmed)) continue;
    out.push(raw);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function linesToList(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => {
      let t = line.trim();
      t = t.replace(/^[-•]\s+/, '');
      t = t.replace(/^\*\s+/, '');
      t = t.replace(/^\d+\)\s+/, '');
      return t;
    })
    .filter(Boolean);
}

function polishNormalizedConcept(c: NormalizedConcept): NormalizedConcept {
  return {
    ...c,
    simpleDefinition: cleanSectionProse(c.simpleDefinition),
    whyImportant: cleanSectionProse(c.whyImportant),
    priorKnowledge: cleanSectionProse(c.priorKnowledge),
    explanation: cleanSectionProse(c.explanation),
    diagramSuggestion: cleanSectionProse(c.diagramSuggestion),
    realLifeExamples: cleanSectionProse(c.realLifeExamples),
    misconceptions: c.misconceptions.map((x) => cleanSectionProse(x)).filter(Boolean),
    conceptCheckQuestions: c.conceptCheckQuestions.map((x) => cleanSectionProse(x)).filter(Boolean),
    keyPoints: c.keyPoints.map((x) => cleanSectionProse(x)).filter(Boolean),
    examTips: cleanSectionProse(c.examTips),
    hotsQuestion: cleanSectionProse(c.hotsQuestion),
    reflectionPrompt: cleanSectionProse(c.reflectionPrompt),
  };
}

function assignSectionBody(concept: Partial<NormalizedConcept>, sectionNum: number, body: string) {
  const def = SECTION_BY_NUMBER[sectionNum];
  if (!def || !body.trim()) return;
  const trimmed = cleanSectionProse(body.replace(/\n{2,}/g, '\n').trim());
  if (!trimmed) return;

  const record = concept as Record<string, unknown>;
  if (def.list) {
    const next = linesToList(trimmed);
    const existing = Array.isArray(record[def.key]) ? (record[def.key] as string[]) : [];
    record[def.key] = next.length >= existing.length ? next : existing;
  } else {
    const existing = String(record[def.key] || '').trim();
    record[def.key] = trimmed.length >= existing.length ? trimmed : existing;
  }
}

function splitNumberedSections(block: string): Map<number, string> {
  const map = new Map<number, string>();
  const lines = block.split('\n');
  let currentNum: number | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (currentNum != null && buf.length) {
      const body = cleanSectionProse(buf.join('\n').trim());
      if (body) {
        const prev = map.get(currentNum) || '';
        map.set(currentNum, prev ? `${prev}\n\n${body}` : body);
      }
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const sectionNum = templateSectionNumberFromLine(line);
    if (sectionNum != null) {
      flush();
      currentNum = sectionNum;
      continue;
    }
    if (currentNum != null) buf.push(line);
  }
  flush();
  return map;
}

function extractMarkdownH2Section(body: string, title: string): string | undefined {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\n)##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const m = body.match(re);
  return m ? m[1].trim() : undefined;
}

/** Match ### 1. Simple Definition (template persistence format). */
function extractMarkdownH3NumberedSection(body: string, sectionNum: number): string | undefined {
  const hint = SECTION_TITLE_HINT[sectionNum];
  if (!hint) return undefined;
  const lines = body.split('\n');
  let capturing = false;
  const buf: string[] = [];

  const flush = (): string | undefined => {
    const text = buf.join('\n').trim();
    buf.length = 0;
    return text || undefined;
  };

  for (const line of lines) {
    const sectionOnLine = templateSectionNumberFromLine(line);
    if (sectionOnLine != null) {
      if (capturing) return flush();
      if (sectionOnLine === sectionNum) {
        capturing = true;
        continue;
      }
      capturing = false;
      continue;
    }
    if (capturing) buf.push(line);
  }
  return capturing ? flush() : undefined;
}

function looksLikeJsonText(text: string): boolean {
  const t = String(text || '').trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

function isGenericConceptName(name: string): boolean {
  return /^concept\s*\d*$/i.test(String(name || '').trim());
}

/** Map camelCase, aliases, and nested section rows onto canonical snake_case keys. */
function expandRawConceptRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const r = { ...raw };

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = r[k];
      if (v == null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === 'string' && !v.trim()) continue;
      return v;
    }
    return undefined;
  };

  r.concept_name =
    pick('concept_name', 'conceptName', 'title', 'name', 'topic', 'concept_title') || r.concept_name;
  r.simple_definition = pick(
    'simple_definition',
    'simpleDefinition',
    'definition',
    'simple_explanation',
    'intro',
  );
  r.why_important = pick('why_important', 'whyImportant', 'importance', 'relevance');
  r.prior_knowledge_needed = pick(
    'prior_knowledge_needed',
    'priorKnowledgeNeeded',
    'prior_knowledge',
    'priorKnowledge',
    'prerequisites',
  );
  r.lesson = pick(
    'lesson',
    'explanation',
    'step_by_step_explanation',
    'stepByStepExplanation',
    'content',
    'body',
    'text',
    'summary',
  );
  r.diagram_suggestion = pick(
    'diagram_suggestion',
    'diagramSuggestion',
    'visualisation',
    'visualization',
    'diagram',
  );
  r.real_example = pick(
    'real_example',
    'realExample',
    'real_life_examples',
    'realLifeExamples',
    'examples',
    'example',
  );
  r.common_mistakes = pick('common_mistakes', 'commonMistakes', 'misconceptions', 'mistakes');
  r.concept_check_questions = pick(
    'concept_check_questions',
    'conceptCheckQuestions',
    'check_questions',
    'practice_questions',
  );
  r.key_points = pick('key_points', 'keyPoints', 'takeaways', 'highlights');
  r.exam_tips = pick('exam_tips', 'examTips', 'exam_tip');
  r.hots_question = pick('hots_question', 'hotsQuestion', 'higher_order_question', 'hots');
  r.self_reflection_prompt = pick(
    'self_reflection_prompt',
    'selfReflectionPrompt',
    'quick_self_reflection_prompt',
    'quickSelfReflectionPrompt',
    'reflection_prompt',
    'reflectionPrompt',
    'self_reflection',
    'selfReflection',
    'reflection_question',
    'reflectionQuestion',
    'exit_ticket',
    'exitTicket',
    'self_check',
    'selfCheck',
    'reflection',
  );

  const universalBlocks = r.universal_blocks ?? r.universalBlocks;
  if (universalBlocks && typeof universalBlocks === 'object' && !r.self_reflection_prompt) {
    const ub = universalBlocks as Record<string, unknown>;
    const reflectionBlock = coalesceText(
      ub.reflection ?? ub.Reflection ?? ub.exit_ticket ?? ub.exitTicket,
    );
    if (reflectionBlock) r.self_reflection_prompt = reflectionBlock;
  }

  const sections = r.sections;
  if (Array.isArray(sections)) {
    const draft: Partial<NormalizedConcept> = {};
    for (const sec of sections) {
      if (!sec || typeof sec !== 'object') continue;
      const s = sec as Record<string, unknown>;
      const label = String(s.label || s.title || s.name || s.id || '').trim();
      let num = Number(s.order ?? s.section_number ?? s.num);
      if (!Number.isFinite(num) || num < 1 || num > 12) {
        num = sectionNumFromTitle(label) ?? sectionNumFromTitle(String(s.id || '')) ?? 0;
      }
      const body = coalesceText(s.content || s.body || s.text || s.value);
      if (num >= 1 && num <= 12 && body) assignSectionBody(draft, num, body);
    }
    if (draft.simpleDefinition && !r.simple_definition) r.simple_definition = draft.simpleDefinition;
    if (draft.whyImportant && !r.why_important) r.why_important = draft.whyImportant;
    if (draft.priorKnowledge && !r.prior_knowledge_needed) {
      r.prior_knowledge_needed = draft.priorKnowledge;
    }
    if (draft.explanation && !r.lesson) r.lesson = draft.explanation;
    if (draft.diagramSuggestion && !r.diagram_suggestion) r.diagram_suggestion = draft.diagramSuggestion;
    if (draft.realLifeExamples && !r.real_example) r.real_example = draft.realLifeExamples;
    if (draft.misconceptions?.length && !r.common_mistakes) r.common_mistakes = draft.misconceptions;
    if (draft.conceptCheckQuestions?.length && !r.concept_check_questions) {
      r.concept_check_questions = draft.conceptCheckQuestions;
    }
    if (draft.keyPoints?.length && !r.key_points) r.key_points = draft.keyPoints;
    if (draft.examTips && !r.exam_tips) r.exam_tips = draft.examTips;
    if (draft.hotsQuestion && !r.hots_question) r.hots_question = draft.hotsQuestion;
    if (draft.reflectionPrompt && !r.self_reflection_prompt) {
      r.self_reflection_prompt = draft.reflectionPrompt;
    }
  }

  return r;
}

function pickEmbeddedMarkdownBlob(raw: Record<string, unknown>): string {
  for (const key of ['formatted', 'markdown', 'content', 'body', 'text', 'lesson', 'html']) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim().length > 60) return v.trim();
  }
  return '';
}

export function normalizeConcept(raw: Record<string, unknown>, idx: number): NormalizedConcept {
  const r = expandRawConceptRecord(raw || {});
  return {
    sl: Number(r.sl_no ?? r.slNo) || idx + 1,
    conceptName: String(r.concept_name || r.title || r.name || `Concept ${idx + 1}`).trim(),
    difficulty: String(r.difficulty || '').trim() || undefined,
    simpleDefinition: coalesceText(r.simple_definition || r.definition),
    whyImportant: coalesceText(r.why_important || r.importance),
    priorKnowledge: coalesceText(r.prior_knowledge_needed || r.prior_knowledge),
    explanation: coalesceText(
      r.lesson || r.explanation || r.step_by_step_explanation || r.content || r.body,
    ),
    diagramSuggestion: coalesceText(r.diagram_suggestion || r.visualisation || r.visualization),
    realLifeExamples: coalesceText(r.real_example || r.real_life_examples || r.examples),
    misconceptions: coalesceLines(r.common_mistakes || r.misconceptions),
    conceptCheckQuestions: coalesceLines(
      r.concept_check_questions || r.check_questions || r.practice_questions,
    ),
    keyPoints: coalesceLines(r.key_points || r.keyPoints),
    examTips: coalesceText(r.exam_tips || r.exam_tip),
    hotsQuestion: coalesceText(r.hots_question || r.higher_order_question || r.hots),
    reflectionPrompt: coalesceText(
      r.self_reflection_prompt || r.reflection_prompt || r.reflection,
    ),
  };
}

/** Parse one API/PDF row — expands aliases, embedded markdown, and numbered sections. */
function materializeConceptFromRaw(raw: Record<string, unknown>, idx: number): NormalizedConcept {
  const expanded = expandRawConceptRecord(raw);
  const name = String(
    expanded.concept_name || expanded.title || expanded.name || `Concept ${idx + 1}`,
  ).trim();
  let base = normalizeConcept(expanded, idx);

  const embedded = pickEmbeddedMarkdownBlob(expanded);
  if (embedded && !conceptHasVisibleContent(base)) {
    if (embedded.includes('__CONCEPT_CARD_START__')) {
      const card = parseConceptFromHtmlCard(embedded, idx);
      if (card) base = mergeConcept(base, card, idx);
    } else {
      const parsed = parseConceptMarkdownBlock(embedded, name, idx);
      base = mergeConcept(base, parsed, idx);
    }
  }

  if (!conceptHasVisibleContent(base)) {
    const partial: Partial<NormalizedConcept> = { conceptName: name };
    for (let n = 1; n <= 12; n += 1) {
      const body = extractMarkdownH3NumberedSection(embedded || '', n);
      if (body) assignSectionBody(partial, n, body);
    }
    const h2Enriched = enrichFromGeminiMarkdown(embedded || '', partial);
    base = mergeConcept(base, normalizeConcept(h2Enriched as Record<string, unknown>, idx), idx);
  }

  return polishNormalizedConcept(base);
}

function enrichFromGeminiMarkdown(
  conceptContent: string,
  base: Partial<NormalizedConcept>,
): Partial<NormalizedConcept> {
  const out = { ...base };

  const sectionMap = splitNumberedSections(conceptContent);
  for (const [num, body] of Array.from(sectionMap.entries())) {
    assignSectionBody(out, num, body);
  }

  if (!out.simpleDefinition) {
    out.simpleDefinition = extractMarkdownH2Section(conceptContent, 'Simple Definition');
  }
  if (!out.whyImportant) {
    out.whyImportant = extractMarkdownH2Section(conceptContent, 'Why This Concept Is Important');
  }
  if (!out.priorKnowledge) {
    out.priorKnowledge = extractMarkdownH2Section(conceptContent, 'Prior Knowledge Needed');
  }
  if (!out.explanation) {
    const overview = extractMarkdownH2Section(conceptContent, 'Concept Overview');
    const steps = extractMarkdownH2Section(conceptContent, 'Step-by-Step Explanation');
    const keyComp = extractMarkdownH2Section(conceptContent, 'Key Components Breakdown');
    const parts = [overview, keyComp, steps].filter(Boolean);
    if (parts.length) out.explanation = parts.join('\n\n');
    const legacy = conceptContent.match(/\*\*Explanation:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*|$)/);
    if (!out.explanation && legacy) out.explanation = legacy[1].trim();
  }
  if (!out.diagramSuggestion) {
    out.diagramSuggestion = extractMarkdownH2Section(conceptContent, 'Diagram / Visualisation Suggestion');
  }
  if (!out.realLifeExamples) {
    out.realLifeExamples =
      extractMarkdownH2Section(conceptContent, 'Real-World Examples') ||
      extractMarkdownH2Section(conceptContent, 'Real-World Example') ||
      extractMarkdownH2Section(conceptContent, 'Real-life Examples');
    const legacy = conceptContent.match(/\*\*Real-world Example:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*|$)/);
    if (!out.realLifeExamples && legacy) out.realLifeExamples = legacy[1].trim();
  }
  if (!out.misconceptions?.length) {
    const mis = extractMarkdownH2Section(conceptContent, 'Common Misconceptions and Corrections');
    if (mis) out.misconceptions = linesToList(mis);
  }
  if (!out.conceptCheckQuestions?.length) {
    const ccq = extractMarkdownH2Section(conceptContent, 'Concept Check Questions');
    if (ccq) out.conceptCheckQuestions = linesToList(ccq);
  }
  if (!out.keyPoints?.length) {
    const kp = extractMarkdownH2Section(conceptContent, 'Key Points to Remember');
    if (kp) out.keyPoints = linesToList(kp);
    const summary = extractMarkdownH2Section(conceptContent, 'Summary and Key Takeaways');
    if (!out.keyPoints?.length && summary) {
      out.keyPoints = linesToList(summary);
    }
    const legacy = conceptContent.match(/\*\*Key Points:\*\*\s*\n((?:- .+\n?)+)/);
    if (!out.keyPoints?.length && legacy) {
      out.keyPoints = linesToList(legacy[1]);
    }
  }
  if (!out.examTips) {
    out.examTips = extractMarkdownH2Section(conceptContent, 'Exam Tips');
  }
  if (!out.hotsQuestion) {
    out.hotsQuestion = extractMarkdownH2Section(conceptContent, 'Higher-order Thinking Question');
  }
  if (!out.reflectionPrompt) {
    out.reflectionPrompt = extractMarkdownH2Section(conceptContent, 'Quick Self-reflection Prompt');
  }
  if (!out.reflectionPrompt) {
    out.reflectionPrompt = extractMarkdownH3NumberedSection(conceptContent, 12);
  }
  if (!out.reflectionPrompt) {
    const reflectionBlock = conceptContent.match(
      /(?:^|\n)(?:#{1,4}\s*)?(?:\d{1,2}\.\s*)?(?:\*\*)?(?:Quick\s+)?Self[-\s]?reflection(?:\s+Prompt)?(?:\*\*)?:?\s*\n+([\s\S]*?)(?=\n#{1,4}\s|\n\d{1,2}\.\s+(?:Simple|Why|Prior|Step|Diagram|Real|Common|Concept|Key|Exam|Higher|Quick)|$)/i,
    );
    if (reflectionBlock) out.reflectionPrompt = reflectionBlock[1].trim();
  }
  if (!out.reflectionPrompt) {
    const inlineReflection = conceptContent.match(
      /(?:^|\n)(?:#{1,4}\s*)?(?:\*\*)?12\.\s*Quick\s+Self[-\s]?reflection\s+Prompt(?:\*\*)?:?\s*(.+)$/im,
    );
    if (inlineReflection) out.reflectionPrompt = inlineReflection[1].trim();
  }

  return out;
}

function fillMissingSectionsFromDocument(
  conceptContent: string,
  draft: Partial<NormalizedConcept>,
): void {
  for (let n = 1; n <= 12; n += 1) {
    const body = extractMarkdownH3NumberedSection(conceptContent, n);
    if (body) assignSectionBody(draft, n, body);
  }
}

/** Backfill any empty canonical sections from markdown / numbered headings. */
export function fillConceptGapsFromMarkdown(
  concept: NormalizedConcept,
  markdown: string,
): NormalizedConcept {
  const text = String(markdown || '').trim();
  if (!text) return concept;

  const draft: Partial<NormalizedConcept> = { ...concept };
  for (const [num, body] of splitNumberedSections(text).entries()) {
    assignSectionBody(draft, num, body);
  }
  fillMissingSectionsFromDocument(text, draft);
  enrichFromGeminiMarkdown(text, draft);

  let merged = mergeConcept(concept, draft as NormalizedConcept, (concept.sl || 1) - 1);
  const doc = parseSingleConceptDocument(text);
  if (doc) merged = mergeConcept(merged, doc, (concept.sl || 1) - 1);
  return polishNormalizedConcept(merged);
}

function mergeConcept(base: NormalizedConcept, patch: Partial<NormalizedConcept>, idx: number): NormalizedConcept {
  const pickText = (a: string, b: string) => {
    const aa = a.trim();
    const bb = b.trim();
    return aa.length >= bb.length ? aa : bb;
  };
  const pickList = (a: string[], b: string[]) => (a.length >= b.length ? a : b);

  return {
    sl: patch.sl ?? base.sl ?? idx + 1,
    conceptName: pickText(patch.conceptName || '', base.conceptName),
    difficulty: patch.difficulty || base.difficulty,
    simpleDefinition: pickText(patch.simpleDefinition || '', base.simpleDefinition),
    whyImportant: pickText(patch.whyImportant || '', base.whyImportant),
    priorKnowledge: pickText(patch.priorKnowledge || '', base.priorKnowledge),
    explanation: pickText(patch.explanation || '', base.explanation),
    diagramSuggestion: pickText(patch.diagramSuggestion || '', base.diagramSuggestion),
    realLifeExamples: pickText(patch.realLifeExamples || '', base.realLifeExamples),
    misconceptions: pickList(patch.misconceptions || [], base.misconceptions),
    conceptCheckQuestions: pickList(patch.conceptCheckQuestions || [], base.conceptCheckQuestions),
    keyPoints: pickList(patch.keyPoints || [], base.keyPoints),
    examTips: pickText(patch.examTips || '', base.examTips),
    hotsQuestion: pickText(patch.hotsQuestion || '', base.hotsQuestion),
    reflectionPrompt: pickText(patch.reflectionPrompt || '', base.reflectionPrompt),
  };
}

function parseConceptFromHtmlCard(cardContent: string, idx: number): NormalizedConcept | null {
  const conceptMatch = cardContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const conceptName = conceptMatch
    ? conceptMatch[1].replace(/📚\s*/g, '').replace(/<[^>]+>/g, '').trim()
    : '';
  if (!conceptName) return null;

  const difficultyMatch = cardContent.match(/<span[^>]*>(EASY|MEDIUM|HARD)<\/span>/i);
  const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : undefined;

  let explanation: string | undefined;
  const lessonBlock = cardContent.match(/<h3[^>]*>Lesson Explanation<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/i);
  if (lessonBlock) explanation = stripHtmlBasic(lessonBlock[1]);

  let realLifeExamples: string | undefined;
  const exampleBlock = cardContent.match(/<h3[^>]*>Real-world Example<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/i);
  if (exampleBlock) realLifeExamples = stripHtmlBasic(exampleBlock[1]);

  let reflectionPrompt: string | undefined;
  const reflectionBlock = cardContent.match(
    /<h3[^>]*>(?:Quick\s+)?Self[-\s]?reflection(?:\s+Prompt)?<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/i,
  );
  if (reflectionBlock) reflectionPrompt = stripHtmlBasic(reflectionBlock[1]);

  const keyPoints: string[] = [];
  const pointsSection = cardContent.match(/<h3[^>]*>Key Points<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (pointsSection) {
    const pointsContent = pointsSection[1];
    const pointMatches = Array.from(pointsContent.matchAll(/<span[^>]*>(.*?)<\/span>/g));
    for (const pointMatch of pointMatches) {
      const point = stripHtmlBasic(pointMatch[1]);
      if (point && !/^\d+$/.test(point)) keyPoints.push(point);
    }
    if (!keyPoints.length) {
      const liMatches = Array.from(pointsContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
      for (const li of liMatches) {
        const text = stripHtmlBasic(li[1]);
        if (text) keyPoints.push(text);
      }
    }
  }

  return normalizeConcept(
    {
      concept_name: conceptName,
      difficulty,
      lesson: explanation,
      real_example: realLifeExamples,
      key_points: keyPoints,
      self_reflection_prompt: reflectionPrompt,
    },
    idx,
  );
}

function parseConceptMarkdownBlock(conceptContent: string, conceptName: string, idx: number): NormalizedConcept {
  const difficultyMatch = conceptContent.match(/\*\*Difficulty:\*\*\s*(.*?)\n/i);
  const difficulty = difficultyMatch ? difficultyMatch[1].trim().toLowerCase() : undefined;

  const partial: Partial<NormalizedConcept> = {
    conceptName,
    difficulty,
  };

  const sectionMap = splitNumberedSections(conceptContent);
  const draft: Partial<NormalizedConcept> = { ...partial };
  for (const [num, body] of Array.from(sectionMap.entries())) {
    assignSectionBody(draft, num, body);
  }

  fillMissingSectionsFromDocument(conceptContent, draft);
  const enriched = enrichFromGeminiMarkdown(conceptContent, draft);
  fillMissingSectionsFromDocument(conceptContent, enriched);
  const normalized = normalizeConcept(enriched as Record<string, unknown>, idx);
  return polishNormalizedConcept({
    ...normalized,
    conceptName: normalized.conceptName || conceptName,
    difficulty: normalized.difficulty || difficulty,
  });
}

export function parseConceptsFromMarkdown(content: string): NormalizedConcept[] {
  const text = String(content || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  const concepts: NormalizedConcept[] = [];

  const cardRegex = /__CONCEPT_CARD_START__\r?\n([\s\S]*?)\r?\n__CONCEPT_CARD_END__/g;
  const cardMatches = Array.from(text.matchAll(cardRegex));
  for (let i = 0; i < cardMatches.length; i++) {
    const cardBody = cardMatches[i][1];
    const parsed = parseConceptFromHtmlCard(cardBody, i);
    if (!parsed) continue;
    const plain = stripHtmlBasic(cardBody);
    const fromText = plain.length > 40 ? parseConceptMarkdownBlock(plain, parsed.conceptName, i) : parsed;
    concepts.push(mergeConcept(parsed, fromText, i));
  }
  if (concepts.length) return concepts;

  if (countCanonicalSectionHeaders(text) >= 2) {
    const single = parseSingleConceptDocument(text);
    if (single) return [single];
  }

  let blocks = text.split(/(?=^##\s+(?!#))/im).filter((b) => b.trim());
  const conceptLevelBlocks = blocks.filter((b) => {
    const h = b.match(/^##\s+(.+?)(?:\n|$)/m);
    if (!h) return false;
    const title = h[1].replace(/^\d+\.\s*/, '').trim();
    return title && !/^concept\s+mastery/i.test(title) && !SECTION_TITLE_HINT[1]?.test(title);
  });
  if (conceptLevelBlocks.length > 1) {
    blocks = conceptLevelBlocks;
  } else if (blocks.length <= 1) {
    blocks = text.split(/(?=^###\s+\d+\.\s)/im).filter((b) => b.trim());
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    const h2 = block.match(/^##\s+(.+?)(?:\n|$)/m);
    const h3 = block.match(/^###\s*(?:\d+\.\s*)?(.+?)(?:\n|$)/m);
    const name = (h2 ? h2[1] : h3 ? h3[1] : '').replace(/^\d+\.\s*/, '').trim();
    if (!name || /^concept\s+mastery/i.test(name)) continue;
    concepts.push(parseConceptMarkdownBlock(block, name, i));
  }

  if (!concepts.length && /^###\s/m.test(text)) {
    const headerRegex = /(?:^|\n)###\s*(?:\d+\.\s*)?([^\n]+)\n/g;
    const matches = Array.from(text.matchAll(headerRegex));
    matches.forEach((match, index) => {
      const conceptName = match[1].trim();
      const startIndex = match.index ?? 0;
      const nextMatch = matches[index + 1];
      const endIndex = nextMatch ? (nextMatch.index ?? text.length) : text.length;
      const conceptContent = text.substring(startIndex, endIndex);
      concepts.push(parseConceptMarkdownBlock(conceptContent, conceptName, index));
    });
  }

  if (concepts.length >= 2) {
    const sectionShims = concepts.filter((c) => conceptNameLooksLikeSectionTitle(c.conceptName)).length;
    if (sectionShims >= 2) {
      const single = parseSingleConceptDocument(text);
      if (single) return [single];
    }
  }

  if (concepts.length === 1 && !conceptHasVisibleContent(concepts[0])) {
    const single = parseSingleConceptDocument(text);
    if (single) return [single];
  }

  return concepts;
}

export function conceptHasVisibleContent(c: NormalizedConcept): boolean {
  return (
    !!c.simpleDefinition ||
    !!c.whyImportant ||
    !!c.priorKnowledge ||
    !!c.explanation ||
    !!c.diagramSuggestion ||
    !!c.realLifeExamples ||
    c.misconceptions.length > 0 ||
    c.conceptCheckQuestions.length > 0 ||
    c.keyPoints.length > 0 ||
    !!c.examTips ||
    !!c.hotsQuestion ||
    !!c.reflectionPrompt
  );
}

/** Pull concept records out of any raw shape the backend may send. */
function absorbRawRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  // Plain array of concept objects
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  // { concepts: [...] }
  if (Array.isArray(o.concepts)) return o.concepts.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  // { raw: { concepts: [...] } }
  if (o.raw && typeof o.raw === 'object') {
    const inner = o.raw as Record<string, unknown>;
    if (Array.isArray(inner.concepts)) return inner.concepts.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
    if (inner.concept_name || inner.lesson) return [inner];
  }
  if (o.structuredContent && typeof o.structuredContent === 'object') {
    return absorbRawRecords(o.structuredContent);
  }
  if (o.data && typeof o.data === 'object') {
    return absorbRawRecords(o.data);
  }
  // Single concept object
  if (o.concept_name || o.lesson || o.simple_definition || o.explanation) return [o];
  return [];
}

export function resolveConceptsFromPayload(
  content?: string,
  rawContent?: unknown,
): ResolvedConceptMastery {
  let formattedText = String(content || '').trim();
  const rawRecords: Record<string, unknown>[] = [];

  // content may be JSON.stringify({formatted, raw}) as set by the teacher tools page
  try {
    const parsed = JSON.parse(formattedText) as Record<string, unknown>;
    if (parsed.formatted != null) formattedText = String(parsed.formatted).trim();
    if (!formattedText && parsed.markdown) formattedText = String(parsed.markdown).trim();
    // raw inside the envelope
    rawRecords.push(...absorbRawRecords(parsed.raw));
    // The envelope itself might directly hold concepts
    if (!rawRecords.length) rawRecords.push(...absorbRawRecords(parsed));
  } catch {
    // not JSON — formattedText stays as-is
  }

  // Also try to parse formattedText itself as JSON (e.g. direct AI output stored as JSON string)
  if (!rawRecords.length) {
    try {
      const inner = JSON.parse(formattedText) as unknown;
      rawRecords.push(...absorbRawRecords(inner));
    } catch { /* not JSON */ }
  }

  // Explicit rawContent from the API response
  rawRecords.push(...absorbRawRecords(rawContent));

  // Deduplicate by index — rawContent duplicates often come from both paths above
  const seen = new Set<string>();
  const uniqueRecords = rawRecords.filter((r) => {
    const key = String(r.concept_name || r.title || r.name || '').toLowerCase().trim() || JSON.stringify(r).slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // When the stored "formatted" field is JSON (not rendered markdown), build markdown for parsing
  if (looksLikeJsonText(formattedText)) {
    try {
      const jsonMd = absorbRawRecords(JSON.parse(formattedText));
      if (jsonMd.length && !uniqueRecords.length) uniqueRecords.push(...jsonMd);
    } catch {
      /* ignore */
    }
    if (uniqueRecords.length) {
      formattedText = buildConceptDeckMarkdown(uniqueRecords);
    }
  }

  const fromMd = formattedText && !looksLikeJsonText(formattedText)
    ? parseConceptsFromMarkdown(formattedText)
    : formattedText
      ? parseConceptsFromMarkdown(formattedText)
      : [];
  const fromRaw = uniqueRecords.map((r, i) => materializeConceptFromRaw(r, i));

  const mergePair = (rawC: NormalizedConcept, mdC: NormalizedConcept, i: number): NormalizedConcept => {
    const rawRich = conceptHasVisibleContent(rawC);
    const mdRich = conceptHasVisibleContent(mdC);
    if (!rawRich && mdRich) return { ...mdC, sl: mdC.sl || i + 1 };
    if (rawRich && !mdRich) return { ...rawC, sl: rawC.sl || i + 1 };
    return mergeConcept(rawC, mdC, i);
  };

  let concepts: NormalizedConcept[] = [];
  if (fromRaw.length && fromMd.length) {
    const n = Math.max(fromRaw.length, fromMd.length);
    concepts = Array.from({ length: n }, (_, i) =>
      mergePair(
        fromRaw[i] ?? fromRaw[fromRaw.length - 1],
        fromMd[i] ?? fromMd[fromMd.length - 1],
        i,
      ),
    );
  } else if (fromRaw.length) {
    concepts = fromRaw;
  } else if (fromMd.length) {
    concepts = fromMd;
  }

  // One full markdown concept + many title-only PDF rows → show the real concept once
  if (
    fromMd.length === 1 &&
    conceptHasVisibleContent(fromMd[0]) &&
    concepts.length > 1 &&
    concepts.filter(conceptHasVisibleContent).length <= 1
  ) {
    const primary = mergePair(concepts[0], fromMd[0], 0);
    if (conceptHasVisibleContent(primary)) {
      concepts = [primary];
    }
  }

  // Drop title-only stubs when we also have richer concepts from markdown
  const richCount = concepts.filter(conceptHasVisibleContent).length;
  if (richCount > 0 && richCount < concepts.length) {
    const rich = concepts.filter(conceptHasVisibleContent);
    const stubs = concepts.filter((c) => !conceptHasVisibleContent(c));
    if (stubs.every((c) => isGenericConceptName(c.conceptName))) {
      concepts = rich;
    }
  }

  const displayMarkdown =
    formattedText && !looksLikeJsonText(formattedText) ? formattedText : null;

  if (displayMarkdown && !concepts.some(conceptHasVisibleContent)) {
    const doc = parseSingleConceptDocument(displayMarkdown);
    if (doc) concepts = [doc];
  }

  if (displayMarkdown && concepts.length >= 2) {
    const sectionShims = concepts.filter((c) => conceptNameLooksLikeSectionTitle(c.conceptName)).length;
    if (sectionShims >= 2) {
      const doc = parseSingleConceptDocument(displayMarkdown);
      if (doc) concepts = [doc];
    }
  }

  let markdownFallback: string | null = null;
  if (!concepts.length && displayMarkdown) {
    markdownFallback = displayMarkdown;
  } else if (concepts.length && !concepts.some(conceptHasVisibleContent) && displayMarkdown) {
    markdownFallback = displayMarkdown;
  }

  if (displayMarkdown && concepts.length) {
    const mdBlocks = parseConceptsFromMarkdown(displayMarkdown);
    concepts = concepts.map((c, i) => {
      const nameKey = c.conceptName.toLowerCase().trim();
      const mdMatch =
        mdBlocks.find((m) => m.conceptName.toLowerCase().trim() === nameKey) ||
        mdBlocks[i];
      let filled = mdMatch ? mergeConcept(c, mdMatch, i) : c;
      const blockMd = mdMatch
        ? displayMarkdown.includes(`## ${mdMatch.conceptName}`)
          ? displayMarkdown.split(/(?=^##\s+)/m).find((b) => b.includes(mdMatch.conceptName)) || displayMarkdown
          : displayMarkdown
        : displayMarkdown;
      filled = fillConceptGapsFromMarkdown(filled, blockMd);
      return filled;
    });
  }

  return { concepts, markdownFallback };
}

/** Rebuild template markdown (## concept + ### sections) so section parsers can run. */
function buildConceptDeckMarkdown(records: Record<string, unknown>[]): string {
  const blocks: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const c = materializeConceptFromRaw(records[i], i);
    if (!conceptHasVisibleContent(c)) continue;
    const lines: string[] = [`## ${c.conceptName}`, ''];
    const sections: { title: string; body: string | string[] }[] = [
      { title: '1. Simple Definition', body: c.simpleDefinition },
      { title: '2. Why This Concept Is Important', body: c.whyImportant },
      { title: '3. Prior Knowledge Needed', body: c.priorKnowledge },
      { title: '4. Step-by-step Explanation', body: c.explanation },
      { title: '5. Diagram / Visualisation Suggestion', body: c.diagramSuggestion },
      { title: '6. Real-life Examples', body: c.realLifeExamples },
      { title: '7. Common Misconceptions and Corrections', body: c.misconceptions },
      { title: '8. Concept Check Questions', body: c.conceptCheckQuestions },
      { title: '9. Key Points to Remember', body: c.keyPoints },
      { title: '10. Exam Tips', body: c.examTips },
      { title: '11. Higher-order Thinking Question', body: c.hotsQuestion },
      { title: '12. Quick Self-reflection Prompt', body: c.reflectionPrompt },
    ];
    for (const sec of sections) {
      if (Array.isArray(sec.body)) {
        if (!sec.body.length) continue;
        lines.push(`### ${sec.title}`, '');
        for (const row of sec.body) lines.push(`- ${row}`);
        lines.push('');
      } else if (sec.body?.trim()) {
        lines.push(`### ${sec.title}`, '', sec.body.trim(), '');
      }
    }
    blocks.push(lines.join('\n').trim());
  }
  return blocks.join('\n\n');
}
