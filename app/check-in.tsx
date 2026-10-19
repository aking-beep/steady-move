import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInRight} from 'react-native-reanimated';
import {AlertCircle, ChevronLeft, X} from 'lucide-react-native';
import {
  Button,
  Card,
  ChoiceChip,
  ScreenContainer,
  SegmentedChoice
} from '../src/components';
import {MIN_TAP, colors, radius, spacing, type} from '../src/theme';
import {CheckIn, EquipmentId, Energy, LocationId, Mood, Soreness, TimeBudget} from '../src/types';
import {useProfileStore} from '../src/store/useProfileStore';
import {useTodayStore} from '../src/store/useTodayStore';
import {useHistoryStore} from '../src/store/useHistoryStore';
import {PAIN_NOTICE} from '../src/engine/planner';
import {useReducedMotion} from '../src/hooks/useMotion';
import {tapSelection} from '../src/lib/haptics';

type StepId = 'energy' | 'mood' | 'soreness' | 'pain' | 'time' | 'location' | 'equipment';

const STEPS: StepId[] = ['energy', 'mood', 'soreness', 'pain', 'time', 'location', 'equipment'];

const ENERGY: {value: Energy; label: string}[] = [
  {value: 'low', label: 'Low'},
  {value: 'okay', label: 'Okay'},
  {value: 'high', label: 'High'}
];

const MOOD: {value: Mood; label: string}[] = [
  {value: 'low', label: 'Low'},
  {value: 'neutral', label: 'Neutral'},
  {value: 'good', label: 'Good'}
];

const SORENESS: {value: Soreness; label: string}[] = [
  {value: 'none', label: 'None'},
  {value: 'mild', label: 'Mild'},
  {value: 'sore', label: 'Sore'}
];

const TIMES: {value: TimeBudget; label: string; detail: string}[] = [
  {value: 10, label: '10', detail: 'minutes'},
  {value: 20, label: '20', detail: 'minutes'},
  {value: 40, label: '40', detail: 'minutes'}
];

const LOCATIONS: {value: LocationId; label: string; detail: string}[] = [
  {value: 'home', label: 'Home', detail: 'Indoors, whatever space you have'},
  {value: 'gym', label: 'Gym', detail: 'Full kit available'},
  {value: 'outside', label: 'Outside', detail: 'Somewhere to walk or run'},
  {value: 'anywhere', label: 'Anywhere', detail: 'Surprise me'}
];

const EQUIPMENT: {value: EquipmentId; label: string}[] = [
  {value: 'bodyweight', label: 'None / bodyweight'},
  {value: 'dumbbells', label: 'Dumbbells'},
  {value: 'kettlebells', label: 'Kettlebells'},
  {value: 'bands', label: 'Resistance bands'},
  {value: 'pullup-bar', label: 'Pull-up bar'},
  {value: 'full-gym', label: 'Full gym'},
  {value: 'outdoors', label: 'Outdoors'}
];

const COPY: Record<StepId, {title: string; subtitle?: string}> = {
  energy: {title: 'How is your energy?', subtitle: 'However you answer is fine. This only changes what gets suggested.'},
  mood: {title: 'How are you feeling?', subtitle: 'Some days the point of moving is the mood, not the muscles.'},
  soreness: {title: 'Any soreness?', subtitle: 'Normal training soreness from previous sessions.'},
  pain: {title: 'Are you experiencing pain that makes exercise inappropriate today?'},
  time: {title: 'How long do you have?', subtitle: 'Sessions are built to finish on time, including rests.'},
  location: {title: 'Where are you?'},
  equipment: {title: 'What do you have with you?', subtitle: 'Pick everything that is actually to hand right now.'}
};

export default function CheckInScreen() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const profile = useProfileStore(state => state.profile);
  const draft = useTodayStore(state => state.draft);
  const setDraft = useTodayStore(state => state.setDraft);
  const toggleEquipment = useTodayStore(state => state.toggleDraftEquipment);
  const submitCheckIn = useTodayStore(state => state.submitCheckIn);
  const logs = useHistoryStore(state => state.logs);

  const [index, setIndex] = useState(0);
  const [building, setBuilding] = useState(false);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const advance = useCallback(() => {
    if (!isLast) {
      setIndex(current => current + 1);
      return;
    }
    if (!profile) return;

    setBuilding(true);
    submitCheckIn(profile, logs)
      .then(() => router.replace('/workout/preview'))
      .catch(() => setBuilding(false));
  }, [isLast, logs, profile, router, submitCheckIn]);

  const goBack = useCallback(() => {
    if (index === 0) {
      router.back();
      return;
    }
    setIndex(current => current - 1);
  }, [index, router]);

  /** Choosing an option on a single-choice step moves the flow along. */
  const pick = useCallback(
    (patch: Partial<CheckIn>) => {
      setDraft(patch);
      // A short beat so the selection is visibly registered before moving on.
      setTimeout(() => {
        setIndex(current => (current < STEPS.length - 1 ? current + 1 : current));
      }, 180);
    },
    [setDraft]
  );

  const content = useMemo(() => {
    switch (step) {
      case 'energy':
        return (
          <SegmentedChoice
            label="Energy"
            options={ENERGY}
            value={draft.energy}
            onChange={value => pick({energy: value})}
          />
        );
      case 'mood':
        return (
          <SegmentedChoice
            label="Mood"
            options={MOOD}
            value={draft.mood}
            onChange={value => pick({mood: value})}
          />
        );
      case 'soreness':
        return (
          <SegmentedChoice
            label="Soreness"
            options={SORENESS}
            value={draft.soreness}
            onChange={value => pick({soreness: value})}
          />
        );
      case 'pain':
        return (
          <View style={styles.stack}>
            <ChoiceChip
              label="No"
              detail="Nothing that stops me moving today"
              selected={draft.pain === false}
              onPress={() => pick({pain: false})}
            />
            <ChoiceChip
              label="Yes"
              detail="There is pain I should not train through"
              selected={draft.pain === true}
              onPress={() => setDraft({pain: true})}
            />
            {draft.pain ? (
              <Animated.View entering={reduced ? undefined : FadeIn.duration(300)}>
                <Card tone="caution" style={styles.notice}>
                  <View style={styles.noticeHead}>
                    <AlertCircle size={18} color={colors.caution} strokeWidth={2} />
                    <Text style={styles.noticeTitle}>Today will be gentle</Text>
                  </View>
                  <Text style={styles.noticeBody}>{PAIN_NOTICE}</Text>
                </Card>
              </Animated.View>
            ) : null}
          </View>
        );
      case 'time':
        return (
          <SegmentedChoice
            label="Time available"
            options={TIMES}
            value={draft.minutes}
            onChange={value => pick({minutes: value})}
          />
        );
      case 'location':
        return (
          <View style={styles.stack}>
            {LOCATIONS.map(option => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                detail={option.detail}
                selected={draft.location === option.value}
                onPress={() => pick({location: option.value})}
              />
            ))}
          </View>
        );
      case 'equipment':
        return (
          <View style={styles.stack}>
            {EQUIPMENT.map(option => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                multiSelect
                selected={draft.equipment.includes(option.value)}
                onPress={() => toggleEquipment(option.value)}
              />
            ))}
          </View>
        );
      default:
        return null;
    }
  }, [draft, pick, reduced, setDraft, step, toggleEquipment]);

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={index === 0 ? 'Close check-in' : 'Previous question'}
          onPress={goBack}
          hitSlop={12}
          style={styles.headerButton}
        >
          {index === 0 ? (
            <X size={22} color={colors.ink} strokeWidth={2} />
          ) : (
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          )}
        </Pressable>

        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={`Question ${index + 1} of ${STEPS.length}`}
          accessibilityValue={{min: 1, max: STEPS.length, now: index + 1}}
        >
          {STEPS.map((id, position) => (
            <View key={id} style={[styles.tick, position <= index && styles.tickDone]} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close check-in"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerButton}
        >
          <X size={20} color={colors.inkFaint} strokeWidth={2} />
        </Pressable>
      </View>

      <Animated.View
        // Keyed on the step so each question animates in on its own.
        key={step}
        entering={reduced ? undefined : FadeInRight.duration(260)}
        style={styles.body}
      >
        <Text style={styles.eyebrow}>{`${index + 1} OF ${STEPS.length}`}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {COPY[step].title}
        </Text>
        {COPY[step].subtitle ? <Text style={styles.subtitle}>{COPY[step].subtitle}</Text> : null}
        <View style={styles.options}>{content}</View>
      </Animated.View>

      <View style={styles.footer}>
        <Button
          label={isLast ? 'Build my session' : 'Continue'}
          onPress={() => {
            tapSelection();
            advance();
          }}
          loading={building}
          silent
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {paddingBottom: spacing.xl},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    minHeight: MIN_TAP
  },
  headerButton: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  progress: {flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center'},
  tick: {flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted},
  tickDone: {backgroundColor: colors.primary},

  body: {flex: 1, paddingTop: spacing.xxl},
  eyebrow: {...type.eyebrow, color: colors.inkFaint},
  title: {...type.title, color: colors.ink, marginTop: spacing.sm},
  subtitle: {...type.body, color: colors.inkSoft, marginTop: spacing.sm},
  options: {marginTop: spacing.xxl},
  stack: {gap: spacing.md},

  notice: {gap: spacing.sm, marginTop: spacing.sm},
  noticeHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  noticeTitle: {...type.bodyStrong, color: colors.caution},
  noticeBody: {...type.small, color: colors.ink},

  footer: {paddingTop: spacing.xl}
});
