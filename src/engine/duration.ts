// Duration maths for session building.
//
// The single hard guarantee of this module: the parts always add up to the
// whole. A 20 minute session is 1200 seconds of blocks, including every rest
// and transition, never 1180 or 1240.

import {TimeBudget} from '../types';

/** All durations are multiples of this, so timers land on tidy numbers. */
export const GRAIN = 5;

export interface PhaseBudget {
  arrive: number;
  warmup: number;
  move: number;
  reset: number;
  reflect: number;
}

/**
 * Seconds given to each phase of the session shape (arrive, warm up, move,
 * reset, reflect). The move block takes whatever is left, which is what makes
 * a longer session mean more training rather than a longer warm-up.
 */
export function phaseBudgets(minutes: TimeBudget): PhaseBudget {
  const total = minutes * 60;
  const frame: Record<TimeBudget, Omit<PhaseBudget, 'move'>> = {
    10: {arrive: 30, warmup: 120, reset: 90, reflect: 30},
    20: {arrive: 45, warmup: 180, reset: 150, reflect: 45},
    40: {arrive: 60, warmup: 300, reset: 300, reflect: 60}
  };
  const f = frame[minutes];
  return {...f, move: total - f.arrive - f.warmup - f.reset - f.reflect};
}

/**
 * Splits `total` seconds across `weights`, in `grain` steps, so the parts sum
 * to exactly `total`. Remainders go to the largest fractional shares first, and
 * ties break towards the earlier index, so the result is fully deterministic.
 */
export function allocate(total: number, weights: number[], grain = GRAIN, minimum = grain): number[] {
  const n = weights.length;
  if (n === 0) return [];

  // Never promise a minimum the budget cannot pay for.
  const affordable = Math.floor(total / n / grain) * grain;
  const floorPart = Math.max(grain, Math.min(minimum, affordable || grain));

  const weightSum = weights.reduce((sum, w) => sum + w, 0) || n;
  const ideal = weights.map(w => (total * w) / weightSum);
  const parts = ideal.map(value => Math.max(floorPart, Math.floor(value / grain) * grain));

  let used = parts.reduce((sum, value) => sum + value, 0);

  // Over budget (the floors cost more than we have): shave the biggest parts.
  while (used > total) {
    let largest = 0;
    for (let i = 1; i < n; i++) if (parts[i] > parts[largest]) largest = i;
    if (parts[largest] <= grain) break;
    parts[largest] -= grain;
    used -= grain;
  }

  // Under budget: hand out the remainder by fractional share, biggest first.
  const order = ideal
    .map((value, index) => ({index, frac: value - Math.floor(value / grain) * grain}))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)
    .map(entry => entry.index);

  for (let i = 0; used < total; i++) {
    parts[order[i % n]] += grain;
    used += grain;
  }

  return parts;
}

/** mm:ss, used by every timer in the app. */
export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** "18 min" / "45 sec" for summaries. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe < 60) return `${safe} sec`;
  return `${Math.round(safe / 60)} min`;
}

/**
 * Like `allocate`, but no part may exceed its cap (a 25 second dead hang should
 * not become a 75 second one just because the slot is long). Seconds that
 * cannot be placed are returned as `leftover` for the caller to spend
 * elsewhere — usually on rest — so the session still totals exactly.
 */
export function allocateCapped(
  total: number,
  caps: (number | undefined)[],
  grain = GRAIN,
  minimum = grain
): {parts: number[]; leftover: number} {
  const n = caps.length;
  if (n === 0) return {parts: [], leftover: total};

  const fixed: (number | null)[] = new Array(n).fill(null);
  let remaining = total;

  for (let pass = 0; pass <= n; pass++) {
    const free: number[] = [];
    for (let i = 0; i < n; i++) if (fixed[i] === null) free.push(i);
    if (free.length === 0) break;

    const parts = allocate(remaining, free.map(() => 1), grain, minimum);
    let clamped = false;

    for (let k = 0; k < free.length; k++) {
      const index = free[k];
      const cap = caps[index];
      if (cap !== undefined && parts[k] > cap) {
        const value = Math.max(grain, Math.floor(cap / grain) * grain);
        fixed[index] = value;
        remaining -= value;
        clamped = true;
      }
    }

    if (!clamped) {
      free.forEach((index, k) => {
        fixed[index] = parts[k];
      });
      remaining = 0;
      break;
    }
  }

  const parts = fixed.map(value => value ?? 0);
  return {parts, leftover: total - parts.reduce((sum, value) => sum + value, 0)};
}
