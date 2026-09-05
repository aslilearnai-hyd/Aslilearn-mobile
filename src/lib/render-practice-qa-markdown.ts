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

const TOOL_TYPE = 'smart-qa-practice-generator';

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

function section1Card(title: string, premium?: boolean): string {
  const base = {
    title,
    badge: 'Practice Set Title',
    border: 'border-violet-300',
    bg: 'bg-gradient-to-br from-violet-50/90 via-white to-sky-50/40',
    labelClass: 'text-violet-700',
    badgeClass: 'bg-violet-100 text-violet-900',
  };
  return premium
    ? themedSection1TitleCardHtmlPremium({ ...base, toolType: TOOL_TYPE })
    : themedSection1TitleCardHtml(base);
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
      if (/^\*\*Q\d+\.\*\*/i.test(t) || /^Q\d+\./i.test(t) || /^\*\*Q\d+/i.test(t)) {
        const qMatch = t.match(/^(?:\*\*)?(Q\d+)\.?(?:\*\*)?\s*(.*)$/i);
        if (qMatch) {
          const label = qMatch[1].replace(/^q/i, 'Q');
          const rest = formatInlineMarkdown(qMatch[2] || '');
          return (
            `<p class="text-sm text-slate-900 mb-2">` +
            `<strong class="ai-q-label">${label}.</strong>${rest ? ` ${rest}` : ''}` +
            `</p>`
          );
        }
      }
      if (/^###\s+Section\s*[A-G]/i.test(t)) {
        return `<h4 class="ai-section-subhead mt-3 mb-2">${formatInlineMarkdown(t.replace(/^###\s+/, ''))}</h4>`;
      }
      if (/^[A-D][\).]\s+/i.test(t)) {
        return `<p class="text-sm text-slate-700 mb-1 pl-4">${formatInlineMarkdown(t)}</p>`;
      }
      if (/^\d+\.\s+/.test(t)) {
        return `<p class="text-sm text-slate-800 mb-1 pl-1">${formatInlineMarkdown(t)}</p>`;
      }
      return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

/** Emerald-themed HTML for Smart Q&A Practice markdown sections. */
export function renderPracticeQaMarkdown(text: string, opts?: MarkdownRenderOpts): string {
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

  const flushSection = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    if (currentSection === 1) {
      const titleText = resolveSection1Title(bodyLines, currentTitle, docTitle);
      if (titleText) {
        sectionEntries.push({ num: 1, html: section1Card(titleText, opts?.premium) });
      }
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }
    const style = sectionStyle(currentSection);
    sectionEntries.push({
      num: currentSection,
      html: themedNumberedSectionCardHtml({
        sectionNum: currentSection,
        sectionTitle: currentTitle,
        bodyHtml: bodyLinesToHtml(bodyLines),
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: 'text-emerald-600',
        premium: opts?.premium,
        toolType: TOOL_TYPE,
      }),
    });
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || /^---+$/.test(t)) continue;

    const docLineTitle = parseMarkdownDocTitle(t);
    if (docLineTitle) {
      docTitle = docLineTitle;
      continue;
    }

    const heading = parseMarkdownSectionHeading(t);
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

  const hasSection1 = sectionEntries.some((e) => e.num === 1);
  if (!hasSection1 && docTitle) {
    sectionEntries.push({ num: 1, html: section1Card(docTitle, opts?.premium) });
  }

  const parts = sortSectionHtmlEntries(sectionEntries);

  const headerHtml = shouldRenderDocHeader(docTitle, sectionEntries)
    ? lightDocHeaderHtml({
        eyebrow: 'Smart Q&A Practice',
        titleHtml: formatInlineMarkdown(docTitle),
        theme: 'violet',
      })
    : '';

  return (
    `<div class="practice-qa-markdown space-y-1 rounded-3xl border border-violet-200/80 p-3 sm:p-4" ` +
    `style="background:linear-gradient(165deg,rgba(245,243,255,0.92),rgba(239,246,255,0.75) 45%,rgba(255,247,237,0.7));backdrop-filter:saturate(1.15)">` +
    headerHtml +
    parts.join('') +
    `</div>`
  );
}
