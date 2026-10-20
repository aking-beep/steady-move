import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Repeat, Timer as TimerIcon} from 'lucide-react-native';
import {SessionBlock} from '../types';
import {colors, radius, spacing, tabular, type} from '../theme';
import {formatSeconds} from '../engine/duration';

interface Props {
  block: SessionBlock;
  /** Dims the row once it has been performed. */
  done?: boolean;
  /** Highlights the row the player is currently on. */
  current?: boolean;
  /** Hides the per-block duration, e.g. in the library listing. */
  hideDuration?: boolean;
}

/** One line of a session: what it is, how long, and whether it is reps or time. */
export function ExerciseCard({block, done = false, current = false, hideDuration = false}: Props) {
  const isRest = block.kind === 'rest';
  const detail = block.mode === 'reps' && block.reps ? block.reps : formatSeconds(block.seconds);

  return (
    <View
      accessible
      accessibilityLabel={[
        block.name,
        block.round ? `round ${block.round}` : '',
        block.practiceNote ?? '',
        detail,
        done ? 'completed' : '',
        current ? 'current' : ''
      ]
        .filter(Boolean)
        .join(', ')}
      style={[styles.row, current && styles.current, done && styles.done, isRest && styles.rest]}
    >
      <View style={styles.icon}>
        {block.mode === 'reps' ? (
          <Repeat size={16} color={colors.inkFaint} strokeWidth={2} />
        ) : (
          <TimerIcon size={16} color={colors.inkFaint} strokeWidth={2} />
        )}
      </View>

      <View style={styles.text}>
        <Text style={[styles.name, current && styles.nameCurrent]} numberOfLines={2}>
          {block.name}
          {block.round ? <Text style={styles.round}>{`  ·  round ${block.round}`}</Text> : null}
        </Text>
        {block.practiceNote ? <Text style={styles.practice}>{block.practiceNote}</Text> : null}
        {block.perSide ? <Text style={styles.meta}>Both sides</Text> : null}
        {block.effortNote ? <Text style={styles.meta}>{block.effortNote}</Text> : null}
      </View>

      {hideDuration ? null : (
        <Text style={[styles.detail, current && styles.detailCurrent]} numberOfLines={1}>
          {detail}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    minHeight: 52
  },
  current: {backgroundColor: colors.primarySoft},
  done: {opacity: 0.45},
  rest: {opacity: 0.7},
  icon: {width: 20, alignItems: 'center'},
  text: {flex: 1, gap: 1},
  name: {...type.body, color: colors.ink},
  nameCurrent: {fontFamily: type.bodyStrong.fontFamily, color: colors.primary},
  round: {...type.caption, color: colors.inkFaint},
  meta: {...type.caption, color: colors.inkFaint},
  practice: {...type.caption, color: colors.sage},
  detail: {...type.caption, ...tabular, color: colors.inkSoft},
  detailCurrent: {color: colors.primary}
});

export default ExerciseCard;
