'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');

const {getProgress, localDateKey, startOfWeek} = require('../.test-build/lib/progress.js');

/** Local midday on a given local date, so time zones cannot shift the day. */
const at = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour, 0, 0);

let counter = 0;
function log(date, overrides = {}) {
  counter += 1;
  return {
    id: `session-${counter}`,
    completedAt: date.toISOString(),
    planTitle: 'Everyday strength flow',
    focus: 'balanced',
    plannedMinutes: 20,
    completedSeconds: 1200,
    finished: true,
    energy: 'okay',
    mood: 'neutral',
    ...overrides
  };
}

test('localDateKey uses the local calendar day', () => {
  assert.equal(localDateKey(at(2026, 1, 5, 23)), '2026-01-05');
  assert.equal(localDateKey(at(2026, 11, 9, 0)), '2026-11-09');
});

test('weeks start on Monday', () => {
  // 2026-10-19 is a Monday; 2026-10-25 the Sunday that closes the same week.
  assert.equal(localDateKey(startOfWeek(at(2026, 10, 19))), '2026-10-19');
  assert.equal(localDateKey(startOfWeek(at(2026, 10, 25))), '2026-10-19');
  assert.equal(localDateKey(startOfWeek(at(2026, 10, 26))), '2026-10-26');
});

test('an empty history reports nothing done', () => {
  const progress = getProgress([], at(2026, 10, 21));
  assert.equal(progress.totalSessions, 0);
  assert.equal(progress.totalMinutes, 0);
  assert.equal(progress.streak, 0);
  assert.equal(progress.weekDays, 0);
  assert.equal(progress.weekSessions, 0);
  assert.equal(progress.minutesThisWeek, 0);
  assert.equal(progress.lastFive.length, 0);
  assert.equal(progress.chart.length, 7);
  assert.deepEqual(progress.chart.map(day => day.day), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.ok(progress.chart.every(day => day.done === false));
});

test('partial saves are kept but never counted', () => {
  const history = [
    log(at(2026, 10, 20), {finished: false, completedSeconds: 300}),
    log(at(2026, 10, 21))
  ];
  const progress = getProgress(history, at(2026, 10, 21));
  assert.equal(progress.totalSessions, 1);
  assert.equal(progress.totalMinutes, 20);
  assert.equal(progress.weekDays, 1);
  assert.equal(progress.streak, 1);
  assert.equal(progress.lastFive.length, 1);
  assert.equal(progress.chart.find(day => day.key === '2026-10-20').done, false);
});

test('weekly movement days count distinct days, not sessions', () => {
  const history = [
    log(at(2026, 10, 19, 7)),
    log(at(2026, 10, 19, 18)),
    log(at(2026, 10, 22))
  ];
  const progress = getProgress(history, at(2026, 10, 23));
  assert.equal(progress.weekSessions, 3);
  assert.equal(progress.weekDays, 2);
  assert.equal(progress.minutesThisWeek, 60);
});

test('last week does not leak into this week', () => {
  const history = [log(at(2026, 10, 18)), log(at(2026, 10, 19))];
  const progress = getProgress(history, at(2026, 10, 19));
  assert.equal(progress.totalSessions, 2);
  assert.equal(progress.weekSessions, 1);
  assert.equal(progress.weekDays, 1);
  // The Sunday session still extends the streak across the week boundary.
  assert.equal(progress.streak, 2);
});

test('streak counts consecutive days and survives an open today', () => {
  const history = [log(at(2026, 10, 19)), log(at(2026, 10, 20)), log(at(2026, 10, 21))];
  assert.equal(getProgress(history, at(2026, 10, 21)).streak, 3);
  // Nothing done yet today: yesterday's streak still stands.
  assert.equal(getProgress(history, at(2026, 10, 22)).streak, 3);
  // A full day missed resets it.
  assert.equal(getProgress(history, at(2026, 10, 23)).streak, 0);
});

test('recent sessions are newest first and capped at five', () => {
  const history = [2, 3, 4, 5, 6, 7, 8].map(day => log(at(2026, 10, day)));
  const progress = getProgress(history, at(2026, 10, 8));
  assert.equal(progress.lastFive.length, 5);
  assert.deepEqual(
    progress.lastFive.map(entry => localDateKey(new Date(entry.completedAt))),
    ['2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-04']
  );
});

test('minutes are reported from time actually performed', () => {
  const history = [
    log(at(2026, 10, 20), {plannedMinutes: 40, completedSeconds: 1800}),
    log(at(2026, 10, 21), {plannedMinutes: 10, completedSeconds: 600})
  ];
  const progress = getProgress(history, at(2026, 10, 21));
  assert.equal(progress.totalMinutes, 40);
  assert.equal(progress.minutesThisWeek, 40);
});
