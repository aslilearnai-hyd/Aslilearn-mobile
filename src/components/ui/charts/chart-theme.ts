/** Shared visual tokens for exam-analysis charts */
export const CHART_THEME = {
  surface: '#FAFBFC',
  surfaceBorder: '#E8EDF3',
  grid: '#E2E8F0',
  axis: '#94A3B8',
  label: '#64748B',
  labelStrong: '#334155',
  value: '#475569',
  ideal: '#94A3B8',
  padding: { top: 16, right: 12, bottom: 8, left: 4 },
  barRadius: 6,
  groupSlotWidth: 76,
};

/** Chart max — keeps small values readable (time charts 1–3s). */
export function chartMax(rawMax: number, steps = 4): number {
  if (rawMax <= 0) return steps;
  if (rawMax <= 12) {
    return Math.max(steps, Math.ceil(rawMax * 1.1));
  }
  const raw = rawMax * 1.08;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.ceil(nice * magnitude);
}

/** Evenly spaced Y ticks from 0 to max (no skipped integers on small scales). */
export function buildTicks(max: number, steps = 4): number[] {
  const safe = Math.max(1, max);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const v = (safe * (steps - i)) / steps;
    return safe <= 20 ? Math.round(v) : Math.round(v * 10) / 10;
  });
}

export function barHeight(value: number, max: number, plotH: number, minPx = 6): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max((value / max) * plotH, minPx);
}

export function gridBottom(tick: number, max: number, plotH: number): number {
  if (max <= 0) return 0;
  return (tick / max) * plotH;
}

export function slotWidthForCount(screenWidth: number, count: number, min = 64, max = 88): number {
  if (count <= 0) return min;
  const available = screenWidth - 108;
  if (count * min <= available) {
    return Math.min(max, Math.max(min, Math.floor(available / count)));
  }
  return min;
}
