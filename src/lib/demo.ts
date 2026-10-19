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
}

/**
 * A believable month: a solid first fortnight, a gap, a restart, and a current
 * run of a few days ending today. Includes one partial save, which must NOT
 * count, and one doubled-up day, which must count once.
 */
const PATTERN: DemoEntry[] = [
  {daysAgo: 27, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'better', effort: 'right'},
  {daysAgo: 26, type: 'mobility', title: 'Mobility Flow', minutes: 10, ratio: 1, feel: 'better', effort: 'easy'},
  {daysAgo: 24, type: 'runwalk', title: 'Run + Walk', minutes: 20, ratio: 1, feel: 'better', effort: 'right'},
  {daysAgo: 23, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'same', effort: 'hard'},
  {daysAgo: 22, type: 'mindful', title: 'Mindful Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy'},
  {daysAgo: 20, type: 'strength', title: 'Steady Strength', minutes: 40, ratio: 1, feel: 'better', effort: 'right'},
  {daysAgo: 19, type: 'mobility', title: 'Mobility Flow', minutes: 20, ratio: 1, feel: 'better', effort: 'easy'},
  {daysAgo: 17, type: 'runwalk', title: 'Run + Walk', minutes: 40, ratio: 1, feel: 'same', effort: 'hard', note: 'Longer than planned, felt good.'},
  {daysAgo: 16, type: 'recovery', title: 'Recovery + Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy'},
  // A session started and abandoned: stays in history, never counts.
  {daysAgo: 14, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 0.35},
  {daysAgo: 9, type: 'mindful', title: 'Mindful Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy', note: 'Back after a week off.'},
  {daysAgo: 8, type: 'mobility', title: 'Mobility Flow', minutes: 20, ratio: 1, feel: 'better', effort: 'easy'},
  {daysAgo: 6, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'same', effort: 'right'},
  {daysAgo: 5, type: 'runwalk', title: 'Run + Walk', minutes: 20, ratio: 1, feel: 'better', effort: 'right'},
  {daysAgo: 3, type: 'balanced', title: 'Balanced Movement', minutes: 20, ratio: 1, feel: 'better', effort: 'right'},
  {daysAgo: 2, type: 'strength', title: 'Steady Strength', minutes: 40, ratio: 1, feel: 'same', effort: 'hard'},
  // Two sessions on one day: must still count as a single movement day.
  {daysAgo: 1, type: 'mobility', title: 'Mobility Flow', minutes: 10, ratio: 1, feel: 'better', effort: 'easy'},
  {daysAgo: 1, type: 'mindful', title: 'Mindful Reset', minutes: 10, ratio: 1, feel: 'better', effort: 'easy'},
  // Today, so the current week always has something to look at whichever day
  // the demo is seeded on.
  {daysAgo: 0, type: 'calisthenics', title: 'Bodyweight Strength', minutes: 20, ratio: 1, feel: 'better', effort: 'right'}
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
      note: entry.note
    };
  });
}
