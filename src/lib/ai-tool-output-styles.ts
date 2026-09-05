/**
 * Inline CSS for AI tool WebView output.
 * Replaces Tailwind CDN — external scripts often fail in React Native WebView.
 */

import { AI_TOOL_SELECTION_GUARD_CSS } from './ai-tool-selection-guard';

const PALETTE: Record<string, Partial<Record<number | string, string>>> = {
  slate: { 50: '#f8fafc', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 700: '#374151', 800: '#1f2937', 900: '#111827' },
  stone: { 200: '#e7e5e4', 400: '#a8a29e', 500: '#78716c', 700: '#44403c', 900: '#1c1917' },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 500: '#f97316', 600: '#ea580c', 800: '#9a3412', 900: '#7c2d12' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 500: '#ef4444', 600: '#dc2626', 800: '#991b1b', 900: '#7f1d1d' },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  yellow: { 50: '#fefce8', 200: '#fef08a', 900: '#713f12' },
  lime: { 50: '#f7fee7', 200: '#d9f99d', 900: '#365314' },
  green: { 50: '#f0fdf4', 200: '#bbf7d0', 600: '#16a34a', 900: '#14532d' },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 500: '#14b8a6', 600: '#0d9488', 800: '#115e59', 900: '#134e4a' },
  cyan: { 50: '#ecfeff', 200: '#a5f3fc', 600: '#0891b2', 800: '#155e75', 900: '#164e63' },
  sky: { 50: '#f0f9ff', 200: '#bae6fd', 500: '#0ea5e9', 600: '#0284c7', 800: '#075985', 900: '#0c4a6e' },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 500: '#a855f7', 600: '#9333ea', 800: '#6b21a8', 900: '#581c87' },
  fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 500: '#d946ef', 600: '#c026d3', 800: '#86198f', 900: '#701a75' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 500: '#ec4899', 800: '#9d174d' },
};

const OPACITY_SUFFIXES = ['', '/30', '/40', '/50', '/60', '/70', '/80', '/90'] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function colorUtilities(): string {
  const rules: string[] = [];
  for (const [name, shades] of Object.entries(PALETTE)) {
    for (const [shade, hex] of Object.entries(shades)) {
      if (!hex) continue;
      const token = `${name}-${shade}`;
      rules.push(`.bg-${token}{background-color:${hex}}`);
      rules.push(`.text-${token}{color:${hex}}`);
      rules.push(`.border-${token}{border-color:${hex}}`);
      for (const suffix of OPACITY_SUFFIXES) {
        if (!suffix) continue;
        const alpha = Number(suffix.slice(1)) / 100;
        const rgba = withAlpha(hex, alpha);
        const escaped = `${token}\\${suffix}`;
        rules.push(`.bg-${escaped}{background-color:${rgba}}`);
        rules.push(`.border-${escaped}{border-color:${rgba}}`);
        rules.push(`.text-${escaped}{color:${rgba}}`);
      }
    }
  }
  return rules.join('');
}

const GRADIENT_RULES = `
.bg-gradient-to-b.from-white.to-slate-50\\/30{background:linear-gradient(to bottom,#fff,rgba(248,250,252,.3))}
.bg-gradient-to-br.from-white.to-rose-50\\/40{background:linear-gradient(to bottom right,#fff,rgba(238,242,255,.4))}
.bg-gradient-to-r.from-rose-700.via-red-600.to-rose-800{background:linear-gradient(to right,#eef2ff,#fff,#e0e7ff)}
.bg-gradient-to-r.from-blue-700.via-sky-600.to-indigo-600{background:linear-gradient(to right,#eff6ff,#fff,#eef2ff)}
.bg-gradient-to-r.from-emerald-700.via-green-600.to-teal-600{background:linear-gradient(to right,#f5f3ff,#fff,#ecfeff)}
.bg-gradient-to-br.from-white.to-emerald-50\\/30{background:linear-gradient(to bottom right,#fff,rgba(245,243,255,.35))}
.ai-tool-section-card{backdrop-filter:saturate(1.2);-webkit-backdrop-filter:saturate(1.2)}
.ai-tool-section-card>header{background:linear-gradient(90deg,rgba(255,255,255,.72),rgba(255,255,255,.38))}
.ai-tool-q-card{transition:transform .15s ease}
.bg-gradient-to-r.from-violet-700.via-purple-600.to-indigo-600{background:linear-gradient(to right,#f5f3ff,#fff,#eef2ff)}
.bg-gradient-to-r.from-amber-700.via-orange-600.to-amber-600{background:linear-gradient(to right,#fffbeb,#fff,#fff7ed)}
.bg-gradient-to-r.from-indigo-700.via-violet-600.to-cyan-600{background:linear-gradient(to right,#eef2ff,#fff,#ecfeff)}
.bg-gradient-to-r.from-rose-700.via-red-600.to-orange-600{background:linear-gradient(to right,#eef2ff,#fff,#fffbeb)}
.bg-gradient-to-br.from-indigo-600.to-violet-600{background:linear-gradient(to bottom right,#eef2ff,#ede9fe)}
.bg-gradient-to-br.from-orange-500.to-amber-500{background:linear-gradient(to bottom right,#fff7ed,#fffbeb)}
.bg-gradient-to-br.from-violet-600.to-purple-600{background:linear-gradient(to bottom right,#f5f3ff,#ede9fe)}
.bg-gradient-to-br.from-blue-600.to-sky-600{background:linear-gradient(to bottom right,#eff6ff,#e0f2fe)}
.bg-gradient-to-br.from-amber-500.to-orange-500{background:linear-gradient(to bottom right,#fffbeb,#ffedd5)}
.bg-gradient-to-r.from-indigo-500.to-violet-500{background:linear-gradient(to right,#eef2ff,#ede9fe)}
.bg-gradient-to-r.from-orange-500.to-amber-500{background:linear-gradient(to right,#fff7ed,#fffbeb)}
.bg-gradient-to-r.from-violet-500.to-purple-500{background:linear-gradient(to right,#f5f3ff,#ede9fe)}
.bg-gradient-to-r.from-blue-500.to-sky-500{background:linear-gradient(to right,#eff6ff,#e0f2fe)}
.bg-gradient-to-r.from-amber-500.to-orange-500{background:linear-gradient(to right,#fffbeb,#ffedd5)}
`;

const BASE_RULES = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;line-height:1.6;font-size:17px;padding:8px 8px 10px;background:#ffffff;border-radius:16px}
${AI_TOOL_SELECTION_GUARD_CSS}
.ai-tool-fallback-pre{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font-size:15px;line-height:1.6;color:#334155;overflow-x:auto}
.ai-tool-empty-message{color:#64748b;font-size:15px;text-align:center;padding:24px 12px}
img{max-width:100%;height:auto}
table{border-collapse:collapse}
pre{white-space:pre-wrap;word-break:break-word}
.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}
.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.flex-col{flex-direction:column}
.flex-1{flex:1 1 0%}.shrink-0{flex-shrink:0}.items-center{align-items:center}.items-start{align-items:start}
.justify-center{justify-content:center}.justify-between{justify-content:space-between}
.gap-1\\.5{gap:.375rem}.gap-2{gap:.5rem}.gap-2\\.5{gap:.625rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}
.w-full{width:100%}.w-6{width:1.5rem}.w-7{width:1.75rem}.w-9{width:2.25rem}.w-14{width:3.5rem}
.h-2{height:.5rem}.h-4{height:1rem}.h-6{height:1.5rem}.h-7{height:1.75rem}.h-9{height:2.25rem}.h-14{height:3.5rem}
.h-fit{height:fit-content}.h-full{height:100%}.min-w-0{min-width:0}.min-w-full{min-width:100%}.max-w-none{max-width:none}
.m-0{margin:0}.mb-0\\.5{margin-bottom:.125rem}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}
.mb-4{margin-bottom:1rem}.mt-0\\.5{margin-top:.125rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}
.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mt-8{margin-top:2rem}.mr-2{margin-right:.5rem}.my-4{margin-block:1rem}.my-6{margin-block:1.5rem}
.ml-4{margin-left:1rem}.ml-6{margin-left:1.5rem}.pl-0{padding-left:0}.pl-1{padding-left:.25rem}.pl-4{padding-left:1rem}.pl-5{padding-left:1.25rem}
.p-3{padding:.75rem}.p-4{padding:1rem}.p-5{padding:1.25rem}
.px-1\\.5{padding-inline:.375rem}.px-2{padding-inline:.5rem}.px-2\\.5{padding-inline:.625rem}.px-3{padding-inline:.75rem}
.px-4{padding-inline:1rem}.px-5{padding-inline:1.25rem}
.py-0\\.5{padding-block:.125rem}.py-1{padding-block:.25rem}.py-1\\.5{padding-block:.375rem}.py-2{padding-block:.5rem}
.py-2\\.5{padding-block:.625rem}.py-4{padding-block:1rem}
.pb-1{padding-bottom:.25rem}.pb-2{padding-bottom:.5rem}.pb-3{padding-bottom:.75rem}.pt-1{padding-top:.25rem}
.border{border-width:1px;border-style:solid}.border-b{border-bottom-width:1px;border-bottom-style:solid}
.border-l-\\[5px\\]{border-left-width:5px;border-left-style:solid}
.rounded{border-radius:.25rem}.rounded-md{border-radius:.375rem}.rounded-lg{border-radius:.5rem}
.rounded-xl{border-radius:.75rem}.rounded-2xl{border-radius:1rem}.rounded-3xl{border-radius:1.5rem}.rounded-full{border-radius:9999px}
.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}
.shadow-sm{box-shadow:0 1px 2px rgba(0,0,0,.05)}.shadow-lg{box-shadow:0 10px 15px -3px rgba(0,0,0,.1)}
.shadow-inner{box-shadow:inset 0 2px 4px rgba(0,0,0,.05)}.shadow-stone-200\\/40{box-shadow:0 1px 2px rgba(231,229,228,.4)}
.shadow-indigo-100\\/50{box-shadow:0 10px 15px rgba(224,231,255,.5)}
.shadow-orange-100\\/60{box-shadow:0 10px 15px rgba(255,237,213,.6)}
.shadow-violet-100\\/50{box-shadow:0 10px 15px rgba(237,233,254,.5)}
.shadow-blue-100\\/50{box-shadow:0 10px 15px rgba(219,234,254,.5)}
.shadow-amber-100\\/50{box-shadow:0 10px 15px rgba(254,243,199,.5)}
.shadow-indigo-300\\/40{box-shadow:0 10px 15px rgba(165,180,252,.4)}
.shadow-orange-300\\/40{box-shadow:0 10px 15px rgba(253,186,116,.4)}
.shadow-violet-300\\/40{box-shadow:0 10px 15px rgba(196,181,253,.4)}
.shadow-blue-300\\/40{box-shadow:0 10px 15px rgba(147,197,253,.4)}
.shadow-amber-300\\/40{box-shadow:0 10px 15px rgba(252,211,77,.4)}
.bg-gradient-to-b{background-image:linear-gradient(to bottom,var(--tw-gradient-stops,transparent))}
.bg-gradient-to-br{background-image:linear-gradient(to bottom right,var(--tw-gradient-stops,transparent))}
.bg-gradient-to-r{background-image:linear-gradient(to right,var(--tw-gradient-stops,transparent))}
.bg-white{background-color:#fff}.bg-white\\/60{background-color:rgba(255,255,255,.6)}
.text-left{text-align:left}.text-xs{font-size:.9375rem;line-height:1.35rem}.text-sm{font-size:1rem;line-height:1.5rem}
.text-base{font-size:1.0625rem;line-height:1.65rem}.text-lg{font-size:1.2rem;line-height:1.8rem}.text-xl{font-size:1.4rem;line-height:1.95rem}
.text-2xl{font-size:1.65rem;line-height:2.15rem}.text-\\[9px\\],.text-\\[10px\\],.text-\\[11px\\]{font-size:15px;line-height:1.35rem}
.font-medium{font-weight:500}.font-semibold{font-weight:600}.font-bold{font-weight:700}.font-extrabold{font-weight:800}.font-black{font-weight:900}.font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.italic{font-style:italic}.uppercase{text-transform:uppercase}
.leading-tight{line-height:1.25}.leading-snug{line-height:1.375}.leading-relaxed{line-height:1.625}
.tracking-tight{letter-spacing:-.025em}.tracking-wider{letter-spacing:.05em}.tracking-widest{letter-spacing:.1em}
.whitespace-pre-wrap{white-space:pre-wrap}.align-top{vertical-align:top}
.list-none{list-style:none}.list-disc{list-style-type:disc}.list-decimal{list-style-type:decimal}
.space-y-1>:not([hidden])~:not([hidden]){margin-top:.25rem}
.space-y-1\\.5>:not([hidden])~:not([hidden]){margin-top:.375rem}
.space-y-2>:not([hidden])~:not([hidden]){margin-top:.5rem}
.space-y-2\\.5>:not([hidden])~:not([hidden]){margin-top:.625rem}
.prose{color:#334155;max-width:none}.prose-sm{font-size:1rem;line-height:1.55}
.prose h1,.prose h2,.prose h3,.prose h4{color:#111827;font-weight:800}
.prose p{margin:.5rem 0}.prose strong{font-weight:800;color:#0f172a}
.prose code{background:#f3f4f6;padding:.1rem .3rem;border-radius:.25rem;font-size:.85em}
.prose pre{background:#f3f4f6;padding:1rem;border-radius:.5rem;overflow-x:auto}
.prose ul,.prose ol{margin:.5rem 0 .5rem 1.25rem}
/* Exam / mock-test / worksheet labels — must stay heavy after markdown strip */
.ai-q-label{font-weight:800!important;color:#1e1b4b!important;letter-spacing:.01em}
.ai-section-subhead{font-size:15px!important;line-height:1.35!important;font-weight:800!important;color:#1e1b4b!important;margin:12px 0 8px;padding-bottom:6px;border-bottom:1px solid #c7d2fe}
.quest-body .ai-q-label,.quest-body strong{font-weight:800!important;color:#1e1b4b!important}
.quest-body h3,.quest-body h4,.quest-body .ai-section-subhead{font-weight:800!important;color:#1e1b4b!important}
.smart-study-guide-markdown,.concept-breakdown-markdown,.chapter-summary-markdown,.key-points-markdown,
.practice-qa-markdown,.mock-test-markdown,.quick-assignment-markdown{max-width:100%}
.ai-tool-sections-grid{display:block}
.ai-tool-hero-card{display:block}
@media (min-width:640px){.sm\\:p-4{padding:1rem}}
`;

/** Tablet — larger type, full-width prose, two-column sections. */
const TABLET_RULES = `
@media (min-width:768px){
body{font-size:19px;line-height:1.6;padding:10px 0 14px}
.prose{max-width:none;font-size:1.125rem;line-height:1.65}
.prose-sm{font-size:1.125rem;line-height:1.65}
.prose h1,.prose h2,.prose h3,.prose h4{font-size:1.25em}
.text-xs{font-size:.95rem;line-height:1.4rem}
.text-sm{font-size:1.125rem;line-height:1.6rem}
.text-base{font-size:1.2rem;line-height:1.7rem}
.text-lg{font-size:1.4rem;line-height:1.9rem}
.text-xl{font-size:1.6rem;line-height:2.1rem}
.text-2xl{font-size:1.85rem;line-height:2.35rem}
.text-\\[9px\\],.text-\\[10px\\],.text-\\[11px\\]{font-size:15px;line-height:1.4rem}
.p-3{padding:.85rem}.p-4{padding:1rem}.p-5{padding:1.15rem}
.px-3{padding-inline:.85rem}.py-2{padding-block:.55rem}
.gap-4{gap:.85rem}
.mb-3{margin-bottom:.65rem}
.rounded-2xl .relative.flex.flex-col{gap:.75rem}
.hero-title-card,.relative.overflow-hidden.rounded-2xl .relative.flex.flex-col.gap-4.p-5{padding:1.15rem}
section.rounded-xl header h3,section.rounded-xl header h4{font-size:1.15rem;line-height:1.5}
section.rounded-xl header p.text-\\[9px\\],section.rounded-xl header p.text-\\[10px\\]{font-size:15px}
section.rounded-xl>div.px-3,section.rounded-xl>header.px-3{padding-inline:1rem}
.ai-tool-fallback-pre{font-size:17px;line-height:1.6;padding:14px}
.ai-tool-empty-message{font-size:17px}
.ai-tool-sections-grid{column-count:2;column-gap:12px;display:block;margin-top:4px}
.ai-tool-sections-grid>.ai-tool-section-card,.ai-tool-sections-grid>section.ai-tool-section-card{break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;display:inline-block;width:100%;margin-bottom:12px!important;box-sizing:border-box;vertical-align:top}
.ai-tool-sections-grid>.ai-tool-section-full{column-span:all;display:block;width:100%}
.ai-tool-sections-grid .practice-list-tablet{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start}
.ai-tool-hero-card{margin-bottom:12px}
}
`;

/** Digital board — largest readable type for classroom displays. */
const BOARD_RULES = `
@media (min-width:1024px){
body{font-size:21px;line-height:1.65;padding:12px 0 16px}
.prose{font-size:1.25rem;line-height:1.7}
.prose-sm{font-size:1.25rem;line-height:1.7}
.prose h1,.prose h2,.prose h3,.prose h4{font-size:1.3em}
.text-xs{font-size:1.05rem;line-height:1.45rem}
.text-sm{font-size:1.2rem;line-height:1.65rem}
.text-base{font-size:1.3rem;line-height:1.75rem}
.text-lg{font-size:1.5rem;line-height:2rem}
.text-xl{font-size:1.7rem;line-height:2.2rem}
.text-2xl{font-size:2rem;line-height:2.45rem}
.text-\\[9px\\],.text-\\[10px\\],.text-\\[11px\\]{font-size:15px;line-height:1.45rem}
section.rounded-xl header h3,section.rounded-xl header h4{font-size:1.3rem;line-height:1.55}
section.rounded-xl header p.text-\\[9px\\],section.rounded-xl header p.text-\\[10px\\]{font-size:15px}
.ai-tool-fallback-pre{font-size:19px;line-height:1.65;padding:16px}
.ai-tool-empty-message{font-size:19px}
}
`;

export const AI_TOOL_OUTPUT_STYLES = `${BASE_RULES}${colorUtilities()}${GRADIENT_RULES}${TABLET_RULES}${BOARD_RULES}`;
