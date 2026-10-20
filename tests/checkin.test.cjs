'use strict';
// Starting a check-in, and what is carried over.
//
// The competitive point: Fitbod, Freeletics and Nike all ask a returning user
// to restate context that has not changed, or skip the asking entirely and
// train you the same whatever kind of day you are having. The rule here is
// that context carries over and condition never does.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {seedDraft, defaultsFrom} = require('../.test-build/lib/checkin.js');
const {parseDefaults} = require('../.test-build/lib/storage.js');
const {makeProfile, makeCheckIn} = require('./helpers.cjs');

const TODAY = '2026-10-20';

test('a first check-in starts from onboarding, not from nothing', () => {
  const draft = seedDraft(TODAY, null, makeProfile({timePreference: 40, equipment: ['dumbbells']}));
  assert.equal(draft.date, TODAY);
  assert.equal(draft.minutes, 40);
  assert.deepEqual(draft.equipment, ['dumbbells']);
});

test('a returning check-in carries over place, kit, time and mood', () => {
  const last = makeCheckIn({
    mood: 'good',
    minutes: 40,
    location: 'gym',
    equipment: ['dumbbells', 'pullup-bar']
  });
  const draft = seedDraft(TODAY, defaultsFrom(last), makeProfile());

  assert.equal(draft.mood, 'good');
  assert.equal(draft.minutes, 40);
  assert.equal(draft.location, 'gym');
  assert.deepEqual(draft.equipment, ['dumbbells', 'pullup-bar']);
});

test('energy, soreness and pain are never carried over', () => {
  const last = makeCheckIn({energy: 'high', soreness: 'sore', pain: true});
  const draft = seedDraft(TODAY, defaultsFrom(last), makeProfile());

  assert.equal(draft.pain, false, 'yesterday’s pain answer must not stand in for today’s');
  assert.equal(draft.energy, 'okay');
  assert.equal(draft.soreness, 'none');
});

test('remembered answers never include a condition field at all', () => {
  const stored = defaultsFrom(makeCheckIn({energy: 'high', soreness: 'sore', pain: true}));
  assert.deepEqual(Object.keys(stored).sort(), ['equipment', 'location', 'minutes', 'mood']);
});

test('an empty kit list falls back rather than offering nothing', () => {
  const draft = seedDraft(TODAY, {mood: 'neutral', minutes: 20, location: 'home', equipment: []}, null);
  assert.deepEqual(draft.equipment, ['bodyweight']);
});

test('unreadable remembered answers degrade to the first-timer defaults', () => {
  assert.equal(parseDefaults(null), null);
  assert.equal(parseDefaults('nonsense'), null);

  const salvaged = parseDefaults({mood: 'elated', minutes: 999, location: 'moon', equipment: ['jetpack']});
  assert.equal(salvaged.mood, 'neutral');
  assert.equal(salvaged.minutes, 20);
  assert.equal(salvaged.location, 'home');
  assert.deepEqual(salvaged.equipment, ['bodyweight']);
});

test('a round trip through storage keeps what it should', () => {
  const stored = parseDefaults(defaultsFrom(makeCheckIn({location: 'outside', minutes: 10, mood: 'low'})));
  assert.equal(stored.location, 'outside');
  assert.equal(stored.minutes, 10);
  assert.equal(stored.mood, 'low');
});
