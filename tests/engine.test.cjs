'use strict';
// The engine's promises, as tests. Each of these corresponds to a line in the
// product spec that a user is entitled to rely on.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {generateSession} = require('../.test-build/engine/planner.js');
const {allocate, allocateCapped, phaseBudgets} = require('../.test-build/engine/duration.js');
const {getExercise, expandEquipment, MAX_DIFFICULTY} = require('../.test-build/data/exercises.js');
const {
  MINUTES,
  everyCombination,
  makeCheckIn,
  makeProfile,
  plan
} = require('./helpers.cjs');

// ——— Duration ————————————————————————————————————————————————————————————

test('a 10, 20 or 40 minute session lasts exactly that long', () => {
  for (const minutes of MINUTES) {
    const session = plan({minutes});
    assert.equal(
      session.totalSeconds,
      minutes * 60,
      `${minutes} minute session totalled ${session.totalSeconds} seconds`
    );

    const summed = session.blocks.reduce((total, block) => total + block.seconds, 0);
    assert.equal(summed, minutes * 60, 'block seconds must sum to the session total');
  }
});

test('every session length holds across every combination of inputs', () => {
  let checked = 0;
  everyCombination((session, checkIn) => {
    assert.equal(session.totalSeconds, checkIn.minutes * 60);
    checked += 1;
  });
  assert.ok(checked > 1000, `expected a broad sweep, only checked ${checked}`);
});

test('rest and transitions are inside the budget, not added to it', () => {
  const session = plan({minutes: 20, energy: 'high', soreness: 'none'}, {level: 'regular'});
  const rest = session.blocks.filter(block => block.kind === 'rest');
  assert.ok(rest.length > 0, 'a strength session should include rest blocks');
  assert.equal(session.totalSeconds, 1200);
});

test('phase budgets leave the move block the largest share', () => {
  for (const minutes of MINUTES) {
    const budgets = phaseBudgets(minutes);
    const total = budgets.arrive + budgets.warmup + budgets.move + budgets.reset + budgets.reflect;
    assert.equal(total, minutes * 60);
    assert.ok(budgets.move > budgets.warmup, 'move should outweigh the warm-up');
    assert.ok(budgets.arrive >= 30 && budgets.arrive <= 60, 'arrive stays 30-60 seconds');
    assert.ok(budgets.warmup >= 120 && budgets.warmup <= 300, 'warm-up stays 2-5 minutes');
    assert.ok(budgets.reflect >= 30 && budgets.reflect <= 60, 'reflect stays 30-60 seconds');
  }
});

test('allocate always sums to the total it was given', () => {
  const cases = [
    [600, [1, 1, 1]],
    [780, [2, 5, 5, 5, 5, 2]],
    [1680, [1, 1, 1, 1, 1, 1, 1]],
    [95, [3, 1]],
    [45, [1]]
  ];
  for (const [total, weights] of cases) {
    const parts = allocate(total, weights);
    assert.equal(parts.reduce((sum, value) => sum + value, 0), total);
    assert.ok(parts.every(value => value > 0), 'no part may be zero');
    assert.ok(parts.every(value => value % 5 === 0), 'parts stay on the 5 second grain');
  }
});

test('allocateCapped respects ceilings and reports what it could not place', () => {
  const {parts, leftover} = allocateCapped(600, [40, undefined, undefined]);
  assert.ok(parts[0] <= 40, 'the capped part must not exceed its ceiling');
  assert.equal(parts.reduce((sum, value) => sum + value, 0) + leftover, 600);
});

// ——— Safety ——————————————————————————————————————————————————————————————

test('reported pain never prescribes exercise', () => {
  for (const minutes of MINUTES) {
    for (const level of ['new', 'occasional', 'regular']) {
      const session = plan(
        {minutes, pain: true, energy: 'high', soreness: 'none', equipment: ['full-gym']},
        {level, activities: ['strength'], equipment: ['full-gym']}
      );

      assert.equal(session.type, 'recovery');
      assert.ok(session.painFlagged, 'the session must be flagged as pain-adjusted');
      assert.equal(session.intensity, 'gentle');

      for (const block of session.blocks) {
        if (!block.exerciseId) continue;
        const exercise = getExercise(block.exerciseId);
        assert.ok(exercise, `unknown exercise ${block.exerciseId}`);
        assert.ok(
          exercise.gentle,
          `pain day prescribed ${exercise.id}, which is not a gentle movement`
        );
      }
    }
  }
});

test('pain overrides an explicitly requested session type', () => {
  // Explore and Quick Move force a type; a pain flag must still win.
  const session = generateSession({
    profile: makeProfile({level: 'regular', activities: ['running']}),
    checkIn: makeCheckIn({pain: true, minutes: 20, location: 'outside'}),
    history: [],
    variant: 0,
    force: 'runwalk',
    now: new Date('2026-10-19T09:00:00')
  });
  assert.equal(session.type, 'recovery');
  assert.ok(session.painFlagged);
});

test('low energy with real soreness routes to recovery', () => {
  for (const minutes of MINUTES) {
    const session = plan(
      {minutes, energy: 'low', soreness: 'sore'},
      {level: 'regular', activities: ['strength'], equipment: ['full-gym']}
    );
    assert.equal(session.type, 'recovery');
    assert.equal(session.intensity, 'gentle');
    assert.ok(session.adjustedForRecovery);
    assert.equal(
      session.blocks.filter(block => block.kind === 'rest').length,
      0,
      'a recovery session has no work/rest circuit'
    );
  }
});

test('low energy alone softens the session without forcing recovery', () => {
  const session = plan({energy: 'low', soreness: 'none'}, {level: 'regular'});
  assert.equal(session.intensity, 'easy');
  assert.notEqual(session.type, 'recovery');
});

test('high energy and no soreness allows harder work for a regular trainer', () => {
  const session = plan(
    {energy: 'high', soreness: 'none', equipment: ['full-gym']},
    {level: 'regular', activities: ['strength'], equipment: ['full-gym']}
  );
  assert.equal(session.intensity, 'strong');
});

test('the safety rules hold across the whole input space', () => {
  everyCombination((session, checkIn) => {
    if (checkIn.pain) {
      assert.equal(session.type, 'recovery', 'pain must always route to recovery');
      for (const block of session.blocks) {
        if (!block.exerciseId) continue;
        assert.ok(getExercise(block.exerciseId).gentle, 'pain day must stay gentle');
      }
    }
    if (checkIn.energy === 'low' && checkIn.soreness === 'sore') {
      assert.equal(session.type, 'recovery');
    }
  });
});

// ——— Equipment and level gating ——————————————————————————————————————————

test('a movement is never prescribed without the equipment it needs', () => {
  everyCombination((session, checkIn) => {
    const owned = expandEquipment(checkIn.equipment);
    for (const block of session.blocks) {
      if (!block.exerciseId) continue;
      const exercise = getExercise(block.exerciseId);
      for (const required of exercise.equipment) {
        assert.ok(
          owned.has(required),
          `${exercise.id} needs ${required}, which is not in ${checkIn.equipment.join(', ')}`
        );
      }
    }
  });
});

test('bodyweight-only days never include a dumbbell or kettlebell movement', () => {
  for (const minutes of MINUTES) {
    const session = plan(
      {minutes, equipment: ['bodyweight'], energy: 'high'},
      {level: 'regular', activities: ['strength'], equipment: ['bodyweight']}
    );
    for (const block of session.blocks) {
      if (!block.exerciseId) continue;
      const exercise = getExercise(block.exerciseId);
      assert.equal(exercise.equipment.length, 0, `${exercise.id} requires equipment`);
    }
  }
});

test('a beginner is only ever offered beginner movements', () => {
  everyCombination((session, _checkIn, profile) => {
    const ceiling = MAX_DIFFICULTY[profile.level];
    for (const block of session.blocks) {
      if (!block.exerciseId) continue;
      const exercise = getExercise(block.exerciseId);
      assert.ok(
        exercise.difficulty <= ceiling,
        `${exercise.id} is difficulty ${exercise.difficulty}, above ${profile.level}`
      );
    }
  });
});

test('no kettlebell swings exist in the library at all', () => {
  everyCombination(session => {
    for (const block of session.blocks) {
      assert.ok(
        !/swing/i.test(block.name),
        `${block.name} prescribes a swing, which the MVP deliberately excludes`
      );
    }
  });
});

// ——— Structure ———————————————————————————————————————————————————————————

test('a session is never empty and always has the five phases', () => {
  everyCombination(session => {
    assert.ok(session.blocks.length >= 5, 'a session must have real content');
    for (const phase of ['arrive', 'warmup', 'move', 'reset', 'reflect']) {
      assert.ok(
        session.blocks.some(block => block.phase === phase),
        `session is missing its ${phase} phase`
      );
    }
    assert.ok(
      session.blocks.every(block => block.seconds >= 5),
      'no block may be shorter than the 5 second grain'
    );
  });
});

test('a timed hold is never stretched past a sensible ceiling', () => {
  everyCombination(session => {
    for (const block of session.blocks) {
      if (block.phase !== 'move' || block.kind !== 'exercise' || !block.exerciseId) continue;
      const exercise = getExercise(block.exerciseId);
      if (exercise.mode !== 'time' || !exercise.duration) continue;
      // Only circuits cap holds; flows legitimately lengthen a stretch.
      const isCircuit = session.blocks.some(entry => entry.kind === 'rest');
      if (!isCircuit) continue;
      assert.ok(
        block.seconds <= exercise.duration * 1.6 + 5,
        `${exercise.id} held for ${block.seconds}s against a suggested ${exercise.duration}s`
      );
    }
  });
});

test('every block names the one that follows it, except the last', () => {
  const session = plan({minutes: 20});
  for (let i = 0; i < session.blocks.length - 1; i++) {
    assert.equal(session.blocks[i].nextName, session.blocks[i + 1].name);
  }
  assert.equal(session.blocks[session.blocks.length - 1].nextName, undefined);
});

// ——— Determinism and rebuild ——————————————————————————————————————————————

test('the same inputs always produce the same session', () => {
  const now = new Date('2026-10-19T09:00:00');
  const a = plan({minutes: 20}, {level: 'occasional'}, {now});
  const b = plan({minutes: 20}, {level: 'occasional'}, {now});
  assert.deepEqual(
    a.blocks.map(block => [block.name, block.seconds]),
    b.blocks.map(block => [block.name, block.seconds])
  );
});

test('rebuild produces a different but equally valid session', () => {
  const checkIn = {minutes: 20, energy: 'okay', soreness: 'none'};
  const profile = {level: 'occasional', activities: ['calisthenics', 'mobility', 'running']};

  const first = plan(checkIn, profile, {variant: 0});
  const second = plan(checkIn, profile, {variant: 1});

  assert.equal(second.totalSeconds, first.totalSeconds, 'rebuild keeps the time budget');
  assert.ok(second.blocks.length > 0);

  const sameShape =
    JSON.stringify(first.blocks.map(b => b.name)) === JSON.stringify(second.blocks.map(b => b.name));
  assert.ok(!sameShape, 'rebuild should not return an identical session');
});

// ——— Run / walk ———————————————————————————————————————————————————————————

test('run and walk sessions are time based with effort guidance, never pace', () => {
  const session = plan(
    {minutes: 20, location: 'outside', equipment: ['bodyweight', 'outdoors']},
    {level: 'occasional', activities: ['running']}
  );
  assert.equal(session.type, 'runwalk');

  const moveBlocks = session.blocks.filter(block => block.phase === 'move');
  assert.ok(moveBlocks.length >= 3, 'expected several intervals');
  for (const block of moveBlocks) {
    assert.equal(block.mode, 'time');
    assert.ok(block.effortNote && /RPE/.test(block.effortNote), 'every interval explains its effort');
    // "at a pace you could talk at" is effort language and is fine. What must
    // never appear is a measured target: a distance, or minutes per kilometre.
    assert.ok(
      !/\d+\s*(km|mi\b|miles?|metres?|meters?)|min(ute)?s?\s*(per|\/)\s*(km|mile)|target pace/i.test(
        block.instructions
      ),
      `prescribed a measured pace or distance: ${block.instructions}`
    );
  }
});

test('run and walk is not offered when there is nowhere to do it', () => {
  const session = plan(
    {minutes: 20, location: 'home', equipment: ['bodyweight']},
    {activities: ['running']}
  );
  assert.notEqual(session.type, 'runwalk');
});

test('a beginner runner gets walking intervals, not continuous running', () => {
  const session = plan(
    {minutes: 20, location: 'outside', equipment: ['bodyweight', 'outdoors']},
    {level: 'new', activities: ['running']}
  );
  const names = session.blocks.filter(b => b.phase === 'move').map(b => b.name);
  assert.ok(names.some(name => /walk/i.test(name)), 'a new runner should be given walking blocks');
  assert.ok(!names.some(name => /interval|tempo/i.test(name)), 'no hard intervals for a beginner');
});

// ——— Rationale ————————————————————————————————————————————————————————————

test('every session explains itself in the terms the person reported', () => {
  everyCombination(session => {
    assert.ok(session.rationale.length > 20, 'a session must explain why it was chosen');
    assert.ok(session.focus.length > 0);
    assert.ok(session.title.length > 0);
  });
});

test('the pain explanation never diagnoses or promises', () => {
  const session = plan({pain: true});
  assert.ok(/no exercise is prescribed/i.test(session.rationale));
  assert.ok(!/injury will|you have|diagnos|cure|heal/i.test(session.rationale));
});
