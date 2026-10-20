import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {Check} from 'lucide-react-native';
import {Button, ScreenContainer} from '../../src/components';
import {colors, radius, spacing, type} from '../../src/theme';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useReducedMotion} from '../../src/hooks/useMotion';
import {tapSessionComplete} from '../../src/lib/haptics';

export default function Complete() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const completeOnboarding = useProfileStore(state => state.completeOnboarding);
  const [saving, setSaving] = useState(false);

  const start = useCallback(async () => {
    setSaving(true);
    await completeOnboarding();
    tapSessionComplete();
    // Replace rather than push: onboarding must not be in the back stack.
    router.replace('/(tabs)/today');
  }, [completeOnboarding, router]);

  const rise = (delay: number) => (reduced ? undefined : FadeInDown.duration(500).delay(delay));

  return (
    <ScreenContainer scroll={false} contentStyle={styles.content}>
      <View style={styles.middle}>
        <Animated.View entering={reduced ? undefined : FadeIn.duration(500)} style={styles.badge}>
          <Check size={34} color={colors.onPrimary} strokeWidth={3} />
        </Animated.View>

        <Animated.Text entering={rise(150)} style={styles.title} accessibilityRole="header">
          You&rsquo;re ready.
        </Animated.Text>
        <Animated.Text entering={rise(250)} style={styles.line}>
          Don&rsquo;t chase perfect.
        </Animated.Text>
        <Animated.Text entering={rise(320)} style={styles.lineStrong}>
          Build steady.
        </Animated.Text>
      </View>

      <Animated.View entering={rise(420)} style={styles.footer}>
        <Button label="Start moving" onPress={start} loading={saving} silent />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {justifyContent: 'space-between', paddingVertical: spacing.huge},
  middle: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm},
  badge: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl
  },
  title: {...type.display, color: colors.ink, textAlign: 'center'},
  line: {...type.heading, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.lg},
  lineStrong: {...type.heading, color: colors.primary, textAlign: 'center'},
  footer: {gap: spacing.md}
});
