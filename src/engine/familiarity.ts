// How well you already know a movement, and what to do about it today.
//
// The gap this closes, across three competitors at once:
//
//   • Ladder and Freeletics make a session harder over weeks, but only inside
//     a programme you have to join and follow, and only if you keep paying.
//   • Fitbod progresses load per exercise, but it needs you to log every set
//     to know what you did.
//   • Hevy is the best logger in the category and tells you exactly what you
//     lifted last time — but it is a notebook: it never decides anything.
//
// Steady Move already knows which movements it prescribed and which ones were
// completed, so it can say "fourth time this month" and offer the next step up
// without asking anyone to log a single rep. The progression and regression
// lines have been sitting on all eighty-five movements since the first build;
// this is what finally shows them, and only when they are earned.

import {EffortRating, Exercise, Feel, Intensity, Level, SessionBlock, WorkoutLog} from '../types';
import {daysBetween} from '../lib/date';

/** Only recent practice counts as practice. */
export const FAMILIARITY_WINDOW_DAYS = 28;
/** Completions of a movement before its progression is offered. */
export const READY_TO_PROGRESS = 3;

export interface Familiarity {
  /** Completed sessions in the window that included this movement. */
  times: number;
  /** Whole days since the most recent one. */
  daysSince?: number;
  /** How that session felt afterwards, if they said. */
  lastFeel?: Feel;
  /** How hard that session was rated, if they said. */
  lastEffort?: EffortRating;
}

/**
 * Per-movement practice over the last four weeks, built only from sessions
 * that were actually performed. A session someone abandoned teaches nothing
 * about what they are ready for.
 */
export function readFamiliarity(
  history: WorkoutLog[],
  now: Date = new Date()
): Record<string, Familiarity> {
  const out: Record<string, Familiarity> = {};

  const recent = [...history]
    .filter(log => log.qualifies && log.exerciseIds?.length)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  for (const log of recent) {
    const days = daysBetween(new Date(log.completedAt), now);
    if (days < 0 || days > FAMILIARITY_WINDOW_DAYS) continue;

    for (const id of new Set(log.exerciseIds ?? [])) {
      const entry = out[id] ?? {times: 0};
      entry.times += 1;
      // The list is newest first, so the first sighting is the latest one.
      if (entry.daysSince === undefined) {
        entry.daysSince = days;
        entry.lastFeel = log.feel;
        entry.lastEffort = log.effort;
      }
      out[id] = entry;
    }
  }

  return out;
}

export type StepDirection = 'progress' | 'regress';

export interface Step {
  direction: StepDirection;
  /** The movement's own words for the next step, never generated. */
  note: string;
}

/**
 * The optional next step for a movement today — harder when it has been done
 * enough times and the last one landed well, easier when the day or the last
 * rating says to go gently, and easier again for someone new meeting a
 * movement for the first time. Between those, nothing: an app that offers an
 * alternative to every single movement has taught the person to stop reading
 * them.
 *
 * Always an offer, never a change to the session: the prescribed movement
 * stays exactly as planned.
 */
export function stepFor(
  exercise: Exercise,
  familiarity: Familiarity | undefined,
  intensity: Intensity,
  level?: Level
): Step | undefined {
  // On a gentle or easy day the only step worth showing is the easier one.
  if (intensity === 'gentle' || intensity === 'easy') {
    return exercise.regression ? {direction: 'regress', note: exercise.regression} : undefined;
  }

  const lastWasHard = familiarity?.lastEffort === 'hard' || familiarity?.lastFeel === 'lower';
  if (lastWasHard) {
    return exercise.regression ? {direction: 'regress', note: exercise.regression} : undefined;
  }

  const times = familiarity?.times ?? 0;
  if (times >= READY_TO_PROGRESS && exercise.progression) {
    return {direction: 'progress', note: exercise.progression};
  }

  // Someone new meeting a movement for the first time gets the easier way in.
  // For everyone else the swap button is right there, and the line would be
  // noise on sixteen stretches in a row.
  if (times === 0 && level === 'new' && exercise.regression) {
    return {direction: 'regress', note: exercise.regression};
  }

  return undefined;
}

/** "Fourth time this month", in the fewest words that are still true. */
export function practiceNote(familiarity: Familiarity | undefined): string | undefined {
  if (!familiarity || familiarity.times < 2 || familiarity.daysSince === undefined) return undefined;

  const when =
    familiarity.daysSince === 0
      ? 'today'
      : familiarity.daysSince === 1
        ? 'yesterday'
        : `${familiarity.daysSince} days ago`;

  return `${familiarity.times}th time this month · last ${when}`
    .replace('2th', '2nd')
    .replace('3th', '3rd')
    .replace('1th', '1st');
}

/**
 * Hangs the practice note and the optional step on the movement blocks of a
 * session. Nothing about the plan changes — not a movement, not a second.
 */
export function annotate(
  blocks: SessionBlock[],
  exercises: Record<string, Exercise | undefined>,
  familiarity: Record<string, Familiarity>,
  intensity: Intensity,
  level?: Level
): void {
  for (const block of blocks) {
    if (block.kind !== 'exercise' || !block.exerciseId) continue;
    const exercise = exercises[block.exerciseId];
    if (!exercise) continue;

    const fam = familiarity[block.exerciseId];
    const step = stepFor(exercise, fam, intensity, level);

    if (block.phase === 'move') {
      block.practiceNote = practiceNote(fam);
      block.familiarTimes = fam?.times;
    }
    if (step) {
      block.stepDirection = step.direction;
      block.stepNote = step.note;
    }
  }
}

/** Whole days since each movement was last completed, by exercise id. */
export function daysSinceByExercise(
  familiarity: Record<string, Familiarity>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, entry] of Object.entries(familiarity)) {
    if (entry.daysSince !== undefined) out[id] = entry.daysSince;
  }
  return out;
}

/** Stands in for "never done", so sorting never has to reason about Infinity. */
export const NEVER_DONE = 999;

/**
 * Reorders a pool so the movements a person has not seen for longest come
 * first. Stable, so the balanced ordering underneath is preserved for anything
 * equally fresh.
 *
 * Without this the engine picked the same index out of the same pool every
 * day: a regular user got wall push-ups six times in ten days out of a library
 * of eighty-five, and every mobility day was the identical eight stretches.
 * "Lack of variety" and "got bored" are named reasons people abandon fitness
 * apps (Kidman et al., JMIR 2024), and repetitive exercise selection is the
 * most common complaint in reviews of the market leader. It was ours too.
 */
export function freshestFirst(
  pool: Exercise[],
  daysSince: Record<string, number>
): Exercise[] {
  return [...pool].sort(
    (a, b) => (daysSince[b.id] ?? NEVER_DONE) - (daysSince[a.id] ?? NEVER_DONE)
  );
}
