// Changing one movement without disturbing the session.
//
// The gap this closes: every app eventually offers you something you cannot do
// — a bad knee, a shoulder that complains, a movement you simply hate — and
// most of them leave you two options, do it or skip it. The better apps let
// you swap it this once. None of them remember.
//
// So this does two things. `alternativesFor` finds honest replacements: the
// same movement pattern, inside every constraint the session was built under —
// the level ceiling, the equipment actually to hand, the room available, the
// people around, the floor below. And `swapBlock` substitutes one in while
// keeping the block's seconds exactly, so a 20 minute session is still 20
// minutes afterwards.
//
// Remembering is the profile's job: an excluded movement never comes back.

import {Exercise, Profile, Session, SessionBlock} from '../types';
import {MAIN_POOL, MOBILITY, WARMUPS, BREATHING_CORE, getExercise, selectPool} from '../data/exercises';
import {flaggedParts} from './niggles';

/** The pool a block was drawn from, so a replacement comes from the same place. */
function poolForPhase(phase: SessionBlock['phase']): Exercise[] {
  switch (phase) {
    case 'warmup':
      return WARMUPS;
    case 'reset':
      return MOBILITY;
    case 'arrive':
    case 'reflect':
      return BREATHING_CORE;
    case 'move':
    default:
      return MAIN_POOL;
  }
}

/**
 * Honest replacements for a block, best first.
 *
 * "Honest" is doing real work here: a replacement has to clear the same
 * difficulty ceiling, equipment gate and space constraints as the original,
 * or the swap would quietly hand someone a movement the engine would never
 * have prescribed.
 */
export function alternativesFor(options: {
  session: Session;
  block: SessionBlock;
  profile: Profile;
  /** Ids already used in this session, which make poorer suggestions. */
  avoid?: Set<string>;
}): Exercise[] {
  const {session, block, profile, avoid} = options;
  const current = block.exerciseId ? getExercise(block.exerciseId) : undefined;

  const pool = selectPool(poolForPhase(block.phase), {
    level: profile.level,
    equipment: session.checkIn.equipment,
    gentleOnly: session.painFlagged || session.adjustedForRecovery,
    maxSpace: session.constraints?.space,
    discreetOnly: session.constraints?.discreet,
    quietOnly: session.constraints?.quiet,
    exclude: new Set([...(profile.excluded ?? []), ...(block.exerciseId ? [block.exerciseId] : [])]),
    // A swap must obey the same flags the session was built under, or the one
    // control people reach for becomes the hole in the filter.
    avoidParts: flaggedParts(profile.niggles)
  });

  if (!current) return pool;

  // Same movement pattern first — a squat should be replaced by a squat, not
  // by whatever happens to fit. Then the same category. Then anything that is
  // allowed, so the control is never a dead end.
  const samePattern = pool.filter(e => e.movementPattern === current.movementPattern);
  const sameCategory = pool.filter(
    e => e.category === current.category && e.movementPattern !== current.movementPattern
  );
  const rest = pool.filter(
    e => e.movementPattern !== current.movementPattern && e.category !== current.category
  );

  const ranked = [...samePattern, ...sameCategory, ...rest];

  // Something already in today's session is a legal answer but a dull one.
  if (!avoid?.size) return ranked;
  return [...ranked.filter(e => !avoid.has(e.id)), ...ranked.filter(e => avoid.has(e.id))];
}

/** Ids of every movement the session currently uses. */
export function usedExerciseIds(session: Session): Set<string> {
  return new Set(
    session.blocks.map(block => block.exerciseId).filter((id): id is string => Boolean(id))
  );
}

/**
 * Replaces one block's movement, keeping its seconds exactly so the session
 * still totals what it promised. Returns the session unchanged when there is
 * nothing suitable to swap to, which the caller reports rather than hiding.
 */
export function swapBlock(options: {
  session: Session;
  blockId: string;
  profile: Profile;
  /** Steps through the alternatives, so tapping swap twice keeps moving. */
  step?: number;
}): {session: Session; swappedTo?: Exercise} {
  const {session, blockId, profile, step = 0} = options;

  const index = session.blocks.findIndex(block => block.id === blockId);
  if (index === -1) return {session};

  const block = session.blocks[index];
  if (block.kind !== 'exercise') return {session};

  const alternatives = alternativesFor({
    session,
    block,
    profile,
    avoid: usedExerciseIds(session)
  });
  if (alternatives.length === 0) return {session};

  const replacement = alternatives[Math.abs(step) % alternatives.length];

  const blocks = [...session.blocks];
  blocks[index] = {
    ...block,
    // Seconds are deliberately untouched: the budget is the promise.
    name: replacement.name,
    instructions: replacement.instructions,
    cues: replacement.cues,
    mode: replacement.mode,
    reps: replacement.reps,
    exerciseId: replacement.id,
    perSide: replacement.perSide,
    effort: replacement.effort,
    // A swapped movement is its own thing, not round two of what it replaced.
    round: undefined
  };

  // The block before it announces what is coming, so that has to follow.
  if (index > 0) blocks[index - 1] = {...blocks[index - 1], nextName: replacement.name};

  return {session: {...session, blocks}, swappedTo: replacement};
}
