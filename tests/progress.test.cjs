'use strict';
// Streaks, movement days and weekly maths. The rules these protect are the
// ones most likely to quietly mislead someone about their own week.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  getProgress,
  currentStreak,
  bestStreak,
  movementDays,
  progressMessage
} = require('../.test-build/lib/progress.js');
const {localDateKey, startOfWeek, addDays, relativeDay} = require('../.test-build/lib/date.js');
const {buildDemoHistory} = require('../.test-build/lib/demo.js');
const {logOnDay, makeLog} = require('./helpers.cjs');

const NOW = new Date(2026, 9, 19, 10, 0); // Monday 19 October 2026, local time

// ——— Date handling ————————————————————————————————————————————————————————

test('a day key uses local time, so a late session counts today', () => {
  const lateNight = new Date(2026, 9, 19, 23, 40);
  assert.equal(localDateKey(lateNight), '2026-10-19');

  const earlyMorning = new Date(2026, 9, 19, 0, 5);
  assert.equal(localDateKey(earlyMorning), '2026-10-19');
});

test('weeks start on Monday', () => {
  const sunday = new Date(2026, 9, 25, 12, 0);
  assert.equal(localDateKey(startOfWeek(sunday)), '2026-10-19');

  const monday = new Date(2026, 9, 19, 12, 0);
  assert.equal(localDateKey(startOfWeek(monday)), '2026-10-19');
});

test('relative days read naturally', () => {
  assert.equal(relativeDay(new Date(2026, 9, 19, 9, 0).toISOString(), NOW), 'Today');
  assert.equal(relativeDay(new Date(2026, 9, 18, 9, 0).toISOString(), NOW), 'Yesterday');
});

// ——— Qualifying ———————————————————————————————————————————————————————————

test('only qualifying sessions count towards movement days', () => {
  const history = [
    logOnDay(NOW, {qualifies: true}),
    logOnDay(addDays(NOW, -1), {qualifies: false})
  ];
  const days = movementDays(history);
  assert.equal(days.size, 1);
  assert.ok(days.has('2026-10-19'));
});

test('a partial session is kept in history but never counted', () => {
  const history = [logOnDay(NOW, {qualifies: false, activeSeconds: 300})];
  const summary = getProgress(history, NOW);

  assert.equal(summary.totalSessions, 0, 'a partial save is not a completed session');
  assert.equal(summary.streak, 0);
  assert.equal(summary.minutesThisWeek, 0);
  assert.equal(summary.recent.length, 1, 'but it still appears in recent history');
});

// ——— Streaks ——————————————————————————————————————————————————————————————

test('a streak counts consecutive days up to today', () => {
  const history = [
    logOnDay(NOW),
    logOnDay(addDays(NOW, -1)),
    logOnDay(addDays(NOW, -2))
  ];
  assert.equal(currentStreak(history, NOW), 3);
});

test('two sessions on one day do not make a two day streak', () => {
  const today = addDays(NOW, 0);
  const history = [
    makeLog({dateKey: localDateKey(today), completedAt: new Date(2026, 9, 19, 7, 0).toISOString()}),
    makeLog({dateKey: localDateKey(today), completedAt: new Date(2026, 9, 19, 19, 0).toISOString()})
  ];

  assert.equal(currentStreak(history, NOW), 1, 'same-day sessions are one movement day');

  const summary = getProgress(history, NOW);
  assert.equal(summary.weekDays, 1, 'the week strip shows one day, not two');
  assert.equal(summary.weekSessions, 2, 'but both sessions are counted as sessions');
});

test('an unfinished today does not break yesterday\'s streak', () => {
  const history = [logOnDay(addDays(NOW, -1)), logOnDay(addDays(NOW, -2))];
  assert.equal(
    currentStreak(history, NOW),
    2,
    'the streak runs to yesterday while today is still open'
  );
});

test('a gap ends the streak without erasing the best one', () => {
  const history = [
    logOnDay(NOW),
    // Two day gap here.
    logOnDay(addDays(NOW, -3)),
    logOnDay(addDays(NOW, -4)),
    logOnDay(addDays(NOW, -5)),
    logOnDay(addDays(NOW, -6))
  ];
  assert.equal(currentStreak(history, NOW), 1);
  assert.equal(bestStreak(history), 4);
});

test('an empty history is zero everywhere, not an error', () => {
  const summary = getProgress([], NOW);
  assert.equal(summary.streak, 0);
  assert.equal(summary.totalSessions, 0);
  assert.equal(summary.weekDays, 0);
  assert.equal(summary.chart.length, 7);
  assert.ok(summary.isEmpty);
  assert.deepEqual(summary.byType, []);
});

// ——— Week boundaries ——————————————————————————————————————————————————————

test('last week does not leak into this week', () => {
  const lastSunday = addDays(NOW, -1); // Sunday 18 October
  const history = [logOnDay(lastSunday), logOnDay(NOW)];
  const summary = getProgress(history, NOW);

  assert.equal(summary.weekDays, 1, 'only Monday belongs to this week');
  assert.equal(summary.totalSessions, 2, 'both still count in the all-time total');
});

test('the week chart marks today and leaves future days open', () => {
  const wednesday = new Date(2026, 9, 21, 10, 0);
  const summary = getProgress([logOnDay(wednesday)], wednesday);

  const today = summary.chart.find(day => day.isToday);
  assert.ok(today);
  assert.equal(today.key, '2026-10-21');
  assert.ok(today.done);

  const future = summary.chart.filter(day => day.isFuture);
  assert.equal(future.length, 4, 'Thursday to Sunday are still to come');
  assert.ok(future.every(day => !day.done));
});

// ——— Totals ——————————————————————————————————————————————————————————————

test('weekly totals add up by type', () => {
  const history = [
    logOnDay(NOW, {type: 'mobility', activeSeconds: 600}),
    logOnDay(addDays(NOW, 1), {type: 'mobility', activeSeconds: 600}),
    logOnDay(addDays(NOW, 2), {type: 'runwalk', activeSeconds: 1200})
  ];
  const summary = getProgress(history, addDays(NOW, 2));

  const mobility = summary.byType.find(entry => entry.type === 'mobility');
  assert.equal(mobility.sessions, 2);
  assert.equal(mobility.minutes, 20);
  assert.equal(summary.minutesThisWeek, 40);
});

// ——— Tone —————————————————————————————————————————————————————————————————

test('a broken streak is never shamed', () => {
  const summary = getProgress([], NOW);
  const message = progressMessage(summary, 4);
  assert.ok(!/fail|lost|missed|broke|should have/i.test(message), `shaming language: ${message}`);
});

test('a week with no movement invites rather than scolds', () => {
  const history = [logOnDay(addDays(NOW, -8))];
  const summary = getProgress(history, NOW);
  const message = progressMessage(summary, 4);
  assert.match(message, /start again today/i);
});

// ——— Demo data ————————————————————————————————————————————————————————————

test('demo history produces inspectable progress', () => {
  const history = buildDemoHistory(NOW);
  const summary = getProgress(history, NOW);

  assert.ok(history.length > 10, 'enough history to review');
  assert.ok(summary.totalSessions > 10);
  assert.ok(summary.bestStreak >= 2);
  assert.ok(summary.byType.length > 0);

  const partial = history.filter(log => !log.qualifies);
  assert.ok(partial.length > 0, 'includes a partial save, which must not count');
  assert.equal(
    summary.totalSessions,
    history.length - partial.length,
    'partial saves are excluded from the completed total'
  );
});

test('demo history keeps same-day sessions as one movement day', () => {
  const history = buildDemoHistory(NOW);
  const yesterday = localDateKey(addDays(NOW, -1));
  const sameDay = history.filter(log => log.dateKey === yesterday);
  assert.equal(sameDay.length, 2, 'the fixture deliberately has two sessions on one day');
  assert.equal(movementDays(sameDay).size, 1);
});
