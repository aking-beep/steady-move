import React from 'react';
import {useRouter} from 'expo-router';
import {ChoiceChip, OnboardingStep} from '../../src/components';
import {Level} from '../../src/types';
import {useProfileStore} from '../../src/store/useProfileStore';

const LEVELS: {value: Level; label: string; detail: string}[] = [
  {value: 'new', label: 'Getting started', detail: 'New to this, or coming back after a while'},
  {value: 'occasional', label: 'I exercise occasionally', detail: 'A session here and there'},
  {value: 'regular', label: 'I train regularly', detail: 'Several sessions most weeks'}
];

export default function LevelScreen() {
  const router = useRouter();
  const level = useProfileStore(state => state.draft.level);
  const setDraft = useProfileStore(state => state.setDraft);

  return (
    <OnboardingStep
      step={2}
      total={5}
      title="Where are you starting from?"
      subtitle="This sets which movements you are offered. Steady Move never jumps you ahead of this."
      cta="Continue"
      onContinue={() => router.push('/onboarding/activities')}
    >
      {LEVELS.map(option => (
        <ChoiceChip
          key={option.value}
          label={option.label}
          detail={option.detail}
          selected={level === option.value}
          onPress={() => setDraft({level: option.value})}
        />
      ))}
    </OnboardingStep>
  );
}
