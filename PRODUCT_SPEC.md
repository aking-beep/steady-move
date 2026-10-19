# Steady Move — product specification (MVP)

## User promise

Movement that meets you where you are. Three actions: check in, get a session
that fits today, show up and have it counted.

## Primary users

Adults who want consistency more than performance. Secondary: busy people with
irregular schedules, and amateur multi-sport athletes wanting an easy day that
is actually easy.

## Product hypothesis

People return to movement more often when they can state the time they have and
disclose how they feel, and receive a short, achievable session that needs no
equipment and finishes when it says it will.

## What this is not

- Not a bodybuilding or physique app. No calorie, body-weight or body-shape
  tracking of any kind.
- Not a medical or rehabilitation product. No diagnosis, no injury protocols,
  no clinical claims.
- Not a guilt engine. No streak shaming, no punitive notifications, no forced
  daily use.
- Not an account product. No sign-up, no credential collection, no sensor or
  GPS recording, no analytics.
- Not for children.

## Core journey

1. **Onboard once.** Goals, level, preferred activities, equipment, usual
   session length, weekly movement days. Never asked again unless reset.
2. **Check in daily.** Energy, mood, soreness, pain, time, location, equipment
   to hand. Roughly fifteen seconds.
3. **Preview a session.** Title, length, intensity, focus, and a plain-language
   explanation of why this session, in the terms the person just reported.
   Rebuild offers another valid session from the same answers.
4. **Perform it.** Timed blocks with cues, a dedicated rest state, pause, skip,
   and haptics. The session survives backgrounding and app restart.
5. **Reflect and save.** How you feel, how the effort was, an optional note.
6. **See it counted.** Progress updates immediately: movement days, minutes,
   streak, type breakdown, recent sessions.

## Rules and safeguards

Enforced in the engine and covered by automated tests, not left to the UI:

- Reported pain → breathing and gentle attention only. No exercise is
  prescribed, at any level, and an explicitly chosen session from Explore is
  overridden.
- Low energy **and** real soreness → gentle recovery session, no load, no
  circuit.
- Low energy, low mood, or soreness alone → same session type, lower intensity.
- Level `new` → difficulty 1 movements only. Level never jumped.
- Equipment not confirmed at check-in → that movement is never prescribed.
- Every generated session totals exactly the chosen budget, rests included.
- Every session contains all five phases: arrive, warm up, move, reset, reflect.
- A session is never empty, whatever the constraints.
- A timed hold is never stretched far past its suggested length.
- No kettlebell swings in the MVP, at any level.
- Weekly progress counts distinct days, not sessions. Weeks start Monday, in
  local time.
- A session counts towards movement days and streaks once 70% of its movement
  blocks are done. Partial saves stay in history and never count.
- Multiple sessions on one day are one movement day.
- A broken streak is never shamed: the copy reads "Start again today."

## Acceptance journey

The build is not finished until this works end to end on an Android device:

New install → onboarding (goals, level, activities, equipment, schedule) →
Today → check in (energy okay, mood good, soreness mild, pain no, 20 minutes,
bodyweight) → a sensible ~20-minute session → start → warm-up → exercises →
rest timer → mobility → reflection → save → Progress updates → close the app →
reopen → onboarding still complete, session still in history, progress still
correct → complete another activity → weekly metrics update.

## Metrics for the pilot

Activation: first session started, and completed. Retention: testers completing
at least one session in week two. Engagement: median weekly completed sessions,
completion rate, total movement days. Qualitative: did it reduce the decision
friction of starting?

## Deferred

Audio and voice guidance, exercise video, progressive multi-week training
blocks, GPS running, Health Connect and Apple Health, wearables, Strava, AI plan
generation, accounts and cloud sync, social features and leaderboards, paid
subscriptions, push reminders, sport-specific conditioning.
