export type ConceptBreakdownTerm = { term: string; definition: string };

export type ConceptBreakdownContent = {
  conceptTitle: string;
  simpleDefinition: string;
  breakdownSteps: string[];
  realLifeExamples: string[];
  importantTerms: ConceptBreakdownTerm[];
  conceptCheckQuestions: string[];
  applicationThinkingQuestion: string;
  higherOrderThinkingPrompt: string;
  quickRevisionSummary: string;
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

function normalizeTerms(raw: unknown): ConceptBreakdownTerm[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      if (t && typeof t === 'object') {
        const row = t as Record<string, unknown>;
        return {
          term: cleanText(row.term || row.keyword || row.name),
          definition: cleanText(row.definition),
        };
      }
      return { term: cleanText(t), definition: '' };
    })
    .filter((t) => t.term);
}

export function normalizeConceptBreakdownRecord(raw: Record<string, unknown>): ConceptBreakdownContent {
  let src: Record<string, unknown> = raw;
  if (Array.isArray(raw.concepts) && raw.concepts.length) {
    const row = raw.concepts[0];
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      src = { ...raw, ...(row as Record<string, unknown>) };
    }
  }
  const conceptTitle = cleanText(
    src.concept_title || src.concept_name || src.title || src.name || 'Concept',
  );
  return {
    conceptTitle: conceptTitle || 'Concept',
    simpleDefinition: cleanText(
      src.simple_definition || src.simple_explanation || src.explanation,
    ),
    breakdownSteps: toList(src.breakdown_steps ?? src.steps),
    realLifeExamples: toList(
      src.real_life_examples ?? src.indian_context_examples ?? src.examples,
    ),
    importantTerms: normalizeTerms(src.important_terms ?? src.keywords ?? src.terms),
    conceptCheckQuestions: toList(
      src.concept_check_questions ?? src.quick_check_questions,
    ),
    applicationThinkingQuestion: cleanText(
      src.application_thinking_question || src.application_question,
    ),
    higherOrderThinkingPrompt: cleanText(
      src.higher_order_thinking_prompt || src.hots_prompt || src.hots_question,
    ),
    quickRevisionSummary: cleanText(
      src.quick_revision_summary || src.revision_summary || src.summary,
    ),
  };
}

function parseNumberedSections(markdown: string): Map<number, string> {
  const lines = String(markdown || '').split('\n');
  const sections = new Map<number, string[]>();
  let current = 0;

  for (const raw of lines) {
    const line = raw.trim();
    const match = line.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+)$/);
    if (match) {
      current = Number(match[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current > 0 && sections.has(current)) {
      sections.get(current)!.push(raw);
    }
  }

  const result = new Map<number, string>();
  for (const [num, body] of sections.entries()) {
    result.set(num, cleanText(body.join('\n')));
  }
  return result;
}

function extractTitleFromMarkdown(markdown: string): string {
  const firstH1 = String(markdown || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^#\s+/.test(l) && !/^##\s+/.test(l));
  if (firstH1) return cleanText(firstH1.replace(/^#+\s*/, ''));
  return '';
}

function parseTermsBlock(text: string): ConceptBreakdownTerm[] {
  const out: ConceptBreakdownTerm[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(?:[-—–]\s*(.*))?$/);
    if (m) {
      out.push({ term: cleanText(m[1]), definition: cleanText(m[2] || '') });
      continue;
    }
    const m2 = t.match(/^\d+\.\s+(.+?)\s*[-—–]\s*(.+)$/);
    if (m2) out.push({ term: cleanText(m2[1]), definition: cleanText(m2[2]) });
  }
  return out;
}

function parseCheckQuestionsBlock(text: string): string[] {
  const out: string[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+(.+)$/);
    if (m) out.push(cleanText(m[1]));
    else if (t.startsWith('- ')) out.push(cleanText(t.replace(/^-\s+/, '')));
  }
  return out.filter(Boolean);
}

function fromMarkdown(markdown: string): ConceptBreakdownContent {
  const numbered = parseNumberedSections(markdown);
  const title = extractTitleFromMarkdown(markdown) || cleanText(numbered.get(1) || '') || 'Concept';
  const stepsRaw = numbered.get(3) || '';
  const steps =
    stepsRaw
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^\d+\./.test(l))
      .map((l) => l.replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean).length > 0
      ? stepsRaw
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => /^\d+\./.test(l))
          .map((l) => l.replace(/^\d+\.\s+/, '').trim())
          .filter(Boolean)
      : toList(stepsRaw);

  return {
    conceptTitle: title,
    simpleDefinition: cleanText(numbered.get(2) || ''),
    breakdownSteps: steps,
    realLifeExamples: toList(numbered.get(4) || ''),
    importantTerms: parseTermsBlock(numbered.get(5) || ''),
    conceptCheckQuestions: parseCheckQuestionsBlock(numbered.get(6) || ''),
    applicationThinkingQuestion: cleanText(numbered.get(7) || ''),
    higherOrderThinkingPrompt: cleanText(numbered.get(8) || ''),
    quickRevisionSummary: cleanText(numbered.get(9) || ''),
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
    push(r.metadata);
    if (r.metadata && typeof r.metadata === 'object') {
      push((r.metadata as Record<string, unknown>).structuredContent);
    }
    push(r.structuredContent);
    push(r.renderContent);
    if (r.raw && typeof r.raw === 'object') push(r.raw);
  }
  return out;
}

function hasBody(c: ConceptBreakdownContent): boolean {
  return Boolean(
    c.simpleDefinition ||
      c.breakdownSteps.length ||
      c.realLifeExamples.length ||
      c.importantTerms.length ||
      c.conceptCheckQuestions.length ||
      c.applicationThinkingQuestion ||
      c.higherOrderThinkingPrompt ||
      c.quickRevisionSummary,
  );
}

function mergeConcept(base: ConceptBreakdownContent, patch: Partial<ConceptBreakdownContent>): ConceptBreakdownContent {
  return {
    conceptTitle: base.conceptTitle || patch.conceptTitle || 'Concept',
    simpleDefinition: base.simpleDefinition || patch.simpleDefinition || '',
    breakdownSteps: base.breakdownSteps.length ? base.breakdownSteps : patch.breakdownSteps || [],
    realLifeExamples: base.realLifeExamples.length ? base.realLifeExamples : patch.realLifeExamples || [],
    importantTerms: base.importantTerms.length ? base.importantTerms : patch.importantTerms || [],
    conceptCheckQuestions: base.conceptCheckQuestions.length
      ? base.conceptCheckQuestions
      : patch.conceptCheckQuestions || [],
    applicationThinkingQuestion:
      base.applicationThinkingQuestion || patch.applicationThinkingQuestion || '',
    higherOrderThinkingPrompt:
      base.higherOrderThinkingPrompt || patch.higherOrderThinkingPrompt || '',
    quickRevisionSummary: base.quickRevisionSummary || patch.quickRevisionSummary || '',
  };
}

export function resolveConceptBreakdownFromPayload(
  content: string,
  rawContent?: unknown,
): { concepts: ConceptBreakdownContent[]; markdownFallback: string | null } {
  const sources = extractSources(rawContent);
  const concepts: ConceptBreakdownContent[] = [];

  try {
    const t = String(content || '').trim();
    if (t.startsWith('{')) {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        sources.push(j.structuredContent as Record<string, unknown>);
      }
    }
  } catch {
    /* ignore */
  }

  for (const src of sources) {
    const arr = src.concepts;
    if (Array.isArray(arr) && arr.length) {
      for (const item of arr) {
        if (item && typeof item === 'object') {
          concepts.push(normalizeConceptBreakdownRecord(item as Record<string, unknown>));
        }
      }
    }
    if (!concepts.length) {
      const single = normalizeConceptBreakdownRecord(src);
      if (hasBody(single) || single.conceptTitle !== 'Concept') {
        concepts.push(single);
      }
    }
  }

  const fromMd = fromMarkdown(content);
  let merged: ConceptBreakdownContent[] = concepts.length
    ? concepts.map((c) => mergeConcept(c, fromMd))
    : [fromMd];

  if (!merged.length || !hasBody(merged[0])) {
    merged = [mergeConcept(merged[0] || fromMd, fromMd)];
  }

  const anyBody = merged.some(hasBody);
  return {
    concepts: merged,
    markdownFallback: anyBody ? null : content || null,
  };
}

export function conceptBreakdownViewerPayloadFromRecord(
  record?: {
    generatedContent?: string;
    content?: string;
    structuredContent?: unknown;
    metadata?: { structuredContent?: unknown };
  } | null,
): { content: string; rawContent?: unknown } {
  const text = String(record?.generatedContent || record?.content || '').trim();
  const rawContent =
    record?.structuredContent ??
    (record?.metadata && typeof record.metadata === 'object'
      ? (record.metadata as { structuredContent?: unknown }).structuredContent
      : record);
  return { content: text, rawContent };
}

export function looksLikeConceptBreakdownContent(text: string): boolean {
  const sample = String(text || '').slice(0, 12000);
  if (!sample.trim()) return false;
  const hasLabel =
    /concept\s*breakdown/i.test(sample) ||
    /simple\s*definition/i.test(sample) ||
    /step-by-step\s*concept/i.test(sample);
  const hasSections = /(?:^|\n)\s*#{1,3}\s*\d{1,2}\.\s*(Simple Definition|Real-life|Concept Check)/im.test(
    sample,
  );
  return hasLabel && (hasSections || /important\s*terms/i.test(sample));
}
