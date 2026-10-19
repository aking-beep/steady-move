import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Check, X} from 'lucide-react-native';
import {BreathingCircle, Button, ScreenContainer, SegmentedChoice} from '../../src/components';
import {MIN_TAP, colors, spacing, type} from '../../src/theme';
import {WorkoutLog} from '../../src/types';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {formatSeconds} from '../../src/engine/duration';
import {localDateKey} from '../../src/lib/date';
import {useInterval, useReducedMotion} from '../../src/hooks/useMotion';
import {tapSessionComplete} from '../../src/lib/haptics';

type Length = 1 | 2 | 5;

const LENGTHS: {value: Length; label: string}[] = [
  {value: 1, label: '1 min'},
  {value: 2, label: '2 min'},
  {value: 5, label: '5 min'}
];

/**
 * A session this short only counts towards movement days once there is enough
 * of it to be worth the name. One minute is still logged — it simply does not
 * extend a streak.
 */
const QUALIFYING_MINUTES = 2;

export default function Breathe() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{minutes?: string}>();
  const addLog = useHistoryStore(state => state.addLog);

  const requested = Number(params.minutes);
  const initial: Length = requested === 1 || requested === 2 || requested === 5 ? requested : 2;

  const [length, setLength] = useState<Length>(initial);
  const [remaining, setRemaining] = useState(initial * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useRef(false);

  const total = useMemo(() => length * 60, [length]);

  // Changing the length before starting resets the clock to match.
  useEffect(() => {
    if (!running && !done) setRemaining(length * 60);
  }, [length, running, done]);

  // The tick only counts down. Reaching zero is handled in an effect, so no
  // state update is ever nested inside another one.
  useInterval(() => setRemaining(value => Math.max(0, value - 1)), running && !done, 1000);

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false);
      setDone(true);
    }
  }, [remaining, running]);

  useEffect(() => {
    if (done && !saved.current) {
      saved.current = true;
      tapSessionComplete();
    }
  }, [done]);

  const save = useCallback(async () => {
    const now = new Date();
    const elapsed = total - remaining;
    const log: WorkoutLog = {
      id: `log-${now.getTime()}`,
      completedAt: now.toISOString(),
      dateKey: localDateKey(now),
      sessionId: `breathing-${length}`,
      type: 'mindful',
      title: `${length} minute breathing`,
      plannedMinutes: length,
      activeSeconds: elapsed,
      blocksCompleted: 1,
      blocksTotal: 1,
      qualifies: length >= QUALIFYING_MINUTES && elapsed >= total * 0.7
    };

    setSaving(true);
    await addLog(log);
    router.replace('/(tabs)/progress');
  }, [addLog, length, remaining, router, total]);

  const elapsed = total - remaining;

  return (
    <ScreenContainer scroll={false} contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close breathing session"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerButton}
        >
          <X size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>BREATHING</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.main}>
        {done ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(400)} style={styles.doneWrap}>
            <View style={styles.badge}>
              <Check size={30} color={colors.onPrimary} strokeWidth={3} />
            </View>
            <Text style={styles.doneTitle} accessibilityRole="header">
              That was enough.
            </Text>
            <Text style={styles.doneBody}>
              {`${length} ${length === 1 ? 'minute' : 'minutes'} of breathing.`}
            </Text>
          </Animated.View>
        ) : (
          <>
            <BreathingCircle
              size={300}
              paused={!running}
              caption={running ? formatSeconds(remaining) : undefined}
            />
            {!running ? (
              <View style={styles.setup}>
                <Text style={styles.setupLabel}>How long?</Text>
                <SegmentedChoice
                  label="Session length"
                  options={LENGTHS}
                  value={length}
                  onChange={setLength}
                />
              </View>
            ) : (
              <Text style={styles.guide}>
                In for four, hold for one, out for five. Let the circle set the pace.
              </Text>
            )}
          </>
        )}
      </View>

      <View style={styles.footer}>
        {done ? (
          <>
            <Button label="Save session" onPress={save} loading={saving} silent />
            <Button label="Not this time" variant="ghost" onPress={() => router.back()} />
          </>
        ) : running ? (
          <>
            <Button label="Pause" variant="secondary" onPress={() => setRunning(false)} />
            <Button
              label="Finish early"
              variant="ghost"
              onPress={() => {
                setRunning(false);
                setDone(true);
              }}
            />
          </>
        ) : (
          <>
            <Button
              label={elapsed > 0 ? 'Resume' : 'Begin'}
              onPress={() => setRunning(true)}
              silent
            />
            {elapsed > 0 ? (
              <Button label="Finish" variant="ghost" onPress={() => setDone(true)} />
            ) : null}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {paddingBottom: spacing.xl},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    minHeight: MIN_TAP
  },
  headerButton: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {...type.eyebrow, color: colors.inkFaint},

  main: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl},
  setup: {alignSelf: 'stretch', gap: spacing.md},
  setupLabel: {...type.subheading, color: colors.ink, textAlign: 'center'},
  guide: {...type.body, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: spacing.lg},

  doneWrap: {alignItems: 'center', gap: spacing.sm},
  badge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg
  },
  doneTitle: {...type.title, color: colors.ink, textAlign: 'center'},
  doneBody: {...type.body, color: colors.inkSoft, textAlign: 'center'},

  footer: {gap: spacing.sm}
});
