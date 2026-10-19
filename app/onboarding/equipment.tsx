import React, {useCallback} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ChoiceChip, OnboardingStep} from '../../src/components';
import {EquipmentId} from '../../src/types';
import {useProfileStore} from '../../src/store/useProfileStore';

const EQUIPMENT: {value: EquipmentId; label: string; detail: string}[] = [
  {value: 'bodyweight', label: 'Bodyweight', detail: 'Always available, always enough'},
  {value: 'dumbbells', label: 'Dumbbells', detail: 'One pair is plenty'},
  {value: 'kettlebells', label: 'Kettlebells', detail: 'Carries, hinges and presses'},
  {value: 'bands', label: 'Resistance bands', detail: 'Rows, presses and pull-aparts'},
  {value: 'pullup-bar', label: 'Pull-up bar', detail: 'Hangs and pulling progressions'},
  {value: 'full-gym', label: 'Full gym', detail: 'Unlocks everything above'},
  {value: 'outdoors', label: 'Running outdoors', detail: 'Somewhere to walk or run'}
];

export default function Equipment() {
  const router = useRouter();
  const equipment = useProfileStore(state => state.draft.equipment);
  const toggle = useProfileStore(state => state.toggleDraftItem);
  const updateProfile = useProfileStore(state => state.updateProfile);

  // Opened from Settings to change one answer, rather than as part of the flow.
  const {edit} = useLocalSearchParams<{edit?: string}>();
  const editing = edit === '1';

  const onContinue = useCallback(async () => {
    if (editing) {
      await updateProfile({equipment});
      router.back();
      return;
    }
    router.push('/onboarding/schedule');
  }, [editing, router, updateProfile, equipment]);

  return (
    <OnboardingStep
      editing={editing}
      step={4}
      total={5}
      title="What do you usually have access to?"
      subtitle="Steady Move only ever prescribes movements you have the kit for. You confirm what is actually to hand at each check-in."
      cta={editing ? 'Save' : 'Continue'}
      onContinue={onContinue}
    >
      {EQUIPMENT.map(item => (
        <ChoiceChip
          key={item.value}
          label={item.label}
          detail={item.detail}
          multiSelect
          selected={equipment.includes(item.value)}
          onPress={() => toggle('equipment', item.value)}
        />
      ))}
    </OnboardingStep>
  );
}
