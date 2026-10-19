// Progress maths. Only completed sessions (at least 70% of the timed plan
// performed) count towards movement days, weekly target and streaks — partial
// saves are kept in history but never counted. Weeks start on Monday, in the
// device's local time zone.

import {WorkoutLog} from '../types';

export interface ProgressDay {
  /** Local YYYY-MM-DD key for the day. */
  key: string;
  /** Short weekday label, e.g. "Mon". */
  day: string;
  done: boolean;
}

export interface ProgressSummary {
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  /** Distinct days with a completed session in the current week. */
  weekDays: number;
  weekSessions: number;
  minutesThisWeek: number;
  chart: ProgressDay[];
  lastFive: WorkoutLog[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day key — deliberately not UTC, so a late session counts today. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Monday 00:00 local time of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - weekday);
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function getProgress(history: WorkoutLog[], now: Date = new Date()): ProgressSummary {
  const completed = history.filter(log => log.finished);
  const doneDays = new Set(completed.map(log => localDateKey(new Date(log.completedAt))));

  const weekStart = startOfWeek(now);
  const chart: ProgressDay[] = DAY_LABELS.map((day, index) => {
    const key = localDateKey(addDays(weekStart, index));
    return {key, day, done: doneDays.has(key)};
  });

  const weekKeys = new Set(chart.map(day => day.key));
  const weekLogs = completed.filter(log => weekKeys.has(localDateKey(new Date(log.completedAt))));

  // Streak runs back from today, or from yesterday when today is still open.
  const todayKey = localDateKey(now);
  let cursor = doneDays.has(todayKey) ? new Date(now.getTime()) : new Date(now.getTime() - DAY_MS);
  let streak = 0;
  while (doneDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const totalSeconds = completed.reduce((sum, log) => sum + log.completedSeconds, 0);
  const weekSeconds = weekLogs.reduce((sum, log) => sum + log.completedSeconds, 0);

  return {
    totalSessions: completed.length,
    totalMinutes: Math.round(totalSeconds / 60),
    streak,
    weekDays: chart.filter(day => day.done).length,
    weekSessions: weekLogs.length,
    minutesThisWeek: Math.round(weekSeconds / 60),
    chart,
    lastFive: [...completed]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)
  };
}
