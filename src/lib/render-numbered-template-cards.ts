import {
  emptySectionPlaceholderHtml,
  heroTitleCardHtml,
  sectionNumberIconSvg,
} from './ai-tool-html-primitives';
import { themedNumberedSectionCardHtml, type MarkdownRenderOpts } from './themed-markdown-sections';
import { parseNumberedTemplateSections } from './ai-tool-display-content';
import { sectionTitlesMatch, joinSectionCardsInGrid } from './themed-markdown-sections';
import { renderMarkdown } from './render-teacher-markdown';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';

type ThemeName = 'indigo' | 'orange' | 'violet' | 'blue' | 'amber' | 'emerald';

const TOOL_META: Record<string, { eyebrow: string; theme: ThemeName }> = {
  'smart-study-guide-generator': { eyebrow: 'Smart Study Guide', theme: 'indigo' },
  'concept-breakdown-explainer': { eyebrow: 'Concept Breakdown', theme: 'violet' },
  'chapter-summary-creator': { eyebrow: 'Chapter Summary', theme: 'blue' },
  'key-points-formula-extractor': { eyebrow: 'Key Points & Formulae', theme: 'amber' },
  'quick-assignment-builder': { eyebrow: 'Quick Assignment', theme: 'orange' },
  'smart-qa-practice-generator': { eyebrow: 'Practice Q&A', theme: 'orange' },
  'lesson-planner': { eyebrow: 'Lesson Planner', theme: 'amber' },
  'study-schedule-maker': { eyebrow: 'Study Schedule', theme: 'violet' },
  'daily-class-plan-maker': { eyebrow: 'Daily Class Plan', theme: 'indigo' },
  'homework-creator': { eyebrow: 'Homework Creator', theme: 'orange' },
  'story-passage-creator': { eyebrow: 'Story & Passage', theme: 'blue' },
  'reading-practice-room': { eyebrow: 'Reading Practice', theme: 'blue' },
  'short-notes-summaries-maker': { eyebrow: 'Short Notes', theme: 'blue' },
  'flashcard-generator': { eyebrow: 'Study Decks', theme: 'violet' },
  'my-study-decks': { eyebrow: 'Study Decks', theme: 'violet' },
  'exam-question-paper-generator': { eyebrow: 'Exam Paper', theme: 'blue' },
  'mock-test-builder': { eyebrow: 'Mock Test', theme: 'violet' },
  'activity-project-generator': { eyebrow: 'Activities & Projects', theme: 'indigo' },
  'project-idea-lab': { eyebrow: 'Project Idea Lab', theme: 'amber' },
  'worksheet-mcq-generator': { eyebrow: 'Worksheet & MCQ', theme: 'indigo' },
  'concept-mastery-helper': { eyebrow: 'Concept Mastery', theme: 'violet' },
};

/** Homework Creator: section 1 is the doc title; sections 2–10 are always shown on web. */
const HOMEWORK_CANONICAL_SECTIONS: Array<{ num: number; title: string }> = [
  { num: 2, title: 'Clear Student Instructions' },
  { num: 3, title: 'Practice Questions' },
  { num: 4, title: 'Application-based Tasks' },
  { num: 5, title: 'One Creative / Thinking Question' },
  { num: 6, title: 'One Real-life Observation Task' },
  { num: 7, title: 'Challenge Question' },
  { num: 8, title: 'Support Hint for Struggling Learners' },
  { num: 9, title: 'Answer Hints / Key Points' },
  { num: 10, title: 'Parent Note' },
];

function fillCanonicalSections(
  toolType: string,
  sections: Array<{ num: number; title: string; body: string }>,
): Array<{ num: number; title: string; body: string }> {
  if (toolType !== 'homework-creator') return sections;
  const byNum = new Map(sections.map((s) => [s.num, s]));
  return HOMEWORK_CANONICAL_SECTIONS.map(({ num, title }) => {
    const found = byNum.get(num);
    return {
      num,
      title: found?.title.replace(/^\d+\.\s*/, '') || title,
      body: found?.body || '',
    };
  });
}

const SECTION_THEME_CYCLE = [
  {
    border: 'border-indigo-200/80',
    bg: 'bg-indigo-50/80',
    title: 'text-indigo-900',
    label: 'text-indigo-600',
  },
  {
    border: 'border-violet-200/80',
    bg: 'bg-violet-50/80',
    title: 'text-violet-900',
    label: 'text-violet-600',
  },
  {
    border: 'border-rose-200/80',
    bg: 'bg-rose-50/80',
    title: 'text-rose-900',
    label: 'text-rose-600',
  },
  {
    border: 'border-sky-200/80',
    bg: 'bg-sky-50/80',
    title: 'text-sky-900',
    label: 'text-sky-600',
  },
  {
    border: 'border-amber-200/80',
    bg: 'bg-amber-50/80',
    title: 'text-amber-900',
    label: 'text-amber-700',
  },
  {
    border: 'border-teal-200/80',
    bg: 'bg-teal-50/80',
    title: 'text-teal-900',
    label: 'text-teal-600',
  },
];

function sectionBodyHtml(body: string): string {
  if (!body.trim()) return emptySectionPlaceholderHtml();
  return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(body)}</div>`;
}

/** Card-based layout for Super Admin numbered templates (teacher tools + fallbacks). */
export function renderNumberedTemplateAsCards(
  toolType: string,
  text: string,
  opts?: MarkdownRenderOpts,
): string {
  if (!text?.trim()) return '';

  const meta = TOOL_META[toolType] || { eyebrow: 'Generated Content', theme: 'indigo' as ThemeName };
  const { title, sections } = parseNumberedTemplateSections(text);

  const section1 = sections.find((s) => s.num === 1);
  const heroTitle = stripAiToolGenerationLabel(
    title ||
      section1?.body.trim() ||
      section1?.title.replace(/^\d+\.\s*/, '') ||
      meta.eyebrow,
    meta.eyebrow,
  );

  const sorted = fillCanonicalSections(
    toolType,
    [...sections].filter((s) => s.num > 0).sort((a, b) => a.num - b.num),
  );
  const completedCount = sorted.filter((sec) => sec.body.trim()).length;
  const progressPct = sorted.length ? Math.round((completedCount / sorted.length) * 100) : undefined;

  let html = heroTitleCardHtml({
    eyebrow: meta.eyebrow,
    title: heroTitle,
    theme: meta.theme,
    toolType,
    premium: opts?.premium,
    badge: sorted.length ? `${sorted.length} sections` : undefined,
    progressPct,
  });

  const visibleSections = sorted.filter((sec) => {
    if (sec.num !== 1) return true;
    // Hero card already represents Section 1 (title). Skip empty duplicate Section 1 cards.
    if (!sec.body.trim()) return false;
    if (title && sectionTitlesMatch(title, sec.title)) return false;
    if (sectionTitlesMatch(heroTitle, sec.title)) return false;
    if (sectionTitlesMatch(heroTitle, sec.body.trim())) return false;
    return true;
  });

  const sectionCards: string[] = [];
  (visibleSections.length ? visibleSections : sorted).forEach((sec, index) => {
    if (!sec.body.trim() && toolType !== 'homework-creator') return;
    const theme = SECTION_THEME_CYCLE[index % SECTION_THEME_CYCLE.length];
    sectionCards.push(
      themedNumberedSectionCardHtml({
      sectionNum: sec.num,
      sectionTitle: stripAiToolGenerationLabel(sec.title.replace(/^\d+\.\s*/, ''), sec.title.replace(/^\d+\.\s*/, '')),
      bodyHtml: sectionBodyHtml(sec.body),
      border: theme.border,
      bg: theme.bg,
      titleClass: theme.title,
      labelClass: theme.label,
      premium: opts?.premium,
      toolType,
    }),
    );
  });

  return html + joinSectionCardsInGrid(sectionCards);
}
