// Run and walk sessions.
//
// Time-based only: no GPS, no distance, no pace prescriptions. Effort is
// described in RPE language that the person judges for themselves, and the MVP
// deliberately stops short of maximal work.

import {EffortLabel, Level, SessionBlock} from '../types';
import {allocate} from './duration';

/** Plain-language effort guidance attached to every run/walk block. */
export const RPE_NOTES: Record<EffortLabel, string> = {
  easy: 'RPE 3–4 · easy, conversational effort. You could talk in full sentences.',
  moderate: 'RPE 6 · controlled but purposeful. Talking takes a little more work.',
  hard: 'RPE 7–8 · hard but sustainable for the length of this interval. Never a sprint.'
};

interface Segment {
  name: string;
  instructions: string;
  cues: string[];
  effort: EffortLabel;
  /** Relative share of the block budget. */
  weight: number;
}

const WALK_EASY: Segment = {
  name: 'Easy walk',
  instructions: 'Walk at a pace where talking stays completely easy. Let the breath settle.',
  cues: ['Relaxed shoulders', 'Steady breathing', 'Conversational the whole way'],
  effort: 'easy',
  weight: 2
};

const WALK_BRISK: Segment = {
  name: 'Brisk walk',
  instructions: 'Pick the pace up to purposeful but comfortable. Short, quick steps and a relaxed arm swing.',
  cues: ['Short, quick steps', 'Breathing deeper but controlled', 'Ease off any time'],
  effort: 'moderate',
  weight: 3
};

const WALK_RECOVER: Segment = {
  name: 'Recovery walk',
  instructions: 'Slow right down and let the breath come back before the next effort.',
  cues: ['Shoulders drop', 'Let the breath settle', 'No rush at all'],
  effort: 'easy',
  weight: 2
};

const JOG_EASY: Segment = {
  name: 'Easy jog',
  instructions: 'Jog gently at a pace you could hold a conversation at. March briskly instead if jogging is not for you today.',
  cues: ['Land softly', 'Keep it conversational', 'Walk whenever you want to'],
  effort: 'easy',
  weight: 3
};

const JOG_STEADY: Segment = {
  name: 'Steady run',
  instructions: 'Settle into a controlled, purposeful effort you could sustain for the whole block.',
  cues: ['Controlled, not racing', 'Relaxed hands and jaw', 'Back off if the breathing gets ragged'],
  effort: 'moderate',
  weight: 4
};

const RUN_INTERVAL: Segment = {
  name: 'Controlled interval',
  instructions: 'Lift to a strong but repeatable effort for the whole interval. This is never an all-out sprint.',
  cues: ['Smooth, tall running', 'Repeatable, not maximal', 'Back off if form falls apart'],
  effort: 'hard',
  weight: 3
};

/**
 * The interval pattern for a level and effort ceiling. `gentle` keeps everyone
 * on walking, whatever their level, which is what a low-energy or sore day
 * should feel like.
 */
function pattern(level: Level, gentle: boolean, variant: number): Segment[] {
  if (gentle) return [WALK_EASY, WALK_BRISK, WALK_EASY, WALK_BRISK, WALK_EASY];

  const byLevel: Record<Level, Segment[][]> = {
    // Walk first, then walk/run intervals, then a longer easy jog as it builds.
    new: [
      [WALK_BRISK, JOG_EASY, WALK_RECOVER, JOG_EASY, WALK_RECOVER, JOG_EASY, WALK_EASY],
      [WALK_BRISK, WALK_BRISK, JOG_EASY, WALK_RECOVER, JOG_EASY, WALK_EASY]
    ],
    occasional: [
      [JOG_EASY, JOG_STEADY, WALK_RECOVER, JOG_STEADY, WALK_RECOVER, JOG_EASY],
      [JOG_EASY, JOG_EASY, WALK_RECOVER, JOG_STEADY, JOG_EASY]
    ],
    regular: [
      [JOG_EASY, JOG_STEADY, WALK_RECOVER, RUN_INTERVAL, WALK_RECOVER, RUN_INTERVAL, WALK_RECOVER, JOG_EASY],
      [JOG_EASY, JOG_STEADY, JOG_STEADY, WALK_RECOVER, RUN_INTERVAL, WALK_RECOVER, JOG_EASY]
    ]
  };

  const options = byLevel[level];
  return options[Math.abs(variant) % options.length];
}

/**
 * Builds the main run/walk block so the segments fill `totalSeconds` exactly.
 * Short budgets drop segments rather than squeezing them below a usable length.
 */
export function buildRunWalkBlocks(options: {
  level: Level;
  gentle: boolean;
  totalSeconds: number;
  variant: number;
  idPrefix: string;
}): SessionBlock[] {
  const {level, gentle, totalSeconds, variant, idPrefix} = options;
  let segments = pattern(level, gentle, variant);

  // Every interval needs to be long enough to be worth switching gear for.
  const MIN_SEGMENT = 45;
  while (segments.length > 2 && segments.length * MIN_SEGMENT > totalSeconds) {
    segments = segments.slice(0, segments.length - 1);
  }

  const seconds = allocate(
    totalSeconds,
    segments.map(segment => segment.weight),
    5,
    Math.min(MIN_SEGMENT, Math.floor(totalSeconds / segments.length / 5) * 5)
  );

  return segments.map((segment, index) => ({
    id: `${idPrefix}-${index}`,
    kind: 'exercise' as const,
    phase: 'move' as const,
    name: segment.name,
    instructions: segment.instructions,
    cues: segment.cues,
    seconds: seconds[index],
    mode: 'time' as const,
    effort: segment.effort,
    effortNote: RPE_NOTES[segment.effort],
    nextName: segments[index + 1]?.name
  }));
}
