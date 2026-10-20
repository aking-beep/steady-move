import React, {useCallback, useState} from 'react';
import {Alert, Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Constants from 'expo-constants';
import {ChevronRight} from 'lucide-react-native';
import {Button, Card, ScreenContainer, SectionHeader, SegmentedChoice} from '../../src/components';
import {TAB_BAR_INSET, MIN_TAP, colors, radius, spacing, type} from '../../src/theme';
import {Activity, EquipmentId, Goal, Level, TimePreference} from '../../src/types';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useSessionStore} from '../../src/store/useSessionStore';
import {clearAll} from '../../src/lib/storage';
import {tapWarning} from '../../src/lib/haptics';

const LEVELS: {value: Level; label: string}[] = [
  {value: 'new', label: 'Starting'},
  {value: 'occasional', label: 'Occasional'},
  {value: 'regular', label: 'Regular'}
];

const TIMES: {value: TimePreference; label: string}[] = [
  {value: 10, label: '10'},
  {value: 20, label: '20'},
  {value: 40, label: '40'},
  {value: 'flexible', label: 'Flex'}
];

const DAYS = [2, 3, 4, 5, 6].map(value => ({value, label: `${value}`}));

const GOAL_LABELS: Record<Goal, string> = {
  consistency: 'Build consistency',
  strength: 'Get stronger',
  endurance: 'Improve endurance',
  'move-better': 'Move better',
  stress: 'Reduce stress',
  athletic: 'Become more athletic',
  sport: 'Support another sport'
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  calisthenics: 'Calisthenics',
  strength: 'Strength',
  running: 'Running',
  walking: 'Walking',
  mobility: 'Mobility',
  stretching: 'Stretching',
  mindfulness: 'Mindfulness'
};

const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  bodyweight: 'Bodyweight',
  dumbbells: 'Dumbbells',
  kettlebells: 'Kettlebells',
  bands: 'Bands',
  'pullup-bar': 'Pull-up bar',
  'full-gym': 'Full gym',
  outdoors: 'Outdoors'
};

export default function Settings() {
  const router = useRouter();

  const profile = useProfileStore(state => state.profile);
  const settings = useProfileStore(state => state.settings);
  const updateProfile = useProfileStore(state => state.updateProfile);
  const updateSettings = useProfileStore(state => state.updateSettings);
  const resetOnboarding = useProfileStore(state => state.resetOnboarding);
  const profileReset = useProfileStore(state => state.reset);

  const seedDemoData = useHistoryStore(state => state.seedDemoData);
  const clearHistory = useHistoryStore(state => state.clearHistory);
  const clearToday = useTodayStore(state => state.clearToday);
  const abandonSession = useSessionStore(state => state.abandon);

  const [tapCount, setTapCount] = useState(0);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  /** Seven taps on the version line reveals the developer tools. */
  const onVersionTap = useCallback(() => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 7 && !settings.developerMode) {
      updateSettings({developerMode: true});
      Alert.alert('Developer tools enabled', 'A developer section is now visible in Settings.');
    }
  }, [settings.developerMode, tapCount, updateSettings]);

  const confirmResetOnboarding = useCallback(() => {
    Alert.alert(
      'Reset onboarding?',
      'You will be asked the setup questions again. Your session history is kept.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            tapWarning();
            await resetOnboarding();
            router.replace('/onboarding/welcome');
          }
        }
      ]
    );
  }, [resetOnboarding, router]);

  const confirmDeleteAll = useCallback(() => {
    Alert.alert(
      'Delete all local data?',
      'This removes your profile, check-ins and every saved session from this device. It cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            tapWarning();
            await Promise.all([clearHistory(), clearToday(), abandonSession()]);
            await clearAll();
            profileReset();
            router.replace('/onboarding/welcome');
          }
        }
      ]
    );
  }, [abandonSession, clearHistory, clearToday, profileReset, router]);

  if (!profile) {
    return (
      <ScreenContainer>
        <Text style={styles.heading}>Settings</Text>
        <Button label="Set up Steady Move" onPress={() => router.replace('/onboarding/welcome')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer bottomInset={TAB_BAR_INSET}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          Settings
        </Text>
      </View>

      {/* ——— Profile ——— */}
      <SectionHeader title="Your training" subtitle="Changes apply to the next session you build" />

      <Card style={styles.block}>
        <Text style={styles.label}>Fitness level</Text>
        <SegmentedChoice
          label="Fitness level"
          options={LEVELS}
          value={profile.level}
          onChange={value => updateProfile({level: value})}
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.label}>Default session length</Text>
        <SegmentedChoice
          label="Default session length in minutes"
          options={TIMES}
          value={profile.timePreference}
          onChange={value => updateProfile({timePreference: value})}
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.label}>Movement days a week</Text>
        <SegmentedChoice
          label="Movement days a week"
          options={DAYS}
          value={profile.weeklyTarget}
          onChange={value => updateProfile({weeklyTarget: value})}
        />
      </Card>

      <LinkRow
        label="Goals"
        value={profile.goals.map(goal => GOAL_LABELS[goal]).join(', ') || 'None selected'}
        onPress={() => router.push({pathname: '/onboarding/goals', params: {edit: '1'}})}
      />
      <LinkRow
        label="Preferred activities"
        value={profile.activities.map(item => ACTIVITY_LABELS[item]).join(', ') || 'None selected'}
        onPress={() => router.push({pathname: '/onboarding/activities', params: {edit: '1'}})}
      />
      <LinkRow
        label="Equipment"
        value={profile.equipment.map(item => EQUIPMENT_LABELS[item]).join(', ') || 'Bodyweight'}
        onPress={() => router.push({pathname: '/onboarding/equipment', params: {edit: '1'}})}
      />

      {/* ——— Accessibility ——— */}
      <SectionHeader title="Feel" />

      <Card style={styles.toggleCard}>
        <ToggleRow
          label="Haptics"
          help="Light taps when a block finishes or a session completes."
          value={settings.haptics}
          onChange={value => updateSettings({haptics: value})}
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Reduce motion"
          help="Turns off animated transitions and the breathing animation. Your device setting is respected too."
          value={settings.reduceMotion}
          onChange={value => updateSettings({reduceMotion: value})}
        />
      </Card>

      {/* ——— Data ——— */}
      <SectionHeader title="Your data" />

      <Card style={styles.privacy}>
        <Text style={styles.privacyTitle}>Everything stays here</Text>
        <Text style={styles.privacyBody}>
          Steady Move has no account, no server and no analytics. Your profile, check-ins and
          sessions are stored on this device only, and deleting the app removes them.
        </Text>
      </Card>

      <View style={styles.dangerActions}>
        <Button label="Reset onboarding" variant="secondary" onPress={confirmResetOnboarding} />
        <Button label="Delete local data" variant="secondary" onPress={confirmDeleteAll} />
      </View>

      {/* ——— Developer ——— */}
      {settings.developerMode ? (
        <>
          <SectionHeader title="Developer" subtitle="Not part of the normal experience" />
          <Card style={styles.block}>
            <Text style={styles.label}>Demo data</Text>
            <Text style={styles.help}>
              Replaces your history with four weeks of realistic sessions, so progress, streaks and
              the weekly chart can be reviewed without completing twenty workouts.
            </Text>
            <Button
              label="Seed demo history"
              variant="secondary"
              onPress={async () => {
                await seedDemoData();
                Alert.alert('Demo data seeded', 'Open Progress to see four weeks of history.');
              }}
            />
            <Button
              label="Clear history only"
              variant="ghost"
              onPress={async () => {
                await clearHistory();
                Alert.alert('History cleared', 'Your profile and settings were kept.');
              }}
            />
            <Button
              label="Hide developer tools"
              variant="ghost"
              onPress={() => {
                setTapCount(0);
                updateSettings({developerMode: false});
              }}
            />
          </Card>
        </>
      ) : null}

      {/* ——— About ——— */}
      <SectionHeader title="About" />
      <Card style={styles.about}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Version ${version}`}
          onPress={onVersionTap}
          style={styles.aboutRow}
        >
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>{version}</Text>
        </Pressable>
        <View style={styles.divider} />
        <Text style={styles.disclaimer}>
          Steady Move offers general movement and wellbeing guidance. It is not medical advice and
          cannot assess an injury. If something hurts, or you are unsure whether exercise is right
          for you, speak to a qualified health professional.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

function LinkRow({label, value, onPress}: {label: string; value: string; onPress: () => void}) {
  return (
    <Card
      style={styles.linkRow}
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Opens the setup question to change this"
    >
      <View style={styles.linkText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
    </Card>
  );
}

function ToggleRow({
  label,
  help,
  value,
  onChange
}: {
  label: string;
  help: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.help}>{help}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={help}
        trackColor={{false: colors.surfaceMuted, true: colors.sage}}
        thumbColor={value ? colors.primary : colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {paddingTop: spacing.xl, paddingBottom: spacing.sm},
  heading: {...type.display, color: colors.ink},

  block: {gap: spacing.md, marginBottom: spacing.md},
  label: {...type.subheading, color: colors.ink},
  help: {...type.caption, color: colors.inkSoft, fontWeight: '400'},

  linkRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, minHeight: 68},
  linkText: {flex: 1, gap: 2},
  linkLabel: {...type.bodyStrong, color: colors.ink},
  linkValue: {...type.caption, color: colors.inkSoft, fontWeight: '400'},

  toggleCard: {gap: spacing.lg},
  toggleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: MIN_TAP},
  toggleText: {flex: 1, gap: 2},
  toggleLabel: {...type.bodyStrong, color: colors.ink},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: colors.border},

  privacy: {gap: spacing.sm, backgroundColor: colors.sageSoft},
  privacyTitle: {...type.subheading, color: colors.primary},
  privacyBody: {...type.small, color: colors.ink},

  dangerActions: {gap: spacing.md, marginTop: spacing.md},

  about: {gap: spacing.lg},
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: MIN_TAP,
    borderRadius: radius.sm
  },
  aboutLabel: {...type.body, color: colors.ink},
  aboutValue: {...type.body, color: colors.inkFaint},
  disclaimer: {...type.caption, color: colors.inkSoft, fontWeight: '400'}
});
