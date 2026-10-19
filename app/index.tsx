import React from 'react';
import {Redirect} from 'expo-router';
import {useProfileStore} from '../src/store/useProfileStore';

/**
 * The entry point decides where a launch lands: onboarding for a new install,
 * Today for everyone else. Stores are already hydrated by the root layout, so
 * this never flickers.
 */
export default function Index() {
  const profile = useProfileStore(state => state.profile);
  return <Redirect href={profile ? '/(tabs)/today' : '/onboarding/welcome'} />;
}
