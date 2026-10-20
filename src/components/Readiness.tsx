import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Card} from './Card';
import {Button} from './Button';
import {HAIRLINE, MIN_TAP, colors, radius, spacing, type} from '../theme';
import {BODY_AREAS, BODY_AREA_LABELS, BodyArea, Readiness, ReadinessState} from '../types';
import {AreaBand, areaBand} from '../engine/load';

// Readiness, said in words. Deliberately not a score: the inputs are a
// check-in and a history of what was completed, and a number out of a hundred
// would dress that up as something it is not.

const STATE_LABEL: Record<ReadinessState, string> = {
  ready: 'Ready',
  steady: 'Steady',
  ease: 'Ease off',
  rest: 'Rest day'
};

const STATE_TINT: Record<ReadinessState, string> = {
  ready: colors.sage,
  steady: colors.primary,
  ease: colors.clay,
  rest: colors.clay
};

interface ReadinessCardProps {
  readiness: Readiness;
  /** Offered instead of a session when the day reads as a rest day. */
  onGentle?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ReadinessCard({readiness, onGentle, style}: ReadinessCardProps) {
  const tint = STATE_TINT[readiness.state];
  const spoken = `Today reads as ${STATE_LABEL[readiness.state]}. ${readiness.reason}`;

  // On an ordinary day this is a line, not a card. Only a day that wants
  // something different from you earns the room.
  if (readiness.state === 'ready' || readiness.state === 'steady') {
    return (
      <View style={[styles.quiet, style]} accessible accessibilityLabel={spoken}>
        <View style={[styles.dot, styles.quietDot, {backgroundColor: tint}]} />
        <Text style={[styles.quietState, {color: tint}]}>{STATE_LABEL[readiness.state]}</Text>
        <Text style={styles.quietReason} numberOfLines={2}>
          {readiness.reason}
        </Text>
      </View>
    );
  }

  return (
    <Card
      tone={readiness.restAdvised ? 'highlight' : 'surface'}
      style={[styles.card, style]}
      accessibilityLabel={spoken}
    >
      <View style={styles.head}>
        <View style={[styles.dot, {backgroundColor: tint}]} />
        <Text style={styles.eyebrow}>Today reads</Text>
      </View>

      <Text style={[styles.state, {color: tint}]}>{STATE_LABEL[readiness.state]}</Text>
      <Text style={styles.reason}>{readiness.reason}</Text>

      {readiness.restAdvised && onGentle ? (
        <>
          <Button
            label="Five quiet minutes instead"
            variant="secondary"
            onPress={onGentle}
            style={styles.action}
          />
          <Text style={styles.note}>
            A rest day undoes nothing. If you take the five quiet minutes, it still
            counts as a day you moved.
          </Text>
        </>
      ) : null}
    </Card>
  );
}

const BAND_WORD: Record<AreaBand, string> = {
  none: 'Not yet',
  light: 'Some',
  worked: 'Well worked'
};

interface AreaBalanceProps {
  load: Record<BodyArea, number>;
  style?: StyleProp<ViewStyle>;
}

/**
 * What the last few days asked of each area, newest work weighing heaviest.
 * Relative, not absolute — the point is which areas have had the most and
 * which have had the least, not a figure to chase.
 */
export function AreaBalance({load, style}: AreaBalanceProps) {
  const peak = Math.max(...BODY_AREAS.map(area => load[area]), 0.001);

  return (
    <Card style={[styles.balance, style]}>
      {BODY_AREAS.map(area => {
        const band = areaBand(load[area]);
        const fill = Math.max(0, Math.min(1, load[area] / peak));

        return (
          <View
            key={area}
            style={styles.row}
            accessible
            accessibilityLabel={`${BODY_AREA_LABELS[area]}: ${BAND_WORD[band].toLowerCase()}`}
          >
            <Text style={styles.rowLabel}>{BODY_AREA_LABELS[area]}</Text>
            <View style={styles.track}>
              {band === 'none' ? null : (
                <View
                  style={[
                    styles.fill,
                    {width: `${Math.max(8, fill * 100)}%`},
                    band === 'worked' && styles.fillWorked
                  ]}
                />
              )}
            </View>
            <Text style={styles.rowWord}>{BAND_WORD[band]}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {gap: spacing.xs, borderRadius: radius.md},
  head: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  dot: {width: 7, height: 7, borderRadius: 4},
  eyebrow: {...type.label, color: colors.inkFaint},
  state: {...type.heading, marginTop: spacing.xs},
  reason: {...type.small, color: colors.inkSoft},
  action: {marginTop: spacing.lg},
  note: {...type.caption, color: colors.inkFaint, marginTop: spacing.sm},

  quiet: {
    flexDirection: 'row',
    // Top aligned, so the label sits against the first line of the reason
    // rather than floating in the middle of a two-line sentence.
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: MIN_TAP
  },
  quietDot: {marginTop: 6},
  quietState: {...type.label, marginTop: 1},
  quietReason: {...type.caption, color: colors.inkFaint, flex: 1},

  balance: {gap: 0, borderRadius: radius.md},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 40,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: colors.border
  },
  rowLabel: {...type.small, color: colors.ink, width: 86},
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden'
  },
  fill: {height: 5, borderRadius: 3, backgroundColor: colors.sage},
  fillWorked: {backgroundColor: colors.primary},
  rowWord: {...type.caption, color: colors.inkFaint, width: 76, textAlign: 'right'}
});
