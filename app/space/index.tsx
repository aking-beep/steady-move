import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Camera, ChevronLeft, ChevronRight} from 'lucide-react-native';
import {Card, ScreenContainer, SectionHeader} from '../../src/components';
import {MIN_TAP, colors, radius, spacing, type} from '../../src/theme';
import {SessionType} from '../../src/types';
import {PLACES, Place} from '../../src/data/places';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {buildPlaceSession} from '../../src/lib/places';
import {tapSelection} from '../../src/lib/haptics';

/** What you want out of today, which narrows what the place offers. */
export interface Intent {
  id: string;
  label: string;
  types: SessionType[];
}

export const INTENTS: Intent[] = [
  {id: 'loosen', label: 'Loosen up', types: ['mobility']},
  {id: 'strong', label: 'Get stronger', types: ['strength', 'calisthenics']},
  {id: 'moving', label: 'Get moving', types: ['runwalk', 'balanced']},
  {id: 'settle', label: 'Settle down', types: ['mindful']}
];

export default function SpacePicker() {
  const router = useRouter();
  const profile = useProfileStore(state => state.profile);
  const checkIn = useTodayStore(state => state.checkIn);
  const setSession = useTodayStore(state => state.setSession);
  const logs = useHistoryStore(state => state.logs);

  const [intentId, setIntentId] = useState<string | null>(null);

  const open = useCallback(
    async (place: Place) => {
      if (!profile) return;
      const intent = INTENTS.find(entry => entry.id === intentId);

      // A chosen intent reorders the place's session types; what the place
      // physically allows is never overridden by it.
      const place2: Place = intent
        ? {...place, types: [...intent.types.filter(t => place.types.includes(t)), ...place.types]}
        : place;

      const session = buildPlaceSession({place: place2, profile, history: logs, checkIn});
      await setSession(session);
      router.push('/workout/preview');
    },
    [checkIn, intentId, logs, profile, router, setSession]
  );

  return (
    <ScreenContainer bottomInset={spacing.xxxl}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerButton}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>YOUR SPACE</Text>
        <View style={styles.headerButton} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Where are you?
      </Text>
      <Text style={styles.sub}>
        Steady Move will keep the session to what the place actually allows — the room you have, the
        people around you, and the floor below.
      </Text>

      {/* ——— Photo route ——— */}
      <Card
        tone="primary"
        style={styles.scanCard}
        onPress={() => {
          tapSelection();
          router.push('/space/scan');
        }}
        accessibilityLabel="Scan my space with a photo"
        accessibilityHint="Takes a photo and reads what equipment and room you have"
      >
        <View style={styles.scanIcon}>
          <Camera size={20} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.scanText}>
          <Text style={styles.scanTitle}>Scan my space</Text>
          <Text style={styles.scanBody}>
            Take a photo of the room or your kit, and Steady Move works out what you can use.
          </Text>
        </View>
      </Card>

      {/* ——— What you want from it ——— */}
      <SectionHeader title="What do you want from it?" subtitle="Optional" />
      <View style={styles.intents}>
        {INTENTS.map(intent => {
          const selected = intent.id === intentId;
          return (
            <Pressable
              key={intent.id}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              accessibilityLabel={intent.label}
              onPress={() => {
                tapSelection();
                setIntentId(selected ? null : intent.id);
              }}
              style={[styles.intent, selected && styles.intentSelected]}
            >
              <Text style={[styles.intentLabel, selected && styles.intentLabelSelected]}>
                {intent.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ——— Places ——— */}
      <SectionHeader title="Or pick where you are" />
      <View style={styles.list}>
        {PLACES.map(place => (
          <Card
            key={place.id}
            style={styles.row}
            onPress={() => open(place)}
            accessibilityLabel={place.title}
            accessibilityHint={place.description}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{place.title}</Text>
              <Text style={styles.rowBody}>{place.description}</Text>
            </View>
            <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
          </Card>
        ))}
      </View>

      <Text style={styles.footnote}>
        Whatever you pick, how you said you are feeling today still decides the intensity.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    minHeight: MIN_TAP
  },
  headerButton: {width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {...type.eyebrow, color: colors.inkFaint},

  title: {...type.display, color: colors.ink, marginTop: spacing.lg},
  sub: {...type.body, color: colors.inkSoft, marginTop: spacing.sm},

  scanCard: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xxl},
  scanIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanText: {flex: 1, gap: 2},
  scanTitle: {...type.subheading, color: colors.onPrimary},
  scanBody: {...type.caption, color: colors.primarySoft, fontWeight: '400'},

  intents: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  intent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: MIN_TAP,
    justifyContent: 'center'
  },
  intentSelected: {borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2},
  intentLabel: {...type.caption, color: colors.ink, fontWeight: '600'},
  intentLabelSelected: {color: colors.primary},

  list: {gap: spacing.md},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 72},
  rowText: {flex: 1, gap: 2},
  rowTitle: {...type.bodyStrong, color: colors.ink},
  rowBody: {...type.caption, color: colors.inkSoft, fontWeight: '400'},

  footnote: {
    ...type.caption,
    color: colors.inkFaint,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg
  }
});
