/** Canonical board key for grouping/filtering (mirrors backend lockBoardKey). */
export function normalizeBoardKey(raw?: string | null): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return '';
  const compact = s.toUpperCase().replace(/[\s/\\-]+/g, '');
  if (compact === 'CBSE' || compact === 'CBSC') return 'CBSE';
  if (compact.includes('IIT') || compact.includes('NEET') || compact.includes('JEE')) {
    return 'IIT/NEET';
  }
  if (compact === 'ASLIEXCLUSIVESCHOOLS') return 'ASLI_EXCLUSIVE_SCHOOLS';
  return s.toUpperCase();
}

export function displayBoardShort(board?: string | null): string {
  const key = normalizeBoardKey(board);
  if (!key) return '';
  if (key === 'IIT/NEET') return 'IIT';
  if (key === 'ASLI_EXCLUSIVE_SCHOOLS') return 'Asli Exclusive';
  return key;
}

export function formatClassBoardLabel(classNum: string, board?: string | null): string {
  const n = String(classNum || '').trim();
  if (!n) return '';
  const b = displayBoardShort(board);
  return b ? `Class ${n} (${b})` : `Class ${n}`;
}

export function parseClassBoardLabel(label: string): { classNum: string; board: string } {
  const raw = String(label || '').trim();
  const withBoard = raw.match(/^Class\s+(\d+)\s*\(([^)]+)\)\s*$/i);
  if (withBoard) {
    const boardRaw = withBoard[2].trim();
    const board =
      /^iit$/i.test(boardRaw) || /^iit\s*\/\s*neet$/i.test(boardRaw)
        ? 'IIT/NEET'
        : normalizeBoardKey(boardRaw);
    return { classNum: withBoard[1], board };
  }
  const legacy = raw.match(/^Class\s+(\d+)\s*$/i);
  if (legacy) return { classNum: legacy[1], board: '' };
  return { classNum: '', board: '' };
}

export function classBoardFilterKey(classNum: string, board?: string | null): string {
  return `${String(classNum || '').trim()}|${normalizeBoardKey(board)}`;
}

export function parseClassBoardFilterKey(key: string): { classNum: string; board: string } | null {
  if (!key || key === 'all') return null;
  const pipe = key.indexOf('|');
  if (pipe === -1) {
    return { classNum: String(key).trim(), board: '' };
  }
  const classNum = key.slice(0, pipe).trim();
  const board = normalizeBoardKey(key.slice(pipe + 1));
  if (!classNum) return null;
  return { classNum, board };
}

export function formatClassBoardFilterLabel(classNum: string, board?: string | null): string {
  return formatClassBoardLabel(classNum, board);
}

export function boardsMatch(a?: string | null, b?: string | null): boolean {
  return normalizeBoardKey(a) === normalizeBoardKey(b);
}
