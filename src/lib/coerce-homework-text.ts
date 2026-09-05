/** Coerce homework template fields from strings or nested objects (avoids "[object Object]"). */
export function coerceHomeworkText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '[object Object]' ? '' : t;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => coerceHomeworkText(item)).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const directKeys = [
      'question',
      'prompt',
      'text',
      'task',
      'description',
      'instruction',
      'instructions',
      'content',
      'body',
      'observation',
      'challenge',
      'hint',
      'answer',
      'creative_question',
      'thinking_question',
      'observation_task',
      'real_life_task',
    ];
    for (const key of directKeys) {
      const part = coerceHomeworkText(o[key]);
      if (part) return part;
    }
    const title = String(o.title || o.heading || o.name || '').trim();
    const desc = String(o.description || o.details || o.body || o.text || '').trim();
    if (title && desc && title !== desc) return `${title}\n${desc}`;
    if (title || desc) return title || desc;
    const stringVals = Object.values(o)
      .map((v) => coerceHomeworkText(v))
      .filter(Boolean);
    if (stringVals.length) return [...new Set(stringVals)].join('\n');
    return '';
  }
  const s = String(value).trim();
  return s === '[object Object]' ? '' : s;
}
