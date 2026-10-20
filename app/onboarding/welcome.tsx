import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {Button, ScreenContainer} from '../../src/components';
import {HAIRLINE, colors, spacing, type} from '../../src/theme';
import {useReducedMotion} from '../../src/hooks/useMotion';

export default function Welcome() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const fade = reduced ? undefined : FadeIn.duration(700);
  const rise = (delay: number) => (reduced ? undefined : FadeInDown.duration(560).delay(delay));

  return (
    <ScreenContainer scroll={false} contentStyle={styles.content}>
      <Animated.View entering={fade} style={styles.markRow}>
        <View style={styles.mark}>
          <View style={styles.markRing} />
        </View>
        <Text style={styles.wordmark}>Steady Move</Text>
      </Animated.View>

      <View style={styles.middle}>
        <Animated.Text entering={rise(140)} style={styles.headline} accessibilityRole="header">
          Movement that meets you where you are.
        </Animated.Text>

        <Animated.View entering={rise(260)} style={styles.ruleRow}>
          <View style={styles.rule} />
        </Animated.View>

        <Animated.Text entering={rise(320)} style={styles.body}>
          A few questions about how you like to move, then a session built for the day you are
          actually having — the time you have, the room you are in, and how you arrived.
        </Animated.Text>
      </View>

      <Animated.View entering={rise(440)} style={styles.footer}>
        <Button label="Get started" onPress={() => router.push('/onboarding/goals')} />
        <Text style={styles.note}>
          Everything stays on this device. No account, no sign-in, no tracking.
        </Text>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {justifyContent: 'space-between', paddingVertical: spacing.xxxl},

  markRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl},
  mark: {width: 30, height: 30, alignItems: 'center', justifyContent: 'center'},
  markRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3.2,
    borderColor: colors.primary,
    // One open side, rotated so the gap sits low and right, as in the icon.
    borderRightColor: 'transparent',
    transform: [{rotate: '-45deg'}]
  },
  wordmark: {...type.label, color: colors.ink, letterSpacing: 2.2},

  middle: {flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.huge},
  // The one place the serif speaks at full size.
  headline: {...type.display, color: colors.ink},
  ruleRow: {marginTop: spacing.xxl, marginBottom: spacing.xl},
  rule: {height: HAIRLINE, width: 64, backgroundColor: colors.borderStrong},
  body: {...type.body, color: colors.inkSoft, maxWidth: 360},

  footer: {gap: spacing.lg},
  note: {...type.caption, color: colors.inkFaint, textAlign: 'center', maxWidth: 320, alignSelf: 'center'}
});
