import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Stack} from 'expo-router';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {colors} from '../src/theme';
import {useProfileStore} from '../src/store/useProfileStore';
import {useTodayStore} from '../src/store/useTodayStore';
import {useHistoryStore} from '../src/store/useHistoryStore';
import {useSessionStore} from '../src/store/useSessionStore';

// Held until every store has read from disk, so the first frame is already
// correct rather than flashing onboarding at a returning user.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unsupported: nothing to recover from.
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const hydrateProfile = useProfileStore(state => state.hydrate);
  const hydrateToday = useTodayStore(state => state.hydrate);
  const hydrateHistory = useHistoryStore(state => state.hydrate);
  const hydrateSession = useSessionStore(state => state.hydrate);

  useEffect(() => {
    let active = true;

    Promise.all([hydrateProfile(), hydrateToday(), hydrateHistory(), hydrateSession()])
      .catch(() => {
        // Each store already falls back to a safe default, so a failure here
        // means "start fresh", never "refuse to open".
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [hydrateProfile, hydrateToday, hydrateHistory, hydrateSession]);

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {backgroundColor: colors.canvas},
            animation: 'slide_from_right'
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="check-in" options={{animation: 'slide_from_bottom'}} />
          <Stack.Screen name="workout/preview" />
          {/* The player owns the back gesture so a workout is never swiped away. */}
          <Stack.Screen name="workout/session" options={{gestureEnabled: false}} />
          <Stack.Screen name="workout/complete" options={{gestureEnabled: false}} />
          <Stack.Screen name="activity/breathe" options={{animation: 'fade'}} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas}
});
