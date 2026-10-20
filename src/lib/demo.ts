// Demo data for development and review.
//
// Seeds a realistic four weeks of history so progress, streaks and the weekly
// chart can be inspected without completing twenty sessions by hand. Entirely
// deterministic, and only reachable from the developer section of Settings.

import {SessionType, WorkoutLog} from '../types';
import {addDays, localDateKey} from './date';

interface DemoEntry {
  /** Days before today. */
  daysAgo: number;
  type: SessionType;
  title: string;
  minutes: number;
  /** Fraction of the session actually completed. */
  ratio: number;
  feel?: WorkoutLog['feel'];
  effort?: WorkoutLog['effort'];
  note?: string;
  /**
   * Movements completed, so the per-area balance and the practice notes have
   * something real to read. A demo without these would show an empty balance
   * view, which is the one thing it must not do.
   */
  exercises: string[];
}

const CALISTHENICS = ['air-squat', 'push-up', 'reverse-lunge', 'plank', 'scapular-pull'];
const STRENGTH = ['db-goblet-squat', 'db-row', 'db-floor-press', 'db-romanian-deadlift', 'dead-bug'];
const RUNWALK = ['walk-easy', 'jog-easy', 'jog-steady', 'walk-recover'];
const MOBILITY = ['cat-cow', 'worlds-greatest-stretch', 'hip-switch-90-90', 'thoracic-rotation'];
const MINDFUL = ['breath-arrive', 'breath-counted', 'breath-body-scan', 'breath-close'];
const RECOVERY = ['childs-pose', 'forward-fold', 'breath-soften', 'ankle-pumps'];
const BALANCED = ['air-squat', 'incline-push-up', 'band-row', 'bird-dog', 'walk-brisk'];

/**
 * A believable month: a solid first fortnight, a gap, a restart, and a current
 * run of a few days ending today. Includes one partial save, which must NOT
 * count, and one doubled-up day, which must count once.
 */
const PATTERN: DemoEntry[] = [
  {daysAgo: 27, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'better', effort: 'right', exercises: CALISTHENICS},
  {daysAgo: 26, type: 'mobility', title: 'Mobility Flow', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', exercises: MOBILITY},
  {daysAgo: 24, type: 'runwalk', title: 'Run + Walk', minutes: 20, ratio: 1, feel: 'better', effort: 'right', exercises: RUNWALK},
  {daysAgo: 23, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'same', effort: 'hard', exercises: CALISTHENICS},
  {daysAgo: 22, type: 'mindful', title: 'Mindful Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', exercises: MINDFUL},
  {daysAgo: 20, type: 'strength', title: 'Steady Strength', minutes: 40, ratio: 1, feel: 'better', effort: 'right', exercises: STRENGTH},
  {daysAgo: 19, type: 'mobility', title: 'Mobility Flow', minutes: 20, ratio: 1, feel: 'better', effort: 'easy', exercises: MOBILITY},
  {daysAgo: 17, type: 'runwalk', title: 'Run + Walk', minutes: 40, ratio: 1, feel: 'same', effort: 'hard', note: 'Longer than planned, felt good.', exercises: RUNWALK},
  {daysAgo: 16, type: 'recovery', title: 'Recovery + Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', exercises: RECOVERY},
  // A session started and abandoned: stays in history, never counts.
  {daysAgo: 14, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 0.35, exercises: CALISTHENICS},
  {daysAgo: 9, type: 'mindful', title: 'Mindful Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', note: 'Back after a week off.', exercises: MINDFUL},
  {daysAgo: 8, type: 'mobility', title: 'Mobility Flow', minutes: 20, ratio: 1, feel: 'better', effort: 'easy', exercises: MOBILITY},
  {daysAgo: 6, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'same', effort: 'right', exercises: CALISTHENICS},
  {daysAgo: 5, type: 'runwalk', title: 'Run + Walk', minutes: 20, ratio: 1, feel: 'better', effort: 'right', exercises: RUNWALK},
  {daysAgo: 3, type: 'balanced', title: 'Balanced Movement', minutes: 20, ratio: 1, feel: 'better', effort: 'right', exercises: BALANCED},
  {daysAgo: 2, type: 'strength', title: 'Steady Strength', minutes: 40, ratio: 1, feel: 'same', effort: 'hard', exercises: STRENGTH},
  // Two sessions on one day: must still count as a single movement day.
  {daysAgo: 1, type: 'mobility', title: 'Mobility Flow', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', exercises: MOBILITY},
  {daysAgo: 1, type: 'mindful', title: 'Mindful Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', exercises: MINDFUL},
  // Today, so the current week always has something to look at whichever day
  // the demo is seeded on.
  {daysAgo: 0, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'better', effort: 'right', exercises: CALISTHENICS}
];

/** Builds the demo history. `now` is injectable so tests stay deterministic. */
export function buildDemoHistory(now: Date = new Date(), qualifyingRatio = 0.7): WorkoutLog[] {
  return PATTERN.map((entry, index) => {
    const day = addDays(now, -entry.daysAgo);
    // Mid-evening, so the log sits unambiguously inside its calendar day.
    const completedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 30 + index);
    const plannedSeconds = entry.minutes * 60;
    const activeSeconds = Math.round(plannedSeconds * entry.ratio);
    const blocksTotal = 12;

    return {
      id: `demo-${index}-${localDateKey(day)}`,
      completedAt: completedAt.toISOString(),
      dateKey: localDateKey(day),
      sessionId: `demo-session-${index}`,
      type: entry.type,
      title: entry.title,
      plannedMinutes: entry.minutes,
      activeSeconds,
      blocksCompleted: Math.round(blocksTotal * entry.ratio),
      blocksTotal,
      qualifies: entry.ratio >= qualifyingRatio,
      feel: entry.feel,
      effort: entry.effort,
      note: entry.note,
      // A partial save completed the opening movements and no more.
      exerciseIds: entry.exercises.slice(
        0,
        Math.max(1, Math.round(entry.exercises.length * entry.ratio))
      )
    };
  });
}
