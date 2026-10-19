// Progress maths.
//
// Two product rules shape everything here:
//   1. Only sessions where enough was actually done count towards movement
//      days and streaks. Partial saves stay in history but never inflate it.
//   2. A streak is a count of calendar days, not of sessions. Three sessions
//      in one day is one movement day, and today being unfinished never breaks
//      a streak — the count simply runs to yesterday until you move.

import {SessionType, WorkoutLog} from '../types';
import {WEEKDAY_LABELS, addDays, daysBetween, localDateKey, startOfWeek} from './date';

export interface ProgressDay {
  /** Local YYYY-MM-DD key. */
  key: string;
  /** Single-letter label for the week strip. */
  label: string;
  done: boolean;
  isToday: boolean;
  /** Days later in the current week, drawn as waiting rather than missed. */
  isFuture: boolean;
}

export interface TypeTotal {
  type: SessionType;
  sessions: number;
  minutes: number;
}

export interface ProgressSummary {
  totalSessions: number;
  totalMinutes: number;
  /** Consecutive calendar days with a qualifying session. */
  streak: number;
  /** Longest streak ever recorded, so a break never erases the history. */
  bestStreak: number;
  /** Distinct days with a qualifying session this week. */
  weekDays: number;
  weekSessions: number;
  minutesThisWeek: number;
  chart: ProgressDay[];
  byType: TypeTotal[];
  recent: WorkoutLog[];
  /** True when the person has never saved a qualifying session. */
  isEmpty: boolean;
}

/** Days with at least one qualifying session, as local date keys. */
export function movementDays(history: WorkoutLog[]): Set<string> {
  const days = new Set<string>();
  for (const log of history) {
    if (!log.qualifies) continue;
    days.add(log.dateKey || localDateKey(new Date(log.completedAt)));
  }
  return days;
}

/**
 * Consecutive days up to and including today. If today has no session yet the
 * count runs to yesterday, so an unfinished day is never treated as a break.
 */
export function currentStreak(history: WorkoutLog[], now: Date = new Date()): number {
  const days = movementDays(history);
  if (days.size === 0) return 0;

  let cursor = days.has(localDateKey(now)) ? now : addDays(now, -1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive movement days in the whole history. */
export function bestStreak(history: WorkoutLog[]): number {
  const keys = Array.from(movementDays(history)).sort();
  if (keys.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const previous = new Date(`${keys[i - 1]}T00:00:00`);
    const current = new Date(`${keys[i]}T00:00:00`);
    run = daysBetween(previous, current) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function getProgress(history: WorkoutLog[], now: Date = new Date()): ProgressSummary {
  const qualifying = history.filter(log => log.qualifies);
  const days = movementDays(history);

  const weekStart = startOfWeek(now);
  const todayKey = localDateKey(now);
  const chart: ProgressDay[] = WEEKDAY_LABELS.map((label, index) => {
    const date = addDays(weekStart, index);
    const key = localDateKey(date);
    return {
      key,
      label,
      done: days.has(key),
      isToday: key === todayKey,
      isFuture: daysBetween(now, date) > 0
    };
  });

  const weekKeys = new Set(chart.map(day => day.key));
  const weekLogs = qualifying.filter(log => weekKeys.has(log.dateKey || localDateKey(new Date(log.completedAt))));

  const totals = new Map<SessionType, TypeTotal>();
  for (const log of weekLogs) {
    const entry = totals.get(log.type) ?? {type: log.type, sessions: 0, minutes: 0};
    entry.sessions += 1;
    entry.minutes += Math.round(log.activeSeconds / 60);
    totals.set(log.type, entry);
  }

  const recent = [...history]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 8);

  return {
    totalSessions: qualifying.length,
    totalMinutes: Math.round(qualifying.reduce((sum, log) => sum + log.activeSeconds, 0) / 60),
    streak: currentStreak(history, now),
    bestStreak: bestStreak(history),
    weekDays: chart.filter(day => day.done).length,
    weekSessions: weekLogs.length,
    minutesThisWeek: Math.round(weekLogs.reduce((sum, log) => sum + log.activeSeconds, 0) / 60),
    chart,
    byType: Array.from(totals.values()).sort((a, b) => b.sessions - a.sessions || a.type.localeCompare(b.type)),
    recent,
    isEmpty: qualifying.length === 0
  };
}

/**
 * Encouragement that matches the week so far. Never shaming, never urgent: a
 * broken streak is an invitation, not a failure.
 */
export function progressMessage(summary: ProgressSummary, weeklyTarget: number): string {
  if (summary.isEmpty) return 'Your first session will show up here.';
  if (summary.weekDays === 0) return 'Start again today. The week is still open.';
  if (summary.weekDays >= weeklyTarget) return 'You have met your movement days for this week.';
  const left = weeklyTarget - summary.weekDays;
  return `${summary.weekDays} ${summary.weekDays === 1 ? 'day' : 'days'} so far. ${left} more would meet your week.`;
}
