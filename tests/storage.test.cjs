'use strict';
// Storage validation and corruption handling.
//
// AsyncStorage is stubbed in the module cache before the storage module loads,
// so these run in plain Node while exercising the real parsing code the app
// uses on every launch.

const assert = require('node:assert/strict');
const {test} = require('node:test');
const path = require('node:path');

// ——— In-memory AsyncStorage stub ——————————————————————————————————————————

const memory = new Map();
let failNextWrite = false;

const stub = {
  async getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  async setItem(key, value) {
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('storage full');
    }
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
  async multiRemove(keys) {
    for (const key of keys) memory.delete(key);
  }
};

const stubPath = require.resolve('@react-native-async-storage/async-storage');
require.cache[stubPath] = {
  id: stubPath,
  filename: stubPath,
  loaded: true,
  exports: {__esModule: true, default: stub}
};

const storage = require(path.join(__dirname, '..', '.test-build', 'lib', 'storage.js'));
const {
  KEYS,
  STORAGE_VERSION,
  clearAll,
  parseCheckIn,
  parseHistory,
  parseLog,
  parseProfile,
  parseSession,
  parseSettings,
  readKey,
  writeKey
} = storage;

function reset() {
  memory.clear();
  failNextWrite = false;
}

// ——— Round trip ———————————————————————————————————————————————————————————

test('what is written comes back unchanged', async () => {
  reset();
  const profile = {
    goals: ['consistency', 'strength'],
    level: 'occasional',
    activities: ['calisthenics'],
    equipment: ['bodyweight', 'dumbbells'],
    timePreference: 20,
    weeklyTarget: 4,
    createdAt: '2026-10-01T09:00:00.000Z'
  };

  await writeKey(KEYS.profile, profile);
  const read = await readKey(KEYS.profile, parseProfile, null);
  assert.deepEqual(read, profile);
});

test('stored values carry a schema version', async () => {
  reset();
  await writeKey(KEYS.settings, {haptics: false, reduceMotion: true, developerMode: false});
  const raw = JSON.parse(memory.get(KEYS.settings));
  assert.equal(raw.version, STORAGE_VERSION);
  assert.ok('data' in raw, 'the payload is wrapped in an envelope');
});

// ——— Corruption ———————————————————————————————————————————————————————————

test('unreadable JSON degrades to the fallback instead of throwing', async () => {
  reset();
  memory.set(KEYS.profile, '{ this is not json');
  const read = await readKey(KEYS.profile, parseProfile, null);
  assert.equal(read, null);
});

test('a truncated payload degrades to the fallback', async () => {
  reset();
  memory.set(KEYS.history, '{"version":1,"data":[{"id":"a"');
  assert.deepEqual(await readKey(KEYS.history, parseHistory, []), []);
});

test('a payload from a newer version is ignored rather than guessed at', async () => {
  reset();
  memory.set(KEYS.profile, JSON.stringify({version: STORAGE_VERSION + 5, data: {level: 'regular'}}));
  assert.equal(await readKey(KEYS.profile, parseProfile, null), null);
});

test('a missing key returns the fallback', async () => {
  reset();
  assert.equal(await readKey(KEYS.profile, parseProfile, null), null);
  assert.deepEqual(await readKey(KEYS.history, parseHistory, []), []);
});

test('a failed write never throws into the app', async () => {
  reset();
  failNextWrite = true;
  await writeKey(KEYS.settings, {haptics: true, reduceMotion: false, developerMode: false});
  // The write was lost, but the app carried on, which is the point.
  assert.equal(memory.has(KEYS.settings), false);
});

// ——— Field level validation ———————————————————————————————————————————————

test('a profile with unknown values falls back field by field', () => {
  const parsed = parseProfile({
    goals: ['consistency', 'not-a-goal'],
    level: 'elite',
    activities: [],
    equipment: ['jetpack'],
    timePreference: 37,
    weeklyTarget: 99,
    createdAt: '2026-10-01T09:00:00.000Z'
  });

  assert.deepEqual(parsed.goals, ['consistency'], 'unknown goals are dropped');
  assert.equal(parsed.level, 'new', 'an unknown level falls back to the safest option');
  assert.ok(parsed.activities.length > 0, 'an empty list falls back to a usable default');
  assert.deepEqual(parsed.equipment, ['bodyweight'], 'unknown equipment falls back');
  assert.equal(parsed.timePreference, 'flexible', 'an odd duration falls back');
  assert.equal(parsed.weeklyTarget, 7, 'the weekly target is clamped into range');
});

test('a profile with no creation stamp was never really completed', () => {
  assert.equal(parseProfile({level: 'new', createdAt: ''}), null);
  assert.equal(parseProfile({level: 'new'}), null);
  assert.equal(parseProfile(null), null);
  assert.equal(parseProfile('nonsense'), null);
});

test('settings always resolve to real booleans', () => {
  const parsed = parseSettings({haptics: 'yes', reduceMotion: null});
  assert.equal(typeof parsed.haptics, 'boolean');
  assert.equal(typeof parsed.reduceMotion, 'boolean');
  assert.equal(typeof parsed.developerMode, 'boolean');
  assert.deepEqual(parseSettings(undefined), parseSettings({}));
});

test('a check-in without a valid date is discarded', () => {
  assert.equal(parseCheckIn({date: 'yesterday'}), null);
  assert.equal(parseCheckIn({}), null);

  const parsed = parseCheckIn({date: '2026-10-19', energy: 'turbo', minutes: 15});
  assert.equal(parsed.energy, 'okay', 'an unknown energy falls back');
  assert.equal(parsed.minutes, 20, 'an unsupported duration falls back');
  assert.equal(parsed.pain, false, 'pain defaults to false only when absent');
});

test('a log without an id or a usable timestamp is dropped', () => {
  assert.equal(parseLog({completedAt: '2026-10-19T10:00:00.000Z', title: 'x'}), null);
  assert.equal(parseLog({id: 'a', completedAt: 'not a date', title: 'x'}), null);
  assert.equal(parseLog({id: 'a', completedAt: '2026-10-19T10:00:00.000Z'}), null);
});

test('a log missing its day key has one derived from its timestamp', () => {
  const parsed = parseLog({
    id: 'a',
    completedAt: new Date(2026, 9, 19, 18, 0).toISOString(),
    title: 'Mobility Flow'
  });
  assert.equal(parsed.dateKey, '2026-10-19');
  assert.equal(parsed.qualifies, false, 'an unstated result never counts by default');
});

test('a mixed history keeps the good rows and drops the bad ones', () => {
  const parsed = parseHistory([
    {id: 'a', completedAt: '2026-10-19T10:00:00.000Z', title: 'Good', qualifies: true},
    null,
    'nonsense',
    {id: 'b', completedAt: 'broken', title: 'Bad'},
    {id: 'c', completedAt: '2026-10-18T10:00:00.000Z', title: 'Also good'}
  ]);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed.map(log => log.id), ['a', 'c']);
});

test('history that is not an array degrades to empty', () => {
  assert.deepEqual(parseHistory({}), []);
  assert.deepEqual(parseHistory(null), []);
});

test('a stored session without usable blocks is discarded', () => {
  assert.equal(parseSession({id: 'a', blocks: []}), null);
  assert.equal(parseSession({id: 'a', blocks: [{}], checkIn: {date: '2026-10-19'}}), null);
  assert.equal(parseSession(null), null);

  const valid = parseSession({
    id: 'a',
    blocks: [{id: 'b1', name: 'Plank', seconds: 30}],
    checkIn: {date: '2026-10-19'}
  });
  assert.ok(valid);
  assert.equal(valid.blocks.length, 1);
});

// ——— Deletion —————————————————————————————————————————————————————————————

test('deleting local data removes every key the app owns', async () => {
  reset();
  await writeKey(KEYS.profile, {createdAt: '2026-10-01T09:00:00.000Z', level: 'new'});
  await writeKey(KEYS.history, []);
  await writeKey(KEYS.checkIn, {date: '2026-10-19'});
  assert.ok(memory.size >= 3);

  await clearAll();
  for (const key of Object.values(KEYS)) {
    assert.equal(memory.has(key), false, `${key} survived deletion`);
  }
});
