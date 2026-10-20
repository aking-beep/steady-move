// What each movement asks of the body.
//
// Joints and regions, not muscles: what people report is "my shoulder", and
// what has to be routed around is a movement, not a muscle. The mapping is
// derived from the movement pattern and corrected per movement where the
// pattern alone gets it wrong — hands on the floor, deep knee flexion, a
// kneeling position, or a mobility movement that does stress one joint.
//
// Deliberately broad. The cost of leaving a movement out is one less option;
// the cost of leaving it in is someone training on a sore joint.

import {BodyPart, Exercise, MovementPattern} from '../types';

/** What a movement pattern asks of the body, before the corrections below. */
const PATTERN_LOADS: Record<MovementPattern, BodyPart[]> = {
  squat: ['knee', 'hip'],
  lunge: ['knee', 'hip'],
  hinge: ['back', 'hip'],
  push: ['shoulder', 'elbow', 'wrist'],
  pull: ['shoulder', 'elbow', 'wrist'],
  carry: ['back', 'shoulder', 'wrist'],
  core: ['back'],
  rotation: ['back'],
  // Walking is first-line advice for most of these complaints, so only
  // running counts as load here. See `loadsFor`.
  gait: ['knee', 'ankle', 'hip'],
  balance: ['ankle', 'knee'],
  mobility: [],
  breath: []
};

/**
 * Per-movement corrections, where the pattern alone gets it wrong — hands on
 * the floor, deep knee flexion, a kneeling position, or a mobility movement
 * that does stress one joint.
 */
const LOADS: Record<string, BodyPart[]> = {
  // Hands on the floor: the wrist is taking bodyweight.
  plank: ['wrist', 'shoulder', 'back'],
  'side-plank': ['wrist', 'shoulder', 'back'],
  'bear-hold': ['wrist', 'shoulder', 'back'],
  'mountain-climber': ['wrist', 'shoulder', 'back', 'knee'],
  'bird-dog': ['wrist', 'back', 'knee'],
  'cat-cow': ['wrist'],
  'worlds-greatest-stretch': ['wrist', 'hip', 'knee'],

  // Floor-lying core: no joint loaded to speak of beyond the spine.
  'dead-bug': ['back'],
  superman: ['back'],

  // Head below the heart, neck under load.
  'pike-push-up': ['wrist', 'shoulder', 'elbow', 'neck'],

  // Deep knee flexion, or kneeling.
  'deep-squat-hold': ['knee', 'hip', 'ankle'],
  'childs-pose': ['knee', 'ankle'],
  'hip-flexor-stretch': ['hip', 'knee'],
  'wall-sit': ['knee'],

  // A glute bridge is commonly how people keep training with a sore back.
  'glute-bridge': ['hip'],

  // Hanging and rowing: grip is part of the exercise.
  'dead-hang': ['shoulder', 'elbow', 'wrist'],
  'scapular-pull': ['shoulder', 'elbow', 'wrist'],
  'band-pull-apart': ['shoulder', 'elbow'],
  'db-row': ['shoulder', 'elbow', 'back', 'wrist'],
  'kb-row': ['shoulder', 'elbow', 'back', 'wrist'],
  'band-row': ['shoulder', 'elbow', 'back'],

  // Single-joint mobility work, named so a flag does not sweep it all away.
  'ankle-rocks': ['ankle'],
  'ankle-pumps': ['ankle'],
  'calf-raise': ['ankle'],
  'single-leg-balance': ['ankle', 'knee'],
  'band-lateral-walk': ['hip', 'knee'],
  'shoulder-circles': ['shoulder'],
  'doorway-chest-opener': ['shoulder'],
  'neck-mobility': ['neck'],
  'wrist-and-hand-release': ['wrist'],
  'forward-fold': ['back'],
  'standing-side-bend': ['back'],
  'hamstring-stretch': ['hip'],
  'hip-switch-90-90': ['hip', 'knee'],
  'figure-four': ['hip', 'knee'],
  'standing-figure-four': ['hip', 'knee'],
  'wu-hip-openers': ['hip'],
  'wu-leg-swings': ['hip'],
  'wu-squat-to-stand': ['knee', 'hip'],
  'wu-joint-circles': [],
  'wu-reach-roll': [],
  'wu-torso-twists': ['back'],
  'thoracic-rotation': ['back'],
  'wu-easy-march': [],
  'seated-march': []
};

/** The parts a movement asks something of. */
export function loadsFor(exercise: Exercise): BodyPart[] {
  const override = LOADS[exercise.id];
  if (override) return override;

  // Walking is not what aggravates a knee; running is.
  if (exercise.movementPattern === 'gait' && !exercise.impact) return [];

  return PATTERN_LOADS[exercise.movementPattern];
}

/** True when a movement would ask something of a flagged part. */
export function conflicts(exercise: Exercise, parts: Set<BodyPart>): boolean {
  if (parts.size === 0) return false;
  return loadsFor(exercise).some(part => parts.has(part));
}
