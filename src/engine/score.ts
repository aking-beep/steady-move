// The Move Score.
//
// One number for the day, in the shape the category has settled on: a single
// headline score with category scores nested underneath, each able to say what
// is lifting it and what is pulling it down.
//
// What it is NOT, said plainly because the distinction matters: this is a
// training score, not a health score and not a quality-of-life score. Steady
// Move has no ring, no watch, no sleep data and no HRV. Scoring someone's
// health off a seven-question check-in would be fiction. Scoring their
// training off what they actually did is arithmetic.
//
// Two failure modes from the wearable apps shaped the maths, both taken from
// their own reviews:
//
//   • "After a full week of resting I'm still overreaching." A score that
//     cannot recover from rest teaches people to ignore it. Here, resting
//     when rest is due RAISES the freshness score — that is what it is for.
//   • "My score is higher on days I don't work out... after a half marathon
//     my vitality score was lower than the following rest day." A score that
//     punishes training is worse than no score. Consistency runs on a 7-day
//     window, so a hard session never costs you the next morning.
//
// Deterministic, offline, and computed from logs the app wrote itself.

import {CheckIn, Profile, WorkoutLog} from '../types';
import {readReadiness} from './load';
import {movementDays} from '../lib/progress';
import {addDays, localDateKey} from '../lib/date';

export type ScoreBand = 'low' | 'fair' | 'good' | 'strong';

export interface CategoryScore {
  id: 'consistency' | 'freshness' | 'followThrough';
  label: string;
  value: number;
  /** One line on what the number is made of. */
  detail: string;
}

export interface ScoreFactor {
  /** True when this is lifting the score, false when it is pulling it down. */
  lifting: boolean;
  text: string;
}

export interface MoveScore {
  value: number;
  band: ScoreBand;
  /** One sentence, in the second person, on what the number means today. */
  summary: string;
  categories: CategoryScore[];
  factors: ScoreFactor[];
}

/** Weights, stated here rather than buried in the arithmetic. */
export const WEIGHTS = {consistency: 0.4, freshness: 0.3, followThrough: 0.3};

/** Above this is a good day. Matches how the category reads these numbers. */
export const GOOD_SCORE = 80;

export function bandFor(value: number): ScoreBand {
  if (value >= GOOD_SCORE) return 'strong';
  if (value >= 60) return 'good';
  if (value >= 40) return 'fair';
  return 'low';
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  strong: 'Strong',
  good: 'Good',
  fair: 'Fair',
  low: 'Building'
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Distinct days moved inside the last seven, counting back from today. */
export function daysMovedThisWeek(history: WorkoutLog[], now: Date): number {
  const days = movementDays(history);
  let count = 0;
  for (let back = 0; back < 7; back++) {
    if (days.has(localDateKey(addDays(now, -back)))) count += 1;
  }
  return count;
}

/**
 * Showing up, against the target the person set themselves. Hitting the target
 * is 100 — there is no bonus for exceeding it, because an app that rewards
 * overreaching is how people get hurt.
 */
export function consistencyScore(history: WorkoutLog[], profile: Profile, now: Date): number {
  const target = Math.max(1, Math.min(7, profile.weeklyTarget));
  const moved = daysMovedThisWeek(history, now);
  return clamp((moved / target) * 100);
}

/**
 * How much is in the tank. High when the body has had a chance to absorb the
 * work, lower when load has piled up — so a rest day lifts this rather than
 * costing anything.
 */
export function freshnessScore(
  history: WorkoutLog[],
  checkIn: CheckIn | null | undefined,
  now: Date
): number {
  const readiness = readReadiness({history, checkIn, now});
  const base: Record<typeof readiness.state, number> = {
    ready: 95,
    steady: 78,
    ease: 55,
    rest: 38
  };
  return clamp(base[readiness.state]);
}

/** Sessions in the window the follow-through number looks at. */
export const FOLLOW_THROUGH_DAYS = 14;

/**
 * Finishing what you start. The share of each recent session that was
 * actually performed, averaged over the last fortnight.
 *
 * This replaced a balance score, which measured how evenly the work was spread
 * across the body. That was the wrong thing to score a person on twice over:
 * Steady Move chooses the movements, so an uneven fortnight is the engine's
 * doing, not theirs — and scoring it made an all-legs session rank below doing
 * nothing at all. Spread is still shown on Progress, as information. What goes
 * in the score is the part the person controls.
 */
export function followThroughScore(history: WorkoutLog[], now: Date): number {
  const recent = history.filter(log => {
    const when = new Date(log.completedAt);
    if (Number.isNaN(when.getTime())) return false;
    const days = Math.floor((now.getTime() - when.getTime()) / 86_400_000);
    return days >= 0 && days <= FOLLOW_THROUGH_DAYS;
  });

  if (recent.length === 0) return 0;

  const ratios = recent.map(log => {
    if (!log.blocksTotal) return log.qualifies ? 1 : 0;
    return Math.max(0, Math.min(1, log.blocksCompleted / log.blocksTotal));
  });

  const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return clamp(mean * 100);
}

/** The day's number, and what it is made of. */
export function moveScore(options: {
  history: WorkoutLog[];
  profile: Profile;
  checkIn?: CheckIn | null;
  now?: Date;
}): MoveScore {
  const {history, profile, checkIn, now = new Date()} = options;

  const consistency = consistencyScore(history, profile, now);
  const freshness = freshnessScore(history, checkIn, now);
  const followThrough = followThroughScore(history, now);

  const value = clamp(
    consistency * WEIGHTS.consistency +
      freshness * WEIGHTS.freshness +
      followThrough * WEIGHTS.followThrough
  );

  const target = Math.max(1, Math.min(7, profile.weeklyTarget));
  const moved = daysMovedThisWeek(history, now);
  const readiness = readReadiness({history, checkIn, now});

  const categories: CategoryScore[] = [
    {
      id: 'consistency',
      label: 'Consistency',
      value: consistency,
      detail: moved >= target ? `Met your ${target}-day week` : `${moved} of ${target} days`
    },
    {
      id: 'freshness',
      label: 'Freshness',
      value: freshness,
      detail: readiness.state === 'rest' ? 'Rest is due' : `Reads as ${readiness.state}`
    },
    {
      id: 'followThrough',
      label: 'Follow-through',
      value: followThrough,
      detail:
        followThrough === 0
          ? 'Nothing finished yet'
          : followThrough >= 95
            ? 'You finish what you start'
            : `${followThrough}% on average`
    }
  ];

  return {
    value,
    band: bandFor(value),
    summary: summaryFor(value, moved, target, readiness.state),
    categories,
    factors: factorsFor({consistency, freshness, followThrough, moved, target})
  };
}

function summaryFor(
  value: number,
  moved: number,
  target: number,
  state: ReturnType<typeof readReadiness>['state']
): string {
  if (state === 'rest') {
    return 'Your training is asking for a quiet day. Taking one is what keeps this number up, not what pulls it down.';
  }
  if (value >= GOOD_SCORE) {
    return 'Everything is pointing the same way: showing up, recovered, and finishing what you start.';
  }
  if (moved === 0) {
    return 'Nothing logged this week yet. One session moves this more than any other single thing.';
  }
  if (moved >= target) {
    return 'You have met your week. What is left is how the work is spread and how recovered you are.';
  }
  return `${moved} of ${target} days so far. The week is still open.`;
}

/**
 * What is lifting the number and what is pulling it down, in the person's own
 * terms. Every line names something they could act on — a score you cannot do
 * anything about is just a mood.
 */
function factorsFor(input: {
  consistency: number;
  freshness: number;
  followThrough: number;
  moved: number;
  target: number;
}): ScoreFactor[] {
  const {consistency, freshness, followThrough, moved, target} = input;
  const factors: ScoreFactor[] = [];

  if (consistency >= 100) {
    factors.push({lifting: true, text: `You have met your ${target}-day week.`});
  } else if (moved === 0) {
    factors.push({lifting: false, text: 'No days logged in the last week.'});
  } else {
    factors.push({
      lifting: false,
      text: `${target - moved} more ${target - moved === 1 ? 'day' : 'days'} would meet your week.`
    });
  }

  if (freshness >= 78) {
    factors.push({lifting: true, text: 'You are recovered enough to train properly.'});
  } else {
    factors.push({
      lifting: false,
      text: 'Recent work has stacked up, so today is better taken gently.'
    });
  }

  if (followThrough >= 90) {
    factors.push({lifting: true, text: 'You finish the sessions you start.'});
  } else if (followThrough === 0) {
    factors.push({lifting: false, text: 'Nothing completed in the last fortnight.'});
  } else {
    factors.push({
      lifting: false,
      text: `Recent sessions ended about ${followThrough}% of the way through.`
    });
  }

  return factors;
}

export interface TrendDay {
  key: string;
  /** Single-letter weekday, for a compact axis. */
  label: string;
  value: number;
  isToday: boolean;
}

/**
 * The score as it stood on each of the last `days` days. Recomputed from the
 * history available on that day rather than stored, so the trend can never
 * drift from the number on the home screen, and so there is nothing extra to
 * persist or migrate.
 *
 * Today's check-in only applies to today; past days are scored from what was
 * logged, because what somebody felt three Tuesdays ago is not recorded and
 * guessing at it would make the chart a fiction.
 */
export function scoreTrend(options: {
  history: WorkoutLog[];
  profile: Profile;
  checkIn?: CheckIn | null;
  days?: number;
  now?: Date;
}): TrendDay[] {
  const {history, profile, checkIn, days = 14, now = new Date()} = options;
  const out: TrendDay[] = [];

  for (let back = days - 1; back >= 0; back--) {
    const when = addDays(now, -back);
    const key = localDateKey(when);
    const upToThen = history.filter(
      log => (log.dateKey || localDateKey(new Date(log.completedAt))) <= key
    );
    const isToday = back === 0;

    out.push({
      key,
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][when.getDay()] as string,
      value: moveScore({
        history: upToThen,
        profile,
        checkIn: isToday ? checkIn : null,
        now: when
      }).value,
      isToday
    });
  }

  return out;
}
