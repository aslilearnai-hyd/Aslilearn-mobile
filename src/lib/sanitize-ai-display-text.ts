import { stripAiGeneratorLeakage } from './strip-ai-tool-metadata';
import { formatClassroomScienceText } from './exam-text-normalize';

/** Normalize and strip internal AI metadata from any user-facing text field. */
export function sanitizeAiDisplayText(value: unknown, subject?: string): string {
  return formatClassroomScienceText(
    stripAiGeneratorLeakage(
      String(value ?? '')
        .replace(/\r\n/g, '\n')
        .trim(),
    ),
    subject,
  );
}
