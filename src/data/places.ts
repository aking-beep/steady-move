// Places you might actually be.
//
// Each entry is a set of honest constraints — how much room there is, whether
// other people are around, whether the floor below matters — plus the kit you
// can reasonably assume. Those constraints filter the vetted movement library;
// they never introduce movements of their own.

import {EquipmentId, PlaceId, SessionType, SpaceConstraints, TimeBudget} from '../types';

export interface Place {
  id: PlaceId;
  title: string;
  /** One line, shown under the title. */
  description: string;
  /** What the session's explanation says about being here. */
  note: string;
  equipment: EquipmentId[];
  constraints: SpaceConstraints;
  /** Session types that suit this place, in preference order. */
  types: SessionType[];
  /** A sensible default length here. */
  minutes: TimeBudget;
}

export const PLACES: Place[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'Room to use the floor, nobody watching',
    note: 'You have floor space and privacy, so nothing is off the table.',
    equipment: ['bodyweight'],
    constraints: {space: 'floor', discreet: false, quiet: false},
    types: ['calisthenics', 'balanced', 'mobility'],
    minutes: 20
  },
  {
    id: 'hotel',
    title: 'Hotel room',
    description: 'Floor space, but someone is below you',
    note: 'A hotel room has floor space but thin floors, so this session stays quiet — nothing that thuds.',
    equipment: ['bodyweight'],
    constraints: {space: 'floor', discreet: false, quiet: true},
    types: ['calisthenics', 'mobility'],
    minutes: 20
  },
  {
    id: 'office',
    title: 'Office or desk',
    description: 'People around, no floor work',
    note: 'An office means no floor work and nothing that looks strange at a desk, so this is standing and seated movement.',
    equipment: ['bodyweight'],
    constraints: {space: 'standing', discreet: true, quiet: true},
    types: ['mobility', 'calisthenics'],
    minutes: 10
  },
  {
    id: 'airport',
    title: 'Airport or station',
    description: 'Walking, waiting, bags to carry',
    note: 'Airports are for walking. This is a walk you can do between gates, with discreet mobility for the waiting.',
    equipment: ['bodyweight'],
    constraints: {space: 'standing', discreet: true, quiet: true},
    types: ['runwalk', 'mobility'],
    minutes: 20
  },
  {
    id: 'park',
    title: 'Park or outside',
    description: 'Open space, fresh air, a bench',
    note: 'Outdoors with space to move, so this uses the ground and the open air.',
    equipment: ['bodyweight', 'outdoors'],
    constraints: {space: 'floor', discreet: false, quiet: false},
    types: ['runwalk', 'calisthenics', 'mobility'],
    minutes: 20
  },
  {
    id: 'gym',
    title: 'Gym',
    description: 'Full kit, room to work',
    note: 'A gym, so this session uses load and takes the room it needs.',
    equipment: ['full-gym'],
    constraints: {space: 'floor', discreet: false, quiet: false},
    types: ['strength', 'calisthenics'],
    minutes: 40
  },
  {
    id: 'small-space',
    title: 'A small space',
    description: 'A corner, a hallway, a hotel bathroom',
    note: 'Not much room, so this stays on the spot — no travelling movements.',
    equipment: ['bodyweight'],
    constraints: {space: 'standing', discreet: false, quiet: true},
    types: ['mobility', 'calisthenics'],
    minutes: 10
  }
];

export function getPlace(id: PlaceId): Place | undefined {
  return PLACES.find(place => place.id === id);
}

/** Places map onto the engine's coarser location, which gates run/walk. */
export function locationForPlace(id: PlaceId): 'home' | 'gym' | 'outside' | 'anywhere' {
  switch (id) {
    case 'gym':
      return 'gym';
    case 'park':
      return 'outside';
    case 'airport':
      // Concourses are long: walking works, running does not.
      return 'anywhere';
    default:
      return 'home';
  }
}
