/** Shared helpers for AI tool display text (mobile WebView + native routing). */

import { stripStructuredAiToolMetadata } from './strip-ai-tool-metadata';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';

function cleanDisplayText(text: string): string {
  return stripStructuredAiToolMetadata(String(text || '')).trim();
}

/** Prefer explicit rawContent; otherwise unwrap `{ formatted, raw }` JSON payloads from mobile storage. */
export function coalesceAiToolRawContent(content: string, rawContent?: unknown): unknown {
  if (rawContent != null) return rawContent;
  const raw = String(content || '').trim();
  if (!raw.startsWith('{')) return rawContent ?? null;
  try {
    const parsed = JSON.parse(raw) as { raw?: unknown; structuredContent?: unknown };
    return parsed.raw ?? parsed.structuredContent ?? null;
  } catch {
    return rawContent ?? null;
  }
}

export function extractDisplayContent(content: string): string {
  const raw = cleanDisplayText(content);
  if (!raw.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(raw) as {
      formatted?: string;
      markdown?: string;
      raw?: unknown;
    };
    const primary = cleanDisplayText(parsed.formatted || parsed.markdown || '');
    if (primary) return primary;
    const nested = markdownFromUnknown(parsed.raw);
    return nested || raw;
  } catch {
    return raw;
  }
}

function markdownFromUnknown(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return cleanDisplayText(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const direct = cleanDisplayText(
      String(rec.markdown || rec.generatedContent || rec.formatted || rec.content || '')
    );
    if (direct) return direct;
    if (rec.structuredContent && typeof rec.structuredContent === 'object') {
      const nested = markdownFromUnknown(rec.structuredContent);
      if (nested) return nested;
    }
  }
  return '';
}

/** Prefer the richest markdown source (formatted field, JSON wrapper, or rawData). */
export function resolveRichDisplayContent(content: string, rawContent?: unknown): string {
  let best = extractDisplayContent(content);

  const raw = String(content || '').trim();
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { raw?: unknown };
      const nested = markdownFromUnknown(parsed.raw);
      if (countNumberedTemplateSections(nested) > countNumberedTemplateSections(best)) {
        best = nested;
      }
    } catch {
      /* keep best */
    }
  }

  const fromRaw = markdownFromUnknown(rawContent);
  if (countNumberedTemplateSections(fromRaw) > countNumberedTemplateSections(best)) {
    best = fromRaw;
  }

  return cleanDisplayText(best);
}

/** Super Admin templates: `1. Title`, `### 2. Learning Objectives`, `## 3. ...`, etc. */
export function contentHasNumberedTemplateSections(text: string): boolean {
  return countNumberedTemplateSections(text) >= 3;
}

export function countNumberedTemplateSections(text: string): number {
  const matches = String(text || '').match(/^\s*(?:#{1,4}\s*)?\d{1,2}\.\s+\S/gm);
  return matches?.length ?? 0;
}

export type ParsedTemplateSection = { num: number; title: string; body: string };

/** Super Admin templates may use up to ~25 numbered sections (e.g. Story & Passage = 19). */
export const MAX_TEMPLATE_SECTION_NUM = 25;

const TEMPLATE_SECTION_TITLE =
  /^(Section\s+[A-G]|Learning|Instructions|Objectives|Chapter|Topic|Simple|Why|Prior|Step|Diagram|Real|Common|Concept|Key|Exam|Higher|Quick|Worksheet|Mock|Answer|Bloom|NCF|Materials|Procedure|Teacher|Student|Differentiation|Assessment|Expected|Reflection|Subtopic|Study|Practice|Safety|Observation|Creative|Activity|Homework|Story|Passage|Important|Overview|Revision|Tips|Title|Definition|Formula|Application|Thinking|Challenge|Support|Parent|Clear|Rubric|Blueprint|Marking|Internal|Vocabulary|Warm|Recall|Infer|Connect|Grammar|Response|Suggested|Mistake|Wrap|Context|Foundation|Deck|Card|Passage|Foundations|Alignment|Schedule|Break|Self|Checkpoint|Extension|Outcome|Ticket|Observation|Creative|Competency|Application|HOTS|Match|Fill|Blank|Subjective|Objective|Paper|Question|Instructions|Observation|Warm-up|Pre-reading|Post-reading|Read|Think|Apply|Grammar|Differentiated|Teaching|Aids|Follow|Exit|Period|Slot|Goal|Readiness|Plan)/i;

/** Plain `N. Title` lines — avoid treating in-body numbered steps as section headers. */
export function looksLikeTemplateSectionTitle(title: string, num: number): boolean {
  const t = title.trim();
  if (t.length < 4) return false;
  if (TEMPLATE_SECTION_TITLE.test(t)) return true;
  if (num >= 1 && num <= MAX_TEMPLATE_SECTION_NUM) {
    if (t.length <= 120 && /^[A-Z(\[]/.test(t)) return true;
  }
  return false;
}

/** Merge duplicate section numbers — Super Admin content often repeats headers (`### 6.` then `6.`). */
export function dedupeParsedTemplateSections(sections: ParsedTemplateSection[]): ParsedTemplateSection[] {
  const byNum = new Map<number, ParsedTemplateSection>();
  for (const sec of sections) {
    const existing = byNum.get(sec.num);
    if (!existing) {
      byNum.set(sec.num, { ...sec });
      continue;
    }
    const existingBody = existing.body.trim();
    const incomingBody = sec.body.trim();
    let body = existingBody;
    if (!existingBody && incomingBody) {
      body = incomingBody;
    } else if (existingBody && !incomingBody) {
      body = existingBody;
    } else if (incomingBody.length > existingBody.length) {
      body = incomingBody;
    } else if (existingBody.length > incomingBody.length) {
      body = existingBody;
    } else if (existingBody && incomingBody && existingBody !== incomingBody) {
      body = `${existingBody}\n\n${incomingBody}`.trim();
    }
    byNum.set(sec.num, {
      num: sec.num,
      title: existing.title.trim() || sec.title,
      body,
    });
  }
  return Array.from(byNum.values()).sort((a, b) => a.num - b.num);
}

/**
 * Parse numbered template markdown into sections.
 * Section headers: ### N. Title, ## N. Title, **N. Title**, or plain N. Title (template lines only).
 * In-body lines like "1. First step" inside section 6 stay in the body (no ### prefix).
 */
export function parseNumberedTemplateSections(text: string): {
  title: string;
  sections: ParsedTemplateSection[];
} {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  let docHeader = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];
  const sections: ParsedTemplateSection[] = [];

  const flush = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    sections.push({
      num: currentSection,
      title: currentTitle,
      body: bodyLines.join('\n').trim(),
    });
    bodyLines = [];
  };

  const tryStartSection = (num: number, title: string) => {
    if (currentSection === num) {
      if (!currentTitle.trim() && title.trim()) currentTitle = title.trim();
      return;
    }
    flush();
    currentSection = num;
    currentTitle = title.trim();
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) {
      if (currentSection > 0) bodyLines.push('');
      continue;
    }

    const h1 = t.match(/^#\s+(.+)$/);
    if (h1 && !/^##/.test(t)) {
      docHeader = h1[1].replace(/^\d+\.\s*/, '').trim();
      continue;
    }

    const h2 = t.match(/^##\s+(.+)$/);
    if (h2 && !/^###/.test(t)) {
      const inner = h2[1].trim();
      const numberedH2 = inner.match(/^(\d{1,2})\.\s+(.+)$/);
      if (numberedH2) {
        tryStartSection(Number(numberedH2[1]), numberedH2[2]);
        continue;
      }
      flush();
      currentSection = 0;
      currentTitle = '';
      docHeader = inner.replace(/^\d+\.\s*/, '').trim();
      continue;
    }

    const mdNumbered = t.match(/^#{1,4}\s*(\d{1,2})\.\s+(.+)$/i);
    if (mdNumbered) {
      tryStartSection(Number(mdNumbered[1]), mdNumbered[2]);
      continue;
    }

    const boldNumbered = t.match(/^\*{1,2}(\d{1,2})\.\s*(.+?)\*{1,2}\s*$/i);
    if (boldNumbered) {
      const num = Number(boldNumbered[1]);
      const title = boldNumbered[2].trim();
      if (num > currentSection && looksLikeTemplateSectionTitle(title, num)) {
        tryStartSection(num, title);
        continue;
      }
    }

    const plainNumbered = t.match(/^(\d{1,2})\.\s+(.+)$/);
    if (plainNumbered) {
      const num = Number(plainNumbered[1]);
      const title = plainNumbered[2].trim();
      // In-section numbered steps (1., 2., … under ### 6. Procedure) must stay in body — not new sections.
      if (num > currentSection && looksLikeTemplateSectionTitle(title, num)) {
        tryStartSection(num, title);
        continue;
      }
    }

    const sectionLabel = t.match(/^Section\s+(\d{1,2})\s*[:\-—]\s*(.+)$/i);
    if (sectionLabel) {
      const num = Number(sectionLabel[1]);
      if (num > currentSection) {
        tryStartSection(num, sectionLabel[2]);
        continue;
      }
    }

    if (currentSection > 0) bodyLines.push(raw);
    else if (!docHeader && t) {
      docHeader = t.replace(/^\d+\.\s*/, '').trim();
    }
  }
  flush();

  return {
    title: stripAiToolGenerationLabel(docHeader),
    sections: dedupeParsedTemplateSections(sections).map((sec) => ({
      ...sec,
      title: stripAiToolGenerationLabel(sec.title.replace(/^\d+\.\s*/, ''), sec.title.replace(/^\d+\.\s*/, '')),
    })),
  };
}
