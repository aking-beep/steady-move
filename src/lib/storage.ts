// On-device persistence. No accounts, no sync, no analytics: everything lives
// in AsyncStorage on this device only. Stored values are validated on read so
// a corrupt or older payload degrades to an empty state instead of crashing.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppData, Profile, WorkoutLog, emptyData} from '../types';

export const STORAGE_KEY = 'steady-move:v1';

const GOALS = ['consistency', 'strength', 'endurance', 'mobility'];
const LEVELS = ['beginner', 'intermediate'];
const EQUIPMENT = ['none', 'mat', 'dumbbells'];
const FOCUS = ['balanced', 'calisthenics', 'running', 'mobility', 'mindful'];
const ENERGY = ['low', 'okay', 'high'];
const MOOD = ['calm', 'neutral', 'stressed'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const goal = value.goal;
  const level = value.level;
  const equipment = value.equipment;
  const weeklyTarget = value.weeklyTarget;
  if (typeof goal !== 'string' || !GOALS.includes(goal)) return null;
  if (typeof level !== 'string' || !LEVELS.includes(level)) return null;
  if (typeof equipment !== 'string' || !EQUIPMENT.includes(equipment)) return null;
  if (typeof weeklyTarget !== 'number' || !Number.isFinite(weeklyTarget)) return null;
  return {
    displayName: typeof value.displayName === 'string' ? value.displayName.slice(0, 30) : '',
    goal: goal as Profile['goal'],
    level: level as Profile['level'],
    equipment: equipment as Profile['equipment'],
    weeklyTarget: Math.min(7, Math.max(1, Math.round(weeklyTarget)))
  };
}

function parseLog(value: unknown): WorkoutLog | null {
  if (!isRecord(value)) return null;
  const {id, completedAt, planTitle, focus, plannedMinutes, completedSeconds, energy, mood} = value;
  if (typeof id !== 'string' || typeof completedAt !== 'string') return null;
  if (Number.isNaN(new Date(completedAt).getTime())) return null;
  if (typeof planTitle !== 'string') return null;
  if (typeof focus !== 'string' || !FOCUS.includes(focus)) return null;
  if (typeof plannedMinutes !== 'number' || typeof completedSeconds !== 'number') return null;
  return {
    id,
    completedAt,
    planTitle,
    focus: focus as WorkoutLog['focus'],
    plannedMinutes: Math.max(0, Math.round(plannedMinutes)),
    completedSeconds: Math.max(0, Math.round(completedSeconds)),
    finished: value.finished === true,
    energy: (typeof energy === 'string' && ENERGY.includes(energy) ? energy : 'okay') as WorkoutLog['energy'],
    mood: (typeof mood === 'string' && MOOD.includes(mood) ? mood : 'neutral') as WorkoutLog['mood']
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyData;
    const history = Array.isArray(parsed.history)
      ? parsed.history.map(parseLog).filter((log): log is WorkoutLog => log !== null)
      : [];
    return {profile: parseProfile(parsed.profile), history};
  } catch {
    // A readable app matters more than a recoverable payload here.
    return emptyData;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
