import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, AppState, AppStateStatus, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInUp} from 'react-native-reanimated';
import {Check, Pause, Play, Plus, Repeat, SkipForward, X} from 'lucide-react-native';
import {Button, ProgressBar, ScreenContainer, Timer} from '../../src/components';
import {HAIRLINE, MIN_TAP, dark, progressColor, radius, spacing, tabular, type} from '../../src/theme';
import {
  currentBlock,
  sessionProgress,
  sessionRemaining,
  useSessionStore
} from '../../src/store/useSessionStore';
import {formatSeconds} from '../../src/engine/duration';
import {PHASE_LABEL} from '../../src/engine/planner';
import {useInterval, useReducedMotion} from '../../src/hooks/useMotion';
import {swapBlock} from '../../src/engine/swap';
import {useProfileStore} from '../../src/store/useProfileStore';
import {tapComplete, tapSessionComplete, tapTimerEnd} from '../../src/lib/haptics';

export default function SessionPlayer() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const state = useSessionStore();
  const {session, remaining, running, finished} = state;
  const block = currentBlock(state);

  const [showCues, setShowCues] = useState(false);
  const [swapStep, setSwapStep] = useState(0);
  const navigated = useRef(false);
  const profile = useProfileStore(state => state.profile);

  // The timer lives here, not in the store, so it can never outlive the screen.
  useInterval(
    () => {
      const ranOut = useSessionStore.getState().tick();
      if (ranOut) {
        tapTimerEnd();
        useSessionStore.getState().completeBlock();
      }
    },
    running && !finished,
    1000
  );

  // Leaving the app pauses rather than racing on without the person. Coming
  // back to a timer that kept counting would quietly ruin the session record.
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== 'active' && useSessionStore.getState().running) {
        useSessionStore.getState().pause();
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  // Finishing routes once, and only once.
  useEffect(() => {
    if (finished && !navigated.current) {
      navigated.current = true;
      tapSessionComplete();
      router.replace('/workout/complete');
    }
  }, [finished, router]);

  const onComplete = useCallback(() => {
    tapComplete();
    useSessionStore.getState().completeBlock();
    setShowCues(false);
    setSwapStep(0);
  }, []);

  /**
   * Replaces the movement in front of you without touching the clock: the
   * block keeps its seconds, so the session still ends when it said it would.
   */
  const onSwap = useCallback(() => {
    const current = useSessionStore.getState();
    if (!current.session || !profile) return;
    const block = current.session.blocks[current.index];
    if (!block || block.kind !== 'exercise') return;

    const step = swapStep + 1;
    const {session: next, swappedTo} = swapBlock({
      session: current.session,
      blockId: block.id,
      profile,
      step
    });
    if (!swappedTo) {
      Alert.alert(
        'Nothing to swap to',
        'There is no other movement that fits your level, your equipment and the space you are in.'
      );
      return;
    }
    setSwapStep(step);
    tapComplete();
    useSessionStore.setState({session: next});
    setShowCues(false);
  }, [profile, swapStep]);

  const onSkip = useCallback(() => {
    useSessionStore.getState().skipBlock();
    setShowCues(false);
    setSwapStep(0);
  }, []);

  const onExit = useCallback(() => {
    Alert.alert(
      'Leave this session?',
      'You can save what you have done so far, or discard it entirely.',
      [
        {text: 'Keep going', style: 'cancel'},
        {
          text: 'Save and finish',
          onPress: () => useSessionStore.getState().finish()
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await useSessionStore.getState().abandon();
            router.replace('/(tabs)/today');
          }
        }
      ]
    );
  }, [router]);

  if (!session || !block) {
    return (
      <ScreenContainer scroll={false} contentStyle={styles.centered}>
        <Text style={styles.emptyTitle}>No session running</Text>
        <Button label="Back to today" onPress={() => router.replace('/(tabs)/today')} />
      </ScreenContainer>
    );
  }

  const isRest = block.kind === 'rest';
  const progress = sessionProgress(state);
  const leftInSession = sessionRemaining(state);
  const exerciseBlocks = session.blocks.filter(entry => entry.kind === 'exercise');
  const doneCount = state.completed.length;

  return (
    <ScreenContainer
      scroll={false}
      background={dark.bg}
      darkStatusBar
      contentStyle={styles.content}
    >
      {/* ——— Header: where we are in the whole session ——— */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave session"
          onPress={onExit}
          hitSlop={12}
          style={styles.headerButton}
        >
          <X size={22} color={dark.inkMuted} strokeWidth={1.8} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.phase}>{isRest ? 'Rest' : PHASE_LABEL[block.phase]}</Text>
          <Text style={styles.headerTime}>{formatSeconds(leftInSession)} left</Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      <ProgressBar
        progress={progress}
        color={isRest ? dark.inkFaint : progressColor(dark)}
        trackColor={dark.line}
        height={3}
        accessibilityLabel={`Session ${Math.round(progress * 100)} percent complete`}
      />

      {/* ——— The block itself ——— */}
      <Animated.View
        key={block.id}
        entering={reduced ? undefined : FadeIn.duration(260)}
        style={styles.main}
      >
        <Text style={styles.name} numberOfLines={3} accessibilityRole="header">
          {block.name}
        </Text>

        {block.round ? <Text style={styles.round}>{`Round ${block.round}`}</Text> : null}

        <Timer
          remaining={remaining}
          total={block.seconds}
          size={252}
          color={isRest ? dark.inkFaint : progressColor(dark)}
          trackColor={dark.line}
          caption={block.mode === 'reps' && block.reps ? block.reps : undefined}
          paused={!running}
          scheme={dark}
        />

        {isRest ? (
          <View style={styles.nextWrap}>
            <Text style={styles.nextLabel}>Next up</Text>
            <Text style={styles.nextName} numberOfLines={2}>
              {block.nextName ?? 'Finish'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.instructionScroll}
            contentContainerStyle={styles.instructionContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.instructions}>{block.instructions}</Text>

            {block.effortNote ? <Text style={styles.effort}>{block.effortNote}</Text> : null}
            {block.stepNote ? (
              <Text style={styles.step}>
                <Text style={styles.stepLabel}>
                  {block.stepDirection === 'progress' ? 'Ready for more  ' : 'Easier option  '}
                </Text>
                {block.stepNote}
              </Text>
            ) : null}
            {block.perSide ? <Text style={styles.effort}>Swap sides halfway through.</Text> : null}

            <View style={styles.inlineActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{expanded: showCues}}
                accessibilityLabel={showCues ? 'Hide form cues' : 'Show form cues'}
                onPress={() => setShowCues(value => !value)}
                style={styles.cueToggle}
              >
                <Text style={styles.cueToggleText}>{showCues ? 'Hide cues' : 'Show cues'}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap this movement"
                accessibilityHint="Replaces it with another that fits your level, equipment and space"
                onPress={onSwap}
                style={styles.cueToggle}
              >
                <View style={styles.swapRow}>
                  <Repeat size={13} color={dark.inkMuted} strokeWidth={2} />
                  <Text style={styles.cueToggleText}>Swap</Text>
                </View>
              </Pressable>
            </View>

            {showCues ? (
              <Animated.View entering={reduced ? undefined : FadeInUp.duration(220)} style={styles.cues}>
                {block.cues.map(cue => (
                  <View key={cue} style={styles.cueRow}>
                    <View style={styles.cueDot} />
                    <Text style={styles.cueText}>{cue}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </ScrollView>
        )}
      </Animated.View>

      {/* ——— Controls ——— */}
      <View style={styles.controls}>
        {isRest ? (
          <View style={styles.restControls}>
            <Button
              label="+15 sec"
              variant="secondary"
              scheme={dark}
              size="medium"
              fullWidth={false}
              style={styles.restButton}
              onPress={() => useSessionStore.getState().addSeconds(15)}
              icon={<Plus size={16} color={dark.ink} strokeWidth={2} />}
            />
            <Button
              label="Skip rest"
              scheme={dark}
              size="medium"
              fullWidth={false}
              style={styles.restButton}
              onPress={onComplete}
              icon={<SkipForward size={16} color={dark.accentInk} strokeWidth={2} />}
            />
          </View>
        ) : (
          <>
            <Button
              label="Complete"
              scheme={dark}
              onPress={onComplete}
              silent
              icon={<Check size={18} color={dark.accentInk} strokeWidth={2.2} />}
            />
            <View style={styles.secondaryRow}>
              <Button
                label={running ? 'Pause' : 'Resume'}
                variant="secondary"
                scheme={dark}
                size="medium"
                style={styles.secondaryButton}
                fullWidth={false}
                onPress={() =>
                  running ? useSessionStore.getState().pause() : useSessionStore.getState().resume()
                }
                icon={
                  running ? (
                    <Pause size={16} color={dark.ink} strokeWidth={2} />
                  ) : (
                    <Play size={16} color={dark.ink} strokeWidth={2} />
                  )
                }
              />
              <Button
                label="Skip"
                variant="secondary"
                scheme={dark}
                size="medium"
                style={styles.secondaryButton}
                fullWidth={false}
                onPress={onSkip}
                accessibilityHint="Moves on without counting this movement"
                icon={<SkipForward size={16} color={dark.ink} strokeWidth={2} />}
              />
            </View>
          </>
        )}

        <Text style={styles.counter}>
          {`${doneCount} of ${exerciseBlocks.length} exercises done`}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {paddingBottom: spacing.xl},
  centered: {flex: 1, justifyContent: 'center', gap: spacing.lg},
  emptyTitle: {...type.heading, color: dark.ink, textAlign: 'center'},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    minHeight: MIN_TAP
  },
  headerButton: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  headerCenter: {alignItems: 'center', gap: 2},
  phase: {...type.label, color: dark.inkFaint},
  headerTime: {...type.caption, ...tabular, color: dark.inkMuted},

  main: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg},
  name: {...type.title, color: dark.ink, textAlign: 'center'},
  round: {...type.label, color: dark.inkFaint},

  nextWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    borderWidth: HAIRLINE,
    borderColor: dark.line,
    alignSelf: 'stretch'
  },
  nextLabel: {...type.label, color: dark.inkFaint},
  nextName: {...type.subheading, color: dark.ink, textAlign: 'center'},

  instructionScroll: {alignSelf: 'stretch', marginTop: spacing.sm, flexGrow: 0, maxHeight: 220},
  instructionContent: {alignItems: 'center', paddingBottom: spacing.md},
  instructions: {...type.body, color: dark.inkMuted, textAlign: 'center', maxWidth: 330},
  step: {
    ...type.caption,
    color: dark.inkFaint,
    textAlign: 'center',
    maxWidth: 330,
    marginTop: spacing.md
  },
  stepLabel: {...type.label, color: progressColor(dark)},
  effort: {...type.caption, color: dark.inkFaint, textAlign: 'center', marginTop: spacing.sm},

  inlineActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm},
  cueToggle: {minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: spacing.md},
  swapRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  cueToggleText: {...type.label, color: dark.inkMuted},
  cues: {alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xs},
  cueRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  cueDot: {width: 3, height: 3, borderRadius: 2, backgroundColor: dark.inkFaint},
  cueText: {...type.small, color: dark.inkMuted, flex: 1},

  controls: {gap: spacing.md, paddingTop: spacing.lg},
  restControls: {flexDirection: 'row', gap: spacing.md},
  restButton: {flex: 1},
  secondaryRow: {flexDirection: 'row', gap: spacing.md},
  secondaryButton: {flex: 1},
  counter: {...type.caption, color: dark.inkFaint, textAlign: 'center'}
});
