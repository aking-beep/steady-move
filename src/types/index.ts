// Shared domain types. This module is deliberately dependency-free so the
// engine, progress maths and data library can be compiled and unit-tested
// outside React Native.

// ——— Profile ———————————————————————————————————————————————————————————

export type Goal =
  | 'consistency'
  | 'strength'
  | 'endurance'
  | 'move-better'
  | 'stress'
  | 'athletic'
  | 'sport';

export type Level = 'new' | 'occasional' | 'regular';

export type Activity =
  | 'calisthenics'
  | 'strength'
  | 'running'
  | 'walking'
  | 'mobility'
  | 'stretching'
  | 'mindfulness';

export type EquipmentId =
  | 'bodyweight'
  | 'dumbbells'
  | 'kettlebells'
  | 'bands'
  | 'pullup-bar'
  | 'full-gym'
  | 'outdoors';

/** Every equipment id, for validating anything that arrives from outside. */
export const EQUIPMENT_IDS: EquipmentId[] = [
  'bodyweight',
  'dumbbells',
  'kettlebells',
  'bands',
  'pullup-bar',
  'full-gym',
  'outdoors'
];

export type TimeBudget = 10 | 20 | 40;
export type TimePreference = TimeBudget | 'flexible';

export type LocationId = 'home' | 'gym' | 'outside' | 'anywhere';

/** A place you might actually be, with the constraints that come with it. */
export type PlaceId =
  | 'home'
  | 'hotel'
  | 'office'
  | 'airport'
  | 'park'
  | 'gym'
  | 'small-space';

/**
 * What a place allows. Derived from a chosen place, or from a photo of the
 * space — either way it is only ever a filter on the vetted movement library,
 * never a source of exercises.
 */
/** Every place id, for validating anything that arrives from outside. */
export const PLACE_IDS: PlaceId[] = [
  'home',
  'hotel',
  'office',
  'airport',
  'park',
  'gym',
  'small-space'
];

export interface SpaceConstraints {
  /** The most room any movement may need. */
  space: SpaceNeed;
  /** Keep to movements that do not look odd in public. */
  discreet: boolean;
  /** No impact: shared floors, late evenings, thin walls. */
  quiet: boolean;
}

export interface Profile {
  goals: Goal[];
  level: Level;
  activities: Activity[];
  equipment: EquipmentId[];
  timePreference: TimePreference;
  /** Movement days per week the person is aiming for. Never enforced. */
  weeklyTarget: number;
  /** ISO timestamp of when onboarding was completed. */
  createdAt: string;
}

export interface Settings {
  haptics: boolean;
  /** When true the app drops to opacity-only transitions and still frames. */
  reduceMotion: boolean;
  /** Shows the developer tools section in Settings. */
  developerMode: boolean;
}

// ——— Daily check-in ————————————————————————————————————————————————————

export type Energy = 'low' | 'okay' | 'high';
export type Mood = 'low' | 'neutral' | 'good';
export type Soreness = 'none' | 'mild' | 'sore';

export interface CheckIn {
  /** Local calendar day key (YYYY-MM-DD) the check-in belongs to. */
  date: string;
  energy: Energy;
  mood: Mood;
  soreness: Soreness;
  /** True when the user reports pain that makes exercise inappropriate today. */
  pain: boolean;
  minutes: TimeBudget;
  location: LocationId;
  equipment: EquipmentId[];
  createdAt: string;
}

// ——— Exercise library ——————————————————————————————————————————————————

export type ExerciseCategory =
  | 'warmup'
  | 'lower'
  | 'push'
  | 'pull'
  | 'core'
  | 'carry'
  | 'cardio'
  | 'mobility'
  | 'stretch'
  | 'breathing';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'push'
  | 'pull'
  | 'lunge'
  | 'carry'
  | 'core'
  | 'rotation'
  | 'gait'
  | 'mobility'
  | 'balance'
  | 'breath';

/** 1 = anyone on day one, 2 = some training background, 3 = trains regularly. */
export type Difficulty = 1 | 2 | 3;

export type EffortLabel = 'easy' | 'moderate' | 'hard';

/**
 * How much room a movement needs. Ordered: a place that allows `floor` allows
 * everything, a place that only allows `seated` allows the least.
 */
export type SpaceNeed = 'seated' | 'standing' | 'floor';

export const SPACE_ORDER: Record<SpaceNeed, number> = {seated: 0, standing: 1, floor: 2};

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  movementPattern: MovementPattern;
  difficulty: Difficulty;
  /** Every item must be available for the movement to be offered. */
  equipment: EquipmentId[];
  instructions: string;
  /** Timed holds/intervals, or a rep target performed inside a timed block. */
  mode: 'time' | 'reps';
  /** Suggested working seconds; the engine may scale this to fit the budget. */
  duration?: number;
  /** Suggested rep range, shown alongside the block timer. */
  reps?: string;
  /** Suggested rest after the movement, in seconds. */
  rest: number;
  cues: string[];
  regression?: string;
  progression?: string;
  contraindicationNotes?: string;
  /** True when the movement is performed one side at a time. */
  perSide?: boolean;
  /** Suitable while seated or lying; used for recovery and pain-flagged days. */
  gentle?: boolean;
  /** How much room the movement needs. */
  space: SpaceNeed;
  /** Unremarkable to do with other people around — a concourse, an office. */
  discreet?: boolean;
  /** Thuds or makes noise: not for a hotel room with someone below. */
  impact?: boolean;
  /** Relative effort cost, used to keep a session's load sensible. */
  effort: EffortLabel;
}

// ——— Generated session —————————————————————————————————————————————————

export type SessionType =
  | 'strength'
  | 'calisthenics'
  | 'runwalk'
  | 'mobility'
  | 'recovery'
  | 'balanced'
  | 'mindful';

export type Intensity = 'gentle' | 'easy' | 'moderate' | 'strong';

/** The five-part shape every session follows. */
export type SessionPhase = 'arrive' | 'warmup' | 'move' | 'reset' | 'reflect';

export interface SessionBlock {
  /** Unique within the session. */
  id: string;
  kind: 'exercise' | 'rest';
  phase: SessionPhase;
  name: string;
  instructions: string;
  cues: string[];
  /** Exact planned seconds for this block. */
  seconds: number;
  mode: 'time' | 'reps';
  reps?: string;
  /** Source exercise, absent on rest blocks. */
  exerciseId?: string;
  /** Round number when a movement repeats inside a session. */
  round?: number;
  perSide?: boolean;
  effort?: EffortLabel;
  /** Plain-language effort guidance, used by run/walk blocks. */
  effortNote?: string;
  /** Name of the block that follows, shown during rest. */
  nextName?: string;
}

export interface Session {
  id: string;
  createdAt: string;
  type: SessionType;
  title: string;
  /** One-line summary of the day's focus. */
  focus: string;
  /** Plain-language explanation of why this session was chosen. */
  rationale: string;
  intensity: Intensity;
  /** Requested budget in minutes. */
  minutes: TimeBudget;
  /** Sum of every block's seconds. Always equals minutes * 60. */
  totalSeconds: number;
  blocks: SessionBlock[];
  /** The check-in the session was generated from. */
  checkIn: CheckIn;
  /** True when the check-in softened the session. */
  adjustedForRecovery: boolean;
  /** True when pain was reported: no strenuous work is prescribed. */
  painFlagged: boolean;
  /** Increment used to produce a different valid session from the same inputs. */
  variant: number;
}

// ——— History ———————————————————————————————————————————————————————————

export type Feel = 'lower' | 'same' | 'better';
export type EffortRating = 'easy' | 'right' | 'hard';

export interface WorkoutLog {
  id: string;
  /** ISO timestamp of when the session was saved. */
  completedAt: string;
  /** Local calendar day key, computed at save time. */
  dateKey: string;
  sessionId: string;
  type: SessionType;
  title: string;
  plannedMinutes: number;
  /** Seconds actually spent in the session, excluding paused time. */
  activeSeconds: number;
  blocksCompleted: number;
  blocksTotal: number;
  /**
   * True when enough of the session was performed to count towards movement
   * days and streaks (see QUALIFYING_RATIO).
   */
  qualifies: boolean;
  feel?: Feel;
  effort?: EffortRating;
  note?: string;
}

/** A session counts towards streaks once at least this share of it is done. */
export const QUALIFYING_RATIO = 0.7;

// ——— Defaults ——————————————————————————————————————————————————————————

export const defaultProfile: Profile = {
  goals: ['consistency'],
  level: 'new',
  activities: ['calisthenics', 'mobility'],
  equipment: ['bodyweight'],
  timePreference: 20,
  weeklyTarget: 4,
  createdAt: ''
};

export const defaultSettings: Settings = {
  haptics: true,
  reduceMotion: false,
  developerMode: false
};

export function emptyCheckIn(dateKey: string): CheckIn {
  return {
    date: dateKey,
    energy: 'okay',
    mood: 'neutral',
    soreness: 'none',
    pain: false,
    minutes: 20,
    location: 'home',
    equipment: ['bodyweight'],
    createdAt: ''
  };
}
