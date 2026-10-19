import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ChevronLeft} from 'lucide-react-native';
import {MIN_TAP, colors, radius, spacing, type} from '../theme';
import {Button} from './Button';
import {ScreenContainer} from './ScreenContainer';

interface Props {
  /** 1-based position in the flow, used for the progress strip. */
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Primary action label, e.g. "Continue". */
  cta: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  /** Hides the back control on the first screen. */
  showBack?: boolean;
  /** Replaces the default footer note. */
  footnote?: string;
  /**
   * True when the screen was opened from Settings to change one answer. The
   * progress strip is meaningless there, and the action saves rather than
   * walking the person through the rest of the flow.
   */
  editing?: boolean;
}

/**
 * The shared frame for every onboarding question: progress, a heading, the
 * choices, and a single action. Keeping one frame means the flow never shifts
 * under the thumb between steps.
 */
export function OnboardingStep({
  step,
  total,
  title,
  subtitle,
  children,
  cta,
  onContinue,
  continueDisabled = false,
  showBack = true,
  footnote,
  editing = false
}: Props) {
  const router = useRouter();

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}

        {editing ? (
          <Text style={styles.editingLabel}>EDIT</Text>
        ) : (
          <View
            style={styles.progress}
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step} of ${total}`}
            accessibilityValue={{min: 1, max: total, now: step}}
          >
            {Array.from({length: total}, (_value, index) => (
              <View key={index} style={[styles.tick, index < step && styles.tickDone]} />
            ))}
          </View>
        )}

        <View style={styles.back} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.options}>{children}</View>
      </View>

      <View style={styles.footer}>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
        <Button label={cta} onPress={onContinue} disabled={continueDisabled} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {paddingBottom: spacing.xl},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    minHeight: MIN_TAP
  },
  back: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  progress: {flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center'},
  editingLabel: {...type.eyebrow, color: colors.inkFaint, flex: 1, textAlign: 'center'},
  tick: {flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted},
  tickDone: {backgroundColor: colors.primary},

  body: {flex: 1, paddingTop: spacing.xxl},
  title: {...type.title, color: colors.ink},
  subtitle: {...type.body, color: colors.inkSoft, marginTop: spacing.sm},
  options: {marginTop: spacing.xxl, gap: spacing.md},

  footer: {gap: spacing.md, paddingTop: spacing.xl},
  footnote: {...type.caption, color: colors.inkFaint, fontWeight: '400', textAlign: 'center'}
});

export default OnboardingStep;
