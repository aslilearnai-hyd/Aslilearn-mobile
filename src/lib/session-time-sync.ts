import { storageGetItem } from './safe-storage';
import { API_BASE_URL } from './api-config';
import { updateStudyTime, getWeeklyStudyData, startSession, endSession } from '../utils/studyTimeTracker';
import { toLocalDateKey } from './profile-overview-stats';
import { jwtRole, jwtUserId } from './jwt-payload';

const MAX_STUDY_MINUTES_PER_DAY = 12 * 60;
const MAX_STUDY_MINUTES_PER_WEEK = MAX_STUDY_MINUTES_PER_DAY * 7;

export function dateStringToIsoKey(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return toLocalDateKey(parsed);
}

type SessionBaseline = {
  useBackend: boolean;
  backendToday: number;
  backendWeek: number;
  localTodayAtLoad: number;
  localWeekAtLoad: number;
};

let sessionBaseline: SessionBaseline = {
  useBackend: false,
  backendToday: 0,
  backendWeek: 0,
  localTodayAtLoad: 0,
  localWeekAtLoad: 0,
};

let baselineInitialized = false;
let baselineUserKey = '';

type StudyTimeListener = (times: { today: number; thisWeek: number }) => void;

let syncCleanup: (() => void) | null = null;
let syncSubscriberCount = 0;
const studyTimeListeners = new Set<StudyTimeListener>();

function capStudyMinutes(minutes: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(minutes)));
}

/** Backend week total already includes today — replace today's slice with live capped today. */
export function mergeDisplayedStudyTime(
  baseline: SessionBaseline,
  localTimes: { today: number; thisWeek: number }
): { today: number; thisWeek: number } {
  if (!baseline.useBackend) {
    return {
      today: capStudyMinutes(localTimes.today, MAX_STUDY_MINUTES_PER_DAY),
      thisWeek: capStudyMinutes(localTimes.thisWeek, MAX_STUDY_MINUTES_PER_WEEK),
    };
  }

  const deltaToday = Math.max(0, localTimes.today - baseline.localTodayAtLoad);
  const mergedToday = capStudyMinutes(
    Math.max(baseline.backendToday + deltaToday, localTimes.today),
    MAX_STUDY_MINUTES_PER_DAY
  );
  const weekWithoutToday = Math.max(0, baseline.backendWeek - baseline.backendToday);
  const thisWeek = capStudyMinutes(
    Math.max(weekWithoutToday + mergedToday, localTimes.thisWeek),
    MAX_STUDY_MINUTES_PER_WEEK
  );

  return { today: mergedToday, thisWeek };
}

/** Backend + local study minutes per calendar day (YYYY-MM-DD). */
export async function fetchWeeklySessionMinutes(
  token?: string | null
): Promise<{ backend: Record<string, number>; local: Record<string, number> }> {
  await updateStudyTime();
  const localRaw = await getWeeklyStudyData();
  const local: Record<string, number> = {};
  for (const [dateStr, mins] of Object.entries(localRaw)) {
    const key = dateStringToIsoKey(dateStr);
    local[key] = Math.max(local[key] || 0, Number(mins) || 0);
  }

  if (!token) {
    return { backend: {}, local };
  }

  const backendSession = await fetchSessionTimeFromBackend(token);
  const backend = backendSession?.weeklyData || {};
  return { backend, local };
}

export function getLocalIsoDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type SessionTimeData = {
  today: number;
  thisWeek: number;
  weeklyData: Record<string, number>;
};

function sessionTimePathFromToken(token?: string | null): string {
  return jwtRole(token) === 'teacher' ? '/api/teacher/session-time' : '/api/student/session-time';
}

export async function fetchSessionTimeFromBackend(token: string): Promise<SessionTimeData | null> {
  const response = await fetch(`${API_BASE_URL}${sessionTimePathFromToken(token)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.success || !data?.data) return null;
  return {
    today: Number(data.data.today) || 0,
    thisWeek: Number(data.data.thisWeek) || 0,
    weeklyData: data.data.weeklyData || {},
  };
}

export async function saveSessionTimeToBackend(todayMinutes: number): Promise<void> {
  const token = await storageGetItem('authToken');
  if (!token || todayMinutes <= 0) return;
  await fetch(`${API_BASE_URL}${sessionTimePathFromToken(token)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: getLocalIsoDateKey(),
      totalMinutes: todayMinutes,
    }),
  }).catch(() => null);
}

async function readBaselineUserKey(token: string): Promise<string> {
  return jwtUserId(token) || token.slice(-12);
}

async function initSessionBaseline(token: string, force = false): Promise<void> {
  const userKey = await readBaselineUserKey(token);
  if (baselineInitialized && !force && baselineUserKey === userKey) {
    return;
  }

  await endSession();
  const localAtLoad = await updateStudyTime();
  const backend = await fetchSessionTimeFromBackend(token);

  if (backend) {
    const todayKey = getLocalIsoDateKey();
    const todayFromWeekly = Number(backend.weeklyData[todayKey]) || 0;
    const backendToday = Math.max(Number(backend.today) || 0, todayFromWeekly);
    sessionBaseline = {
      useBackend: true,
      backendToday,
      backendWeek: backend.thisWeek || 0,
      localTodayAtLoad: localAtLoad.today,
      localWeekAtLoad: localAtLoad.thisWeek,
    };
  } else {
    sessionBaseline = {
      useBackend: false,
      backendToday: 0,
      backendWeek: 0,
      localTodayAtLoad: localAtLoad.today,
      localWeekAtLoad: localAtLoad.thisWeek,
    };
  }

  baselineInitialized = true;
  baselineUserKey = userKey;
}

export function resetSessionBaseline(): void {
  baselineInitialized = false;
  baselineUserKey = '';
  sessionBaseline = {
    useBackend: false,
    backendToday: 0,
    backendWeek: 0,
    localTodayAtLoad: 0,
    localWeekAtLoad: 0,
  };
}

/** Merge local tracker with backend session-time (web dashboard parity). */
export async function getMergedStudyTime(forceRefresh = false): Promise<{ today: number; thisWeek: number }> {
  const token = await storageGetItem('authToken');
  if (token) {
    await initSessionBaseline(token, forceRefresh);
  }
  const localTimes = await updateStudyTime();
  return mergeDisplayedStudyTime(sessionBaseline, localTimes);
}

function notifyStudyTimeListeners(times: { today: number; thisWeek: number }): void {
  studyTimeListeners.forEach((listener) => {
    try {
      listener(times);
    } catch (error) {
      console.error('Study time listener failed:', error);
    }
  });
}

function ensureSessionTimeSyncRunning(): () => void {
  if (syncCleanup) {
    syncSubscriberCount += 1;
    return () => {
      syncSubscriberCount = Math.max(0, syncSubscriberCount - 1);
      if (syncSubscriberCount === 0 && syncCleanup) {
        syncCleanup();
        syncCleanup = null;
      }
    };
  }

  let saveInterval: ReturnType<typeof setInterval> | null = null;
  let displayInterval: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;
  let trackingStarted = false;

  const refresh = async () => {
    const localTimes = await updateStudyTime();
    notifyStudyTimeListeners(mergeDisplayedStudyTime(sessionBaseline, localTimes));
  };

  const startTracking = async () => {
    if (trackingStarted || cancelled) return;
    trackingStarted = true;
    await startSession();
    await refresh();
  };

  const bootstrap = async () => {
    const token = await storageGetItem('authToken');
    if (token) {
      await initSessionBaseline(token, true);
    } else {
      const localAtLoad = await updateStudyTime();
      sessionBaseline = {
        useBackend: false,
        backendToday: 0,
        backendWeek: 0,
        localTodayAtLoad: localAtLoad.today,
        localWeekAtLoad: localAtLoad.thisWeek,
      };
    }
    await startTracking();
  };

  void bootstrap();
  displayInterval = setInterval(() => void refresh(), 60_000);
  saveInterval = setInterval(async () => {
    const localTimes = await updateStudyTime();
    const { today } = mergeDisplayedStudyTime(sessionBaseline, localTimes);
    await saveSessionTimeToBackend(today);
  }, 5 * 60 * 1000);

  syncCleanup = () => {
    cancelled = true;
    if (displayInterval) clearInterval(displayInterval);
    if (saveInterval) clearInterval(saveInterval);
    void endSession().then(async () => {
      const localTimes = await updateStudyTime();
      const { today } = mergeDisplayedStudyTime(sessionBaseline, localTimes);
      await saveSessionTimeToBackend(today);
    });
  };

  syncSubscriberCount = 1;
  return () => {
    syncSubscriberCount = Math.max(0, syncSubscriberCount - 1);
    if (syncSubscriberCount === 0 && syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
  };
}

/** One global foreground timer; safe to call from multiple screens. */
export function setupSessionTimeSync(
  onUpdate: (times: { today: number; thisWeek: number }) => void
): () => void {
  studyTimeListeners.add(onUpdate);
  const release = ensureSessionTimeSyncRunning();

  void getMergedStudyTime(true).then(onUpdate).catch(() => null);

  return () => {
    studyTimeListeners.delete(onUpdate);
    release();
  };
}
