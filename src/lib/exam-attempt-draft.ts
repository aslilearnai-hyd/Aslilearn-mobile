import AsyncStorage from '@react-native-async-storage/async-storage';

export type MobileExamDraft = {
  examId: string;
  answers: Record<string, unknown>;
  flaggedQuestions: number[];
  questionTimings: Record<string, number>;
  currentQuestionIndex: number;
  remainingSeconds: number;
  durationSeconds: number;
  lastSavedAt: string;
};

function key(examId: string, userId?: string | null) {
  return `aslilearn:exam-draft:${String(userId || 'anon')}:${String(examId)}`;
}

export async function readMobileExamDraft(
  examId: string,
  userId?: string | null,
): Promise<MobileExamDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(key(examId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MobileExamDraft;
    if (!parsed || String(parsed.examId) !== String(examId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeMobileExamDraft(
  examId: string,
  payload: Omit<MobileExamDraft, 'examId' | 'lastSavedAt'>,
  userId?: string | null,
) {
  try {
    const doc: MobileExamDraft = {
      examId: String(examId),
      ...payload,
      lastSavedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key(examId, userId), JSON.stringify(doc));
  } catch {
    /* ignore */
  }
}

export async function clearMobileExamDraft(examId: string, userId?: string | null) {
  try {
    await AsyncStorage.removeItem(key(examId, userId));
  } catch {
    /* ignore */
  }
}

export function pickMobileResumeDraft(
  server: MobileExamDraft | null | undefined,
  local: MobileExamDraft | null | undefined,
): MobileExamDraft | null {
  if (server && local) {
    const sCount = Object.keys(server.answers || {}).length;
    const lCount = Object.keys(local.answers || {}).length;
    if (sCount > 0 && lCount === 0) return server;
    if (lCount > 0 && sCount === 0) return local;
    const s = new Date(server.lastSavedAt || 0).getTime();
    const l = new Date(local.lastSavedAt || 0).getTime();
    return l > s ? local : server;
  }
  return server || local || null;
}

export function normalizeMobileDraftAnswers(
  answers: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    const k = String(key || '').trim();
    if (!k) continue;
    out[k] = value;
  }
  return out;
}
