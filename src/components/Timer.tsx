import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, type} from '../theme';
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
  paused = false
}: Props) {
  const safeTotal = Math.max(1, total);
  const progress = Math.max(0, Math.min(1, remaining / safeTotal));
  const clock = value ?? formatSeconds(remaining);

  return (
    <ProgressRing
      progress={progress}
      size={size}
      thickness={12}
      color={color}
      trackColor={trackColor}
      accessibilityLabel={`${caption ? `${caption}. ` : ''}${formatSeconds(remaining)} remaining${paused ? ', paused' : ''}`}
    >
      <View style={styles.center}>
        {caption ? <Text style={styles.caption}>{caption.toUpperCase()}</Text> : null}
        <Text style={[styles.clock, paused && styles.paused]} allowFontScaling={false}>
          {clock}
        </Text>
        {paused ? <Text style={styles.pausedLabel}>PAUSED</Text> : null}
      </View>
    </ProgressRing>
  );
}

const styles = StyleSheet.create({
  center: {alignItems: 'center', gap: spacing.xs},
  caption: {...type.eyebrow, color: colors.inkFaint},
  // Font scaling is disabled on the clock alone: the digits must never wrap or
  // clip inside the ring. Every other label in the app scales normally.
  clock: {...type.timer, color: colors.ink},
  paused: {color: colors.inkFaint},
  pausedLabel: {...type.eyebrow, color: colors.clay}
});

export default Timer;
