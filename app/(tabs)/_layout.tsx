import React from 'react';
import {Platform, StyleSheet} from 'react-native';
import {Tabs} from 'expo-router';
import {Compass, Home, Settings as SettingsIcon, TrendingUp} from 'lucide-react-native';
import {colors, spacing, type} from '../../src/theme';

/** One icon per tab, sized for a comfortable 44pt target. */
const ICON_SIZE = 22;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: styles.bar,
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
    // Android draws no safe-area padding of its own, so the bar gets height
    // here rather than relying on the gesture inset.
    height: Platform.select({android: 64, default: 84}),
    paddingTop: spacing.sm,
    paddingBottom: Platform.select({android: spacing.sm, default: spacing.xxl})
  },
  label: {...type.caption, fontSize: 11, fontWeight: '600'},
  item: {minHeight: 44}
});
