import {
  COMPLEXITY_DISPLAY,
  DIFFICULTY_BUCKETS,
  type SchoolAnalysisExamResult,
  buildSchoolPerformanceAnalysisReport,
  displaySubject,
  formatAvgTime,
  formatPct,
  shortSubject,
  topChapter,
} from './school-performance-analysis-data';

export type { QuestionAnalyticsRow, SchoolAnalysisExamResult } from './school-performance-analysis-data';
/** @deprecated Use SchoolAnalysisExamResult */
export type CollegeAnalysisExamResult = SchoolAnalysisExamResult;

const escapeCsvCell = (value: unknown): string =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const csvRow = (cells: unknown[]): string => cells.map(escapeCsvCell).join(',');

export function buildCollegePerformanceAnalysisCsv(
  examTitle: string,
  results: SchoolAnalysisExamResult[],
): string {
  return buildSchoolPerformanceAnalysisCsv(examTitle, results);
}

export function buildSchoolPerformanceAnalysisCsv(
  examTitle: string,
  results: SchoolAnalysisExamResult[],
): string {
  const report = buildSchoolPerformanceAnalysisReport(examTitle, results);
  if (!report) return '';

  const lines: string[] = [];

  lines.push(csvRow(['SCHOOL PERFORMANCE ANALYSIS REPORT']));
  lines.push(csvRow(['Exam Name', report.examTitle]));
  lines.push(csvRow(['Attempt basis', report.attemptNote]));
  lines.push(
    csvRow([
      'Total Students',
      report.studentCount,
      'Total Attempts',
      report.totalAttempts,
      'Total Questions',
      report.overall.total,
      'Subjects',
      report.subjectLabels.length ? report.subjectLabels.join(', ') : '—',
    ]),
  );
  lines.push('');

  lines.push(csvRow(['SECTION A: OVERALL PERFORMANCE SNAPSHOT']));
  lines.push(
    csvRow([
      'Total Questions',
      'Correct Answers',
      'Wrong Answers',
      'Left / Unattempted',
      'Overall Accuracy',
      'Avg Time/Que',
      'Total Students',
      'Total Attempts',
      'Avg Q per Student',
      'Avg Q per Attempt',
    ]),
  );
  lines.push(
    csvRow([
      report.overall.total,
      report.overall.correct,
      report.overall.wrong,
      report.overall.left,
      formatPct(report.overall.correct, report.overall.total),
      formatAvgTime(report.overall.totalTime, report.overall.total),
      report.studentCount,
      report.totalAttempts,
      report.overall.avgQPerStudent,
      report.overall.avgQPerAttempt,
    ]),
  );
  lines.push('');

  lines.push(csvRow(['SECTION B: SUBJECT-WISE PERFORMANCE']));
  lines.push(
    csvRow([
      'Subject',
      'Total Qs',
      'Correct',
      'Wrong',
      'Left',
      'Accuracy',
      'Avg Time/Que',
      'Easy Qs',
      'Medium Qs',
      'Hard Qs',
      'Very Hard Qs',
      'Numerical Qs',
      'Formula Qs',
      'Top Chapter',
    ]),
  );
  for (const subjectKey of report.subjects) {
    const agg = report.bySubject.get(subjectKey)!;
    lines.push(
      csvRow([
        displaySubject(subjectKey),
        agg.total,
        agg.correct,
        agg.wrong,
        agg.left,
        formatPct(agg.correct, agg.total),
        formatAvgTime(agg.totalTime, agg.total),
        report.hasQuestionAnalytics ? agg.easy : '—',
        report.hasQuestionAnalytics ? agg.moderate : '—',
        report.hasQuestionAnalytics ? agg.difficult : '—',
        report.hasQuestionAnalytics ? agg.highly_difficult : '—',
        report.hasQuestionAnalytics ? agg.numerical : '—',
        report.hasQuestionAnalytics ? agg.formula : '—',
        report.hasQuestionAnalytics ? topChapter(agg) : '—',
      ]),
    );
  }
  lines.push('');

  lines.push(csvRow(['SECTION C: COMPLEXITY-WISE PERFORMANCE']));
  lines.push(csvRow(['Complexity', 'Total Qs', 'Correct', 'Wrong', 'Left', 'Accuracy', 'Avg Time/Que']));
  for (const bucket of DIFFICULTY_BUCKETS) {
    const agg = report.byDifficulty.get(bucket)!;
    if (!report.hasQuestionAnalytics && agg.total === 0) continue;
    lines.push(
      csvRow([
        COMPLEXITY_DISPLAY[bucket],
        agg.total,
        agg.correct,
        agg.wrong,
        agg.left,
        formatPct(agg.correct, agg.total),
        formatAvgTime(agg.totalTime, agg.total),
      ]),
    );
  }
  if (!report.hasQuestionAnalytics) {
    lines.push(csvRow(['—', '—', '—', '—', '—', '—', 'Question-level analytics not available']));
  }
  lines.push('');

  lines.push(csvRow(['SECTION D: STUDENT PERFORMANCE RANKING']));
  lines.push(
    csvRow([
      'Rank',
      'Student',
      'Class',
      'Attempt',
      'Completed At',
      'Total',
      'Correct',
      'Wrong',
      'Left',
      'Accuracy',
      'Avg',
      ...report.subjects.map((k) => `${shortSubject(k)} Acc%`),
      'Top',
      'Performance',
    ]),
  );

  for (const student of report.rankedStudents) {
    lines.push(
      csvRow([
        student.rank,
        student.name,
        student.classNumber,
        student.attemptLabel,
        student.completedAt,
        student.total,
        student.correct,
        student.wrong,
        student.left,
        student.accuracyLabel,
        student.avgTime,
        ...report.subjects.map((key) => {
          const acc = student.subjectAcc.get(key);
          return acc != null ? `${acc.toFixed(1)}%` : '—';
        }),
        student.topSubject,
        student.performance,
      ]),
    );
  }

  return lines.join('\n');
}

export function schoolPerformanceAnalysisFilename(examTitle: string): string {
  const slug = String(examTitle || 'exam')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'exam'}_School_Performance_Analysis_${date}.csv`;
}

/** @deprecated Use schoolPerformanceAnalysisFilename */
export function collegePerformanceAnalysisFilename(examTitle: string): string {
  return schoolPerformanceAnalysisFilename(examTitle);
}

/** UTF-8 BOM so Excel opens the file with correct encoding and column layout. */
export function withExcelCsvBom(csv: string): string {
  return csv.startsWith('\uFEFF') ? csv : `\uFEFF${csv}`;
}
