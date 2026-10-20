import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ArrowUpRight, Camera, Footprints, Heart, Timer as TimerIcon, Wind} from 'lucide-react-native';
import {
  Button,
  Card,
  ReadinessCard,
  ScreenContainer,
  SectionHeader,
  Stat
} from '../../src/components';
import {
  HAIRLINE,
  MIN_TAP,
  TAB_BAR_INSET,
  colors,
  dark,
  radius,
  spacing,
  tabular,
  type
} from '../../src/theme';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {useSessionStore} from '../../src/store/useSessionStore';
import {getProgress, progressMessage} from '../../src/lib/progress';
import {greeting} from '../../src/lib/date';
import {buildExploreSession} from '../../src/lib/sessions';
import {EXPLORE_ITEMS, QUICK_MOVE_IDS} from '../../src/data/explore';
import {INTENSITY_LABEL} from '../../src/engine/planner';
import {readAdaptation} from '../../src/engine/adaptation';
import {readReadiness} from '../../src/engine/load';
import {useReducedMotion} from '../../src/hooks/useMotion';

const QUICK_ICONS: Record<string, React.ReactNode> = {
  'quick-full-body': <TimerIcon size={17} color={colors.primary} strokeWidth={1.8} />,
  'mob-full-body': <Heart size={17} color={colors.primary} strokeWidth={1.8} />,
  'run-easy-20': <Footprints size={17} color={colors.primary} strokeWidth={1.8} />,
  'mind-2': <Wind size={17} color={colors.primary} strokeWidth={1.8} />
};

export default function Today() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const profile = useProfileStore(state => state.profile);
  const checkIn = useTodayStore(state => state.checkIn);
  const session = useTodayStore(state => state.session);
  const startDraft = useTodayStore(state => state.startDraft);
  const setSession = useTodayStore(state => state.setSession);
  const defaults = useTodayStore(state => state.defaults);
  const logs = useHistoryStore(state => state.logs);
  const activeSession = useSessionStore(state => state.session);
  const activeStartedAt = useSessionStore(state => state.startedAt);

  const summary = useMemo(() => getProgress(logs), [logs]);
  const adaptation = useMemo(
    () => readAdaptation({history: logs, profile}),
    [logs, profile]
  );
  // Readiness from what the person has done and said — no watch, no score, and
  // it works on the second day rather than the fifteenth.
  const readiness = useMemo(() => readReadiness({history: logs, checkIn}), [logs, checkIn]);
  const weeklyTarget = profile?.weeklyTarget ?? 4;
  const hasUnfinished = Boolean(activeSession && activeStartedAt);

  const quickMoves = useMemo(
    () => QUICK_MOVE_IDS.map(id => EXPLORE_ITEMS.find(item => item.id === id)).filter(Boolean),
    []
  );

  // Someone who has checked in before goes straight to the one-screen version:
  // what changed today, with everything else carried over.
  const openCheckIn = useCallback(() => {
    startDraft(profile);
    router.push(defaults ? '/check-in?mode=quick' : '/check-in');
  }, [defaults, profile, router, startDraft]);

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

  const rise = (index: number) => (reduced ? undefined : FadeInDown.duration(420).delay(70 * index));

  const today = useMemo(
    () => new Date().toLocaleDateString(undefined, {weekday: 'long', day: 'numeric', month: 'long'}),
    []
  );

  // The hero says one thing and offers one action. Which one depends only on
  // where the person is in the day's loop.
  const hero = hasUnfinished
    ? {
        label: 'In progress',
        title: activeSession?.title ?? 'Your session',
        body: 'You started this and stepped away. Pick it up where you left off.',
        cta: 'Resume session',
        onPress: () => router.push('/workout/session')
      }
    : session
      ? {
          label: 'Today’s session',
          title: session.title,
          body: session.focus,
          meta: `${session.minutes} min · ${INTENSITY_LABEL[session.intensity]}`,
          cta: 'View session',
          onPress: () => router.push('/workout/preview')
        }
      : {
          label: 'Daily check-in',
          title: 'How are you arriving today?',
          body: 'Energy, soreness and time decide what today should be.',
          cta: 'Check in',
          onPress: openCheckIn
        };

  return (
    <ScreenContainer bottomInset={TAB_BAR_INSET}>
      <View style={styles.head}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      {/* ——— Hero ——— */}
      <Animated.View entering={rise(0)}>
        <Card tone="accent" style={styles.hero}>
          <Text style={styles.heroLabel}>{hero.label}</Text>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          {hero.meta ? <Text style={styles.heroMeta}>{hero.meta}</Text> : null}
          <Text style={styles.heroBody}>{hero.body}</Text>
          <Button
            label={hero.cta}
            variant="primary"
            scheme={dark}
            onPress={hero.onPress}
            style={styles.heroButton}
            icon={<ArrowUpRight size={17} color={colors.primary} strokeWidth={2.2} />}
          />
        </Card>
      </Animated.View>

      {/* ——— How today reads ——— */}
      <Animated.View entering={rise(1)}>
        <ReadinessCard
          readiness={readiness}
          style={styles.readiness}
          onGentle={() => router.push({pathname: '/activity/breathe', params: {minutes: '5'}})}
        />
      </Animated.View>

      {/* ——— Back after a gap ——— */}
      {adaptation.layoff !== 'none' && !session && !hasUnfinished ? (
        <Animated.View entering={rise(1)}>
          <Card tone="sunken" style={styles.returnCard}>
            <Text style={styles.returnLabel}>
              {adaptation.layoff === 'returning' ? 'Welcome back' : 'Good to see you'}
            </Text>
            <Text style={styles.returnBody}>
              {adaptation.daysSinceLastSession} days since your last session. Nothing is lost —
              today comes back lighter, and builds from there.
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      {/* ——— Where you are ——— */}
      <Animated.View entering={rise(1)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose where you are"
          accessibilityHint="Builds a session for a hotel room, an airport, a desk or anywhere else"
          onPress={() => router.push('/space')}
          style={styles.placeRow}
        >
          <View style={styles.placeText}>
            <Text style={styles.placeTitle}>Somewhere different today?</Text>
            <Text style={styles.placeBody}>A hotel room, a desk, an airport — or scan the space.</Text>
          </View>
          <Camera size={17} color={colors.inkFaint} strokeWidth={1.8} />
        </Pressable>
      </Animated.View>

      {/* ——— This week ——— */}
      <Animated.View entering={rise(2)}>
        <SectionHeader
          eyebrow="This week"
          title={`${summary.weekDays} of ${weeklyTarget} days`}
          subtitle={progressMessage(summary, weeklyTarget)}
        />

        <View style={styles.stats}>
          <Stat value={`${summary.minutesThisWeek}`} label="Minutes" />
          <View style={styles.statDivider} />
          <Stat
            value={`${summary.streak}`}
            label="Day streak"
            tint={summary.streak > 0 ? colors.clay : undefined}
          />
          <View style={styles.statDivider} />
          <Stat value={`${summary.totalSessions}`} label="Sessions" />
        </View>

        <View style={styles.week}>
          {summary.chart.map(day => (
            <View key={day.key} style={styles.dayCol}>
              <View
                style={[
                  styles.dayBar,
                  day.done && styles.dayBarDone,
                  day.isToday && !day.done && styles.dayBarToday,
                  day.isFuture && styles.dayBarFuture
                ]}
              />
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ——— Quick move ——— */}
      <Animated.View entering={rise(3)}>
        <SectionHeader eyebrow="Quick move" title="Start something now" />
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
                <Text style={styles.quickMeta}>{item.breathingMinutes ?? item.minutes} min</Text>
              </Card>
            ) : null
          )}
        </View>
      </Animated.View>

      <Text style={styles.footnote}>
        General movement guidance, not medical advice. Move within what feels right today.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: {paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xs},
  greeting: {...type.label, color: colors.inkFaint},
  date: {...type.title, color: colors.ink},

  hero: {padding: spacing.xxl, borderRadius: radius.xl},
  heroLabel: {...type.label, color: colors.sage},
  heroTitle: {...type.title, color: colors.onPrimary, marginTop: spacing.md},
  heroMeta: {...type.caption, color: colors.sage, marginTop: spacing.sm, ...tabular},
  heroBody: {...type.small, color: 'rgba(242,239,231,0.72)', marginTop: spacing.sm},
  heroButton: {marginTop: spacing.xl},

  readiness: {marginTop: spacing.lg},

  returnCard: {marginTop: spacing.lg, gap: spacing.xs, borderRadius: radius.md},
  returnLabel: {...type.label, color: colors.primary},
  returnBody: {...type.small, color: colors.inkSoft},

  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: MIN_TAP
  },
  placeText: {flex: 1},
  placeTitle: {...type.bodyStrong, color: colors.ink},
  placeBody: {...type.caption, color: colors.inkFaint, marginTop: 1},

  stats: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg},
  statDivider: {width: HAIRLINE, alignSelf: 'stretch', backgroundColor: colors.border},

  week: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl},
  dayCol: {flex: 1, gap: spacing.sm, alignItems: 'center'},
  dayBar: {height: 4, borderRadius: 2, alignSelf: 'stretch', backgroundColor: colors.surfaceMuted},
  dayBarDone: {backgroundColor: colors.primary, height: 6},
  dayBarToday: {backgroundColor: colors.sage},
  dayBarFuture: {opacity: 0.45},
  dayLabel: {...type.caption, color: colors.inkFaint, fontSize: 11},
  dayLabelToday: {color: colors.primary},

  quickGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
  quickCard: {
    width: '47.6%',
    flexGrow: 1,
    padding: spacing.lg,
    minHeight: 128,
    justifyContent: 'flex-end',
    borderRadius: radius.md
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  quickTitle: {...type.smallStrong, color: colors.ink},
  quickMeta: {...type.caption, color: colors.inkFaint, marginTop: 1},

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  }
});
