// Shared domain types for steady. — kept dependency-free so the planner and
// progress modules can be compiled and unit tested outside React Native.

export type Goal = 'consistency' | 'strength' | 'endurance' | 'mobility';
export type Level = 'beginner' | 'intermediate';
export type Equipment = 'none' | 'mat' | 'dumbbells';
export type Focus = 'balanced' | 'calisthenics' | 'running' | 'mobility' | 'mindful';

export type Energy = 'low' | 'okay' | 'high';
export type Mood = 'calm' | 'neutral' | 'stressed';
export type Soreness = 'none' | 'mild' | 'high';
export type TimeBudget = 10 | 20 | 40;

export type Phase = 'warmup' | 'main' | 'cooldown' | 'mindful';

export interface Profile {
  displayName: string;
  goal: Goal;
  level: Level;
  equipment: Equipment;
  weeklyTarget: number;
}

export interface CheckIn {
  energy: Energy;
  mood: Mood;
  soreness: Soreness;
  pain: boolean;
  minutes: TimeBudget;
  focus: Focus;
}

export interface WorkoutStep {
  title: string;
  instruction: string;
  cues: string[];
  seconds: number;
  phase: Phase;
}

export interface WorkoutPlan {
  title: string;
  description: string;
  intent: Focus;
  minutes: number;
  steps: WorkoutStep[];
  /** True when the check-in (low energy, high soreness, pain) softened the plan. */
  adjustedForRecovery: boolean;
}

export interface WorkoutLog {
  id: string;
  /** ISO timestamp of when the session was recorded. */
  completedAt: string;
  planTitle: string;
  focus: Focus;
  plannedMinutes: number;
  completedSeconds: number;
  /** Only true when at least 70% of the timed session was performed. */
  finished: boolean;
  energy: Energy;
  mood: Mood;
}

export interface AppData {
  profile: Profile | null;
  history: WorkoutLog[];
}

export const defaultProfile: Profile = {
  displayName: '',
  goal: 'consistency',
  level: 'beginner',
  equipment: 'none',
  weeklyTarget: 3
};

export const defaultCheckIn: CheckIn = {
  energy: 'okay',
  mood: 'neutral',
  soreness: 'none',
  pain: false,
  minutes: 20,
  focus: 'balanced'
};

export const emptyData: AppData = {profile: null, history: []};
