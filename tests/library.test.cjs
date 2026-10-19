'use strict';
// The exercise library, the Explore catalogue, and the rule that decides
// whether a finished session counts.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  ALL_EXERCISES,
  BREATHING,
  BREATHING_CORE,
  MAIN_POOL,
  WARMUPS,
  expandEquipment,
  getExercise,
  selectPool
} = require('../.test-build/data/exercises.js');
const {EXPLORE_ITEMS, QUICK_MOVE_IDS, exploreItem} = require('../.test-build/data/explore.js');
const {buildExploreSession} = require('../.test-build/lib/sessions.js');
const {QUALIFYING_RATIO} = require('../.test-build/types/index.js');
const {makeProfile, makeCheckIn} = require('./helpers.cjs');

// ——— Library integrity ————————————————————————————————————————————————————

test('the library is large enough to avoid repetitive sessions', () => {
  assert.ok(ALL_EXERCISES.length >= 60, `only ${ALL_EXERCISES.length} movements in the library`);
  assert.ok(MAIN_POOL.length >= 45, 'the main pool needs enough breadth for variety');
});

test('every exercise is complete and well formed', () => {
  for (const exercise of ALL_EXERCISES) {
    assert.ok(exercise.id, 'every exercise needs an id');
    assert.ok(exercise.name, `${exercise.id} needs a name`);
    assert.ok(exercise.instructions.length > 20, `${exercise.id} needs real instructions`);
    assert.ok(exercise.cues.length >= 2, `${exercise.id} needs coaching cues`);
    assert.ok(exercise.regression, `${exercise.id} needs an easier option`);
    assert.ok(exercise.progression, `${exercise.id} needs a harder option`);
    assert.ok([1, 2, 3].includes(exercise.difficulty), `${exercise.id} has an odd difficulty`);
    assert.ok(['time', 'reps'].includes(exercise.mode));
    assert.ok(
      exercise.mode === 'time' ? Boolean(exercise.duration) : Boolean(exercise.reps),
      `${exercise.id} must specify a duration or a rep range`
    );
    assert.ok(typeof exercise.rest === 'number' && exercise.rest >= 0);
  }
});

test('exercise ids are unique', () => {
  const ids = ALL_EXERCISES.map(exercise => exercise.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate exercise ids found');
});

test('the library covers the movement patterns a balanced circuit needs', () => {
  const patterns = new Set(ALL_EXERCISES.map(exercise => exercise.movementPattern));
  for (const required of ['squat', 'hinge', 'push', 'pull', 'core', 'lunge', 'carry', 'gait']) {
    assert.ok(patterns.has(required), `no ${required} movements in the library`);
  }
});

test('pulling movements are gated behind a bar, where they belong', () => {
  const barMovements = ['dead-hang', 'scapular-pull', 'assisted-pull-up', 'negative-pull-up', 'pull-up'];
  for (const id of barMovements) {
    const exercise = getExercise(id);
    assert.ok(exercise, `${id} is missing from the library`);
    assert.ok(exercise.equipment.includes('pullup-bar'), `${id} should require a pull-up bar`);
  }
});

test('a full gym unlocks everything a specific piece of kit would', () => {
  const owned = expandEquipment(['full-gym']);
  for (const item of ['bodyweight', 'dumbbells', 'kettlebells', 'bands', 'pullup-bar']) {
    assert.ok(owned.has(item), `full gym should include ${item}`);
  }
});

test('bodyweight is always available, even when nothing was selected', () => {
  assert.ok(expandEquipment([]).has('bodyweight'));
});

test('every breathing movement is gentle and needs no equipment', () => {
  for (const exercise of BREATHING) {
    assert.ok(exercise.gentle, `${exercise.id} must be safe for a pain day`);
    assert.equal(exercise.equipment.length, 0);
    assert.equal(exercise.difficulty, 1);
  }
});

test('the mid-session breathing pool excludes the fixed opening and closing blocks', () => {
  const ids = BREATHING_CORE.map(exercise => exercise.id);
  assert.ok(!ids.includes('breath-arrive'), 'Arrive is the opening block only');
  assert.ok(!ids.includes('breath-close'), 'Close kindly is the closing block only');
  assert.ok(BREATHING_CORE.length >= 3, 'enough variety for a long breathing session');
});

test('selectPool filters by level, equipment and gentleness together', () => {
  const beginnerBodyweight = selectPool(MAIN_POOL, {level: 'new', equipment: ['bodyweight']});
  assert.ok(beginnerBodyweight.length >= 8, 'a beginner with nothing still has plenty to do');
  assert.ok(beginnerBodyweight.every(exercise => exercise.difficulty === 1));
  assert.ok(beginnerBodyweight.every(exercise => exercise.equipment.length === 0));

  const gentle = selectPool(MAIN_POOL, {level: 'regular', equipment: ['full-gym'], gentleOnly: true});
  assert.ok(gentle.length > 0);
  assert.ok(gentle.every(exercise => exercise.gentle));
});

test('warm-ups never require equipment', () => {
  for (const exercise of WARMUPS) {
    assert.equal(exercise.equipment.length, 0, `${exercise.id} should not need kit to warm up`);
  }
});

// ——— Wellness wording —————————————————————————————————————————————————————

test('no exercise makes a clinical or medical claim', () => {
  // "Fix your eyes on one point" is a gaze cue, not a medical claim, so the
  // pattern targets claims about the body rather than the word "fix" alone.
  const forbidden =
    /\b(cure|heals?|healing|treats?|diagnos|rehabilitat|prevents? injur|fix(es|ing)? your (back|knee|shoulder|hip|neck|posture|pain|injury))\b/i;
  for (const exercise of ALL_EXERCISES) {
    const text = [exercise.instructions, ...exercise.cues, exercise.regression, exercise.progression]
      .filter(Boolean)
      .join(' ');
    assert.ok(!forbidden.test(text), `${exercise.id} makes a clinical claim: ${text}`);
  }
});

test('no exercise uses shaming or punishing language', () => {
  const forbidden = /\b(burn off|no excuses|earn (it|your)|guilt|cheat meal|punish|shred|beast mode)\b/i;
  for (const exercise of ALL_EXERCISES) {
    const text = [exercise.name, exercise.instructions, ...exercise.cues].join(' ');
    assert.ok(!forbidden.test(text), `${exercise.id} uses punishing language`);
  }
});

// ——— Explore ——————————————————————————————————————————————————————————————

test('every Explore entry builds a real, valid session', () => {
  const profile = makeProfile({level: 'occasional', activities: ['calisthenics', 'mobility']});

  for (const item of EXPLORE_ITEMS) {
    if (item.breathingMinutes) continue; // These run in the breathing player.

    const session = buildExploreSession({item, profile, history: [], checkIn: null});

    assert.equal(
      session.totalSeconds,
      item.minutes * 60,
      `${item.id} did not fill its ${item.minutes} minute budget`
    );
    assert.ok(session.blocks.length > 0, `${item.id} built an empty session`);
    assert.equal(session.title, item.title, `${item.id} should keep its own name`);
    assert.equal(session.type, item.type, `${item.id} should build the type it promises`);
  }
});

test('an Explore session still softens when pain was reported today', () => {
  const profile = makeProfile({level: 'regular', activities: ['strength']});
  const item = exploreItem('cal-push');
  const checkIn = makeCheckIn({pain: true});

  const session = buildExploreSession({item, profile, history: [], checkIn});

  assert.equal(session.type, 'recovery', 'the check-in must outrank the chosen session');
  assert.ok(session.painFlagged);
  for (const block of session.blocks) {
    if (!block.exerciseId) continue;
    assert.ok(getExercise(block.exerciseId).gentle);
  }
});

test('an Explore session respects the equipment the entry assumes', () => {
  const profile = makeProfile({level: 'regular'});
  const item = exploreItem('cal-legs');
  const session = buildExploreSession({item, profile, history: [], checkIn: null});

  for (const block of session.blocks) {
    if (!block.exerciseId) continue;
    assert.equal(
      getExercise(block.exerciseId).equipment.length,
      0,
      'a bodyweight entry must stay bodyweight'
    );
  }
});

test('the Quick Move shortcuts all point at real entries', () => {
  for (const id of QUICK_MOVE_IDS) {
    assert.ok(exploreItem(id), `Quick Move references a missing entry: ${id}`);
  }
});

test('every Explore entry is described, not a placeholder', () => {
  for (const item of EXPLORE_ITEMS) {
    assert.ok(item.title.length > 2, `${item.id} needs a title`);
    assert.ok(item.description.length > 20, `${item.id} needs a real description`);
    assert.ok(!/coming soon|TODO|placeholder/i.test(item.description));
  }
});

// ——— Completion rule ——————————————————————————————————————————————————————

/** Mirrors the rule in useSessionStore.buildLog, which cannot be imported here. */
function qualifies(blocksCompleted, blocksTotal) {
  return blocksTotal > 0 && blocksCompleted / blocksTotal >= QUALIFYING_RATIO;
}

test('a session counts once enough of it has actually been done', () => {
  assert.equal(qualifies(10, 10), true, 'a finished session counts');
  assert.equal(qualifies(7, 10), true, 'exactly the threshold counts');
  assert.equal(qualifies(6, 10), false, 'below the threshold does not');
  assert.equal(qualifies(1, 10), false, 'opening a session is not moving');
  assert.equal(qualifies(0, 0), false, 'an empty session can never qualify');
});

test('the qualifying threshold is a clear majority of the session', () => {
  assert.ok(QUALIFYING_RATIO >= 0.5 && QUALIFYING_RATIO <= 0.9);
});
