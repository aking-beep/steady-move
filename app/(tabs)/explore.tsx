import React, {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ChevronRight} from 'lucide-react-native';
import {Card, ScreenContainer, SectionHeader} from '../../src/components';
import {HAIRLINE, TAB_BAR_INSET, colors, radius, spacing, type} from '../../src/theme';
import {EXPLORE_CATEGORIES, ExploreItem, itemsByCategory} from '../../src/data/explore';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {buildExploreSession} from '../../src/lib/sessions';

export default function Explore() {
  const router = useRouter();
  const profile = useProfileStore(state => state.profile);
  const checkIn = useTodayStore(state => state.checkIn);
  const setSession = useTodayStore(state => state.setSession);
  const logs = useHistoryStore(state => state.logs);

  const open = useCallback(
    async (item: ExploreItem) => {
      if (!profile) return;

      // Breathing runs in its own player rather than the block timer.
      if (item.breathingMinutes) {
        router.push({pathname: '/activity/breathe', params: {minutes: String(item.breathingMinutes)}});
        return;
      }

      // Built through the same engine as the daily session, so today's
      // check-in still softens it if that is what the day calls for.
      const session = buildExploreSession({item, profile, history: logs, checkIn});
      await setSession(session);
      router.push('/workout/preview');
    },
    [checkIn, logs, profile, router, setSession]
  );

  return (
    <ScreenContainer bottomInset={TAB_BAR_INSET}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>The library</Text>
        <Text style={styles.heading} accessibilityRole="header">
          Explore
        </Text>
        <Text style={styles.sub}>
          Pick a session directly. Each one is built for you when you open it, using what you told
          Steady Move about today.
        </Text>
      </View>

      {EXPLORE_CATEGORIES.map(category => (
        <View key={category.id}>
          <SectionHeader title={category.title} subtitle={category.subtitle} />
          <View style={styles.list}>
            {itemsByCategory(category.id).map(item => (
              <Card
                key={item.id}
                style={styles.row}
                onPress={() => open(item)}
                accessibilityLabel={`${item.title}, ${item.breathingMinutes ?? item.minutes} minutes`}
                accessibilityHint={item.description}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowBody}>{item.description}</Text>
                </View>
                <View style={styles.rowEnd}>
                  <Text style={styles.rowTime}>{item.breathingMinutes ?? item.minutes} min</Text>
                  <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
                </View>
              </Card>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.footnote}>
        Every session here adapts to your level and the equipment you have. Nothing is a fixed video
        you have to keep up with.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {paddingTop: spacing.xl, paddingBottom: spacing.sm, gap: spacing.xs},
  eyebrow: {...type.label, color: colors.inkFaint},
  heading: {...type.title, color: colors.ink},
  sub: {...type.small, color: colors.inkSoft, marginTop: spacing.xs},

  list: {gap: 0},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: 0,
    minHeight: 68,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: colors.border,
    backgroundColor: 'transparent'
  },
  rowText: {flex: 1, gap: 2},
  rowTitle: {...type.bodyStrong, color: colors.ink},
  rowBody: {...type.caption, color: colors.inkFaint},
  rowEnd: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  rowTime: {...type.caption, color: colors.inkSoft, borderRadius: radius.pill, overflow: 'hidden'},

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  }
});
