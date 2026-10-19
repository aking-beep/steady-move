import React, {useCallback} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ChoiceChip, OnboardingStep} from '../../src/components';
import {Activity} from '../../src/types';
import {useProfileStore} from '../../src/store/useProfileStore';

const ACTIVITIES: {value: Activity; label: string; detail: string}[] = [
  {value: 'calisthenics', label: 'Calisthenics', detail: 'Strength using your own bodyweight'},
  {value: 'strength', label: 'Strength', detail: 'Weights, bands or whatever you have'},
  {value: 'running', label: 'Running', detail: 'Easy aerobic running, judged by effort'},
  {value: 'walking', label: 'Walking', detail: 'The most underrated session there is'},
  {value: 'mobility', label: 'Mobility', detail: 'Range of motion and control'},
  {value: 'stretching', label: 'Stretching', detail: 'Slow holds and unwinding'},
  {value: 'mindfulness', label: 'Mindfulness', detail: 'Breathing and attention'}
];

export default function Activities() {
  const router = useRouter();
  const activities = useProfileStore(state => state.draft.activities);
  const toggle = useProfileStore(state => state.toggleDraftItem);
  const updateProfile = useProfileStore(state => state.updateProfile);

  // Opened from Settings to change one answer, rather than as part of the flow.
  const {edit} = useLocalSearchParams<{edit?: string}>();
  const editing = edit === '1';

  const onContinue = useCallback(async () => {
    if (editing) {
      await updateProfile({activities});
      router.back();
      return;
    }
    router.push('/onboarding/equipment');
  }, [editing, router, updateProfile, activities]);

  return (
    <OnboardingStep
      editing={editing}
      step={3}
      total={5}
      title="What do you enjoy?"
      subtitle="Steady Move rotates between what you pick, so no single thing gets stale."
      cta={editing ? 'Save' : 'Continue'}
      continueDisabled={activities.length === 0}
      onContinue={onContinue}
      footnote={activities.length === 0 ? 'Pick at least one to continue' : undefined}
    >
      {ACTIVITIES.map(activity => (
        <ChoiceChip
          key={activity.value}
          label={activity.label}
          detail={activity.detail}
          multiSelect
          selected={activities.includes(activity.value)}
          onPress={() => toggle('activities', activity.value)}
        />
      ))}
    </OnboardingStep>
  );
}
