import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {MIN_TAP, colors, elevation, motion, radius, spacing, type} from '../theme';
import {useReducedMotion} from '../hooks/useMotion';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Makes the whole card a button. */
  onPress?: () => void;
  tone?: 'surface' | 'muted' | 'primary' | 'sage' | 'clay' | 'caution';
  raised?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TONES: Record<NonNullable<CardProps['tone']>, ViewStyle> = {
  surface: {backgroundColor: colors.surface},
  muted: {backgroundColor: colors.surfaceMuted},
  primary: {backgroundColor: colors.primary},
  sage: {backgroundColor: colors.sageSoft},
  clay: {backgroundColor: colors.claySoft},
  caution: {backgroundColor: colors.cautionSoft}
};

export function Card({
  children,
  style,
  onPress,
  tone = 'surface',
  raised = false,
  accessibilityLabel,
  accessibilityHint
}: CardProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: reduced ? 1 : 1 - pressed.value * 0.02}],
    opacity: 1 - pressed.value * 0.08
  }));

  const content = [styles.card, TONES[tone], raised ? elevation.raised : elevation.card, style];

  if (!onPress) return <View style={content}>{children}</View>;

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
      style={[...content, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Small all-caps line above the title. */
  eyebrow?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({title, subtitle, eyebrow, action, style}: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

interface MetricCardProps {
  value: string;
  label: string;
  /** Short line under the value, e.g. "of 5 days". */
  detail?: string;
  tone?: CardProps['tone'];
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function MetricCard({value, label, detail, tone = 'surface', style, icon}: MetricCardProps) {
  const onDark = tone === 'primary';
  return (
    <Card
      tone={tone}
      style={[styles.metric, style]}
      // One spoken string reads far better than three separate fragments.
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
    >
      <View
        accessible
        accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
        style={styles.metricInner}
      >
        {icon ? <View style={styles.metricIcon}>{icon}</View> : null}
        <Text style={[styles.metricValue, onDark && {color: colors.onPrimary}]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.metricLabel, onDark && {color: colors.primarySoft}]} numberOfLines={2}>
          {label}
        </Text>
        {detail ? (
          <Text style={[styles.metricDetail, onDark && {color: colors.primarySoft}]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Shown wherever there is genuinely nothing yet. Never an error, never a nag. */
export function EmptyState({title, body, icon, action, style}: EmptyStateProps) {
  return (
    <Card tone="muted" style={[styles.empty, style]}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {borderRadius: radius.lg, padding: spacing.xl},

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  },
  sectionText: {flex: 1, gap: 2},
  eyebrow: {...type.eyebrow, color: colors.inkFaint},
  sectionTitle: {...type.heading, color: colors.ink},
  sectionSubtitle: {...type.small, color: colors.inkSoft},

  metric: {flex: 1, padding: spacing.lg, minHeight: 104, justifyContent: 'center'},
  metricInner: {gap: 2},
  metricIcon: {marginBottom: spacing.xs},
  metricValue: {...type.title, color: colors.ink},
  metricLabel: {...type.caption, color: colors.inkSoft},
  metricDetail: {...type.caption, color: colors.inkFaint, fontWeight: '400'},

  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl},
  emptyIcon: {marginBottom: spacing.xs},
  emptyTitle: {...type.subheading, color: colors.ink, textAlign: 'center'},
  emptyBody: {...type.small, color: colors.inkSoft, textAlign: 'center', maxWidth: 280},
  emptyAction: {marginTop: spacing.md, alignSelf: 'stretch', minHeight: MIN_TAP}
});

export default Card;
