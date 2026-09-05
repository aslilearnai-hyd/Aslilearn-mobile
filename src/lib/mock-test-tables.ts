import type { ExamSection } from './parse-exam-question-paper';

export function shouldRebuildSelfAnalysisTable(markdown: string, questionCount: number): boolean {
  const count = Number(questionCount) || 0;
  if (count <= 0) return false;
  const raw = String(markdown || '').trim();
  if (!raw || !raw.includes('|')) return true;
  if (/\d+\s*[-–—]\s*\d+/.test(raw)) return true;
  const rows = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|[-\s|]+\|$/.test(l.replace(/[^|]/g, '')));
  const dataRows = rows.filter(
    (l) =>
      !l.includes('---') &&
      !/^\|\s*Q\.\s*No/i.test(l) &&
      !/Question\s*Number/i.test(l) &&
      !/^\|\s*Section\s*\|/i.test(l),
  );
  const withoutTotal = dataRows.filter((l) => !/\|\s*\*?\*?Total\*?\*?\s*\|/i.test(l));
  return withoutTotal.length !== count;
}

export function buildSelfAnalysisTableMarkdown(sections: ExamSection[]): string {
  const lines = [
    '_Fill in after you complete the mock test. Compare with Section 7 (Answer Key)._',
    '',
    '| Q. No. | Section | Max marks | Marks scored | Correct? ✓/✗ | Notes |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  let n = 0;
  let totalMarks = 0;
  for (const sec of sections) {
    const secLabel = (sec.title || 'Section').replace(/\|/g, '/').trim();
    const shortSec = secLabel.length > 30 ? `${secLabel.slice(0, 27)}…` : secLabel;
    for (const q of sec.questions || []) {
      n += 1;
      const marksNum = q.marks != null && Number.isFinite(q.marks) ? q.marks : null;
      const marksCell = marksNum != null ? String(marksNum) : '—';
      if (marksNum != null) totalMarks += marksNum;
      lines.push(`| ${n} | ${shortSec} | ${marksCell} | | | |`);
    }
  }
  if (n === 0) {
    for (let i = 1; i <= 8; i += 1) lines.push(`| ${i} | — | — | | | |`);
    lines.push('| **Total** | | **—** | | | |');
    return lines.join('\n');
  }
  lines.push(`| **Total** | | **${totalMarks > 0 ? totalMarks : '—'}** | | | |`);
  return lines.join('\n');
}

export function synthesizeAnswerKeyFromSections(sections: ExamSection[]): string {
  const lines: string[] = [];
  let n = 0;
  for (const sec of sections) {
    for (const q of sec.questions || []) {
      n += 1;
      if (q.answer?.trim()) {
        lines.push(`${n}. **${q.answer.trim()}** _(${sec.title.replace(/\|/g, '/')})_`);
      }
    }
  }
  return lines.join('\n');
}

export function synthesizeSolutionsFromSections(sections: ExamSection[]): string {
  const lines: string[] = [];
  let n = 0;
  for (const sec of sections) {
    for (const q of sec.questions || []) {
      n += 1;
      if (q.answer?.trim()) {
        lines.push(`${n}. **${q.answer.trim()}** _(${sec.title.replace(/\|/g, '/')})_`);
      }
    }
  }
  return lines.join('\n');
}
