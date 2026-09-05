/**
 * Study Time Tracker Utility for React Native
 * Tracks foreground app session time (not video/quiz duration).
 */

import { AppState, AppStateStatus } from 'react-native';
import { jwtUserId } from '../lib/jwt-payload';
import { storageGetItem, storageSetItem } from '../lib/safe-storage';

const MAX_CONTINUOUS_SESSION_MS = 30 * 60 * 1000;
const MAX_ORPHAN_SESSION_MINUTES = 5;
const CORRUPTED_DAILY_CAP_MINUTES = 12 * 60;

let trackerMutex: Promise<void> = Promise.resolve();

async function withTrackerLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = trackerMutex.then(fn, fn);
  trackerMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

let warnedDefaultKey = false;

async function getStorageKey(): Promise<string> {
  try {
    const token = await storageGetItem('authToken');
    const userId = jwtUserId(token);
    if (userId) {
      warnedDefaultKey = false;
      return `studyTimeData_${userId}`;
    }
  } catch (error) {
    console.warn('Could not extract user ID from token:', error);
  }

  if (__DEV__ && !warnedDefaultKey) {
    warnedDefaultKey = true;
    console.warn('Using default study time storage key until auth token is available');
  }
  return 'studyTimeData';
}

interface DailyData {
  totalMinutes: number;
  sessions: Array<{
    startTime: number;
    endTime?: number;
  }>;
  lastUpdate: number;
}

interface StudyTimeData {
  dailyData: { [dateKey: string]: DailyData };
  weekStart: string;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function todayDateKey(): string {
  return new Date().toDateString();
}

/** Close crashed/orphan sessions so reopening the app does not credit hours of idle time. */
function reconcileStaleSessions(todayData: DailyData, now: number): void {
  if (!todayData.sessions?.length) return;

  const lastSession = todayData.sessions[todayData.sessions.length - 1];
  if (lastSession.endTime) return;

  const openMs = now - lastSession.startTime;
  if (openMs <= MAX_CONTINUOUS_SESSION_MS) return;

  const creditedMinutes = Math.min(
    MAX_ORPHAN_SESSION_MINUTES,
    Math.floor(openMs / 60000)
  );
  if (creditedMinutes > 0) {
    todayData.totalMinutes = (todayData.totalMinutes || 0) + creditedMinutes;
  }
  lastSession.endTime = lastSession.startTime + creditedMinutes * 60000;
  todayData.lastUpdate = now;
}

function activeSessionMinutes(todayData: DailyData, now: number): number {
  if (!todayData.sessions?.length) return 0;
  const lastSession = todayData.sessions[todayData.sessions.length - 1];
  if (lastSession.endTime) return 0;
  return Math.max(0, (now - lastSession.startTime) / 60000);
}

function computeDayTotal(todayData: DailyData, now: number, includeActive: boolean): number {
  let total = todayData.totalMinutes || 0;
  if (includeActive) {
    total += activeSessionMinutes(todayData, now);
  }
  return Math.max(0, total);
}

async function getStudyTimeData(): Promise<StudyTimeData> {
  const STORAGE_KEY = await getStorageKey();
  const stored = await storageGetItem(STORAGE_KEY);
  const TODAY_KEY = todayDateKey();
  const WEEK_START = getStartOfWeek(new Date()).toDateString();
  const now = Date.now();

  let studyTimeData: StudyTimeData = {
    dailyData: {},
    weekStart: WEEK_START,
  };

  if (stored) {
    try {
      studyTimeData = JSON.parse(stored);
    } catch {
      studyTimeData = { dailyData: {}, weekStart: WEEK_START };
    }
  }

  if (studyTimeData.weekStart !== WEEK_START) {
    studyTimeData.weekStart = WEEK_START;
    studyTimeData.dailyData = studyTimeData.dailyData || {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    Object.keys(studyTimeData.dailyData || {}).forEach((dateKey) => {
      if (new Date(dateKey) < sevenDaysAgo) {
        delete studyTimeData.dailyData[dateKey];
      }
    });
  }

  if (!studyTimeData.dailyData) {
    studyTimeData.dailyData = {};
  }

  Object.values(studyTimeData.dailyData).forEach((day) => {
    if ((Number(day?.totalMinutes) || 0) >= CORRUPTED_DAILY_CAP_MINUTES) {
      day.totalMinutes = 0;
      day.sessions = [];
      day.lastUpdate = now;
    }
  });

  if (!studyTimeData.dailyData[TODAY_KEY]) {
    studyTimeData.dailyData[TODAY_KEY] = {
      totalMinutes: 0,
      sessions: [],
      lastUpdate: now,
    };
  } else if (!studyTimeData.dailyData[TODAY_KEY].sessions) {
    studyTimeData.dailyData[TODAY_KEY].sessions = [];
  }

  const todayData = studyTimeData.dailyData[TODAY_KEY];
  reconcileStaleSessions(todayData, now);
  studyTimeData.dailyData[TODAY_KEY] = todayData;

  return studyTimeData;
}

function compactStudyTimeData(data: StudyTimeData): StudyTimeData {
  const dailyData: StudyTimeData['dailyData'] = {};
  for (const [dateKey, day] of Object.entries(data.dailyData || {})) {
    const sessions = Array.isArray(day?.sessions) ? day.sessions : [];
    const open = sessions.filter((session) => !session.endTime).slice(-1);
    dailyData[dateKey] = {
      totalMinutes: day?.totalMinutes || 0,
      sessions: open,
      lastUpdate: day?.lastUpdate || Date.now(),
    };
  }
  return { dailyData, weekStart: data.weekStart };
}

async function saveStudyTimeData(data: StudyTimeData): Promise<void> {
  const STORAGE_KEY = await getStorageKey();
  await storageSetItem(STORAGE_KEY, JSON.stringify(compactStudyTimeData(data)));
}

let appStateListener: { remove: () => void } | null = null;
let isAppActive = AppState.currentState === 'active';

export function setupAppStateListener(): void {
  if (appStateListener) return;

  appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      isAppActive = false;
      void endSession();
    } else if (nextAppState === 'active') {
      isAppActive = true;
    }
  });
}

export async function startSession(): Promise<void> {
  return withTrackerLock(async () => {
    if (!isAppActive) return;

    const data = await getStudyTimeData();
    const TODAY_KEY = todayDateKey();
    const todayData = data.dailyData[TODAY_KEY];
    const now = Date.now();

    if (!todayData.sessions) {
      todayData.sessions = [];
    }

    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (lastSession && !lastSession.endTime) {
      return;
    }

    todayData.sessions.push({ startTime: now });
    todayData.lastUpdate = now;
    data.dailyData[TODAY_KEY] = todayData;
    await saveStudyTimeData(data);
  });
}

export async function endSession(): Promise<void> {
  return withTrackerLock(async () => {
    const data = await getStudyTimeData();
    const TODAY_KEY = todayDateKey();
    const todayData = data.dailyData[TODAY_KEY];
    const now = Date.now();

    if (!todayData.sessions?.length) return;

    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      const sessionDuration = Math.floor((now - lastSession.startTime) / 60000);
      if (sessionDuration > 0) {
        todayData.totalMinutes = (todayData.totalMinutes || 0) + sessionDuration;
      }
      lastSession.endTime = now;
      todayData.lastUpdate = now;
      data.dailyData[TODAY_KEY] = todayData;
      await saveStudyTimeData(data);
    }
  });
}

export async function updateStudyTime(): Promise<{ today: number; thisWeek: number }> {
  return withTrackerLock(async () => {
    const data = await getStudyTimeData();
    const TODAY_KEY = todayDateKey();
    const todayData = data.dailyData[TODAY_KEY];
    const now = Date.now();

    if (!todayData.sessions) {
      todayData.sessions = [];
    }

    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    const hasActiveSession = Boolean(lastSession && !lastSession.endTime);

    if (isAppActive && !hasActiveSession) {
      todayData.sessions.push({ startTime: now });
      todayData.lastUpdate = now;
      data.dailyData[TODAY_KEY] = todayData;
      await saveStudyTimeData(data);
    } else if (isAppActive && hasActiveSession && lastSession) {
      const openMinutes = (now - lastSession.startTime) / 60000;
      if (openMinutes >= 1) {
        const savedMinutes = Math.floor((now - lastSession.startTime) / 60000);
        if (savedMinutes > 0) {
          todayData.totalMinutes = (todayData.totalMinutes || 0) + savedMinutes;
        }
        lastSession.endTime = now;
        todayData.sessions.push({ startTime: now });
        todayData.lastUpdate = now;
        data.dailyData[TODAY_KEY] = todayData;
        await saveStudyTimeData(data);
      }
    }

    const freshData = await getStudyTimeData();
    const freshTodayData = freshData.dailyData[TODAY_KEY];
    const todayTotal = computeDayTotal(freshTodayData, now, isAppActive);

    let weeklyTotal = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toDateString();
      const dayData = freshData.dailyData[dateKey];
      if (!dayData) continue;

      const includeActive = dateKey === TODAY_KEY && isAppActive;
      weeklyTotal += computeDayTotal(dayData, now, includeActive);
    }

    return {
      today: Math.max(0, Math.round(todayTotal)),
      thisWeek: Math.max(0, Math.round(weeklyTotal)),
    };
  });
}

export async function getTodayStudyTime(): Promise<number> {
  const data = await getStudyTimeData();
  const todayData = data.dailyData[todayDateKey()];
  return Math.max(0, Math.round(computeDayTotal(todayData, Date.now(), isAppActive)));
}

export async function getWeeklyStudyTime(): Promise<number> {
  const data = await getStudyTimeData();
  const now = Date.now();
  const TODAY_KEY = todayDateKey();
  let weeklyTotal = 0;
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    const dayData = data.dailyData[dateKey];
    if (!dayData) continue;
    weeklyTotal += computeDayTotal(dayData, now, dateKey === TODAY_KEY && isAppActive);
  }

  return Math.round(weeklyTotal);
}

export async function getWeeklyStudyData(): Promise<{ [dateKey: string]: number }> {
  const data = await getStudyTimeData();
  const now = Date.now();
  const TODAY_KEY = todayDateKey();
  const weeklyData: { [dateKey: string]: number } = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    const dayData = data.dailyData[dateKey];
    weeklyData[dateKey] = dayData
      ? Math.round(computeDayTotal(dayData, now, dateKey === TODAY_KEY && isAppActive))
      : 0;
  }

  return weeklyData;
}
