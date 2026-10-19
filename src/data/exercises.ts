// Exercise library. Everything here is general wellness movement: no clinical
// claims, no diagnosis, no rehabilitation protocols. Wording stays permissive
// ("as far as is comfortable", "rest whenever you need") on purpose.

import {Equipment, Focus, Level, Phase} from '../types';

export interface Exercise {
  id: string;
  title: string;
  instruction: string;
  cues: string[];
  phase: Phase;
  /** Modalities this movement belongs to. */
  focus: Focus[];
  /** Experience levels the movement is appropriate for. */
  levels: Level[];
  /** Minimum equipment the movement needs. */
  requires: Equipment;
  /** True when the movement can be done seated or lying still. */
  sedentary?: boolean;
}

/** Equipment a selection unlocks. Picking dumbbells implies a mat is around. */
export const EQUIPMENT_CHAIN: Record<Equipment, Equipment[]> = {
  none: ['none'],
  mat: ['none', 'mat'],
  dumbbells: ['none', 'mat', 'dumbbells']
};

export const WARMUPS: Exercise[] = [
  {
    id: 'warm-breath-reset',
    title: 'Settle and breathe',
    instruction: 'Stand or sit tall. Breathe in through the nose for four counts, out for six. Let the shoulders drop on each exhale.',
    cues: ['Unclench the jaw', 'Longer out-breath than in-breath', 'Nothing to achieve yet'],
    phase: 'warmup',
    focus: ['balanced', 'calisthenics', 'running', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'warm-joint-circles',
    title: 'Wake the joints',
    instruction: 'Slow circles through ankles, hips, shoulders and neck. Small at first, a little wider only if it feels easy.',
    cues: ['Smooth, unhurried circles', 'Both directions', 'Stay inside a comfortable range'],
    phase: 'warmup',
    focus: ['balanced', 'calisthenics', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'warm-march',
    title: 'Easy march',
    instruction: 'March on the spot, arms swinging naturally. Build from a stroll to a brisk pace you could talk through.',
    cues: ['Light, quiet feet', 'Breathe through the nose if you can', 'Talkable pace only'],
    phase: 'warmup',
    focus: ['balanced', 'running', 'calisthenics'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'warm-reach-roll',
    title: 'Reach and roll down',
    instruction: 'Reach both arms overhead, then roll slowly down towards the floor, knees soft. Roll back up one segment at a time.',
    cues: ['Knees stay soft', 'Go only as far as is comfortable', 'Exhale on the way down'],
    phase: 'warmup',
    focus: ['mobility', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  }
];

export const MAIN: Exercise[] = [
  // ——— Calisthenics / everyday strength ———
  {
    id: 'main-squat',
    title: 'Sit-to-stand squats',
    instruction: 'Stand in front of a chair. Sit back towards it, tap lightly, and stand tall. Use the chair fully if you prefer.',
    cues: ['Weight through the whole foot', 'Chest stays open', 'Stand to full height'],
    phase: 'main',
    focus: ['calisthenics', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-incline-push',
    title: 'Incline push-ups',
    instruction: 'Hands on a counter, table or wall. Lower the chest towards your hands, then press away. Raise the surface to make it easier.',
    cues: ['Body in one long line', 'Elbows track back, not flared', 'Breathe out as you press'],
    phase: 'main',
    focus: ['calisthenics', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-hip-hinge',
    title: 'Hip hinge',
    instruction: 'Feet hip-width, hands on the hips. Push the hips back with a long spine, feel the back of the legs, then stand.',
    cues: ['Hips move back, not down', 'Long spine throughout', 'Small range is plenty'],
    phase: 'main',
    focus: ['calisthenics', 'balanced', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-split-squat',
    title: 'Supported split squat',
    instruction: 'One foot forward, one back, fingertips on a wall for balance. Lower the back knee towards the floor, then press up.',
    cues: ['Front heel stays down', 'Use the wall as much as you like', 'Swap sides halfway'],
    phase: 'main',
    focus: ['calisthenics'],
    levels: ['intermediate'],
    requires: 'none'
  },
  {
    id: 'main-glute-bridge',
    title: 'Glute bridge',
    instruction: 'Lie on your back, knees bent, feet flat. Press through the feet to lift the hips, pause, lower slowly.',
    cues: ['Ribs stay down', 'Squeeze at the top', 'Lower under control'],
    phase: 'main',
    focus: ['calisthenics', 'balanced', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'mat'
  },
  {
    id: 'main-dead-bug',
    title: 'Dead bug',
    instruction: 'On your back, knees over hips. Extend one arm and the opposite leg away, then return. Alternate slowly.',
    cues: ['Low back stays heavy', 'Breathe out as you extend', 'Slower is harder'],
    phase: 'main',
    focus: ['calisthenics', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'mat'
  },
  {
    id: 'main-dumbbell-row',
    title: 'Dumbbell row',
    instruction: 'Hinge forward with a dumbbell in each hand. Draw the elbows back towards the hips, then lower with control.',
    cues: ['Shoulders away from the ears', 'Lower slower than you lift', 'Neck stays long'],
    phase: 'main',
    focus: ['calisthenics', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'dumbbells'
  },
  {
    id: 'main-dumbbell-press',
    title: 'Dumbbell overhead press',
    instruction: 'Stand tall, dumbbells at the shoulders. Press overhead without arching the back, then lower slowly.',
    cues: ['Ribs stacked over hips', 'Press, do not lean', 'Light weight is fine'],
    phase: 'main',
    focus: ['calisthenics'],
    levels: ['intermediate'],
    requires: 'dumbbells'
  },
  {
    id: 'main-dumbbell-carry',
    title: 'Suitcase carry',
    instruction: 'Hold one dumbbell at your side and walk, or stand still if space is tight. Stay level through the shoulders, then swap hands.',
    cues: ['Stand tall, do not lean', 'Slow breathing', 'Swap sides halfway'],
    phase: 'main',
    focus: ['calisthenics', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'dumbbells'
  },

  // ——— Run + walk (time based, no GPS, no pace targets) ———
  {
    id: 'main-walk-easy',
    title: 'Easy walk block',
    instruction: 'Walk at a pace where talking is easy. Indoors on the spot works just as well as outdoors.',
    cues: ['Relaxed shoulders', 'Steady nose breathing', 'Conversational effort'],
    phase: 'main',
    focus: ['running', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-brisk-walk',
    title: 'Brisk walk block',
    instruction: 'Pick the pace up to purposeful but comfortable. Arms swing, steps shorten and quicken slightly.',
    cues: ['Short, quick steps', 'Breathing deeper but controlled', 'Ease off any time'],
    phase: 'main',
    focus: ['running'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-jog-interval',
    title: 'Light jog interval',
    instruction: 'Jog gently, or march quickly if jogging is not for you today. Let the effort stay at a level you could sustain.',
    cues: ['Land softly', 'Keep it conversational', 'Walk whenever you want to'],
    phase: 'main',
    focus: ['running'],
    levels: ['intermediate'],
    requires: 'none'
  },
  {
    id: 'main-walk-recover',
    title: 'Recovery walk',
    instruction: 'Slow right down and let the breath settle before the next block.',
    cues: ['Shoulders drop', 'Let the breath come back', 'No rush at all'],
    phase: 'main',
    focus: ['running', 'balanced', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },

  // ——— Mobility ———
  {
    id: 'main-cat-cow',
    title: 'Cat–cow',
    instruction: 'On hands and knees, or seated. Round the back as you breathe out, open the chest as you breathe in.',
    cues: ['Let the breath lead', 'Move through the whole spine', 'Small range is enough'],
    phase: 'main',
    focus: ['mobility', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'mat'
  },
  {
    id: 'main-hip-opener',
    title: 'Kneeling hip opener',
    instruction: 'From a half-kneeling position, shift gently forward until you feel a light stretch at the front of the hip. Swap sides halfway.',
    cues: ['Tuck the tailbone slightly', 'Light stretch, never sharp', 'Breathe into it'],
    phase: 'main',
    focus: ['mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'mat'
  },
  {
    id: 'main-thoracic-rotation',
    title: 'Seated spine rotation',
    instruction: 'Sit tall, hands crossed at the chest. Turn slowly to one side as you breathe out, return, then the other side.',
    cues: ['Lead with the ribs, not the neck', 'Exhale into the turn', 'Stay comfortable'],
    phase: 'main',
    focus: ['mobility', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'main-standing-hamstring',
    title: 'Standing hamstring float',
    instruction: 'Heel on a low step, hips back with a long spine until you feel the back of the leg. Hold softly, then swap.',
    cues: ['Long spine', 'Soft knee', 'A stretch, not a strain'],
    phase: 'main',
    focus: ['mobility', 'running'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-shoulder-opener',
    title: 'Doorway chest opener',
    instruction: 'Forearm on a doorframe, step through gently until the chest opens. Hold, breathe, then swap sides.',
    cues: ['Shoulder stays below ear height', 'Easy, even breathing', 'Back off if it pinches'],
    phase: 'main',
    focus: ['mobility', 'balanced'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'main-ankle-mobility',
    title: 'Ankle rocks',
    instruction: 'In a split stance, rock the front knee gently forward over the toes and back, heel staying down.',
    cues: ['Heel stays down', 'Small, smooth rocks', 'Swap sides halfway'],
    phase: 'main',
    focus: ['mobility', 'running'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  }
];

export const COOLDOWNS: Exercise[] = [
  {
    id: 'cool-forward-fold',
    title: 'Easy forward fold',
    instruction: 'Stand or sit, let the upper body hang forward with knees soft. Breathe slowly and let the neck relax.',
    cues: ['Knees soft', 'Heavy head and arms', 'Slow, quiet breath'],
    phase: 'cooldown',
    focus: ['balanced', 'calisthenics', 'running', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none'
  },
  {
    id: 'cool-figure-four',
    title: 'Seated figure four',
    instruction: 'Sitting, cross one ankle over the opposite knee and lean forward gently. Hold, breathe, then swap sides.',
    cues: ['Lean from the hips', 'Light stretch only', 'Swap sides halfway'],
    phase: 'cooldown',
    focus: ['balanced', 'calisthenics', 'running', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'cool-long-exhale',
    title: 'Long exhale close',
    instruction: 'Sit or lie comfortably. Breathe in for four, out for six or eight. Notice that you showed up today.',
    cues: ['Let the exhale stretch out', 'Soften the face', 'Nothing left to do'],
    phase: 'cooldown',
    focus: ['balanced', 'calisthenics', 'running', 'mobility'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  }
];

/**
 * Mindfulness-only sequence. Used for the mindful modality and — importantly —
 * whenever pain or injury is reported, where no exercise instruction is given.
 * Every step is seated or lying and carries no movement load.
 */
export const MINDFUL: Exercise[] = [
  {
    id: 'mind-arrive',
    title: 'Arrive',
    instruction: 'Sit or lie somewhere comfortable. Let the body be supported and simply notice that you are here.',
    cues: ['No position to hold', 'Eyes open or closed', 'Nothing to fix'],
    phase: 'mindful',
    focus: ['mindful'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'mind-breath-count',
    title: 'Counted breathing',
    instruction: 'Breathe in for four counts, out for six. If counting feels fussy, just let the out-breath be the longer one.',
    cues: ['Breath stays gentle', 'Longer out-breath', 'Begin again whenever you drift'],
    phase: 'mindful',
    focus: ['mindful'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'mind-body-scan',
    title: 'Body scan',
    instruction: 'Move your attention slowly from the feet to the head. Notice what each area feels like without trying to change it.',
    cues: ['Noticing, not fixing', 'Slow and unhurried', 'Skip anywhere you prefer not to visit'],
    phase: 'mindful',
    focus: ['mindful'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'mind-soften',
    title: 'Soften and settle',
    instruction: 'Let the jaw, shoulders and hands be heavy. Stay with the feeling of being supported for a few breaths.',
    cues: ['Heavy hands', 'Loose jaw', 'Let the floor hold you'],
    phase: 'mindful',
    focus: ['mindful'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  },
  {
    id: 'mind-close',
    title: 'Close kindly',
    instruction: 'Take one slower breath and notice one thing that feels even slightly better than when you started.',
    cues: ['One slow breath', 'No scoring yourself', 'That was enough'],
    phase: 'mindful',
    focus: ['mindful'],
    levels: ['beginner', 'intermediate'],
    requires: 'none',
    sedentary: true
  }
];

export const ALL_EXERCISES: Exercise[] = [...WARMUPS, ...MAIN, ...COOLDOWNS, ...MINDFUL];

export function availableEquipment(equipment: Equipment): Equipment[] {
  return EQUIPMENT_CHAIN[equipment];
}

/** Filters a pool down to what the profile can safely and sensibly do. */
export function selectPool(
  pool: Exercise[],
  options: {focus: Focus; level: Level; equipment: Equipment; sedentaryOnly?: boolean}
): Exercise[] {
  const allowed = availableEquipment(options.equipment);
  return pool.filter(exercise => {
    if (!exercise.focus.includes(options.focus)) return false;
    if (!exercise.levels.includes(options.level)) return false;
    if (!allowed.includes(exercise.requires)) return false;
    if (options.sedentaryOnly && !exercise.sedentary) return false;
    return true;
  });
}
