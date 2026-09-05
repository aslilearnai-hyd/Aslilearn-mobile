/**
 * Shared rainbow liquid-glass accents for AI tool result sections.
 * Avoids mono-green / emerald walls — each section gets a distinct hue.
 */

export type AiSectionTheme = {
  key: string;
  /** Tailwind border-* for left stripe */
  stripe: string;
  iconWrap: string;
  border: string;
  bg: string;
  label: string;
  title: string;
  bullet: string;
  /** Question / chip badge */
  chipBg: string;
  chipText: string;
  softBorder: string;
  softBg: string;
  /** Native RN */
  hex: string;
  hexDeep: string;
  glassFrom: string;
  glassTo: string;
  /** Light pastel tint for card/header backgrounds (Tailwind -50) */
  pastelBg: string;
  /** Slightly deeper pastel for borders (Tailwind -200) */
  pastelBorder: string;
};

/** High-interest student palette — violet → sky → amber → rose → indigo → cyan → orange → fuchsia */
export const AI_SECTION_RAINBOW: AiSectionTheme[] = [
  {
    key: 'violet',
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-800',
    border: 'border-violet-200/90',
    bg: 'bg-violet-50/80',
    label: 'text-violet-600',
    title: 'text-violet-900',
    bullet: 'text-violet-500',
    chipBg: 'bg-violet-600',
    chipText: 'text-white',
    softBorder: 'border-violet-200',
    softBg: 'bg-violet-50/70',
    hex: '#8b5cf6',
    hexDeep: '#6d28d9',
    glassFrom: 'rgba(245,243,255,0.88)',
    glassTo: 'rgba(237,233,254,0.42)',
    pastelBg: '#f5f3ff',
    pastelBorder: '#ddd6fe',
  },
  {
    key: 'sky',
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-800',
    border: 'border-sky-200/90',
    bg: 'bg-sky-50/80',
    label: 'text-sky-600',
    title: 'text--900',
    bullet: 'text-sky-500',
    chipBg: 'bg-sky-600',
    chipText: 'text-white',
    softBorder: 'border-sky-200',
    softBg: 'bg-sky-50/70',
    hex: '#0ea5e9',
    hexDeep: '#0369a1',
    glassFrom: 'rgba(240,249,255,0.88)',
    glassTo: 'rgba(224,242,254,0.42)',
    pastelBg: '#f0f9ff',
    pastelBorder: '#bae6fd',
  },
  {
    key: 'amber',
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-900',
    border: 'border-amber-200/90',
    bg: 'bg-amber-50/80',
    label: 'text-amber-700',
    title: 'text--900',
    bullet: 'text-amber-500',
    chipBg: 'bg-amber-500',
    chipText: 'text-white',
    softBorder: 'border-amber-200',
    softBg: 'bg-amber-50/70',
    hex: '#f59e0b',
    hexDeep: '#b45309',
    glassFrom: 'rgba(255,251,235,0.88)',
    glassTo: 'rgba(254,243,199,0.42)',
    pastelBg: '#fffbeb',
    pastelBorder: '#fde68a',
  },
  {
    key: 'rose',
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-800',
    border: 'border-rose-200/90',
    bg: 'bg-rose-50/80',
    label: 'text-rose-600',
    title: 'text--900',
    bullet: 'text-rose-500',
    chipBg: 'bg-rose-600',
    chipText: 'text-white',
    softBorder: 'border-rose-200',
    softBg: 'bg-rose-50/70',
    hex: '#f43f5e',
    hexDeep: '#be123c',
    glassFrom: 'rgba(255,241,242,0.88)',
    glassTo: 'rgba(255,228,230,0.42)',
    pastelBg: '#fff1f2',
    pastelBorder: '#fecdd3',
  },
  {
    key: 'indigo',
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-800',
    border: 'border-indigo-200/90',
    bg: 'bg-indigo-50/80',
    label: 'text-indigo-600',
    title: 'text--900',
    bullet: 'text-indigo-500',
    chipBg: 'bg-indigo-600',
    chipText: 'text-white',
    softBorder: 'border-indigo-200',
    softBg: 'bg-indigo-50/70',
    hex: '#6366f1',
    hexDeep: '#4338ca',
    glassFrom: 'rgba(238,242,255,0.88)',
    glassTo: 'rgba(224,231,255,0.42)',
    pastelBg: '#eef2ff',
    pastelBorder: '#c7d2fe',
  },
  {
    key: 'cyan',
    stripe: 'border-cyan-500',
    iconWrap: 'bg-cyan-100 text-cyan-800',
    border: 'border-cyan-200/90',
    bg: 'bg-cyan-50/80',
    label: 'text-cyan-700',
    title: 'text--900',
    bullet: 'text-cyan-600',
    chipBg: 'bg-cyan-600',
    chipText: 'text-white',
    softBorder: 'border-cyan-200',
    softBg: 'bg-cyan-50/70',
    hex: '#06b6d4',
    hexDeep: '#0e7490',
    glassFrom: 'rgba(236,254,255,0.88)',
    glassTo: 'rgba(207,250,254,0.42)',
    pastelBg: '#ecfeff',
    pastelBorder: '#a5f3fc',
  },
  {
    key: 'orange',
    stripe: 'border-orange-500',
    iconWrap: 'bg-orange-100 text-orange-800',
    border: 'border-orange-200/90',
    bg: 'bg-orange-50/80',
    label: 'text-orange-600',
    title: 'text--900',
    bullet: 'text-orange-500',
    chipBg: 'bg-orange-500',
    chipText: 'text-white',
    softBorder: 'border-orange-200',
    softBg: 'bg-orange-50/70',
    hex: '#f97316',
    hexDeep: '#c2410c',
    glassFrom: 'rgba(255,247,237,0.88)',
    glassTo: 'rgba(255,237,213,0.42)',
    pastelBg: '#fff7ed',
    pastelBorder: '#fed7aa',
  },
  {
    key: 'fuchsia',
    stripe: 'border-fuchsia-500',
    iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
    border: 'border-fuchsia-200/90',
    bg: 'bg-fuchsia-50/80',
    label: 'text-fuchsia-600',
    title: 'text--900',
    bullet: 'text-fuchsia-500',
    chipBg: 'bg-fuchsia-600',
    chipText: 'text-white',
    softBorder: 'border-fuchsia-200',
    softBg: 'bg-fuchsia-50/70',
    hex: '#d946ef',
    hexDeep: '#a21caf',
    glassFrom: 'rgba(253,244,255,0.88)',
    glassTo: 'rgba(250,232,255,0.42)',
    pastelBg: '#fdf4ff',
    pastelBorder: '#f5d0fe',
  },
  {
    key: 'blue',
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200/90',
    bg: 'bg-blue-50/80',
    label: 'text-blue-600',
    title: 'text--900',
    bullet: 'text-blue-500',
    chipBg: 'bg-blue-600',
    chipText: 'text-white',
    softBorder: 'border-blue-200',
    softBg: 'bg-blue-50/70',
    hex: '#3b82f6',
    hexDeep: '#1d4ed8',
    glassFrom: 'rgba(239,246,255,0.88)',
    glassTo: 'rgba(219,234,254,0.42)',
    pastelBg: '#eff6ff',
    pastelBorder: '#bfdbfe',
  },
  {
    key: 'teal',
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-800',
    border: 'border-teal-200/90',
    bg: 'bg-teal-50/80',
    label: 'text-teal-700',
    title: 'text--900',
    bullet: 'text-teal-600',
    chipBg: 'bg-teal-600',
    chipText: 'text-white',
    softBorder: 'border-teal-200',
    softBg: 'bg-teal-50/70',
    hex: '#14b8a6',
    hexDeep: '#0f766e',
    glassFrom: 'rgba(240,253,250,0.88)',
    glassTo: 'rgba(204,251,241,0.42)',
    pastelBg: '#f0fdfa',
    pastelBorder: '#99f6e4',
  },
];

export function getAiSectionTheme(index = 0): AiSectionTheme {
  const i = Number.isFinite(index) ? Math.abs(Math.floor(index)) : 0;
  return AI_SECTION_RAINBOW[i % AI_SECTION_RAINBOW.length];
}

/** Prefer section number when available so Section 3 always matches across tools. */
export function getAiSectionThemeByNum(sectionNum: string | number): AiSectionTheme {
  const n = typeof sectionNum === 'number'
    ? sectionNum
    : parseInt(String(sectionNum).replace(/\D/g, ''), 10);
  if (Number.isFinite(n) && n > 0) return getAiSectionTheme(n - 1);
  return getAiSectionTheme(0);
}
