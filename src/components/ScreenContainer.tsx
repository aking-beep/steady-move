import React from 'react';
import {ScrollView, StatusBar, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing} from '../theme';

interface Props {
  children: React.ReactNode;
  /** Wraps the content in a ScrollView. Off for full-screen players. */
  scroll?: boolean;
  /** Extra bottom padding, e.g. to clear a fixed action bar. */
  bottomInset?: number;
  background?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Dark backgrounds need light status bar icons. */
  darkStatusBar?: boolean;
}

/**
 * Every screen's outer frame: safe areas, background and consistent gutters.
 * Horizontal padding lives here so no screen invents its own margin.
 */
export function ScreenContainer({
  children,
  scroll = true,
  bottomInset = 0,
  background = colors.canvas,
  style,
  contentStyle,
  darkStatusBar = false
}: Props) {
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom + bottomInset
  };

  return (
    <View style={[styles.root, {backgroundColor: background}, style]}>
      <StatusBar
        barStyle={darkStatusBar ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  content: {paddingHorizontal: spacing.xl, flexGrow: 1}
});

export default ScreenContainer;
