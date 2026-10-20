'use strict';
// Per-area recovery and readiness.
//
// The competitive point of this module: Gentler Streak reads readiness but
// needs a wearable and has no per-area view; Fitbod tracks recovery per muscle
// but ignores readiness and needs ten to fifteen logged sessions first. These
// tests hold the line on doing both, from data the person never has to enter.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  BUSY_WEEK_DAYS,
  LONG_RUN_DAYS,
  areasFor,
  areasForLog,
  consecutiveDaysBefore,
  daysInLastWeek,
  freshestAreas,
  isLoaded,
  loadByArea,
  readReadiness,
  areaBand,
  workedAreas
} = require('../.test-build/engine/load.js');
const {generateSession} = require('../.test-build/engine/planner.js');
const {getExercise, ALL_EXERCISES} = require('../.test-build/data/exercises.js');
const {BODY_AREAS} = require('../.test-build/types/index.js');
const {addDays} = require('../.test-build/lib/date.js');
const {makeProfile, makeCheckIn, logOnDay} = require('./helpers.cjs');

const NOW = new Date(2026, 9, 20, 10, 0);

function session(day, exerciseIds, extra = {}) {
  return logOnDay(day, {qualifies: true, exerciseIds, plannedMinutes: 20, ...extra});
}

// ——— Areas ————————————————————————————————————————————————————————————————

test('every movement maps to at least one area', () => {
  for (const exercise of ALL_EXERCISES) {
    const areas = areasFor(exercise);
    assert.ok(areas.length > 0, `${exercise.id} maps to nothing`);
    for (const area of areas) {
      assert.ok(BODY_AREAS.includes(area), `${exercise.id} produced an unknown area: ${area}`);
    }
  }
});

test('squats are legs, push-ups are pushing, pull-ups are pulling', () => {
  assert.deepEqual(areasFor(getExercise('air-squat')), ['legs']);
  assert.deepEqual(areasFor(getExercise('push-up')), ['push']);
  assert.deepEqual(areasFor(getExercise('pull-up')), ['pull']);
  assert.deepEqual(areasFor(getExercise('plank')), ['core']);
});

test('mobility and breathing restore rather than tax', () => {
  assert.deepEqual(areasFor(getExercise('cat-cow')), ['restorative']);
  assert.deepEqual(areasFor(getExercise('breath-counted')), ['restorative']);
});

test('a log reports the areas its movements touched', () => {
  const log = session(NOW, ['air-squat', 'push-up', 'cat-cow']);
  const areas = areasForLog(log);
  assert.ok(areas.includes('legs'));
  assert.ok(areas.includes('push'));
  assert.ok(areas.includes('restorative'));
  assert.ok(!areas.includes('pull'));
});

// ——— Load ————————————————————————————————————————————————————————————————

test('load decays: yesterday counts more than last week', () => {
  const recent = loadByArea([session(addDays(NOW, -1), ['air-squat'])], NOW);
  const old = loadByArea([session(addDays(NOW, -8), ['air-squat'])], NOW);
  assert.ok(recent.legs > old.legs, 'recent work should weigh more');
  assert.ok(old.legs < 0.2, 'a week later it should barely register');
});

test('restorative work never counts as load', () => {
  const load = loadByArea(
    [session(NOW, ['cat-cow', 'childs-pose']), session(addDays(NOW, -1), ['breath-counted'])],
    NOW
  );
  for (const area of BODY_AREAS) assert.equal(load[area], 0, `${area} should be untouched`);
});

test('a partial save adds no load', () => {
  const load = loadByArea([session(NOW, ['air-squat'], {qualifies: false})], NOW);
  assert.equal(load.legs, 0);
});

test('logs recorded before movements were tracked contribute nothing rather than a guess', () => {
  const legacy = logOnDay(addDays(NOW, -1), {qualifies: true});
  delete legacy.exerciseIds;
  const load = loadByArea([legacy], NOW);
  for (const area of BODY_AREAS) assert.equal(load[area], 0);
});

test('the freshest area is the one trained least recently', () => {
  const history = [
    session(addDays(NOW, -1), ['air-squat', 'reverse-lunge']),
    session(addDays(NOW, -2), ['air-squat'])
  ];
  const load = loadByArea(history, NOW);
  const fresh = freshestAreas(load);

  assert.ok(isLoaded(load, 'legs'), 'two leg sessions in two days is a loaded area');
  assert.notEqual(fresh[0], 'legs', 'legs should not be the first place to go next');
  assert.ok(fresh.includes('push') && fresh.includes('pull'));
});

// ——— Counting days ————————————————————————————————————————————————————————

test('a run of days is counted up to yesterday', () => {
  const history = [
    session(addDays(NOW, -1), ['air-squat']),
    session(addDays(NOW, -2), ['push-up']),
    session(addDays(NOW, -3), ['plank'])
  ];
  assert.equal(consecutiveDaysBefore(history, NOW), 3);
});

test('a gap ends the run', () => {
  const history = [session(addDays(NOW, -1), ['air-squat']), session(addDays(NOW, -3), ['push-up'])];
  assert.equal(consecutiveDaysBefore(history, NOW), 1);
});

test('days in the last week counts distinct days, not sessions', () => {
  const history = [
    session(addDays(NOW, -1), ['air-squat']),
    session(addDays(NOW, -1), ['push-up']),
    session(addDays(NOW, -2), ['plank'])
  ];
  assert.equal(daysInLastWeek(history, NOW), 2);
});

// ——— Readiness ————————————————————————————————————————————————————————————

test('an empty history reads as ready, not as a problem', () => {
  const readiness = readReadiness({history: [], now: NOW});
  assert.equal(readiness.state, 'ready');
  assert.equal(readiness.restAdvised, false);
  assert.ok(readiness.reason.length > 10);
});

test('a long run plus soreness suggests a rest day', () => {
  const history = [];
  for (let i = 1; i <= LONG_RUN_DAYS; i++) history.push(session(addDays(NOW, -i), ['air-squat']));

  const readiness = readReadiness({
    history,
    checkIn: makeCheckIn({soreness: 'sore'}),
    now: NOW
  });
  assert.equal(readiness.state, 'rest');
  assert.ok(readiness.restAdvised);
  assert.match(readiness.reason, /rest day/i);
});

test('a long run on its own says go easy, not stop', () => {
  const history = [];
  for (let i = 1; i <= LONG_RUN_DAYS; i++) history.push(session(addDays(NOW, -i), ['air-squat']));

  const readiness = readReadiness({history, checkIn: makeCheckIn(), now: NOW});
  assert.equal(readiness.state, 'ease');
  assert.equal(readiness.restAdvised, false, 'a good run is not a reason to stop');
});

test('a busy week plus low energy suggests rest', () => {
  const history = [];
  for (let i = 1; i <= BUSY_WEEK_DAYS; i++) history.push(session(addDays(NOW, -i), ['air-squat']));

  const readiness = readReadiness({history, checkIn: makeCheckIn({energy: 'low'}), now: NOW});
  assert.equal(readiness.state, 'rest');
  assert.ok(readiness.restAdvised);
});

test('reported pain always reads as rest', () => {
  const readiness = readReadiness({history: [], checkIn: makeCheckIn({pain: true}), now: NOW});
  assert.equal(readiness.state, 'rest');
  assert.ok(readiness.restAdvised);
});

test('readiness never shames and never scores', () => {
  const cases = [
    {history: [], checkIn: null},
    {history: [session(addDays(NOW, -1), ['air-squat'])], checkIn: makeCheckIn({soreness: 'sore'})},
    {history: [session(addDays(NOW, -9), ['air-squat'])], checkIn: makeCheckIn()}
  ];
  for (const input of cases) {
    const {reason} = readReadiness({...input, now: NOW});
    assert.ok(!/fail|lazy|behind|should have|missed|guilt/i.test(reason), `shaming: ${reason}`);
    assert.ok(!/\b\d{1,3}\s*%|score|out of 100/i.test(reason), `a score implies precision: ${reason}`);
  }
});

// ——— What it changes in the session ——————————————————————————————————————

test('the engine goes to a fresh area rather than the one just worked', () => {
  const profile = makeProfile({level: 'regular', activities: ['calisthenics']});
  const checkIn = makeCheckIn({equipment: ['bodyweight'], minutes: 20});

  // Three days of legs, nothing else.
  const history = [
    session(addDays(NOW, -1), ['air-squat', 'reverse-lunge']),
    session(addDays(NOW, -2), ['air-squat', 'split-squat']),
    session(addDays(NOW, -3), ['reverse-lunge'])
  ];

  const loaded = generateSession({profile, checkIn, history, variant: 0, now: NOW});
  const rested = generateSession({profile, checkIn, history: [], variant: 0, now: NOW});

  const legCount = s =>
    s.blocks.filter(b => {
      const ex = b.exerciseId && getExercise(b.exerciseId);
      return ex && areasFor(ex).includes('legs') && b.phase === 'move';
    }).length;

  assert.ok(
    legCount(loaded) <= legCount(rested),
    'after three leg days the session should not lead with legs again'
  );

  const first = loaded.blocks.find(b => b.phase === 'move' && b.exerciseId);
  const firstAreas = areasFor(getExercise(first.exerciseId));
  assert.ok(!firstAreas.includes('legs'), `led with ${first.exerciseId} after three leg days`);
});

test('freshness never overrides the safety rules', () => {
  const history = [session(addDays(NOW, -1), ['air-squat'])];
  const painDay = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn({pain: true}),
    history,
    variant: 0,
    now: NOW
  });
  assert.equal(painDay.type, 'recovery');
  for (const block of painDay.blocks) {
    if (!block.exerciseId) continue;
    assert.ok(getExercise(block.exerciseId).gentle);
  }
});

test('freshness never changes how long a session lasts', () => {
  const history = [
    session(addDays(NOW, -1), ['air-squat']),
    session(addDays(NOW, -2), ['air-squat'])
  ];
  for (const minutes of [10, 20, 40]) {
    const s = generateSession({
      profile: makeProfile({level: 'regular'}),
      checkIn: makeCheckIn({minutes}),
      history,
      variant: 0,
      now: NOW
    });
    assert.equal(s.totalSeconds, minutes * 60);
  }
});

// ——— Bands and the balance view ————————————————————————————————————————————

test('an area with nothing recent reads as none, not as a low score', () => {
  const load = loadByArea([], NOW);
  for (const area of BODY_AREAS) assert.equal(areaBand(load[area]), 'none');
});

test('one recent session reads as light, three days of the same area as worked', () => {
  const once = loadByArea([session(addDays(NOW, -1), ['push-up'])], NOW);
  assert.equal(areaBand(once.push), 'light');

  const thrice = loadByArea(
    [
      session(NOW, ['push-up']),
      session(addDays(NOW, -1), ['push-up']),
      session(addDays(NOW, -2), ['push-up'])
    ],
    NOW
  );
  assert.equal(areaBand(thrice.push), 'worked');
});

test('the balance view lists the worked areas heaviest first and leaves out the untouched', () => {
  const load = loadByArea(
    [
      session(NOW, ['air-squat', 'reverse-lunge']),
      session(addDays(NOW, -1), ['air-squat']),
      session(addDays(NOW, -3), ['push-up'])
    ],
    NOW
  );
  const worked = workedAreas(load);
  assert.equal(worked[0], 'legs');
  assert.ok(worked.includes('push'));
  assert.ok(!worked.includes('pull'), 'nothing pulled, so pulling should not be listed');
  assert.ok(!worked.includes('restorative'), 'restorative work is never reported as load');
});

// ——— What the session says about the week ——————————————————————————————————

test('a session after six straight days says so, and says it is optional', () => {
  const history = [1, 2, 3, 4, 5, 6].map(back =>
    session(addDays(NOW, -back), ['air-squat', 'push-up'])
  );
  const built = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn({energy: 'low'}),
    history,
    variant: 0,
    now: NOW
  });

  assert.equal(built.readiness.state, 'rest');
  assert.ok(built.readiness.restAdvised);
  assert.match(built.rationale, /6 days in a row/);
  assert.match(built.rationale, /if you want it/);
  // Still a session, not a locked door.
  assert.ok(built.blocks.some(block => block.phase === 'move'));
  assert.equal(built.totalSeconds, built.minutes * 60);
});

test('the session explains which area it is steering away from', () => {
  const history = [
    session(NOW, ['air-squat', 'reverse-lunge']),
    session(addDays(NOW, -1), ['air-squat', 'glute-bridge'])
  ];
  const built = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn(),
    history,
    variant: 0,
    now: NOW
  });
  assert.match(built.rationale, /Legs had the most of your recent work/);
});

test('a quiet week adds nothing to the explanation', () => {
  const built = generateSession({
    profile: makeProfile({level: 'regular'}),
    checkIn: makeCheckIn(),
    history: [],
    variant: 0,
    now: NOW
  });
  assert.doesNotMatch(built.rationale, /days in a row/);
  assert.doesNotMatch(built.rationale, /had the most/);
  assert.equal(built.readiness.state, 'ready');
});

test('nothing in the readiness copy shames the person or scores them', () => {
  const histories = [
    [],
    [session(addDays(NOW, -1), ['air-squat'])],
    [1, 2, 3, 4, 5, 6].map(back => session(addDays(NOW, -back), ['air-squat']))
  ];
  const banned = /\b(failed|lazy|excuse|behind|deficit|should have|out of \d+|score)\b/i;
  for (const history of histories) {
    for (const checkIn of [makeCheckIn(), makeCheckIn({energy: 'low', soreness: 'sore'})]) {
      const built = generateSession({
        profile: makeProfile({level: 'regular'}),
        checkIn,
        history,
        variant: 0,
        now: NOW
      });
      assert.doesNotMatch(built.rationale, banned, built.rationale);
      assert.doesNotMatch(built.readiness.reason, banned, built.readiness.reason);
    }
  }
});

// ——— Calibration ——————————————————————————————————————————————————————————

test('a session that leaned on one area says so, rather than spreading evenly', () => {
  const load = loadByArea(
    [session(addDays(NOW, -1), ['air-squat', 'reverse-lunge', 'split-squat', 'push-up'])],
    NOW
  );
  assert.ok(load.legs > load.push * 2, `legs ${load.legs} vs push ${load.push}`);
});

test('a realistic month leaves most areas with room, and names the heaviest', () => {
  const {buildDemoHistory} = require('../.test-build/lib/demo.js');
  const load = loadByArea(buildDemoHistory(NOW), NOW);

  const worked = BODY_AREAS.filter(area => areaBand(load[area]) === 'worked');
  assert.ok(worked.length <= 2, `an ordinary month lit up ${worked.length} areas: ${worked}`);
  assert.deepEqual(workedAreas(load)[0], 'legs');
});

test('demo history carries the movements it claims to', () => {
  const {buildDemoHistory} = require('../.test-build/lib/demo.js');
  for (const log of buildDemoHistory(NOW)) {
    assert.ok(log.exerciseIds.length > 0, `${log.id} recorded no movements`);
    for (const id of log.exerciseIds) {
      assert.ok(getExercise(id), `${log.id} references an unknown movement: ${id}`);
    }
  }
});
