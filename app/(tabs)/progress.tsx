import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Check} from 'lucide-react-native';
import {Button, Card, EmptyState, ScreenContainer, SectionHeader, Stat} from '../../src/components';
import {HAIRLINE, TAB_BAR_INSET, colors, radius, spacing, tabular, type} from '../../src/theme';
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
        <Text style={styles.eyebrow}>Your practice</Text>
        <Text style={styles.heading} accessibilityRole="header">
          Progress
        </Text>
        <Text style={styles.sub}>{progressMessage(summary, weeklyTarget)}</Text>
      </View>

      {/* ——— Headline numbers ——— */}
      <View style={styles.statRow}>
        <Stat value={`${summary.weekDays}`} label="Days this week" detail={`of ${weeklyTarget}`} large />
        <View style={styles.statDivider} />
        <Stat
          value={`${summary.streak}`}
          label="Day streak"
          detail={summary.bestStreak > 0 ? `best ${summary.bestStreak}` : undefined}
          large
          tint={summary.streak > 0 ? colors.clay : undefined}
        />
      </View>

      <View style={styles.statRow}>
        <Stat value={`${summary.minutesThisWeek}`} label="Minutes this week" />
        <View style={styles.statDivider} />
        <Stat value={`${summary.totalSessions}`} label="Sessions all time" />
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
  header: {paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xs},
  eyebrow: {...type.label, color: colors.inkFaint},
  heading: {...type.title, color: colors.ink},
  sub: {...type.small, color: colors.inkSoft, marginTop: 2},

  statRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl, marginBottom: spacing.xxl},
  statDivider: {width: HAIRLINE, alignSelf: 'stretch', backgroundColor: colors.border},

  weekCard: {gap: spacing.lg, borderRadius: radius.md},
  weekTitle: {...type.label, color: colors.inkFaint},
  strip: {flexDirection: 'row', justifyContent: 'space-between'},
  dayColumn: {alignItems: 'center', gap: spacing.sm, flex: 1},
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayDone: {backgroundColor: colors.primary, borderColor: colors.primary},
  dayToday: {borderColor: colors.sage, borderWidth: 1.5},
  dayFuture: {opacity: 0.4},
  dayLabel: {...type.caption, color: colors.inkFaint, fontSize: 11},
  dayLabelToday: {color: colors.primary},

  breakdown: {gap: 0, borderRadius: radius.md},
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: colors.border
  },
  breakdownLabel: {...type.body, color: colors.ink},
  breakdownValue: {...type.caption, ...tabular, color: colors.inkSoft},

  recent: {gap: 0, borderRadius: radius.md},
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: colors.border
  },
  recentText: {flex: 1, gap: 1},
  recentTitle: {...type.smallStrong, color: colors.ink},
  recentMeta: {...type.caption, color: colors.inkFaint},
  recentFeel: {...type.label, color: colors.primary},

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  }
});
