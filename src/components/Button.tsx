import React, {useCallback} from 'react';
import {ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {HAIRLINE, MIN_TAP, Scheme, light, motion, radius, spacing, type} from '../theme';
import {useReducedMotion} from '../hooks/useMotion';
import {tapSelection} from '../lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'large' | 'medium' | 'small';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Suppresses the selection tick where the action has its own haptic. */
  silent?: boolean;
  fullWidth?: boolean;
  /** The surface this button sits on. Pass `dark` inside the player. */
  scheme?: Scheme;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * One button, three weights. The label is set in the UI face at a semibold
 * weight with slight negative tracking — the same treatment as a heading, so
 * a row of controls reads as part of the page rather than bolted onto it.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityLabel,
  accessibilityHint,
  silent = false,
  fullWidth = true,
  scheme = light
}: Props) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: reduced ? 1 : 1 - pressed.value * (1 - motion.pressScale)}],
    opacity: 1 - pressed.value * 0.1
  }));

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    if (!silent) tapSelection();
    onPress();
  }, [disabled, loading, onPress, silent]);

  const isDisabled = disabled || loading;
  const tone = toneFor(variant, scheme);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      onPress={handlePress}
      onPressIn={() => {
        pressed.value = withTiming(1, {duration: motion.fast});
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, {duration: motion.base});
      }}
      style={[
        styles.base,
        sizes[size],
        {backgroundColor: tone.bg, borderColor: tone.border, borderWidth: tone.border ? HAIRLINE * 2 : 0},
        fullWidth && styles.fullWidth,
        animatedStyle,
        // After the animated style, not before: the press animation sets
        // opacity on every frame, so a dimmed disabled button placed earlier
        // was being painted back to full strength.
        isDisabled && styles.disabled,
        style
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color={tone.ink} />
        ) : (
          <>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text style={[labelSizes[size], {color: tone.ink}]} numberOfLines={2}>
              {label}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

function toneFor(variant: ButtonVariant, scheme: Scheme): {bg: string; ink: string; border?: string} {
  switch (variant) {
    case 'primary':
      return {bg: scheme.accent, ink: scheme.accentInk};
    case 'secondary':
      return {bg: 'transparent', ink: scheme.ink, border: scheme.lineStrong};
    case 'ghost':
    default:
      return {bg: 'transparent', ink: scheme.inkMuted};
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TAP + 8
  },
  fullWidth: {alignSelf: 'stretch'},
  inner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm},
  icon: {marginRight: 1},
  disabled: {opacity: 0.35}
});

const sizes = StyleSheet.create({
  large: {paddingVertical: spacing.lg + 2, paddingHorizontal: spacing.xxl},
  medium: {paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: MIN_TAP + 2},
  small: {paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: MIN_TAP}
});

const labelSizes = StyleSheet.create({
  large: {...type.bodyStrong, letterSpacing: -0.1},
  medium: {...type.smallStrong},
  small: {...type.caption, fontFamily: type.bodyStrong.fontFamily}
});

export default Button;
