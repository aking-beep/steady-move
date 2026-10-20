// Starting a check-in.
//
// A person who trains most days should not re-state where they live and what
// kit they own every morning. What they should be asked, every single time, is
// what actually changed: energy, soreness, and whether anything hurts.
//
// That split is the whole rule, and it lives here rather than in a screen so
// the quick path and the full path can never disagree about it.

import {CheckIn, CheckInDefaults, Profile, defaultsFrom, emptyCheckIn} from '../types';

/**
 * A fresh draft for today: last time's answers for the parts that rarely
 * change, onboarding for anyone who has not checked in before, and today's
 * own answers left at their neutral starting point.
 */
export function seedDraft(
  dateKey: string,
  defaults: CheckInDefaults | null,
  profile: Profile | null
): CheckIn {
  const base = emptyCheckIn(dateKey);

  if (defaults) {
    return {
      ...base,
      mood: defaults.mood,
      minutes: defaults.minutes,
      location: defaults.location,
      equipment: defaults.equipment.length ? defaults.equipment : base.equipment
    };
  }

  return {
    ...base,
    minutes: typeof profile?.timePreference === 'number' ? profile.timePreference : base.minutes,
    equipment: profile?.equipment.length ? profile.equipment : base.equipment
  };
}

export {defaultsFrom};
