import { getAiToolIonicon } from './ai-tool-icons';

export type SectionVisualMeta = {
  title: string;
  stripe: string;
  iconWrap: string;
  icon: string;
};

/** Canonical section labels + icons — aligned with asli-frontend viewers. */
export const STUDENT_TOOL_SECTIONS: Record<string, Record<number, SectionVisualMeta>> = {
  'smart-study-guide-generator': {
    2: { title: 'Chapter and Subtopic Overview', stripe: 'border-blue-500', iconWrap: 'bg-blue-100 text-blue-800', icon: 'bookOpen' },
    3: { title: 'Learning Objectives', stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', icon: 'target' },
    4: { title: 'Prior Knowledge Required', stripe: 'border-cyan-500', iconWrap: 'bg-cyan-100 text-cyan-800', icon: 'graduationCap' },
    5: { title: 'Key Concepts Explained', stripe: 'border-indigo-600', iconWrap: 'bg-indigo-100 text-indigo-800', icon: 'brain' },
    6: { title: 'Definitions and Formulae', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', icon: 'sigma' },
    7: { title: 'Concept Flow / Mind Map', stripe: 'border-teal-500', iconWrap: 'bg-teal-100 text-teal-800', icon: 'gitBranch' },
    8: { title: 'Real-life Examples', stripe: 'border-lime-600', iconWrap: 'bg-lime-100 text-lime-900', icon: 'lightbulb' },
    9: { title: 'Quick Revision Notes', stripe: 'border-orange-500', iconWrap: 'bg-orange-100 text-orange-800', icon: 'listChecks' },
    10: { title: 'Practice Questions', stripe: 'border-indigo-600', iconWrap: 'bg-indigo-100 text-indigo-800', icon: 'fileQuestion' },
    11: { title: 'Tips for Further Improvement', stripe: 'border-fuchsia-500', iconWrap: 'bg-fuchsia-100 text-fuchsia-800', icon: 'sparkles' },
  },
  'concept-breakdown-explainer': {
    2: { title: 'Simple Definition', stripe: 'border-blue-500', iconWrap: 'bg-blue-100 text-blue-800', icon: 'brain' },
    3: { title: 'Step-by-step Concept Breakdown', stripe: 'border-indigo-500', iconWrap: 'bg-indigo-100 text-indigo-800', icon: 'listOrdered' },
    4: { title: 'Real-life and Indian Context Examples', stripe: 'border-orange-500', iconWrap: 'bg-orange-100 text-orange-800', icon: 'lightbulb' },
    5: { title: 'Important Terms and Keywords', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', icon: 'tag' },
    6: { title: 'Concept Check Questions', stripe: 'border-cyan-500', iconWrap: 'bg-cyan-100 text-cyan-800', icon: 'helpCircle' },
    7: { title: 'Application-based Thinking Question', stripe: 'border-orange-500', iconWrap: 'bg-orange-100 text-orange-800', icon: 'messageCircle' },
    8: { title: 'Higher-order Thinking Prompt', stripe: 'border-fuchsia-500', iconWrap: 'bg-fuchsia-100 text-fuchsia-800', icon: 'zap' },
    9: { title: 'Quick Revision Summary', stripe: 'border-violet-600', iconWrap: 'bg-violet-100 text-violet-900', icon: 'sparkles' },
  },
  'chapter-summary-creator': {
    2: { title: 'Overview of the Chapter', stripe: 'border-sky-500', iconWrap: 'bg-sky-100 text-sky-800', icon: 'bookOpen' },
    3: { title: 'Learning Objectives', stripe: 'border-indigo-500', iconWrap: 'bg-indigo-100 text-indigo-800', icon: 'target' },
    4: { title: 'Important Concepts and Explanations', stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', icon: 'sparkles' },
    5: { title: 'Key Definitions and Terms', stripe: 'border-purple-500', iconWrap: 'bg-purple-100 text-purple-800', icon: 'listChecks' },
    6: { title: 'Formulae / Rules / Important Facts', stripe: 'border-fuchsia-500', iconWrap: 'bg-fuchsia-100 text-fuchsia-800', icon: 'sigma' },
    7: { title: 'Concept Connections', stripe: 'border-cyan-500', iconWrap: 'bg-cyan-100 text-cyan-800', icon: 'gitBranch' },
    8: { title: 'Real-life Applications', stripe: 'border-rose-500', iconWrap: 'bg-rose-100 text-rose-800', icon: 'lightbulb' },
    9: { title: 'Quick Revision Notes', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', icon: 'bookText' },
    10: { title: 'Practice Recall Questions', stripe: 'border-blue-600', iconWrap: 'bg-blue-100 text-blue-900', icon: 'fileQuestion' },
  },
  'key-points-formula-extractor': {
    2: { title: 'Most Important Concepts', stripe: 'border-orange-500', iconWrap: 'bg-orange-100 text-orange-800', icon: 'sparkles' },
    3: { title: 'Essential Definitions', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', icon: 'listChecks' },
    4: { title: 'Important Formulae / Rules', stripe: 'border-yellow-500', iconWrap: 'bg-yellow-100 text-yellow-900', icon: 'sigma' },
    5: { title: 'Keywords and Terminologies', stripe: 'border-lime-500', iconWrap: 'bg-lime-100 text-lime-900', icon: 'tags' },
    6: { title: 'Must-remember Facts', stripe: 'border-teal-500', iconWrap: 'bg-teal-100 text-teal-800', icon: 'star' },
    7: { title: 'Real-life Connections', stripe: 'border-cyan-500', iconWrap: 'bg-cyan-100 text-cyan-800', icon: 'leaf' },
    8: { title: 'Common Mistakes to Avoid', stripe: 'border-rose-500', iconWrap: 'bg-rose-100 text-rose-800', icon: 'alertTriangle' },
    9: { title: 'Exam Tips', stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', icon: 'graduationCap' },
    10: { title: 'One-minute Summary', stripe: 'border-amber-600', iconWrap: 'bg-amber-100 text-amber-950', icon: 'clock' },
  },
  'quick-assignment-builder': {
    2: { title: 'Learning Objectives', stripe: 'border-red-500', iconWrap: 'bg-red-100 text-red-800', icon: 'target' },
    3: { title: 'Instructions to Students', stripe: 'border-orange-500', iconWrap: 'bg-orange-100 text-orange-800', icon: 'clipboardList' },
    4: { title: 'Concept-based Questions', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', icon: 'fileQuestion' },
    5: { title: 'Application-oriented Tasks', stripe: 'border-yellow-500', iconWrap: 'bg-yellow-100 text-yellow-900', icon: 'sparkles' },
    6: { title: 'Real-life / Competency-based Activity', stripe: 'border-lime-500', iconWrap: 'bg-lime-100 text-lime-900', icon: 'flask' },
    7: { title: 'Creative Thinking Question', stripe: 'border-fuchsia-500', iconWrap: 'bg-fuchsia-100 text-fuchsia-800', icon: 'lightbulb' },
    8: { title: 'Collaborative / Discussion Task (if suitable)', stripe: 'border-teal-500', iconWrap: 'bg-teal-100 text-teal-800', icon: 'users' },
    9: { title: 'Challenge Question for Advanced Learners', stripe: 'border-cyan-500', iconWrap: 'bg-cyan-100 text-cyan-800', icon: 'rocket' },
    10: { title: 'Assessment Criteria / Rubric', stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', icon: 'scale' },
    11: { title: 'Submission Guidelines', stripe: 'border-indigo-500', iconWrap: 'bg-indigo-100 text-indigo-800', icon: 'send' },
  },
  'smart-qa-practice-generator': {
    2: { title: 'Learning Objectives', stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', icon: 'target' },
    3: { title: 'Instructions to Students', stripe: 'border-sky-500', iconWrap: 'bg-sky-100 text-sky-800', icon: 'bookOpen' },
    11: { title: 'Answer Key with Explanations', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', icon: 'checkCircle' },
  },
  'mock-test-builder': {
    2: { title: 'Test Purpose and Subtopic Link', stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-800', icon: 'target' },
    3: { title: "Learning Objectives – Bloom's Taxonomy", stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', icon: 'brain' },
    4: { title: 'NCF Competency / Learning Outcome Alignment', stripe: 'border-cyan-500', iconWrap: 'bg-cyan-100 text-cyan-800', icon: 'graduationCap' },
    5: { title: 'Instructions for Students', stripe: 'border-slate-500', iconWrap: 'bg-slate-100 text-slate-800', icon: 'clipboardList' },
    6: { title: 'Question Paper', stripe: 'border-rose-600', iconWrap: 'bg-rose-100 text-rose-800', icon: 'fileQuestion' },
    7: { title: 'Answer Key', stripe: 'border-sky-500', iconWrap: 'bg-sky-100 text-sky-800', icon: 'checkCircle' },
    8: { title: 'Step-by-step Solutions / Explanations', stripe: 'border-sky-500', iconWrap: 'bg-sky-100 text-sky-800', icon: 'bookOpen' },
    9: { title: 'Remedial / Revision Suggestions', stripe: 'border-amber-600', iconWrap: 'bg-amber-100 text-amber-900', icon: 'refresh' },
    10: { title: 'Expected Learning Outcomes', stripe: 'border-indigo-500', iconWrap: 'bg-indigo-100 text-indigo-800', icon: 'flag' },
    11: { title: 'Real-life Application', stripe: 'border-lime-600', iconWrap: 'bg-lime-100 text-lime-900', icon: 'leaf' },
    12: { title: 'Reflection / Exit Ticket', stripe: 'border-fuchsia-500', iconWrap: 'bg-fuchsia-100 text-fuchsia-800', icon: 'messageCircle' },
  },
};

const SVG_BASE =
  'xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const ICON_PATHS: Record<string, string> = {
  bookOpen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  graduationCap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>',
  sigma: '<path d="M18 8c0-3.613-3.869-7.429-5.393-8.805a1 1 0 0 0-1.214 0C9.87.571 6 4.388 6 8v9a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3Z"/><path d="M6 8h12"/>',
  gitBranch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  listChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  fileQuestion: '<path d="M12 17h.01"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  listOrdered: '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  helpCircle: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  messageCircle: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  bookText: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M8 11h8"/><path d="M8 7h6"/>',
  tags: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/><path d="M16 8h.01"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  clipboardList: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  flask: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  checkCircle: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  document: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
};

const HERO_ICON_BY_TOOL: Record<string, string> = {
  'smart-study-guide-generator': 'bookmark',
  'concept-breakdown-explainer': 'bulb',
  'smart-qa-practice-generator': 'helpCircle',
  'chapter-summary-creator': 'bookOpen',
  'key-points-formula-extractor': 'key',
  'quick-assignment-builder': 'clipboard',
  'my-study-decks': 'card',
  'mock-test-builder': 'checkCircle',
  'project-idea-lab': 'sparkles',
  'reading-practice-room': 'bookOpen',
  'study-schedule-maker': 'calendar',
};

export function sectionIconSvg(iconKey: string): string {
  const paths = ICON_PATHS[iconKey] || ICON_PATHS.sparkles;
  return `<svg ${SVG_BASE}>${paths}</svg>`;
}

export function sectionNumberIconSvg(num: number, toolType?: string): string {
  if (toolType) {
    const meta = STUDENT_TOOL_SECTIONS[toolType]?.[num];
    if (meta) return sectionIconSvg(meta.icon);
  }
  const label = num > 0 ? String(num) : '•';
  return `<span class="text-sm font-bold tabular-nums leading-none">${label}</span>`;
}

export function resolveStudentSectionMeta(
  toolType: string,
  sectionNum: number,
  fallbackTitle = '',
): SectionVisualMeta | null {
  const canonical = STUDENT_TOOL_SECTIONS[toolType]?.[sectionNum];
  if (canonical) return canonical;
  if (!fallbackTitle.trim()) return null;
  return {
    title: fallbackTitle.trim(),
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-800',
    icon: 'sparkles',
  };
}

export function premiumToolHeroIconHtml(toolType: string, wrapClass: string): string {
  const iconKey = HERO_ICON_BY_TOOL[toolType] || 'sparkles';
  return `<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${wrapClass}">${sectionIconSvg(iconKey)}</div>`;
}

/** Native RN icon name for tool hero / empty states. */
export function getStudentToolIonicon(toolType: string) {
  return getAiToolIonicon(toolType);
}
