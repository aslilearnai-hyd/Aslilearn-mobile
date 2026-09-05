import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';
import { emptySectionPlaceholderHtml, lightDocHeaderHtml } from './ai-tool-html-primitives';
import {
  parseMarkdownDocTitle,
  parseMarkdownSectionHeading,
  resolveSection1Title,
  shouldRenderDocHeader,
  sortSectionHtmlEntries,
  type SectionHtmlEntry,
  themedNumberedSectionCardHtml,
  themedSection1TitleCardHtml,
  themedSection1TitleCardHtmlPremium,
  type MarkdownRenderOpts,
} from './themed-markdown-sections';

const TOOL_TYPE = 'concept-breakdown-explainer';

const SECTION_STYLES: Record<number, { border: string; bg: string; title: string }> = {
  1: { border: 'border-violet-200', bg: 'bg-violet-50/70', title: 'text-violet-900' },
  2: { border: 'border-sky-200', bg: 'bg-sky-50/70', title: 'text-sky-900' },
  3: { border: 'border-amber-200', bg: 'bg-amber-50/70', title: 'text-amber-900' },
  4: { border: 'border-rose-200', bg: 'bg-rose-50/70', title: 'text-rose-900' },
  5: { border: 'border-indigo-200', bg: 'bg-indigo-50/70', title: 'text-indigo-900' },
  6: { border: 'border-cyan-200', bg: 'bg-cyan-50/70', title: 'text-cyan-900' },
  7: { border: 'border-orange-200', bg: 'bg-orange-50/70', title: 'text-orange-900' },
  8: { border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/70', title: 'text-fuchsia-900' },
  9: { border: 'border-blue-200', bg: 'bg-blue-50/70', title: 'text-blue-900' },
  10: { border: 'border-teal-200', bg: 'bg-teal-50/70', title: 'text-teal-900' },
  11: { border: 'border-violet-200', bg: 'bg-violet-50/70', title: 'text-violet-900' },
  12: { border: 'border-sky-200', bg: 'bg-sky-50/70', title: 'text-sky-900' },
};

function sectionStyle(num: number) {
  return SECTION_STYLES[num] || SECTION_STYLES[1];
}

function bodyLinesToHtml(lines: string[]): string {
  const chunk = lines.join('\n').trim();
  if (!chunk) return '';
  if (chunk.includes('|') && /^\s*\|/m.test(chunk)) {
    return renderMarkdown(chunk);
  }
  return lines
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      if (/^\d+\.\s+/.test(t)) {
        return `<p class="text-sm text-slate-800 mb-1 pl-1"><span class="font-semibold text-violet-700">${t.match(/^\d+/)?.[0]}.</span> ${formatInlineMarkdown(t.replace(/^\d+\.\s+/, ''))}</p>`;
      }
      return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

/** Violet-themed HTML for Concept Breakdown markdown sections. */
export function renderConceptBreakdownMarkdown(text: string, opts?: MarkdownRenderOpts): string {
  if (!text?.trim()) return '';

  let processed = text;
  try {
    if (text.trim().startsWith('{') && text.includes('"formatted"')) {
      const parsed = JSON.parse(text) as { formatted?: string };
      if (parsed.formatted) processed = parsed.formatted;
    }
  } catch {
    /* use raw */
  }

  const lines = processed.split('\n');
  const sectionEntries: SectionHtmlEntry[] = [];
  let docTitle = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];
  let renderedSection1 = false;

  const flushSection = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    if (currentSection === 1) {
      const titleText = resolveSection1Title(bodyLines, currentTitle, docTitle);
      if (titleText) {
        sectionEntries.push({
          num: 1,
          html: opts?.premium
            ? themedSection1TitleCardHtmlPremium({
                title: titleText,
                badge: 'Concept Title',
                border: 'border-violet-300',
                bg: 'bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
                labelClass: 'text-violet-700',
                badgeClass: 'bg-violet-100 text-violet-900',
                toolType: TOOL_TYPE,
              })
            : themedSection1TitleCardHtml({
                title: titleText,
                badge: 'Concept Title',
                border: 'border-violet-300',
                bg: 'bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
                labelClass: 'text-violet-700',
                badgeClass: 'bg-violet-100 text-violet-900',
              }),
        });
        renderedSection1 = true;
      }
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }
    const style = sectionStyle(currentSection);
    let bodyHtml = bodyLinesToHtml(bodyLines);
    if (!bodyHtml.trim()) {
      bodyHtml = emptySectionPlaceholderHtml();
    }
    sectionEntries.push({
      num: currentSection,
      html: themedNumberedSectionCardHtml({
        sectionNum: currentSection,
        sectionTitle: currentTitle,
        bodyHtml,
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: 'text-violet-600',
        premium: opts?.premium,
        toolType: TOOL_TYPE,
      }),
    });
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || /^---+$/.test(trimmed)) continue;
    if (/^>\s/.test(trimmed)) continue;

    const docLineTitle = parseMarkdownDocTitle(trimmed);
    if (docLineTitle) {
      docTitle = docLineTitle;
      continue;
    }

    const heading = parseMarkdownSectionHeading(trimmed);
    if (heading) {
      if (currentSection === heading.num) {
        if (!currentTitle.trim() && heading.title.trim()) currentTitle = heading.title.trim();
        continue;
      }
      flushSection();
      currentSection = heading.num;
      currentTitle = heading.title;
      continue;
    }

    if (currentSection > 0) bodyLines.push(raw);
  }

  flushSection();

  if (!renderedSection1 && docTitle) {
    sectionEntries.unshift({
      num: 1,
      html: opts?.premium
        ? themedSection1TitleCardHtmlPremium({
            title: docTitle,
            badge: 'Concept Title',
            border: 'border-violet-300',
            bg: 'bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
            labelClass: 'text-violet-700',
            badgeClass: 'bg-violet-100 text-violet-900',
            toolType: TOOL_TYPE,
          })
        : themedSection1TitleCardHtml({
            title: docTitle,
            badge: 'Concept Title',
            border: 'border-violet-300',
            bg: 'bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
            labelClass: 'text-violet-700',
            badgeClass: 'bg-violet-100 text-violet-900',
          }),
    });
  }

  const parts = sortSectionHtmlEntries(sectionEntries);

  const docHeader = shouldRenderDocHeader(docTitle, sectionEntries)
    ? lightDocHeaderHtml({
        eyebrow: 'Concept Breakdown Explainer',
        titleHtml: formatInlineMarkdown(docTitle),
        theme: 'violet',
        titleTag: 'h1',
      })
    : '';

  if (!parts.length) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(processed)}</div>`;
  }

  return (
    `<div class="concept-breakdown-markdown space-y-1 rounded-2xl border border-violet-200/80 p-3 sm:p-4" style="background-color:#f5f3ff;background-image:radial-gradient(circle,rgba(139,92,246,0.08) 1px,transparent 1px);background-size:20px 20px">` +
    docHeader +
    parts.join('') +
    `</div>`
  );
}
