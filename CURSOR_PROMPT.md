# Cursor / Claude next-step instruction

You are working in `steady-move`, an Expo SDK 57 / React Native / TypeScript offline-first wellness app. Read README.md, src/types.ts, src/data/exercises.ts, src/lib/planner.ts, src/lib/progress.ts, and App.tsx before editing. Do not replace the architecture with a generic boilerplate app.

GOAL: harden the existing functional MVP for real-device testing—not to expand into a paid platform.

EXECUTION:
1. Run `npm install`, `npx expo install --fix`, `npm run check`, and `npx expo-doctor`. Fix dependency, TypeScript, and unit-test errors before anything else. Generate/commit package-lock.json.
2. Test with Expo Go on Android and iOS. Verify onboarding; each energy, soreness, pain, equipment, and movement option; the 10/20/40 minute plans; pause/resume, background timer pausing; skip/restart; partial save; week boundary; local history after restart; and data erasure.
3. Audit wellness wording. Never promise diagnosis, injury prevention, or clinical results. If pain is checked, only offer sedentary breathing/body-scan content, and clearly communicate the safety limitation.
4. Audit accessibility: 44px touch targets, dynamic text scaling, VoiceOver/TalkBack, high contrast, large fonts, focus order, labels. Keep the welcoming editorial green/cream identity.
5. Improve UX based on actual usability defects only. Keep the MVP offline-first and account-free, and do not add trackers, ads, subscription screens, or remote AI without explicit approval.
6. If the app works and the unit tests pass, configure EAS internal distribution builds, but request account/project confirmation before creating remote EAS projects or submitting to stores.
7. Give a clear report: changes made, commands executed, tests and device results, remaining blockers, and exact next steps for private beta.

RULE: Do not claim a mobile smoke test or successful Expo bundling unless actually performed. Do not modify other repositories. Do not add API keys or secrets.
