// Turning an Explore or Quick Move entry into a real session.
//
// The entry supplies the shape (what, how long, where); today's check-in still
// supplies the state of the person. That ordering matters: picking "Easy 20"
// on a day you reported pain must still give you a gentle session.

import {CheckIn, Profile, Session, WorkoutLog, emptyCheckIn} from '../types';
import {ExploreItem} from '../data/explore';
import {generateSession} from '../engine/planner';
import {localDateKey} from './date';

export function buildExploreSession(options: {
  item: ExploreItem;
  profile: Profile;
  history: WorkoutLog[];
  /** Today's check-in, when one exists. */
  checkIn: CheckIn | null;
  variant?: number;
}): Session {
  const {item, profile, history, checkIn, variant = 0} = options;
  const today = localDateKey(new Date());
  const base = checkIn ?? emptyCheckIn(today);

  const merged: CheckIn = {
    ...base,
    date: today,
    // The entry decides the shape of the session…
    minutes: item.minutes,
    location: item.location ?? base.location,
    equipment: item.equipment ?? base.equipment,
    createdAt: new Date().toISOString()
    // …while energy, mood, soreness and pain stay exactly as reported.
  };

  return generateSession({
    profile,
    checkIn: merged,
    history,
    variant,
    force: item.type,
    patterns: item.patterns,
    titleOverride: item.title
  });
}
