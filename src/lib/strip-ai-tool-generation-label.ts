/** Labels the model sometimes prefixes with a running index across generations. */
const GENERATION_PREFIX =
  /^(?:activity|story|stories|worksheet|project|assignment|homework|lesson|passage|reading|mock\s*test|deck|record|concept|day\s*plan|study\s*schedule|flashcard(?:\s*set)?|worksheet\s*&\s*mcq)\s*(?:#|no\.?\s*)?\d+\s*[:.\-–—)]*\s*/i;

const BARE_GENERATION_LABEL =
  /^(?:activity|story|stories|worksheet|project|assignment|homework|lesson|passage|reading|mock\s*test|deck|record|concept|day\s*plan|study\s*schedule|flashcard(?:\s*set)?)\s*(?:#|no\.?\s*)?\d+$/i;

/** Remove ordered-list prefixes and generation counters from display titles. */
export function stripAiToolGenerationLabel(text: string, fallback = ''): string {
  let s = String(text ?? '').trim();
  if (!s) return fallback;

  // Template eyebrows like "1. Project / Activity Title" or "15. Title"
  s = s.replace(/^\d+[\).\:\-–—]\s+/, '').trim();

  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(GENERATION_PREFIX, '').trim();
  }

  if (BARE_GENERATION_LABEL.test(s)) return fallback;
  return s || fallback;
}
