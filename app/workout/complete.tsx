import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {Check} from 'lucide-react-native';
import {Button, Card, ScreenContainer, SegmentedChoice} from '../../src/components';
import {HAIRLINE, colors, radius, spacing, type} from '../../src/theme';
import {EffortRating, Feel} from '../../src/types';
import {useSessionStore} from '../../src/store/useSessionStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {formatDuration} from '../../src/engine/duration';
import {SESSION_TITLES} from '../../src/engine/planner';
import {useReducedMotion} from '../../src/hooks/useMotion';
import {tapSessionComplete} from '../../src/lib/haptics';

const FEELS: {value: Feel; label: string}[] = [
  {value: 'lower', label: 'Lower'},
  {value: 'same', label: 'Same'},
  {value: 'better', label: 'Better'}
];

const EFFORTS: {value: EffortRating; label: string}[] = [
  {value: 'easy', label: 'Easy'},
  {value: 'right', label: 'Right'},
  {value: 'hard', label: 'Hard'}
];

export default function CompleteScreen() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const session = useSessionStore(state => state.session);
  const activeSeconds = useSessionStore(state => state.activeSeconds);
  const completed = useSessionStore(state => state.completed);
  const buildLog = useSessionStore(state => state.buildLog);
  const abandon = useSessionStore(state => state.abandon);
  const addLog = useHistoryStore(state => state.addLog);
  const clearSession = useTodayStore(state => state.clearSession);

  const [feel, setFeel] = useState<Feel | null>(null);
  const [effort, setEffort] = useState<EffortRating | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const exerciseTotal = useMemo(
    () => (session ? session.blocks.filter(block => block.kind === 'exercise').length : 0),
    [session]
  );
  const exerciseDone = useMemo(() => {
    if (!session) return 0;
    const ids = new Set(session.blocks.filter(block => block.kind === 'exercise').map(block => block.id));
    return completed.filter(id => ids.has(id)).length;
  }, [completed, session]);

  const save = useCallback(async () => {
    const log = buildLog({
      feel: feel ?? undefined,
      effort: effort ?? undefined,
      note: note.trim() ? note.trim() : undefined
    });
    if (!log) {
      router.replace('/(tabs)/today');
      return;
    }

    setSaving(true);
    await addLog(log);
    // The session is done: clear both the player state and today's preview so
    // Today offers a fresh check-in rather than a session already finished.
    await abandon();
    await clearSession();
    tapSessionComplete();
    router.replace('/(tabs)/progress');
  }, [abandon, addLog, buildLog, clearSession, effort, feel, note, router]);

  if (!session) {
    return (
      <ScreenContainer scroll={false} contentStyle={styles.centered}>
        <Text style={styles.emptyTitle}>Nothing to save</Text>
        <Button label="Back to today" onPress={() => router.replace('/(tabs)/today')} />
      </ScreenContainer>
    );
  }

  const rise = (delay: number) => (reduced ? undefined : FadeInDown.duration(420).delay(delay));

  return (
    <ScreenContainer bottomInset={spacing.xxl}>
      <View style={styles.top}>
        <Animated.View entering={reduced ? undefined : FadeIn.duration(420)} style={styles.badge}>
          <Check size={30} color={colors.onPrimary} strokeWidth={3} />
        </Animated.View>

        <Animated.Text entering={rise(120)} style={styles.title} accessibilityRole="header">
          You showed up.
        </Animated.Text>
        <Animated.Text entering={rise(200)} style={styles.subtitle}>
          {session.title}
        </Animated.Text>
      </View>

      <Animated.View entering={rise(280)}>
        <Card style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(activeSeconds)}</Text>
            <Text style={styles.statLabel}>Moving</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{`${exerciseDone}/${exerciseTotal}`}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue} numberOfLines={1}>
              {SESSION_TITLES[session.type].split(' ')[0]}
            </Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={rise(360)} style={styles.section}>
        <Text style={styles.question}>How do you feel now?</Text>
        <SegmentedChoice label="How do you feel now" options={FEELS} value={feel} onChange={setFeel} />
      </Animated.View>

      <Animated.View entering={rise(420)} style={styles.section}>
        <Text style={styles.question}>How was the effort?</Text>
        <SegmentedChoice label="How was the effort" options={EFFORTS} value={effort} onChange={setEffort} />
      </Animated.View>

      <Animated.View entering={rise(480)} style={styles.section}>
        <Text style={styles.question}>Anything worth remembering?</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          multiline
          maxLength={280}
          accessibilityLabel="Optional note about this session"
          // Submitting from the keyboard would hide the save button on Android.
          blurOnSubmit
        />
      </Animated.View>

      <View style={styles.actions}>
        <Button label="Save session" onPress={save} loading={saving} silent />
        <Text style={styles.note}>
          Reflection is optional. The session saves either way.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {flex: 1, justifyContent: 'center', gap: spacing.lg},
  emptyTitle: {...type.heading, color: colors.ink, textAlign: 'center'},

  top: {alignItems: 'center', paddingTop: spacing.huge, gap: spacing.xs},
  badge: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg
  },
  title: {...type.display, color: colors.ink, textAlign: 'center'},
  subtitle: {...type.body, color: colors.inkSoft, textAlign: 'center'},

  stats: {flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxl},
  stat: {flex: 1, alignItems: 'center', gap: 2},
  statDivider: {width: StyleSheet.hairlineWidth, height: 34, backgroundColor: colors.border},
  statValue: {...type.subheading, color: colors.ink},
  statLabel: {...type.caption, color: colors.inkFaint},

  section: {marginTop: spacing.xxl, gap: spacing.md},
  question: {...type.subheading, color: colors.ink},
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 92,
    textAlignVertical: 'top'
  },

  actions: {marginTop: spacing.xxxl, gap: spacing.md},
  note: {...type.caption, color: colors.inkFaint, textAlign: 'center'}
});
