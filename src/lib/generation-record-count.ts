export const GENERATION_RECORD_COUNT_MIN = 1;
export const GENERATION_RECORD_COUNT_MAX = 25;

export function isValidGenerationRecordCount(value: string): boolean {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= GENERATION_RECORD_COUNT_MIN && n <= GENERATION_RECORD_COUNT_MAX;
}

export function parseGenerationRecordCount(value: string): number | null {
  if (!isValidGenerationRecordCount(value)) return null;
  return Number.parseInt(value, 10);
}

export function sanitizeGenerationRecordCountInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < GENERATION_RECORD_COUNT_MIN || n > GENERATION_RECORD_COUNT_MAX) {
    return null;
  }
  return String(n);
}

export function generationRecordCountButtonLabel(value: string, isGenerating = false): string {
  if (isGenerating) return 'Generating…';
  if (isValidGenerationRecordCount(value)) return `Generate ${value} with Gemini`;
  return 'Generate with Gemini';
}
