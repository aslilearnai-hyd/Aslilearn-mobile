const CHAPTER_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** Extract chapter/unit number from labels like "Chapter 10 - …" or "Ch 3: …". */
export function chapterNumberFromLabel(value: string): number | null {
  const s = String(value || '').trim();
  if (!s) return null;
  const chapterMatch = s.match(/\b(?:chapter|ch\.?|unit)\s*[-–—.#:]?\s*(\d+)\b/i);
  if (chapterMatch) {
    const n = parseInt(chapterMatch[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  const leading = s.match(/^(\d+)\s*[.\):\-–—]?\s+/);
  if (leading) {
    const n = parseInt(leading[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  const leadingTight = s.match(/^(\d+)\s*[.\):\-–—]/);
  if (leadingTight) {
    const n = parseInt(leadingTight[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Strip Chapter/Unit prefixes so bare titles and Chapter-N labels share an identity. */
export function canonicalTopicKey(value: string): string {
  let s = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ');
  if (!s) return '';

  // "Integers - Integers" / "Chapter 1 - Chapter 1 - Integers"
  for (let i = 0; i < 3; i += 1) {
    const next = s
      .replace(/^(chapter|ch\.?|unit)\s*[-–—.#:]?\s*\d+\s*[-–—:.]?\s*/i, '')
      .replace(/^\d+\s*[.\):\-–—]?\s*/, '')
      .trim();
    if (next === s) break;
    s = next;
  }

  // Collapse "title - title"
  const dashParts = s.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const first = dashParts[0];
    if (dashParts.every((p) => p === first)) s = first;
  }

  return s
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicLabelScore(value: string): number {
  const s = String(value || '').trim();
  if (!s) return -1;
  let score = Math.min(s.length, 80);
  if (chapterNumberFromLabel(s) != null) score += 1000;
  if (/^(chapter|ch\.?|unit)\b/i.test(s)) score += 100;
  // Prefer "Chapter N - Title" over bare "Chapter N"
  if (/\s[-–—:]\s*.+/u.test(s) || /\s-\s.+/.test(s)) score += 200;
  if (!/\s-\s/.test(s) || chapterNumberFromLabel(s) != null) score += 20;
  return score;
}

/** Chapter 1, 2, … 9, 10, 11 — not Chapter 1, 10, 11, 2 (string sort). */
export function compareChapterWiseLabels(a: string, b: string): number {
  const aCh = chapterNumberFromLabel(a);
  const bCh = chapterNumberFromLabel(b);
  if (aCh != null && bCh != null && aCh !== bCh) return aCh - bCh;
  if (aCh != null && bCh == null) return -1;
  if (aCh == null && bCh != null) return 1;
  return CHAPTER_COLLATOR.compare(a, b);
}

export function sortChapterWiseLabels(labels: string[]): string[] {
  return [...labels].sort(compareChapterWiseLabels);
}

/**
 * Dedupe topic/subtopic labels that mean the same chapter
 * ("Chapter 1" vs "Chapter 1 - The Wonderful World…"), keep the best display label,
 * then sort chapter-wise.
 */
export function dedupeChapterWiseLabels(labels: string[]): string[] {
  const byChapter = new Map<number, string>();
  const byKey = new Map<string, string>();

  for (const raw of labels) {
    const label = String(raw || '').trim();
    if (!label) continue;
    const ch = chapterNumberFromLabel(label);
    if (ch != null) {
      const prev = byChapter.get(ch);
      if (!prev || topicLabelScore(label) > topicLabelScore(prev)) {
        byChapter.set(ch, label);
      }
      continue;
    }
    const key = canonicalTopicKey(label) || label.toLowerCase();
    const prev = byKey.get(key);
    if (!prev || topicLabelScore(label) > topicLabelScore(prev)) {
      byKey.set(key, label);
    }
  }

  for (const chapterLabel of byChapter.values()) {
    const canon = canonicalTopicKey(chapterLabel);
    if (canon) byKey.delete(canon);
  }

  return sortChapterWiseLabels([...byChapter.values(), ...byKey.values()]);
}

/**
 * Keep admin/API order first; append extras without reordering the primary list.
 * Chapter-aware: "Elementary Shapes" is dropped when "Chapter-5 - Elementary Shapes" exists.
 */
export function mergePreservingPrimaryOrder(primary: string[], secondary: string[]): string[] {
  const byKey = new Map<string, string>();
  const order: string[] = [];

  const upsert = (value: string, appendIfNew: boolean) => {
    const label = String(value || '').trim();
    if (!label) return;
    const key = canonicalTopicKey(label) || label.toLowerCase();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, label);
      if (appendIfNew) order.push(key);
      return;
    }
    if (topicLabelScore(label) > topicLabelScore(prev)) {
      byKey.set(key, label);
    }
  };

  for (const value of primary) {
    const label = String(value || '').trim();
    if (!label) continue;
    const key = canonicalTopicKey(label) || label.toLowerCase();
    if (!byKey.has(key)) order.push(key);
    upsert(label, false);
  }
  for (const value of secondary) {
    upsert(value, true);
  }

  return dedupeChapterWiseLabels(order.map((key) => byKey.get(key)!).filter(Boolean));
}

/** Alpha / IIT Alpha → ALPHA (matches backend productCategory). */
export function normalizeProductCategory(value?: string | null): string {
  if (!value) return '';
  let u = String(value)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!u) return '';
  if (u.startsWith('IIT_')) u = u.slice(4);
  if (u === 'GENERAL' || u === 'NONE' || u === 'ALL') return '';
  return u;
}
