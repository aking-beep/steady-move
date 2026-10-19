'use strict';
// Run via `npm test`, which compiles the pure TypeScript modules into
// .test-build/ first (see package.json).
const assert = require('node:assert/strict');
const {test} = require('node:test');

const {makePlan, formatSeconds} = require('../.test-build/lib/planner.js');
const {ALL_EXERCISES, MAIN, MINDFUL} = require('../.test-build/data/exercises.js');
const {defaultCheckIn, defaultProfile} = require('../.test-build/types.js');

const ENERGY = ['low', 'okay', 'high'];
const MOOD = ['calm', 'neutral', 'stressed'];
const SORENESS = ['none', 'mild', 'high'];
const MINUTES = [10, 20, 40];
const FOCUS = ['balanced', 'calisthenics', 'running', 'mobility', 'mindful'];
const LEVELS = ['beginner', 'intermediate'];
const EQUIPMENT = ['none', 'mat', 'dumbbells'];

const baseTitle = step => step.title.replace(/ · round \d+$/, '');

function everyCombination(visit) {
  for (const energy of ENERGY) {
    for (const soreness of SORENESS) {
      for (const pain of [false, true]) {
        for (const minutes of MINUTES) {
          for (const focus of FOCUS) {
            for (const level of LEVELS) {
              for (const equipment of EQUIPMENT) {
                const checkIn = {...defaultCheckIn, energy, soreness, pain, minutes, focus};
                const profile = {...defaultProfile, level, equipment};
                visit(makePlan(checkIn, profile), checkIn, profile);
              }
            }
          }
        }
      }
    }
  }
}

test('every plan lasts exactly the chosen time budget', () => {
  everyCombination((plan, checkIn) => {
    const total = plan.steps.reduce((sum, step) => sum + step.seconds, 0);
    assert.equal(total, checkIn.minutes * 60, `${plan.title} @ ${checkIn.minutes}min`);
    assert.equal(plan.minutes, checkIn.minutes);
  });
});

test('every step has a positive duration, instruction and cues', () => {
  everyCombination(plan => {
    assert.ok(plan.steps.length >= 3, plan.title);
    for (const step of plan.steps) {
      assert.ok(step.seconds >= 5, `${plan.title}: ${step.title} = ${step.seconds}s`);
      assert.ok(step.title.length > 0);
      assert.ok(step.instruction.length > 0);
      assert.ok(Array.isArray(step.cues) && step.cues.length > 0);
    }
  });
});

test('reported pain gives mindfulness only, with no exercise instructions', () => {
  const mindfulTitles = new Set(MINDFUL.map(exercise => exercise.title));
  everyCombination((plan, checkIn) => {
    if (!checkIn.pain) return;
    assert.equal(plan.intent, 'mindful');
    assert.equal(plan.adjustedForRecovery, true);
    for (const step of plan.steps) {
      assert.equal(step.phase, 'mindful');
      assert.ok(mindfulTitles.has(baseTitle(step)), `unexpected step: ${step.title}`);
    }
    assert.match(plan.description, /pain or an injury/);
    assert.match(plan.description, /health professional/);
  });
});

test('pain overrides the chosen modality', () => {
  for (const focus of FOCUS) {
    const plan = makePlan({...defaultCheckIn, focus, pain: true}, defaultProfile);
    assert.equal(plan.intent, 'mindful');
  }
});

test('low energy or high soreness becomes a gentle mobility session', () => {
  everyCombination((plan, checkIn) => {
    if (checkIn.pain || checkIn.focus === 'mindful') return;
    const needsRecovery = checkIn.energy === 'low' || checkIn.soreness === 'high';
    assert.equal(plan.adjustedForRecovery, needsRecovery);
    if (!needsRecovery) return;
    assert.equal(plan.intent, 'mobility');
    assert.match(plan.description, /stop if anything feels painful/i);
    for (const step of plan.steps.filter(s => s.phase === 'main')) {
      assert.ok(
        step.cues.some(cue => /stop if anything feels painful/i.test(cue)),
        `missing stop-if-pain cue on ${step.title}`
      );
    }
  });
});

test('beginners only ever see beginner-appropriate movements', () => {
  const advancedOnly = new Set(
    ALL_EXERCISES.filter(exercise => !exercise.levels.includes('beginner')).map(e => e.title)
  );
  assert.ok(advancedOnly.size > 0, 'fixture sanity: library has intermediate-only movements');
  everyCombination((plan, _checkIn, profile) => {
    if (profile.level !== 'beginner') return;
    for (const step of plan.steps) {
      assert.ok(!advancedOnly.has(baseTitle(step)), `beginner got ${step.title}`);
    }
  });
});

test('dumbbell movements never appear without dumbbells', () => {
  const dumbbellTitles = new Set(
    ALL_EXERCISES.filter(exercise => exercise.requires === 'dumbbells').map(e => e.title)
  );
  const matTitles = new Set(
    ALL_EXERCISES.filter(exercise => exercise.requires === 'mat').map(e => e.title)
  );
  everyCombination((plan, _checkIn, profile) => {
    for (const step of plan.steps) {
      const title = baseTitle(step);
      if (profile.equipment !== 'dumbbells') {
        assert.ok(!dumbbellTitles.has(title), `${profile.equipment} got ${title}`);
      }
      if (profile.equipment === 'none') {
        assert.ok(!matTitles.has(title), `no-equipment profile got ${title}`);
      }
    }
  });
});

test('movement plans have a warmup and a cooldown; mindful plans need neither', () => {
  everyCombination(plan => {
    const phases = plan.steps.map(step => step.phase);
    if (plan.intent === 'mindful') {
      assert.ok(!phases.includes('warmup'));
      assert.ok(!phases.includes('cooldown'));
      return;
    }
    assert.equal(phases[0], 'warmup');
    assert.equal(phases[phases.length - 1], 'cooldown');
    assert.ok(phases.includes('main'));
  });
});

test('run + walk guidance stays time based', () => {
  const plan = makePlan({...defaultCheckIn, focus: 'running', minutes: 20}, defaultProfile);
  assert.equal(plan.intent, 'running');
  assert.match(plan.description, /No distance, pace or GPS tracking/);
  const text = plan.steps.map(step => `${step.instruction} ${step.cues.join(' ')}`).join(' ');
  assert.doesNotMatch(text, /\bGPS\b|\bkm\b|\bmiles?\b|pace per/i);
});

test('planning is deterministic for identical inputs', () => {
  everyCombination((plan, checkIn, profile) => {
    assert.deepEqual(makePlan(checkIn, profile), plan);
  });
});

test('mood never changes the plan', () => {
  for (const minutes of MINUTES) {
    const plans = MOOD.map(mood =>
      makePlan({...defaultCheckIn, mood, minutes}, defaultProfile)
    );
    assert.deepEqual(plans[1], plans[0]);
    assert.deepEqual(plans[2], plans[0]);
  }
});

test('library titles are unique so tests and history stay readable', () => {
  const titles = ALL_EXERCISES.map(exercise => exercise.title);
  assert.equal(new Set(titles).size, titles.length);
  assert.ok(MAIN.length > 0);
});

test('formatSeconds renders a mm:ss timer', () => {
  assert.equal(formatSeconds(0), '0:00');
  assert.equal(formatSeconds(9), '0:09');
  assert.equal(formatSeconds(60), '1:00');
  assert.equal(formatSeconds(125), '2:05');
  assert.equal(formatSeconds(-5), '0:00');
});
