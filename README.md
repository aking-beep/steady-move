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

**Your space** handles the days you are not where you usually are. Pick a
place — hotel room, office or desk, airport or station, park, a small space,
home, gym — and the session is built for what that place actually allows: how
much room there is, whether people are around, and whether the floor below
matters. An airport session is a walk between gates plus stretches that look
unremarkable at a departure gate; a hotel room session never includes anything
that thuds; an office session never puts you on the floor. You can also say
what you want from it (loosen up, get stronger, get moving, settle down), and
that narrows what the place offers.

**Scan my space** takes that further: photograph the room or your kit, and the
photo is read for what equipment is visible and how much room there is. See
*The photo boundary* below for what that does and — more importantly — what it
does not do.

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

## The photo boundary

Photo analysis is a **perception** step, not a prescription step. This is the
single most important design decision in the feature.

The model is shown one photo and asked for a structured answer in a fixed
vocabulary: which of seven known equipment ids are visible, how much room there
is, whether people are around, whether impact would disturb someone, and one
sentence of summary. It is told, explicitly, never to name an exercise.

Whatever comes back is then validated against the app's own vocabulary — the
same discipline the storage layer uses. Unknown equipment is dropped. An
unrecognised place becomes `null`. An unrecognised amount of room falls back to
the cautious option. Bodyweight is always added back. There is nowhere in the
parsed shape for an exercise to live, so a model that tried to supply one would
have it discarded, and there is a test that proves exactly that.

The validated constraints are then handed to the same deterministic engine as
every other session. Which means every existing guarantee survives contact with
the camera: a `new` user is still only offered difficulty-1 movements, a
movement is still never prescribed without the equipment for it, and a reported
pain flag still overrides the whole thing and produces breathing only — whatever
the photo showed.

The result is also **always shown back for confirmation** before anything is
built. If the model thought your resistance band was a kettlebell, you fix it in
one tap. The person has the last word on what is in their room, not the model.

**What this costs you.** Photo analysis is the one part of Steady Move that is
not offline and not free. It needs your own Claude API key, added in Settings,
and it is off until you add one. The photo goes to Anthropic and nowhere else;
Steady Move has no server and does not store the image. Without a key the Scan
screen still works — it just asks you to tick what you have instead, which is
still faster than nothing. Everything else in the app remains fully offline.

The key is held in the device keystore via `expo-secure-store`. On web there is
no keystore, so it falls back to local storage and the Settings screen says so
rather than implying a safety that is not there.

## Design

The look is meant to sit next to the premium end of the category rather than
the template end of it. Three decisions carry most of that.

**A real typeface, used for two different jobs.** Fraunces, an editorial
serif, sets the few places a screen actually speaks — the date on Today, a
session's name, the welcome headline. Inter Tight sets everything that works:
labels, controls, and every number. System fonts are the single clearest tell
of an unfinished app, and six bundled faces (1.4 MB, imported per weight so the
families' other fifty files stay out of the bundle) remove it.

**Type set deliberately in two directions.** Display sizes carry negative
tracking, because default spacing looks gappy once type is large; all-caps
labels carry positive tracking, for the opposite reason. Both are encoded in
the type scale rather than left to each screen. Numbers that change in place —
the session clock, every statistic — are set with tabular figures so the digits
do not shuffle as they count.

**Separation by tone and hairline, not drop shadow.** Cards are a surface step
plus a hairline. Sections open with a rule and a small-caps label, which is
what makes a column of sections read as a publication rather than a settings
screen. Statistics are oversized and quiet-labelled. One accent — the forest
green — is reserved for action and progress, and nothing else competes with it.

**Two surfaces, one brand.** Daylight (warm paper, forest ink) for browsing,
planning and reflecting. Nightfall (warm near-black, never pure black) for the
session player and the breathing screen, where the primary action inverts to
cream and progress becomes a mint ring. A bright screen in a dim room is the
wrong answer; this is the right one, and it is where the app most resembles the
premium fitness apps it sits beside.

The tokens live in `src/theme/index.ts` — palette, both schemes, the spacing
and radius scales, the type scale, and the motion timings. Screens compose
tokens and never invent a colour or a magic number.

### Known gaps

Dark mode is currently scoped to the player and the breathing screen rather
than offered app-wide. The token system already carries a full `dark` scheme,
so the remaining work is converting each screen's `StyleSheet.create` to a
themed factory — mechanical, but it touches every screen, so it is a separate
change rather than one smuggled into this one.

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
    exercises.ts          85 movements with cues, regressions, progressions
    explore.ts            the Explore catalogue
    places.ts             places, and the constraints each one implies
  store/                  four small zustand stores, hydrated at launch
    useProfileStore       profile, settings, onboarding draft
    useTodayStore         today's check-in and the session built from it
    useSessionStore       the running workout
    useHistoryStore       saved sessions
  lib/                    storage, progress maths, dates, haptics, demo data
    vision.ts             photo -> structured constraints, strictly validated
    secrets.ts            the optional API key, in the device keystore
  components/             Button, Card, ChoiceChip, ProgressRing, Timer,
                          BreathingCircle, ExerciseCard, MetricCard,
                          EmptyState, ScreenContainer, SectionHeader
  theme/                  palette, both schemes, spacing, radius, type, motion
    fonts.ts              the six bundled faces, imported per weight
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

96 tests across five suites, run with `node:test` against the compiled pure
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
- `tests/places.test.cjs` — every place's session staying inside its own
  constraints at every level, pain outranking the place, and the photo boundary:
  unknown values dropped, bodyweight always available, and a scan being unable
  to introduce a movement even when the summary text tries to.

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

- **Photo analysis is unverified against the live API.** The perception path
  is covered by tests on its parsing and its boundary, and the SDK bundles for
  Android, but no real photo has been sent to Claude from this app — there is no
  API key in this environment to do it with. The first thing to try on a device
  is a photo of a real room with a key set.
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
