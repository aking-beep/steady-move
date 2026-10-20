import React from 'react';
import {StyleSheet} from 'react-native';
import {Tabs} from 'expo-router';
import {Compass, Home, Settings as SettingsIcon, TrendingUp} from 'lucide-react-native';
import {colors, spacing, type} from '../../src/theme';

/**
 * The navigator sizes the bar itself (and adds the device's safe-area inset
 * below it), so the icon and label are sized to fit inside that rather than
 * the bar being stretched to fit them — which clipped the labels.
 */
const ICON_SIZE = 20;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: styles.bar,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: {backgroundColor: colors.canvas}
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({color}) => <Home size={ICON_SIZE} color={color} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({color}) => <Compass size={ICON_SIZE} color={color} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({color}) => <TrendingUp size={ICON_SIZE} color={color} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({color}) => <SettingsIcon size={ICON_SIZE} color={color} strokeWidth={2} />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Explicit height: the navigator's default bar squeezed the label to a
    // single pixel. Verified in a browser at 390x844.
    height: 68,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  label: {...type.caption, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2},
  item: {paddingVertical: 0, height: 52}
});
