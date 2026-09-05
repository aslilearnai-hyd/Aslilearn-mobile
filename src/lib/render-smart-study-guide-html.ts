function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const SECTION_COLORS: Record<number, string> = {
  1: '#4f46e5',
  2: '#2563eb',
  3: '#7c3aed',
  4: '#0891b2',
  5: '#4f46e5',
  6: '#d97706',
  7: '#0d9488',
  8: '#65a30d',
  9: '#ea580c',
  10: '#4f46e5',
  11: '#c026d3',
};

export function renderSmartStudyGuideHtml(text: string): string {
  if (!text?.trim()) return '';

  let processed = text;
  try {
    if (text.trim().startsWith('{') && text.includes('"formatted"')) {
      const parsed = JSON.parse(text) as { formatted?: string };
      if (parsed.formatted) processed = parsed.formatted;
    }
  } catch {
    /* use raw */
  }

  const lines = processed.split('\n');
  const sections: string[] = [];
  let docHeader = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];

  const flush = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    const color = SECTION_COLORS[currentSection] || '#4f46e5';
    const body = bodyLines
      .map((line) => {
        const t = line.trim();
        if (!t) return '';
        if (/^[-*•]\s+/.test(t)) {
          return `<li style="margin-bottom:6px;line-height:1.6;color:#334155;">${formatInline(t.replace(/^[-*•]\s+/, ''))}</li>`;
        }
        if (/^\d+\.\s+/.test(t)) {
          return `<p style="margin:0 0 8px;line-height:1.65;color:#334155;font-weight:600;">${formatInline(t)}</p>`;
        }
        return `<p style="margin:0 0 8px;line-height:1.65;color:#334155;">${formatInline(t)}</p>`;
      })
      .join('');
    sections.push(`
      <section style="margin-bottom:10px;border-radius:14px;border:1px solid #c7d2fe;background:#fff;overflow:hidden;box-shadow:0 1px 3px rgba(79,70,229,0.08);">
        <div style="border-left:4px solid ${color};padding:10px 12px;background:#f8fafc;">
          <p style="margin:0;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#818cf8;">Section ${currentSection || '—'}</p>
          <h3 style="margin:2px 0 0;font-size:13px;font-weight:800;color:#0f172a;">${formatInline(currentTitle || `Section ${currentSection}`)}</h3>
        </div>
        <div style="padding:10px 12px 12px;">${body}</div>
      </section>
    `);
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || /^---+$/.test(trimmed)) continue;

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1 && !trimmed.startsWith('##')) {
      docHeader = `
        <header style="margin-bottom:14px;border-radius:18px;padding:16px;border:1px solid #c7d2fe;background:linear-gradient(135deg,#eef2ff,#fff,#ecfeff);box-shadow:0 2px 8px rgba(99,102,241,0.08);">
          <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4f46e5;">Smart Study Guide</p>
          <h1 style="margin:6px 0 0;font-size:20px;font-weight:800;color:#0f172a;">${formatInline(h1[1].trim())}</h1>
        </header>
      `;
      continue;
    }

    const mainSec = trimmed.match(/^#{1,3}\s+(\d{1,2})\.\s*(.+)$/);
    if (mainSec) {
      flush();
      currentSection = Number(mainSec[1]);
      currentTitle = mainSec[2].trim();
      continue;
    }

    if (currentSection > 0) bodyLines.push(raw);
  }
  flush();

  const body =
    sections.length > 0
      ? sections.join('')
      : `<div style="font-size:14px;line-height:1.7;color:#334155;">${formatInline(processed).replace(/\n/g, '<br/>')}</div>`;

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:transparent;}</style></head><body><div style="border-radius:18px;border:1px solid #c7d2fe;padding:12px;background:#eef2ff;background-image:radial-gradient(circle,rgba(99,102,241,0.08) 1px,transparent 1px);background-size:20px 20px;">${docHeader}${body}</div></body></html>`;
}
