import { formatInlineMarkdown } from './render-teacher-markdown';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';
import { sectionCardHtml } from './ai-tool-html-primitives';
import { resolveStudentSectionMeta, sectionIconSvg } from './student-section-icons';
import { looksLikeTemplateSectionTitle } from './ai-tool-display-content';

export type MarkdownRenderOpts = { premium?: boolean; toolType?: string };

/** `# Title` or `## Title` (without `N.` prefix) — common Super Admin doc headers. */
export function parseMarkdownDocTitle(line: string): string | null {
  const t = line.trim();
  const h1 = t.match(/^#\s+(.+)$/);
  if (h1 && !t.startsWith('##')) return stripAiToolGenerationLabel(h1[1].trim());
  const h2 = t.match(/^##\s+(.+)$/);
  if (h2 && !t.startsWith('###')) {
    const inner = h2[1].trim();
    if (!/^\d{1,2}\.\s/.test(inner)) return stripAiToolGenerationLabel(inner);
  }
  return null;
}

export function themedSection1TitleCardHtml(opts: {
  title: string;
  badge: string;
  border: string;
  bg: string;
  labelClass: string;
  badgeClass: string;
}): string {
  const safeTitle = stripAiToolGenerationLabel(opts.title, 'Untitled');
  return (
    `<section class="mb-3 overflow-hidden rounded-xl border ${opts.border} ${opts.bg} shadow-sm ai-tool-section-card ai-tool-section-full">` +
    `<div class="px-3 py-3 sm:px-4 sm:py-3.5">` +
    `<p class="text-[9px] font-bold uppercase tracking-wider ${opts.labelClass}">Section 1</p>` +
    `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold mt-1 ${opts.badgeClass}">${opts.badge}</span>` +
    `<h3 class="text-lg font-bold leading-snug text-slate-900 mt-2">${formatInlineMarkdown(safeTitle)}</h3>` +
    `</div></section>`
  );
}

export function themedNumberedSectionCardHtml(opts: {
  sectionNum: number;
  sectionTitle: string;
  bodyHtml: string;
  border: string;
  bg: string;
  titleClass: string;
  labelClass: string;
  toolType?: string;
  premium?: boolean;
}): string {
  const label = opts.sectionTitle.trim() || `Section ${opts.sectionNum}`;

  if (opts.premium && opts.toolType) {
    const meta = resolveStudentSectionMeta(opts.toolType, opts.sectionNum, label);
    if (meta) {
      return sectionCardHtml({
        sectionNum: `Section ${opts.sectionNum}`,
        title: meta.title,
        stripe: meta.stripe,
        iconWrap: meta.iconWrap,
        iconSvg: sectionIconSvg(meta.icon),
        borderColor: opts.border,
        bg: opts.bg,
        labelClass: opts.labelClass,
        titleClass: opts.titleClass,
        body: opts.bodyHtml,
      });
    }
  }

  return sectionCardHtml({
    sectionNum: `Section ${opts.sectionNum}`,
    title: label,
    stripe: opts.border.includes('border-')
      ? opts.border.replace('/80', '').replace('-200', '-500')
      : 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-800',
    iconSvg: sectionIconSvg('sparkles'),
    borderColor: opts.border,
    bg: opts.bg,
    labelClass: opts.labelClass,
    titleClass: opts.titleClass,
    body: opts.bodyHtml,
  });
}

export function themedSection1TitleCardHtmlPremium(opts: {
  title: string;
  badge: string;
  border: string;
  bg: string;
  labelClass: string;
  badgeClass: string;
  toolType: string;
}): string {
  const safeTitle = stripAiToolGenerationLabel(opts.title, 'Untitled');
  return (
    `<section class="relative mb-2 overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm ai-tool-section-card ai-tool-section-full">` +
    `<div class="absolute inset-0 bg-gradient-to-br from-sky-50/90 via-white to-teal-50/40"></div>` +
    `<div class="relative px-3 py-3 sm:px-4 sm:py-3.5">` +
    `<p class="mb-0.5 text-[9px] font-bold uppercase tracking-wider ${opts.labelClass}">Section 1</p>` +
    `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${opts.badgeClass}">${opts.badge}</span>` +
    `<h3 class="text-lg font-bold leading-snug text-slate-900 mt-2 sm:text-xl">${formatInlineMarkdown(safeTitle)}</h3>` +
    `</div></section>`
  );
}

export function bodyTextFromLines(bodyLines: string[]): string {
  return bodyLines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function normalizeSectionTitle(title: string): string {
  return stripAiToolGenerationLabel(String(title || '').replace(/^\d+\.\s*/, '')).toLowerCase();
}

export function sectionTitlesMatch(a: string, b: string): boolean {
  const left = normalizeSectionTitle(a);
  const right = normalizeSectionTitle(b);
  return Boolean(left && right && left === right);
}

/** Section 1 title: body text, then heading label, then document `#` title. */
export function resolveSection1Title(
  bodyLines: string[],
  sectionTitle: string,
  docTitle: string,
): string {
  return stripAiToolGenerationLabel(
    bodyTextFromLines(bodyLines) || sectionTitle.trim() || docTitle.trim(),
    'Untitled',
  );
}

export function hasSection1Entry(entries: SectionHtmlEntry[]): boolean {
  return entries.some((entry) => entry.num === 1);
}

/** Gradient doc header is redundant when a Section 1 card already exists. */
export function shouldRenderDocHeader(docTitle: string, entries: SectionHtmlEntry[]): boolean {
  if (!docTitle.trim()) return false;
  return !hasSection1Entry(entries);
}


/** Template sections: `### 2. Title`, `## 1. Title`, plain `1. Title`, or `Section 2: Title`. */
export function parseMarkdownSectionHeading(line: string): { num: number; title: string } | null {
  const t = line.trim();
  if (!t) return null;

  const md = t.match(/^#{1,4}\s+(\d{1,2})\.\s+(.+)$/i);
  if (md) return { num: Number(md[1]), title: md[2].trim() };

  const bold = t.match(/^\*{1,2}(\d{1,2})\.\s*(.+?)\*{1,2}\s*$/i);
  if (bold) return { num: Number(bold[1]), title: bold[2].trim() };

  const sectionLabel = t.match(/^Section\s+(\d{1,2})\s*[:\-—]\s*(.+)$/i);
  if (sectionLabel) return { num: Number(sectionLabel[1]), title: sectionLabel[2].trim() };

  const plain = t.match(/^(\d{1,2})\.\s+(.+)$/);
  if (plain) {
    const num = Number(plain[1]);
    const title = plain[2].trim();
    if (looksLikeTemplateSectionTitle(title, num)) {
      return { num, title };
    }
  }

  return null;
}

export type SectionHtmlEntry = { num: number; html: string };

/** Wrap numbered section cards in a grid (2 columns on tablet via CSS). */
export function joinSectionCardsInGrid(sectionHtmls: string[]): string {
  const joined = sectionHtmls.filter(Boolean).join('');
  if (!joined.trim()) return '';
  return markHeavyAiToolSectionsFullWidth(
    `<div class="ai-tool-sections-grid">${joined}</div>`,
  );
}

/** Tall / list-heavy sections span full width so short cards are not stretched beside them. */
export function markHeavyAiToolSectionsFullWidth(html: string): string {
  return html.replace(
    /<section class="([^"]*\bai-tool-section-card\b[^"]*)"([^>]*)>([\s\S]*?)<\/section>/gi,
    (full, className, attrs, body) => {
      if (className.includes('ai-tool-section-full')) return full;
      const plain = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const listItems = body.match(/<li[\s>]/gi)?.length ?? 0;
      const heavy =
        plain.length > 300 ||
        listItems > 4 ||
        /practice|mcq|optionRow|checkList|numberedSteps|stepRow|conceptCard|definitionRow|formulaRow|flashcard|practiceCard|practice-list/i.test(
          body,
        ) ||
        /Q\d|objective|subjective/i.test(plain);
      if (!heavy) return full;
      const nextClass = `${className} ai-tool-section-full`.replace(/\s+/g, ' ').trim();
      return `<section class="${nextClass}"${attrs}>${body}</section>`;
    },
  );
}

/**
 * After hero / doc headers, wrap consecutive section cards for tablet 2-column layout.
 * Phone layout stays a single column (grid CSS is tablet-only).
 */
export function wrapAiToolOutputSectionGrid(html: string): string {
  if (!html?.trim()) return html;

  let out = html;
  if (!html.includes('ai-tool-sections-grid')) {
    const firstIdx = html.search(/<section class="[^"]*\bai-tool-section-card\b/);
    if (firstIdx < 0) return markHeavyAiToolSectionsFullWidth(html);

    const prefix = html.slice(0, firstIdx);
    const rest = html.slice(firstIdx);
    const sectionRe = /<section class="[^"]*\bai-tool-section-card\b[^>]*>[\s\S]*?<\/section>/g;
    const sections: string[] = [];
    let consumed = 0;
    let match: RegExpExecArray | null;
    while ((match = sectionRe.exec(rest)) !== null) {
      if (match.index !== consumed) break;
      sections.push(match[0]);
      consumed = match.index + match[0].length;
    }
    const suffix = rest.slice(consumed);
    if (!sections.length) return markHeavyAiToolSectionsFullWidth(html);
    out = prefix + joinSectionCardsInGrid(sections) + suffix;
  }

  return markHeavyAiToolSectionsFullWidth(out);
}

function visibleTextFromHtml(html: string): number {
  const text = String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.replace(/untitled|section \d+/gi, '').trim().length === 0) return 0;
  return text.length;
}

/** One card per section number — prefer the entry with more visible body content. */
export function sortSectionHtmlEntries(entries: SectionHtmlEntry[]): string[] {
  const byNum = new Map<number, SectionHtmlEntry>();
  for (const entry of entries) {
    const prev = byNum.get(entry.num);
    if (!prev) {
      byNum.set(entry.num, entry);
      continue;
    }
    if (visibleTextFromHtml(entry.html) > visibleTextFromHtml(prev.html)) {
      byNum.set(entry.num, entry);
    }
  }
  return [...byNum.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, entry]) => entry.html);
}
