import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn} from 'react-native-reanimated';
import {AlertCircle, ChevronLeft, Info, RefreshCw} from 'lucide-react-native';
import {Button, Card, ExerciseCard, ScreenContainer} from '../../src/components';
import {HAIRLINE, MIN_TAP, colors, radius, spacing, tabular, type} from '../../src/theme';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {useSessionStore} from '../../src/store/useSessionStore';
import {INTENSITY_LABEL, PAIN_NOTICE, PHASE_LABEL, groupByPhase} from '../../src/engine/planner';
import {swapBlock} from '../../src/engine/swap';
import {tapSelection} from '../../src/lib/haptics';
import {formatDuration} from '../../src/engine/duration';
import {useReducedMotion} from '../../src/hooks/useMotion';
import {tapComplete} from '../../src/lib/haptics';

export default function Preview() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const profile = useProfileStore(state => state.profile);
  const session = useTodayStore(state => state.session);
  const rebuild = useTodayStore(state => state.rebuild);
  const logs = useHistoryStore(state => state.logs);
  const startSession = useSessionStore(state => state.start);

  const [rebuilding, setRebuilding] = useState(false);
  // Tapping swap again should keep moving through the alternatives rather than
  // flipping between the same two.
  const [swapSteps, setSwapSteps] = useState<Record<string, number>>({});
  const setSession = useTodayStore(state => state.setSession);
  const excludeExercise = useProfileStore(state => state.excludeExercise);
  const groups = useMemo(() => (session ? groupByPhase(session) : []), [session]);

  const onRebuild = useCallback(async () => {
    if (!profile) return;
    setRebuilding(true);
    await rebuild(profile, logs);
    setRebuilding(false);
  }, [logs, profile, rebuild]);

  /** Swap one movement, keeping the session exactly as long as it was. */
  const onSwap = useCallback(
    async (blockId: string) => {
      if (!session || !profile) return;
      const step = (swapSteps[blockId] ?? 0) + 1;
      const {session: next, swappedTo} = swapBlock({session, blockId, profile, step});
      if (!swappedTo) {
        Alert.alert(
          'Nothing to swap to',
          'There is no other movement that fits your level, your equipment and the space you are in. Rebuilding the session will find a different shape.'
        );
        return;
      }
      tapSelection();
      setSwapSteps(current => ({...current, [blockId]: step}));
      await setSession(next);
    },
    [profile, session, setSession, swapSteps]
  );

  /** Rule a movement out for good, then fill the gap it leaves. */
  const onExclude = useCallback(
    async (blockId: string, exerciseId: string, name: string) => {
      if (!session || !profile) return;
      await excludeExercise(exerciseId);
      const {session: next, swappedTo} = swapBlock({
        session,
        blockId,
        profile: {...profile, excluded: [...profile.excluded, exerciseId]},
        step: 0
      });
      if (swappedTo) await setSession(next);
      Alert.alert(
        `${name} removed`,
        'Steady Move will stop offering this movement. You can bring it back from Settings at any time.'
      );
    },
    [excludeExercise, profile, session, setSession]
  );

  const onBlockPress = useCallback(
    (blockId: string, exerciseId: string | undefined, name: string) => {
      if (!exerciseId) return;
      Alert.alert(name, 'Not working for you today?', [
        {text: 'Keep it', style: 'cancel'},
        {text: 'Swap it', onPress: () => void onSwap(blockId)},
        {
          text: 'Never show this',
          style: 'destructive',
          onPress: () => void onExclude(blockId, exerciseId, name)
        }
      ]);
    },
    [onExclude, onSwap]
  );

  const onStart = useCallback(async () => {
    if (!session) return;
    tapComplete();
    await startSession(session);
    router.push('/workout/session');
  }, [router, session, startSession]);

  // Reachable if storage was cleared from another screen while this was open.
  if (!session) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No session yet</Text>
          <Text style={styles.emptyBody}>Check in and Steady Move will build one for you.</Text>
          <Button label="Back to today" onPress={() => router.replace('/(tabs)/today')} />
        </View>
      </ScreenContainer>
    );
  }

  const exerciseCount = session.blocks.filter(block => block.kind === 'exercise').length;

  const body = (
    <ScreenContainer bottomInset={spacing.huge + spacing.xxl}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerButton}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Today&rsquo;s session</Text>
        <View style={styles.headerButton} />
      </View>

      <Animated.View entering={reduced ? undefined : FadeIn.duration(320)}>
        <Text style={styles.title} accessibilityRole="header">
          {session.title}
        </Text>

        <View style={styles.meta}>
          <Text style={styles.metaItem}>{session.minutes} min</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaItem}>{INTENSITY_LABEL[session.intensity]}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaItem}>{exerciseCount} blocks</Text>
        </View>

        <Text style={styles.focus}>{session.focus}</Text>

        {/* Why this session, in the person's own reported terms. */}
        <Card tone={session.painFlagged ? 'caution' : 'sunken'} style={styles.why}>
          <View style={styles.whyHead}>
            {session.painFlagged ? (
              <AlertCircle size={18} color={colors.caution} strokeWidth={2} />
            ) : (
              <Info size={18} color={colors.primary} strokeWidth={2} />
            )}
            <Text style={[styles.whyTitle, session.painFlagged && {color: colors.caution}]}>
              Why this session
            </Text>
          </View>
          <Text style={styles.whyBody}>{session.rationale}</Text>
          {session.painFlagged ? <Text style={styles.whyNotice}>{PAIN_NOTICE}</Text> : null}
        </Card>
      </Animated.View>

      {groups.map(group => (
        <View key={group.phase} style={styles.group}>
          <View style={styles.groupRule} />
          <View style={styles.groupHead}>
            <Text style={styles.groupTitle}>{PHASE_LABEL[group.phase]}</Text>
            <Text style={styles.groupTime}>{formatDuration(group.seconds)}</Text>
          </View>
          <Card style={styles.groupCard}>
            {group.blocks.map(block =>
              block.exerciseId ? (
                <Pressable
                  key={block.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${block.name}. Swap or remove this movement`}
                  onPress={() => onBlockPress(block.id, block.exerciseId, block.name)}
                >
                  <ExerciseCard block={block} />
                </Pressable>
              ) : (
                <ExerciseCard key={block.id} block={block} />
              )
            )}
          </Card>
        </View>
      ))}

      <Text style={styles.swapHint}>
        Tap any movement to swap it, or to stop being offered it altogether.
      </Text>
    </ScreenContainer>
  );

  return (
    <View style={styles.screen}>
      {body}

      {/* The one thing you came here to do stays under your thumb, however far
          down the list you have scrolled. */}
      <View style={styles.dock}>
        <View style={styles.dockRow}>
          <Button label="Start session" onPress={onStart} silent style={styles.dockStart} />
          <Button
            label="Rebuild"
            variant="secondary"
            onPress={onRebuild}
            loading={rebuilding}
            fullWidth={false}
            style={styles.dockRebuild}
            icon={<RefreshCw size={16} color={colors.ink} strokeWidth={2} />}
            accessibilityHint="Builds a different session using the same answers"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.canvas},

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.canvas,
    borderTopWidth: HAIRLINE,
    borderTopColor: colors.border
  },
  dockRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  dockStart: {flex: 1},
  dockRebuild: {paddingHorizontal: spacing.lg},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    minHeight: MIN_TAP
  },
  headerButton: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {...type.label, color: colors.inkFaint},

  title: {...type.display, color: colors.ink, marginTop: spacing.xl},

  meta: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg},
  metaItem: {...type.caption, ...tabular, color: colors.inkSoft},
  metaDot: {width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: colors.borderStrong},

  focus: {...type.serifBody, color: colors.inkSoft, marginTop: spacing.lg},

  why: {marginTop: spacing.xxl, gap: spacing.sm, borderRadius: radius.md},
  whyHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  whyTitle: {...type.label, color: colors.primary},
  whyBody: {...type.small, color: colors.ink},
  whyNotice: {...type.caption, color: colors.caution, marginTop: spacing.xs},

  group: {marginTop: spacing.xxl},
  groupRule: {height: HAIRLINE, backgroundColor: colors.border, marginBottom: spacing.md},
  groupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  groupTitle: {...type.label, color: colors.ink},
  groupTime: {...type.caption, ...tabular, color: colors.inkFaint},
  groupCard: {padding: spacing.sm, borderRadius: radius.md},

  swapHint: {
    ...type.caption,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.xxl
  },
  actions: {marginTop: spacing.xl, gap: spacing.md},

  empty: {flex: 1, justifyContent: 'center', gap: spacing.md},
  emptyTitle: {...type.heading, color: colors.ink, textAlign: 'center'},
  emptyBody: {...type.body, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.lg}
});
