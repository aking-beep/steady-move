// The active workout.
//
// The player screen owns the one-second tick; this store owns the state it
// ticks. Keeping them apart means a timer can never keep running after the
// screen is gone, while the session itself survives a backgrounded app, a
// navigation away, or the app being killed and reopened.

import {create} from 'zustand';
import {QUALIFYING_RATIO, Session, SessionBlock, WorkoutLog} from '../types';
import {readKey, removeKey, writeKey} from '../lib/storage';
import {localDateKey} from '../lib/date';

const ACTIVE_KEY = 'steady-move:v1:active-session';

interface ActiveSnapshot {
  session: Session;
  index: number;
  remaining: number;
  activeSeconds: number;
  completed: string[];
  startedAt: string;
}

interface SessionState {
  hydrated: boolean;
  session: Session | null;
  /** Index into session.blocks. */
  index: number;
  /** Seconds left on the current block. */
  remaining: number;
  /** False while paused, or once the session is finished. */
  running: boolean;
  /** Seconds actually spent moving, excluding paused time. */
  activeSeconds: number;
  /** Ids of blocks that were finished rather than skipped. */
  completed: string[];
  startedAt: string | null;
  /** Set when the last block is done, which routes to the completion screen. */
  finished: boolean;

  hydrate: () => Promise<void>;
  start: (session: Session) => Promise<void>;
  /** One second of elapsed time. Returns true when the block just ran out. */
  tick: () => boolean;
  pause: () => void;
  resume: () => void;
  /** Marks the current block done and moves on. */
  completeBlock: () => void;
  /** Moves on without marking the block done. */
  skipBlock: () => void;
  addSeconds: (seconds: number) => void;
  /** Ends the session early but keeps what was done. */
  finish: () => void;
  /** Throws the session away without saving anything. */
  abandon: () => Promise<void>;
  /** Builds the log for the completion screen to save. */
  buildLog: (extras: Pick<WorkoutLog, 'feel' | 'effort' | 'note'>) => WorkoutLog | null;
  persist: () => Promise<void>;
  clear: () => Promise<void>;
}

/** Only movement counts towards "exercises completed" — rests are not work. */
function exerciseBlockIds(session: Session): string[] {
  return session.blocks.filter(block => block.kind === 'exercise').map(block => block.id);
}

function parseSnapshot(value: unknown): ActiveSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const snapshot = value as Partial<ActiveSnapshot>;
  if (!snapshot.session || !Array.isArray(snapshot.session.blocks) || snapshot.session.blocks.length === 0) return null;
  if (typeof snapshot.index !== 'number' || snapshot.index < 0) return null;
  if (snapshot.index >= snapshot.session.blocks.length) return null;
  if (typeof snapshot.remaining !== 'number' || !Number.isFinite(snapshot.remaining)) return null;

  return {
    session: snapshot.session,
    index: snapshot.index,
    remaining: Math.max(0, Math.round(snapshot.remaining)),
    activeSeconds: Math.max(0, Math.round(snapshot.activeSeconds ?? 0)),
    completed: Array.isArray(snapshot.completed) ? snapshot.completed.filter(id => typeof id === 'string') : [],
    startedAt: typeof snapshot.startedAt === 'string' ? snapshot.startedAt : new Date().toISOString()
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  hydrated: false,
  session: null,
  index: 0,
  remaining: 0,
  running: false,
  activeSeconds: 0,
  completed: [],
  startedAt: null,
  finished: false,

  hydrate: async () => {
    const snapshot = await readKey<ActiveSnapshot | null>(ACTIVE_KEY, parseSnapshot, null);
    if (!snapshot) {
      set({hydrated: true});
      return;
    }
    // Always resumes paused: nobody should walk back to a timer that kept
    // counting without them.
    set({
      hydrated: true,
      session: snapshot.session,
      index: snapshot.index,
      remaining: snapshot.remaining,
      activeSeconds: snapshot.activeSeconds,
      completed: snapshot.completed,
      startedAt: snapshot.startedAt,
      running: false,
      finished: false
    });
  },

  start: async session => {
    set({
      session,
      index: 0,
      remaining: session.blocks[0]?.seconds ?? 0,
      running: true,
      activeSeconds: 0,
      completed: [],
      startedAt: new Date().toISOString(),
      finished: false
    });
    await get().persist();
  },

  tick: () => {
    const {running, remaining, session, activeSeconds} = get();
    if (!running || !session) return false;

    const next = remaining - 1;
    set({remaining: Math.max(0, next), activeSeconds: activeSeconds + 1});
    return next <= 0;
  },

  pause: () => {
    set({running: false});
    void get().persist();
  },

  resume: () => set({running: true}),

  completeBlock: () => {
    const {session, index, completed} = get();
    if (!session) return;
    const block = session.blocks[index];
    const nextCompleted = block && !completed.includes(block.id) ? [...completed, block.id] : completed;
    advance(set, get, nextCompleted);
  },

  skipBlock: () => {
    const {completed} = get();
    advance(set, get, completed);
  },

  addSeconds: seconds => set(state => ({remaining: Math.max(0, state.remaining + seconds)})),

  finish: () => {
    set({running: false, finished: true});
    void get().persist();
  },

  abandon: async () => {
    set({
      session: null,
      index: 0,
      remaining: 0,
      running: false,
      activeSeconds: 0,
      completed: [],
      startedAt: null,
      finished: false
    });
    await removeKey(ACTIVE_KEY);
  },

  buildLog: extras => {
    const {session, activeSeconds, completed} = get();
    if (!session) return null;

    const exerciseIds = exerciseBlockIds(session);
    const blocksTotal = exerciseIds.length;
    const blocksCompleted = completed.filter(id => exerciseIds.includes(id)).length;
    const now = new Date();

    return {
      id: `log-${now.getTime()}`,
      completedAt: now.toISOString(),
      dateKey: localDateKey(now),
      sessionId: session.id,
      type: session.type,
      title: session.title,
      plannedMinutes: session.minutes,
      activeSeconds,
      blocksCompleted,
      blocksTotal,
      // Counting movement rather than clock time is fairer: finishing every
      // exercise early still means the session was done.
      qualifies: blocksTotal > 0 && blocksCompleted / blocksTotal >= QUALIFYING_RATIO,
      ...extras
    };
  },

  persist: async () => {
    const {session, index, remaining, activeSeconds, completed, startedAt} = get();
    if (!session || !startedAt) {
      await removeKey(ACTIVE_KEY);
      return;
    }
    const snapshot: ActiveSnapshot = {session, index, remaining, activeSeconds, completed, startedAt};
    await writeKey(ACTIVE_KEY, snapshot);
  },

  clear: async () => {
    await removeKey(ACTIVE_KEY);
  }
}));

/** Moves to the next block, or finishes the session when there is none. */
function advance(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
  completed: string[]
): void {
  const {session, index} = get();
  if (!session) return;

  const nextIndex = index + 1;
  if (nextIndex >= session.blocks.length) {
    set({completed, running: false, finished: true});
    void get().persist();
    return;
  }

  set({
    completed,
    index: nextIndex,
    remaining: session.blocks[nextIndex]?.seconds ?? 0,
    running: true
  });
  void get().persist();
}

/** The block the player is currently on. */
export function currentBlock(state: SessionState): SessionBlock | null {
  if (!state.session) return null;
  return state.session.blocks[state.index] ?? null;
}

/** How far through the whole session we are, 0–1. */
export function sessionProgress(state: SessionState): number {
  const {session, index, remaining} = state;
  if (!session || session.totalSeconds === 0) return 0;

  let done = 0;
  for (let i = 0; i < index; i++) done += session.blocks[i]?.seconds ?? 0;
  const block = session.blocks[index];
  if (block) done += Math.max(0, block.seconds - remaining);

  return Math.min(1, done / session.totalSeconds);
}

/** Seconds left in the whole session, for the header countdown. */
export function sessionRemaining(state: SessionState): number {
  const {session, index, remaining} = state;
  if (!session) return 0;
  let left = remaining;
  for (let i = index + 1; i < session.blocks.length; i++) left += session.blocks[i]?.seconds ?? 0;
  return left;
}
