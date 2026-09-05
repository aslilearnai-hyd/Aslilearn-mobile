/** Known acronyms / tokens to preserve casing (MCQs, IIT, etc.). */
const PRESERVE_TOKENS = new Set([
  'MCQ',
  'MCQs',
  'IIT',
  'CBSE',
  'NEP',
  'NCF',
  'AI',
  'V2',
  'PDF',
  'CSV',
  'URL',
  'ASLI',
]);

function titleCaseToken(token: string): string {
  if (!token) return token;
  if (/^\d+$/.test(token)) return token;
  const bare = token.replace(/[^\w'-]/g, '');
  if (PRESERVE_TOKENS.has(bare.toUpperCase())) {
    return token.replace(bare, bare.toUpperCase());
  }
  if (/^[A-Z0-9]{2,}$/.test(bare)) return token;

  const match = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'/-]*)([^A-Za-z0-9]*)$/);
  if (!match) return token;
  const [, pre, core, post] = match;
  const cased = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  return `${pre}${cased}${post}`;
}

/** Title Case each word (e.g. "learning objectives" → "Learning Objectives"). */
export function toTitleCaseWords(value: string): string {
  return formatAiToolText(value);
}

/** Standard label / heading formatter for all AI tool surfaces. */
export function formatAiToolText(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/https?:\/\//i.test(raw)) return raw;
  if (raw.includes('\n')) {
    return raw
      .split('\n')
      .map((line) => formatAiToolText(line))
      .join('\n');
  }
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ');
}
