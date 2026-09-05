export type ChapterSummaryConcept = { name: string; explanation: string };
export type ChapterSummaryDefinition = { term: string; definition: string };
export type ChapterSummaryFormula = { name: string; formula: string; note: string };

export type ChapterSummaryContent = {
  title: string;
  chapterOverview: string;
  learningObjectives: string[];
  importantConcepts: ChapterSummaryConcept[];
  definitions: ChapterSummaryDefinition[];
  formulae: ChapterSummaryFormula[];
  conceptConnections: string;
  realLifeApplications: string[];
  quickRevisionNotes: string[];
  practiceRecallQuestions: string[];
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

function detectSectionNumFromTitle(title: string): number {
  const t = String(title || '').toLowerCase();
  if (/chapter summary title|summary title|study guide title|^title$/.test(t)) return 1;
  if (/overview of the chapter|chapter overview/.test(t)) return 2;
  if (/chapter and subtopic overview/.test(t)) return 2;
  if (/learning objectives/.test(t)) return 3;
  if (/prior knowledge/.test(t)) return 0;
  if (/important concepts|key concepts explained/.test(t)) return 4;
  if (/key definitions|definitions and terms/.test(t)) return 5;
  if (/formulae|formulas|rules|important facts|definitions and formulae/.test(t)) return 6;
  if (/concept connections|concept flow|mind map/.test(t)) return 7;
  if (/tips for further|improvement tips/.test(t)) return 0;
  if (/real[\s-]*life|applications|examples/.test(t) && !/practice/.test(t)) return 8;
  if (/quick revision|revision notes/.test(t)) return 9;
  if (/practice recall|recall questions/.test(t)) return 10;
  if (/practice questions/.test(t)) return 10;
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
    if (byBareTitle > 0 && line.length < 80 && !line.startsWith('-') && !line.startsWith('•')) {
      current = byBareTitle;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const match = line.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+)$/);
    if (match) {
      const byTitle = detectSectionNumFromTitle(match[2]);
      current = byTitle > 0 ? byTitle : Number(match[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current > 0 && sections.has(current)) {
      sections.get(current)!.push(raw);
    }
  }

  const result = new Map<number, string>();
  for (const [num, bodyLines] of sections.entries()) {
    const firstLine = String(bodyLines[0] ?? '').trim();
    const byFirstLine = detectSectionNumFromTitle(firstLine);
    const mapped =
      num >= 4 && num <= 10 && byFirstLine > 0 ? byFirstLine : num;
    const existing = result.get(mapped) || '';
    const chunk = cleanText(bodyLines.join('\n'));
    result.set(mapped, existing ? `${existing}\n\n${chunk}` : chunk);
  }
  return result;
}

function parseConceptsBlock(text: string): ChapterSummaryConcept[] {
  const out: ChapterSummaryConcept[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(?:[-—–]\s*(.*))?$/);
    if (m) {
      out.push({ name: cleanText(m[1]), explanation: cleanText(m[2] || '') });
      continue;
    }
    const m2 = t.match(/^\d+\.\s+(.+?)\s*[-—–]\s*(.+)$/);
    if (m2) out.push({ name: cleanText(m2[1]), explanation: cleanText(m2[2]) });
  }
  return out;
}

function parseDefinitionsBlock(text: string): ChapterSummaryDefinition[] {
  const out: ChapterSummaryDefinition[] = [];
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

function parseFormulaeBlock(text: string): ChapterSummaryFormula[] {
  const out: ChapterSummaryFormula[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const bullet = t.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const content = cleanText(bullet[1]);
      const colon = content.match(/^(.+?):\s*(.+)$/);
      if (colon) {
        out.push({ name: cleanText(colon[1]), formula: cleanText(colon[2]), note: '' });
      } else {
        out.push({ name: '', formula: content, note: '' });
      }
      continue;
    }
    const bold = t.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(?:[-—–]\s*(.*))?$/);
    if (bold) {
      out.push({ name: cleanText(bold[1]), formula: cleanText(bold[2] || bold[1]), note: '' });
      continue;
    }
    const dash = t.match(/^\d+\.\s+(.+?)\s*[-—–]\s*(.+)$/);
    if (dash) {
      out.push({ name: cleanText(dash[1]), formula: cleanText(dash[2]), note: '' });
      continue;
    }
    const m = t.match(/^\d+\.\s+(.+?):\s*(.+?)(?:\s*\((.+)\))?$/);
    if (m) {
      out.push({ name: cleanText(m[1]), formula: cleanText(m[2]), note: cleanText(m[3] || '') });
      continue;
    }
    const plain = t.match(/^\d+\.\s+(.+)$/);
    if (plain) out.push({ name: '', formula: cleanText(plain[1]), note: '' });
  }
  return out;
}

function resolveChapterSummaryFormulae(raw: Record<string, unknown>): ChapterSummaryFormula[] {
  let formulae = normalizeFormulae(
    raw.formulae ?? raw.formulas ?? raw.rules ?? raw.important_facts,
  );
  if (formulae.length >= 3) return formulae;

  const factSources = [
    raw.must_remember_facts,
    raw.important_facts,
    raw.facts,
    raw.important_exam_points,
    raw.exam_points,
    raw.key_takeaways,
  ];
  for (const src of factSources) {
    for (const text of toList(src)) {
      if (formulae.length >= 6) break;
      if (!text) continue;
      if (formulae.some((f) => f.formula === text)) continue;
      formulae.push({ name: 'Important Fact', formula: text, note: '' });
    }
  }

  if (formulae.length < 3) {
    for (const text of toList(raw.quick_revision_notes)) {
      if (formulae.length >= 3) break;
      if (!text || formulae.some((f) => f.formula === text)) continue;
      formulae.push({ name: 'Key rule', formula: text, note: '' });
    }
  }

  return formulae;
}

function parseRecallQuestionsBlock(text: string): string[] {
  const out: string[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+(.+)$/);
    if (m) out.push(cleanText(m[1]));
    else if (t.startsWith('- ')) out.push(cleanText(t.replace(/^-\s+/, '')));
  }
  return out.filter(Boolean);
}

function normalizeConcepts(raw: unknown): ChapterSummaryConcept[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (c && typeof c === 'object') {
        const row = c as Record<string, unknown>;
        return {
          name: cleanText(row.name || row.concept),
          explanation: cleanText(row.explanation),
        };
      }
      return { name: cleanText(c), explanation: '' };
    })
    .filter((c) => c.name);
}

function normalizeDefinitions(raw: unknown): ChapterSummaryDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (d && typeof d === 'object') {
        const row = d as Record<string, unknown>;
        return {
          term: cleanText(row.term || row.name),
          definition: cleanText(row.definition),
        };
      }
      return { term: cleanText(d), definition: '' };
    })
    .filter((d) => d.term);
}

function normalizeFormulae(raw: unknown): ChapterSummaryFormula[] {
  if (typeof raw === 'string' && raw.trim()) {
    return toList(raw).map((text) => ({ name: '', formula: text, note: '' }));
  }
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((f) => {
      if (f && typeof f === 'object') {
        const row = f as Record<string, unknown>;
        return {
          name: cleanText(row.name),
          formula: cleanText(row.formula || row.rule),
          note: cleanText(row.note),
        };
      }
      return { name: '', formula: cleanText(f), note: '' };
    })
    .filter((f) => f.formula || f.name);
}

/** Map study-guide-shaped JSON into chapter summary fields. */
export function normalizeChapterSummaryRecord(raw: Record<string, unknown>): ChapterSummaryContent {
  const title = cleanText(
    raw.chapter_summary_title ||
      raw.chapter_title ||
      raw.title ||
      raw.study_guide_title ||
      raw.name,
  );
  const chapterOverview = cleanText(
    raw.chapter_overview ||
      raw.overview ||
      raw.summary ||
      raw.chapter_summary ||
      raw.chapter_subtopic_overview ||
      raw.chapter_overview_text,
  );
  const learningObjectives = toList(
    raw.learning_objectives ?? raw.learningObjectives ?? raw.objectives,
  );
  const importantConcepts = normalizeConcepts(
    raw.important_concepts ??
      raw.key_concepts ??
      raw.key_concepts_explained ??
      raw.concepts,
  );
  const definitions = normalizeDefinitions(
    raw.definitions ?? raw.key_definitions ?? raw.terms,
  );
  const formulae = resolveChapterSummaryFormulae(raw);
  const conceptConnections = cleanText(
    raw.concept_connections ??
      raw.connections ??
      raw.concept_flow ??
      raw.concept_flow_mind_map ??
      raw.mind_map,
  );
  const realLifeApplications = toList(
    raw.real_life_applications ?? raw.real_life_examples ?? raw.applications ?? raw.examples,
  );
  const quickRevisionNotes = toList(
    raw.quick_revision_notes ?? raw.review_points ?? raw.quick_review,
  );
  let practiceRecallQuestions = toList(
    raw.practice_recall_questions ?? raw.recall_questions ?? raw.quick_check_questions,
  );
  if (!practiceRecallQuestions.length && Array.isArray(raw.practice_questions)) {
    practiceRecallQuestions = (raw.practice_questions as unknown[])
      .map((q) => {
        if (q && typeof q === 'object') {
          const row = q as Record<string, unknown>;
          return cleanText(row.question);
        }
        return cleanText(q);
      })
      .filter(Boolean);
  }

  return {
    title: title || 'Chapter Summary',
    chapterOverview,
    learningObjectives,
    importantConcepts,
    definitions,
    formulae,
    conceptConnections,
    realLifeApplications,
    quickRevisionNotes,
    practiceRecallQuestions,
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
    if (r.kind === 'chapterSummary') push(r);
    push(r.renderContent);
    push(r.structuredContent);
    if (r.metadata && typeof r.metadata === 'object') {
      push((r.metadata as Record<string, unknown>).structuredContent);
    }
  }
  return out;
}

function fromMarkdown(markdown: string): ChapterSummaryContent {
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
    'Chapter Summary';

  return {
    title,
    chapterOverview: cleanText(numbered.get(2) || ''),
    learningObjectives: toList(numbered.get(3) || ''),
    importantConcepts: parseConceptsBlock(numbered.get(4) || ''),
    definitions: parseDefinitionsBlock(numbered.get(5) || ''),
    formulae: parseFormulaeBlock(numbered.get(6) || ''),
    conceptConnections: cleanText(numbered.get(7) || ''),
    realLifeApplications: toList(numbered.get(8) || ''),
    quickRevisionNotes: toList(numbered.get(9) || ''),
    practiceRecallQuestions: parseRecallQuestionsBlock(numbered.get(10) || ''),
  };
}

function mergeChapterSummary(
  base: ChapterSummaryContent,
  patch: ChapterSummaryContent,
): ChapterSummaryContent {
  return {
    title: base.title || patch.title,
    chapterOverview: base.chapterOverview || patch.chapterOverview,
    learningObjectives: base.learningObjectives.length ? base.learningObjectives : patch.learningObjectives,
    importantConcepts: base.importantConcepts.length ? base.importantConcepts : patch.importantConcepts,
    definitions: base.definitions.length ? base.definitions : patch.definitions,
    formulae: base.formulae.length ? base.formulae : patch.formulae,
    conceptConnections: base.conceptConnections || patch.conceptConnections,
    realLifeApplications: base.realLifeApplications.length
      ? base.realLifeApplications
      : patch.realLifeApplications,
    quickRevisionNotes: base.quickRevisionNotes.length ? base.quickRevisionNotes : patch.quickRevisionNotes,
    practiceRecallQuestions: base.practiceRecallQuestions.length
      ? base.practiceRecallQuestions
      : patch.practiceRecallQuestions,
  };
}

function hasBody(c: ChapterSummaryContent): boolean {
  return (
    Boolean(c.chapterOverview) ||
    c.learningObjectives.length > 0 ||
    c.importantConcepts.length > 0 ||
    c.definitions.length > 0 ||
    c.formulae.length > 0 ||
    Boolean(c.conceptConnections) ||
    c.realLifeApplications.length > 0 ||
    c.quickRevisionNotes.length > 0 ||
    c.practiceRecallQuestions.length > 0
  );
}

export function resolveChapterSummaryFromPayload(
  content: string,
  rawContent?: unknown,
): { summary: ChapterSummaryContent | null; markdownFallback: string | null } {
  const sources = extractSources(rawContent);
  let summary: ChapterSummaryContent | null = null;

  for (const src of sources) {
    const next = normalizeChapterSummaryRecord(src);
    summary = summary ? mergeChapterSummary(summary, next) : next;
  }

  try {
    const t = String(content || '').trim();
    if (t.startsWith('{')) {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        const next = normalizeChapterSummaryRecord(j.structuredContent as Record<string, unknown>);
        summary = summary ? mergeChapterSummary(summary, next) : next;
      }
    }
  } catch {
    /* ignore */
  }

  const fromMd = fromMarkdown(content);
  summary = summary ? mergeChapterSummary(summary, fromMd) : fromMd;

  if (!hasBody(summary)) {
    return { summary: null, markdownFallback: content || null };
  }

  return { summary, markdownFallback: null };
}

export function chapterSummaryViewerPayloadFromRecord(
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

export function looksLikeChapterSummaryContent(text: string): boolean {
  const sample = String(text || '').slice(0, 16000);
  if (!sample.trim()) return false;
  if (/smart\s*study\s*guide\s*generator/i.test(sample) && !/chapter\s*summary/i.test(sample)) {
    return false;
  }
  const hasChapterSummaryLabel =
    /chapter\s*summary\s*creator/i.test(sample) ||
    /chapter\s*summary\s*title/i.test(sample) ||
    /overview of the chapter/i.test(sample);
  const hasChapterSections =
    /important concepts and explanations/i.test(sample) ||
    /practice recall questions/i.test(sample) ||
    /concept connections/i.test(sample) ||
    /(?:^|\n)\s*#{0,3}\s*2\.\s*Overview of the Chapter/im.test(sample);
  const looksLikeMislabeledStudyGuide =
    /study\s*guide\s*title/i.test(sample) &&
    /chapter\s*and\s*subtopic\s*overview/i.test(sample) &&
    !/prior knowledge required/i.test(sample) &&
    !/tips for further improvement/i.test(sample);
  return hasChapterSummaryLabel || hasChapterSections || looksLikeMislabeledStudyGuide;
}
