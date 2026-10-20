// Building a session for a place.
//
// Same ordering rule as Explore: the place supplies the shape and the
// constraints; today's check-in still supplies the state of the person. Being
// in an airport does not override having reported pain.

import {CheckIn, Profile, Session, SpaceConstraints, TimeBudget, WorkoutLog, emptyCheckIn} from '../types';
import {Place, locationForPlace} from '../data/places';
import {generateSession} from '../engine/planner';
import {localDateKey} from './date';

export function buildPlaceSession(options: {
  place: Place;
  profile: Profile;
  history: WorkoutLog[];
  checkIn: CheckIn | null;
  /** Overrides the place's default length. */
  minutes?: TimeBudget;
  /** Overrides the place's equipment, e.g. after scanning a photo. */
  equipment?: CheckIn['equipment'];
  /** Overrides the place's constraints, e.g. after scanning a photo. */
  constraints?: SpaceConstraints;
  variant?: number;
}): Session {
  const {place, profile, history, checkIn, variant = 0} = options;
  const today = localDateKey(new Date());
  const base = checkIn ?? emptyCheckIn(today);

  const merged: CheckIn = {
    ...base,
    date: today,
    minutes: options.minutes ?? place.minutes,
    location: locationForPlace(place.id),
    equipment: options.equipment ?? place.equipment,
    createdAt: new Date().toISOString()
    // energy, mood, soreness and pain stay exactly as reported.
  };

  // Rotate through the types this place suits, so the same place twice in a
  // week is not the same session twice.
  const type = place.types[Math.abs(variant) % place.types.length];

  return generateSession({
    profile,
    checkIn: merged,
    history,
    variant,
    force: type,
    constraints: options.constraints ?? place.constraints,
    placeNote: place.note,
    titleOverride: undefined
  });
}
