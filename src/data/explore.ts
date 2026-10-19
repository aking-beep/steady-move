// The Explore catalogue.
//
// Every entry here builds a real session through the same engine as the daily
// check-in — there are no stub screens and no "coming soon" rows. Entries carry
// the constraints the engine needs, and the engine still applies every safety
// rule on top, so a pain-flagged day softens an Explore session too.

import {EquipmentId, LocationId, MovementPattern, SessionType, TimeBudget} from '../types';

export type ExploreCategory = 'quick' | 'calisthenics' | 'runwalk' | 'mobility' | 'mindfulness';

export interface ExploreItem {
  id: string;
  title: string;
  description: string;
  minutes: TimeBudget;
  category: ExploreCategory;
  /** Session type the engine should build. */
  type: SessionType;
  /** Narrows the main block, e.g. to pushing patterns. */
  patterns?: MovementPattern[];
  /** Equipment the session assumes; defaults to bodyweight only. */
  equipment?: EquipmentId[];
  location?: LocationId;
  /**
   * Breathing sessions run in the dedicated breathing player rather than the
   * block player, with this many minutes on the clock.
   */
  breathingMinutes?: 1 | 2 | 5;
}

export const EXPLORE_CATEGORIES: {id: ExploreCategory; title: string; subtitle: string}[] = [
  {id: 'quick', title: 'Quick moves', subtitle: 'Short sessions that fit almost any day'},
  {id: 'calisthenics', title: 'Calisthenics', subtitle: 'Strength with your own bodyweight'},
  {id: 'runwalk', title: 'Run / walk', subtitle: 'Time-based, judged by effort'},
  {id: 'mobility', title: 'Mobility', subtitle: 'Unhurried range of motion'},
  {id: 'mindfulness', title: 'Mindfulness', subtitle: 'Breathing and attention'}
];

export const EXPLORE_ITEMS: ExploreItem[] = [
  // ——— Quick moves ———
  {
    id: 'quick-full-body',
    title: '10 minute full body',
    description: 'One round through the whole body, warm-up and reset included.',
    minutes: 10,
    category: 'quick',
    type: 'balanced'
  },
  {
    id: 'quick-morning-mobility',
    title: 'Morning mobility',
    description: 'Wake the spine, hips and shoulders without rushing.',
    minutes: 10,
    category: 'quick',
    type: 'mobility'
  },
  {
    id: 'quick-evening-reset',
    title: 'Evening reset',
    description: 'Slow stretches and long breaths to close the day down.',
    minutes: 10,
    category: 'quick',
    type: 'mobility'
  },
  {
    id: 'quick-desk-reset',
    title: 'Desk reset',
    description: 'Undo a long sit: neck, chest, hips and a little rotation.',
    minutes: 10,
    category: 'quick',
    type: 'mobility',
    patterns: ['mobility', 'rotation']
  },

  // ——— Calisthenics ———
  {
    id: 'cal-beginner',
    title: 'Beginner strength',
    description: 'The foundations, scaled so the first session is always doable.',
    minutes: 20,
    category: 'calisthenics',
    type: 'calisthenics'
  },
  {
    id: 'cal-push',
    title: 'Push foundation',
    description: 'Pressing patterns, from the wall to the floor.',
    minutes: 20,
    category: 'calisthenics',
    type: 'calisthenics',
    patterns: ['push', 'core']
  },
  {
    id: 'cal-legs',
    title: 'Leg foundation',
    description: 'Squat, hinge and lunge, with balance to finish.',
    minutes: 20,
    category: 'calisthenics',
    type: 'calisthenics',
    patterns: ['squat', 'hinge', 'lunge', 'balance']
  },
  {
    id: 'cal-core',
    title: 'Core foundation',
    description: 'Bracing and control rather than crunches.',
    minutes: 20,
    category: 'calisthenics',
    type: 'calisthenics',
    patterns: ['core']
  },

  // ——— Run / walk ———
  {
    id: 'run-first',
    title: 'First run',
    description: 'Walk and jog intervals for a first time out. Walking all of it is a win.',
    minutes: 20,
    category: 'runwalk',
    type: 'runwalk',
    location: 'outside',
    equipment: ['bodyweight', 'outdoors']
  },
  {
    id: 'run-easy-20',
    title: 'Easy 20',
    description: 'Twenty minutes at a conversational effort.',
    minutes: 20,
    category: 'runwalk',
    type: 'runwalk',
    location: 'outside',
    equipment: ['bodyweight', 'outdoors']
  },
  {
    id: 'run-walk-run',
    title: 'Walk + run',
    description: 'Alternating blocks, with recovery walks built in.',
    minutes: 40,
    category: 'runwalk',
    type: 'runwalk',
    location: 'outside',
    equipment: ['bodyweight', 'outdoors']
  },

  // ——— Mobility ———
  {
    id: 'mob-hips',
    title: 'Hips',
    description: 'Openers and switches for hips that have been sitting.',
    minutes: 10,
    category: 'mobility',
    type: 'mobility',
    patterns: ['mobility']
  },
  {
    id: 'mob-shoulders',
    title: 'Shoulders',
    description: 'Circles, openers and gentle rotation through the upper back.',
    minutes: 10,
    category: 'mobility',
    type: 'mobility',
    patterns: ['mobility', 'rotation']
  },
  {
    id: 'mob-full-body',
    title: 'Full body',
    description: 'A longer pass from the ankles to the neck.',
    minutes: 20,
    category: 'mobility',
    type: 'mobility'
  },

  // ——— Mindfulness ———
  {
    id: 'mind-1',
    title: '1 minute reset',
    description: 'Six guided breaths. Long enough to change the next hour.',
    minutes: 10,
    category: 'mindfulness',
    type: 'mindful',
    breathingMinutes: 1
  },
  {
    id: 'mind-2',
    title: '2 minute breathing',
    description: 'Inhale four, hold one, exhale five, repeated.',
    minutes: 10,
    category: 'mindfulness',
    type: 'mindful',
    breathingMinutes: 2
  },
  {
    id: 'mind-5',
    title: '5 minute unwind',
    description: 'A longer sit, for the end of the day or the middle of a hard one.',
    minutes: 10,
    category: 'mindfulness',
    type: 'mindful',
    breathingMinutes: 5
  }
];

export function exploreItem(id: string): ExploreItem | undefined {
  return EXPLORE_ITEMS.find(item => item.id === id);
}

export function itemsByCategory(category: ExploreCategory): ExploreItem[] {
  return EXPLORE_ITEMS.filter(item => item.category === category);
}

/** The four shortcuts shown on Today under "Quick move". */
export const QUICK_MOVE_IDS = ['quick-full-body', 'mob-full-body', 'run-easy-20', 'mind-2'] as const;
