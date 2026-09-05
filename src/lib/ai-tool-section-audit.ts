/**
 * Compare API markdown sections vs structured / rendered HTML sections (mobile AI tools).
 */

import {
  countNumberedTemplateSections,
  parseNumberedTemplateSections,
  type ParsedTemplateSection,
} from './ai-tool-display-content';

export { countNumberedTemplateSections };

export type AiToolSectionAudit = {
  toolType: string;
  variant: 'student' | 'teacher';
  apiSectionCount: number;
  apiSections: Array<{ num: number; title: string; hasBody: boolean }>;
  structuredSectionNums: number[];
  renderedPath: string;
  renderedSectionNums: number[];
  missingFromRender: number[];
  preferMarkdown: boolean;
};

const SECTION_NUM_IN_HTML_RE = /Section\s+(\d{1,2})\b/gi;

/** Drop embedded CSS/JS so class names in stylesheets are not mistaken for rendered sections. */
function stripHtmlForSectionAudit(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
}

/** Legacy worksheets used `## Title` without `1.` — treat doc title as section 1 when numbering starts at 2. */
function withImplicitSectionOne(
  title: string,
  sections: ParsedTemplateSection[],
): ParsedTemplateSection[] {
  const docTitle = String(title || '').trim();
  if (!docTitle || sections.some((s) => s.num === 1)) return sections;
  const minNum = sections.length ? Math.min(...sections.map((s) => s.num)) : 0;
  if (minNum !== 2) return sections;
  return [
    { num: 1, title: 'Title', body: docTitle },
    ...sections,
  ].sort((a, b) => a.num - b.num);
}

/** Section numbers referenced in generated section-card HTML. */
export function extractSectionNumsFromHtml(html: string): number[] {
  const nums = new Set<number>();
  const s = stripHtmlForSectionAudit(html);
  let match: RegExpExecArray | null;
  const re = new RegExp(SECTION_NUM_IN_HTML_RE.source, 'gi');
  while ((match = re.exec(s)) !== null) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) nums.add(n);
  }
  if (/ai-tool-hero-card|hero-title-card/i.test(s)) nums.add(1);
  return [...nums].sort((a, b) => a - b);
}

export function summarizeApiSections(display: string): {
  count: number;
  sections: Array<{ num: number; title: string; hasBody: boolean }>;
  parsed: ParsedTemplateSection[];
} {
  const { title, sections: rawParsed } = parseNumberedTemplateSections(display);
  const parsed = withImplicitSectionOne(title, rawParsed);
  const sections = parsed.map((sec) => ({
    num: sec.num,
    title: sec.title,
    hasBody: Boolean(sec.body.trim()),
  }));
  const count = sections.length > 0 ? sections.length : countNumberedTemplateSections(display);
  return { count, sections, parsed };
}

/**
 * Prefer full numbered markdown when the API payload has sections that structured HTML omits.
 * Structured parsers only map known fields; markdown from Super Admin is the source of truth.
 */
/** Tools with structured rawData — prefer structured HTML when markdown sections are incomplete. */
const STRUCTURED_HYBRID_TOOL_TYPES = new Set([
  'smart-qa-practice-generator',
  'worksheet-mcq-generator',
  'activity-project-generator',
  'project-idea-lab',
  'concept-mastery-helper',
  'lesson-planner',
  'exam-question-paper-generator',
  'daily-class-plan-maker',
  'homework-creator',
  'story-passage-creator',
  'short-notes-summaries-maker',
  'flashcard-generator',
  'my-study-decks',
]);

export function apiMarkdownShouldDriveDisplay(toolType: string, display: string): boolean {
  if (!display.trim()) return false;
  if (STRUCTURED_HYBRID_TOOL_TYPES.has(toolType)) return false;
  return countNumberedTemplateSections(display) >= 1;
}

export function shouldPreferMarkdownOverStructured(
  display: string,
  structuredHtml: string | null | undefined,
  toolType?: string,
): boolean {
  const { title, sections: rawSections } = parseNumberedTemplateSections(display);
  const apiSections = withImplicitSectionOne(title, rawSections);
  if (!apiSections.length) return false;
  if (!structuredHtml?.trim()) return true;

  // Exam structured HTML uses sections 1–6 (title + A–E). Sparse mock-style
  // numbered markdown (e.g. only 1 and 9) must not override that layout.
  if (toolType === 'exam-question-paper-generator') {
    const renderedNums = extractSectionNumsFromHtml(structuredHtml);
    if (renderedNums.some((n) => n >= 1 && n <= 6)) return false;
  }

  const renderedNums = new Set(extractSectionNumsFromHtml(structuredHtml));
  const apiWithBody = apiSections.filter((s) => s.num > 0 && s.body.trim());

  for (const sec of apiWithBody) {
    if (!renderedNums.has(sec.num)) return true;
  }

  const apiBodyCount = apiWithBody.length;
  const renderedCount = renderedNums.size;
  if (apiBodyCount > renderedCount) return true;

  const maxApiNum = Math.max(...apiSections.map((s) => s.num));
  const maxRenderedNum = renderedNums.size ? Math.max(...renderedNums) : 0;
  if (maxApiNum > maxRenderedNum && apiWithBody.some((s) => s.num > maxRenderedNum)) {
    return true;
  }

  return false;
}

export function buildAiToolSectionAudit(opts: {
  toolType: string;
  variant: 'student' | 'teacher';
  display: string;
  structuredHtml: string | null | undefined;
  renderedPath: string;
  renderedHtml: string;
  preferMarkdown: boolean;
}): AiToolSectionAudit {
  const api = summarizeApiSections(opts.display);
  const structuredSectionNums = extractSectionNumsFromHtml(opts.structuredHtml || '');
  const renderedSectionNums = extractSectionNumsFromHtml(opts.renderedHtml);
  const renderedSet = new Set(renderedSectionNums);
  const missingFromRender = api.sections
    .filter((s) => s.hasBody && !renderedSet.has(s.num))
    .map((s) => s.num);

  return {
    toolType: opts.toolType,
    variant: opts.variant,
    apiSectionCount: api.count,
    apiSections: api.sections,
    structuredSectionNums,
    renderedPath: opts.renderedPath,
    renderedSectionNums,
    missingFromRender,
    preferMarkdown: opts.preferMarkdown,
  };
}

/** Dev-only: warn once per unique audit fingerprint when sections are missing on screen. */
const loggedAuditFingerprints = new Set<string>();

export function logAiToolSectionAudit(audit: AiToolSectionAudit): void {
  if (!__DEV__) return;
  if (audit.missingFromRender.length === 0) return;

  const apiNums = audit.apiSections.map((s) => s.num).join(',') || 'none';
  const renderedNums = audit.renderedSectionNums.join(',') || 'none';
  const missing = audit.missingFromRender.join(',');
  const fingerprint =
    `${audit.toolType}|${audit.variant}|${audit.renderedPath}|${apiNums}|${renderedNums}|${missing}`;

  if (loggedAuditFingerprints.has(fingerprint)) return;
  loggedAuditFingerprints.add(fingerprint);

  const detail = audit.apiSections
    .filter((s) => audit.missingFromRender.includes(s.num))
    .map((s) => `${s.num}:${s.title}`)
    .join(' | ');

  console.warn(
    `[AiToolSections] ${audit.toolType} (${audit.variant}) path=${audit.renderedPath} ` +
      `api=[${apiNums}] rendered=[${renderedNums}] missing=[${missing}] preferMarkdown=${audit.preferMarkdown}`,
  );
  if (detail) {
    console.warn(`[AiToolSections] Missing on screen for ${audit.toolType}: ${detail}`);
  }
}
