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

/**
 * How long it has been since the last qualifying session, and what that should
 * mean for today.
 *
 *   • `none`      — training normally.
 *   • `easing`    — a week or more away. The first sessions back come down in
 *                   intensity rather than picking up where they left off.
 *   • `returning` — three weeks or more. Gentler still, and said out loud.
 */
export type LayoffState = 'none' | 'easing' | 'returning';

/**
 * How ready today looks. Four plain states rather than a score out of a
 * hundred, because a number implies a precision that self-report and training
 * history cannot support.
 */
export type ReadinessState = 'ready' | 'steady' | 'ease' | 'rest';

export interface Readiness {
  state: ReadinessState;
  /** One sentence saying why, in terms the person can check against reality. */
  reason: string;
  /** Consecutive days up to and including yesterday with a qualifying session. */
  consecutiveDays: number;
  /** Qualifying days in the last seven. */
  daysInLastWeek: number;
  /** Recent load per area, decayed by how long ago it was. 0 is fully rested. */
  load: Record<BodyArea, number>;
  /** True when today looks more like a rest day than a training day. */
  restAdvised: boolean;
}

/** What recent sessions say about how the next one should be pitched. */
export interface Adaptation {
  layoff: LayoffState;
  /** Whole days since the last qualifying session; null if there never was one. */
  daysSinceLastSession: number | null;
  /**
   * −1 to ease off, +1 to push on, 0 to hold. Derived from the effort ratings
   * the person already gives at the end of every session, which most apps
   * collect and then ignore.
   */
  effortBias: -1 | 0 | 1;
  /** Movement ids to leave out entirely. */
  excluded: string[];
  /** One plain sentence about why today is pitched the way it is, if at all. */
  note?: string;
}

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
  /**
   * Movements this person has said are not for them. Steady Move stops
   * offering these entirely — a bad knee, a shoulder that complains, or simply
   * a movement they dislike. Competitors let you swap once; this remembers.
   */
  excluded: string[];
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
 * Coarse body areas, used to keep a week balanced and to let a loaded area
 * recover. Deliberately coarse: this is not a muscle map, and pretending to
 * that precision from movement patterns alone would be dishonest.
 */
export type BodyArea = 'legs' | 'push' | 'pull' | 'core' | 'aerobic' | 'restorative';

export const BODY_AREAS: BodyArea[] = ['legs', 'push', 'pull', 'core', 'aerobic', 'restorative'];

export const BODY_AREA_LABELS: Record<BodyArea, string> = {
  legs: 'Legs',
  push: 'Pushing',
  pull: 'Pulling',
  core: 'Core',
  aerobic: 'Aerobic',
  restorative: 'Restorative'
};

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
  /** "4th time this month · last 3 days ago", from completed sessions only. */
  practiceNote?: string;
  /** Completed sessions in the last four weeks that included this movement. */
  familiarTimes?: number;
  /** Whether the optional step offered is the harder or the easier one. */
  stepDirection?: 'progress' | 'regress';
  /** The movement's own wording for that step. Always optional, never applied. */
  stepNote?: string;
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
  /** What the place allowed, kept so a swapped movement obeys it too. */
  constraints?: SpaceConstraints;
  /** What the recent past contributed, kept so the UI can explain it. */
  adaptation?: Adaptation;
  /** How today reads, kept so the preview can say it in the same words. */
  readiness?: Readiness;
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
  /**
   * Movements actually completed. Recorded so the engine can let a loaded
   * area recover, and so the app can say when you last did something —
   * without asking anyone to log a single set.
   */
  exerciseIds?: string[];
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
  excluded: [],
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
