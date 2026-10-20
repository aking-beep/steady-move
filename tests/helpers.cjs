'use strict';
// Shared fixtures. `npm test` compiles the pure TypeScript modules into
// .test-build/ first (see the pretest script in package.json); nothing here
// touches React Native.

const {generateSession} = require('../.test-build/engine/planner.js');

const ENERGY = ['low', 'okay', 'high'];
const MOOD = ['low', 'neutral', 'good'];
const SORENESS = ['none', 'mild', 'sore'];
const MINUTES = [10, 20, 40];
const LOCATIONS = ['home', 'gym', 'outside', 'anywhere'];
const LEVELS = ['new', 'occasional', 'regular'];
const ACTIVITIES = ['calisthenics', 'strength', 'running', 'walking', 'mobility', 'stretching', 'mindfulness'];

const EQUIPMENT_SETS = [
  ['bodyweight'],
  ['bodyweight', 'dumbbells'],
  ['bodyweight', 'bands'],
  ['bodyweight', 'kettlebells', 'pullup-bar'],
  ['full-gym'],
  ['bodyweight', 'outdoors']
];

const ACTIVITY_SETS = [
  ['calisthenics'],
  ['strength'],
  ['running'],
  ['walking'],
  ['mobility'],
  ['stretching'],
  ['mindfulness'],
  ['calisthenics', 'running', 'mobility', 'mindfulness'],
  ['strength', 'stretching']
];

const FIXED_NOW = new Date('2026-10-19T09:00:00');

function makeProfile(overrides = {}) {
  return {
    goals: ['consistency'],
    level: 'new',
    activities: ['calisthenics', 'mobility'],
    equipment: ['bodyweight'],
    timePreference: 20,
    weeklyTarget: 4,
    excluded: [],
    createdAt: '2026-10-01T09:00:00.000Z',
    ...overrides
  };
}

function makeCheckIn(overrides = {}) {
  return {
    date: '2026-10-19',
    energy: 'okay',
    mood: 'neutral',
    soreness: 'none',
    pain: false,
    minutes: 20,
    location: 'home',
    equipment: ['bodyweight'],
    createdAt: '2026-10-19T09:00:00.000Z',
    ...overrides
  };
}

function plan(checkIn = {}, profile = {}, options = {}) {
  return generateSession({
    profile: makeProfile(profile),
    checkIn: makeCheckIn(checkIn),
    history: options.history ?? [],
    variant: options.variant ?? 0,
    now: options.now ?? FIXED_NOW,
    ...options.extra
  });
}

/**
 * Walks a broad slice of the input space. Exhaustive over the safety-relevant
 * dimensions; representative over the rest, so the suite stays quick.
 */
function everyCombination(visit) {
  for (const energy of ENERGY) {
    for (const soreness of SORENESS) {
      for (const pain of [false, true]) {
        for (const minutes of MINUTES) {
          for (const location of LOCATIONS) {
            for (const equipment of EQUIPMENT_SETS) {
              for (const level of LEVELS) {
                for (const activities of ACTIVITY_SETS) {
                  const checkIn = makeCheckIn({energy, soreness, pain, minutes, location, equipment});
                  const profile = makeProfile({level, activities, equipment});
                  visit(plan(checkIn, profile), checkIn, profile);
                }
              }
            }
          }
        }
      }
    }
  }
}

/** Builds a saved log, as the session store would. */
function makeLog(overrides = {}) {
  const completedAt = overrides.completedAt ?? '2026-10-19T18:00:00.000Z';
  return {
    id: `log-${Math.random().toString(36).slice(2)}`,
    completedAt,
    dateKey: overrides.dateKey ?? '2026-10-19',
    sessionId: 'session-1',
    type: 'calisthenics',
    title: 'Bodyweight Strength',
    plannedMinutes: 20,
    activeSeconds: 1200,
    blocksCompleted: 10,
    blocksTotal: 10,
    qualifies: true,
    ...overrides
  };
}

/** A log on a given local day, built the way the app builds its date keys. */
function logOnDay(date, overrides = {}) {
  const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  return makeLog({
    completedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0).toISOString(),
    dateKey: key,
    ...overrides
  });
}

module.exports = {
  ENERGY,
  MOOD,
  SORENESS,
  MINUTES,
  LOCATIONS,
  LEVELS,
  ACTIVITIES,
  EQUIPMENT_SETS,
  ACTIVITY_SETS,
  FIXED_NOW,
  makeProfile,
  makeCheckIn,
  makeLog,
  logOnDay,
  plan,
  everyCombination
};
