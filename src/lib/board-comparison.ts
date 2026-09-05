import api from '../services/api/api';

export type BoardAnalytics = {
  board: string;
  students: number;
  exams: number;
  totalAttempts: number;
  averageScore: string;
  participationRate: string;
};

const ASLI_EXCLUSIVE_BOARD_KEYS = new Set([
  'ASLI_EXCLUSIVE_SCHOOLS',
  'ASLI EXCLUSIVE SCHOOLS',
  'Asli Exclusive Schools',
]);

export function formatBoardName(name: string): string {
  if (!name) return name;
  if (name === 'ASLI EXCLUSIVE SCHOOLS' || name === 'ASLI_EXCLUSIVE_SCHOOLS') {
    return 'Asli Exclusive Schools';
  }
  return name;
}

function isAsliExclusiveBoardLabel(name: string): boolean {
  const key = String(name || '').trim();
  return ASLI_EXCLUSIVE_BOARD_KEYS.has(key) || key.toUpperCase().replace(/\s+/g, '_') === 'ASLI_EXCLUSIVE_SCHOOLS';
}

export function filterComparisonBoards(rows: BoardAnalytics[]): BoardAnalytics[] {
  return rows.filter((item) => !isAsliExclusiveBoardLabel(item.board));
}

function mapComparisonItem(item: Record<string, unknown>): BoardAnalytics {
  return {
    board: formatBoardName(String(item.boardName || item.board || '')),
    students: Number(item.students || 0),
    exams: Number(item.exams || 0),
    totalAttempts: Number(item.totalAttempts || 0),
    averageScore: String(item.averageScore ?? '0.00'),
    participationRate: String(item.participationRate ?? '0.0'),
  };
}

async function fetchBoardDashboardFallback(board: string): Promise<BoardAnalytics | null> {
  try {
    const response = await api.get(`/api/super-admin/boards/${board}/dashboard`);
    const payload = response?.data;
    const data = payload?.data || payload;
    if (!data?.stats) return null;

    const stats = data.stats;
    const totalStudents = Number(stats.students || 0);
    const totalAttempts = Number(stats.examResults || stats.totalExamAttempts || 0);
    const participationRate =
      typeof stats.participationRate === 'string' || typeof stats.participationRate === 'number'
        ? String(stats.participationRate)
        : totalStudents > 0 && totalAttempts > 0
          ? Math.min(100, (totalAttempts / totalStudents) * 100).toFixed(1)
          : '0.0';

    return {
      board: formatBoardName(String(data.board?.name || board)),
      students: totalStudents,
      exams: Number(stats.exams || 0),
      totalAttempts,
      averageScore:
        typeof stats.averageScore === 'number'
          ? stats.averageScore.toFixed(2)
          : String(stats.averageScore || '0.00'),
      participationRate,
    };
  } catch {
    return null;
  }
}

export async function fetchBoardComparison(): Promise<BoardAnalytics[]> {
  try {
    const comparisonResponse = await api.get('/api/super-admin/boards/analytics/comparison');
    const comparisonData = comparisonResponse?.data;

    if (comparisonData?.success && Array.isArray(comparisonData.data)) {
      return filterComparisonBoards(comparisonData.data.map(mapComparisonItem));
    }

    if (Array.isArray(comparisonData?.data)) {
      return filterComparisonBoards(comparisonData.data.map(mapComparisonItem));
    }
  } catch {
    // fall through to per-board fetch
  }

  const boards = ['CBSE', 'STATE', 'SSC', 'ICSE', 'IB', 'CAMBRIDGE'];
  const results = await Promise.all(boards.map((board) => fetchBoardDashboardFallback(board)));
  return filterComparisonBoards(
    results.filter((row): row is BoardAnalytics => row !== null)
  );
}

export async function fetchBoardExportData(dataType: string): Promise<Record<string, unknown>[]> {
  try {
    const response = await api.get('/api/super-admin/boards/export', { params: { dataType } });
    const payload = response?.data;
    if (payload?.success && Array.isArray(payload.data) && payload.data.length > 0) {
      return payload.data;
    }
  } catch {
    // caller falls back to local export
  }
  return [];
}

export function buildComparisonCsv(title: string, rows: BoardAnalytics[], dataKey: keyof BoardAnalytics): string {
  const headers = ['Board', title];
  const lines = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => `"${row.board}","${row[dataKey]}"`),
  ];
  return lines.join('\n');
}
