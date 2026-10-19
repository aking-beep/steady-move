import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {Button, ScreenContainer} from '../../src/components';
import {colors, spacing, type} from '../../src/theme';
import {useReducedMotion} from '../../src/hooks/useMotion';

export default function Welcome() {
  const router = useRouter();
  const reduced = useReducedMotion();

  // Entry animations are the first thing a new user sees, so they are the first
  // thing to drop when reduced motion is on.
  const fade = reduced ? undefined : FadeIn.duration(600);
  const rise = (delay: number) => (reduced ? undefined : FadeInDown.duration(500).delay(delay));

  return (
    <ScreenContainer scroll={false} contentStyle={styles.content}>
      <View style={styles.top}>
        <Animated.View entering={fade} style={styles.mark}>
          <View style={styles.markRing} />
        </Animated.View>
      </View>

      <View style={styles.middle}>
        <Animated.Text entering={rise(120)} style={styles.wordmark} accessibilityRole="header">
          STEADY MOVE
        </Animated.Text>
        <Animated.Text entering={rise(220)} style={styles.tagline}>
          Movement that meets you where you are.
        </Animated.Text>
        <Animated.Text entering={rise(320)} style={styles.body}>
          A few questions about how you like to move, then a session built for the day you are
          actually having.
        </Animated.Text>
      </View>

      <Animated.View entering={rise(420)} style={styles.footer}>
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
  top: {alignItems: 'center', paddingTop: spacing.huge},
  mark: {width: 96, height: 96, alignItems: 'center', justifyContent: 'center'},
  markRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 7,
    borderColor: colors.primary,
    // The open side of the ring echoes the app icon.
    borderRightColor: 'transparent',
    transform: [{rotate: '-35deg'}]
  },
  middle: {gap: spacing.md},
  wordmark: {...type.display, color: colors.ink, letterSpacing: 1},
  tagline: {...type.heading, color: colors.primary, fontWeight: '600'},
  body: {...type.body, color: colors.inkSoft, marginTop: spacing.sm},
  footer: {gap: spacing.lg},
  note: {...type.caption, color: colors.inkFaint, fontWeight: '400', textAlign: 'center'}
});
