// The movement library.
//
// Everything here is general wellness movement: no clinical claims, no
// diagnosis, no rehabilitation protocols. Wording stays permissive on purpose
// ("as far as is comfortable", "rest whenever you need"), and every movement
// carries a regression so a harder option always has an easier door.
//
// `equipment` lists what a movement REQUIRES. An empty array means bodyweight
// only. The engine gates on this, so a movement is never offered to someone who
// does not have the kit for it.

import {Exercise, EquipmentId, Level, SPACE_ORDER, SpaceNeed} from '../types';

/** Owning one of these implies the others are on hand. */
const EQUIPMENT_IMPLIES: Partial<Record<EquipmentId, EquipmentId[]>> = {
  'full-gym': ['bodyweight', 'dumbbells', 'kettlebells', 'bands', 'pullup-bar']
};

/** Expands a selection into everything it unlocks. Bodyweight is always on. */
export function expandEquipment(selected: EquipmentId[]): Set<EquipmentId> {
  const out = new Set<EquipmentId>(['bodyweight']);
  for (const item of selected) {
    out.add(item);
    for (const implied of EQUIPMENT_IMPLIES[item] ?? []) out.add(implied);
  }
  return out;
}

/** The highest movement difficulty a level should be offered. */
export const MAX_DIFFICULTY: Record<Level, 1 | 2 | 3> = {
  new: 1,
  occasional: 2,
  regular: 3
};

// ——— Warm-ups ——————————————————————————————————————————————————————————

export const WARMUPS: Exercise[] = [
  {
    id: 'wu-settle-breathe',
    name: 'Settle and breathe',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Stand or sit tall. Breathe in through the nose for four counts and out for six. Let the shoulders drop on each exhale.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Unclench the jaw', 'Longer out-breath than in-breath', 'Nothing to achieve yet'],
    regression: 'Sit or lie down and simply notice the breath without counting.',
    progression: 'Lengthen the exhale to eight counts.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'wu-joint-circles',
    name: 'Joint circles',
    category: 'warmup',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Slow circles through ankles, hips, shoulders and neck. Start small and widen only if it feels easy.',
    mode: 'time',
    duration: 60,
    rest: 0,
    cues: ['Smooth, unhurried circles', 'Both directions', 'Stay inside a comfortable range'],
    regression: 'Do the upper body only, seated.',
    progression: 'Add a slow shift of weight between feet as you circle.',
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'wu-easy-march',
    name: 'Easy march',
    category: 'warmup',
    movementPattern: 'gait',
    difficulty: 1,
    equipment: [],
    instructions: 'March on the spot with arms swinging naturally. Build from a stroll to a brisk pace you could still talk through.',
    mode: 'time',
    duration: 60,
    rest: 0,
    cues: ['Light, quiet feet', 'Relaxed arms', 'Talkable pace only'],
    regression: 'March seated, lifting one heel at a time.',
    progression: 'Lift the knees a little higher as you warm up.',
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'wu-reach-roll',
    name: 'Reach and roll down',
    category: 'warmup',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Reach both arms overhead, then roll slowly down towards the floor with soft knees. Roll back up one segment at a time.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Knees stay soft', 'Only as far as is comfortable', 'Exhale on the way down'],
    regression: 'Slide the hands down the thighs instead of reaching for the floor.',
    progression: 'Pause at the bottom for two slow breaths.',
    space: 'standing',
    effort: 'easy'
  },
  {
    id: 'wu-hip-openers',
    name: 'Standing hip openers',
    category: 'warmup',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Hold a wall for balance. Lift one knee and draw slow circles with it, opening the hip. Swap sides halfway.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Use the wall as much as you like', 'Small circles first', 'Stand tall through the spine'],
    regression: 'Keep the toes lightly on the floor and trace small circles.',
    progression: 'Let go of the wall to add a balance element.',
    perSide: true,
    space: 'standing',
    effort: 'easy'
  },
  {
    id: 'wu-torso-twists',
    name: 'Easy torso twists',
    category: 'warmup',
    movementPattern: 'rotation',
    difficulty: 1,
    equipment: [],
    instructions: 'Feet hip-width, knees soft. Let the arms swing loosely around the body as you turn side to side.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Let the arms be heavy', 'Turn from the ribs', 'Keep the neck relaxed'],
    regression: 'Turn with the hands resting on the chest.',
    progression: 'Add a slow heel lift on each turn.',
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'wu-squat-to-stand',
    name: 'Squat to stand',
    category: 'warmup',
    movementPattern: 'squat',
    difficulty: 2,
    equipment: [],
    instructions: 'Hinge forward, hold behind the calves, then sink the hips down and lift the chest. Stand up tall and repeat.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Go only as low as is comfortable', 'Lift the chest at the bottom', 'Move slowly'],
    regression: 'Hold a chair and sit down a short way instead.',
    progression: 'Reach one arm overhead at the bottom.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'wu-leg-swings',
    name: 'Leg swings',
    category: 'warmup',
    movementPattern: 'gait',
    difficulty: 2,
    equipment: [],
    instructions: 'Hold a wall and swing one leg gently forwards and back, staying within an easy range. Swap sides halfway.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Relaxed, pendulum swing', 'Stand tall', 'Small range is plenty'],
    regression: 'March on the spot instead.',
    progression: 'Add side-to-side swings after the forward ones.',
    perSide: true,
    space: 'standing',
    effort: 'easy'
  }
];

// ——— Bodyweight lower body ——————————————————————————————————————————————

export const LOWER: Exercise[] = [
  {
    id: 'chair-squat',
    name: 'Chair squat',
    category: 'lower',
    movementPattern: 'squat',
    difficulty: 1,
    equipment: [],
    instructions: 'Stand in front of a chair. Sit back until you touch it lightly, then stand tall. Sit down fully whenever you prefer.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 30,
    cues: ['Weight through the whole foot', 'Chest stays open', 'Stand to full height'],
    regression: 'Sit all the way down and stand up using your hands on the thighs.',
    progression: 'Hover just above the seat instead of touching it.',
    space: 'standing',
    discreet: true,
    effort: 'moderate'
  },
  {
    id: 'air-squat',
    name: 'Air squat',
    category: 'lower',
    movementPattern: 'squat',
    difficulty: 2,
    equipment: [],
    instructions: 'Feet about shoulder-width. Sit the hips back and down as far as is comfortable, then drive up through the whole foot.',
    mode: 'reps',
    reps: '10–15 reps',
    rest: 30,
    cues: ['Knees track over the toes', 'Chest up', 'Breathe out as you stand'],
    regression: 'Use a chair behind you as a depth target.',
    progression: 'Pause for two seconds at the bottom of each rep.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'reverse-lunge',
    name: 'Reverse lunge',
    category: 'lower',
    movementPattern: 'lunge',
    difficulty: 2,
    equipment: [],
    instructions: 'Step one foot back and lower the back knee towards the floor. Press through the front foot to return. Alternate sides.',
    mode: 'reps',
    reps: '6–10 reps per side',
    rest: 35,
    cues: ['Step back, not down', 'Front heel stays planted', 'Fingertips on a wall if you want balance'],
    regression: 'Hold a wall or chair and shorten the step.',
    progression: 'Pause at the bottom before pressing back up.',
    perSide: true,
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'split-squat',
    name: 'Split squat',
    category: 'lower',
    movementPattern: 'lunge',
    difficulty: 3,
    equipment: [],
    instructions: 'Set up in a staggered stance. Lower the back knee straight down, then press back up. Finish all reps before swapping sides.',
    mode: 'reps',
    reps: '6–10 reps per side',
    rest: 40,
    cues: ['Front heel stays down', 'Torso stays tall', 'Swap sides halfway'],
    regression: 'Hold a wall and reduce the depth.',
    progression: 'Elevate the back foot on a low step.',
    perSide: true,
    space: 'standing',
    effort: 'hard'
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridge',
    category: 'lower',
    movementPattern: 'hinge',
    difficulty: 1,
    equipment: [],
    instructions: 'Lie on your back with knees bent and feet flat. Press through the feet to lift the hips, pause, then lower slowly.',
    mode: 'reps',
    reps: '10–15 reps',
    rest: 30,
    cues: ['Ribs stay down', 'Squeeze at the top', 'Lower under control'],
    regression: 'Lift only a few centimetres and hold briefly.',
    progression: 'Hold the top position for three seconds each rep.',
    gentle: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'hip-hinge',
    name: 'Hip hinge',
    category: 'lower',
    movementPattern: 'hinge',
    difficulty: 1,
    equipment: [],
    instructions: 'Feet hip-width, hands on the hips. Push the hips back with a long spine until you feel the back of the legs, then stand.',
    mode: 'reps',
    reps: '10–12 reps',
    rest: 30,
    cues: ['Hips move back, not down', 'Long spine throughout', 'A small range is plenty'],
    regression: 'Hinge with your back lightly against a wall for feedback.',
    progression: 'Slow the lowering phase to three seconds.',
    space: 'standing',
    effort: 'easy'
  },
  {
    id: 'calf-raise',
    name: 'Calf raise',
    category: 'lower',
    movementPattern: 'balance',
    difficulty: 1,
    equipment: [],
    instructions: 'Stand tall, fingertips on a wall. Rise onto the balls of the feet, pause, then lower slowly.',
    mode: 'reps',
    reps: '12–20 reps',
    rest: 25,
    cues: ['Rise all the way up', 'Lower slowly', 'Use the wall for balance only'],
    regression: 'Hold a chair with both hands.',
    progression: 'Perform one leg at a time.',
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'single-leg-balance',
    name: 'Single-leg balance',
    category: 'lower',
    movementPattern: 'balance',
    difficulty: 1,
    equipment: [],
    instructions: 'Stand on one foot near a wall. Hold steady and breathe. Swap sides halfway through the block.',
    mode: 'time',
    duration: 40,
    rest: 20,
    cues: ['Fix your eyes on one point', 'Soft knee', 'Touch the wall whenever you need'],
    regression: 'Keep the toes of the other foot lightly on the floor.',
    progression: 'Try it with the eyes closed, next to a wall.',
    perSide: true,
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'deep-squat-hold',
    name: 'Deep squat hold',
    category: 'mobility',
    movementPattern: 'squat',
    difficulty: 2,
    equipment: [],
    instructions: 'Lower into the deepest squat that stays comfortable, holding a doorframe for support. Breathe slowly and let the hips settle.',
    mode: 'time',
    duration: 45,
    rest: 20,
    cues: ['Hold support as much as you like', 'Heels down if they reach', 'Breathe into the position'],
    regression: 'Sit on a low box or step instead.',
    progression: 'Let go of the support and rest the elbows inside the knees.',
    space: 'standing',
    effort: 'moderate'
  }
];

// ——— Bodyweight pushing —————————————————————————————————————————————————

export const PUSH: Exercise[] = [
  {
    id: 'wall-push-up',
    name: 'Wall push-up',
    category: 'push',
    movementPattern: 'push',
    difficulty: 1,
    equipment: [],
    instructions: 'Hands on a wall at chest height. Lower the chest towards the wall, then press away. Step further back to make it harder.',
    mode: 'reps',
    reps: '10–15 reps',
    rest: 25,
    cues: ['Body in one long line', 'Elbows track back', 'Breathe out as you press'],
    regression: 'Stand closer to the wall.',
    progression: 'Step the feet back a little further.',
    space: 'standing',
    effort: 'easy'
  },
  {
    id: 'incline-push-up',
    name: 'Incline push-up',
    category: 'push',
    movementPattern: 'push',
    difficulty: 1,
    equipment: [],
    instructions: 'Hands on a counter or sturdy table. Lower the chest towards your hands, then press away. A higher surface is easier.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 30,
    cues: ['One long line from head to heels', 'Elbows at about 45 degrees', 'Full press at the top'],
    regression: 'Use a higher surface, or a wall.',
    progression: 'Use a lower surface such as a sturdy chair.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'knee-push-up',
    name: 'Knee push-up',
    category: 'push',
    movementPattern: 'push',
    difficulty: 2,
    equipment: [],
    instructions: 'From your knees with the hips in line with the shoulders, lower the chest towards the floor and press back up.',
    mode: 'reps',
    reps: '6–12 reps',
    rest: 35,
    cues: ['Hips stay in line, not piked', 'Lower under control', 'Cushion the knees if needed'],
    regression: 'Move to an incline push-up.',
    progression: 'Take the knees off the floor for the last few reps.',
    space: 'floor',
    effort: 'moderate'
  },
  {
    id: 'push-up',
    name: 'Push-up',
    category: 'push',
    movementPattern: 'push',
    difficulty: 3,
    equipment: [],
    instructions: 'From a plank position, lower the chest towards the floor with the elbows tracking back, then press away.',
    mode: 'reps',
    reps: '5–12 reps',
    rest: 45,
    cues: ['Squeeze the glutes to hold the line', 'Elbows back, not flared', 'Stop a rep short of failing'],
    regression: 'Drop to the knees or raise the hands to an incline.',
    progression: 'Slow the lowering phase to three seconds.',
    space: 'floor',
    effort: 'hard'
  },
  {
    id: 'pike-push-up',
    name: 'Pike push-up',
    category: 'push',
    movementPattern: 'push',
    difficulty: 3,
    equipment: [],
    instructions: 'From a downward-facing position with hips high, bend the elbows to lower the head towards the floor, then press up.',
    mode: 'reps',
    reps: '5–10 reps',
    rest: 45,
    cues: ['Hips stay high', 'Lower slowly', 'Keep the neck long'],
    regression: 'Put the hands on a raised surface to reduce the load.',
    progression: 'Elevate the feet on a low step.',
    contraindicationNotes: 'Skip this if having the head below the heart feels uncomfortable.',
    space: 'floor',
    effort: 'hard'
  }
];

// ——— Bodyweight pulling (bar-gated where appropriate) ————————————————————

export const PULL: Exercise[] = [
  {
    id: 'dead-hang',
    name: 'Dead hang',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 2,
    equipment: ['pullup-bar'],
    instructions: 'Hang from the bar with straight arms and relaxed shoulders. Keep the feet on the floor to take weight off if you need.',
    mode: 'time',
    duration: 25,
    rest: 45,
    cues: ['Breathe steadily', 'Let the shoulders rise naturally', 'Come down before the grip fails'],
    regression: 'Keep both feet on the ground and take only some of your weight.',
    progression: 'Build the hang a few seconds at a time.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'scapular-pull',
    name: 'Scapular pull',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 2,
    equipment: ['pullup-bar'],
    instructions: 'Hanging with straight arms, draw the shoulder blades down and together to lift your body slightly, then release.',
    mode: 'reps',
    reps: '5–8 reps',
    rest: 45,
    cues: ['Arms stay straight', 'Small, controlled movement', 'Shoulders away from the ears'],
    regression: 'Keep the feet on the floor and take some weight.',
    progression: 'Pause for two seconds at the top of each rep.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'assisted-pull-up',
    name: 'Assisted pull-up',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 2,
    equipment: ['pullup-bar'],
    instructions: 'With feet on a chair or a band under the feet, pull the chest towards the bar using as little leg help as you need.',
    mode: 'reps',
    reps: '4–8 reps',
    rest: 60,
    cues: ['Lead with the elbows', 'Chest towards the bar', 'Lower with control'],
    regression: 'Use more help from the legs or band.',
    progression: 'Reduce the assistance a little each session.',
    space: 'standing',
    effort: 'hard'
  },
  {
    id: 'negative-pull-up',
    name: 'Negative pull-up',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 3,
    equipment: ['pullup-bar'],
    instructions: 'Start at the top of the bar using a step, then lower yourself as slowly as you can. Step back up to reset.',
    mode: 'reps',
    reps: '3–5 reps',
    rest: 60,
    cues: ['Aim for a three to five second lower', 'Shoulders stay engaged', 'Reset between reps'],
    regression: 'Shorten the lower and use the step sooner.',
    progression: 'Extend the lowering to six seconds.',
    space: 'standing',
    effort: 'hard'
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 3,
    equipment: ['pullup-bar'],
    instructions: 'From a full hang, pull until the chin passes the bar, then lower all the way down under control.',
    mode: 'reps',
    reps: '3–8 reps',
    rest: 75,
    cues: ['Full range, top to bottom', 'Lead with the elbows', 'Stop a rep short of failing'],
    regression: 'Switch to assisted pull-ups or negatives.',
    progression: 'Add a two-second pause at the top.',
    space: 'standing',
    effort: 'hard'
  }
];

// ——— Core ——————————————————————————————————————————————————————————————

export const CORE: Exercise[] = [
  {
    id: 'dead-bug',
    name: 'Dead bug',
    category: 'core',
    movementPattern: 'core',
    difficulty: 1,
    equipment: [],
    instructions: 'On your back with knees over hips, extend one arm and the opposite leg away, then return. Alternate slowly.',
    mode: 'reps',
    reps: '6–10 reps per side',
    rest: 30,
    cues: ['Low back stays heavy', 'Breathe out as you extend', 'Slower is harder'],
    regression: 'Move the legs only, keeping the arms by your sides.',
    progression: 'Extend further and move more slowly.',
    perSide: true,
    gentle: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    category: 'core',
    movementPattern: 'core',
    difficulty: 1,
    equipment: [],
    instructions: 'On hands and knees, reach one arm forward and the opposite leg back. Hold briefly, return, then swap.',
    mode: 'reps',
    reps: '6–10 reps per side',
    rest: 30,
    cues: ['Keep the hips level', 'Reach long rather than high', 'Steady breathing'],
    regression: 'Extend the arm only, then the leg only.',
    progression: 'Hold each position for five seconds.',
    perSide: true,
    gentle: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    movementPattern: 'core',
    difficulty: 2,
    equipment: [],
    instructions: 'On forearms and toes, hold one straight line from head to heels. Breathe steadily throughout.',
    mode: 'time',
    duration: 30,
    rest: 35,
    cues: ['Squeeze the glutes', 'Hips level with the shoulders', 'Stop when the form slips'],
    regression: 'Drop to the knees, or put the forearms on a raised surface.',
    progression: 'Add ten seconds to the hold.',
    space: 'floor',
    effort: 'moderate'
  },
  {
    id: 'side-plank',
    name: 'Side plank',
    category: 'core',
    movementPattern: 'core',
    difficulty: 2,
    equipment: [],
    instructions: 'On one forearm with the body in a straight line, lift the hips. Hold, then swap sides halfway through the block.',
    mode: 'time',
    duration: 25,
    rest: 35,
    cues: ['Stack the shoulders', 'Hips lifted and level', 'Swap sides halfway'],
    regression: 'Bend the knees and hold from there.',
    progression: 'Straighten the top arm towards the ceiling.',
    perSide: true,
    space: 'floor',
    effort: 'moderate'
  },
  {
    id: 'bear-hold',
    name: 'Bear hold',
    category: 'core',
    movementPattern: 'core',
    difficulty: 3,
    equipment: [],
    instructions: 'From hands and knees, lift the knees a couple of centimetres off the floor and hold, keeping the back flat.',
    mode: 'time',
    duration: 25,
    rest: 40,
    cues: ['Knees hover, nothing more', 'Back stays flat', 'Breathe through it'],
    regression: 'Hold hands and knees without lifting.',
    progression: 'Add a slow hand lift, alternating sides.',
    space: 'floor',
    effort: 'hard'
  },
  {
    id: 'mountain-climber',
    name: 'Mountain climber',
    category: 'cardio',
    movementPattern: 'core',
    difficulty: 3,
    equipment: [],
    instructions: 'From a plank, draw one knee towards the chest and swap, at a pace you can keep smooth and controlled.',
    mode: 'time',
    duration: 30,
    rest: 40,
    cues: ['Hips stay low', 'Steady rhythm over speed', 'Ease off any time'],
    regression: 'Put the hands on a raised surface and slow the pace.',
    progression: 'Hold the pace for an extra fifteen seconds.',
    space: 'floor',
    impact: true,
    effort: 'hard'
  },
  {
    id: 'superman',
    name: 'Superman',
    category: 'core',
    movementPattern: 'core',
    difficulty: 1,
    equipment: [],
    instructions: 'Lie face down and lift the chest, arms and legs a small way off the floor. Hold briefly, then lower.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 30,
    cues: ['A small lift is enough', 'Keep the neck long', 'Lower slowly'],
    regression: 'Lift the chest only, leaving the legs down.',
    progression: 'Hold each lift for three seconds.',
    gentle: true,
    space: 'floor',
    effort: 'easy'
  }
];

// ——— Dumbbell ———————————————————————————————————————————————————————————

export const DUMBBELL: Exercise[] = [
  {
    id: 'db-goblet-squat',
    name: 'Goblet squat',
    category: 'lower',
    movementPattern: 'squat',
    difficulty: 2,
    equipment: ['dumbbells'],
    instructions: 'Hold one dumbbell at chest height. Sit the hips back and down as far as is comfortable, then stand tall.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 45,
    cues: ['Elbows inside the knees', 'Chest stays tall', 'A lighter weight is always fine'],
    regression: 'Drop the weight and do an air squat.',
    progression: 'Pause for two seconds at the bottom.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'db-romanian-deadlift',
    name: 'Dumbbell Romanian deadlift',
    category: 'lower',
    movementPattern: 'hinge',
    difficulty: 2,
    equipment: ['dumbbells'],
    instructions: 'Dumbbells in front of the thighs. Push the hips back with a long spine, lowering the weights down the legs, then stand.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 45,
    cues: ['Weights stay close to the legs', 'Long spine throughout', 'Stop where the stretch begins'],
    regression: 'Do the movement without weight first.',
    progression: 'Slow the lowering phase to three seconds.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'db-row',
    name: 'Dumbbell row',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 1,
    equipment: ['dumbbells'],
    instructions: 'Hinge forward with support from a chair. Draw the elbow back towards the hip, then lower with control. Swap sides halfway.',
    mode: 'reps',
    reps: '8–12 reps per side',
    rest: 40,
    cues: ['Shoulders away from the ears', 'Lower slower than you lift', 'Neck stays long'],
    regression: 'Use a lighter weight and support the other hand on a chair.',
    progression: 'Pause for a second at the top of each rep.',
    perSide: true,
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'db-floor-press',
    name: 'Dumbbell floor press',
    category: 'push',
    movementPattern: 'push',
    difficulty: 1,
    equipment: ['dumbbells'],
    instructions: 'Lie on your back, knees bent, dumbbells over the chest. Lower until the upper arms touch the floor, then press up.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 45,
    cues: ['Elbows at about 45 degrees', 'Press smoothly', 'Keep the ribs down'],
    regression: 'Use one dumbbell at a time, or a lighter weight.',
    progression: 'Pause briefly when the arms touch the floor.',
    space: 'floor',
    effort: 'moderate'
  },
  {
    id: 'db-overhead-press',
    name: 'Dumbbell overhead press',
    category: 'push',
    movementPattern: 'push',
    difficulty: 3,
    equipment: ['dumbbells'],
    instructions: 'Stand tall with dumbbells at the shoulders. Press overhead without arching the back, then lower slowly.',
    mode: 'reps',
    reps: '6–10 reps',
    rest: 50,
    cues: ['Ribs stacked over hips', 'Press, do not lean', 'A light weight is fine'],
    regression: 'Press one arm at a time, seated with back support.',
    progression: 'Slow the lowering phase.',
    contraindicationNotes: 'Choose the floor press instead if overhead reaching is uncomfortable.',
    space: 'standing',
    effort: 'hard'
  },
  {
    id: 'db-reverse-lunge',
    name: 'Dumbbell reverse lunge',
    category: 'lower',
    movementPattern: 'lunge',
    difficulty: 3,
    equipment: ['dumbbells'],
    instructions: 'Dumbbells at your sides. Step one foot back, lower the back knee, then press through the front foot to return.',
    mode: 'reps',
    reps: '6–10 reps per side',
    rest: 50,
    cues: ['Step back, not down', 'Torso stays tall', 'Lighter weight, better control'],
    regression: 'Do the lunge without weight, holding a wall.',
    progression: 'Pause at the bottom of each rep.',
    perSide: true,
    space: 'standing',
    effort: 'hard'
  },
  {
    id: 'db-farmer-carry',
    name: 'Farmer carry',
    category: 'carry',
    movementPattern: 'carry',
    difficulty: 1,
    equipment: ['dumbbells'],
    instructions: 'Hold a dumbbell in each hand and walk at a steady pace. If space is tight, stand tall and hold instead.',
    mode: 'time',
    duration: 40,
    rest: 40,
    cues: ['Stand tall, shoulders level', 'Steady breathing', 'Put them down whenever you need'],
    regression: 'Hold lighter weights, or just stand tall holding them.',
    progression: 'Add fifteen seconds to the carry.',
    space: 'standing',
    effort: 'moderate'
  }
];

// ——— Kettlebell —————————————————————————————————————————————————————————
// Deliberately no swings in the MVP: the ballistic hip snap needs coaching
// that an app cannot give, so the library sticks to grinds and carries.

export const KETTLEBELL: Exercise[] = [
  {
    id: 'kb-deadlift',
    name: 'Kettlebell deadlift',
    category: 'lower',
    movementPattern: 'hinge',
    difficulty: 1,
    equipment: ['kettlebells'],
    instructions: 'Kettlebell between the feet. Push the hips back with a long spine, take the handle, then stand tall. Lower it the same way.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 45,
    cues: ['Hips back, chest proud', 'Push the floor away', 'Lower under control'],
    regression: 'Raise the kettlebell on a box to shorten the range.',
    progression: 'Pause for a second just off the floor.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'kb-goblet-squat',
    name: 'Kettlebell goblet squat',
    category: 'lower',
    movementPattern: 'squat',
    difficulty: 2,
    equipment: ['kettlebells'],
    instructions: 'Hold the kettlebell by the horns at chest height. Sit the hips down as far as is comfortable, then stand.',
    mode: 'reps',
    reps: '8–12 reps',
    rest: 45,
    cues: ['Elbows inside the knees', 'Heels stay down', 'Chest tall'],
    regression: 'Squat to a chair without the weight.',
    progression: 'Pause for two seconds at the bottom.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'kb-row',
    name: 'Kettlebell row',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 2,
    equipment: ['kettlebells'],
    instructions: 'Hinge forward with one hand on a chair. Draw the kettlebell towards the hip, then lower it fully. Swap sides halfway.',
    mode: 'reps',
    reps: '8–12 reps per side',
    rest: 45,
    cues: ['Flat back', 'Elbow drives back', 'Full stretch at the bottom'],
    regression: 'Use a lighter weight and a higher support.',
    progression: 'Pause for a second at the top.',
    perSide: true,
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'kb-press',
    name: 'Kettlebell press',
    category: 'push',
    movementPattern: 'push',
    difficulty: 3,
    equipment: ['kettlebells'],
    instructions: 'Kettlebell racked at the shoulder. Press straight overhead without leaning back, then lower slowly. Swap sides halfway.',
    mode: 'reps',
    reps: '5–8 reps per side',
    rest: 50,
    cues: ['Stay stacked, ribs down', 'Press, do not lean', 'Control the way down'],
    regression: 'Press a lighter weight, or a dumbbell, seated.',
    progression: 'Add a two-second pause overhead.',
    perSide: true,
    contraindicationNotes: 'Skip overhead work on any day it feels uncomfortable.',
    space: 'standing',
    effort: 'hard'
  },
  {
    id: 'kb-carry',
    name: 'Kettlebell suitcase carry',
    category: 'carry',
    movementPattern: 'carry',
    difficulty: 1,
    equipment: ['kettlebells'],
    instructions: 'Hold one kettlebell at your side and walk tall without leaning. Swap hands halfway through the block.',
    mode: 'time',
    duration: 40,
    rest: 40,
    cues: ['Stay level through the shoulders', 'Slow, steady breathing', 'Swap sides halfway'],
    regression: 'Stand tall holding the weight instead of walking.',
    progression: 'Add fifteen seconds per side.',
    perSide: true,
    space: 'standing',
    effort: 'moderate'
  }
];

// ——— Bands ——————————————————————————————————————————————————————————————

export const BANDS: Exercise[] = [
  {
    id: 'band-row',
    name: 'Band row',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 1,
    equipment: ['bands'],
    instructions: 'Anchor the band at chest height or loop it around your feet. Draw the elbows back towards the hips, then release slowly.',
    mode: 'reps',
    reps: '10–15 reps',
    rest: 35,
    cues: ['Shoulders down and back', 'Squeeze briefly at the end', 'Control the return'],
    regression: 'Step closer to the anchor for less tension.',
    progression: 'Step back, or use a heavier band.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'band-pull-apart',
    name: 'Band pull-apart',
    category: 'pull',
    movementPattern: 'pull',
    difficulty: 1,
    equipment: ['bands'],
    instructions: 'Hold the band in front at shoulder height. Pull it apart until the arms are wide, then return slowly.',
    mode: 'reps',
    reps: '12–20 reps',
    rest: 30,
    cues: ['Straight arms', 'Lead with the hands', 'Shoulders stay down'],
    regression: 'Widen the grip for less tension.',
    progression: 'Narrow the grip, or use a heavier band.',
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'band-press',
    name: 'Band press',
    category: 'push',
    movementPattern: 'push',
    difficulty: 1,
    equipment: ['bands'],
    instructions: 'Anchor the band behind you at chest height. Press the hands forward until the arms are straight, then return slowly.',
    mode: 'reps',
    reps: '10–15 reps',
    rest: 35,
    cues: ['Stand tall and braced', 'Press level, not upward', 'Control the return'],
    regression: 'Step towards the anchor to reduce tension.',
    progression: 'Press one arm at a time.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'band-lateral-walk',
    name: 'Band lateral walk',
    category: 'lower',
    movementPattern: 'balance',
    difficulty: 1,
    equipment: ['bands'],
    instructions: 'Band around the legs above the knees. Sink into a quarter squat and step sideways, then back the other way.',
    mode: 'time',
    duration: 40,
    rest: 35,
    cues: ['Stay low throughout', 'Small, controlled steps', 'Keep the feet pointing forward'],
    regression: 'Place the band above the knees and take smaller steps.',
    progression: 'Move the band to the ankles.',
    space: 'standing',
    effort: 'moderate'
  }
];

// ——— Cardio: walking and running ————————————————————————————————————————
// Time-based only. No GPS, no distance, no pace targets — effort is described
// with RPE language the user judges for themselves.

export const CARDIO: Exercise[] = [
  {
    id: 'walk-easy',
    name: 'Easy walk',
    category: 'cardio',
    movementPattern: 'gait',
    difficulty: 1,
    equipment: [],
    instructions: 'Walk at a pace where talking stays completely easy. Indoors on the spot works just as well as outdoors.',
    mode: 'time',
    duration: 180,
    rest: 0,
    cues: ['Relaxed shoulders', 'Steady breathing', 'Conversational the whole way'],
    regression: 'Walk on the spot, or shorten the block.',
    progression: 'Add a gentle arm swing and lengthen the stride.',
    gentle: true,
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'walk-brisk',
    name: 'Brisk walk',
    category: 'cardio',
    movementPattern: 'gait',
    difficulty: 1,
    equipment: [],
    instructions: 'Pick the pace up to purposeful but comfortable. Short, quick steps and a relaxed arm swing.',
    mode: 'time',
    duration: 120,
    rest: 0,
    cues: ['Short, quick steps', 'Breathing deeper but controlled', 'Ease off any time'],
    regression: 'Drop back to an easy walk whenever you want.',
    progression: 'Hold the pace for an extra minute.',
    space: 'standing',
    discreet: true,
    effort: 'moderate'
  },
  {
    id: 'jog-easy',
    name: 'Easy jog',
    category: 'cardio',
    movementPattern: 'gait',
    difficulty: 2,
    equipment: [],
    instructions: 'Jog gently at a pace you could hold a conversation at. March quickly instead if jogging is not for you today.',
    mode: 'time',
    duration: 120,
    rest: 0,
    cues: ['Land softly', 'Keep it conversational', 'Walk whenever you want to'],
    regression: 'Walk briskly instead.',
    progression: 'Extend the block by a minute.',
    space: 'standing',
    impact: true,
    effort: 'moderate'
  },
  {
    id: 'jog-steady',
    name: 'Steady jog',
    category: 'cardio',
    movementPattern: 'gait',
    difficulty: 3,
    equipment: [],
    instructions: 'Settle into a controlled, purposeful running effort you could sustain for the whole block.',
    mode: 'time',
    duration: 180,
    rest: 0,
    cues: ['Controlled, not racing', 'Relaxed hands and jaw', 'Back off if breathing gets ragged'],
    regression: 'Drop to an easy jog or a brisk walk.',
    progression: 'Add a minute to the block.',
    space: 'standing',
    impact: true,
    effort: 'hard'
  },
  {
    id: 'walk-recover',
    name: 'Recovery walk',
    category: 'cardio',
    movementPattern: 'gait',
    difficulty: 1,
    equipment: [],
    instructions: 'Slow right down and let the breath settle before the next block.',
    mode: 'time',
    duration: 60,
    rest: 0,
    cues: ['Shoulders drop', 'Let the breath come back', 'No rush at all'],
    regression: 'Stand still and breathe instead.',
    progression: 'Shorten the recovery as fitness builds.',
    gentle: true,
    space: 'standing',
    discreet: true,
    effort: 'easy'
  }
];

// ——— Mobility and stretching ————————————————————————————————————————————

export const TRAVEL: Exercise[] = [
  {
    id: 'wall-sit',
    name: 'Wall sit',
    category: 'lower',
    movementPattern: 'squat',
    difficulty: 2,
    equipment: [],
    instructions: 'Back against a wall, slide down until the knees are bent as far as is comfortable. Hold, breathing steadily.',
    mode: 'time',
    duration: 40,
    rest: 40,
    cues: ['Only as low as is comfortable', 'Weight through the whole foot', 'Keep breathing'],
    regression: 'Slide down a shorter way, or hold for less time.',
    progression: 'Sink lower, or add fifteen seconds.',
    space: 'standing',
    effort: 'moderate'
  },
  {
    id: 'bag-carry',
    name: 'Bag carry',
    category: 'carry',
    movementPattern: 'carry',
    difficulty: 1,
    equipment: [],
    instructions: 'Hold a bag, case or rucksack at one side and walk tall without leaning. Swap hands halfway.',
    mode: 'time',
    duration: 45,
    rest: 30,
    cues: ['Stay level through the shoulders', 'Stand tall, do not lean', 'Swap sides halfway'],
    regression: 'Use a lighter bag, or hold it with both hands in front.',
    progression: 'Carry for longer, or use the heavier bag.',
    perSide: true,
    space: 'standing',
    discreet: true,
    effort: 'moderate'
  },
  {
    id: 'seated-march',
    name: 'Seated march',
    category: 'cardio',
    movementPattern: 'gait',
    difficulty: 1,
    equipment: [],
    instructions: 'Sitting tall, lift one knee then the other at a steady rhythm, as though marching in place.',
    mode: 'time',
    duration: 45,
    rest: 20,
    cues: ['Sit tall, do not slump back', 'Steady, even rhythm', 'Breathe normally'],
    regression: 'Lift the heels only, keeping the toes down.',
    progression: 'Lift the knees a little higher, or add a gentle arm swing.',
    space: 'seated',
    discreet: true,
    gentle: true,
    effort: 'easy'
  },
  {
    id: 'standing-figure-four',
    name: 'Standing figure four',
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 2,
    equipment: [],
    instructions: 'Hold a wall, cross one ankle over the opposite knee and sit the hips back a little way. Swap sides halfway.',
    mode: 'time',
    duration: 45,
    rest: 10,
    cues: ['Hold the wall as much as you like', 'Sit back, do not fold forward', 'A light stretch only'],
    regression: 'Do it seated instead, which needs no balance.',
    progression: 'Sit the hips back a little further.',
    perSide: true,
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
];

export const MOBILITY: Exercise[] = [
  {
    id: 'cat-cow',
    name: 'Cat cow',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'On hands and knees, or seated. Round the back as you breathe out, open the chest as you breathe in.',
    mode: 'time',
    duration: 45,
    rest: 10,
    cues: ['Let the breath lead', 'Move through the whole spine', 'A small range is enough'],
    regression: 'Do it seated on a chair.',
    progression: 'Slow the movement to match a longer breath.',
    gentle: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'worlds-greatest-stretch',
    name: "World's greatest stretch",
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 2,
    equipment: [],
    instructions: 'From a lunge, place both hands inside the front foot, then rotate one arm up towards the ceiling. Swap sides halfway.',
    mode: 'time',
    duration: 50,
    rest: 10,
    cues: ['Breathe into the hip', 'Turn from the ribs', 'Hands can rest on a block or book'],
    regression: 'Keep the back knee down and skip the rotation.',
    progression: 'Hold the rotation for three slow breaths.',
    perSide: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'hip-switch-90-90',
    name: '90/90 hip switches',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 2,
    equipment: [],
    instructions: 'Sitting with both knees bent at right angles, rotate the knees slowly from one side to the other.',
    mode: 'time',
    duration: 45,
    rest: 10,
    cues: ['Move slowly', 'Hands behind for support', 'Stay in a comfortable range'],
    regression: 'Use your hands to help the knees across.',
    progression: 'Lift the hands off the floor as you switch.',
    gentle: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic rotation',
    category: 'mobility',
    movementPattern: 'rotation',
    difficulty: 1,
    equipment: [],
    instructions: 'Sit tall with hands crossed at the chest. Turn slowly to one side as you breathe out, return, then turn the other way.',
    mode: 'time',
    duration: 45,
    rest: 10,
    cues: ['Lead with the ribs, not the neck', 'Exhale into the turn', 'Stay comfortable'],
    regression: 'Reduce the range and keep the hips facing forward.',
    progression: 'Hold the end position for a full breath.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'ankle-rocks',
    name: 'Ankle rocks',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'In a split stance, rock the front knee gently forward over the toes and back, keeping the heel down. Swap sides halfway.',
    mode: 'time',
    duration: 45,
    rest: 10,
    cues: ['Heel stays down', 'Small, smooth rocks', 'Swap sides halfway'],
    regression: 'Do it seated, sliding the foot forward and back.',
    progression: 'Add a gentle pause at the end of each rock.',
    perSide: true,
    gentle: true,
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'hip-flexor-stretch',
    name: 'Hip flexor stretch',
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'From half-kneeling, tuck the tailbone slightly and shift forward until you feel a light stretch at the front of the hip.',
    mode: 'time',
    duration: 50,
    rest: 10,
    cues: ['Tuck the tailbone first', 'Light stretch, never sharp', 'Cushion the knee'],
    regression: 'Do it standing, with one foot on a low step behind you.',
    progression: 'Reach the same-side arm overhead.',
    perSide: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'hamstring-stretch',
    name: 'Hamstring stretch',
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Heel on a low step with a long spine. Hinge the hips back until you feel the back of the leg, then hold and breathe.',
    mode: 'time',
    duration: 50,
    rest: 10,
    cues: ['Long spine', 'Soft knee', 'A stretch, not a strain'],
    regression: 'Keep the foot on the floor and hinge a little way.',
    progression: 'Use a higher step.',
    perSide: true,
    gentle: true,
    space: 'standing',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'childs-pose',
    name: "Child's pose",
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Kneel and sit the hips back towards the heels, arms reaching forward. Let the chest and head soften towards the floor.',
    mode: 'time',
    duration: 60,
    rest: 0,
    cues: ['Let the hips sink', 'Slow, full breaths', 'A cushion under the hips is fine'],
    regression: 'Sit on a chair and fold forward over the thighs instead.',
    progression: 'Walk the hands to one side for a gentle side stretch.',
    gentle: true,
    space: 'floor',
    effort: 'easy'
  },
  {
    id: 'shoulder-circles',
    name: 'Shoulder circles',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Roll the shoulders slowly backwards in big circles, then forwards. Let the arms stay heavy.',
    mode: 'time',
    duration: 40,
    rest: 0,
    cues: ['Big, slow circles', 'Both directions', 'Relaxed arms'],
    regression: 'Make the circles smaller.',
    progression: 'Add a straight-arm reach at the top of each circle.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'neck-mobility',
    name: 'Neck mobility',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Slowly turn the head side to side, then tilt one ear towards each shoulder. Stay well inside a comfortable range.',
    mode: 'time',
    duration: 40,
    rest: 0,
    cues: ['Very slow and small', 'Never force the range', 'Keep the shoulders down'],
    regression: 'Reduce the range to a few centimetres.',
    progression: 'Hold each end position for one slow breath.',
    contraindicationNotes: 'Keep this gentle and stop at the first sign of discomfort.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'doorway-chest-opener',
    name: 'Doorway chest opener',
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Forearm on a doorframe, step through gently until the chest opens. Hold, breathe, then swap sides.',
    mode: 'time',
    duration: 45,
    rest: 10,
    cues: ['Shoulder stays below ear height', 'Easy, even breathing', 'Back off if it pinches'],
    regression: 'Lower the arm and reduce the step through.',
    progression: 'Raise the arm slightly higher on the frame.',
    perSide: true,
    gentle: true,
    space: 'standing',
    effort: 'easy'
  },
  {
    id: 'figure-four',
    name: 'Seated figure four',
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Sitting, cross one ankle over the opposite knee and lean forward gently from the hips. Hold, then swap sides.',
    mode: 'time',
    duration: 50,
    rest: 10,
    cues: ['Lean from the hips', 'Light stretch only', 'Swap sides halfway'],
    regression: 'Stay upright instead of leaning forward.',
    progression: 'Lean a little further, keeping the spine long.',
    perSide: true,
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'standing-side-bend',
    name: 'Standing side bend',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Stand tall, reach one arm overhead and lean gently to the opposite side. Come back through the middle and swap.',
    mode: 'time',
    duration: 40,
    rest: 10,
    cues: ['Lengthen up before you lean', 'Stay facing forwards', 'A long stretch, not a deep one'],
    regression: 'Keep both hands on the hips and lean a short way.',
    progression: 'Hold each side for a full slow breath.',
    perSide: true,
    space: 'standing',
    discreet: true,
    gentle: true,
    effort: 'easy'
  },
  {
    id: 'wrist-and-hand-release',
    name: 'Wrist and hand release',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Spread the fingers wide, then make a loose fist. Circle the wrists slowly in both directions.',
    mode: 'time',
    duration: 40,
    rest: 0,
    cues: ['Slow, full circles', 'Spread wide, then soften', 'Let the shoulders stay down'],
    regression: 'Open and close the hands only.',
    progression: 'Add a gentle press of the palms together between circles.',
    space: 'seated',
    discreet: true,
    gentle: true,
    effort: 'easy'
  },
  {
    id: 'ankle-pumps',
    name: 'Ankle pumps',
    category: 'mobility',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Sitting, lift the toes towards you then point them away. Then circle each ankle slowly both ways.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Full range, slow pace', 'Both directions', 'One foot at a time is fine'],
    regression: 'Move one foot at a time, with the heel resting down.',
    progression: 'Lift the foot clear of the floor as you circle.',
    space: 'seated',
    discreet: true,
    gentle: true,
    effort: 'easy'
  },
  {
    id: 'forward-fold',
    name: 'Easy forward fold',
    category: 'stretch',
    movementPattern: 'mobility',
    difficulty: 1,
    equipment: [],
    instructions: 'Stand or sit and let the upper body hang forward with soft knees. Breathe slowly and let the neck relax.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['Knees soft', 'Heavy head and arms', 'Slow, quiet breath'],
    regression: 'Fold only a short way, hands on the thighs.',
    progression: 'Hold for a few extra breaths.',
    gentle: true,
    space: 'standing',
    effort: 'easy'
  }
];

// ——— Breathing and mindfulness ——————————————————————————————————————————
// Every item here is seated or lying with no movement load. This pool is the
// only one used when pain is reported.

export const BREATHING: Exercise[] = [
  {
    id: 'breath-arrive',
    name: 'Arrive',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Sit or lie somewhere comfortable. Let the body be supported and simply notice that you are here.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['No position to hold', 'Eyes open or closed', 'Nothing to fix'],
    regression: 'Lie down and let the floor take all your weight.',
    progression: 'Extend to two full minutes.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'breath-counted',
    name: 'Counted breathing',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Breathe in for four counts and out for six. If counting feels fussy, simply let the out-breath be the longer one.',
    mode: 'time',
    duration: 90,
    rest: 0,
    cues: ['Breath stays gentle', 'Longer out-breath', 'Begin again whenever you drift'],
    regression: 'Drop the counting and just follow the breath.',
    progression: 'Lengthen the exhale to eight counts.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'breath-body-scan',
    name: 'Body scan',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Move your attention slowly from the feet to the head, noticing what each area feels like without trying to change it.',
    mode: 'time',
    duration: 120,
    rest: 0,
    cues: ['Noticing, not fixing', 'Slow and unhurried', 'Skip anywhere you prefer not to visit'],
    regression: 'Scan only the legs, or only the hands and face.',
    progression: 'Take twice as long over the same journey.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'breath-soften',
    name: 'Soften and settle',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Let the jaw, shoulders and hands be heavy. Stay with the feeling of being supported for a few breaths.',
    mode: 'time',
    duration: 60,
    rest: 0,
    cues: ['Heavy hands', 'Loose jaw', 'Let the floor hold you'],
    regression: 'Soften one area only, such as the shoulders.',
    progression: 'Add a slow scan of the whole body.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'breath-box',
    name: 'Box breathing',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Breathe in for four, hold for four, out for four, hold for four. Keep every side of the box the same length.',
    mode: 'time',
    duration: 90,
    rest: 0,
    cues: ['Even, unhurried sides', 'Drop the hold if it feels like effort', 'Shoulders stay soft'],
    regression: 'Shorten each side to three counts, or drop the holds entirely.',
    progression: 'Lengthen each side to five counts.',
    contraindicationNotes: 'Skip the holds if breath-holding makes you lightheaded.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'breath-lengthen',
    name: 'Lengthening exhale',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Let each out-breath be a little longer than the one before, up to a length that still feels easy. Then let it settle.',
    mode: 'time',
    duration: 90,
    rest: 0,
    cues: ['Never force the breath out', 'Let the next in-breath arrive on its own', 'Easy is the point'],
    regression: 'Keep the breath as it is and simply count it.',
    progression: 'Add a short pause at the end of the exhale.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  },
  {
    id: 'breath-close',
    name: 'Close kindly',
    category: 'breathing',
    movementPattern: 'breath',
    difficulty: 1,
    equipment: [],
    instructions: 'Take one slower breath and notice one thing that feels even slightly better than when you started.',
    mode: 'time',
    duration: 45,
    rest: 0,
    cues: ['One slow breath', 'No scoring yourself', 'That was enough'],
    regression: 'Simply sit for a moment before standing up.',
    progression: 'Add a sentence of your own about the day.',
    gentle: true,
    space: 'seated',
    discreet: true,
    effort: 'easy'
  }
];

// ——— Pools ——————————————————————————————————————————————————————————————

/** Main-block movements, i.e. everything except warm-ups and breathing. */
export const MAIN_POOL: Exercise[] = [
  ...LOWER,
  ...TRAVEL,
  ...PUSH,
  ...PULL,
  ...CORE,
  ...DUMBBELL,
  ...KETTLEBELL,
  ...BANDS,
  ...CARDIO,
  ...MOBILITY
];

export const ALL_EXERCISES: Exercise[] = [...WARMUPS, ...MAIN_POOL, ...BREATHING];

/**
 * Breathing used in the middle of a session. Excludes the fixed opening and
 * closing blocks so "Arrive" never appears three times in one session.
 */
export const BREATHING_CORE: Exercise[] = BREATHING.filter(
  exercise => exercise.id !== 'breath-arrive' && exercise.id !== 'breath-close'
);

const BY_ID = new Map(ALL_EXERCISES.map(exercise => [exercise.id, exercise]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export interface PoolFilter {
  level: Level;
  equipment: EquipmentId[];
  /** Only movements that can be done seated or lying with no load. */
  gentleOnly?: boolean;
  /** The most room any movement may need, from the place you are in. */
  maxSpace?: SpaceNeed;
  /** Only movements that look unremarkable with other people around. */
  discreetOnly?: boolean;
  /** Exclude movements that thud, for shared floors and late evenings. */
  quietOnly?: boolean;
  categories?: Exercise['category'][];
  patterns?: Exercise['movementPattern'][];
  /** Exclude these ids, used to avoid repeating a movement within a session. */
  exclude?: Set<string>;
}

/** Filters a pool down to what this person can reasonably and safely do today. */
export function selectPool(pool: Exercise[], filter: PoolFilter): Exercise[] {
  const owned = expandEquipment(filter.equipment);
  const maxDifficulty = MAX_DIFFICULTY[filter.level];
  return pool.filter(exercise => {
    if (exercise.difficulty > maxDifficulty) return false;
    if (!exercise.equipment.every(item => owned.has(item))) return false;
    if (filter.gentleOnly && !exercise.gentle) return false;
    if (filter.maxSpace && SPACE_ORDER[exercise.space] > SPACE_ORDER[filter.maxSpace]) return false;
    if (filter.discreetOnly && !exercise.discreet) return false;
    if (filter.quietOnly && exercise.impact) return false;
    if (filter.categories && !filter.categories.includes(exercise.category)) return false;
    if (filter.patterns && !filter.patterns.includes(exercise.movementPattern)) return false;
    if (filter.exclude?.has(exercise.id)) return false;
    return true;
  });
}
