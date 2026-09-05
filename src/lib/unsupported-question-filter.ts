/**
 * Drop question types that cannot render correctly (no images, no match UI).
 */

const IMAGE_STEM_RE =
  /\b(?:refer(?:\s+to)?|see|look\s+at|observe|study|based\s+on|as\s+shown\s+in|given\s+in|shown\s+in|in)\s+(?:the\s+)?(?:following\s+)?(?:figure|fig\.?|image|diagram|picture|illustration|photograph|photo|drawing|sketch)\b/i;

const IMAGE_STEM_RE_2 =
  /\b(?:figure|fig\.?|image|diagram|picture|illustration)\s+(?:above|below|given|provided|shows?|depicts?)\b/i;

const IMAGE_STEM_RE_3 =
  /\b(?:label\s+(?:the\s+)?(?:figure|diagram|image|parts?\s+of)|draw\s+(?:a\s+)?(?:labelled\s+)?diagram|complete\s+the\s+(?:figure|diagram)|identify\s+(?:the\s+)?(?:parts?\s+)?(?:in|from)\s+(?:the\s+)?(?:figure|diagram|image))\b/i;

const MATCH_STEM_RE =
  /\bmatch\s+(?:the\s+)?following\b|\bcolumn\s*a\b[\s\S]{0,80}\bcolumn\s*b\b|\bmatch\s+(?:each|these|the)\s+(?:items?|terms?|words?)\b/i;

export function isUnsupportedQuestionStem(text: string, type = ''): boolean {
  const t = String(type || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '');
  if (t === 'MATCH' || t === 'MATCHING' || t === 'MATCHTHEFOLLOWING') return true;

  const q = String(text || '').trim();
  if (!q) return false;
  if (MATCH_STEM_RE.test(q)) return true;
  if (IMAGE_STEM_RE.test(q) || IMAGE_STEM_RE_2.test(q) || IMAGE_STEM_RE_3.test(q)) return true;
  return false;
}

export function filterUnsupportedQuestions<T extends Record<string, unknown> | string>(
  questions: T[] = [],
): T[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter((entry) => {
    if (typeof entry === 'string') return !isUnsupportedQuestionStem(entry);
    if (!entry || typeof entry !== 'object') return false;
    const text = String(
      (entry as any).question ||
        (entry as any).question_text ||
        (entry as any).questionText ||
        (entry as any).prompt ||
        (entry as any).text ||
        '',
    ).trim();
    const type = String((entry as any).type || (entry as any).question_type || (entry as any).questionType || '').trim();
    return !isUnsupportedQuestionStem(text, type);
  });
}
