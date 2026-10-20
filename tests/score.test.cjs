'use strict';
// The Move Score.
//
// Two documented failure modes from the wearable apps drive most of these
// tests. Gentler Streak users report "after a full week of resting I'm still
// overreaching"; QALO users report "my score is higher on days I don't work
// out — after a half marathon my vitality score was lower than the following
// rest day". A score that punishes training, or that cannot recover from rest,
// is worse than no score at all.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {
  BAND_LABEL,
  GOOD_SCORE,
  WEIGHTS,
  bandFor,
  consistencyScore,
  daysMovedThisWeek,
  followThroughScore,
  freshnessScore,
  moveScore
} = require('../.test-build/engine/score.js');
const {addDays} = require('../.test-build/lib/date.js');
const {makeProfile, makeCheckIn, logOnDay} = require('./helpers.cjs');

const NOW = new Date(2026, 9, 20, 10, 0);

function day(back, exerciseIds = ['air-squat', 'push-up', 'plank'], extra = {}) {
  return logOnDay(addDays(NOW, -back), {
    qualifies: true,
    exerciseIds,
    plannedMinutes: 20,
    ...extra
  });
}

// ——— Shape ————————————————————————————————————————————————————————————————

test('the weights are stated and sum to one', () => {
  const total = WEIGHTS.consistency + WEIGHTS.freshness + WEIGHTS.followThrough;
  assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}`);
});

test('the score is always a whole number between 0 and 100', () => {
  const cases = [[], [day(0)], [day(0), day(1), day(2), day(3), day(4), day(5), day(6)]];
  for (const history of cases) {
    for (const checkIn of [null, makeCheckIn(), makeCheckIn({energy: 'low', soreness: 'sore'})]) {
      const score = moveScore({history, profile: makeProfile(), checkIn, now: NOW});
      assert.ok(Number.isInteger(score.value), `${score.value} is not a whole number`);
      assert.ok(score.value >= 0 && score.value <= 100, `${score.value} out of range`);
      for (const category of score.categories) {
        assert.ok(Number.isInteger(category.value) && category.value >= 0 && category.value <= 100);
      }
    }
  }
});

test('bands line up with the number', () => {
  assert.equal(bandFor(95), 'strong');
  assert.equal(bandFor(GOOD_SCORE), 'strong');
  assert.equal(bandFor(GOOD_SCORE - 1), 'good');
  assert.equal(bandFor(45), 'fair');
  assert.equal(bandFor(10), 'low');
  for (const band of Object.keys(BAND_LABEL)) assert.ok(BAND_LABEL[band].length > 2);
});

// ——— Consistency ——————————————————————————————————————————————————————————

test('meeting your week is 100, and exceeding it is still 100', () => {
  const profile = makeProfile({weeklyTarget: 4});
  const four = [day(0), day(1), day(2), day(3)];
  const seven = [day(0), day(1), day(2), day(3), day(4), day(5), day(6)];

  assert.equal(consistencyScore(four, profile, NOW), 100);
  assert.equal(
    consistencyScore(seven, profile, NOW),
    100,
    'training seven days on a four-day target must not score above meeting it'
  );
});

test('days are counted once per calendar day', () => {
  const twice = [day(1), logOnDay(addDays(NOW, -1), {qualifies: true, exerciseIds: ['plank'], plannedMinutes: 10})];
  assert.equal(daysMovedThisWeek(twice, NOW), 1);
});

test('a session that was abandoned does not count as a day', () => {
  const partial = [day(1, ['air-squat'], {qualifies: false, blocksCompleted: 2})];
  assert.equal(daysMovedThisWeek(partial, NOW), 0);
});

// ——— Freshness ————————————————————————————————————————————————————————————

test('resting when rest is due lifts the score rather than lowering it', () => {
  // Six straight days, and feeling it: readiness says rest.
  const hard = [1, 2, 3, 4, 5, 6].map(back => day(back));
  const tired = makeCheckIn({energy: 'low', soreness: 'sore'});
  const whileTired = freshnessScore(hard, tired, NOW);

  // A week later, having rested since: freshness is back.
  const rested = freshnessScore(hard, makeCheckIn(), addDays(NOW, 7));
  assert.ok(
    rested > whileTired,
    `rest did not restore freshness (${whileTired} while tired, ${rested} after a week off)`
  );
  assert.ok(rested >= 90, `a week of rest should read as fresh, got ${rested}`);
});

test('a hard session never costs you the next morning', () => {
  const profile = makeProfile({weeklyTarget: 4});
  const before = moveScore({history: [day(2), day(4)], profile, checkIn: makeCheckIn(), now: NOW});
  const after = moveScore({
    history: [day(1, ['air-squat', 'push-up', 'plank'], {plannedMinutes: 40}), day(2), day(4)],
    profile,
    checkIn: makeCheckIn(),
    now: NOW
  });

  assert.ok(
    after.value >= before.value,
    `training dropped the score from ${before.value} to ${after.value}`
  );
});

// ——— Follow-through ——————————————————————————————————————————————————————————————

test('nothing finished yet scores zero, not full marks', () => {
  // Scoring an empty page at 100 made doing nothing outrank training once.
  assert.equal(followThroughScore([], NOW), 0);
});

test('finishing what you start is what follow-through measures', () => {
  const whole = [day(1), day(3)];
  assert.equal(followThroughScore(whole, NOW), 100);

  const halfDone = [
    logOnDay(addDays(NOW, -1), {
      qualifies: false,
      exerciseIds: ['air-squat'],
      plannedMinutes: 20,
      blocksCompleted: 6,
      blocksTotal: 12
    })
  ];
  assert.equal(followThroughScore(halfDone, NOW), 50);
});

test('old sessions drop out of the follow-through window', () => {
  const {FOLLOW_THROUGH_DAYS} = require('../.test-build/engine/score.js');
  assert.equal(followThroughScore([day(FOLLOW_THROUGH_DAYS + 3)], NOW), 0);
});

test('completing a session never lowers the score, up to your weekly target', () => {
  const sessions = [
    ['air-squat', 'push-up', 'plank'],
    ['air-squat', 'reverse-lunge', 'split-squat'],
    ['band-row', 'plank'],
    ['jog-easy']
  ];

  for (const target of [3, 4, 5, 6, 7]) {
    const profile = makeProfile({weeklyTarget: target});

    // Every history that leaves room in the week.
    for (let moved = 0; moved < target; moved++) {
      const history = Array.from({length: moved}, (_, i) => day(i + 1));

      for (const ids of sessions) {
        const without = moveScore({history, profile, checkIn: makeCheckIn(), now: NOW}).value;
        const withToday = moveScore({
          history: [day(0, ids), ...history],
          profile,
          checkIn: makeCheckIn(),
          now: NOW
        }).value;

        assert.ok(
          withToday >= without,
          `target ${target}, ${moved} days in: a session dropped the score ${without} -> ${withToday} (${ids.join('+')})`
        );
      }
    }
  }
});

// ——— What it says —————————————————————————————————————————————————————————

test('the score never claims something it stopped measuring', () => {
  // "Spread across the body" survived in the copy after balance stopped being
  // scored. A number that describes itself wrongly is worse than no number.
  const score = moveScore({
    history: [0, 1, 2, 3].map(back => day(back)),
    profile: makeProfile({weeklyTarget: 4}),
    checkIn: makeCheckIn(),
    now: NOW
  });
  assert.doesNotMatch(score.summary, /spread across the body/i);
});

test('the week is never reported as more days than the target', () => {
  const over = [0, 1, 2, 3, 4].map(back => day(back));
  const score = moveScore({
    history: over,
    profile: makeProfile({weeklyTarget: 4}),
    checkIn: makeCheckIn(),
    now: NOW
  });
  const consistency = score.categories.find(entry => entry.id === 'consistency');
  assert.doesNotMatch(consistency.detail, /5 of 4/);
  assert.match(consistency.detail, /Met your 4-day week/);
});

test('the score always says what is lifting it and what is pulling it down', () => {
  const histories = [[], [day(1)], [0, 1, 2, 3].map(back => day(back))];
  for (const history of histories) {
    const score = moveScore({history, profile: makeProfile(), checkIn: makeCheckIn(), now: NOW});
    assert.ok(score.factors.length >= 3, 'every category should contribute a line');
    for (const factor of score.factors) {
      assert.equal(typeof factor.lifting, 'boolean');
      assert.ok(factor.text.length > 10, factor.text);
    }
    assert.ok(score.summary.length > 20);
  }
});

test('a rest day is explained as the right call, not as a failure', () => {
  const hard = [1, 2, 3, 4, 5, 6].map(back => day(back));
  const score = moveScore({
    history: hard,
    profile: makeProfile(),
    checkIn: makeCheckIn({energy: 'low', soreness: 'sore'}),
    now: NOW
  });
  assert.match(score.summary, /quiet day/i);
  assert.doesNotMatch(score.summary, /\b(failed|behind|missed|lazy|should have)\b/i);
});

test('nothing in the score copy shames the person', () => {
  const banned = /\b(failed|lazy|excuse|behind|deficit|should have|guilt|bad day)\b/i;
  const histories = [[], [day(3)], [0, 1, 2, 3, 4, 5, 6].map(back => day(back))];
  for (const history of histories) {
    for (const checkIn of [makeCheckIn(), makeCheckIn({energy: 'low', soreness: 'sore', pain: true})]) {
      const score = moveScore({history, profile: makeProfile(), checkIn, now: NOW});
      assert.doesNotMatch(score.summary, banned, score.summary);
      for (const factor of score.factors) assert.doesNotMatch(factor.text, banned, factor.text);
      for (const category of score.categories) assert.doesNotMatch(category.detail, banned);
    }
  }
});

test('the score never claims to measure health, sleep or recovery it cannot see', () => {
  const score = moveScore({
    history: [day(1)],
    profile: makeProfile(),
    checkIn: makeCheckIn(),
    now: NOW
  });
  const text = [score.summary, ...score.factors.map(f => f.text), ...score.categories.map(c => c.detail)].join(' ');
  assert.doesNotMatch(text, /\b(sleep|HRV|heart rate|blood oxygen|SpO2|quality of life|health score)\b/i);
});

test('the same inputs always give the same number', () => {
  const history = [day(1), day(3), day(5)];
  const once = moveScore({history, profile: makeProfile(), checkIn: makeCheckIn(), now: NOW});
  const twice = moveScore({history, profile: makeProfile(), checkIn: makeCheckIn(), now: NOW});
  assert.deepEqual(once, twice);
});

// ——— Trend —————————————————————————————————————————————————————————————————

test('the trend ends on today and matches the headline number', () => {
  const {scoreTrend} = require('../.test-build/engine/score.js');
  const history = [day(1), day(3), day(5)];
  const profile = makeProfile();
  const checkIn = makeCheckIn();

  const trend = scoreTrend({history, profile, checkIn, days: 14, now: NOW});
  assert.equal(trend.length, 14);
  assert.equal(trend[13].isToday, true);
  assert.equal(trend.filter(point => point.isToday).length, 1);
  assert.equal(trend[13].value, moveScore({history, profile, checkIn, now: NOW}).value);
});

test('the trend only knows what had been logged by each day', () => {
  const {scoreTrend} = require('../.test-build/engine/score.js');
  // One session, three days ago. The days before it cannot know about it.
  const trend = scoreTrend({
    history: [day(3)],
    profile: makeProfile({weeklyTarget: 4}),
    checkIn: null,
    days: 10,
    now: NOW
  });

  // Before the session there was nothing logged at all, so those days score
  // lower than the days after it.
  const beforeIt = trend.slice(0, 6);
  for (const point of beforeIt) {
    assert.ok(
      point.value < trend[trend.length - 1].value,
      `${point.key} scored ${point.value}, as high as a day that had training behind it`
    );
  }
});

test('the trend is deterministic and bounded', () => {
  const {scoreTrend} = require('../.test-build/engine/score.js');
  const history = [day(0), day(2), day(4), day(6), day(9)];
  const args = {history, profile: makeProfile(), checkIn: makeCheckIn(), days: 14, now: NOW};
  assert.deepEqual(scoreTrend(args), scoreTrend(args));
  for (const point of scoreTrend(args)) {
    assert.ok(point.value >= 0 && point.value <= 100);
    assert.equal(point.label.length, 1);
  }
});
