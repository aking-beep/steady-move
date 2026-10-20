import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import Animated, {useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {colors, motion, tabular, type} from '../theme';
import {useReducedMotion} from '../hooks/useMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0–1. Values outside the range are clamped. */
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Centre content, e.g. a timer or a count. */
  children?: React.ReactNode;
  label?: string;
  /** Spoken description; without it the ring is hidden from screen readers. */
  accessibilityLabel?: string;
}

/**
 * The circular progress indicator used for session progress and block timers.
 * The arc animates towards its target, and snaps straight to it when reduced
 * motion is on.
 */
export function ProgressRing({
  progress,
  size = 220,
  thickness = 7,
  color = colors.primary,
  trackColor = colors.surfaceMuted,
  children,
  label,
  accessibilityLabel
}: Props) {
  const reduced = useReducedMotion();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  const value = useSharedValue(target);

  useEffect(() => {
    value.value = reduced ? target : withTiming(target, {duration: motion.base});
  }, [target, reduced, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value)
  }));

  return (
    <View
      style={[styles.root, {width: size, height: size}]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityValue={accessibilityLabel ? {min: 0, max: 100, now: Math.round(target * 100)} : undefined}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Start the arc at twelve o'clock rather than three.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

/** A slim horizontal bar, used where a ring would be too heavy. */
export function ProgressBar({
  progress,
  color = colors.primary,
  trackColor = colors.surfaceMuted,
  height = 6,
  accessibilityLabel
}: {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
}) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  // Animating a pixel width needs the measured track, so the fill grows
  // smoothly instead of jumping between percentage strings.
  const [width, setWidth] = useState(0);
  const value = useSharedValue(0);

  useEffect(() => {
    const next = width * target;
    value.value = reduced || width === 0 ? next : withTiming(next, {duration: motion.base});
  }, [target, width, reduced, value]);

  const animatedStyle = useAnimatedStyle(() => ({width: value.value}));

  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, {height, backgroundColor: trackColor, borderRadius: height / 2}]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityLabel ? {min: 0, max: 100, now: Math.round(target * 100)} : undefined}
    >
      <Animated.View
        style={[styles.fill, {backgroundColor: color, borderRadius: height / 2}, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {alignItems: 'center', justifyContent: 'center'},
  svg: {position: 'absolute'},
  center: {alignItems: 'center', justifyContent: 'center'},
  label: {...type.caption, color: colors.inkSoft, marginTop: 2, ...tabular},
  track: {overflow: 'hidden', width: '100%'},
  fill: {height: '100%'}
});

export default ProgressRing;
