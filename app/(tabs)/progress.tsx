import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Check, Flame} from 'lucide-react-native';
import {
  Button,
  Card,
  EmptyState,
  MetricCard,
  ScreenContainer,
  SectionHeader
} from '../../src/components';
import {TAB_BAR_INSET, colors, radius, spacing, type} from '../../src/theme';
import {SessionType} from '../../src/types';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {useProfileStore} from '../../src/store/useProfileStore';
import {getProgress, progressMessage} from '../../src/lib/progress';
import {relativeDay} from '../../src/lib/date';
import {formatDuration} from '../../src/engine/duration';

const TYPE_LABELS: Record<SessionType, string> = {
  strength: 'Strength',
  calisthenics: 'Calisthenics',
  runwalk: 'Run / walk',
  mobility: 'Mobility',
  recovery: 'Recovery',
  balanced: 'Balanced',
  mindful: 'Mindfulness'
};

export default function Progress() {
  const router = useRouter();
  const logs = useHistoryStore(state => state.logs);
  const profile = useProfileStore(state => state.profile);

  const summary = useMemo(() => getProgress(logs), [logs]);
  const weeklyTarget = profile?.weeklyTarget ?? 4;

  return (
    <ScreenContainer bottomInset={TAB_BAR_INSET}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          Progress
        </Text>
        <Text style={styles.sub}>{progressMessage(summary, weeklyTarget)}</Text>
      </View>

      {/* ——— Week strip ——— */}
      <Card style={styles.weekCard}>
        <Text style={styles.weekTitle}>This week</Text>
        <View style={styles.strip}>
          {summary.chart.map(day => (
            <View
              key={day.key}
              style={styles.dayColumn}
              accessible
              accessibilityLabel={`${day.label}${day.isToday ? ', today' : ''}: ${
                day.done ? 'moved' : day.isFuture ? 'still to come' : 'no session'
              }`}
            >
              <View
                style={[
                  styles.dayDot,
                  day.done && styles.dayDone,
                  day.isToday && styles.dayToday,
                  day.isFuture && styles.dayFuture
                ]}
              >
                {/* A tick as well as the fill, so the state never relies on colour alone. */}
                {day.done ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
              </View>
              {/* The strip itself is decorative: each column carries the full
                  spoken label above, so the initial needs no extra treatment. */}
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ——— Headline numbers ——— */}
      <View style={styles.metrics}>
        <MetricCard
          value={`${summary.weekDays}/${weeklyTarget}`}
          label="Movement days"
          detail="this week"
        />
        <MetricCard
          value={`${summary.streak}`}
          label="Day streak"
          detail={summary.bestStreak > 0 ? `best ${summary.bestStreak}` : undefined}
          tone={summary.streak > 0 ? 'clay' : 'surface'}
          icon={summary.streak > 0 ? <Flame size={18} color={colors.clay} strokeWidth={2} /> : undefined}
        />
      </View>
      <View style={styles.metrics}>
        <MetricCard value={`${summary.minutesThisWeek}`} label="Minutes" detail="this week" />
        <MetricCard value={`${summary.totalSessions}`} label="Total sessions" detail="all time" />
      </View>

      {/* ——— What you did this week ——— */}
      <SectionHeader title="This week by type" />
      {summary.byType.length === 0 ? (
        <EmptyState
          title="Nothing logged this week yet"
          body="Whatever you do next — ten minutes of mobility counts — will show up here."
          action={<Button label="Go to today" onPress={() => router.push('/(tabs)/today')} />}
        />
      ) : (
        <Card style={styles.breakdown}>
          {summary.byType.map(entry => (
            <View key={entry.type} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{TYPE_LABELS[entry.type]}</Text>
              <Text style={styles.breakdownValue}>
                {entry.sessions} {entry.sessions === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* ——— Recent sessions ——— */}
      <SectionHeader title="Recent sessions" />
      {summary.recent.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="Your history lives on this device only. Nothing is uploaded anywhere."
        />
      ) : (
        <Card style={styles.recent}>
          {summary.recent.map(log => (
            <View key={log.id} style={styles.recentRow}>
              <View style={styles.recentText}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {log.title}
                </Text>
                <Text style={styles.recentMeta}>
                  {[
                    relativeDay(log.completedAt),
                    formatDuration(log.activeSeconds),
                    log.qualifies ? null : 'partial'
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              </View>
              {log.feel ? <Text style={styles.recentFeel}>{log.feel}</Text> : null}
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.footnote}>
        Steady Move counts days you moved, not calories or weight. A missed day is just a day.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xs},
  heading: {...type.display, color: colors.ink},
  sub: {...type.body, color: colors.inkSoft},

  weekCard: {gap: spacing.lg},
  weekTitle: {...type.eyebrow, color: colors.inkFaint},
  strip: {flexDirection: 'row', justifyContent: 'space-between'},
  dayColumn: {alignItems: 'center', gap: spacing.sm, flex: 1},
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayDone: {backgroundColor: colors.primary, borderColor: colors.primary},
  dayToday: {borderColor: colors.sage, borderWidth: 2.5},
  dayFuture: {opacity: 0.45},
  dayLabel: {...type.caption, color: colors.inkFaint},
  dayLabelToday: {color: colors.primary, fontWeight: '700'},

  metrics: {flexDirection: 'row', gap: spacing.md, marginTop: spacing.md},

  breakdown: {gap: spacing.sm},
  breakdownRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32},
  breakdownLabel: {...type.body, color: colors.ink},
  breakdownValue: {...type.caption, color: colors.inkSoft},

  recent: {gap: spacing.xs},
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48
  },
  recentText: {flex: 1, gap: 1},
  recentTitle: {...type.bodyStrong, color: colors.ink},
  recentMeta: {...type.caption, color: colors.inkFaint, fontWeight: '400'},
  recentFeel: {
    ...type.caption,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden'
  },

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  }
});
