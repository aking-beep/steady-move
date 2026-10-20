// What the body has been asked to do lately, and what that means for today.
//
// This is the piece the category splits in half and nobody joins up:
//
//   • Gentler Streak reads readiness — but from a wearable, on a subscription,
//     and then tells you whether to train rather than what to do. It has no
//     per-area view at all.
//   • Fitbod tracks recovery per muscle and plans around it — but explicitly
//     does not use readiness, needs ten to fifteen logged sessions before it
//     knows you, and asks you to log every set to get there.
//   • Freeletics adapts on how the last session felt, and on nothing else.
//
// Steady Move already knows what it prescribed and what was completed, so the
// per-area picture costs the person nothing: no logging, no watch, no weeks of
// warm-up. It works on day two.
//
// Two honesty constraints shape the whole module. The areas are coarse,
// because movement patterns cannot support a muscle map and pretending
// otherwise would be fiction. And readiness is a word, not a score, because a
// number out of a hundred implies a precision that self-report cannot carry.

import {
  BODY_AREAS,
  BodyArea,
  CheckIn,
  Exercise,
  Readiness,
  ReadinessState,
  WorkoutLog
} from '../types';
import {getExercise} from '../data/exercises';
import {addDays, daysBetween, localDateKey} from '../lib/date';

/** Recent work matters more than old work. Load halves every two days. */
export const LOAD_HALF_LIFE_DAYS = 2;
/**
 * Beyond this, an area counts as worked rather than fresh.
 *
 * Load is share-weighted, so one twenty minute session contributes a total of
 * one across every area it touched. This sits at roughly "two recent sessions
 * leaning on the same area" — enough to be worth steering around, not so much
 * that an ordinary week lights everything up.
 */
export const LOADED_THRESHOLD = 0.8;
/** Days in the last week beyond which rest is worth suggesting. */
export const BUSY_WEEK_DAYS = 5;
/** Consecutive days beyond which rest is worth suggesting. */
export const LONG_RUN_DAYS = 6;

/**
 * The areas a movement asks something of. Derived from its pattern and
 * category rather than hand-tagged on all eighty-five, so the two can never
 * drift apart.
 */
export function areasFor(exercise: Exercise): BodyArea[] {
  switch (exercise.movementPattern) {
    case 'squat':
    case 'lunge':
      return ['legs'];
    case 'hinge':
      return ['legs', 'pull'];
    case 'push':
      return ['push'];
    case 'pull':
      return ['pull'];
    case 'core':
      return ['core'];
    case 'carry':
      return ['core', 'pull'];
    case 'gait':
      return ['aerobic', 'legs'];
    case 'balance':
      return ['legs'];
    case 'rotation':
    case 'mobility':
    case 'breath':
    default:
      // Mobility and breathing restore rather than tax; counting them as load
      // would punish people for the gentlest thing the app offers.
      return ['restorative'];
  }
}

/** The areas a completed session actually touched. */
export function areasForLog(log: WorkoutLog): BodyArea[] {
  const ids = log.exerciseIds ?? [];
  const areas = new Set<BodyArea>();
  for (const id of ids) {
    const exercise = getExercise(id);
    if (!exercise) continue;
    for (const area of areasFor(exercise)) areas.add(area);
  }
  return Array.from(areas);
}

/**
 * How a session divided itself between areas, as shares that sum to one. A
 * session of three leg movements and one push asked three times as much of the
 * legs, and the picture is worthless if it says otherwise.
 *
 * Restorative movements take a share of the session without adding load, which
 * is why a mobility-heavy hour leaves less of a mark than a hard half hour.
 */
export function areaSharesForLog(log: WorkoutLog): Partial<Record<BodyArea, number>> {
  const counts: Partial<Record<BodyArea, number>> = {};
  let total = 0;

  for (const id of log.exerciseIds ?? []) {
    const exercise = getExercise(id);
    if (!exercise) continue;
    for (const area of areasFor(exercise)) {
      counts[area] = (counts[area] ?? 0) + 1;
      total += 1;
    }
  }

  if (total === 0) return {};

  const shares: Partial<Record<BodyArea, number>> = {};
  for (const area of BODY_AREAS) {
    const count = counts[area];
    if (count) shares[area] = count / total;
  }
  return shares;
}

function emptyLoad(): Record<BodyArea, number> {
  return BODY_AREAS.reduce(
    (acc, area) => ({...acc, [area]: 0}),
    {} as Record<BodyArea, number>
  );
}

/**
 * Decayed load per area. A session two days ago counts half what it counted
 * yesterday; a week ago it barely registers.
 *
 * Logs recorded before movements were tracked carry no area detail. Rather
 * than guessing at what they contained, they contribute nothing here — which
 * means the picture simply gets better as it goes, and never invents history.
 */
export function loadByArea(history: WorkoutLog[], now: Date = new Date()): Record<BodyArea, number> {
  const load = emptyLoad();

  for (const log of history) {
    if (!log.qualifies) continue;
    const when = new Date(log.completedAt);
    if (Number.isNaN(when.getTime())) continue;

    const days = daysBetween(when, now);
    if (days < 0 || days > 14) continue;

    const decay = Math.pow(0.5, days / LOAD_HALF_LIFE_DAYS);
    // A longer session asks more of an area than a ten minute one.
    const size = Math.min(2, Math.max(0.5, log.plannedMinutes / 20));

    const shares = areaSharesForLog(log);
    for (const area of BODY_AREAS) {
      if (area === 'restorative') continue;
      const share = shares[area];
      if (share) load[area] += decay * size * share;
    }
  }

  return load;
}

/** Areas ordered freshest first, which is the order to train them in. */
export function freshestAreas(load: Record<BodyArea, number>): BodyArea[] {
  return BODY_AREAS.filter(area => area !== 'restorative').sort((a, b) => load[a] - load[b]);
}

/** Days in a row, counting back from yesterday, with a qualifying session. */
export function consecutiveDaysBefore(history: WorkoutLog[], now: Date = new Date()): number {
  const days = new Set(
    history.filter(log => log.qualifies).map(log => log.dateKey || localDateKey(new Date(log.completedAt)))
  );

  let streak = 0;
  let cursor = addDays(now, -1);
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Distinct qualifying days inside the last seven, today included. */
export function daysInLastWeek(history: WorkoutLog[], now: Date = new Date()): number {
  const window = new Set<string>();
  for (let i = 0; i < 7; i++) window.add(localDateKey(addDays(now, -i)));

  const days = new Set(
    history
      .filter(log => log.qualifies)
      .map(log => log.dateKey || localDateKey(new Date(log.completedAt)))
      .filter(key => window.has(key))
  );
  return days.size;
}

/**
 * Today's readiness, from what the person has been doing and — when they have
 * checked in — how they say they feel. No wearable, no score, no weeks of
 * learning. The reason is always a sentence they can check against their own
 * memory of the week.
 */
export function readReadiness(options: {
  history: WorkoutLog[];
  checkIn?: CheckIn | null;
  now?: Date;
}): Readiness {
  const {history, checkIn, now = new Date()} = options;

  const load = loadByArea(history, now);
  const consecutiveDays = consecutiveDaysBefore(history, now);
  const week = daysInLastWeek(history, now);

  const longRun = consecutiveDays >= LONG_RUN_DAYS;
  const busyWeek = week >= BUSY_WEEK_DAYS;
  const sore = checkIn?.soreness === 'sore';
  const flat = checkIn?.energy === 'low';

  let state: ReadinessState = 'steady';
  let reason = '';
  let restAdvised = false;

  if (checkIn?.pain) {
    state = 'rest';
    restAdvised = true;
    reason = 'You reported pain, so today is for breathing and gentle attention only.';
  } else if ((longRun || busyWeek) && (sore || flat)) {
    state = 'rest';
    restAdvised = true;
    reason = longRun
      ? `${consecutiveDays} days in a row, and you are feeling it. Today looks more like a rest day than a training day.`
      : `${week} of the last 7 days moving, and you are feeling it. Today looks more like a rest day than a training day.`;
  } else if (longRun) {
    state = 'ease';
    reason = `${consecutiveDays} days in a row. Today is a good one to go easy on, so the run can continue.`;
  } else if (sore || flat) {
    state = 'ease';
    reason = sore
      ? 'You reported soreness, so today eases off rather than adding to it.'
      : 'Low energy today, so this stays light. Showing up is the part that counts.';
  } else if (busyWeek) {
    state = 'steady';
    reason = `${week} of the last 7 days moving. A steady one today keeps that sustainable.`;
  } else if (week === 0) {
    state = 'ready';
    reason = 'Nothing logged in the last week, so you are fresh for whatever you fancy.';
  } else {
    state = 'ready';
    const fresh = freshestAreas(load);
    const freshest = fresh[0];
    reason =
      load[freshest] < LOADED_THRESHOLD
        ? 'Rested and ready. Today can be whatever you have time for.'
        : 'Ready to go, with a sensible amount in the legs from this week.';
  }

  return {state, reason, consecutiveDays, daysInLastWeek: week, load, restAdvised};
}

/** True when an area has had enough lately to be worth leaving alone. */
export function isLoaded(load: Record<BodyArea, number>, area: BodyArea): boolean {
  return load[area] >= LOADED_THRESHOLD;
}

/**
 * How much an area has had lately, as one of three words. Three, not ten,
 * because the underlying signal is coarse and a finer scale would imply
 * precision the data cannot carry.
 */
export type AreaBand = 'none' | 'light' | 'worked';

export function areaBand(value: number): AreaBand {
  if (value < 0.05) return 'none';
  return value >= LOADED_THRESHOLD ? 'worked' : 'light';
}

/**
 * The areas that have had the most lately, heaviest first, leaving out the
 * ones that have had nothing. Used to explain why a session starts where it
 * does.
 */
export function workedAreas(load: Record<BodyArea, number>): BodyArea[] {
  return BODY_AREAS.filter(area => area !== 'restorative' && areaBand(load[area]) !== 'none').sort(
    (a, b) => load[b] - load[a]
  );
}
