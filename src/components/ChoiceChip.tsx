import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {Check} from 'lucide-react-native';
import {colors, motion, radius, spacing, type} from '../theme';
import {useReducedMotion} from '../hooks/useMotion';
import {tapSelection} from '../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Shown under the label on larger chips. */
  detail?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Multi-select chips announce themselves as checkboxes. */
  multiSelect?: boolean;
  disabled?: boolean;
}

/**
 * The selection control used throughout onboarding and the check-in.
 * Selection is shown by fill, border weight AND a tick, never by colour alone.
 */
export function ChoiceChip({
  label,
  selected,
  onPress,
  detail,
  icon,
  style,
  multiSelect = false,
  disabled = false
}: ChipProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: reduced ? 1 : 1 - pressed.value * 0.03}]
  }));

  return (
    <AnimatedPressable
      accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
      accessibilityState={{selected, checked: selected, disabled}}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      disabled={disabled}
      onPress={() => {
        tapSelection();
        onPress();
      }}
      onPressIn={() => {
        pressed.value = withTiming(1, {duration: motion.fast});
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, {duration: motion.base});
      }}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled, animatedStyle, style]}
    >
      {icon ? <View style={styles.chipIcon}>{icon}</View> : null}
      <View style={styles.chipText}>
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
        {detail ? (
          <Text style={[styles.chipDetail, selected && styles.chipDetailSelected]}>{detail}</Text>
        ) : null}
      </View>
      <View style={[styles.tick, selected && styles.tickSelected]}>
        {selected ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
      </View>
    </AnimatedPressable>
  );
}

interface SegmentedProps<T extends string | number> {
  options: {value: T; label: string; detail?: string}[];
  value: T | null;
  onChange: (value: T) => void;
  /** Accessible name for the whole group. */
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** A row of mutually exclusive options, e.g. Low / Okay / High. */
export function SegmentedChoice<T extends string | number>({
  options,
  value,
  onChange,
  label,
  style
}: SegmentedProps<T>) {
  const reduced = useReducedMotion();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segment, style]}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <SegmentButton
            key={String(option.value)}
            label={option.label}
            detail={option.detail}
            selected={selected}
            reduced={reduced}
            onPress={() => {
              tapSelection();
              onChange(option.value);
            }}
          />
        );
      })}
    </View>
  );
}

function SegmentButton({
  label,
  detail,
  selected,
  reduced,
  onPress
}: {
  label: string;
  detail?: string;
  selected: boolean;
  reduced: boolean;
  onPress: () => void;
}) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: reduced ? 1 : 1 - pressed.value * 0.03}]
  }));

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{selected, checked: selected}}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, {duration: motion.fast});
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, {duration: motion.base});
      }}
      style={[styles.segmentItem, selected && styles.segmentItemSelected, animatedStyle]}
    >
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
      {detail ? (
        <Text style={[styles.segmentDetail, selected && styles.segmentDetailSelected]} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipSelected: {borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2},
  disabled: {opacity: 0.4},
  chipIcon: {width: 24, alignItems: 'center'},
  chipText: {flex: 1, gap: 1},
  chipLabel: {...type.bodyStrong, color: colors.ink},
  chipLabelSelected: {color: colors.primary},
  chipDetail: {...type.caption, color: colors.inkFaint, fontWeight: '400'},
  chipDetailSelected: {color: colors.inkSoft},
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tickSelected: {backgroundColor: colors.primary, borderColor: colors.primary},

  segment: {flexDirection: 'row', gap: spacing.sm},
  segmentItem: {
    flex: 1,
    minHeight: 72,
    paddingVertical: spacing.md,
    // Tight horizontal padding: a three-up row has to fit a word like
    // "Occasional" without breaking it across lines.
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  segmentItemSelected: {borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2},
  segmentLabel: {...type.bodyStrong, fontSize: 15, color: colors.ink, textAlign: 'center'},
  segmentLabelSelected: {color: colors.primary},
  segmentDetail: {...type.caption, color: colors.inkFaint, fontWeight: '400', textAlign: 'center'},
  segmentDetailSelected: {color: colors.inkSoft}
});

export default ChoiceChip;
