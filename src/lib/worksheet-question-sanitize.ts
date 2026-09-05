import { stripVariantScaffoldFromQuestionText, stripAiGeneratorLeakage } from '@/lib/strip-ai-tool-metadata';
import { toTitleCaseWords } from '@/lib/title-case';

/** Mirrors backend pdf-worksheet-extract filters for worksheet list/view parsing. */

export function isInvalidWorksheetTitle(title: string): boolean {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return true;
  if (/^worksheet$/i.test(t)) return true;
  if (/^answer\s*key$/i.test(t)) return true;
  if (/^your\s+worksheet\s+pack$/i.test(t)) return true;
  if (/^generated\s+content$/i.test(t)) return true;
  if (/^(?:learning\s+objectives?|instructions?\s+to\s+students?|bloom(?:'?s)?\s*level)/i.test(t)) {
    return true;
  }
  return false;
}

export function isWorksheetAnswerKeyLike(text: string): boolean {
  const q = String(text || '').replace(/\s+/g, ' ').trim();
  if (!q) return true;
  if (/^answer\s*key\b/i.test(q)) return true;
  if (/^(?:answer|correct\s*answer)\s*[:\-]/i.test(q)) return true;
  if (/^---\s*pdf\s+answer\s+key\s*---$/i.test(q)) return true;
  if (/^q\d+[\).:\-]\s*[A-Da-d][);.]?\s*(?:;\s*\d+[\).:\-]\s*[A-Da-d])/i.test(q)) return true;
  if (/^q?\d+[\).:\-]\s*[A-Da-d][);.]\s+/i.test(q) && !/\?/.test(q) && !/_{2,}/.test(q)) return true;
  if (
    /^(?:expected term or phrase|short accurate point|clear explanation linking)\b/i.test(q) &&
    !/\?/.test(q)
  ) {
    return true;
  }
  const numberedShort = (q.match(/\d+[\).:\-]\s*[A-Da-d][);.]?/g) || []).length;
  if (numberedShort >= 3 && !/\?/.test(q) && !/_{2,}/.test(q) && q.length < 500) return true;
  return false;
}

export function sanitizeWorksheetDisplayTitle(title: string, fallback = 'Worksheet'): string {
  let t = String(title || '').trim();
  t = t.replace(/\s*\(Uniqueness\s+Seed:[^)]*\)/gi, '');
  t = t.replace(/\s*\(Distinct from all other variants[^)]*\)/gi, '');
  t = t.replace(/\s*\(The title reflects the creative angle\.\)/gi, '');
  for (let i = 0; i < 4; i += 1) {
    const next = t.replace(/(\([^)]{12,140}\))\s*(?:\1\s*)+/g, '$1');
    if (next === t) break;
    t = next;
  }
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (t.length > 200) t = `${t.slice(0, 197).trim()}…`;
  if (isInvalidWorksheetTitle(t)) t = fallback;
  return toTitleCaseWords(t || fallback);
}

export function isWorksheetHeadingLine(text: string): boolean {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/^section\s+[a-f]\s*:/i.test(t)) return true;
  if (/^\d{1,2}\.\s*section\s+[a-f]\s*:/i.test(t)) return true;
  if (/^(?:learning\s+objectives?|instructions?\s+to\s+students?|answer\s*key|bloom)/i.test(t)) {
    return true;
  }
  if (
    /\b(chapter|topic|lesson|unit|syllabus|subtopic|worksheet\s*title)\b/i.test(t) &&
    !/[?]/.test(t) &&
    !/_{2,}/.test(t)
  ) {
    return true;
  }
  return false;
}

export function isWorksheetPdfChrome(text: string): boolean {
  const q = String(text || '').replace(/\s+/g, ' ').trim();
  if (!q) return true;
  if (isWorksheetAnswerKeyLike(q)) return true;
  if (/---\s*pdf\s+answer\s+key\s*---/i.test(q)) return true;
  if (/worksheet\s*&\s*mcq/i.test(q)) return true;
  if (/\bpage\s*\d+\b/i.test(q) && !/\?/.test(q) && !/_{2,}/.test(q)) return true;
  return false;
}

export function isWorksheetTemplateLeak(text: string): boolean {
  const t = String(text || '').trim();
  if (!t) return false;
  return (
    /(?:explained in class|core concept from|evidence about|using evidence about|a brief definition using)\b/i.test(
      t,
    ) || /^\s*complete:\s*a key idea in\b/i.test(t)
  );
}

/** Strip merged section headers / numbering tails from question text. */
export function cleanWorksheetQuestionText(text: string): string {
  let q = String(text || '').replace(/\s+/g, ' ').trim();
  if (!q) return '';
  q = q.replace(/^(?:q(?:uestion)?\.?\s*)?\d{1,3}[\).:\-]\s+/i, '').trim();
  q = q.replace(/\s+section\s+[a-f]\s*:\s*.+$/i, '').trim();
  q = q.replace(/\s+\d{1,2}[\.\):\-]\s+section\s+[a-f]\s*:\s*.+$/i, '').trim();
  q = q.replace(/(?:\s+\*{0,2}Section\s+\d{1,2}\*{0,2})+.*$/i, '').trim();
  if (/\.\s+\d{1,2}[\.\):\-]\s+/i.test(q)) {
    q = q.replace(/\.\s+\d{1,2}[\.\):\-]\s+.+$/i, '.').trim();
  }
  return stripAiGeneratorLeakage(stripVariantScaffoldFromQuestionText(q));
}

export function looksLikeWorksheetQuestionPrompt(text: string): boolean {
  const t = cleanWorksheetQuestionText(text);
  if (!t || isWorksheetHeadingLine(t) || isWorksheetPdfChrome(t) || isWorksheetTemplateLeak(t)) {
    return false;
  }
  if (/[?]|_{2,}/.test(t)) return true;
  if (
    /^\s*(what|which|why|how|define|choose|fill|select|state|identify|explain|describe|list|write|convert|find|calculate|solve|express|match|arrange|compare|name|complete|circle|tick|read|show|represent|form|make|give|design|create|prepare|draw|construct|imagine|suppose|consider|apply|plan|propose|draft|suggest)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  const words = t.split(/\s+/).filter(Boolean).length;
  return words >= 6 && words <= 120 && !/^(section|answer\s*key|bloom|instructions|learning\s+objectives)\b/i.test(t);
}

export function sanitizeWorksheetOptionLine(option: string): string {
  const raw = String(option || '').trim();
  if (!raw) return '';
  if (isWorksheetHeadingLine(raw) || isWorksheetPdfChrome(raw) || isWorksheetAnswerKeyLike(raw)) return '';
  if (/\bsection\s+[a-f]\s*:/i.test(raw)) return '';
  if (/^(?:answer|correct\s*answer)\s*[:\-]/i.test(raw)) return '';
  return raw;
}

export function filterWorksheetLearningObjectiveLine(line: string): boolean {
  const t = String(line || '').trim();
  if (!t) return false;
  if (isWorksheetHeadingLine(t) || isWorksheetPdfChrome(t)) return false;
  if (/^section\s+[a-f]\s*:/i.test(t)) return false;
  if (isWorksheetTemplateLeak(t) && !/\?/.test(t)) return false;
  return true;
}

export function isValidWorksheetQuestionInput(question: string, options: string[] = []): boolean {
  const q = cleanWorksheetQuestionText(question);
  if (!q) return false;
  if (isWorksheetHeadingLine(q) || isWorksheetPdfChrome(q) || isWorksheetAnswerKeyLike(q)) return false;
  if (isWorksheetTemplateLeak(q) && options.length < 2 && !/_{2,}/.test(q)) return false;
  return looksLikeWorksheetQuestionPrompt(q) || options.length >= 2 || /_{2,}/.test(q);
}
