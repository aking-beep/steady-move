import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import {colors, spacing, type} from '../theme';
import {useInterval, useReducedMotion} from '../hooks/useMotion';

/** Inhale 4, hold 1, exhale 5 — a calm, repeatable ten-second cycle. */
export const BREATH_PHASES = [
  {label: 'Inhale', seconds: 4, scale: 1},
  {label: 'Hold', seconds: 1, scale: 1},
  {label: 'Exhale', seconds: 5, scale: 0.6}
] as const;

export const CYCLE_SECONDS = BREATH_PHASES.reduce((sum, phase) => sum + phase.seconds, 0);

/**
 * Where a given second of the cycle falls. Deriving this from one counter
 * keeps the label, the count and the animation in step, with no nested state
 * updates to double-advance the phase.
 */
export function phaseAt(elapsed: number): {index: number; remaining: number} {
  let offset = elapsed % CYCLE_SECONDS;
  for (let index = 0; index < BREATH_PHASES.length; index++) {
    const seconds = BREATH_PHASES[index].seconds;
    if (offset < seconds) return {index, remaining: seconds - offset};
    offset -= seconds;
  }
  return {index: 0, remaining: BREATH_PHASES[0].seconds};
}

interface Props {
  size?: number;
  /** Stops the animation and parks the circle at rest. */
  paused?: boolean;
  color?: string;
  trackColor?: string;
  /** Shown under the phase label, usually the remaining time. */
  caption?: string;
}

/**
 * The breathing guide: a circle that expands on the inhale and contracts on the
 * exhale, with the phase named in the middle so the pace is readable without
 * watching the motion. With reduced motion on, the circle holds still and only
 * the written phase changes — the exercise still works, it just stops moving.
 */
export function BreathingCircle({
  size = 260,
  paused = false,
  color = colors.primary,
  trackColor = colors.primarySoft,
  caption
}: Props) {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  const scale = useSharedValue(0.6);
  const glow = useSharedValue(0.3);

  // One counter drives everything: the written phase, the count and the motion.
  useInterval(() => setElapsed(value => (value + 1) % CYCLE_SECONDS), !paused, 1000);

  const {index: phaseIndex, remaining: phaseRemaining} = phaseAt(elapsed);
  const phase = BREATH_PHASES[phaseIndex];

  useEffect(() => {
    if (paused || reduced) {
      scale.value = withTiming(0.8, {duration: 300});
      glow.value = withTiming(0.3, {duration: 300});
      return;
    }

    const duration = phase.seconds * 1000;
    const easing = Easing.inOut(Easing.ease);

    if (phase.label === 'Inhale') {
      scale.value = withTiming(1, {duration, easing});
      glow.value = withTiming(0.9, {duration, easing});
    } else if (phase.label === 'Exhale') {
      scale.value = withTiming(0.6, {duration, easing});
      glow.value = withTiming(0.3, {duration, easing});
    } else {
      // Hold: a barely perceptible settle, so the circle does not look frozen.
      scale.value = withSequence(
        withTiming(1.01, {duration: duration / 2, easing}),
        withTiming(1, {duration: duration / 2, easing})
      );
    }
  }, [phaseIndex, paused, reduced, phase.label, phase.seconds, scale, glow]);

  const circleStyle = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  const glowStyle = useAnimatedStyle(() => ({opacity: glow.value, transform: [{scale: scale.value * 1.12}]}));

  const inner = useMemo(() => size * 0.72, [size]);

  return (
    <View
      style={[styles.root, {width: size, height: size}]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${phase.label} for ${phase.seconds} seconds`}
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={[
          styles.glow,
          {width: inner, height: inner, borderRadius: inner / 2, backgroundColor: trackColor},
          glowStyle
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          {width: inner, height: inner, borderRadius: inner / 2, borderColor: color},
          circleStyle
        ]}
      >
        <Text style={[styles.phase, {color}]}>{phase.label.toUpperCase()}</Text>
        <Text style={styles.count}>{phaseRemaining}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {alignItems: 'center', justifyContent: 'center'},
  glow: {position: 'absolute'},
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: colors.surface,
    gap: spacing.xs
  },
  phase: {...type.eyebrow},
  count: {...type.display, color: colors.ink, fontWeight: '300'},
  caption: {...type.caption, color: colors.inkFaint, fontWeight: '400'}
});

export default BreathingCircle;
