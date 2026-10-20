// The adaptive session engine.
//
// Deterministic by design: the same profile, check-in, history and variant
// always produce the same session. Nothing here is random, and nothing here
// calls a network or a model. "Rebuild" moves the variant on by one, which
// walks the rotation forward and yields a different — but equally valid —
// session from the same constraints.
//
// Guarantees enforced in this module, and covered by tests:
//   • reported pain                 → breathing and gentle movement only
//   • low energy AND sore           → recovery session, no strenuous work
//   • level `new`                   → difficulty 1 movements only
//   • equipment not available today → that movement is never prescribed
//   • block seconds                 → always sum to exactly minutes × 60
//   • every session                 → arrive, warm up, move, reset, reflect
//   • never empty                   → a session always has movement blocks

import {
  Activity,
  CheckIn,
  Exercise,
  Intensity,
  LocationId,
  MovementPattern,
  Profile,
  Session,
  SessionBlock,
  SessionType,
  SpaceConstraints,
  WorkoutLog
} from '../types';
import {
  BREATHING,
  BREATHING_CORE,
  CARDIO,
  MOBILITY,
  MAIN_POOL,
  WARMUPS,
  expandEquipment,
  getExercise,
  selectPool
} from '../data/exercises';
import {allocate, allocateCapped, phaseBudgets} from './duration';
import {buildRunWalkBlocks} from './runwalk';

export interface PlanInput {
  profile: Profile;
  checkIn: CheckIn;
  /** Recent logs, any order. Used to rotate away from what was done lately. */
  history?: WorkoutLog[];
  /** Bumped by "Rebuild" to get a different valid session. */
  variant?: number;
  now?: Date;
  /**
   * Forces a session type, used by Explore and Quick Move where the person has
   * picked the session themselves. A reported pain flag still overrides it:
   * nothing in the app can ask for strenuous work on a pain day.
   */
  force?: SessionType;
  /** Narrows the main block to these movement patterns, e.g. a push session. */
  patterns?: MovementPattern[];
  /** Replaces the generated title, for named Explore sessions. */
  titleOverride?: string;
  /**
   * What the place you are in allows — floor space, whether people are around,
   * whether the floor below matters. These only ever filter the vetted
   * library; they never add a movement to it.
   */
  constraints?: SpaceConstraints;
  /** A line about the place, folded into the session's explanation. */
  placeNote?: string;
}

export const SESSION_TITLES: Record<SessionType, string> = {
  strength: 'Steady Strength',
  calisthenics: 'Bodyweight Strength',
  runwalk: 'Run + Walk',
  mobility: 'Mobility Flow',
  recovery: 'Recovery + Reset',
  balanced: 'Balanced Movement',
  mindful: 'Mindful Reset'
};

export const SESSION_FOCUS: Record<SessionType, string> = {
  strength: 'Full-body strength with load',
  calisthenics: 'Full-body strength using your own bodyweight',
  runwalk: 'Easy aerobic work, judged by effort',
  mobility: 'Range of motion and unhurried movement',
  recovery: 'Breathing, gentle movement and rest',
  balanced: 'A little strength, a little movement, a calm finish',
  mindful: 'Breathing and body awareness'
};

export const INTENSITY_LABEL: Record<Intensity, string> = {
  gentle: 'Gentle',
  easy: 'Easy',
  moderate: 'Moderate',
  strong: 'Strong'
};

/** The safety line shown whenever pain is reported. Never a diagnosis. */
export const PAIN_NOTICE =
  'Pain is different from normal training soreness. Consider resting, and seek guidance from a qualified health professional if the pain is significant, persistent or concerning. Steady Move cannot assess an injury.';

// ——— Choosing the session type ——————————————————————————————————————————

const ACTIVITY_TO_TYPE: Record<Activity, SessionType> = {
  calisthenics: 'calisthenics',
  strength: 'strength',
  running: 'runwalk',
  walking: 'runwalk',
  mobility: 'mobility',
  stretching: 'mobility',
  mindfulness: 'mindful'
};

/** Equipment that makes a loaded strength session possible. */
function hasLoad(equipment: CheckIn['equipment']): boolean {
  const owned = expandEquipment(equipment);
  return owned.has('dumbbells') || owned.has('kettlebells') || owned.has('bands') || owned.has('full-gym');
}

/** Run/walk needs somewhere to do it. */
function canRun(location: LocationId, equipment: CheckIn['equipment']): boolean {
  return location === 'outside' || location === 'anywhere' || equipment.includes('outdoors');
}

/**
 * The session types that make sense today, in the user's stated order of
 * preference, with anything impossible here and now removed.
 */
function candidateTypes(profile: Profile, checkIn: CheckIn): SessionType[] {
  const out: SessionType[] = [];
  const add = (type: SessionType) => {
    if (!out.includes(type)) out.push(type);
  };

  for (const activity of profile.activities) {
    let type = ACTIVITY_TO_TYPE[activity];
    if (type === 'strength' && !hasLoad(checkIn.equipment)) type = 'calisthenics';
    if (type === 'runwalk' && !canRun(checkIn.location, checkIn.equipment)) continue;
    add(type);
  }

  // Someone who enjoys a bit of everything should sometimes get a mixed day.
  const breadth = new Set(profile.activities.map(a => ACTIVITY_TO_TYPE[a])).size;
  if (breadth >= 3 || profile.goals.includes('consistency')) add('balanced');

  // There is always something to do, even with no preferences saved.
  if (out.length === 0) add('calisthenics');
  if (!out.includes('mobility')) add('mobility');

  return out;
}

/** How many sessions ago this type was last done. Large means "not lately". */
function staleness(type: SessionType, history: WorkoutLog[]): number {
  const sorted = [...history].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const index = sorted.findIndex(log => log.type === type);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function chooseType(profile: Profile, checkIn: CheckIn, history: WorkoutLog[], variant: number): SessionType {
  const candidates = candidateTypes(profile, checkIn);

  // Prefer whatever has been trained least recently; ties keep the user's own
  // preference order. Rebuild steps along this ranking rather than re-rolling.
  const ranked = candidates
    .map((type, index) => ({type, index, stale: staleness(type, history)}))
    .sort((a, b) => b.stale - a.stale || a.index - b.index)
    .map(entry => entry.type);

  return ranked[Math.abs(variant) % ranked.length];
}

function chooseIntensity(checkIn: CheckIn, profile: Profile, recovery: boolean): Intensity {
  if (recovery) return 'gentle';
  if (checkIn.energy === 'low' || checkIn.soreness === 'sore' || checkIn.mood === 'low') return 'easy';
  if (checkIn.energy === 'high' && checkIn.soreness === 'none' && profile.level === 'regular') return 'strong';
  return 'moderate';
}

// ——— Explaining the choice ——————————————————————————————————————————————

const ENERGY_WORDS = {low: 'low energy', okay: 'steady energy', high: 'good energy'} as const;
const SORENESS_WORDS = {none: 'no soreness', mild: 'mild soreness', sore: 'real soreness'} as const;

function buildRationale(checkIn: CheckIn, intensity: Intensity, type: SessionType): string {
  const reported = `You reported ${ENERGY_WORDS[checkIn.energy]} with ${SORENESS_WORDS[checkIn.soreness]}`;

  if (checkIn.pain) {
    return 'You told us you are experiencing pain that makes exercise inappropriate today, so this session is breathing and gentle attention only — no exercise is prescribed.';
  }
  if (intensity === 'gentle') {
    return `${reported}, so today is recovery: gentle movement, long breaths and no load. Coming back tomorrow matters more than pushing through now.`;
  }
  if (intensity === 'easy') {
    const because = checkIn.mood === 'low' && checkIn.energy !== 'low' ? 'you are not feeling your best' : 'today is not a day to push';
    return `${reported}, and ${because}, so this session stays productive without adding intensity.`;
  }
  if (intensity === 'strong') {
    return `${reported}, so there is room to work a little harder today. Keep a rep or two in reserve on every set.`;
  }
  if (type === 'runwalk') {
    return `${reported}, so today is steady aerobic work judged by effort rather than pace.`;
  }
  return `${reported}, so today stays productive without pushing intensity.`;
}

// ——— Block helpers ——————————————————————————————————————————————————————

function toBlock(
  exercise: Exercise,
  seconds: number,
  phase: SessionBlock['phase'],
  id: string,
  extras: Partial<SessionBlock> = {}
): SessionBlock {
  return {
    id,
    kind: 'exercise',
    phase,
    name: exercise.name,
    instructions: exercise.instructions,
    cues: exercise.cues,
    seconds,
    mode: exercise.mode,
    reps: exercise.reps,
    exerciseId: exercise.id,
    perSide: exercise.perSide,
    effort: exercise.effort,
    ...extras
  };
}

/** Cycles a pool so a short list still fills a long session, as labelled rounds. */
function cycle<T>(pool: T[], count: number, offset = 0): T[] {
  if (pool.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(i + offset) % pool.length]);
  return out;
}

/** A sensible spread of patterns, so a circuit is not six squat variations. */
const PATTERN_ORDER: Exercise['movementPattern'][] = [
  'squat',
  'push',
  'hinge',
  'pull',
  'core',
  'lunge',
  'carry',
  'balance'
];

/**
 * Picks `count` distinct movements, taking one pattern at a time so the
 * circuit stays balanced. Falls back to repeating the pool as extra rounds when
 * the available library is smaller than the session needs.
 */
function pickMovements(pool: Exercise[], count: number, offset: number): Exercise[] {
  const byPattern = new Map<string, Exercise[]>();
  for (const exercise of pool) {
    const list = byPattern.get(exercise.movementPattern) ?? [];
    list.push(exercise);
    byPattern.set(exercise.movementPattern, list);
  }

  const patterns = [
    ...PATTERN_ORDER.filter(p => byPattern.has(p)),
    ...Array.from(byPattern.keys()).filter(p => !PATTERN_ORDER.includes(p as Exercise['movementPattern']))
  ];

  const chosen: Exercise[] = [];
  const taken = new Set<string>();
  let round = 0;

  while (chosen.length < count && patterns.length > 0 && round < 8) {
    for (const pattern of patterns) {
      if (chosen.length >= count) break;
      const list = byPattern.get(pattern) ?? [];
      const candidate = list[(round + offset) % list.length];
      if (candidate && !taken.has(candidate.id)) {
        taken.add(candidate.id);
        chosen.push(candidate);
      }
    }
    round += 1;
  }

  // Not enough distinct movements: repeat what we have, which the player shows
  // as "round 2" rather than pretending it is something new.
  if (chosen.length < count && chosen.length > 0) {
    return cycle(chosen, count, 0);
  }
  return chosen;
}

/** Circuit shape per budget: distinct movements × rounds. */
function circuitShape(moveSeconds: number): {movements: number; rounds: number} {
  if (moveSeconds <= 400) return {movements: 3, rounds: 1};
  if (moveSeconds <= 900) return {movements: 4, rounds: 2};
  return {movements: 5, rounds: 3};
}

const REST_BY_INTENSITY: Record<Intensity, number> = {
  gentle: 10,
  easy: 20,
  moderate: 30,
  strong: 40
};

/**
 * Builds the main training block as work/rest pairs that total `moveSeconds`
 * exactly. Rest shrinks before work does, and work never drops below a length
 * that is actually trainable.
 */
function buildCircuit(
  movements: Exercise[],
  rounds: number,
  moveSeconds: number,
  intensity: Intensity,
  idPrefix: string
): SessionBlock[] {
  if (movements.length === 0) return [];

  const slots: Exercise[] = [];
  for (let round = 0; round < rounds; round++) slots.push(...movements);

  const MIN_WORK = 25;
  let rest = REST_BY_INTENSITY[intensity];
  const restCount = slots.length - 1;

  // Shrink rest until the remaining work budget is genuinely usable.
  while (rest > 0 && moveSeconds - rest * restCount < slots.length * MIN_WORK) {
    rest -= 5;
  }
  rest = Math.max(0, rest);

  const workTotal = moveSeconds - rest * restCount;

  // A timed hold has an honest ceiling: a 25 second dead hang must not become a
  // 75 second one just because the slot is long. Rep-based work has no ceiling,
  // because the person simply does more reps or rests inside the block.
  const caps = slots.map(exercise =>
    exercise.mode === 'time' && exercise.duration
      ? Math.max(MIN_WORK, Math.round((exercise.duration * 1.6) / 5) * 5)
      : undefined
  );

  const {parts: workSeconds, leftover} = allocateCapped(
    workTotal,
    caps,
    5,
    Math.min(MIN_WORK, Math.floor(workTotal / slots.length / 5) * 5)
  );

  // Seconds the caps refused go to rest, which is the honest place for them.
  const restExtra = restCount > 0 && leftover > 0
    ? allocate(leftover, new Array(restCount).fill(1), 5, 0)
    : new Array(Math.max(0, restCount)).fill(0);

  // No rest blocks to absorb it (a single-slot circuit): give it back to work.
  if (restCount === 0 && leftover > 0) workSeconds[0] += leftover;

  const seen = new Map<string, number>();
  const blocks: SessionBlock[] = [];

  slots.forEach((exercise, index) => {
    const round = (seen.get(exercise.id) ?? 0) + 1;
    seen.set(exercise.id, round);
    const next = slots[index + 1];

    blocks.push(
      toBlock(exercise, workSeconds[index], 'move', `${idPrefix}-work-${index}`, {
        round: rounds > 1 ? round : undefined,
        nextName: next?.name
      })
    );

    if (index < restCount) {
      const seconds = rest + (restExtra[index] ?? 0);
      if (seconds > 0) {
        blocks.push({
          id: `${idPrefix}-rest-${index}`,
          kind: 'rest',
          phase: 'move',
          name: 'Rest',
          instructions: 'Let the breath settle. Shake the arms and legs out if that helps.',
          cues: ['Slow the breath down', 'Sip water if you have it'],
          seconds,
          mode: 'time',
          nextName: next?.name
        });
      }
    }
  });

  return blocks;
}

/**
 * A sequence of holds with no rest blocks between them, used for mobility,
 * recovery and breathing. The number of blocks comes from the budget and
 * `targetEach`, so a 40 minute mobility flow becomes more movements rather than
 * six five-minute stretches.
 */
function buildFlow(
  pool: Exercise[],
  totalSeconds: number,
  idPrefix: string,
  options: {variant: number; targetEach: number; minBlocks?: number}
): SessionBlock[] {
  if (pool.length === 0) return [];

  const minBlocks = options.minBlocks ?? 3;
  const count = Math.max(minBlocks, Math.min(Math.round(totalSeconds / options.targetEach), pool.length * 3));
  const picks = cycle(pool, count, options.variant);
  const seconds = allocate(totalSeconds, picks.map(() => 1), 5, 30);

  const seen = new Map<string, number>();
  return picks.map((exercise, index) => {
    const round = (seen.get(exercise.id) ?? 0) + 1;
    seen.set(exercise.id, round);
    return toBlock(exercise, seconds[index], 'move', `${idPrefix}-${index}`, {
      round: count > pool.length ? round : undefined,
      nextName: picks[index + 1]?.name
    });
  });
}

// ——— The engine —————————————————————————————————————————————————————————

/** Fallbacks that need no equipment, so a pool is never empty. */
const SAFE_WARMUP = WARMUPS[0];
const SAFE_BREATH = BREATHING[0];

function requireExercise(id: string, fallback: Exercise): Exercise {
  return getExercise(id) ?? fallback;
}

export function generateSession(input: PlanInput): Session {
  const {profile, checkIn} = input;
  const history = input.history ?? [];
  const variant = input.variant ?? 0;
  const now = input.now ?? new Date();

  const budgets = phaseBudgets(checkIn.minutes);
  const painFlagged = checkIn.pain;
  const needsRecovery = painFlagged || (checkIn.energy === 'low' && checkIn.soreness === 'sore');

  const type: SessionType = painFlagged
    ? 'recovery'
    : needsRecovery
      ? 'recovery'
      : (input.force ?? chooseType(profile, checkIn, history, variant));

  const intensity = chooseIntensity(checkIn, profile, needsRecovery);

  const constraints = input.constraints;
  const filter = {
    level: profile.level,
    equipment: checkIn.equipment,
    gentleOnly: needsRecovery,
    maxSpace: constraints?.space,
    discreetOnly: constraints?.discreet,
    quietOnly: constraints?.quiet
  };

  // ARRIVE — always breathing, always the same shape, so starting is easy.
  const arrive: SessionBlock[] = [
    toBlock(requireExercise('breath-arrive', SAFE_BREATH), budgets.arrive, 'arrive', 'arrive-0', {
      nextName: 'Warm up'
    })
  ];

  // WARM UP — one movement on short sessions, two when there is room.
  const warmupPool = painFlagged
    ? BREATHING_CORE
    : selectPool(WARMUPS, filter);
  const warmupCount = budgets.warmup >= 180 ? 2 : 1;
  const warmupPicks = cycle(warmupPool.length ? warmupPool : [SAFE_WARMUP], warmupCount, variant);
  const warmupSeconds = allocate(budgets.warmup, warmupPicks.map(() => 1), 5, 30);
  const warmup: SessionBlock[] = warmupPicks.map((exercise, index) =>
    toBlock(exercise, warmupSeconds[index], 'warmup', `warmup-${index}`, {
      nextName: warmupPicks[index + 1]?.name
    })
  );

  // MOVE — the part that actually differs by session type.
  let move: SessionBlock[] = [];

  if (painFlagged) {
    // No exercise is prescribed on a pain day: breathing and attention only.
    // Offset past the warm-up picks so the sequence keeps moving forward.
    move = buildFlow(BREATHING_CORE, budgets.move, 'move', {
      variant: variant + warmup.length,
      targetEach: 180
    });
  } else if (type === 'recovery') {
    const gentleMobility = selectPool(MOBILITY, {...filter, gentleOnly: true});
    const pool = gentleMobility.length >= 3 ? gentleMobility : [...gentleMobility, ...BREATHING_CORE];
    move = buildFlow(pool, budgets.move, 'move', {variant, targetEach: 110});
  } else if (type === 'mindful') {
    move = buildFlow(BREATHING_CORE, budgets.move, 'move', {variant, targetEach: 180});
  } else if (type === 'runwalk') {
    move = buildRunWalkBlocks({
      level: profile.level,
      // Jogging through a concourse is not a thing: anywhere that calls for
      // discretion gets walking intervals only.
      gentle: intensity === 'easy' || intensity === 'gentle' || Boolean(constraints?.discreet),
      totalSeconds: budgets.move,
      variant,
      idPrefix: 'move'
    });
  } else if (type === 'mobility') {
    const pool = selectPool(MOBILITY, filter);
    move = buildFlow(pool.length ? pool : MOBILITY, budgets.move, 'move', {variant, targetEach: 95});
  } else {
    // strength / calisthenics / balanced — a circuit of work and rest.
    const exclude = new Set(
      type === 'balanced' ? [] : CARDIO.filter(e => e.category === 'cardio').map(e => e.id)
    );
    let pool = selectPool(MAIN_POOL, {...filter, exclude});

    if (type === 'strength') {
      // Prefer loaded movements, but keep bodyweight in to round the circuit out.
      const loaded = pool.filter(e => e.equipment.length > 0);
      if (loaded.length >= 3) pool = [...loaded, ...pool.filter(e => e.equipment.length === 0)];
    }
    if (type === 'calisthenics') {
      const bodyweight = pool.filter(e => e.equipment.length === 0);
      if (bodyweight.length >= 3) pool = bodyweight;
    }

    if (input.patterns && input.patterns.length > 0) {
      const narrowed = pool.filter(exercise => input.patterns?.includes(exercise.movementPattern));
      // Only narrow when enough movements survive to build a real circuit.
      if (narrowed.length >= 2) pool = narrowed;
    }

    const shape = circuitShape(budgets.move);
    const movements = pickMovements(pool, shape.movements, variant);
    move = buildCircuit(movements, shape.rounds, budgets.move, intensity, 'move');
  }

  // A session is never empty: if every pool filtered down to nothing, fall back
  // to breathing, which needs no equipment and suits any level.
  if (move.length === 0) {
    move = buildFlow(BREATHING_CORE, budgets.move, 'move', {variant, targetEach: 180});
  }

  // RESET — mobility and stretching to close the body down.
  const usedInMove = new Set(move.map(block => block.exerciseId).filter((id): id is string => Boolean(id)));
  const resetAll = selectPool(MOBILITY, {
    level: profile.level,
    equipment: checkIn.equipment,
    gentleOnly: painFlagged,
    maxSpace: constraints?.space,
    discreetOnly: constraints?.discreet,
    quietOnly: constraints?.quiet
  });
  // Closing down with the same stretch the session just held reads as a bug.
  // In a constrained place the pool can be too small to avoid it entirely, so
  // fall back to ordering by what the main block used least rather than
  // abandoning the preference altogether.
  const unused = resetAll.filter(exercise => !usedInMove.has(exercise.id));
  const resetPool =
    unused.length >= 2
      ? unused
      : [...unused, ...resetAll.filter(exercise => usedInMove.has(exercise.id))];
  const resetCount = budgets.reset >= 240 ? 3 : budgets.reset >= 140 ? 2 : 1;
  const resetPicks = cycle(resetPool.length ? resetPool : MOBILITY.filter(e => e.gentle), resetCount, variant + 2);
  const resetSeconds = allocate(budgets.reset, resetPicks.map(() => 1), 5, 30);
  const reset: SessionBlock[] = resetPicks.map((exercise, index) =>
    toBlock(exercise, resetSeconds[index], 'reset', `reset-${index}`, {
      nextName: resetPicks[index + 1]?.name ?? 'Reflect'
    })
  );

  // REFLECT — a short, deliberate close.
  const reflect: SessionBlock[] = [
    toBlock(requireExercise('breath-close', SAFE_BREATH), budgets.reflect, 'reflect', 'reflect-0')
  ];

  const blocks = [...arrive, ...warmup, ...move, ...reset, ...reflect];

  // Link each block to the next by name, so the rest screen can preview it.
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].nextName = blocks[i + 1].name;
  blocks[blocks.length - 1].nextName = undefined;

  const totalSeconds = blocks.reduce((sum, block) => sum + block.seconds, 0);

  return {
    id: `session-${now.getTime()}-${variant}`,
    createdAt: now.toISOString(),
    type,
    title: painFlagged ? 'Gentle Reset' : (input.titleOverride ?? SESSION_TITLES[type]),
    focus: painFlagged ? 'Breathing and body awareness only' : SESSION_FOCUS[type],
    rationale: [buildRationale(checkIn, intensity, type), input.placeNote]
      .filter(Boolean)
      .join(' '),
    intensity,
    minutes: checkIn.minutes,
    totalSeconds,
    blocks,
    checkIn,
    adjustedForRecovery: needsRecovery,
    painFlagged,
    variant
  };
}

/** Phase labels used by the preview and the player. */
export const PHASE_LABEL: Record<SessionBlock['phase'], string> = {
  arrive: 'Arrive',
  warmup: 'Warm up',
  move: 'Move',
  reset: 'Reset',
  reflect: 'Reflect'
};

/** Groups a session's blocks into the five phases, preserving order. */
export function groupByPhase(session: Session): {phase: SessionBlock['phase']; blocks: SessionBlock[]; seconds: number}[] {
  const order: SessionBlock['phase'][] = ['arrive', 'warmup', 'move', 'reset', 'reflect'];
  return order
    .map(phase => {
      const blocks = session.blocks.filter(block => block.phase === phase);
      return {phase, blocks, seconds: blocks.reduce((sum, b) => sum + b.seconds, 0)};
    })
    .filter(group => group.blocks.length > 0);
}

/** Movement blocks only — what "exercises completed" counts against. */
export function exerciseBlocks(session: Session): SessionBlock[] {
  return session.blocks.filter(block => block.kind === 'exercise');
}
