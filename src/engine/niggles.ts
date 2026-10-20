// Training around a niggle, instead of stopping.
//
// Why this exists, and why it looks the way it does:
//
//   • 53% of 1,387 recreational gym-goers report pain related to their
//     training, most often shoulder, then lower back, then knee
//     (Bernstorff et al., Sports 2023). 57% of 713 gym members report an
//     exercise-related injury (Alrushud, BMC MSK Disorders 2024).
//   • People do not stop. 86% of 570 injured UK parkrun runners kept running
//     through it (Linton & Valentin, 2018). An app whose only answer to a
//     tender shoulder is "rest today" is answering a question nobody asked.
//   • Until this module, Steady Move's only answer WAS that: one pain flag,
//     and the whole session became breathing. Fine for genuine pain, useless
//     for the far more common "my left shoulder is cranky, I still want to
//     train my legs".
//
// The design borrows the one idea the better implementations share — route
// around the movement, not the muscle — and adds the two things they miss:
//
//   1. A red-flag screen first. Four questions drawn from standard
//      musculoskeletal referral guidance (night or rest pain; numbness,
//      weakness or pain spreading down a limb; recent trauma or surgery;
//      feeling systemically unwell). Any yes and this stops being a training
//      question. Fitbod, Gravl and the rest take the flag and filter; none of
//      them ask first.
//   2. An expiry. A flag that quietly excludes half the library for eight
//      months is its own kind of harm, so every niggle asks to be confirmed
//      after two weeks and clears itself if it is not.
//
// This is a filter over a movement library. It does not diagnose, treat or
// rehabilitate anything, and it says so where the person can read it.

import {BodyPart, Niggle} from '../types';
import {conflicts, loadsFor} from '../data/loads';

// Re-exported so callers reason about niggles in one place, while the map of
// what loads what stays beside the movement library it describes.
export {conflicts, loadsFor};

/** Days before a niggle asks whether it is still true. */
export const CONFIRM_AFTER_DAYS = 14;
/** Days after that, unconfirmed, before it clears itself. */
export const EXPIRE_AFTER_DAYS = 21;

/** The parts currently flagged, as a set the pool filter can test against. */
export function flaggedParts(niggles: Niggle[] | undefined, now: Date = new Date()): Set<BodyPart> {
  const parts = new Set<BodyPart>();
  for (const niggle of niggles ?? []) {
    if (hasExpired(niggle, now)) continue;
    parts.add(niggle.part);
  }
  return parts;
}

function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

/** Due to be asked about: two weeks since it was last confirmed. */
export function needsConfirming(niggle: Niggle, now: Date = new Date()): boolean {
  return daysSince(niggle.confirmedAt, now) >= CONFIRM_AFTER_DAYS && !hasExpired(niggle, now);
}

/**
 * Gone stale. A flag nobody has confirmed for three weeks stops filtering, so
 * an afternoon's tenderness in March cannot still be quietly removing half the
 * library in November.
 */
export function hasExpired(niggle: Niggle, now: Date = new Date()): boolean {
  return daysSince(niggle.confirmedAt, now) >= EXPIRE_AFTER_DAYS;
}

/** The first niggle due a confirmation, if any. */
export function dueForConfirming(
  niggles: Niggle[] | undefined,
  now: Date = new Date()
): Niggle | undefined {
  return (niggles ?? []).find(niggle => needsConfirming(niggle, now));
}

// ——— The screen that comes first ———————————————————————————————————————————

export interface RedFlag {
  id: string;
  question: string;
}

/**
 * Asked before a niggle is accepted as a training filter. The wording follows
 * standard musculoskeletal referral guidance — night and rest pain, neurology,
 * recent trauma, and systemic symptoms are the clusters that show up in every
 * guideline (see e.g. NHS GGC MSK self-management red flags; Storari et al.,
 * 2025, review of red flags across clinical practice guidelines).
 *
 * One yes and the app does not build training around it. That is not a
 * diagnosis — it is the app declining to be the thing standing between
 * someone and an actual clinician.
 */
export const RED_FLAGS: RedFlag[] = [
  {
    id: 'rest',
    question: 'Does it wake you at night, or hurt just as much when you are completely still?'
  },
  {
    id: 'neuro',
    question:
      'Is there numbness, pins and needles or weakness — or pain spreading down an arm or a leg?'
  },
  {id: 'trauma', question: 'Was there a fall, an accident or surgery in the last six weeks?'},
  {
    id: 'systemic',
    question: 'Do you feel unwell with it — a temperature, or losing weight without meaning to?'
  }
];

export const RED_FLAG_ADVICE =
  'That is worth having looked at by a GP or a physiotherapist before you train around it. Steady Move can keep you moving gently in the meantime, but it is not the right tool for this and will not pretend otherwise.';
