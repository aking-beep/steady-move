# Steady Move

**Move for today.**

A calm daily movement companion for Android, built with Expo and React Native.
Steady Move asks how you are arriving today, then builds a session that fits —
strength, calisthenics, run/walk, mobility, breathing or recovery — runs it with
you, and records it. Everything happens on the device: no account, no network,
no analytics.

The product philosophy, in one line: **the best workout is the one that fits the
person today and helps them come back tomorrow.**

---

## Run it

```bash
npm install
npx expo start
```

Then press `a` to open on a connected Android device or emulator, or scan the QR
code with **Expo Go**.

Directly to Android:

```bash
npx expo start --android
```

### On your phone with Expo Go

1. Install **Expo Go** from the Play Store.
2. Put the phone and this computer on the same Wi-Fi network.
3. Run `npx expo start` here.
4. Scan the QR code from the terminal with Expo Go (Android scans it from
   inside the Expo Go app, not the camera app).
5. If the phone and computer cannot see each other on the network, run
   `npx expo start --tunnel` instead.

### Installable Android build (APK)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

The `preview` profile in `eas.json` is configured for **internal distribution**
and builds an **APK** rather than an app bundle, so the result can be installed
directly. When the build finishes, EAS prints a URL: open it on the phone and
install, or run `eas build:run --platform android --profile preview` to install
onto a connected device. Android will ask you to allow installation from the
browser the first time.

### Try it in a browser

```bash
npx expo start --web
```

The web build is how this MVP was verified end to end before any device
testing: the full journey below runs in a browser, including persistence
across a reload. To produce a static build:

```bash
npx expo export --platform web --output-dir dist-web
```

Note that the web build is a development and review aid, not a shipping
target. Haptics are silent, `Alert` dialogs (the "leave this session" prompt)
are not rendered by react-native-web, and the Android back button has no
equivalent. Android remains the product.

### Checks

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint
npm test            # node:test over the compiled engine and logic
npm run check       # all three
npx expo-doctor     # dependency and config validation
```

---

## What it does

**Onboarding** asks five questions — goals, level, preferred activities,
equipment, usual session length and weekly movement days — and never asks again
unless you reset it from Settings.

**Today** greets you, offers the daily check-in, shows the week so far
(movement days, minutes, streak) and four Quick Move shortcuts that start a
real session immediately.

**The check-in** is seven steps: energy, mood, soreness, pain, time, location
and equipment to hand. It takes about fifteen seconds.

**The engine** turns that into a session with five parts — *arrive, warm up,
move, reset, reflect* — that lasts exactly as long as you asked for, rests
included. The preview explains, in your own reported terms, why you were given
this session. **Rebuild** produces a different valid session from the same
answers.

**The player** runs the session: a countdown ring per block, form cues on
demand, a dedicated rest state with `+15 sec` and `Skip rest`, pause, skip, and
haptics at each transition. Leaving the app pauses the timer rather than letting
it run on without you, and the session survives being closed entirely.

**Completion** records what you did, asks two optional questions and takes an
optional note. **Progress** updates immediately.

---

## Safety rules

These are enforced in the engine and covered by tests, not left to the UI:

| Reported state | What the app does |
| --- | --- |
| Pain that makes exercise inappropriate | Breathing and gentle attention only. No exercise is prescribed, at any level, even if a specific session was chosen from Explore. |
| Low energy **and** real soreness | A gentle recovery session: no load, no circuit, no rest timers. |
| Low energy, low mood, or soreness alone | The session stays, but the intensity drops. |
| High energy, no soreness, trains regularly | Room to work harder, with reps left in reserve. |

Steady Move never diagnoses anything. The pain path shows: *"Pain is different
from normal training soreness. Consider resting, and seek guidance from a
qualified health professional if the pain is significant, persistent or
concerning."*

The library also gates on capability: a movement is never offered above your
stated level, or without the equipment you said you have. Kettlebell swings are
deliberately absent from the MVP — the ballistic hip snap needs coaching an app
cannot give.

---

## Architecture

```
app/                      expo-router routes; one file per screen
  _layout.tsx             hydration gate, splash, stack
  index.tsx               sends you to onboarding or Today
  onboarding/             welcome, goals, level, activities, equipment,
                          schedule, complete
  (tabs)/                 today, explore, progress, settings
  check-in.tsx            the seven-step daily check-in
  workout/                preview, session (the player), complete
  activity/breathe.tsx    the standalone breathing player

src/
  engine/                 the adaptive session engine
    planner.ts            chooses the session and builds its blocks
    duration.ts           allocation maths; the parts always sum to the whole
    runwalk.ts            run/walk intervals, by effort rather than pace
  data/
    exercises.ts          73 movements with cues, regressions, progressions
    explore.ts            the Explore catalogue
  store/                  four small zustand stores, hydrated at launch
    useProfileStore       profile, settings, onboarding draft
    useTodayStore         today's check-in and the session built from it
    useSessionStore       the running workout
    useHistoryStore       saved sessions
  lib/                    storage, progress maths, dates, haptics, demo data
  components/             Button, Card, ChoiceChip, ProgressRing, Timer,
                          BreathingCircle, ExerciseCard, MetricCard,
                          EmptyState, ScreenContainer, SectionHeader
  theme/                  colour, spacing, radius, type and motion tokens
  hooks/                  reduced motion, interval timing
```

`src/engine`, `src/data` and most of `src/lib` are deliberately free of React
Native imports, so they compile and run under plain Node for testing.

### The workout engine

Deterministic by design: the same profile, check-in, history and variant always
produce the same session. Nothing is random, and nothing calls a network or a
model.

1. **Safety first.** Pain, or low energy with soreness, routes to recovery
   before anything else is considered.
2. **Session type.** Among the activities you enjoy that are actually possible
   right now — run/walk needs somewhere to run, loaded strength needs load — it
   picks the one you have trained least recently. "Rebuild" steps along that
   ranking rather than re-rolling the dice.
3. **Intensity** comes from energy, mood, soreness and level.
4. **Time.** The budget is split across the five phases, and the main block
   takes what is left, so a longer session means more training rather than a
   longer warm-up. Work and rest are allocated in five-second steps that sum to
   exactly the minutes you asked for. A timed hold is capped near its suggested
   length — a 25-second dead hang never becomes a 75-second one — and the
   seconds that releases go to rest.
5. **Selection** walks movement patterns in turn (squat, push, hinge, pull,
   core…) so a circuit is never six squat variations, and repeats the circuit as
   labelled rounds when a session is longer than the available library.

### Storage

AsyncStorage, one key per concern, each wrapped in a versioned envelope
(`STORAGE_VERSION`). Every read is validated field by field: an unknown value
falls back, a corrupt or truncated payload degrades to a safe default, and a
payload from a future version is ignored rather than guessed at. A failed write
never throws into the app. "Delete local data" in Settings removes every key.

### Testing

80 tests across four suites, run with `node:test` against the compiled pure
modules:

- `tests/engine.test.cjs` — session length at 10/20/40 minutes, phase structure,
  the pain and recovery routes, equipment and level gating, determinism,
  rebuild, run/walk effort language, and that a session is never empty. The
  safety assertions sweep thousands of input combinations.
- `tests/progress.test.cjs` — streaks, same-day sessions counting once, week
  boundaries, partial saves never counting, and that the copy never shames.
- `tests/library.test.cjs` — library completeness, wellness wording, every
  Explore entry building a valid session, and the qualification rule.
- `tests/storage.test.cjs` — round trips, corruption, version skew and deletion,
  against a stubbed AsyncStorage.

Beyond the unit suites, the web build is driven in a headless browser to walk
the whole journey and assert there are no runtime errors. That is what caught
the tab bar sizing and the Settings edit flow, neither of which a typecheck or
a unit test can see.

### Demo data

Settings → tap **Version** seven times to reveal the developer section, then
**Seed demo history**. It writes four believable weeks — including a gap, a
restart, a doubled-up day and one partial save that must not count — so
progress, streaks and the weekly chart can be reviewed without completing twenty
sessions by hand.

---

## Accessibility

Minimum 44pt touch targets; every control labelled for TalkBack; selection shown
by fill, border and a tick rather than colour alone; text scales with the OS
setting (the session clock is the one exception, so the digits cannot clip
inside the ring); progress elements expose role and value; and a **Reduce
motion** setting that combines with the device setting to drop every animation
to a still frame.

---

## Known limitations of this MVP

- **Not tested on a physical Android device.** The app has been driven end to
  end in a real browser against the web build — onboarding, the check-in, the
  adaptive session, the player including the rest state, completion, progress,
  persistence across a reload, the pain route, breathing, Explore, Settings
  edit mode and demo seeding, all with no runtime errors — and the Android
  bundle exports cleanly. What that cannot prove is how it feels in the hand:
  touch targets, the Android back button, safe areas around the gesture bar,
  and timer behaviour when the screen sleeps. The acceptance journey in
  `PRODUCT_SPEC.md` is the script for that pass.
- **Timers pause in the background.** Leaving the app pauses the session rather
  than counting on without you. There are no background timers or notifications,
  so a session will not continue with the screen off.
- **No audio or video.** Movements are described in text with cues; there is no
  voice guidance and no demonstration footage.
- **No progressive training plan.** Sessions adapt day to day, but the app does
  not yet build a multi-week block or progress load over time.
- **Run/walk has no GPS.** Sessions are time-based and judged by effort. No
  distance, no pace, no map.
- **Streak qualification is by blocks completed** (70% of the movement blocks),
  not by clock time, so finishing every exercise early still counts.
- **One device, one person.** No account, no sync, no export. Deleting the app
  deletes the history.

## Next phase

Once the daily loop is validated on real devices: progressive training blocks,
voice and audio guidance, Health Connect, optional cloud sync and accounts,
richer personalisation, and sport-specific conditioning. The architecture leaves
seams for these — the engine takes history as an input already — but none of
them are built at the expense of the loop that exists today.

---

Steady Move offers general movement and wellbeing guidance. It is not medical
advice and cannot assess an injury. If something hurts, or you are unsure
whether exercise is right for you, speak to a qualified health professional.
