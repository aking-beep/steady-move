// Profile, preferences and settings.
//
// Deliberately small: the onboarding draft lives here too, so a half-finished
// onboarding survives a screen change without being written to disk as if it
// were a real profile.

import {create} from 'zustand';
import {Profile, Settings, defaultProfile, defaultSettings} from '../types';
import {KEYS, parseProfile, parseSettings, readKey, removeKey, writeKey} from '../lib/storage';
import {setHapticsEnabled} from '../lib/haptics';

export type ProfileDraft = Omit<Profile, 'createdAt'>;

interface ProfileState {
  hydrated: boolean;
  profile: Profile | null;
  settings: Settings;
  draft: ProfileDraft;

  hydrate: () => Promise<void>;
  setDraft: (patch: Partial<ProfileDraft>) => void;
  /** Toggles a value inside one of the multi-select draft fields. */
  toggleDraftItem: <K extends 'goals' | 'activities' | 'equipment'>(field: K, value: ProfileDraft[K][number]) => void;
  completeOnboarding: () => Promise<void>;
  updateProfile: (patch: Partial<ProfileDraft>) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  reset: () => void;
}

const emptyDraft: ProfileDraft = {
  goals: [],
  level: 'new',
  activities: [],
  equipment: ['bodyweight'],
  timePreference: 20,
  weeklyTarget: 4
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  hydrated: false,
  profile: null,
  settings: defaultSettings,
  draft: emptyDraft,

  hydrate: async () => {
    const [profile, settings] = await Promise.all([
      readKey(KEYS.profile, parseProfile, null),
      readKey(KEYS.settings, parseSettings, defaultSettings)
    ]);
    setHapticsEnabled(settings.haptics);
    set({
      profile,
      settings,
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

  reset: () => set({profile: null, settings: defaultSettings, draft: emptyDraft})
}));
