// Reading the recent past.
//
// Two things nearly every competitor gets wrong, and this module exists to fix:
//
//   1. Coming back after a break. Most apps either carry on as though nothing
//      happened, or reset the plan and frame the gap as a failure. Coaching
//      guidance is the opposite of both: do not restart, do not double up,
//      just come back lighter for a week. That is what `layoff` encodes.
//
//   2. Feedback that goes nowhere. Steady Move already asks how the effort
//      felt at the end of every session. Until now it stored the answer and
//      never used it. `effortBias` turns those answers into the one thing the
//      person was implicitly asking for when they gave them.
//
// Everything here is derived, deterministic and local. Nothing is learned in
// the statistical sense; it is a small set of rules that can be explained in a
// sentence, which is what lets the app say *why* a session is pitched as it is.

import {Adaptation, LayoffState, Profile, WorkoutLog} from '../types';
import {daysBetween} from '../lib/date';

/** A week away is enough to come back lighter. */
export const EASING_AFTER_DAYS = 7;
/** Three weeks away and the session says so out loud. */
export const RETURNING_AFTER_DAYS = 21;
/** How many recent sessions the effort signal reads. */
export const EFFORT_WINDOW = 3;

function qualifying(history: WorkoutLog[]): WorkoutLog[] {
  return [...history]
    .filter(log => log.qualifies)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

/** Whole days since the last session that counted. */
export function daysSinceLastSession(history: WorkoutLog[], now: Date = new Date()): number | null {
  const [latest] = qualifying(history);
  if (!latest) return null;
  const when = new Date(latest.completedAt);
  if (Number.isNaN(when.getTime())) return null;
  return Math.max(0, daysBetween(when, now));
}

export function layoffFor(days: number | null): LayoffState {
  // Someone who has never trained is not "returning" — they are starting, and
  // the level they chose during onboarding already handles that.
  if (days === null) return 'none';
  if (days >= RETURNING_AFTER_DAYS) return 'returning';
  if (days >= EASING_AFTER_DAYS) return 'easing';
  return 'none';
}

/**
 * Reads the effort ratings from the last few sessions. Two or more of the last
 * three pointing the same way moves the dial; anything less holds it, because
 * one hard session is a day, not a trend.
 */
export function effortBiasFor(history: WorkoutLog[]): -1 | 0 | 1 {
  const rated = qualifying(history)
    .filter(log => log.effort)
    .slice(0, EFFORT_WINDOW);
  if (rated.length < 2) return 0;

  const hard = rated.filter(log => log.effort === 'hard').length;
  const easy = rated.filter(log => log.effort === 'easy').length;

  if (hard >= 2 && hard > easy) return -1;
  if (easy >= 2 && easy > hard) return 1;
  return 0;
}

function noteFor(layoff: LayoffState, days: number | null, bias: -1 | 0 | 1): string | undefined {
  if (layoff === 'returning') {
    return `It has been ${days} days, so this is a way back in rather than a continuation. Nothing is lost — start here and build again.`;
  }
  if (layoff === 'easing') {
    return `You have been away ${days} days, so today comes back lighter than where you left off. That is the quickest way back, not the slowest.`;
  }
  if (bias === -1) {
    return 'Your last couple of sessions felt hard, so this one eases off.';
  }
  if (bias === 1) {
    return 'Your last couple of sessions felt easy, so this one asks for a little more.';
  }
  return undefined;
}

export function readAdaptation(options: {
  history: WorkoutLog[];
  profile: Profile | null;
  now?: Date;
  /** Set when the person has said they do not want today eased. */
  ignoreLayoff?: boolean;
}): Adaptation {
  const {history, profile, now = new Date(), ignoreLayoff = false} = options;

  const days = daysSinceLastSession(history, now);
  const layoff = ignoreLayoff ? 'none' : layoffFor(days);
  const effortBias = effortBiasFor(history);

  return {
    layoff,
    daysSinceLastSession: days,
    // A layoff decides the pitch on its own; the effort signal is about a
    // routine that is running, so the two never argue.
    effortBias: layoff === 'none' ? effortBias : 0,
    excluded: profile?.excluded ?? [],
    note: noteFor(layoff, days, effortBias)
  };
}

/** True when the person has been away long enough to be welcomed back. */
export function isReturning(adaptation: Adaptation): boolean {
  return adaptation.layoff !== 'none';
}
