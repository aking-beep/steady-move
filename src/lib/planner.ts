// Deterministic session planner. Same check-in plus same profile always
// produces the same plan — no randomness, no network, no model calls.
//
// Guarantees enforced here (see PRODUCT_SPEC.md):
//   • reported pain or injury  -> mindfulness only, no exercise instructions
//   • high soreness or low energy -> gentle mobility session + stop-if-pain cues
//   • beginner level -> beginner-appropriate movements only
//   • dumbbells not selected -> never assigns dumbbell movements
//   • total step duration equals the chosen time budget exactly
//   • movement plans always include a warmup and a cooldown

import {CheckIn, Focus, Profile, WorkoutPlan, WorkoutStep} from '../types';
import {COOLDOWNS, Exercise, MAIN, MINDFUL, WARMUPS, selectPool} from '../data/exercises';

const GRAIN = 5;
const STOP_CUE = 'Stop if anything feels painful';

const TITLES: Record<Focus, string> = {
  balanced: 'Everyday strength flow',
  calisthenics: 'Bodyweight strength',
  running: 'Run–walk intervals',
  mobility: 'Mobility flow',
  mindful: 'Mindful reset'
};

const DESCRIPTIONS: Record<Focus, string> = {
  balanced: 'A little of everything: one warmup, a few steady strength and movement blocks, then an unhurried finish.',
  calisthenics: 'Strength with what you have. Self-paced blocks you can scale up or down as you go.',
  running: 'Time-based walking and easy running blocks. No distance, pace or GPS tracking — effort is yours to judge.',
  mobility: 'Slow, comfortable range of motion to help you feel better in your body today.',
  mindful: 'Breathing and body awareness. Nothing to perform, nowhere to get to.'
};

/** mm:ss for the session timer. */
export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Splits `total` seconds across weighted steps so the parts always sum to
 * exactly `total`, in 5 second increments. Leftover seconds go to the steps
 * listed in `topUpOrder` (the main blocks) so warmups stay short.
 */
function allocateSeconds(total: number, weights: number[], topUpOrder: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const out = weights.map(weight =>
    Math.max(GRAIN, Math.floor(total * weight / weightSum / GRAIN) * GRAIN)
  );
  let used = out.reduce((sum, value) => sum + value, 0);
  while (used > total) {
    let largest = 0;
    for (let i = 1; i < out.length; i++) if (out[i] > out[largest]) largest = i;
    if (out[largest] <= GRAIN) break;
    out[largest] -= GRAIN;
    used -= GRAIN;
  }
  const order = topUpOrder.length ? topUpOrder : out.map((_value, index) => index);
  for (let i = 0; used < total; i++) {
    out[order[i % order.length]] += GRAIN;
    used += GRAIN;
  }
  return out;
}

/** Takes `count` movements, cycling the pool when it is smaller than needed. */
function pick(pool: Exercise[], count: number, fallback: Exercise): Exercise[] {
  const source = pool.length ? pool : [fallback];
  const chosen: Exercise[] = [];
  for (let i = 0; i < count; i++) chosen.push(source[i % source.length]);
  return chosen;
}

function toStep(exercise: Exercise, seconds: number, round: number, extraCue?: string): WorkoutStep {
  return {
    title: round > 1 ? `${exercise.title} · round ${round}` : exercise.title,
    instruction: exercise.instruction,
    cues: extraCue ? [...exercise.cues, extraCue] : [...exercise.cues],
    seconds,
    phase: exercise.phase
  };
}

function mainBlockCount(minutes: number): number {
  if (minutes <= 10) return 3;
  if (minutes <= 20) return 4;
  return 6;
}

function mindfulBlockCount(minutes: number): number {
  if (minutes <= 10) return 3;
  if (minutes <= 20) return 4;
  return 5;
}

function mindfulPlan(minutes: number, reason: 'pain' | 'chosen'): WorkoutPlan {
  const count = mindfulBlockCount(minutes);
  const chosen = pick(MINDFUL, count, MINDFUL[0]);
  const seconds = allocateSeconds(minutes * 60, chosen.map(() => 1), []);
  return {
    title: reason === 'pain' ? 'Gentle reset' : TITLES.mindful,
    description:
      reason === 'pain'
        ? 'You told us you are dealing with pain or an injury, so today is breathing and body awareness only — no exercise instructions. This app cannot assess an injury; if pain is new, severe or not settling, please speak to a qualified health professional.'
        : DESCRIPTIONS.mindful,
    intent: 'mindful',
    minutes,
    steps: chosen.map((exercise, index) => toStep(exercise, seconds[index], 1)),
    adjustedForRecovery: reason === 'pain'
  };
}

export function makePlan(checkIn: CheckIn, profile: Profile): WorkoutPlan {
  const minutes = checkIn.minutes;

  // Pain or injury always wins: mindfulness only, no movement instructions.
  if (checkIn.pain) return mindfulPlan(minutes, 'pain');
  if (checkIn.focus === 'mindful') return mindfulPlan(minutes, 'chosen');

  const needsRecovery = checkIn.soreness === 'high' || checkIn.energy === 'low';
  const intent: Focus = needsRecovery ? 'mobility' : checkIn.focus;
  const options = {focus: intent, level: profile.level, equipment: profile.equipment};

  const count = mainBlockCount(minutes);
  const warmup = pick(selectPool(WARMUPS, options), 1, WARMUPS[0])[0];
  const cooldown = pick(selectPool(COOLDOWNS, options), 1, COOLDOWNS[COOLDOWNS.length - 1])[0];
  const mainPool = selectPool(MAIN, options);
  const mainChosen = pick(mainPool, count, MAIN[0]);

  const weights = [2, ...mainChosen.map(() => 5), 2];
  const mainIndexes = mainChosen.map((_exercise, index) => index + 1);
  const seconds = allocateSeconds(minutes * 60, weights, mainIndexes);

  const seen = new Map<string, number>();
  const steps: WorkoutStep[] = [
    toStep(warmup, seconds[0], 1),
    ...mainChosen.map((exercise, index) => {
      const round = (seen.get(exercise.id) ?? 0) + 1;
      seen.set(exercise.id, round);
      return toStep(exercise, seconds[index + 1], round, needsRecovery ? STOP_CUE : undefined);
    }),
    toStep(cooldown, seconds[seconds.length - 1], 1)
  ];

  const description = needsRecovery
    ? `You checked in ${checkIn.energy === 'low' ? 'low on energy' : 'sore'}, so this is a gentler mobility session. Move slowly, keep the range comfortable, and stop if anything feels painful.`
    : DESCRIPTIONS[intent];

  return {
    title: needsRecovery ? 'Recovery mobility flow' : TITLES[intent],
    description,
    intent,
    minutes,
    steps,
    adjustedForRecovery: needsRecovery
  };
}
