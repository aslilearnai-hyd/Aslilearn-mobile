import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { exportCsvFile, buildCsvContent } from '../utils/csvExport';
import { renderAiToolOutputHtml } from './render-ai-tool-output-html';
import { resolveWorksheetFromPayload } from './parse-worksheet-mcq';
import { resolveHomeworkFromPayload } from './parse-homework-creator';
import { resolveExamPaperFromPayload } from './parse-exam-question-paper';
import { resolveFlashcardsFromPayload } from './parse-flashcards';
import { formatClassroomScienceText } from './exam-text-normalize';

export const TEACHER_DOWNLOAD_TOOL_IDS = [
  'worksheet-mcq-generator',
  'exam-question-paper-generator',
  'homework-creator',
  'flashcard-generator',
] as const;

function fmt(value: unknown): string {
  return formatClassroomScienceText(value);
}

export function isTeacherDownloadTool(toolType: string): boolean {
  return (TEACHER_DOWNLOAD_TOOL_IDS as readonly string[]).includes(toolType);
}

function safeFileName(label: string): string {
  return String(label || 'content')
    .replace(/\s+/g, '-')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80);
}

export function buildTeacherToolCsv(toolType: string, content: string, rawContent: unknown): string | null {
  if (toolType === 'worksheet-mcq-generator') {
    const { worksheet } = resolveWorksheetFromPayload(content, rawContent);
    if (!worksheet) return null;
    const rows: unknown[][] = [];
    for (const section of worksheet.sections) {
      section.questions.forEach((q, index) => {
        rows.push([
          section.label,
          q.questionNumber ?? index + 1,
          q.type || '',
          fmt(q.question),
          fmt(q.options[0] || ''),
          fmt(q.options[1] || ''),
          fmt(q.options[2] || ''),
          fmt(q.options[3] || ''),
          fmt(q.answer),
          q.marks ?? '',
        ]);
      });
    }
    return buildCsvContent(
      ['Section', 'Question Number', 'Type', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Marks'],
      rows,
    );
  }

  if (toolType === 'homework-creator') {
    const { homework } = resolveHomeworkFromPayload(content, rawContent);
    if (!homework) return null;
    const rows: unknown[][] = [];
    homework.practiceQuestions.forEach((q, index) => {
      rows.push([
        q.type || 'Practice',
        q.question || `Question ${index + 1}`,
        q.options[0] || '',
        q.options[1] || '',
        q.options[2] || '',
        q.options[3] || '',
        q.answer,
      ]);
    });
    homework.applicationTasks.forEach((task, index) => {
      rows.push(['Application', task || `Task ${index + 1}`, '', '', '', '', '']);
    });
    if (homework.creativeThinkingQuestion) {
      rows.push(['Creative', homework.creativeThinkingQuestion, '', '', '', '', '']);
    }
    if (homework.challengeQuestion) {
      rows.push(['Challenge', homework.challengeQuestion, '', '', '', '', '']);
    }
    return buildCsvContent(['Type', 'Question / Task', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'], rows);
  }

  if (toolType === 'exam-question-paper-generator') {
    const { paper } = resolveExamPaperFromPayload(content, rawContent);
    if (!paper?.sections?.length) return null;
    const rows: unknown[][] = [];
    for (const section of paper.sections) {
      section.questions.forEach((q) => {
        rows.push([
          section.title,
          q.questionNumber,
          q.question,
          q.options[0] || '',
          q.options[1] || '',
          q.options[2] || '',
          q.options[3] || '',
          q.answer,
          q.marks ?? '',
        ]);
      });
    }
    return buildCsvContent(
      ['Section', 'Question Number', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Marks'],
      rows,
    );
  }

  if (toolType === 'flashcard-generator') {
    const { cards } = resolveFlashcardsFromPayload(content, rawContent);
    if (!cards.length) return null;
    return buildCsvContent(
      ['Front', 'Back', 'Type', 'Category', 'Memory Hook'],
      cards.map((card) => [
        fmt(card.front),
        fmt(card.back),
        card.type || '',
        card.cardCategory || '',
        fmt(card.memoryHookQuickTip || card.memoryCue || ''),
      ]),
    );
  }

  return null;
}

async function shareHtmlDocument(html: string, filename: string): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File cache is unavailable on this device.');
  }
  const fileUri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Export failed', 'Could not open the save dialog on this device.');
    return;
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/html',
    dialogTitle: `Save ${filename}`,
    UTI: 'public.html',
  });
}

export async function exportTeacherToolDocument(
  toolType: string,
  toolLabel: string,
  content: string,
  rawContent: unknown,
): Promise<void> {
  const body = renderAiToolOutputHtml(toolType, content, rawContent, 'teacher');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${toolLabel}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 16px; color: #111827; background: #fff; }
    img { max-width: 100%; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${body}</body>
</html>`;
  await shareHtmlDocument(html, `${safeFileName(toolLabel)}-${Date.now()}.html`);
}

export async function exportTeacherToolCsvDownload(
  toolType: string,
  toolLabel: string,
  content: string,
  rawContent: unknown,
): Promise<void> {
  const csv = buildTeacherToolCsv(toolType, content, rawContent);
  if (!csv) {
    Alert.alert('Download unavailable', 'Could not build a CSV export for this content.');
    return;
  }
  await exportCsvFile(csv, `${safeFileName(toolLabel)}-${Date.now()}.csv`);
}
