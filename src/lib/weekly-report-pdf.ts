import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export type WeeklyReportPdfExam = {
  title?: string;
  percentage?: number;
  rank?: number | null;
};

export type WeeklyReportPdfInput = {
  title?: string;
  summary?: string;
  highlights?: string[];
  studentName?: string;
  schoolName?: string;
  role?: 'student' | 'teacher';
  metrics: Record<string, unknown>;
};

function n(v: unknown, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

function esc(s: unknown) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tile(label: string, value: string, hint = '') {
  return `<div class="tile">
    <div class="tile-label">${esc(label)}</div>
    <div class="tile-value">${esc(value)}</div>
    ${hint ? `<div class="tile-hint">${esc(hint)}</div>` : ''}
  </div>`;
}

function section(title: string, bodyHtml: string) {
  return `<section class="section">
    <h2>${esc(title)}</h2>
    ${bodyHtml}
  </section>`;
}

function listRows(
  rows: Array<{ title?: string; percentage?: number; rank?: number | null }>,
  empty: string,
) {
  if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<ul class="list">${rows
    .map(
      (r) => `<li>
        <span class="list-title">${esc(r.title || 'Item')}${
          r.rank != null && Number(r.rank) > 0 ? ` · Rank #${esc(r.rank)}` : ''
        }</span>
        <span class="list-pct">${esc(n(r.percentage))}%</span>
      </li>`,
    )
    .join('')}</ul>`;
}

function usageRows(
  rows: Array<{ title?: string; detail?: string; value?: string }>,
  empty: string,
) {
  if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<ul class="list">${rows
    .map(
      (r) => `<li>
        <span class="list-title">${esc(r.title || 'Item')}${
          r.detail
            ? `<br/><span style="font-size:11px;color:#64748b;font-weight:500">${esc(r.detail)}</span>`
            : ''
        }</span>
        <span class="list-pct">${esc(r.value || '')}</span>
      </li>`,
    )
    .join('')}</ul>`;
}

export function buildWeeklyReportHtml(input: WeeklyReportPdfInput): string {
  const m = input.metrics || {};
  const exams = Array.isArray(m.exams) ? (m.exams as WeeklyReportPdfExam[]) : [];
  const omr = Array.isArray(m.omrResults) ? (m.omrResults as WeeklyReportPdfExam[]) : [];
  const highlights = Array.isArray(input.highlights) ? input.highlights : [];
  const topSubjects = Array.isArray(m.topSubjects) ? (m.topSubjects as string[]) : [];
  const toolsUsed = Array.isArray(m.toolsUsed)
    ? (m.toolsUsed as Array<{ name?: string; count?: number; subjects?: string[] }>)
    : [];
  const topSubjectsDetailed = Array.isArray(m.topSubjectsDetailed)
    ? (m.topSubjectsDetailed as Array<{ subject?: string; sessions?: number; pct?: number }>)
    : [];
  const mostUsed = (m.mostUsedSubject || null) as
    | { subject?: string; sessions?: number; pct?: number }
    | null;
  const isTeacher =
    input.role === 'teacher' || String(m.role || '') === 'teacher' || 'generationsCreated' in m;

  if (isTeacher) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;padding:18px}
.hero{border-radius:18px;padding:20px;background:linear-gradient(135deg,#0ea5e9,#0284c7 55%,#0f766e);color:#fff}
.brand{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;opacity:.9}
h1{margin:8px 0 4px;font-size:22px}.sub{margin:0;font-size:13px;opacity:.92}
.section{margin-top:18px}.section h2{margin:0 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#0369a1;font-weight:800}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tile{border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#f8fafc}
.tile-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}
.tile-value{margin-top:4px;font-size:18px;font-weight:800}
.tile-hint{margin-top:2px;font-size:10px;color:#94a3b8}
.list{list-style:none;padding:0;margin:8px 0 0}
.list li{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #e2e8f0}
.list-title{font-size:13px;font-weight:600;color:#334155}
.list-pct{font-size:13px;font-weight:800}
.empty{font-size:12px;color:#64748b}
.highlights{margin-top:16px;padding:12px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd}
</style></head><body>
<div class="hero"><div class="brand">AsliLearn · Teacher weekly report</div>
<h1>${esc(input.title || 'Your weekly AsliLearn teacher report')}</h1>
<p class="sub">${esc(input.summary || '')}</p>
<p class="sub" style="margin-top:8px">${esc(input.studentName || '')}${input.schoolName ? ` · ${esc(input.schoolName)}` : ''}</p>
</div>
${section(
  'Your activity',
  `<div class="grid">
    ${tile('Logins this week', String(n(m.loginCount)), 'Days you opened the app')}
    ${tile('Sessions', String(n(m.sessions)))}
    ${tile('Time on platform', String(m.totalTimeLabel || `${n(m.minutes)} min`))}
    ${tile('Last active', String(m.lastActiveDate || '—'))}
    ${tile('Status (14 days)', String(m.status || '—'))}
    ${tile('Active days (14d)', String(n(m.activeDays)))}
    ${tile('Classes assigned', String(n(m.classesAssigned)))}
    ${tile('Students in classes', String(n(m.studentsInClasses)))}
  </div>`,
)}
${section(
  'Teaching with AI',
  `<div class="grid">
    ${tile('AI resources created', String(n(m.generationsCreated)))}
    ${tile('Vidya AI asks', String(n(m.aiDoubts)))}
    ${tile('Tool opens', String(n(m.aiToolUses)))}
  </div>
  ${usageRows(
    toolsUsed.slice(0, 8).map((t) => ({
      title: t.name || 'Tool',
      detail: Array.isArray(t.subjects) && t.subjects.length ? t.subjects.slice(0, 3).join(' · ') : '',
      value: `${n(t.count)}×`,
    })),
    'No AI tools used this week yet.',
  )}`,
)}
${section(
  'Your school this week',
  `<div class="grid">
    ${tile('Students accessed', String(n(m.schoolStudentsAccessed)))}
    ${tile('School sessions', String(n(m.schoolSessions)))}
    ${tile('Teachers active', String(n(m.schoolTeachersActive)))}
  </div>`,
)}
${
  highlights.length
    ? `<div class="highlights"><strong>This week at a glance</strong><ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>`
    : ''
}
</body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 18px;
    }
    .hero {
      border-radius: 18px;
      padding: 20px;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 55%, #0f766e 100%);
      color: #fff;
    }
    .brand {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.92;
      font-weight: 700;
    }
    .hero h1 { margin: 8px 0 4px; font-size: 22px; font-weight: 800; }
    .hero .sub { margin: 0; font-size: 13px; opacity: 0.92; }
    .meta { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .section { margin-top: 18px; }
    .section h2 {
      margin: 0 0 10px;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #0369a1;
      font-weight: 800;
    }
    .grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .tile {
      width: 31%;
      min-width: 90px;
      flex: 1 1 90px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .tile-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748b;
    }
    .tile-value { margin-top: 4px; font-size: 16px; font-weight: 800; color: #0f172a; }
    .tile-hint { margin-top: 2px; font-size: 10px; color: #64748b; }
    .list { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .list li {
      display: flex; justify-content: space-between; gap: 10px;
      padding: 9px 12px; border-top: 1px solid #f1f5f9; font-size: 12px;
    }
    .list li:first-child { border-top: none; }
    .list-pct { font-weight: 800; }
    .empty { margin: 0; font-size: 12px; color: #64748b; }
    .highlights {
      border-radius: 12px; padding: 12px 14px;
      background: #f0f9ff; border: 1px solid #bae6fd;
    }
    .highlights h3 { margin: 0 0 8px; font-size: 13px; color: #0369a1; font-weight: 800; }
    .highlights ul { margin: 0; padding-left: 18px; }
    .highlights li { margin: 4px 0; font-size: 12px; }
    .footer {
      margin-top: 22px; padding-top: 10px; border-top: 1px dashed #cbd5e1;
      font-size: 10px; color: #64748b;
    }
  </style></head><body>
    <div class="hero">
      <div class="brand">AsliLearn · Student weekly report</div>
      <h1>${esc(input.title || 'Your weekly AsliLearn learning report')}</h1>
      <p class="sub">${esc(input.summary || '')}</p>
      <div class="meta">
        ${input.studentName ? `<span class="chip">${esc(input.studentName)}</span>` : ''}
        ${input.schoolName ? `<span class="chip">${esc(input.schoolName)}</span>` : ''}
        <span class="chip">Generated ${esc(new Date().toLocaleString('en-IN'))}</span>
      </div>
    </div>

    ${section(
      'Adoption',
      `<div class="grid">
        ${tile('Logins this week', String(n(m.loginCount)), 'Days you opened the app')}
        ${tile('Last active', String(m.lastActiveDate || '—'))}
        ${tile('First activation', String(m.activationDate || '—'))}
      </div>`,
    )}

    ${section(
      'Engagement',
      `<div class="grid">
        ${tile('Learning sessions', String(n(m.sessions)))}
        ${tile('Total time', String(m.totalTimeLabel || `${n(m.minutes)} min`))}
        ${tile('Avg session', n(m.avgSessionMinutes) > 0 ? `${n(m.avgSessionMinutes)} min` : '—')}
      </div>`,
    )}

    ${section(
      'Learning behaviour',
      `<div class="grid">
        ${tile('Topics practised', String(n(m.topicsPractised)))}
        ${tile('Repeated topics', String(n(m.topicsRepeated)))}
        ${tile('Repeat practice', `${n(m.repeatPracticePct)}%`)}
      </div>`,
    )}

    ${section(
      'AI usage',
      `<div class="grid">
        ${tile('AI uses', String(n(m.aiExplanations)), `Vidya ${n(m.aiDoubts)} · Tools ${n(m.aiToolUses)}`)}
        ${tile('Practice / quizzes', String(n(m.practiceAttempts) + n(m.iqAttempts)))}
        ${tile('Accuracy', n(m.practiceAttempts) > 0 ? `${n(m.practiceAccuracy)}%` : '—')}
      </div>`,
    )}

    ${section(
      'Tools you used',
      usageRows(
        toolsUsed.slice(0, 8).map((t) => ({
          title: t.name || 'Tool',
          detail: Array.isArray(t.subjects) && t.subjects.length ? t.subjects.slice(0, 3).join(' · ') : '',
          value: `${n(t.count)}×`,
        })),
        'No AI tools used this week yet.',
      ),
    )}

    ${section(
      'Subjects you used most',
      usageRows(
        (topSubjectsDetailed.length
          ? topSubjectsDetailed
          : topSubjects.map((subject) => ({ subject, sessions: 0, pct: 0 }))
        )
          .slice(0, 5)
          .map((s, idx) => ({
            title: `${idx === 0 ? 'Most · ' : ''}${s.subject || 'Subject'}`,
            detail: n(s.pct) > 0 ? `${n(s.pct)}% of subject activity` : '',
            value: n(s.sessions) > 0 ? String(n(s.sessions)) : '—',
          })),
        'No subject activity this week yet.',
      ),
    )}

    ${section(
      'Exams',
      `<div class="grid">
        ${tile('Exams written', String(n(m.examAttempts)))}
        ${tile('Average score', n(m.examAttempts) > 0 ? `${n(m.avgExamPct)}%` : '—')}
        ${tile('Best score', n(m.examAttempts) > 0 ? `${n(m.bestExamPct)}%` : '—')}
      </div>
      ${listRows(exams.slice(0, 8), 'No exams written this week yet.')}`,
    )}

    ${section(
      'Offline Results',
      `<div class="grid">
        ${tile('OMR tests', String(n(m.omrAttempts)))}
        ${tile('Average score', n(m.omrAttempts) > 0 ? `${n(m.omrAvgPct)}%` : '—')}
        ${tile('Best score', n(m.omrAttempts) > 0 ? `${n(m.omrBestPct)}%` : '—')}
      </div>
      ${
        n(m.omrBestRank) > 0
          ? `<p class="empty" style="margin-top:8px">Best rank this week: #${esc(n(m.omrBestRank))}</p>`
          : ''
      }
      ${listRows(omr.slice(0, 8), 'No Offline Results Assigned This Week Yet.')}`,
    )}

    ${section(
      'Content & progress',
      `<div class="grid">
        ${tile(
          'Most used subject',
          String(mostUsed?.subject || (topSubjects.length ? topSubjects[0] : '—')),
          mostUsed?.sessions ? `${n(mostUsed.sessions)} activities` : '',
        )}
        ${tile('Videos watched', String(n(m.videosWatched)))}
        ${tile('Chapters updated', String(n(m.chaptersCompleted)))}
        ${tile('Current streak', n(m.streak) > 0 ? `${n(m.streak)} days` : '0')}
        ${tile('Mastery', `${n(m.masteryPct)}%`)}
        ${tile('Homework submitted', String(n(m.homeworkSubmissions)))}
      </div>`,
    )}

    ${
      highlights.length
        ? `<section class="section"><div class="highlights">
            <h3>This week at a glance</h3>
            <ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
          </div></section>`
        : ''
    }

    <div class="footer">AsliLearn.ai · Keep practising your weak chapters</div>
  </body></html>`;
}

export async function downloadWeeklyReportPdf(input: WeeklyReportPdfInput): Promise<string> {
  const html = buildWeeklyReportHtml(input);
  const file = await Print.printToFileAsync({ html, base64: false });
  const slug = String(input.studentName || input.title || 'weekly-report')
    .replace(/[^\w\s\-]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'weekly-report';
  const named = `${FileSystem.cacheDirectory || ''}${slug}_AsliLearn_Weekly_Report.pdf`;
  let shareUri = file.uri;
  try {
    await FileSystem.copyAsync({ from: file.uri, to: named });
    shareUri = named;
  } catch {
    /* keep print URI */
  }
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share weekly report PDF',
      UTI: 'com.adobe.pdf',
    });
  }
  return shareUri;
}
