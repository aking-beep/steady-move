import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn} from 'react-native-reanimated';
import {AlertCircle, Check, ChevronLeft, Plus, X} from 'lucide-react-native';
import {Button, Card, ChoiceChip, ScreenContainer, SectionHeader} from '../src/components';
import {HAIRLINE, MIN_TAP, colors, radius, spacing, type} from '../src/theme';
import {BODY_PARTS, BODY_PART_LABELS, BodyPart} from '../src/types';
import {useProfileStore} from '../src/store/useProfileStore';
import {
  CONFIRM_AFTER_DAYS,
  RED_FLAGS,
  RED_FLAG_ADVICE,
  hasExpired
} from '../src/engine/niggles';
import {useReducedMotion} from '../src/hooks/useMotion';
import {tapSelection} from '../src/lib/haptics';

// Flagging something tender, so training routes around it instead of stopping.
//
// Three steps, in this order on purpose: pick the part, answer the screening
// questions, then — and only then — train around it. The questions are not a
// formality to tap through. Any yes and this stops being something an app
// should be solving.

type Step = 'list' | 'part' | 'screen' | 'referred';

export default function Niggles() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const profile = useProfileStore(state => state.profile);
  const addNiggle = useProfileStore(state => state.addNiggle);
  const clearNiggle = useProfileStore(state => state.clearNiggle);

  const [step, setStep] = useState<Step>('list');
  const [part, setPart] = useState<BodyPart | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const active = useMemo(
    () => (profile?.niggles ?? []).filter(niggle => !hasExpired(niggle)),
    [profile]
  );

  const anyFlag = RED_FLAGS.some(flag => answers[flag.id]);
  const allAnswered = RED_FLAGS.every(flag => typeof answers[flag.id] === 'boolean');

  const begin = useCallback(() => {
    setPart(null);
    setAnswers({});
    setStep('part');
  }, []);

  const save = useCallback(async () => {
    if (!part) return;
    if (anyFlag) {
      setStep('referred');
      return;
    }
    await addNiggle(part);
    setStep('list');
  }, [addNiggle, anyFlag, part]);

  const header = (title: string, onBack: () => void) => (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        hitSlop={12}
        style={styles.headerButton}
      >
        <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerButton} />
    </View>
  );

  // ——— Step 2: which part ———
  if (step === 'part') {
    return (
      <ScreenContainer>
        {header('Something tender', () => setStep('list'))}
        <Text style={styles.title} accessibilityRole="header">
          Where is it?
        </Text>
        <Text style={styles.body}>
          Everything that would load it gets left out of your sessions — warm-up and
          stretches included. The rest of your training carries on.
        </Text>

        <View style={styles.stack}>
          {BODY_PARTS.map(option => (
            <ChoiceChip
              key={option}
              label={BODY_PART_LABELS[option]}
              selected={part === option}
              onPress={() => {
                tapSelection();
                setPart(option);
              }}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            label="Next"
            onPress={() => setStep('screen')}
            disabled={!part}
            silent
          />
        </View>
      </ScreenContainer>
    );
  }

  // ——— Step 3: the screening questions ———
  if (step === 'screen') {
    return (
      <ScreenContainer>
        {header('Something tender', () => setStep('part'))}
        <Text style={styles.title} accessibilityRole="header">
          Four questions first
        </Text>
        <Text style={styles.body}>
          These are the things that mean a person should look at it, not an app.
          Answer them honestly — nothing here is stored anywhere but this phone.
        </Text>

        <View style={styles.questions}>
          {RED_FLAGS.map(flag => (
            <View key={flag.id} style={styles.question}>
              <Text style={styles.questionText}>{flag.question}</Text>
              <View style={styles.yesNo}>
                {[
                  {label: 'No', value: false},
                  {label: 'Yes', value: true}
                ].map(option => {
                  const selected = answers[flag.id] === option.value;
                  return (
                    <Pressable
                      key={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{selected, checked: selected}}
                      accessibilityLabel={`${flag.question} ${option.label}`}
                      onPress={() => {
                        tapSelection();
                        setAnswers(current => ({...current, [flag.id]: option.value}));
                      }}
                      style={[styles.yesNoButton, selected && styles.yesNoOn]}
                    >
                      <Text style={[styles.yesNoLabel, selected && styles.yesNoLabelOn]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            label={part ? `Train around my ${BODY_PART_LABELS[part].toLowerCase()}` : 'Continue'}
            onPress={save}
            disabled={!allAnswered}
            silent
          />
          <Text style={styles.disclaimer}>
            Steady Move leaves movements out. It does not diagnose or treat anything.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // ——— Step 3b: one yes, so this is not ours to solve ———
  if (step === 'referred') {
    return (
      <ScreenContainer>
        {header('Something tender', () => setStep('screen'))}
        <Animated.View entering={reduced ? undefined : FadeIn.duration(300)}>
          <Card tone="caution" style={styles.referred}>
            <View style={styles.referredHead}>
              <AlertCircle size={20} color={colors.caution} strokeWidth={2} />
              <Text style={styles.referredTitle}>Worth getting looked at</Text>
            </View>
            <Text style={styles.referredBody}>{RED_FLAG_ADVICE}</Text>
          </Card>

          <Text style={styles.body}>
            In the meantime, breathing and gentle attention are always here, and
            nothing about your streak or your week is lost.
          </Text>

          <View style={styles.footer}>
            <Button
              label="Five quiet minutes"
              onPress={() => router.replace({pathname: '/activity/breathe', params: {minutes: '5'}})}
            />
            <Button label="Back to today" variant="ghost" onPress={() => router.back()} />
          </View>
        </Animated.View>
      </ScreenContainer>
    );
  }

  // ——— Step 1: what is currently flagged ———
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerButton}
        >
          <X size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Training around</Text>
        <View style={styles.headerButton} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Anything bothering you?
      </Text>
      <Text style={styles.body}>
        Flag it and Steady Move builds around it rather than telling you to stop. Each
        flag asks to be confirmed after {CONFIRM_AFTER_DAYS} days, and clears itself if
        you never do — so an old twinge cannot quietly shrink your training for months.
      </Text>

      {active.length > 0 ? (
        <>
          <SectionHeader title="Currently flagged" />
          <Card style={styles.list}>
            {active.map(niggle => (
              <View key={niggle.id} style={styles.row}>
                <View style={styles.rowDot} />
                <Text style={styles.rowLabel}>{BODY_PART_LABELS[niggle.part]}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${BODY_PART_LABELS[niggle.part]} feels fine now`}
                  onPress={() => {
                    tapSelection();
                    void clearNiggle(niggle.id);
                  }}
                  hitSlop={8}
                  style={styles.rowAction}
                >
                  <Check size={15} color={colors.primary} strokeWidth={2.4} />
                  <Text style={styles.rowActionLabel}>Fine now</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <View style={styles.footer}>
        <Button
          label="Flag something"
          onPress={begin}
          icon={<Plus size={17} color={colors.onPrimary} strokeWidth={2.2} />}
        />
      </View>

      <Text style={styles.disclaimer}>
        This is a filter on a movement library, not medical advice. Anything sharp,
        worsening, or still there in a couple of weeks deserves a clinician.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    minHeight: MIN_TAP
  },
  headerButton: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {...type.label, color: colors.inkFaint},

  title: {...type.title, color: colors.ink, marginTop: spacing.xl},
  body: {...type.small, color: colors.inkSoft, marginTop: spacing.md},

  stack: {gap: spacing.md, marginTop: spacing.xxl},

  questions: {marginTop: spacing.xxl, gap: spacing.xl},
  question: {gap: spacing.md},
  questionText: {...type.body, color: colors.ink},
  yesNo: {flexDirection: 'row', gap: spacing.md},
  yesNoButton: {
    flex: 1,
    minHeight: MIN_TAP,
    borderRadius: radius.md,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface
  },
  yesNoOn: {borderColor: colors.primary, backgroundColor: colors.primarySoft},
  yesNoLabel: {...type.bodyStrong, color: colors.inkSoft},
  yesNoLabelOn: {color: colors.primary},

  referred: {gap: spacing.md, marginTop: spacing.xl},
  referredHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  referredTitle: {...type.bodyStrong, color: colors.caution},
  referredBody: {...type.small, color: colors.ink},

  list: {gap: 0, borderRadius: radius.md},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: colors.border
  },
  rowDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.clay},
  rowLabel: {...type.body, color: colors.ink, flex: 1},
  rowAction: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm},
  rowActionLabel: {...type.label, color: colors.primary},

  footer: {marginTop: spacing.xxl, gap: spacing.md},
  disclaimer: {
    ...type.caption,
    color: colors.inkFaint,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl
  }
});
