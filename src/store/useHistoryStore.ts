// Completed sessions.
//
// Append-only from the app's point of view: nothing edits or deletes a log
// except the explicit "Delete local data" action in Settings.

import {create} from 'zustand';
import {WorkoutLog} from '../types';
import {KEYS, parseHistory, readKey, removeKey, writeKey} from '../lib/storage';
import {buildDemoHistory} from '../lib/demo';

interface HistoryState {
  hydrated: boolean;
  logs: WorkoutLog[];

  hydrate: () => Promise<void>;
  addLog: (log: WorkoutLog) => Promise<void>;
  seedDemoData: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

/** Keeps storage bounded; a year of daily sessions still fits comfortably. */
const MAX_LOGS = 500;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  hydrated: false,
  logs: [],

  hydrate: async () => {
    const logs = await readKey(KEYS.history, parseHistory, []);
    set({logs, hydrated: true});
  },

  addLog: async log => {
    const logs = [log, ...get().logs].slice(0, MAX_LOGS);
    set({logs});
    await writeKey(KEYS.history, logs);
  },

  seedDemoData: async () => {
    const demo = buildDemoHistory(new Date());
    // Replaces rather than appends, so repeated taps stay idempotent.
    const logs = demo.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    set({logs});
    await writeKey(KEYS.history, logs);
  },

  clearHistory: async () => {
    set({logs: []});
    await removeKey(KEYS.history);
  }
}));
