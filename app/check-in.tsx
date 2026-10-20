import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInRight} from 'react-native-reanimated';
import {AlertCircle, Check, ChevronLeft, X} from 'lucide-react-native';
import {
  Button,
  Card,
  ChoiceChip,
  ScreenContainer,
  SegmentedChoice
} from '../src/components';
import {HAIRLINE, MIN_TAP, colors, radius, spacing, type} from '../src/theme';
import {
  BODY_PART_LABELS,
  CheckIn,
  EquipmentId,
  Energy,
  LocationId,
  Mood,
  Soreness,
  TimeBudget
} from '../src/types';
import {useProfileStore} from '../src/store/useProfileStore';
import {useTodayStore} from '../src/store/useTodayStore';
import {useHistoryStore} from '../src/store/useHistoryStore';
import {PAIN_NOTICE} from '../src/engine/planner';
import {hasExpired} from '../src/engine/niggles';
import {useReducedMotion} from '../src/hooks/useMotion';
import {tapSelection} from '../src/lib/haptics';

// Two ways through the same check-in.
//
// Quick is for the person who trains most days: the things that rarely change
// — mood, place, kit — are carried over from last time, so all that is left is
// what actually moved today. One screen, and often one tap.
//
// Full is the seven-step flow, used on the first check-in and whenever someone
// asks for it. Neither path guesses at pain: it is asked every single time.
type Mode = 'quick' | 'full';

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

  const params = useLocalSearchParams<{mode?: string}>();
  const defaults = useTodayStore(state => state.defaults);
  // Quick needs somewhere to carry answers over from; without that it would
  // just be the full flow with questions missing.
  const [mode, setMode] = useState<Mode>(params.mode === 'quick' && defaults ? 'quick' : 'full');

  const [index, setIndex] = useState(0);
  const [building, setBuilding] = useState(false);

  // What is already being trained around, so the quick screen can say so
  // rather than making someone open another screen to find out.
  const niggleSummary = useMemo(() => {
    const active = (profile?.niggles ?? []).filter(entry => !hasExpired(entry));
    if (active.length === 0) return '';
    return active.map(entry => BODY_PART_LABELS[entry.part].toLowerCase()).join(' and ');
  }, [profile]);

  const submit = useCallback(() => {
    if (!profile) return;
    setBuilding(true);
    submitCheckIn(profile, logs)
      .then(() => router.replace('/workout/preview'))
      .catch(() => setBuilding(false));
  }, [logs, profile, router, submitCheckIn]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const advance = useCallback(() => {
    if (!isLast) {
      setIndex(current => current + 1);
      return;
    }
    submit();
  }, [isLast, submit]);

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


  // ——— Quick: one screen, the three things that change ———
  if (mode === 'quick') {
    const equipmentSummary = draft.equipment
      .map(id => EQUIPMENT.find(option => option.value === id)?.label ?? id)
      .join(', ');
    const place = LOCATIONS.find(option => option.value === draft.location)?.label ?? 'Home';

    return (
      <ScreenContainer contentStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close check-in"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.headerButton}
          >
            <X size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <View style={styles.progress} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Answer every question instead"
            onPress={() => setMode('full')}
            hitSlop={12}
            style={styles.moreButton}
          >
            <Text style={styles.moreLabel}>All questions</Text>
          </Pressable>
        </View>

        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(260)}
          style={styles.quickBody}
        >
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.title} accessibilityRole="header">
            How are you arriving?
          </Text>

          <View style={styles.quickGroup}>
            <Text style={styles.quickLabel}>Energy</Text>
            <SegmentedChoice
              label="Energy"
              options={ENERGY}
              value={draft.energy}
              onChange={value => setDraft({energy: value})}
            />
          </View>

          <View style={styles.quickGroup}>
            <Text style={styles.quickLabel}>Soreness</Text>
            <SegmentedChoice
              label="Soreness"
              options={SORENESS}
              value={draft.soreness}
              onChange={value => setDraft({soreness: value})}
            />
          </View>

          <View style={styles.quickGroup}>
            <Text style={styles.quickLabel}>Time</Text>
            <SegmentedChoice
              label="Time available"
              options={TIMES}
              value={draft.minutes}
              onChange={value => setDraft({minutes: value})}
            />
          </View>

          {/* Pain is never carried over and never assumed: one tap, every day. */}
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{checked: draft.pain === true}}
            accessibilityLabel="There is pain I should not train through"
            onPress={() => {
              tapSelection();
              setDraft({pain: !draft.pain});
            }}
            style={[styles.painRow, draft.pain && styles.painRowOn]}
          >
            <View style={[styles.painBox, draft.pain && styles.painBoxOn]}>
              {draft.pain ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
            </View>
            <Text style={styles.painLabel}>There is pain I should not train through</Text>
          </Pressable>

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

          {/* Something tender is a different question from pain that stops
              you: one routes around a part, the other calls the day off. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              niggleSummary
                ? `Training around your ${niggleSummary}. Change this`
                : 'Something tender? Train around it'
            }
            onPress={() => router.push('/niggles')}
            style={styles.niggleRow}
          >
            <Text style={styles.niggleText} numberOfLines={2}>
              {niggleSummary
                ? `Training around your ${niggleSummary}`
                : 'Something tender? Train around it'}
            </Text>
            <Text style={styles.carriedAction}>{niggleSummary ? 'Change' : 'Flag it'}</Text>
          </Pressable>

          {/* What is being reused, stated plainly, and changeable in one tap. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Carried over from last time: ${place}, ${equipmentSummary}. Change these`}
            onPress={() => setMode('full')}
            style={styles.carriedRow}
          >
            <Text style={styles.carriedText} numberOfLines={2}>
              {`${place} · ${equipmentSummary}`}
            </Text>
            <Text style={styles.carriedAction}>Change</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.footer}>
          <Button
            label="Build my session"
            onPress={() => {
              tapSelection();
              submit();
            }}
            loading={building}
            silent
          />
        </View>
      </ScreenContainer>
    );
  }

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

  footer: {paddingTop: spacing.xl},

  moreButton: {height: MIN_TAP, justifyContent: 'center', paddingHorizontal: spacing.xs},
  moreLabel: {...type.label, color: colors.inkFaint},

  quickBody: {flex: 1, paddingTop: spacing.xl},
  quickGroup: {marginTop: spacing.xl, gap: spacing.sm},
  quickLabel: {...type.label, color: colors.inkFaint},

  painRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    minHeight: MIN_TAP
  },
  painRowOn: {borderColor: colors.caution, backgroundColor: colors.cautionSoft},
  painBox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  painBoxOn: {backgroundColor: colors.caution, borderColor: colors.caution},
  painLabel: {...type.small, color: colors.ink, flex: 1},

  niggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: MIN_TAP
  },
  niggleText: {...type.small, color: colors.inkSoft, flex: 1},

  carriedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: MIN_TAP
  },
  carriedText: {...type.caption, color: colors.inkFaint, flex: 1},
  carriedAction: {...type.label, color: colors.primary}
});
