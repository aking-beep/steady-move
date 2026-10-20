import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {HAIRLINE, Scheme, light, motion, radius, spacing, tabular, type} from '../theme';
import {useReducedMotion} from '../hooks/useMotion';

type Tone = 'surface' | 'sunken' | 'accent' | 'highlight' | 'caution' | 'bare';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: Tone;
  /** Lifts the card off the page. Used sparingly — most cards do not float. */
  floating?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  scheme?: Scheme;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function toneStyle(tone: Tone, scheme: Scheme): ViewStyle {
  switch (tone) {
    case 'sunken':
      return {backgroundColor: scheme.bgSunken};
    case 'accent':
      return {backgroundColor: scheme.accent};
    case 'highlight':
      return {backgroundColor: scheme.highlightSoft};
    case 'caution':
      return {backgroundColor: scheme.cautionSoft};
    case 'bare':
      return {backgroundColor: 'transparent'};
    case 'surface':
    default:
      // Tone plus a hairline, never a drop shadow.
      return {backgroundColor: scheme.surface, borderWidth: HAIRLINE, borderColor: scheme.line};
  }
}

export function Card({
  children,
  style,
  onPress,
  tone = 'surface',
  floating = false,
  accessibilityLabel,
  accessibilityHint,
  scheme = light
}: CardProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: reduced ? 1 : 1 - pressed.value * 0.012}],
    opacity: 1 - pressed.value * 0.06
  }));

  const base = [
    styles.card,
    toneStyle(tone, scheme),
    floating && {
      shadowColor: '#000000',
      shadowOpacity: scheme.name === 'dark' ? 0.4 : 0.1,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: 12},
      elevation: 8
    },
    style
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, {duration: motion.fast});
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, {duration: motion.base});
      }}
      style={[...base, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scheme?: Scheme;
}

/**
 * An editorial section head: a hairline rule, a small-caps label on it, then
 * the title. The rule is what makes a list of sections read as a publication
 * rather than a settings screen.
 */
export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  action,
  style,
  scheme = light
}: SectionHeaderProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={[styles.rule, {backgroundColor: scheme.line}]} />
      {eyebrow ? (
        <Text style={[type.label, {color: scheme.inkFaint, marginTop: spacing.md}]}>{eyebrow}</Text>
      ) : null}
      <View style={styles.sectionRow}>
        <View style={styles.sectionText}>
          <Text style={[type.heading, {color: scheme.ink}]} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={[type.small, {color: scheme.inkMuted, marginTop: 3}]}>{subtitle}</Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

interface StatProps {
  value: string;
  label: string;
  detail?: string;
  /** Renders the number at the larger of the two statistic sizes. */
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  scheme?: Scheme;
  tint?: string;
}

/**
 * A statistic, set the way the research says it reads best: the number
 * oversized and tabular, the label small and quiet beneath it.
 */
export function Stat({value, label, detail, large = false, style, scheme = light, tint}: StatProps) {
  return (
    <View
      style={[styles.stat, style]}
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
    >
      <Text
        style={[large ? type.statLarge : type.stat, tabular, {color: tint ?? scheme.ink}]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {value}
      </Text>
      <Text style={[type.caption, {color: scheme.inkMuted, marginTop: 2}]} numberOfLines={2}>
        {label}
      </Text>
      {detail ? (
        <Text style={[type.caption, {color: scheme.inkFaint}]} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

/** Backwards-compatible wrapper while screens migrate to `Stat`. */
export function MetricCard({
  value,
  label,
  detail,
  style,
  tone = 'surface'
}: {
  value: string;
  label: string;
  detail?: string;
  style?: StyleProp<ViewStyle>;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  return (
    <Card tone={tone} style={[styles.metric, style]}>
      <Stat value={value} label={label} detail={detail} />
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scheme?: Scheme;
}

export function EmptyState({title, body, icon, action, style, scheme = light}: EmptyStateProps) {
  return (
    <Card tone="sunken" style={[styles.empty, style]} scheme={scheme}>
      {icon ? <View style={{marginBottom: spacing.sm}}>{icon}</View> : null}
      <Text style={[type.subheading, {color: scheme.ink, textAlign: 'center'}]}>{title}</Text>
      <Text style={[type.small, {color: scheme.inkMuted, textAlign: 'center', maxWidth: 300}]}>
        {body}
      </Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {borderRadius: radius.lg, padding: spacing.xl},

  section: {marginTop: spacing.xxxl, marginBottom: spacing.lg},
  rule: {height: StyleSheet.hairlineWidth, width: '100%'},
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm
  },
  sectionText: {flex: 1},

  stat: {flex: 1, gap: 0},
  metric: {flex: 1, padding: spacing.lg, minHeight: 104, justifyContent: 'center'},

  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl},
  emptyAction: {marginTop: spacing.lg, alignSelf: 'stretch'}
});

export default Card;
