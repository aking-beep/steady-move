// Local-time date helpers.
//
// Everything in Steady Move works in the device's local calendar, never UTC: a
// session finished at 11.40pm belongs to that day, not to tomorrow. Weeks start
// on Monday.

export const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Local calendar day key, YYYY-MM-DD. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Midnight local time on the same calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar-day arithmetic that survives daylight saving changes. */
export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday 00:00 local time of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const weekday = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - weekday);
  return start;
}

/** Whole calendar days between two dates, ignoring the time of day. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** "Good morning" / "Good afternoon" / "Good evening". */
export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Today", "Yesterday", or a short date such as "Mon 13 Oct". */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const delta = daysBetween(date, now);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  if (delta > 1 && delta < 7) return WEEKDAY_NAMES[(date.getDay() + 6) % 7];
  return date.toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}
