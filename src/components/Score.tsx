import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {ArrowDownRight, ArrowUpRight, ChevronRight} from 'lucide-react-native';
import {ProgressRing} from './ProgressRing';
import {HAIRLINE, MIN_TAP, colors, radius, spacing, tabular, type} from '../theme';
import {BAND_LABEL, CategoryScore, MoveScore, ScoreFactor, bandFor} from '../engine/score';

// The score, shown the way the category shows scores: one dial, category
// scores beneath it, and a plain account of what is lifting it and what is
// pulling it down.

const BAND_TINT = {
  strong: colors.primary,
  good: colors.sage,
  fair: colors.clay,
  low: colors.inkFaint
} as const;

interface DialProps {
  score: MoveScore;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ScoreDial({score, size = 176, onPress, style}: DialProps) {
  const tint = BAND_TINT[score.band];

  const dial = (
    <View style={styles.dialWrap}>
      <ProgressRing
        progress={score.value / 100}
        size={size}
        thickness={10}
        color={tint}
        trackColor={colors.surfaceMuted}
        accessibilityLabel={`Move score ${score.value} out of 100, ${BAND_LABEL[score.band]}`}
      >
        <Text style={[styles.dialValue, {color: tint}]}>{score.value}</Text>
        <Text style={styles.dialBand}>{BAND_LABEL[score.band]}</Text>
      </ProgressRing>
    </View>
  );

  if (!onPress) return <View style={style}>{dial}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move score ${score.value} out of 100. See what it is made of`}
      onPress={onPress}
      style={style}
    >
      {dial}
    </Pressable>
  );
}

interface TilesProps {
  categories: CategoryScore[];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** The three category scores, side by side under the dial. */
export function CategoryTiles({categories, onPress, style}: TilesProps) {
  return (
    <View style={[styles.tiles, style]}>
      {categories.map(category => {
        const tint = BAND_TINT[bandFor(category.value)];
        const body = (
          <>
            <Text style={styles.tileLabel} numberOfLines={1}>
              {category.label}
            </Text>
            <Text style={[styles.tileValue, {color: tint}]}>{category.value}</Text>
            <View style={styles.tileTrack}>
              <View
                style={[styles.tileFill, {width: `${Math.max(3, category.value)}%`, backgroundColor: tint}]}
              />
            </View>
            <Text style={styles.tileDetail} numberOfLines={2}>
              {category.detail}
            </Text>
          </>
        );

        if (!onPress) {
          return (
            <View
              key={category.id}
              style={styles.tile}
              accessible
              accessibilityLabel={`${category.label} ${category.value} out of 100. ${category.detail}`}
            >
              {body}
            </View>
          );
        }

        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={`${category.label} ${category.value} out of 100. ${category.detail}`}
            onPress={onPress}
            style={styles.tile}
          >
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}

/** What is lifting the score, and what is pulling it down. */
export function FactorList({factors, style}: {factors: ScoreFactor[]; style?: StyleProp<ViewStyle>}) {
  return (
    <View style={[styles.factors, style]}>
      {factors.map(factor => (
        <View
          key={factor.text}
          style={styles.factorRow}
          accessible
          accessibilityLabel={`${factor.lifting ? 'Lifting' : 'Pulling down'}: ${factor.text}`}
        >
          <View style={[styles.factorIcon, factor.lifting ? styles.factorUp : styles.factorDown]}>
            {factor.lifting ? (
              <ArrowUpRight size={13} color={colors.primary} strokeWidth={2.4} />
            ) : (
              <ArrowDownRight size={13} color={colors.clay} strokeWidth={2.4} />
            )}
          </View>
          <Text style={styles.factorText}>{factor.text}</Text>
        </View>
      ))}
    </View>
  );
}

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
  isToday?: boolean;
}

/**
 * A fortnight of scores as bars. No axis, no gridlines: the shape of the last
 * two weeks is the whole point, and a precise read is what the number is for.
 */
export function TrendBars({points, style}: {points: TrendPoint[]; style?: StyleProp<ViewStyle>}) {
  return (
    <View
      style={[styles.trend, style]}
      accessible
      accessibilityLabel={`Score over the last ${points.length} days, from ${points[0]?.value ?? 0} to ${points[points.length - 1]?.value ?? 0}`}
    >
      {points.map(point => (
        <View key={point.key} style={styles.trendCol}>
          <View style={styles.trendTrack}>
            <View
              style={[
                styles.trendFill,
                {
                  height: `${Math.max(2, point.value)}%`,
                  backgroundColor: point.isToday ? colors.primary : colors.sage
                }
              ]}
            />
          </View>
          <Text style={[styles.trendLabel, point.isToday && styles.trendLabelToday]}>
            {point.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** A tappable row that opens a metric's own screen. */
export function MetricRow({
  label,
  value,
  detail,
  onPress
}: {
  label: string;
  value: string;
  detail?: string;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View style={styles.metricText}>
        <Text style={styles.metricLabel}>{label}</Text>
        {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {onPress ? <ChevronRight size={17} color={colors.inkFaint} strokeWidth={2} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.metricRow} accessible accessibilityLabel={`${label}: ${value}`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. See more`}
      onPress={onPress}
      style={styles.metricRow}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dialWrap: {alignItems: 'center'},
  dialValue: {...type.statLarge, ...tabular},
  dialBand: {...type.label, color: colors.inkFaint, marginTop: 2},

  tiles: {flexDirection: 'row', gap: spacing.md},
  tile: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: MIN_TAP
  },
  // Sentence case, no tracking: "CONSISTENCY" in small caps with letter
  // spacing does not fit a third of a phone and broke across two lines,
  // knocking the three numbers out of alignment with each other.
  tileLabel: {...type.caption, color: colors.inkFaint, fontSize: 11},
  tileValue: {...type.stat, ...tabular, fontSize: 28, lineHeight: 32},
  tileTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: 2
  },
  tileFill: {height: 3, borderRadius: 2},
  tileDetail: {...type.caption, color: colors.inkFaint, fontSize: 11, marginTop: 2},

  factors: {gap: spacing.md},
  factorRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  factorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1
  },
  factorUp: {backgroundColor: colors.primarySoft},
  factorDown: {backgroundColor: colors.claySoft},
  factorText: {...type.small, color: colors.ink, flex: 1},

  trend: {flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 132},
  trendCol: {flex: 1, alignItems: 'center', gap: spacing.sm},
  trendTrack: {
    width: '100%',
    height: 104,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  trendFill: {width: '100%', borderRadius: radius.xs},
  trendLabel: {...type.caption, color: colors.inkFaint, fontSize: 9.5},
  trendLabelToday: {color: colors.primary},

  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: colors.border
  },
  metricText: {flex: 1, gap: 1},
  metricLabel: {...type.body, color: colors.ink},
  metricDetail: {...type.caption, color: colors.inkFaint},
  metricValue: {...type.smallStrong, ...tabular, color: colors.ink}
});
