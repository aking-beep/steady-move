import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ChevronLeft} from 'lucide-react-native';
import {
  Card,
  CategoryTiles,
  FactorList,
  ScoreDial,
  ScreenContainer,
  SectionHeader,
  TrendBars
} from '../src/components';
import {HAIRLINE, MIN_TAP, colors, radius, spacing, tabular, type} from '../src/theme';
import {useProfileStore} from '../src/store/useProfileStore';
import {useHistoryStore} from '../src/store/useHistoryStore';
import {useTodayStore} from '../src/store/useTodayStore';
import {WEIGHTS, daysMovedThisWeek, moveScore, scoreTrend} from '../src/engine/score';
import {getProgress} from '../src/lib/progress';
import {useReducedMotion} from '../src/hooks/useMotion';

// The score's own screen: the number, the fortnight behind it, what it is made
// of, and what is moving it. Everything here is computed from logs this app
// wrote itself — there is no ring, no watch and nothing uploaded.

const WEIGHT_LABEL: Record<string, string> = {
  consistency: `${Math.round(WEIGHTS.consistency * 100)}%`,
  freshness: `${Math.round(WEIGHTS.freshness * 100)}%`,
  followThrough: `${Math.round(WEIGHTS.followThrough * 100)}%`
};

export default function ScoreScreen() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const profile = useProfileStore(state => state.profile);
  const logs = useHistoryStore(state => state.logs);
  const checkIn = useTodayStore(state => state.checkIn);

  const score = useMemo(
    () => (profile ? moveScore({history: logs, profile, checkIn}) : null),
    [checkIn, logs, profile]
  );
  const trend = useMemo(
    () => (profile ? scoreTrend({history: logs, profile, checkIn, days: 14}) : []),
    [checkIn, logs, profile]
  );
  const summary = useMemo(() => getProgress(logs), [logs]);
  // The score counts a rolling seven days; the week strip on Progress counts
  // the calendar week. Both are useful, but showing them side by side under
  // one word would have them quietly contradict each other.
  const movedLastSeven = useMemo(() => daysMovedThisWeek(logs, new Date()), [logs]);

  const rise = (index: number) => (reduced ? undefined : FadeInDown.duration(420).delay(70 * index));

  if (!profile || !score) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>No score yet</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
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
        <Text style={styles.headerTitle}>Move score</Text>
        <View style={styles.headerButton} />
      </View>

      <Animated.View entering={rise(0)} style={styles.hero}>
        <ScoreDial score={score} size={204} />
        <Text style={styles.summary}>{score.summary}</Text>
      </Animated.View>

      <Animated.View entering={rise(1)}>
        <View style={styles.streakRow}>
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>{summary.streak}</Text>
            <Text style={styles.streakLabel}>Day streak</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>{movedLastSeven}</Text>
            <Text style={styles.streakLabel}>Last 7 days</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>{summary.minutesThisWeek}</Text>
            <Text style={styles.streakLabel}>Minutes</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={rise(2)}>
        <SectionHeader eyebrow="Last 14 days" title="How it has moved" />
        <Card style={styles.trendCard}>
          <TrendBars points={trend} />
        </Card>
      </Animated.View>

      <Animated.View entering={rise(3)}>
        <SectionHeader eyebrow="What it is made of" title="Three parts" />
        <CategoryTiles categories={score.categories} />
        <View style={styles.weights}>
          {score.categories.map(category => (
            <Text key={category.id} style={styles.weightItem}>
              {`${category.label} ${WEIGHT_LABEL[category.id]}`}
            </Text>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={rise(4)}>
        <SectionHeader eyebrow="Today" title="What is moving it" />
        <Card style={styles.factorCard}>
          <FactorList factors={score.factors} />
        </Card>
      </Animated.View>

      <Text style={styles.footnote}>
        A training score, not a health score. Steady Move has no ring and no watch: this
        is built only from the sessions you finished, the target you set, and how you
        said you were arriving. Nothing here leaves the device.
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

  title: {...type.title, color: colors.ink, marginTop: spacing.xxl},

  hero: {alignItems: 'center', paddingTop: spacing.xl, gap: spacing.lg},
  summary: {...type.small, color: colors.inkSoft, textAlign: 'center', maxWidth: 320},

  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: HAIRLINE,
    borderBottomWidth: HAIRLINE,
    borderColor: colors.border
  },
  streakItem: {flex: 1, alignItems: 'center', gap: 2},
  streakValue: {...type.stat, ...tabular, color: colors.ink, fontSize: 26, lineHeight: 30},
  streakLabel: {...type.caption, color: colors.inkFaint, fontSize: 11},
  streakDivider: {width: HAIRLINE, alignSelf: 'stretch', backgroundColor: colors.border},

  trendCard: {borderRadius: radius.md},
  factorCard: {borderRadius: radius.md},

  weights: {flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.md},
  weightItem: {...type.caption, color: colors.inkFaint, fontSize: 11},

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl
  }
});
