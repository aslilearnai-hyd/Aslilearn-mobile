import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';
import { lightDocHeaderHtml } from './ai-tool-html-primitives';
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

const TOOL_TYPE = 'quick-assignment-builder';

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
  if (chunk.includes('|') && /^\s*\|/m.test(chunk)) return renderMarkdown(chunk);
  return lines
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      return `<p class="text-sm text-slate-800 leading-relaxed mb-1">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

export function renderQuickAssignmentMarkdown(text: string, opts?: MarkdownRenderOpts): string {
  if (!text?.trim()) return '';

  const lines = text.split('\n');
  const sectionEntries: SectionHtmlEntry[] = [];
  let docTitle = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    let displayNum = currentSection;
    if (displayNum === 11) displayNum = 10;
    if (displayNum === 13) displayNum = 11;

    if (displayNum === 1) {
      const titleText = resolveSection1Title(bodyLines, currentTitle, docTitle);
      if (titleText) {
        sectionEntries.push({
          num: 1,
          html: opts?.premium
            ? themedSection1TitleCardHtmlPremium({
                title: titleText,
                badge: 'Assignment Title',
                border: 'border-amber-300',
                bg: 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
                labelClass: 'text-amber-700',
                badgeClass: 'bg-amber-100 text-amber-900',
                toolType: TOOL_TYPE,
              })
            : themedSection1TitleCardHtml({
                title: titleText,
                badge: 'Assignment Title',
                border: 'border-amber-300',
                bg: 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
                labelClass: 'text-amber-700',
                badgeClass: 'bg-amber-100 text-amber-900',
              }),
        });
      }
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }

    const style = sectionStyle(displayNum);
    sectionEntries.push({
      num: displayNum,
      html: themedNumberedSectionCardHtml({
        sectionNum: displayNum,
        sectionTitle: currentTitle,
        bodyHtml: bodyLinesToHtml(bodyLines),
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: 'text-amber-600',
        premium: opts?.premium,
        toolType: TOOL_TYPE,
      }),
    });
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^---+$/.test(line)) continue;

    const docLineTitle = parseMarkdownDocTitle(line);
    if (docLineTitle) {
      docTitle = docLineTitle;
      continue;
    }

    const heading = parseMarkdownSectionHeading(line);
    if (heading) {
      let num = heading.num;
      if (num === 11) num = 10;
      if (num === 13) num = 11;
      if (currentSection === num) {
        if (!currentTitle.trim() && heading.title.trim()) currentTitle = heading.title.trim();
        continue;
      }
      flushSection();
      currentSection = num;
      currentTitle = heading.title;
      continue;
    }
    if (currentSection > 0) bodyLines.push(raw);
  }
  flushSection();

  if (!sectionEntries.some((e) => e.num === 1) && docTitle) {
    sectionEntries.push({
      num: 1,
      html: opts?.premium
        ? themedSection1TitleCardHtmlPremium({
            title: docTitle,
            badge: 'Assignment Title',
            border: 'border-amber-300',
            bg: 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
            labelClass: 'text-amber-700',
            badgeClass: 'bg-amber-100 text-amber-900',
            toolType: TOOL_TYPE,
          })
        : themedSection1TitleCardHtml({
            title: docTitle,
            badge: 'Assignment Title',
            border: 'border-amber-300',
            bg: 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
            labelClass: 'text-amber-700',
            badgeClass: 'bg-amber-100 text-amber-900',
          }),
    });
  }

  const parts = sortSectionHtmlEntries(sectionEntries);

  const headerHtml = shouldRenderDocHeader(docTitle, sectionEntries)
    ? lightDocHeaderHtml({
        eyebrow: 'Quick Assignment Builder',
        titleHtml: formatInlineMarkdown(docTitle),
        theme: 'amber',
        extraClass: 'mb-3',
      })
    : '';

  return (
    `<div class="quick-assignment-markdown space-y-1 rounded-2xl border border-amber-200/80 p-3 sm:p-4" style="background-color:#fffbeb;background-image:radial-gradient(circle,rgba(245,158,11,0.08) 1px,transparent 1px);background-size:20px 20px">` +
      headerHtml +
      parts.join('') +
      `</div>`
  );
}
