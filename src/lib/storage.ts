// On-device persistence.
//
// No account, no sync, no analytics: everything lives in AsyncStorage on this
// device. Reads are validated field by field, so a corrupt, truncated or older
// payload degrades to a safe default instead of crashing the app. A readable
// app matters more than a recoverable record.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Activity,
  CheckIn,
  CheckInDefaults,
  EquipmentId,
  Goal,
  Level,
  LocationId,
  Niggle,
  Profile,
  Session,
  Settings,
  TimePreference,
  WorkoutLog,
  defaultProfile,
  defaultSettings
} from '../types';
import {localDateKey} from './date';
import {BODY_PARTS} from '../types';

/** Bump when a stored shape changes incompatibly, and add a migration below. */
export const STORAGE_VERSION = 1;

export const KEYS = {
  profile: 'steady-move:v1:profile',
  settings: 'steady-move:v1:settings',
  checkIn: 'steady-move:v1:check-in',
  defaults: 'steady-move:v1:defaults',
  session: 'steady-move:v1:session',
  history: 'steady-move:v1:history'
} as const;

export const ALL_KEYS = Object.values(KEYS);

interface Envelope<T> {
  version: number;
  data: T;
}

// ——— Primitive guards ———————————————————————————————————————————————————

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function stringList<T extends string>(value: unknown, allowed: readonly T[], fallback: T[]): T[] {
  if (!Array.isArray(value)) return fallback;
  const filtered = value.filter((item): item is T => typeof item === 'string' && (allowed as readonly string[]).includes(item));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : fallback;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function intInRange(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const GOALS: Goal[] = ['consistency', 'strength', 'endurance', 'move-better', 'stress', 'athletic', 'sport'];
const LEVELS: Level[] = ['new', 'occasional', 'regular'];
const ACTIVITIES: Activity[] = ['calisthenics', 'strength', 'running', 'walking', 'mobility', 'stretching', 'mindfulness'];
const EQUIPMENT: EquipmentId[] = ['bodyweight', 'dumbbells', 'kettlebells', 'bands', 'pullup-bar', 'full-gym', 'outdoors'];
const LOCATIONS: LocationId[] = ['home', 'gym', 'outside', 'anywhere'];
const ENERGY = ['low', 'okay', 'high'] as const;
const MOOD = ['low', 'neutral', 'good'] as const;
const SORENESS = ['none', 'mild', 'sore'] as const;
const SESSION_TYPES = ['strength', 'calisthenics', 'runwalk', 'mobility', 'recovery', 'balanced', 'mindful'] as const;
const FEEL = ['lower', 'same', 'better'] as const;
const EFFORT = ['easy', 'right', 'hard'] as const;

function parseMinutes(value: unknown): 10 | 20 | 40 {
  return value === 10 || value === 20 || value === 40 ? value : 20;
}

function parseTimePreference(value: unknown): TimePreference {
  if (value === 10 || value === 20 || value === 40) return value;
  return 'flexible';
}

// ——— Shape parsers ——————————————————————————————————————————————————————

export function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  // A profile with no creation stamp was never really completed.
  if (typeof value.createdAt !== 'string' || value.createdAt.length === 0) return null;
  return {
    goals: stringList(value.goals, GOALS, defaultProfile.goals),
    level: oneOf(value.level, LEVELS, defaultProfile.level),
    activities: stringList(value.activities, ACTIVITIES, defaultProfile.activities),
    equipment: stringList(value.equipment, EQUIPMENT, defaultProfile.equipment),
    timePreference: parseTimePreference(value.timePreference),
    weeklyTarget: intInRange(value.weeklyTarget, 1, 7, defaultProfile.weeklyTarget),
    // Movement ids are validated against the library when they are used, not
    // here: an id from a future version should survive a downgrade intact.
    excluded: Array.isArray(value.excluded)
      ? value.excluded.filter((id: unknown): id is string => typeof id === 'string').slice(0, 200)
      : [],
    niggles: parseNiggles(value.niggles),
    createdAt: value.createdAt
  };
}

/**
 * Flagged body parts. An unreadable entry is dropped rather than guessed at:
 * a half-parsed niggle would silently remove movements for a reason nobody
 * could explain.
 */
export function parseNiggles(value: unknown): Niggle[] {
  if (!Array.isArray(value)) return [];
  const out: Niggle[] = [];

  for (const entry of value.slice(0, 20)) {
    if (!isRecord(entry)) continue;
    const {id, part, startedAt, confirmedAt} = entry;
    if (typeof id !== 'string' || typeof part !== 'string') continue;
    if (!(BODY_PARTS as readonly string[]).includes(part)) continue;
    if (typeof startedAt !== 'string' || Number.isNaN(new Date(startedAt).getTime())) continue;

    out.push({
      id,
      part: part as Niggle['part'],
      startedAt,
      confirmedAt:
        typeof confirmedAt === 'string' && !Number.isNaN(new Date(confirmedAt).getTime())
          ? confirmedAt
          : startedAt
    });
  }

  return out;
}

export function parseSettings(value: unknown): Settings {
  if (!isRecord(value)) return defaultSettings;
  return {
    haptics: boolOr(value.haptics, defaultSettings.haptics),
    reduceMotion: boolOr(value.reduceMotion, defaultSettings.reduceMotion),
    developerMode: boolOr(value.developerMode, defaultSettings.developerMode)
  };
}

export function parseCheckIn(value: unknown): CheckIn | null {
  if (!isRecord(value)) return null;
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  return {
    date: value.date,
    energy: oneOf(value.energy, ENERGY, 'okay'),
    mood: oneOf(value.mood, MOOD, 'neutral'),
    soreness: oneOf(value.soreness, SORENESS, 'none'),
    pain: boolOr(value.pain, false),
    minutes: parseMinutes(value.minutes),
    location: oneOf(value.location, LOCATIONS, 'home'),
    equipment: stringList(value.equipment, EQUIPMENT, ['bodyweight']),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
  };
}

/**
 * Remembered answers. Anything unreadable falls back to the same values a
 * first-time check-in would use, so a corrupt record costs one extra tap and
 * nothing else.
 */
export function parseDefaults(value: unknown): CheckInDefaults | null {
  if (!isRecord(value)) return null;
  return {
    mood: oneOf(value.mood, MOOD, 'neutral'),
    minutes: parseMinutes(value.minutes),
    location: oneOf(value.location, LOCATIONS, 'home'),
    equipment: stringList(value.equipment, EQUIPMENT, ['bodyweight'])
  };
}

export function parseLog(value: unknown): WorkoutLog | null {
  if (!isRecord(value)) return null;
  const {id, completedAt, title} = value;
  if (typeof id !== 'string' || typeof completedAt !== 'string' || typeof title !== 'string') return null;
  const when = new Date(completedAt);
  if (Number.isNaN(when.getTime())) return null;

  return {
    id,
    completedAt,
    dateKey: typeof value.dateKey === 'string' && value.dateKey.length === 10 ? value.dateKey : localDateKey(when),
    sessionId: typeof value.sessionId === 'string' ? value.sessionId : id,
    type: oneOf(value.type, SESSION_TYPES, 'balanced'),
    title,
    plannedMinutes: intInRange(value.plannedMinutes, 0, 600, 0),
    activeSeconds: intInRange(value.activeSeconds, 0, 86400, 0),
    blocksCompleted: intInRange(value.blocksCompleted, 0, 999, 0),
    blocksTotal: intInRange(value.blocksTotal, 0, 999, 0),
    qualifies: boolOr(value.qualifies, false),
    feel: typeof value.feel === 'string' && (FEEL as readonly string[]).includes(value.feel) ? (value.feel as WorkoutLog['feel']) : undefined,
    effort: typeof value.effort === 'string' && (EFFORT as readonly string[]).includes(value.effort) ? (value.effort as WorkoutLog['effort']) : undefined,
    note: typeof value.note === 'string' ? value.note.slice(0, 500) : undefined,
    exerciseIds: Array.isArray(value.exerciseIds)
      ? value.exerciseIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 60)
      : undefined
  };
}

export function parseHistory(value: unknown): WorkoutLog[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseLog).filter((log): log is WorkoutLog => log !== null);
}

/**
 * A stored session is replayed as-is, so it is validated loosely: the blocks
 * must be present and well-formed, otherwise the session is dropped and the
 * person simply builds a new one.
 */
export function parseSession(value: unknown): Session | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !Array.isArray(value.blocks) || value.blocks.length === 0) return null;

  const blocks = value.blocks.filter(
    (block: unknown) =>
      isRecord(block) &&
      typeof block.id === 'string' &&
      typeof block.name === 'string' &&
      typeof block.seconds === 'number' &&
      Number.isFinite(block.seconds)
  );
  if (blocks.length === 0) return null;

  const checkIn = parseCheckIn(value.checkIn);
  if (!checkIn) return null;

  return {...(value as unknown as Session), blocks: blocks as Session['blocks'], checkIn};
}

// ——— Read / write ————————————————————————————————————————————————————————

/** Reads one key, returning `fallback` for anything missing or unreadable. */
export async function readKey<T>(key: string, parse: (value: unknown) => T, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;

    const envelope = parsed as unknown as Envelope<unknown>;
    // Unknown future versions are ignored rather than guessed at.
    if (typeof envelope.version !== 'number' || envelope.version > STORAGE_VERSION) return fallback;

    return parse(envelope.data);
  } catch {
    return fallback;
  }
}

export async function writeKey(key: string, data: unknown): Promise<void> {
  try {
    const envelope: Envelope<unknown> = {version: STORAGE_VERSION, data};
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Storage being full or unavailable must never take the session down with
    // it: the in-memory state stays correct for the rest of this run.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Nothing useful to do; the next write will overwrite it anyway.
  }
}

/** Wipes every Steady Move key. Used by "Delete local data" in Settings. */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...ALL_KEYS]);
  } catch {
    for (const key of ALL_KEYS) await removeKey(key);
  }
}
