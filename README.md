# steady. — Steady Move

An offline-first movement practice app. You check in with how your day actually
is, get a short realistic plan, and track that you showed up.

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (strict).

> General wellness only. Not diagnosis, rehabilitation, or medical coaching, and
> not for children. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md) for the full product
> boundaries.

## Why it exists

Deciding what to do is the part that stops people. The app removes that decision
with three actions: check in, get a plan sized to the time you actually have,
show up. There is no streak shaming, no calorie or body-shape scoring, no
account, and no cloud.

## Getting started

```bash
npm install
npm start          # Expo dev server — open in Expo Go on a device
npm run ios        # or: npm run android, npm run web
```

Checks:

```bash
npm run typecheck  # tsc --noEmit, strict
npm test           # compiles the pure modules, then node --test
npm run check      # both
npx expo-doctor    # dependency/config health
```

## How it is put together

```
App.tsx                  all four screens, onboarding, and the session runner
app.json                 Expo config (slug steady-move, scheme steadymove)
src/types.ts             shared domain types + defaults
src/data/exercises.ts    exercise library, tagged by phase/focus/level/equipment
src/lib/planner.ts       deterministic plan generation + timer formatting
src/lib/progress.ts      streaks, weekly movement days, recent sessions
src/lib/storage.ts       AsyncStorage read/write with validation on read
tests/*.test.cjs         unit tests for the planner and progress maths
```

`src/types.ts`, `src/data/exercises.ts`, `src/lib/planner.ts` and
`src/lib/progress.ts` import nothing from React Native on purpose — `npm test`
compiles exactly those four into `.test-build/` and runs the suites against
plain Node, so the rules below are tested without a simulator.

## Rules the planner guarantees

These are enforced in `src/lib/planner.ts` and covered by `tests/planner.test.cjs`
across every combination of energy, soreness, pain, time budget, modality, level
and equipment:

- **Pain or injury reported** → mindfulness only (seated breathing and body
  scan), no exercise instructions, and the plan says the app cannot assess an
  injury.
- **Low energy or high soreness** → gentler mobility session, with a
  stop-if-anything-hurts cue on every working block.
- **Beginner** → beginner-appropriate movements only.
- **Dumbbells not selected** → no dumbbell movements, ever. No mat selected → no
  floor-based movements.
- **Every plan lasts exactly the chosen time budget** (10, 20 or 40 minutes).
- **Movement plans always have a warmup and a cooldown**; mindfulness-only plans
  need neither.
- **Same check-in, same plan.** Generation is deterministic: no randomness, no
  network, no model calls.

Progress (`src/lib/progress.ts`): a session counts as complete only when at
least 70% of the timed plan was performed. Partial saves stay in history but
never count towards movement days or streaks. Weekly targets count distinct
days, not sessions, and weeks start on Monday in the device's local time zone.

## Privacy

In this MVP everything is stored unencrypted in AsyncStorage on the device.
There is no account, no server, no cloud backup, no analytics, no ads, and no
GPS or sensor recording. Run + walk guidance is time-based, with no distance or
pace tracking. Uninstalling the app may erase your data; **Settings → Erase
workout history** clears completed sessions on demand.

## Status and next steps

Functional MVP. The planner and progress maths are unit tested; the UI has not
been through a device smoke test in this repository yet.
[CURSOR_PROMPT.md](CURSOR_PROMPT.md) is the hardening checklist for real-device
testing (Expo Go runs on Android and iOS, accessibility audit, wellness wording
audit, then EAS internal distribution).

Deferred by design: audio guidance, video, progressive training blocks, GPS,
Apple Health / Health Connect, AI plan generation, accounts and sync,
leaderboards, subscriptions, sharing, push reminders.
