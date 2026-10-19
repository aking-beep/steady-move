// Haptics, wrapped so one setting switches them off everywhere and an
// unsupported device never throws.

import * as Haptics from 'expo-haptics';

let enabled = true;

/** Kept in sync with the Settings toggle by the settings store. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

function safely(run: () => Promise<void>): void {
  if (!enabled) return;
  run().catch(() => {
    // Haptics are a nicety; a device without a motor must not break the flow.
  });
}

/** Light tick: selection changes, chips, stepping through the check-in. */
export function tapSelection(): void {
  safely(() => Haptics.selectionAsync());
}

/** Medium tap: a block completed, a rest skipped. */
export function tapComplete(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Soft tap: a timer reaching zero on its own. */
export function tapTimerEnd(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Success pattern: the whole session finished. */
export function tapSessionComplete(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning pattern: something was discarded or reset. */
export function tapWarning(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
