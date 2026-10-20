'use strict';
// Coming back after a break, and feedback that actually changes something.
//
// These two are where the category is weakest: apps either ignore a gap or
// treat it as a failure, and nearly all of them ask how a session felt and
// then do nothing with the answer.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  EASING_AFTER_DAYS,
  RETURNING_AFTER_DAYS,
  daysSinceLastSession,
  effortBiasFor,
  isReturning,
  layoffFor,
  readAdaptation
} = require('../.test-build/engine/adaptation.js');
const {generateSession} = require('../.test-build/engine/planner.js');
const {alternativesFor, swapBlock, usedExerciseIds} = require('../.test-build/engine/swap.js');
const {getExercise, ALL_EXERCISES, MAX_DIFFICULTY, expandEquipment} = require('../.test-build/data/exercises.js');
const {SPACE_ORDER} = require('../.test-build/types/index.js');
const {makeProfile, makeCheckIn, makeLog, logOnDay} = require('./helpers.cjs');
const {addDays} = require('../.test-build/lib/date.js');

const NOW = new Date(2026, 9, 20, 10, 0);

function plan(overrides = {}) {
  return generateSession({
    profile: makeProfile(overrides.profile ?? {}),
    checkIn: makeCheckIn(overrides.checkIn ?? {}),
    history: overrides.history ?? [],
    variant: 0,
    now: overrides.now ?? NOW,
    adaptation: overrides.adaptation
  });
}

// ——— Days away ————————————————————————————————————————————————————————————

test('days since the last session ignores sessions that did not count', () => {
  const history = [
    logOnDay(addDays(NOW, -2), {qualifies: false}),
    logOnDay(addDays(NOW, -9), {qualifies: true})
  ];
  assert.equal(daysSinceLastSession(history, NOW), 9);
});

test('someone who has never trained is starting, not returning', () => {
  assert.equal(daysSinceLastSession([], NOW), null);
  assert.equal(layoffFor(null), 'none');

  const adaptation = readAdaptation({history: [], profile: makeProfile(), now: NOW});
  assert.equal(adaptation.layoff, 'none');
  assert.equal(adaptation.note, undefined, 'a first-time user is not welcomed back');
});

test('a few days off is just a few days off', () => {
  for (const days of [0, 1, 3, EASING_AFTER_DAYS - 1]) {
    assert.equal(layoffFor(days), 'none', `${days} days should not trigger easing`);
  }
});

test('a week away eases the next session back', () => {
  assert.equal(layoffFor(EASING_AFTER_DAYS), 'easing');
  assert.equal(layoffFor(14), 'easing');
});

test('three weeks away is a return', () => {
  assert.equal(layoffFor(RETURNING_AFTER_DAYS), 'returning');
  assert.equal(layoffFor(90), 'returning');
});

// ——— What a layoff does to the session ———————————————————————————————————

test('coming back after a week lowers the intensity, whatever the day looks like', () => {
  const checkIn = {energy: 'high', soreness: 'none', mood: 'good'};
  const profile = {level: 'regular'};

  const normal = plan({checkIn, profile, history: [logOnDay(addDays(NOW, -1))]});
  const afterBreak = plan({checkIn, profile, history: [logOnDay(addDays(NOW, -10))]});

  assert.equal(normal.intensity, 'strong', 'a good day normally earns a strong session');
  assert.notEqual(afterBreak.intensity, 'strong', 'the first session back is not the hardest one');
  assert.ok(['easy', 'moderate'].includes(afterBreak.intensity));
});

test('a long layoff comes back gentler still', () => {
  const checkIn = {energy: 'high', soreness: 'none', mood: 'good'};
  const profile = {level: 'regular'};

  const easing = plan({checkIn, profile, history: [logOnDay(addDays(NOW, -10))]});
  const returning = plan({checkIn, profile, history: [logOnDay(addDays(NOW, -40))]});

  const ladder = ['gentle', 'easy', 'moderate', 'strong'];
  assert.ok(
    ladder.indexOf(returning.intensity) < ladder.indexOf(easing.intensity),
    'three weeks away should come back softer than one'
  );
});

test('the session says why it is lighter, without blaming anyone', () => {
  const session = plan({history: [logOnDay(addDays(NOW, -12))]});
  assert.match(session.rationale, /been away 12 days/i);

  const forbidden = /fail|lost|missed|slacke|should have|behind|fell off|back to square/i;
  assert.ok(!forbidden.test(session.rationale), `shaming language: ${session.rationale}`);
});

test('a return is framed as a way back in, not a reset', () => {
  const session = plan({history: [logOnDay(addDays(NOW, -45))]});
  assert.match(session.rationale, /nothing is lost|way back in/i);
  assert.ok(!/start over|restart|from scratch/i.test(session.rationale));
});

test('someone can decline the easing and get their normal session', () => {
  const history = [logOnDay(addDays(NOW, -10))];
  const profile = makeProfile({level: 'regular'});
  const checkIn = makeCheckIn({energy: 'high', soreness: 'none', mood: 'good'});

  const eased = generateSession({profile, checkIn, history, variant: 0, now: NOW});
  const full = generateSession({
    profile,
    checkIn,
    history,
    variant: 0,
    now: NOW,
    adaptation: readAdaptation({history, profile, now: NOW, ignoreLayoff: true})
  });

  assert.notEqual(eased.intensity, 'strong');
  assert.equal(full.intensity, 'strong', 'declining the easing restores the normal session');
});

// ——— Effort feedback ——————————————————————————————————————————————————————

test('one hard session is a day, not a trend', () => {
  assert.equal(effortBiasFor([makeLog({effort: 'hard'})]), 0);
});

test('two hard sessions out of three eases the next one off', () => {
  const history = [
    logOnDay(addDays(NOW, -1), {effort: 'hard'}),
    logOnDay(addDays(NOW, -3), {effort: 'hard'}),
    logOnDay(addDays(NOW, -5), {effort: 'right'})
  ];
  assert.equal(effortBiasFor(history), -1);

  const session = plan({
    checkIn: {energy: 'high', soreness: 'none', mood: 'good'},
    profile: {level: 'regular'},
    history
  });
  assert.notEqual(session.intensity, 'strong');
  assert.match(session.rationale, /felt hard/i);
});

test('two easy sessions out of three asks for a little more', () => {
  const history = [
    logOnDay(addDays(NOW, -1), {effort: 'easy'}),
    logOnDay(addDays(NOW, -2), {effort: 'easy'}),
    logOnDay(addDays(NOW, -4), {effort: 'right'})
  ];
  assert.equal(effortBiasFor(history), 1);

  const session = plan({checkIn: {energy: 'okay', soreness: 'none'}, history});
  assert.match(session.rationale, /felt easy/i);
});

test('unrated sessions leave the dial alone', () => {
  const history = [logOnDay(addDays(NOW, -1)), logOnDay(addDays(NOW, -2))];
  assert.equal(effortBiasFor(history), 0);
});

test('a layoff and the effort signal never argue', () => {
  const history = [
    logOnDay(addDays(NOW, -10), {effort: 'easy'}),
    logOnDay(addDays(NOW, -12), {effort: 'easy'})
  ];
  const adaptation = readAdaptation({history, profile: makeProfile(), now: NOW});
  assert.equal(adaptation.layoff, 'easing');
  assert.equal(adaptation.effortBias, 0, 'coming back decides the pitch on its own');
  assert.ok(isReturning(adaptation));
});

test('feedback never overrides the safety rules', () => {
  const history = [
    logOnDay(addDays(NOW, -1), {effort: 'easy'}),
    logOnDay(addDays(NOW, -2), {effort: 'easy'})
  ];
  const painDay = plan({checkIn: {pain: true}, profile: {level: 'regular'}, history});
  assert.equal(painDay.type, 'recovery');
  assert.equal(painDay.intensity, 'gentle');

  const soreDay = plan({checkIn: {energy: 'low', soreness: 'sore'}, history});
  assert.equal(soreDay.intensity, 'gentle');
});

// ——— Swapping a movement ——————————————————————————————————————————————————

test('a swapped movement obeys every rule the original did', () => {
  for (const level of ['new', 'occasional', 'regular']) {
    const profile = makeProfile({level, activities: ['calisthenics']});
    const session = generateSession({
      profile,
      checkIn: makeCheckIn({equipment: ['bodyweight']}),
      history: [],
      variant: 0,
      now: NOW
    });

    const target = session.blocks.find(b => b.phase === 'move' && b.kind === 'exercise');
    assert.ok(target, 'expected a movement to swap');

    const {session: swapped, swappedTo} = swapBlock({session, blockId: target.id, profile});
    assert.ok(swappedTo, 'a swap should find something');

    assert.ok(
      swappedTo.difficulty <= MAX_DIFFICULTY[level],
      `${swappedTo.id} is above the ${level} ceiling`
    );
    const owned = expandEquipment(['bodyweight']);
    for (const required of swappedTo.equipment) {
      assert.ok(owned.has(required), `${swappedTo.id} needs ${required}`);
    }
    assert.equal(
      swapped.totalSeconds,
      session.totalSeconds,
      'swapping must not change how long the session takes'
    );
  }
});

test('a swap prefers the same movement pattern', () => {
  const profile = makeProfile({level: 'regular', activities: ['calisthenics']});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({equipment: ['bodyweight']}),
    history: [],
    variant: 0,
    now: NOW
  });
  const block = session.blocks.find(b => b.phase === 'move' && b.exerciseId);
  const original = getExercise(block.exerciseId);

  const options = alternativesFor({session, block, profile});
  assert.ok(options.length > 0);
  assert.equal(
    options[0].movementPattern,
    original.movementPattern,
    'the first suggestion should be the same kind of movement'
  );
  assert.ok(!options.some(o => o.id === original.id), 'the current movement is not an alternative');
});

test('a swap inside a constrained place stays inside that place', () => {
  const profile = makeProfile({level: 'regular'});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({equipment: ['bodyweight']}),
    history: [],
    variant: 0,
    now: NOW,
    constraints: {space: 'standing', discreet: true, quiet: true}
  });

  const block = session.blocks.find(b => b.phase === 'move' && b.exerciseId);
  const options = alternativesFor({session, block, profile});
  assert.ok(options.length > 0, 'even a tight place offers somewhere to go');
  for (const option of options) {
    assert.ok(SPACE_ORDER[option.space] <= SPACE_ORDER['standing'], `${option.id} needs more room`);
    assert.ok(option.discreet, `${option.id} would look odd here`);
    assert.ok(!option.impact, `${option.id} thuds`);
  }
});

test('swapping twice keeps moving rather than flipping back', () => {
  const profile = makeProfile({level: 'regular', activities: ['calisthenics']});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({equipment: ['full-gym']}),
    history: [],
    variant: 0,
    now: NOW
  });
  const block = session.blocks.find(b => b.phase === 'move' && b.exerciseId);

  const first = swapBlock({session, blockId: block.id, profile, step: 0});
  const second = swapBlock({session, blockId: block.id, profile, step: 1});
  assert.ok(first.swappedTo && second.swappedTo);
  assert.notEqual(first.swappedTo.id, second.swappedTo.id);
});

test('a swap avoids movements already in the session when it can', () => {
  const profile = makeProfile({level: 'regular', activities: ['calisthenics']});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({equipment: ['full-gym'], minutes: 40}),
    history: [],
    variant: 0,
    now: NOW
  });
  const used = usedExerciseIds(session);
  const block = session.blocks.find(b => b.phase === 'move' && b.exerciseId);
  const options = alternativesFor({session, block, profile, avoid: used});
  assert.ok(options.length > 0);
  assert.ok(!used.has(options[0].id), 'the best suggestion is something new');
});

test('swapping a block that does not exist changes nothing', () => {
  const profile = makeProfile();
  const session = generateSession({profile, checkIn: makeCheckIn(), history: [], variant: 0, now: NOW});
  const {session: same, swappedTo} = swapBlock({session, blockId: 'nope', profile});
  assert.equal(swappedTo, undefined);
  assert.deepEqual(same.blocks.map(b => b.name), session.blocks.map(b => b.name));
});

test('a rest block is not swappable', () => {
  const profile = makeProfile({level: 'regular', activities: ['strength']});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({equipment: ['full-gym'], energy: 'high'}),
    history: [],
    variant: 0,
    now: NOW
  });
  const rest = session.blocks.find(b => b.kind === 'rest');
  if (!rest) return;
  const {swappedTo} = swapBlock({session, blockId: rest.id, profile});
  assert.equal(swappedTo, undefined);
});

// ——— Movements ruled out for good ————————————————————————————————————————

test('an excluded movement is never prescribed again', () => {
  const base = generateSession({
    profile: makeProfile({level: 'regular', activities: ['calisthenics']}),
    checkIn: makeCheckIn({equipment: ['bodyweight']}),
    history: [],
    variant: 0,
    now: NOW
  });
  const victim = base.blocks.find(b => b.phase === 'move' && b.exerciseId).exerciseId;

  for (const variant of [0, 1, 2, 3]) {
    const session = generateSession({
      profile: makeProfile({level: 'regular', activities: ['calisthenics'], excluded: [victim]}),
      checkIn: makeCheckIn({equipment: ['bodyweight']}),
      history: [],
      variant,
      now: NOW
    });
    assert.ok(
      !session.blocks.some(b => b.exerciseId === victim),
      `${victim} came back at variant ${variant}`
    );
  }
});

test('an excluded movement is never offered as a swap either', () => {
  const profile = makeProfile({level: 'regular', activities: ['calisthenics']});
  const session = generateSession({
    profile,
    checkIn: makeCheckIn({equipment: ['bodyweight']}),
    history: [],
    variant: 0,
    now: NOW
  });
  const block = session.blocks.find(b => b.phase === 'move' && b.exerciseId);
  const banned = alternativesFor({session, block, profile})[0].id;

  const stricter = makeProfile({level: 'regular', activities: ['calisthenics'], excluded: [banned]});
  const options = alternativesFor({session, block, profile: stricter});
  assert.ok(!options.some(o => o.id === banned));
});

test('excluding a great many movements still produces a session', () => {
  // Someone could rule out most of the library. They must still get something.
  const excluded = ALL_EXERCISES.filter(e => e.category !== 'breathing').map(e => e.id);
  const session = generateSession({
    profile: makeProfile({level: 'regular', excluded}),
    checkIn: makeCheckIn(),
    history: [],
    variant: 0,
    now: NOW
  });
  assert.ok(session.blocks.length > 0);
  assert.equal(session.totalSeconds, session.minutes * 60);
});
