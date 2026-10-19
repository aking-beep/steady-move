import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {OnboardingStep, SegmentedChoice} from '../../src/components';
import {TimePreference} from '../../src/types';
import {colors, spacing, type} from '../../src/theme';
import {useProfileStore} from '../../src/store/useProfileStore';

const TIMES: {value: TimePreference; label: string; detail?: string}[] = [
  {value: 10, label: '10 min'},
  {value: 20, label: '20 min'},
  {value: 40, label: '40 min'},
  {value: 'flexible', label: 'Flexible'}
];

const DAYS = [2, 3, 4, 5, 6].map(value => ({value, label: `${value}`}));

export default function Schedule() {
  const router = useRouter();
  const timePreference = useProfileStore(state => state.draft.timePreference);
  const weeklyTarget = useProfileStore(state => state.draft.weeklyTarget);
  const setDraft = useProfileStore(state => state.setDraft);

  return (
    <OnboardingStep
      step={5}
      total={5}
      title="What usually fits your day?"
      subtitle="A starting point, not a commitment. You pick the length again at every check-in."
      cta="Continue"
      onContinue={() => router.push('/onboarding/complete')}
    >
      <SegmentedChoice
        label="Usual session length"
        options={TIMES}
        value={timePreference}
        onChange={value => setDraft({timePreference: value})}
      />

      <View style={styles.block}>
        <Text style={styles.label} accessibilityRole="header">
          Movement days a week
        </Text>
        <Text style={styles.help}>
          What you are aiming for. Steady Move shows your progress towards it and never nags you
          about it.
        </Text>
        <SegmentedChoice
          label="Movement days a week"
          options={DAYS}
          value={weeklyTarget}
          onChange={value => setDraft({weeklyTarget: value})}
          style={styles.days}
        />
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  block: {marginTop: spacing.xxl, gap: spacing.sm},
  label: {...type.subheading, color: colors.ink},
  help: {...type.small, color: colors.inkSoft},
  days: {marginTop: spacing.sm}
});
