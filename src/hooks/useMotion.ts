// Motion and timing hooks.

import {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo} from 'react-native';
import {useProfileStore} from '../store/useProfileStore';

/**
 * True when animation should be suppressed — either because the device asks
 * for reduced motion, or because the person turned it off in Settings. Every
 * animated component in the app checks this.
 */
export function useReducedMotion(): boolean {
  const preference = useProfileStore(state => state.settings.reduceMotion);
  const [system, setSystem] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) setSystem(value);
      })
      .catch(() => {
        // Not every platform reports this; assuming motion is fine is safe.
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return preference || system;
}

/**
 * A self-correcting one second interval. `callback` is kept in a ref so the
 * timer is never torn down and restarted just because the callback changed,
 * which would drift the clock.
 */
export function useInterval(callback: () => void, active: boolean, ms = 1000): void {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
