import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Scheme, colors, light, spacing, tabular, type} from '../theme';
import {formatSeconds} from '../engine/duration';
import {ProgressRing} from './ProgressRing';

interface Props {
  /** Seconds left on the current block. */
  remaining: number;
  /** Full length of the block, used for the ring fill. */
  total: number;
  size?: number;
  color?: string;
  trackColor?: string;
  /** Small line above the clock, e.g. "Work" or "Rest". */
  caption?: string;
  /** Replaces the clock, e.g. with a rep target. */
  value?: string;
  paused?: boolean;
  scheme?: Scheme;
}

/**
 * A countdown inside a progress ring. The ring drains as the block runs, so
 * the time left is readable at a glance from across a room.
 */
export function Timer({
  remaining,
  total,
  size = 240,
  color = colors.primary,
  trackColor = colors.surfaceMuted,
  caption,
  value,
  paused = false,
  scheme = light
}: Props) {
  const safeTotal = Math.max(1, total);
  const progress = Math.max(0, Math.min(1, remaining / safeTotal));
  const clock = value ?? formatSeconds(remaining);

  return (
    <ProgressRing
      progress={progress}
      size={size}
      thickness={6}
      color={color}
      trackColor={trackColor}
      accessibilityLabel={`${caption ? `${caption}. ` : ''}${formatSeconds(remaining)} remaining${paused ? ', paused' : ''}`}
    >
      <View style={styles.center}>
        {caption ? (
          <Text style={[styles.caption, {color: scheme.inkFaint}]}>{caption}</Text>
        ) : null}
        <Text
          style={[styles.clock, {color: paused ? scheme.inkFaint : scheme.ink}]}
          allowFontScaling={false}
        >
          {clock}
        </Text>
        {paused ? (
          <Text style={[styles.pausedLabel, {color: scheme.highlight}]}>Paused</Text>
        ) : null}
      </View>
    </ProgressRing>
  );
}

const styles = StyleSheet.create({
  center: {alignItems: 'center', gap: spacing.xs},
  caption: {...type.label, color: colors.inkFaint},
  // Font scaling is off on the clock alone: the digits must never wrap or clip
  // inside the ring, and tabular figures stop them shuffling as they count.
  clock: {...type.timer, ...tabular, color: colors.ink},
  pausedLabel: {...type.label, color: colors.clay}
});

export default Timer;
