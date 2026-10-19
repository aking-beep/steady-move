import React, {useCallback} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ChoiceChip, OnboardingStep} from '../../src/components';
import {Goal} from '../../src/types';
import {useProfileStore} from '../../src/store/useProfileStore';

const GOALS: {value: Goal; label: string; detail: string}[] = [
  {value: 'consistency', label: 'Build consistency', detail: 'Show up more often than not'},
  {value: 'strength', label: 'Get stronger', detail: 'Build strength you can feel day to day'},
  {value: 'endurance', label: 'Improve endurance', detail: 'Last longer, recover quicker'},
  {value: 'move-better', label: 'Move better', detail: 'More range, less stiffness'},
  {value: 'stress', label: 'Reduce stress', detail: 'Movement as a way to settle'},
  {value: 'athletic', label: 'Become more athletic', detail: 'Coordination, balance and control'},
  {value: 'sport', label: 'Support another sport', detail: 'Training that backs up what you already do'}
];

export default function Goals() {
  const router = useRouter();
  const goals = useProfileStore(state => state.draft.goals);
  const toggle = useProfileStore(state => state.toggleDraftItem);
  const updateProfile = useProfileStore(state => state.updateProfile);

  // Opened from Settings to change one answer, rather than as part of the flow.
  const {edit} = useLocalSearchParams<{edit?: string}>();
  const editing = edit === '1';

  const onContinue = useCallback(async () => {
    if (editing) {
      await updateProfile({goals});
      router.back();
      return;
    }
    router.push('/onboarding/level');
  }, [editing, router, updateProfile, goals]);

  return (
    <OnboardingStep
      editing={editing}
      step={1}
      total={5}
      title="What would you like movement to help with?"
      subtitle="Choose as many as you like. This shapes what Steady Move suggests, and you can change it later."
      cta={editing ? 'Save' : 'Continue'}
      continueDisabled={goals.length === 0}
      onContinue={onContinue}
      footnote={goals.length === 0 ? 'Pick at least one to continue' : undefined}
    >
      {GOALS.map(goal => (
        <ChoiceChip
          key={goal.value}
          label={goal.label}
          detail={goal.detail}
          multiSelect
          selected={goals.includes(goal.value)}
          onPress={() => toggle('goals', goal.value)}
        />
      ))}
    </OnboardingStep>
  );
}
