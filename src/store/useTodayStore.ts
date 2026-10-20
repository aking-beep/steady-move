// Today: the daily check-in and the session built from it.
//
// A check-in belongs to a calendar day. Opening the app tomorrow should ask how
// you are arriving again rather than reusing yesterday's answers, so a stored
// check-in from another day is treated as absent.

import {create} from 'zustand';
import {
  CheckIn,
  CheckInDefaults,
  Profile,
  Session,
  WorkoutLog,
  defaultsFrom,
  emptyCheckIn
} from '../types';
import {
  KEYS,
  parseCheckIn,
  parseDefaults,
  parseSession,
  readKey,
  removeKey,
  writeKey
} from '../lib/storage';
import {generateSession} from '../engine/planner';
import {localDateKey} from '../lib/date';
import {seedDraft} from '../lib/checkin';

interface TodayState {
  hydrated: boolean;
  /** The saved check-in, only if it belongs to today. */
  checkIn: CheckIn | null;
  /** Working copy while stepping through the check-in flow. */
  draft: CheckIn;
  /** The session built from the check-in, before or during the workout. */
  session: Session | null;
  /** Last time's answers to the parts that rarely change. */
  defaults: CheckInDefaults | null;

  hydrate: () => Promise<void>;
  startDraft: (profile: Profile | null) => void;
  setDraft: (patch: Partial<CheckIn>) => void;
  toggleDraftEquipment: (value: CheckIn['equipment'][number]) => void;
  /** Saves the draft as today's check-in and builds the first session. */
  submitCheckIn: (profile: Profile, history: WorkoutLog[]) => Promise<Session>;
  /** Builds another valid session from the same check-in. */
  rebuild: (profile: Profile, history: WorkoutLog[]) => Promise<Session | null>;
  /** Builds a session directly, bypassing the check-in (Quick Move, Explore). */
  setSession: (session: Session) => Promise<void>;
  clearSession: () => Promise<void>;
  clearToday: () => Promise<void>;
}

export const useTodayStore = create<TodayState>((set, get) => ({
  hydrated: false,
  checkIn: null,
  draft: emptyCheckIn(localDateKey(new Date())),
  session: null,
  defaults: null,

  hydrate: async () => {
    const todayKey = localDateKey(new Date());
    const [stored, session, defaults] = await Promise.all([
      readKey(KEYS.checkIn, parseCheckIn, null),
      readKey(KEYS.session, parseSession, null),
      readKey(KEYS.defaults, parseDefaults, null)
    ]);

    // Yesterday's check-in is history, not today's answer.
    const checkIn = stored && stored.date === todayKey ? stored : null;
    if (stored && !checkIn) await removeKey(KEYS.checkIn);

    // A session built from a stale check-in goes with it.
    const validSession = session && session.checkIn.date === todayKey ? session : null;
    if (session && !validSession) await removeKey(KEYS.session);

    set({
      checkIn,
      session: validSession,
      defaults,
      draft: checkIn ?? seedDraft(todayKey, defaults, null),
      hydrated: true
    });
  },

  startDraft: profile => {
    const todayKey = localDateKey(new Date());
    set({draft: seedDraft(todayKey, get().defaults, profile)});
  },

  setDraft: patch => set(state => ({draft: {...state.draft, ...patch}})),

  toggleDraftEquipment: value =>
    set(state => {
      const current = state.draft.equipment;
      const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
      // Bodyweight is always available, so an empty list falls back to it.
      return {draft: {...state.draft, equipment: next.length ? next : ['bodyweight']}};
    }),

  submitCheckIn: async (profile, history) => {
    const checkIn: CheckIn = {...get().draft, createdAt: new Date().toISOString()};
    const session = generateSession({profile, checkIn, history, variant: 0});
    const defaults = defaultsFrom(checkIn);
    set({checkIn, session, defaults});
    await Promise.all([
      writeKey(KEYS.checkIn, checkIn),
      writeKey(KEYS.session, session),
      writeKey(KEYS.defaults, defaults)
    ]);
    return session;
  },

  rebuild: async (profile, history) => {
    const {checkIn, session} = get();
    if (!checkIn) return null;
    const next = generateSession({
      profile,
      checkIn,
      history,
      variant: (session?.variant ?? 0) + 1
    });
    set({session: next});
    await writeKey(KEYS.session, next);
    return next;
  },

  setSession: async session => {
    set({session});
    await writeKey(KEYS.session, session);
  },

  clearSession: async () => {
    set({session: null});
    await removeKey(KEYS.session);
  },

  clearToday: async () => {
    set({checkIn: null, session: null, draft: emptyCheckIn(localDateKey(new Date()))});
    await Promise.all([removeKey(KEYS.checkIn), removeKey(KEYS.session)]);
  }
}));
