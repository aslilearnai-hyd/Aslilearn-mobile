import { renderMarkdown } from './render-teacher-markdown';
import { stripMarkdownSyntax } from './strip-markdown-syntax';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';
import { getAiToolHeroEmoji } from './ai-tool-icons';
import { premiumToolHeroIconHtml } from './student-section-icons';
import { formatAiToolText } from './title-case';
import { getAiSectionTheme, getAiSectionThemeByNum } from './ai-tool-section-palette';

type LightHeaderTheme = 'blue' | 'amber' | 'indigo' | 'violet' | 'sky' | 'orange';

const LIGHT_HEADER_THEMES: Record<
  LightHeaderTheme,
  { border: string; bg: string; eyebrow: string }
> = {
  blue: {
    border: 'border-blue-200',
    bg: 'bg-gradient-to-br from-blue-50 via-white to-sky-50',
    eyebrow: 'text-blue-600',
  },
  amber: {
    border: 'border-amber-200',
    bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
    eyebrow: 'text-amber-700',
  },
  indigo: {
    border: 'border-indigo-200',
    bg: 'bg-gradient-to-br from-indigo-50 via-white to-slate-50',
    eyebrow: 'text-indigo-600',
  },
  sky: {
    border: 'border-sky-200',
    bg: 'bg-gradient-to-br from-sky-50 via-white to-cyan-50',
    eyebrow: 'text-sky-700',
  },
  orange: {
    border: 'border-orange-200',
    bg: 'bg-gradient-to-br from-orange-50 via-white to-amber-50',
    eyebrow: 'text-orange-700',
  },
  violet: {
    border: 'border-violet-200',
    bg: 'bg-gradient-to-br from-violet-50 via-white to-indigo-50',
    eyebrow: 'text-violet-600',
  },
};

/** Soft document header for AI tool output — light background, readable dark text. */
export function lightDocHeaderHtml(opts: {
  eyebrow: string;
  titleHtml: string;
  theme: LightHeaderTheme | 'emerald' | 'slate' | 'teal';
  titleTag?: 'h1' | 'h3';
  extraClass?: string;
}): string {
  const themeKey =
    opts.theme === 'emerald' || opts.theme === 'teal'
      ? 'violet'
      : opts.theme === 'slate'
        ? 'indigo'
        : opts.theme;
  const t = LIGHT_HEADER_THEMES[themeKey as LightHeaderTheme] ?? LIGHT_HEADER_THEMES.indigo;
  const tag = opts.titleTag ?? 'h3';
  const titleSize = tag === 'h1' ? 'text-xl' : 'text-lg';
  const extra = opts.extraClass ? ` ${opts.extraClass}` : '';
  return (
    `<header class="rounded-2xl border ${t.border} ${t.bg} px-4 py-4 mb-4 shadow-sm${extra}">` +
    `<p class="text-[10px] font-semibold uppercase tracking-widest ${t.eyebrow} mb-1">${escapeHtml(formatAiToolText(opts.eyebrow))}</p>` +
    `<${tag} class="${titleSize} font-bold text-slate-800 mt-1">${opts.titleHtml}</${tag}>` +
    `</header>`
  );
}
export function emptySectionPlaceholderHtml(
  message = 'Not included in this generation.'
): string {
  return `<p class="text-sm italic text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">${escapeHtml(message)}</p>`;
}

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function richTextHtml(text: string): string {
  const raw = stripMarkdownSyntax(String(text || '').trim());
  if (!raw) {
    return '<p class="text-xs italic text-slate-400 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-1">Not included.</p>';
  }
  const hasTable = raw.includes('|') && /^\s*\|/m.test(raw);
  if (hasTable) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(raw)}</div>`;
  }
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((l) => l.startsWith('• '))) {
    return `<ul class="list-none space-y-2 pl-0">${lines
      .map(
        (line) =>
          `<li class="flex gap-2 text-sm text-slate-800"><span class="mt-0.5 shrink-0 text-orange-600">•</span><span class="whitespace-pre-wrap leading-relaxed">${escapeHtml(line.replace(/^•\s+/, ''))}</span></li>`,
      )
      .join('')}</ul>`;
  }
  return `<p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">${escapeHtml(raw)}</p>`;
}

export { sectionNumberIconSvg, sectionIconSvg, premiumToolHeroIconHtml } from './student-section-icons';

function themeFromStripe(stripe: string) {
  const match = stripe.match(/border-([a-z]+)-(\d+)/);
  if (!match) {
    const fallback = getAiSectionTheme(0);
    return {
      border: fallback.border,
      bg: fallback.bg,
      label: fallback.label,
      title: fallback.title,
    };
  }
  const color = match[1];
  // Map legacy emerald/green stripes onto the rainbow palette so old callers stay colorful.
  if (color === 'emerald' || color === 'green' || color === 'lime') {
    const mapped = getAiSectionTheme(color === 'green' ? 5 : color === 'lime' ? 2 : 9);
    return {
      border: mapped.border,
      bg: mapped.bg,
      label: mapped.label,
      title: mapped.title,
    };
  }
  return {
    border: `border-${color}-200/80`,
    bg: `bg-${color}-50/80`,
    label: `text-${color}-600`,
    title: `text-${color}-900`,
  };
}

export function sectionCardHtml(opts: {
  sectionNum: string;
  title: string;
  stripe: string;
  iconWrap: string;
  iconSvg: string;
  borderColor?: string;
  bg?: string;
  labelClass?: string;
  titleClass?: string;
  body: string;
}): string {
  const byNum = getAiSectionThemeByNum(opts.sectionNum);
  const stripeIsGreen = /border-(emerald|green|lime)-/.test(opts.stripe);
  const theme = stripeIsGreen ? byNum : (() => {
    const match = opts.stripe.match(/border-([a-z]+)-/);
    if (!match) return byNum;
    // Keep rainbow identity from section number for consistency
    return byNum;
  })();
  const numMatch = String(opts.sectionNum).match(/(\d+)/);
  const label = formatAiToolText(opts.sectionNum);
  const title = formatAiToolText(opts.title);
  const orb = numMatch ? numMatch[1] : '✦';
  const orbContent = opts.iconSvg?.trim() ? opts.iconSvg : escapeHtml(orb);

  // Always start open — Android WebView often fails to toggle <details> on first paint,
  // which left later sections stuck on "Unlock" with no way to open them.
  return `
<details class="quest-node" open style="--quest:${theme.hex};--quest-deep:${theme.hexDeep};--quest-pastel:${theme.pastelBg};--quest-pastel-border:${theme.pastelBorder}" id="quest-${orb}">
  <summary class="quest-summary">
    <div class="quest-orb" aria-hidden="true">${orbContent}</div>
    <div class="quest-copy">
      <div class="quest-kicker"><span class="dot"></span>${escapeHtml(label)}</div>
      <div class="quest-title">${escapeHtml(title)}</div>
    </div>
    <div class="quest-hint">Close</div>
  </summary>
  <div class="quest-body">${opts.body}</div>
</details>`;
}

export function colorfulQuestionCardHtml(opts: {
  index: number;
  badge: string;
  metaHtml?: string;
  questionHtml: string;
  extraHtml?: string;
}): string {
  const t = getAiSectionTheme(opts.index);
  return `<article class="quest-q" style="--quest:${t.hex};--quest-deep:${t.hexDeep}">
    <div class="quest-q-top">
      <span class="quest-q-badge">${escapeHtml(opts.badge)}</span>
      ${opts.metaHtml ? `<div class="quest-q-meta">${opts.metaHtml}</div>` : ''}
    </div>
    <div class="quest-q-prompt">${opts.questionHtml}</div>
    ${opts.extraHtml || ''}
  </article>`;
}

export { getAiSectionTheme, getAiSectionThemeByNum };

export function bulletListHtml(items: string[], accent = 'text-violet-500'): string {
  if (!items.length) return richTextHtml('');
  return `<ul class="quest-bullets">${items
    .map(
      (line, i) => {
        const t = getAiSectionTheme(i);
        return `<li class="quest-bullet" style="--quest:${t.hex}">
          <span class="quest-bullet-orb" aria-hidden="true"></span>
          <span class="quest-bullet-text">${escapeHtml(line)}</span>
        </li>`;
      }
    )
    .join('')}</ul>`;
}

export function checkListHtml(items: string[]): string {
  if (!items.length) return richTextHtml('');
  return `<ul class="quest-checks">${items
    .map(
      (line, i) => {
        const t = getAiSectionTheme(i);
        return `<li class="quest-check" style="--quest:${t.hex};--quest-deep:${t.hexDeep}">
          <span class="quest-check-mark" aria-hidden="true">✓</span>
          <span>${escapeHtml(line)}</span>
        </li>`;
      }
    )
    .join('')}</ul>`;
}

export function numberedStepsHtml(items: string[], _color?: string): string {
  if (!items.length) return richTextHtml('');
  return `<ol class="quest-steps">${items
    .map((step, i) => {
      const t = getAiSectionTheme(i);
      return `<li class="quest-step" style="--quest:${t.hex};--quest-deep:${t.hexDeep}">
          <span class="quest-step-num">${i + 1}</span>
          <span class="quest-step-text">${escapeHtml(step)}</span>
        </li>`;
    })
    .join('')}</ol>`;
}

export function numberedMaterialsHtml(items: string[]): string {
  if (!items.length) return richTextHtml('');
  return `<ul class="quest-materials">${items
    .map(
      (m, i) => {
        const t = getAiSectionTheme(i);
        return `<li class="quest-material" style="--quest:${t.hex};--quest-deep:${t.hexDeep}">
          <span class="quest-material-num">${i + 1}</span>
          <span>${escapeHtml(m)}</span>
        </li>`;
      }
    )
    .join('')}</ul>`;
}

export function termGridHtml(
  items: { term?: string; name?: string; definition?: string; explanation?: string }[]
): string {
  if (!items.length) return richTextHtml('');
  return `<div class="quest-term-grid">${items
    .map((item, i) => {
      const t = getAiSectionTheme(i);
      const title = item.term || item.name || '';
      const body = item.definition || item.explanation || '';
      return `<div class="quest-term" style="--quest:${t.hex};--quest-deep:${t.hexDeep}">
        <p class="quest-term-title">${escapeHtml(title)}</p>
        ${body ? `<p class="quest-term-body">${escapeHtml(body)}</p>` : ''}
      </div>`;
    })
    .join('')}</div>`;
}

export function conceptGridHtml(items: { name: string; explanation?: string }[]): string {
  if (!items.length) return richTextHtml('');
  return `<div class="quest-term-grid">${items
    .map((c, i) => {
      const t = getAiSectionTheme(i);
      return `<div class="quest-term" style="--quest:${t.hex};--quest-deep:${t.hexDeep}">
          <p class="quest-term-title">${escapeHtml(c.name)}</p>
          ${c.explanation ? `<p class="quest-term-body">${escapeHtml(c.explanation)}</p>` : ''}
        </div>`;
    })
    .join('')}</div>`;
}

export function heroTitleCardHtml(opts: {
  eyebrow: string;
  title: string;
  theme: 'indigo' | 'orange' | 'violet' | 'blue' | 'amber' | 'emerald' | 'sky' | 'rose';
  badge?: string;
  progressPct?: number;
  toolType?: string;
  iconEmoji?: string;
  premium?: boolean;
}): string {
  const themes = {
    indigo: {
      border: 'border-indigo-200/90',
      shadow: 'shadow-indigo-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.14),transparent_55%)',
      icon: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      eyebrow: 'text-indigo-600',
      badge: 'border-indigo-200 text-indigo-700',
      barBg: 'bg-indigo-100',
      barFill: 'from-indigo-200 to-violet-200',
    },
    orange: {
      border: 'border-orange-200',
      shadow: 'shadow-orange-100/60',
      gradient: 'radial-gradient(circle_at_100%_0%,rgba(251,146,60,0.16),transparent_50%)',
      icon: 'bg-orange-100 text-orange-700 border border-orange-200',
      eyebrow: 'text-orange-600',
      badge: 'border-orange-200 text-orange-700',
      barBg: 'bg-orange-100',
      barFill: 'from-orange-200 to-amber-200',
    },
    violet: {
      border: 'border-violet-200',
      shadow: 'shadow-violet-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.16),transparent_55%)',
      icon: 'bg-violet-100 text-violet-700 border border-violet-200',
      eyebrow: 'text-violet-600',
      badge: 'border-violet-200 text-violet-700',
      barBg: 'bg-violet-100',
      barFill: 'from-violet-200 to-purple-200',
    },
    blue: {
      border: 'border-blue-200',
      shadow: 'shadow-blue-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.14),transparent_55%)',
      icon: 'bg-blue-100 text-blue-700 border border-blue-200',
      eyebrow: 'text-blue-600',
      badge: 'border-blue-200 text-blue-700',
      barBg: 'bg-blue-100',
      barFill: 'from-blue-200 to-sky-200',
    },
    amber: {
      border: 'border-amber-200',
      shadow: 'shadow-amber-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(245,158,11,0.16),transparent_55%)',
      icon: 'bg-amber-100 text-amber-700 border border-amber-200',
      eyebrow: 'text-amber-600',
      badge: 'border-amber-200 text-amber-700',
      barBg: 'bg-amber-100',
      barFill: 'from-amber-200 to-orange-200',
    },
    sky: {
      border: 'border-sky-200',
      shadow: 'shadow-sky-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.14),transparent_55%)',
      icon: 'bg-sky-100 text-sky-700 border border-sky-200',
      eyebrow: 'text-sky-600',
      badge: 'border-sky-200 text-sky-700',
      barBg: 'bg-sky-100',
      barFill: 'from-sky-200 to-cyan-200',
    },
    rose: {
      border: 'border-rose-200',
      shadow: 'shadow-rose-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(244,63,94,0.14),transparent_55%)',
      icon: 'bg-rose-100 text-rose-700 border border-rose-200',
      eyebrow: 'text-rose-600',
      badge: 'border-rose-200 text-rose-700',
      barBg: 'bg-rose-100',
      barFill: 'from-rose-200 to-orange-200',
    },
    // Legacy green theme → lively violet (students hated the green wall)
    emerald: {
      border: 'border-violet-200',
      shadow: 'shadow-violet-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.16),transparent_55%)',
      icon: 'bg-violet-100 text-violet-700 border border-violet-200',
      eyebrow: 'text-violet-600',
      badge: 'border-violet-200 text-violet-700',
      barBg: 'bg-violet-100',
      barFill: 'from-violet-200 to-fuchsia-200',
    },
  };
  const t =
    themes[opts.theme as keyof typeof themes] ?? themes.indigo ?? themes.orange;
  const displayTitle = formatAiToolText(stripAiToolGenerationLabel(opts.title, opts.eyebrow));
  const iconChar =
    opts.iconEmoji ?? (opts.toolType ? getAiToolHeroEmoji(opts.toolType) : '✨');
  const iconHtml = opts.premium && opts.toolType
    ? premiumToolHeroIconHtml(opts.toolType, t.icon)
    : `<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${t.icon} text-2xl">${iconChar}</div>`;
  const progress =
    opts.progressPct != null
      ? `<div class="mt-4">
          <div class="flex items-center justify-between text-[11px] font-medium text-stone-500 mb-1">
            <span>Content completeness</span>
            <span>${opts.progressPct}%</span>
          </div>
          <div class="h-2 rounded-full ${t.barBg} overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r ${t.barFill}" style="width:${opts.progressPct}%"></div>
          </div>
        </div>`
      : '';

  return `
<div class="relative overflow-hidden rounded-2xl border ${t.border} bg-white shadow-lg ${t.shadow} mb-2 ai-tool-hero-card">
  <div class="absolute inset-0" style="background:${t.gradient}"></div>
  <div class="relative flex flex-col gap-3 p-4">
    <div class="flex items-start gap-3">
      ${iconHtml}
      <div class="min-w-0 flex-1">
        ${opts.badge ? `<span class="inline-flex items-center rounded-md border ${t.badge} text-[10px] font-semibold px-2 py-0.5 mb-2">${escapeHtml(formatAiToolText(opts.badge))}</span>` : ''}
        <p class="text-[10px] font-bold uppercase tracking-wider ${t.eyebrow} mb-1">${escapeHtml(formatAiToolText(opts.eyebrow))}</p>
        <h4 class="text-xl font-bold text-stone-900 leading-snug tracking-tight">${escapeHtml(displayTitle)}</h4>
        ${progress}
      </div>
    </div>
  </div>
</div>`;
}
