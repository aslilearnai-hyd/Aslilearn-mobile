export type KeyPointsConcept = { name: string; explanation: string };
export type KeyPointsDefinition = { term: string; definition: string };
export type KeyPointsFormula = { name: string; formula: string; note: string };
export type KeyPointsKeyword = { term: string; meaning: string };

export type KeyPointsContent = {
  title: string;
  importantConcepts: KeyPointsConcept[];
  essentialDefinitions: KeyPointsDefinition[];
  formulae: KeyPointsFormula[];
  keywords: KeyPointsKeyword[];
  mustRememberFacts: string[];
  realLifeConnections: string[];
  examPoints: string[];
  mnemonics: string[];
  oneMinuteSummary: string;
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
  if (/topic\s*title|^title$/.test(t)) return 1;
  if (/most important concepts|important concepts/.test(t)) return 2;
  if (/essential definitions|key definitions/.test(t)) return 3;
  if (/formulae|formulas|important formulae|rules/.test(t) && !/definitions/.test(t)) return 4;
  if (/keywords|terminologies/.test(t)) return 5;
  if (/must[\s-]*remember|key points to remember/.test(t)) return 6;
  if (/real[\s-]*life|connections/.test(t) && !/exam/.test(t)) return 7;
  if (/exam\s*points|frequently asked/.test(t)) return 8;
  if (/mnemonics|memory\s*tricks/.test(t)) return 9;
  if (/one[\s-]*minute|revision\s*summary/.test(t)) return 10;
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
    if (byBareTitle > 0 && line.length < 90 && !line.startsWith('-') && !line.startsWith('•')) {
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
    const mapped = num >= 2 && num <= 10 && byFirstLine > 0 ? byFirstLine : num;
    const existing = result.get(mapped) || '';
    const chunk = cleanText(bodyLines.join('\n'));
    result.set(mapped, existing ? `${existing}\n\n${chunk}` : chunk);
  }
  return result;
}

function parseConceptsBlock(text: string): KeyPointsConcept[] {
  const out: KeyPointsConcept[] = [];
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

function parseDefinitionsBlock(text: string): KeyPointsDefinition[] {
  const out: KeyPointsDefinition[] = [];
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

function parseFormulaeBlock(text: string): KeyPointsFormula[] {
  const out: KeyPointsFormula[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const bullet = t.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const content = cleanText(bullet[1]);
      const colon = content.match(/^(.+?):\s*(.+)$/);
      if (colon) out.push({ name: cleanText(colon[1]), formula: cleanText(colon[2]), note: '' });
      else out.push({ name: '', formula: content, note: '' });
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

function parseKeywordsBlock(text: string): KeyPointsKeyword[] {
  const out: KeyPointsKeyword[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(?:[-—–]\s*(.*))?$/);
    if (m) {
      out.push({ term: cleanText(m[1]), meaning: cleanText(m[2] || '') });
      continue;
    }
    const m2 = t.match(/^\d+\.\s+(.+?)\s*[-—–]\s*(.+)$/);
    if (m2) out.push({ term: cleanText(m2[1]), meaning: cleanText(m2[2]) });
  }
  return out;
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

function normalizeConcepts(raw: unknown): KeyPointsConcept[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (c && typeof c === 'object') {
        const row = c as Record<string, unknown>;
        return {
          name: cleanText(row.name || row.concept || row.point),
          explanation: cleanText(row.explanation || row.detail),
        };
      }
      return { name: cleanText(c), explanation: '' };
    })
    .filter((c) => c.name);
}

function normalizeDefinitions(raw: unknown): KeyPointsDefinition[] {
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

function normalizeFormulae(raw: unknown): KeyPointsFormula[] {
  if (typeof raw === 'string' && raw.trim()) {
    return toList(raw).map((text) => ({ name: '', formula: text, note: '' }));
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      if (f && typeof f === 'object') {
        const row = f as Record<string, unknown>;
        return {
          name: cleanText(row.name),
          formula: cleanText(row.formula || row.rule),
          note: cleanText(row.note || row.when_to_use),
        };
      }
      return { name: '', formula: cleanText(f), note: '' };
    })
    .filter((f) => f.formula || f.name);
}

function resolveKeyPointsFormulae(raw: Record<string, unknown>): KeyPointsFormula[] {
  let formulae = normalizeFormulae(raw.formulae ?? raw.formulas ?? raw.rules);
  if (formulae.length >= 3) return formulae;

  for (const src of [raw.important_facts, raw.facts]) {
    for (const text of toList(src)) {
      if (formulae.length >= 6) break;
      if (!text || formulae.some((f) => f.formula === text)) continue;
      formulae.push({ name: 'Rule', formula: text, note: '' });
    }
  }

  if (formulae.length < 3) {
    for (const text of toList(raw.must_remember_facts ?? raw.key_points)) {
      if (formulae.length >= 3) break;
      if (!text || formulae.some((f) => f.formula === text)) continue;
      formulae.push({ name: 'Key rule', formula: text, note: '' });
    }
  }

  if (formulae.length < 3) {
    for (const text of toList(raw.frequently_asked_exam_points ?? raw.exam_points)) {
      if (formulae.length >= 3) break;
      if (!text || formulae.some((f) => f.formula === text)) continue;
      formulae.push({ name: 'Exam point', formula: text, note: '' });
    }
  }

  return formulae;
}

function normalizeKeywords(raw: unknown): KeyPointsKeyword[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((k) => {
      if (k && typeof k === 'object') {
        const row = k as Record<string, unknown>;
        return {
          term: cleanText(row.term || row.keyword || row.name),
          meaning: cleanText(row.meaning || row.definition),
        };
      }
      return { term: cleanText(k), meaning: '' };
    })
    .filter((k) => k.term);
}

export function normalizeKeyPointsRecord(raw: Record<string, unknown>): KeyPointsContent {
  const title = cleanText(raw.topic_title || raw.title || raw.topic || raw.name);
  return {
    title: title || 'Key Points',
    importantConcepts: normalizeConcepts(
      raw.important_concepts ?? raw.key_concepts ?? raw.concepts,
    ),
    essentialDefinitions: normalizeDefinitions(
      raw.essential_definitions ?? raw.definitions,
    ),
    formulae: resolveKeyPointsFormulae(raw),
    keywords: normalizeKeywords(raw.keywords_terminologies ?? raw.keywords ?? raw.terminologies),
    mustRememberFacts: toList(
      raw.must_remember_facts ?? raw.key_points ?? raw.key_points_to_remember,
    ),
    realLifeConnections: toList(raw.real_life_connections ?? raw.real_life_applications),
    examPoints: toList(raw.frequently_asked_exam_points ?? raw.exam_points),
    mnemonics: toList(raw.mnemonics_memory_tricks ?? raw.mnemonics ?? raw.memory_tricks),
    oneMinuteSummary: cleanText(
      raw.one_minute_revision_summary ?? raw.revision_summary ?? raw.summary,
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
    if (r.kind === 'keyPoints') push(r);
    push(r.renderContent);
    push(r.structuredContent);
    if (r.metadata && typeof r.metadata === 'object') {
      push((r.metadata as Record<string, unknown>).structuredContent);
    }
  }
  return out;
}

function fromMarkdown(markdown: string): KeyPointsContent {
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
    'Key Points';

  return {
    title,
    importantConcepts: parseConceptsBlock(numbered.get(2) || ''),
    essentialDefinitions: parseDefinitionsBlock(numbered.get(3) || ''),
    formulae: parseFormulaeBlock(numbered.get(4) || ''),
    keywords: parseKeywordsBlock(numbered.get(5) || ''),
    mustRememberFacts: parseListBlock(numbered.get(6) || ''),
    realLifeConnections: parseListBlock(numbered.get(7) || ''),
    examPoints: parseListBlock(numbered.get(8) || ''),
    mnemonics: parseListBlock(numbered.get(9) || ''),
    oneMinuteSummary: cleanText(numbered.get(10) || ''),
  };
}

function mergeKeyPoints(base: KeyPointsContent, patch: KeyPointsContent): KeyPointsContent {
  return {
    title: base.title || patch.title,
    importantConcepts: base.importantConcepts.length ? base.importantConcepts : patch.importantConcepts,
    essentialDefinitions: base.essentialDefinitions.length
      ? base.essentialDefinitions
      : patch.essentialDefinitions,
    formulae: base.formulae.length >= patch.formulae.length ? base.formulae : patch.formulae,
    keywords: base.keywords.length ? base.keywords : patch.keywords,
    mustRememberFacts: base.mustRememberFacts.length ? base.mustRememberFacts : patch.mustRememberFacts,
    realLifeConnections: base.realLifeConnections.length
      ? base.realLifeConnections
      : patch.realLifeConnections,
    examPoints: base.examPoints.length ? base.examPoints : patch.examPoints,
    mnemonics: base.mnemonics.length ? base.mnemonics : patch.mnemonics,
    oneMinuteSummary: base.oneMinuteSummary || patch.oneMinuteSummary,
  };
}

function hasBody(c: KeyPointsContent): boolean {
  return (
    c.importantConcepts.length > 0 ||
    c.essentialDefinitions.length > 0 ||
    c.formulae.length > 0 ||
    c.keywords.length > 0 ||
    c.mustRememberFacts.length > 0 ||
    c.realLifeConnections.length > 0 ||
    c.examPoints.length > 0 ||
    c.mnemonics.length > 0 ||
    Boolean(c.oneMinuteSummary)
  );
}

export function resolveKeyPointsFromPayload(
  content: string,
  rawContent?: unknown,
): { keyPoints: KeyPointsContent | null; markdownFallback: string | null } {
  const sources = extractSources(rawContent);
  let keyPoints: KeyPointsContent | null = null;

  for (const src of sources) {
    const next = normalizeKeyPointsRecord(src);
    keyPoints = keyPoints ? mergeKeyPoints(keyPoints, next) : next;
  }

  try {
    const t = String(content || '').trim();
    if (t.startsWith('{')) {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        const next = normalizeKeyPointsRecord(j.structuredContent as Record<string, unknown>);
        keyPoints = keyPoints ? mergeKeyPoints(keyPoints, next) : next;
      }
    }
  } catch {
    /* ignore */
  }

  const fromMd = fromMarkdown(content);
  keyPoints = keyPoints ? mergeKeyPoints(keyPoints, fromMd) : fromMd;

  if (!hasBody(keyPoints)) {
    return { keyPoints: null, markdownFallback: content || null };
  }

  return { keyPoints, markdownFallback: null };
}

export function keyPointsViewerPayloadFromRecord(
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

export function looksLikeKeyPointsContent(text: string): boolean {
  const sample = String(text || '').slice(0, 16000);
  if (!sample.trim()) return false;
  return (
    /key\s*points\s*extractor/i.test(sample) ||
    /most important concepts/i.test(sample) ||
    /essential definitions/i.test(sample) ||
    /keywords and terminologies/i.test(sample) ||
    /one[\s-]*minute revision summary/i.test(sample) ||
    /(?:^|\n)\s*#{0,3}\s*2\.\s*Most Important Concepts/im.test(sample)
  );
}
