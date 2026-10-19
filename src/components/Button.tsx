import React, {useCallback} from 'react';
import {ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {MIN_TAP, colors, motion, radius, spacing, type} from '../theme';
import {useReducedMotion} from '../hooks/useMotion';
import {tapSelection} from '../lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark';
export type ButtonSize = 'large' | 'medium' | 'small';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Leading icon element, usually a lucide icon. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Overrides the spoken label when the visible text is not descriptive. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Suppresses the selection tick, e.g. where the action has its own haptic. */
  silent?: boolean;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The app's one button. Press feedback is a subtle scale that collapses to a
 * plain opacity change when reduced motion is on.
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
  fullWidth = true
}: Props) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: reduced ? 1 : 1 - pressed.value * (1 - motion.pressScale)}],
    opacity: 1 - pressed.value * 0.12
  }));

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    if (!silent) tapSelection();
    onPress();
  }, [disabled, loading, onPress, silent]);

  const isDisabled = disabled || loading;

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
        variants[variant].container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color={variants[variant].spinner} />
        ) : (
          <>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text style={[styles.label, labelSizes[size], variants[variant].label]} numberOfLines={2}>
              {label}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TAP
  },
  fullWidth: {alignSelf: 'stretch'},
  inner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm},
  icon: {marginRight: 2},
  label: {textAlign: 'center'},
  disabled: {opacity: 0.4}
});

const sizes = StyleSheet.create({
  large: {paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl},
  medium: {paddingVertical: spacing.md, paddingHorizontal: spacing.xl},
  small: {paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: MIN_TAP}
});

const labelSizes = StyleSheet.create({
  large: {...type.bodyStrong},
  medium: {...type.bodyStrong, fontSize: 15},
  small: {...type.caption, fontWeight: '700'}
});

const variants: Record<ButtonVariant, {container: ViewStyle; label: {color: string}; spinner: string}> = {
  primary: {
    container: {backgroundColor: colors.primary},
    label: {color: colors.onPrimary},
    spinner: colors.onPrimary
  },
  secondary: {
    container: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong},
    label: {color: colors.ink},
    spinner: colors.ink
  },
  ghost: {
    container: {backgroundColor: 'transparent'},
    label: {color: colors.inkSoft},
    spinner: colors.inkSoft
  },
  onDark: {
    container: {backgroundColor: colors.onPrimary},
    label: {color: colors.primary},
    spinner: colors.primary
  }
};

export default Button;
