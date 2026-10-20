'use strict';
// Training around a niggle.
//
// The research this answers: 53% of 1,387 recreational gym-goers report pain
// related to their training (Bernstorff et al., Sports 2023), most often
// shoulder, lower back and knee — and 86% of injured recreational runners keep
// training anyway (Linton & Valentin, 2018). So the only two failure modes
// that matter are prescribing a movement that loads the sore part, and leaving
// so little that there is nothing to do. These tests hold both ends.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  CONFIRM_AFTER_DAYS,
  EXPIRE_AFTER_DAYS,
  RED_FLAGS,
  RED_FLAG_ADVICE,
  conflicts,
  dueForConfirming,
  flaggedParts,
  hasExpired,
  loadsFor,
  needsConfirming
} = require('../.test-build/engine/niggles.js');
const {generateSession} = require('../.test-build/engine/planner.js');
const {ALL_EXERCISES, getExercise, selectPool, MAIN_POOL} = require('../.test-build/data/exercises.js');
const {BODY_PARTS, BODY_PART_LABELS} = require('../.test-build/types/index.js');
const {addDays} = require('../.test-build/lib/date.js');
const {makeProfile, makeCheckIn, MINUTES, LEVELS} = require('./helpers.cjs');

const NOW = new Date(2026, 9, 20, 10, 0);

function niggle(part, daysAgo = 0) {
  const when = addDays(NOW, -daysAgo).toISOString();
  return {id: `niggle-${part}`, part, startedAt: when, confirmedAt: when};
}

// ——— What loads what ———————————————————————————————————————————————————————

test('every movement declares what it loads, using known parts only', () => {
  for (const exercise of ALL_EXERCISES) {
    const parts = loadsFor(exercise);
    assert.ok(Array.isArray(parts), `${exercise.id} declared nothing`);
    for (const part of parts) {
      assert.ok(BODY_PARTS.includes(part), `${exercise.id} loads unknown part: ${part}`);
    }
  }
});

test('the obvious cases are right', () => {
  assert.deepEqual(loadsFor(getExercise('push-up')).sort(), ['elbow', 'shoulder', 'wrist']);
  assert.ok(loadsFor(getExercise('air-squat')).includes('knee'));
  assert.ok(loadsFor(getExercise('db-overhead-press')).includes('shoulder'));
  assert.ok(loadsFor(getExercise('plank')).includes('wrist'), 'a plank is taken on the hands');
  assert.ok(loadsFor(getExercise('childs-pose')).includes('knee'), 'child’s pose bends the knee fully');
});

test('breathing asks nothing of any joint', () => {
  for (const exercise of ALL_EXERCISES) {
    if (exercise.movementPattern !== 'breath') continue;
    assert.deepEqual(loadsFor(exercise), [], `${exercise.id} should load nothing`);
  }
});

test('walking stays available with a sore knee; running does not', () => {
  const knee = new Set(['knee']);
  assert.equal(conflicts(getExercise('walk-easy'), knee), false);
  assert.equal(conflicts(getExercise('walk-brisk'), knee), false);
  assert.equal(conflicts(getExercise('jog-easy'), knee), true);
  assert.equal(conflicts(getExercise('jog-steady'), knee), true);
});

test('no flags means nothing is filtered', () => {
  const none = flaggedParts([], NOW);
  for (const exercise of ALL_EXERCISES) assert.equal(conflicts(exercise, none), false);
});

// ——— The session built around it ——————————————————————————————————————————

test('a flagged part never appears in the session, in any phase', () => {
  for (const part of BODY_PARTS) {
    const session = generateSession({
      profile: makeProfile({level: 'regular', niggles: [niggle(part)]}),
      checkIn: makeCheckIn({minutes: 40}),
      history: [],
      variant: 0,
      now: NOW
    });

    for (const block of session.blocks) {
      if (!block.exerciseId) continue;
      const exercise = getExercise(block.exerciseId);
      assert.ok(
        !loadsFor(exercise).includes(part),
        `${part} flagged, but ${block.exerciseId} (${block.phase}) loads it`
      );
    }
  }
});

test('there is still a real session for every part, at every level and length', () => {
  for (const part of BODY_PARTS) {
    for (const level of LEVELS) {
      for (const minutes of MINUTES) {
        const session = generateSession({
          profile: makeProfile({level, niggles: [niggle(part)]}),
          checkIn: makeCheckIn({minutes}),
          history: [],
          variant: 0,
          now: NOW
        });

        const movements = session.blocks.filter(b => b.phase === 'move' && b.exerciseId);
        assert.ok(
          movements.length > 0,
          `${part} / ${level} / ${minutes}min left nothing to do`
        );
        assert.equal(session.totalSeconds, minutes * 60, `${part} / ${level} / ${minutes}min`);
      }
    }
  }
});

test('two flags at once still leave a session', () => {
  const session = generateSession({
    profile: makeProfile({level: 'regular', niggles: [niggle('shoulder'), niggle('knee')]}),
    checkIn: makeCheckIn({minutes: 20}),
    history: [],
    variant: 0,
    now: NOW
  });

  const movements = session.blocks.filter(b => b.phase === 'move' && b.exerciseId);
  assert.ok(movements.length > 0);
  for (const block of session.blocks) {
    if (!block.exerciseId) continue;
    const parts = loadsFor(getExercise(block.exerciseId));
    assert.ok(!parts.includes('shoulder') && !parts.includes('knee'), block.exerciseId);
  }
});

test('the session says what it was built around', () => {
  const session = generateSession({
    profile: makeProfile({level: 'regular', niggles: [niggle('shoulder')]}),
    checkIn: makeCheckIn(),
    history: [],
    variant: 0,
    now: NOW
  });
  assert.match(session.rationale, /shoulder/i);
  assert.match(session.rationale, /left out/i);
});

test('a session with nothing flagged says nothing about niggles', () => {
  const session = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn(),
    history: [],
    variant: 0,
    now: NOW
  });
  assert.doesNotMatch(session.rationale, /Built around your/);
});

test('rebuilding keeps routing around it', () => {
  for (let variant = 0; variant < 6; variant++) {
    const session = generateSession({
      profile: makeProfile({level: 'regular', niggles: [niggle('wrist')]}),
      checkIn: makeCheckIn({minutes: 40}),
      history: [],
      variant,
      now: NOW
    });
    for (const block of session.blocks) {
      if (!block.exerciseId) continue;
      assert.ok(
        !loadsFor(getExercise(block.exerciseId)).includes('wrist'),
        `variant ${variant} offered ${block.exerciseId}`
      );
    }
  }
});

test('a swap offered in place of a movement respects the flag too', () => {
  const {alternativesFor} = require('../.test-build/engine/swap.js');
  const profile = makeProfile({level: 'regular', niggles: [niggle('shoulder')]});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({minutes: 40}),
    history: [],
    variant: 0,
    now: NOW
  });

  const block = session.blocks.find(b => b.phase === 'move' && b.exerciseId);
  const options = alternativesFor({session, block, profile});
  for (const option of options) {
    assert.ok(
      !loadsFor(option).includes('shoulder'),
      `swap offered ${option.id}, which loads the flagged shoulder`
    );
  }
});

// ——— Expiry ———————————————————————————————————————————————————————————————

test('a fresh flag is not nagging anyone', () => {
  const fresh = niggle('knee', 1);
  assert.equal(needsConfirming(fresh, NOW), false);
  assert.equal(hasExpired(fresh, NOW), false);
  assert.equal(dueForConfirming([fresh], NOW), undefined);
});

test('after two weeks it asks whether it is still true', () => {
  const old = niggle('knee', CONFIRM_AFTER_DAYS);
  assert.equal(needsConfirming(old, NOW), true);
  assert.equal(dueForConfirming([niggle('hip', 2), old], NOW).part, 'knee');
});

test('a flag nobody confirms stops filtering rather than lasting forever', () => {
  const stale = niggle('knee', EXPIRE_AFTER_DAYS);
  assert.equal(hasExpired(stale, NOW), true);
  assert.equal(flaggedParts([stale], NOW).size, 0);
  // And it no longer nags, because it is no longer doing anything.
  assert.equal(needsConfirming(stale, NOW), false);

  const session = generateSession({
    profile: makeProfile({level: 'regular', niggles: [stale]}),
    checkIn: makeCheckIn({minutes: 20}),
    history: [],
    variant: 0,
    now: NOW
  });
  const squats = session.blocks.filter(
    b => b.exerciseId && loadsFor(getExercise(b.exerciseId)).includes('knee')
  );
  assert.ok(squats.length > 0, 'an expired flag should stop removing movements');
});

// ——— The screen that comes first ——————————————————————————————————————————

test('the red-flag screen covers the four clusters every guideline names', () => {
  const ids = RED_FLAGS.map(flag => flag.id).sort();
  assert.deepEqual(ids, ['neuro', 'rest', 'systemic', 'trauma']);
  for (const flag of RED_FLAGS) {
    assert.ok(flag.question.endsWith('?'), `${flag.id} is not a question`);
    assert.ok(flag.question.length > 30, `${flag.id} is too terse to answer honestly`);
  }
});

test('the advice sends people to a clinician and does not diagnose', () => {
  assert.match(RED_FLAG_ADVICE, /GP|physiotherapist/);
  assert.doesNotMatch(RED_FLAG_ADVICE, /\b(diagnos|tear|strain|tendonitis|sprain|impingement)/i);
});

test('every part has a label a person would use about themselves', () => {
  for (const part of BODY_PARTS) {
    assert.ok(BODY_PART_LABELS[part], `${part} has no label`);
    assert.doesNotMatch(BODY_PART_LABELS[part], /joint|region|articulation/i);
  }
});

test('the pool filter leaves a usable set for every single part', () => {
  for (const part of BODY_PARTS) {
    const pool = selectPool(MAIN_POOL, {
      level: 'regular',
      equipment: ['bodyweight'],
      avoidParts: new Set([part])
    });
    assert.ok(pool.length >= 6, `${part} leaves only ${pool.length} movements`);
  }
});
