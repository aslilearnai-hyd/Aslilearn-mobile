import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';
import { lightDocHeaderHtml } from './ai-tool-html-primitives';
import {
  themedNumberedSectionCardHtml,
  type MarkdownRenderOpts,
} from './themed-markdown-sections';

const DEFAULT_TOOL_TYPE = 'mock-test-builder';

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

function formatBodyLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '__UL_OPEN__' || trimmed === '__UL_CLOSE__') return '';
  if (/^>\s*/.test(trimmed)) {
    return `<p class="text-xs italic text-indigo-700/90 mb-2">${formatInlineMarkdown(trimmed.replace(/^>\s*/, ''))}</p>`;
  }

  // Q1 / Q2 labels — stripMarkdown removes ** so wrap the label in <strong> ourselves.
  const qMatch = trimmed.match(/^(?:\*\*)?(Q\d+)\.?(?:\*\*)?\s*(.*)$/i);
  if (qMatch && /^Q\d+$/i.test(qMatch[1])) {
    const label = qMatch[1].toUpperCase().replace(/^q/i, 'Q');
    const rest = formatInlineMarkdown(qMatch[2] || '');
    return (
      `<div class="rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 px-3 py-2 mb-2">` +
      `<p class="text-sm text-slate-900 leading-snug">` +
      `<strong class="ai-q-label">${label}.</strong>${rest ? ` ${rest}` : ''}` +
      `</p></div>`
    );
  }

  if (/^###\s+Section\s*[A-E]/i.test(trimmed)) {
    return (
      `<h4 class="ai-section-subhead mt-3 mb-2 pb-1 border-b border-indigo-200">` +
      `${formatInlineMarkdown(trimmed.replace(/^###\s+/, ''))}` +
      `</h4>`
    );
  }
  if (/^###\s+/.test(trimmed)) {
    return (
      `<h4 class="ai-section-subhead mt-2 mb-1">` +
      `${formatInlineMarkdown(trimmed.replace(/^###\s+/, ''))}` +
      `</h4>`
    );
  }
  if (/^\d+\.\s+/.test(trimmed)) {
    return (
      `<p class="text-sm text-slate-800 mb-1 pl-1">` +
      `<strong class="ai-q-label">${trimmed.match(/^\d+/)?.[0]}.</strong> ` +
      `${formatInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}` +
      `</p>`
    );
  }
  return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(trimmed)}</p>`;
}

function bodyLinesToHtml(lines: string[]): string {
  const chunk = lines.join('\n').trim();
  if (!chunk) return '';
  if (chunk.includes('|') && /^\s*\|/m.test(chunk)) {
    return renderMarkdown(chunk);
  }
  const out: string[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (!listBuf.length) return;
    out.push(
      `<ul class="list-disc pl-5 space-y-1 mb-2">${listBuf
        .map(
          (li) =>
            `<li class="text-sm text-slate-800">${formatInlineMarkdown(li)}</li>`,
        )
        .join('')}</ul>`,
    );
    listBuf = [];
  };
  for (const raw of lines) {
    const t = raw.trim();
    if (/^[-*]\s+/.test(t)) {
      listBuf.push(t.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushList();
    const html = formatBodyLine(raw);
    if (html) out.push(html);
  }
  flushList();
  return out.join('');
}

/** HTML for Mock Test / Exam numbered markdown (## 1. … sections). */
export function renderMockTestMarkdown(text: string, opts?: MarkdownRenderOpts): string {
  if (!text?.trim()) return '';

  const toolType = opts?.toolType || DEFAULT_TOOL_TYPE;
  const isExam = toolType === 'exam-question-paper-generator';

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
  const parts: string[] = [];
  let docHeader = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    // Exam papers only use sections 1–6 (title + A–E). Drop mock-test Remedial/etc. cards.
    if (isExam && currentSection > 6) {
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }
    const style = sectionStyle(currentSection || 1);
    const bodyHtml = bodyLinesToHtml(bodyLines);
    parts.push(
      themedNumberedSectionCardHtml({
        sectionNum: currentSection,
        sectionTitle: currentTitle,
        bodyHtml,
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: isExam ? 'text-blue-500' : 'text-indigo-500',
        premium: opts?.premium,
        toolType,
      }),
    );
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^---+$/.test(trimmed)) continue;
    if (/^>\s*\*\*Mock Test Builder\*\*/i.test(trimmed)) {
      parts.push(
        `<p class="text-xs text-indigo-700/90 mb-3 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2">${formatInlineMarkdown(trimmed.replace(/^>\s*/, ''))}</p>`,
      );
      continue;
    }

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1 && !trimmed.startsWith('##')) {
      docHeader = lightDocHeaderHtml({
        eyebrow: isExam ? 'Exam Question Paper' : 'Mock Test Builder',
        titleHtml: formatInlineMarkdown(h1[1].trim()),
        theme: isExam ? 'blue' : 'indigo',
        titleTag: 'h1',
      });
      continue;
    }

    const mainSec = trimmed.match(/^##\s+(\d{1,2})\.\s*(.+)$/);
    if (mainSec) {
      flushSection();
      currentSection = Number(mainSec[1]);
      currentTitle = mainSec[2].trim();
      continue;
    }

    const legacySec = trimmed.match(/^###\s+(\d{1,2})\.\s*(.+)$/);
    if (legacySec) {
      flushSection();
      currentSection = Number(legacySec[1]);
      currentTitle = legacySec[2].trim();
      continue;
    }

    if (currentSection > 0) bodyLines.push(raw);
  }

  flushSection();

  if (!parts.length) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${lines.map((l) => formatBodyLine(l)).join('')}</div>`;
  }

  return (
    `<div class="${isExam ? 'exam-paper-markdown' : 'mock-test-markdown'} space-y-1 rounded-2xl border ${isExam ? 'border-blue-200/80' : 'border-indigo-200/80'} p-3 sm:p-4" style="background-color:${isExam ? '#eff6ff' : '#eef2ff'};background-image:radial-gradient(circle,rgba(${isExam ? '37,99,235' : '99,102,241'},0.08) 1px,transparent 1px);background-size:20px 20px">` +
    docHeader +
    parts.join('') +
    `</div>`
  );
}

export function looksLikeMockTestContent(text: string): boolean {
  const sample = String(text || '').slice(0, 12000);
  if (!sample.trim()) return false;
  if (
    /paper\s*title\s*and\s*general\s*instructions/i.test(sample) ||
    /blueprint\s*\/\s*design\s*grid/i.test(sample) ||
    /rubric\s*for\s*open[-\s]?ended/i.test(sample)
  ) {
    return false;
  }
  const hasTemplate =
    /question\s*paper/i.test(sample) &&
    (/answer\s*key/i.test(sample) || /step-by-step\s*solutions/i.test(sample));
  const hasNumberedSections = /(?:^|\n)\s*#{1,3}\s*\d{1,2}\.\s+/m.test(sample);
  const hasMockLabel = /mock\s*test/i.test(sample);
  return hasTemplate && (hasNumberedSections || hasMockLabel);
}
