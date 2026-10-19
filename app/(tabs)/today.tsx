import React, {useCallback, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ArrowRight, Flame, Footprints, Heart, Timer as TimerIcon, Wind} from 'lucide-react-native';
import {
  Button,
  Card,
  ProgressBar,
  ScreenContainer,
  SectionHeader
} from '../../src/components';
import {colors, radius, spacing, type} from '../../src/theme';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {useSessionStore} from '../../src/store/useSessionStore';
import {getProgress, progressMessage} from '../../src/lib/progress';
import {greeting} from '../../src/lib/date';
import {buildExploreSession} from '../../src/lib/sessions';
import {EXPLORE_ITEMS, QUICK_MOVE_IDS} from '../../src/data/explore';
import {INTENSITY_LABEL} from '../../src/engine/planner';
import {useReducedMotion} from '../../src/hooks/useMotion';

const QUICK_ICONS: Record<string, React.ReactNode> = {
  'quick-full-body': <TimerIcon size={20} color={colors.primary} strokeWidth={2} />,
  'mob-full-body': <Heart size={20} color={colors.primary} strokeWidth={2} />,
  'run-easy-20': <Footprints size={20} color={colors.primary} strokeWidth={2} />,
  'mind-2': <Wind size={20} color={colors.primary} strokeWidth={2} />
};

export default function Today() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const profile = useProfileStore(state => state.profile);
  const checkIn = useTodayStore(state => state.checkIn);
  const session = useTodayStore(state => state.session);
  const startDraft = useTodayStore(state => state.startDraft);
  const setSession = useTodayStore(state => state.setSession);
  const logs = useHistoryStore(state => state.logs);
  const activeSession = useSessionStore(state => state.session);
  const activeStartedAt = useSessionStore(state => state.startedAt);

  const summary = useMemo(() => getProgress(logs), [logs]);
  const weeklyTarget = profile?.weeklyTarget ?? 4;

  // A session that was started and not finished is offered back before
  // anything else, so a workout is never quietly lost.
  const hasUnfinished = Boolean(activeSession && activeStartedAt);

  const quickMoves = useMemo(
    () => QUICK_MOVE_IDS.map(id => EXPLORE_ITEMS.find(item => item.id === id)).filter(Boolean),
    []
  );

  const openCheckIn = useCallback(() => {
    startDraft(profile);
    router.push('/check-in');
  }, [profile, router, startDraft]);

  const startQuickMove = useCallback(
    async (itemId: string) => {
      const item = EXPLORE_ITEMS.find(entry => entry.id === itemId);
      if (!item || !profile) return;

      if (item.breathingMinutes) {
        router.push({pathname: '/activity/breathe', params: {minutes: String(item.breathingMinutes)}});
        return;
      }

      const built = buildExploreSession({item, profile, history: logs, checkIn});
      await setSession(built);
      router.push('/workout/preview');
    },
    [checkIn, logs, profile, router, setSession]
  );

  const rise = (index: number) =>
    reduced ? undefined : FadeInDown.duration(380).delay(60 * index);

  return (
    <ScreenContainer bottomInset={spacing.xxxl}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.heading} accessibilityRole="header">
          Today
        </Text>
      </View>

      {/* ——— Hero: resume, preview, or check in ——— */}
      <Animated.View entering={rise(0)}>
        {hasUnfinished ? (
          <Card tone="primary" style={styles.hero}>
            <Text style={styles.heroEyebrow}>SESSION IN PROGRESS</Text>
            <Text style={styles.heroTitleDark}>{activeSession?.title}</Text>
            <Text style={styles.heroBodyDark}>
              You started this and stepped away. Pick it up where you left off, or finish it and
              save what you did.
            </Text>
            <Button
              label="Resume session"
              variant="onDark"
              onPress={() => router.push('/workout/session')}
              style={styles.heroButton}
            />
          </Card>
        ) : session ? (
          <Card tone="primary" style={styles.hero}>
            <Text style={styles.heroEyebrow}>TODAY&rsquo;S SESSION</Text>
            <Text style={styles.heroTitleDark}>{session.title}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{session.minutes} MIN</Text>
              <View style={styles.dot} />
              <Text style={styles.heroMetaText}>{INTENSITY_LABEL[session.intensity].toUpperCase()}</Text>
            </View>
            <Text style={styles.heroBodyDark}>{session.focus}</Text>
            <Button
              label="View session"
              variant="onDark"
              onPress={() => router.push('/workout/preview')}
              style={styles.heroButton}
            />
          </Card>
        ) : (
          <Card tone="primary" style={styles.hero}>
            <Text style={styles.heroEyebrow}>DAILY CHECK-IN</Text>
            <Text style={styles.heroTitleDark}>How are you arriving today?</Text>
            <Text style={styles.heroBodyDark}>
              Energy, soreness and time help Steady Move choose a session that fits the day you are
              actually having.
            </Text>
            <Button
              label="Check in"
              variant="onDark"
              onPress={openCheckIn}
              style={styles.heroButton}
              icon={<ArrowRight size={18} color={colors.primary} strokeWidth={2.5} />}
            />
          </Card>
        )}
      </Animated.View>

      {/* ——— This week ——— */}
      <Animated.View entering={rise(1)}>
        <SectionHeader title="This week" subtitle={progressMessage(summary, weeklyTarget)} />
        <Card style={styles.week}>
          <View style={styles.weekTop}>
            <View style={styles.weekMetric}>
              <Text style={styles.weekValue}>
                {summary.weekDays}
                <Text style={styles.weekOf}>{` / ${weeklyTarget}`}</Text>
              </Text>
              <Text style={styles.weekLabel}>Movement days</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekMetric}>
              <Text style={styles.weekValue}>{summary.minutesThisWeek}</Text>
              <Text style={styles.weekLabel}>Minutes</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekMetric}>
              <View style={styles.streakRow}>
                <Text style={styles.weekValue}>{summary.streak}</Text>
                {summary.streak > 0 ? (
                  <Flame size={18} color={colors.clay} strokeWidth={2} />
                ) : null}
              </View>
              <Text style={styles.weekLabel}>Day streak</Text>
            </View>
          </View>

          <ProgressBar
            progress={weeklyTarget > 0 ? summary.weekDays / weeklyTarget : 0}
            color={colors.sage}
            accessibilityLabel={`${summary.weekDays} of ${weeklyTarget} movement days this week`}
          />
        </Card>
      </Animated.View>

      {/* ——— Quick move ——— */}
      <Animated.View entering={rise(2)}>
        <SectionHeader
          title="Quick move"
          subtitle="Start something now, without a check-in"
        />
        <View style={styles.quickGrid}>
          {quickMoves.map(item =>
            item ? (
              <Card
                key={item.id}
                style={styles.quickCard}
                onPress={() => startQuickMove(item.id)}
                accessibilityLabel={`${item.title}, ${item.breathingMinutes ?? item.minutes} minutes`}
                accessibilityHint={item.description}
              >
                <View style={styles.quickIcon}>{QUICK_ICONS[item.id]}</View>
                <Text style={styles.quickTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.quickMeta}>
                  {item.breathingMinutes ?? item.minutes} min
                </Text>
              </Card>
            ) : null
          )}
        </View>
      </Animated.View>

      <Text style={styles.footnote}>
        Steady Move is general movement guidance, not medical advice. Move within what feels right
        for you today.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: 2},
  greeting: {...type.small, color: colors.inkSoft},
  heading: {...type.display, color: colors.ink},

  hero: {gap: spacing.sm},
  heroEyebrow: {...type.eyebrow, color: colors.sage},
  heroTitleDark: {...type.heading, color: colors.onPrimary},
  heroBodyDark: {...type.small, color: colors.primarySoft, marginTop: 2},
  heroMeta: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2},
  heroMetaText: {...type.caption, color: colors.sage, letterSpacing: 1},
  dot: {width: 3, height: 3, borderRadius: 2, backgroundColor: colors.sage},
  heroButton: {marginTop: spacing.lg},

  week: {gap: spacing.lg},
  weekTop: {flexDirection: 'row', alignItems: 'center'},
  weekMetric: {flex: 1, gap: 2},
  weekDivider: {width: StyleSheet.hairlineWidth, height: 36, backgroundColor: colors.border},
  weekValue: {...type.title, color: colors.ink},
  weekOf: {...type.subheading, color: colors.inkFaint},
  weekLabel: {...type.caption, color: colors.inkSoft, fontWeight: '400'},
  streakRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},

  quickGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
  quickCard: {
    // Two per row, accounting for the gap between them.
    width: '47.5%',
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 124,
    justifyContent: 'flex-end'
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  quickTitle: {...type.bodyStrong, color: colors.ink},
  quickMeta: {...type.caption, color: colors.inkFaint, fontWeight: '400'},

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  }
});
