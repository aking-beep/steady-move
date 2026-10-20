'use strict';
// Practice and progression.
//
// Ladder and Freeletics only get harder inside a programme you join; Fitbod
// needs every set logged; Hevy records what you did but decides nothing. These
// tests hold the line on progressing from data the person never enters, and on
// the offer never overriding the plan or the safety rules.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  FAMILIARITY_WINDOW_DAYS,
  READY_TO_PROGRESS,
  annotate,
  practiceNote,
  readFamiliarity,
  stepFor
} = require('../.test-build/engine/familiarity.js');
const {generateSession} = require('../.test-build/engine/planner.js');
const {getExercise} = require('../.test-build/data/exercises.js');
const {addDays} = require('../.test-build/lib/date.js');
const {makeProfile, makeCheckIn, logOnDay} = require('./helpers.cjs');

const NOW = new Date(2026, 9, 20, 10, 0);

function done(day, exerciseIds, extra = {}) {
  return logOnDay(day, {qualifies: true, exerciseIds, plannedMinutes: 20, ...extra});
}

// ——— Reading practice ——————————————————————————————————————————————————————

test('practice counts completed sessions, newest first', () => {
  const fam = readFamiliarity(
    [
      done(addDays(NOW, -1), ['push-up']),
      done(addDays(NOW, -4), ['push-up', 'air-squat']),
      done(addDays(NOW, -9), ['push-up'])
    ],
    NOW
  );

  assert.equal(fam['push-up'].times, 3);
  assert.equal(fam['push-up'].daysSince, 1);
  assert.equal(fam['air-squat'].times, 1);
  assert.equal(fam['air-squat'].daysSince, 4);
});

test('an abandoned session teaches nothing', () => {
  const fam = readFamiliarity(
    [done(addDays(NOW, -1), ['push-up'], {qualifies: false, blocksCompleted: 1})],
    NOW
  );
  assert.equal(fam['push-up'], undefined);
});

test('practice older than the window has lapsed', () => {
  const fam = readFamiliarity(
    [done(addDays(NOW, -(FAMILIARITY_WINDOW_DAYS + 2)), ['push-up'])],
    NOW
  );
  assert.equal(fam['push-up'], undefined);
});

test('the latest session is the one whose rating is remembered', () => {
  const fam = readFamiliarity(
    [
      done(addDays(NOW, -1), ['push-up'], {feel: 'better', effort: 'right'}),
      done(addDays(NOW, -5), ['push-up'], {feel: 'lower', effort: 'hard'})
    ],
    NOW
  );
  assert.equal(fam['push-up'].lastFeel, 'better');
  assert.equal(fam['push-up'].lastEffort, 'right');
});

// ——— The step offered ——————————————————————————————————————————————————————

test('the harder step arrives only once a movement has been practised', () => {
  const pushUp = getExercise('push-up');

  // Never met it, and new to all this: the easier way in is the useful offer.
  assert.equal(stepFor(pushUp, undefined, 'steady', 'new').direction, 'regress');
  // Never met it, but no beginner: the swap button covers it, so nothing.
  assert.equal(stepFor(pushUp, undefined, 'steady', 'regular'), undefined);

  // Met it once or twice: nothing to say yet, so it says nothing.
  assert.equal(stepFor(pushUp, {times: 1, daysSince: 2}, 'steady'), undefined);
  assert.equal(stepFor(pushUp, {times: 2, daysSince: 2}, 'steady'), undefined);

  const practised = stepFor(pushUp, {times: READY_TO_PROGRESS, daysSince: 2}, 'steady');
  assert.equal(practised.direction, 'progress');
  assert.equal(practised.note, pushUp.progression);
});

test('a session does not offer an alternative to every single movement', () => {
  const history = [1, 2, 3].map(back => done(addDays(NOW, -back), ['cat-cow', 'forward-fold']));
  const session = generateSession({
    profile: makeProfile({level: 'regular', activities: ['mobility']}),
    checkIn: makeCheckIn({energy: 'high', soreness: 'none', minutes: 40}),
    history,
    variant: 0,
    now: NOW
  });

  const movements = session.blocks.filter(block => block.phase === 'move' && block.exerciseId);
  const offered = movements.filter(block => block.stepNote).length;
  assert.ok(movements.length > 4, 'not enough movements to judge');
  assert.ok(
    offered < movements.length,
    `every one of ${movements.length} movements carried an alternative`
  );
});

test('a hard last session brings the easier option back', () => {
  const pushUp = getExercise('push-up');
  const step = stepFor(pushUp, {times: 6, daysSince: 1, lastEffort: 'hard'}, 'steady');
  assert.equal(step.direction, 'regress');
  assert.equal(step.note, pushUp.regression);
});

test('a gentle or easy day never offers the harder step, however practised', () => {
  const pushUp = getExercise('push-up');
  for (const intensity of ['gentle', 'easy']) {
    const step = stepFor(pushUp, {times: 20, daysSince: 1, lastFeel: 'better'}, intensity);
    assert.equal(step.direction, 'regress', `${intensity} offered a progression`);
  }
});

test('the step is always the movement’s own words, never generated', () => {
  const squat = getExercise('air-squat');
  assert.equal(stepFor(squat, {times: 9, daysSince: 1}, 'strong').note, squat.progression);
  assert.equal(stepFor(squat, undefined, 'gentle', 'regular').note, squat.regression);
});

// ——— The note shown ———————————————————————————————————————————————————————

test('the practice note stays quiet until there is something to say', () => {
  assert.equal(practiceNote(undefined), undefined);
  assert.equal(practiceNote({times: 1, daysSince: 3}), undefined);
});

test('the practice note counts in ordinary words', () => {
  assert.equal(practiceNote({times: 2, daysSince: 0}), '2nd time this month · last today');
  assert.equal(practiceNote({times: 3, daysSince: 1}), '3rd time this month · last yesterday');
  assert.equal(practiceNote({times: 4, daysSince: 6}), '4th time this month · last 6 days ago');
});

test('nothing in the practice note shames or scores', () => {
  const banned = /\b(missed|failed|behind|streak broken|out of \d+)\b/i;
  for (const times of [2, 3, 4, 7, 11]) {
    for (const daysSince of [0, 1, 3, 20]) {
      assert.doesNotMatch(practiceNote({times, daysSince}), banned);
    }
  }
});

// ——— In a real session ————————————————————————————————————————————————————

test('a practised movement in a built session carries its progression', () => {
  // Three sessions covering the whole library, so whatever the engine picks
  // today, the person has met it three times.
  const {ALL_EXERCISES} = require('../.test-build/data/exercises.js');
  const everything = ALL_EXERCISES.map(exercise => exercise.id);
  const history = [1, 3, 5].map(back => done(addDays(NOW, -back), everything));

  const session = generateSession({
    profile: makeProfile({level: 'regular', activities: ['calisthenics']}),
    checkIn: makeCheckIn({energy: 'high', soreness: 'none', minutes: 40}),
    history,
    variant: 0,
    now: NOW
  });

  const movements = session.blocks.filter(block => block.phase === 'move' && block.exerciseId);
  assert.ok(movements.length > 0, 'the session has no movements');

  for (const block of movements) {
    const exercise = getExercise(block.exerciseId);
    if (!exercise.progression) continue;
    assert.equal(
      block.stepDirection,
      'progress',
      `${block.exerciseId} was practised three times and offered nothing`
    );
    assert.equal(block.stepNote, exercise.progression);
    assert.match(block.practiceNote, /3rd time this month/);
  }
});

test('annotating changes no movement and no second of the plan', () => {
  const history = [1, 3, 5, 7].map(back => done(addDays(NOW, -back), ['push-up', 'air-squat']));
  const session = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn({minutes: 20}),
    history,
    variant: 0,
    now: NOW
  });

  const before = session.blocks.map(block => [block.id, block.name, block.seconds, block.exerciseId]);
  const exercises = Object.fromEntries(
    session.blocks
      .filter(block => block.exerciseId)
      .map(block => [block.exerciseId, getExercise(block.exerciseId)])
  );

  // Annotate again, with a completely different practice history.
  annotate(session.blocks, exercises, readFamiliarity(history, NOW), 'strong');

  assert.deepEqual(
    session.blocks.map(block => [block.id, block.name, block.seconds, block.exerciseId]),
    before
  );
  assert.equal(session.totalSeconds, 20 * 60);
  assert.equal(
    session.blocks.reduce((sum, block) => sum + block.seconds, 0),
    20 * 60
  );
});

test('a pain day offers nothing harder, however practised the person is', () => {
  const history = [1, 2, 3, 4, 5].map(back =>
    done(addDays(NOW, -back), ['push-up', 'air-squat'], {feel: 'better'})
  );
  const session = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn({pain: true}),
    history,
    variant: 0,
    now: NOW
  });

  for (const block of session.blocks) {
    assert.notEqual(block.stepDirection, 'progress', `${block.id} offered a progression on a pain day`);
  }
});

test('the practice note only appears on the movements themselves', () => {
  const history = [1, 3, 6].map(back => done(addDays(NOW, -back), ['push-up']));
  const session = generateSession({
    profile: makeProfile({level: 'regular', activities: ['calisthenics']}),
    checkIn: makeCheckIn({energy: 'high', minutes: 40}),
    history,
    variant: 0,
    now: NOW
  });

  for (const block of session.blocks) {
    if (block.practiceNote) assert.equal(block.phase, 'move');
  }
});

test('annotate leaves a block it knows nothing about alone', () => {
  const blocks = [
    {id: 'rest-0', kind: 'rest', phase: 'move', name: 'Rest', instructions: '', cues: [], seconds: 30, mode: 'time'}
  ];
  annotate(blocks, {}, {}, 'steady');
  assert.equal(blocks[0].stepNote, undefined);
  assert.equal(blocks[0].practiceNote, undefined);
});
