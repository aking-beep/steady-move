// Profile, preferences and settings.
//
// Deliberately small: the onboarding draft lives here too, so a half-finished
// onboarding survives a screen change without being written to disk as if it
// were a real profile.

import {create} from 'zustand';
import {BodyPart, Profile, Settings, defaultProfile, defaultSettings} from '../types';
import {KEYS, parseProfile, parseSettings, readKey, removeKey, writeKey} from '../lib/storage';
import {setHapticsEnabled} from '../lib/haptics';
import {clearApiKey, isSecureStorageAvailable, readApiKey, writeApiKey} from '../lib/secrets';

export type ProfileDraft = Omit<Profile, 'createdAt'>;

interface ProfileState {
  hydrated: boolean;
  profile: Profile | null;
  settings: Settings;
  draft: ProfileDraft;
  /** Optional Claude API key for photo analysis. Empty means the feature is off. */
  apiKey: string;
  /** False on web, where there is no platform keystore. */
  secureStorage: boolean;

  hydrate: () => Promise<void>;
  setDraft: (patch: Partial<ProfileDraft>) => void;
  /** Toggles a value inside one of the multi-select draft fields. */
  toggleDraftItem: <K extends 'goals' | 'activities' | 'equipment'>(field: K, value: ProfileDraft[K][number]) => void;
  completeOnboarding: () => Promise<void>;
  updateProfile: (patch: Partial<ProfileDraft>) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  /** Stops offering a movement entirely, or offers it again. */
  excludeExercise: (id: string) => Promise<void>;
  allowExercise: (id: string) => Promise<void>;
  /** Flags a body part to train around, says it is still true, or clears it. */
  addNiggle: (part: BodyPart) => Promise<void>;
  confirmNiggle: (id: string) => Promise<void>;
  clearNiggle: (id: string) => Promise<void>;
  setApiKey: (value: string) => Promise<void>;
  reset: () => void;
}

const emptyDraft: ProfileDraft = {
  goals: [],
  level: 'new',
  activities: [],
  equipment: ['bodyweight'],
  timePreference: 20,
  weeklyTarget: 4,
  excluded: [],
  niggles: []
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  hydrated: false,
  profile: null,
  settings: defaultSettings,
  draft: emptyDraft,
  apiKey: '',
  secureStorage: true,

  hydrate: async () => {
    const [profile, settings, apiKey, secureStorage] = await Promise.all([
      readKey(KEYS.profile, parseProfile, null),
      readKey(KEYS.settings, parseSettings, defaultSettings),
      readApiKey(),
      isSecureStorageAvailable()
    ]);
    setHapticsEnabled(settings.haptics);
    set({
      profile,
      settings,
      apiKey,
      secureStorage,
      hydrated: true,
      draft: profile ? {...profile} : emptyDraft
    });
  },

  setDraft: patch => set(state => ({draft: {...state.draft, ...patch}})),

  toggleDraftItem: (field, value) =>
    set(state => {
      const current = state.draft[field] as string[];
      const next = current.includes(value as string)
        ? current.filter(item => item !== value)
        : [...current, value as string];
      return {draft: {...state.draft, [field]: next}};
    }),

  completeOnboarding: async () => {
    const {draft} = get();
    const profile: Profile = {
      ...defaultProfile,
      ...draft,
      // Never save an empty selection: fall back to something workable.
      goals: draft.goals.length ? draft.goals : defaultProfile.goals,
      activities: draft.activities.length ? draft.activities : defaultProfile.activities,
      equipment: draft.equipment.length ? draft.equipment : ['bodyweight'],
      createdAt: new Date().toISOString()
    };
    set({profile});
    await writeKey(KEYS.profile, profile);
  },

  updateProfile: async patch => {
    const current = get().profile;
    if (!current) return;
    const profile: Profile = {...current, ...patch};
    set({profile, draft: {...profile}});
    await writeKey(KEYS.profile, profile);
  },

  updateSettings: async patch => {
    const settings = {...get().settings, ...patch};
    setHapticsEnabled(settings.haptics);
    set({settings});
    await writeKey(KEYS.settings, settings);
  },

  resetOnboarding: async () => {
    set({profile: null, draft: emptyDraft});
    await removeKey(KEYS.profile);
  },

  excludeExercise: async id => {
    const current = get().profile;
    if (!current || current.excluded.includes(id)) return;
    await get().updateProfile({excluded: [...current.excluded, id]});
  },

  allowExercise: async id => {
    const current = get().profile;
    if (!current) return;
    await get().updateProfile({excluded: current.excluded.filter(item => item !== id)});
  },

  addNiggle: async part => {
    const current = get().profile;
    if (!current) return;
    // One flag per part: flagging a knee twice is the same knee.
    const existing = current.niggles.find(entry => entry.part === part);
    const now = new Date().toISOString();

    const niggles = existing
      ? current.niggles.map(entry =>
          entry.part === part ? {...entry, confirmedAt: now} : entry
        )
      : [...current.niggles, {id: `${part}-${Date.now()}`, part, startedAt: now, confirmedAt: now}];

    await get().updateProfile({niggles});
  },

  confirmNiggle: async id => {
    const current = get().profile;
    if (!current) return;
    const now = new Date().toISOString();
    await get().updateProfile({
      niggles: current.niggles.map(entry =>
        entry.id === id ? {...entry, confirmedAt: now} : entry
      )
    });
  },

  clearNiggle: async id => {
    const current = get().profile;
    if (!current) return;
    await get().updateProfile({niggles: current.niggles.filter(entry => entry.id !== id)});
  },

  setApiKey: async value => {
    set({apiKey: value.trim()});
    await writeApiKey(value);
  },

  reset: () => {
    set({profile: null, settings: defaultSettings, draft: emptyDraft, apiKey: ''});
    void clearApiKey();
  }
}));
