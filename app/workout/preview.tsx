import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
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
  const groups = useMemo(() => (session ? groupByPhase(session) : []), [session]);

  const onRebuild = useCallback(async () => {
    if (!profile) return;
    setRebuilding(true);
    await rebuild(profile, logs);
    setRebuilding(false);
  }, [logs, profile, rebuild]);

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

  return (
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
            {group.blocks.map(block => (
              <ExerciseCard key={block.id} block={block} />
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.actions}>
        <Button label="Start session" onPress={onStart} silent />
        <Button
          label="Rebuild"
          variant="secondary"
          onPress={onRebuild}
          loading={rebuilding}
          icon={<RefreshCw size={16} color={colors.ink} strokeWidth={2} />}
          accessibilityHint="Builds a different session using the same answers"
        />
      </View>
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

  actions: {marginTop: spacing.xxxl, gap: spacing.md},

  empty: {flex: 1, justifyContent: 'center', gap: spacing.md},
  emptyTitle: {...type.heading, color: colors.ink, textAlign: 'center'},
  emptyBody: {...type.body, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.lg}
});
