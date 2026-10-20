import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {AlertCircle, Camera, ChevronLeft, ImageIcon, Sparkles} from 'lucide-react-native';
import {Button, Card, ChoiceChip, ScreenContainer, SectionHeader, SegmentedChoice} from '../../src/components';
import {MIN_TAP, colors, radius, spacing, type} from '../../src/theme';
import {EquipmentId, SpaceConstraints, SpaceNeed, TimeBudget} from '../../src/types';
import {PLACES, getPlace} from '../../src/data/places';
import {useProfileStore} from '../../src/store/useProfileStore';
import {useTodayStore} from '../../src/store/useTodayStore';
import {useHistoryStore} from '../../src/store/useHistoryStore';
import {buildPlaceSession} from '../../src/lib/places';
import {ImageMediaType, SpaceScan, scanSpacePhoto} from '../../src/lib/vision';
import {tapComplete, tapSelection} from '../../src/lib/haptics';

const EQUIPMENT: {value: EquipmentId; label: string}[] = [
  {value: 'bodyweight', label: 'Bodyweight only'},
  {value: 'dumbbells', label: 'Dumbbells'},
  {value: 'kettlebells', label: 'Kettlebells'},
  {value: 'bands', label: 'Resistance bands'},
  {value: 'pullup-bar', label: 'Pull-up bar'},
  {value: 'full-gym', label: 'Full gym'},
  {value: 'outdoors', label: 'Outdoors'}
];

const SPACES: {value: SpaceNeed; label: string; detail: string}[] = [
  {value: 'seated', label: 'Barely any', detail: 'A seat'},
  {value: 'standing', label: 'Some', detail: 'Room to stand'},
  {value: 'floor', label: 'Plenty', detail: 'Room to lie down'}
];

const TIMES: {value: TimeBudget; label: string}[] = [
  {value: 10, label: '10 min'},
  {value: 20, label: '20 min'},
  {value: 40, label: '40 min'}
];

export default function ScanSpace() {
  const router = useRouter();

  const profile = useProfileStore(state => state.profile);
  const apiKey = useProfileStore(state => state.apiKey);
  const checkIn = useTodayStore(state => state.checkIn);
  const setSession = useTodayStore(state => state.setSession);
  const logs = useHistoryStore(state => state.logs);

  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  // What will actually be used. Pre-filled by the photo, always editable: the
  // person has the last word on what is in the room, not the model.
  const [equipment, setEquipment] = useState<EquipmentId[]>(['bodyweight']);
  const [space, setSpace] = useState<SpaceNeed>('standing');
  const [discreet, setDiscreet] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [minutes, setMinutes] = useState<TimeBudget>(20);
  const [confirmed, setConfirmed] = useState(false);

  const applyScan = useCallback((scan: SpaceScan) => {
    setEquipment(scan.equipment);
    setSpace(scan.constraints.space);
    setDiscreet(scan.constraints.discreet);
    setQuiet(scan.constraints.quiet);
    setSummary(scan.summary || null);
    setConfirmed(true);
  }, []);

  const pick = useCallback(
    async (source: 'camera' | 'library') => {
      setProblem(null);
      setSummary(null);

      try {
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            setProblem('Camera access was not granted. You can choose a photo instead.');
            return;
          }
        }

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({quality: 0.4, base64: true})
            : await ImagePicker.launchImageLibraryAsync({quality: 0.4, base64: true});

        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        setPreview(asset.uri);

        if (!apiKey) {
          // No key: the photo is only a reminder of the room. The person fills
          // the rest in themselves, which still beats starting from nothing.
          setConfirmed(true);
          setProblem(
            'Photo analysis is off, so nothing was read from this image. Set what you have below, or add a key in Settings.'
          );
          return;
        }

        if (!asset.base64) {
          setConfirmed(true);
          setProblem('That image could not be read. Set what you have below.');
          return;
        }

        setReading(true);
        const mediaType: ImageMediaType =
          asset.mimeType === 'image/png'
            ? 'image/png'
            : asset.mimeType === 'image/webp'
              ? 'image/webp'
              : 'image/jpeg';

        const outcome = await scanSpacePhoto({base64: asset.base64, mediaType, apiKey});
        setReading(false);

        if (outcome.ok) {
          tapComplete();
          applyScan(outcome.scan);
        } else {
          setConfirmed(true);
          setProblem(`${outcome.message} Set what you have below instead.`);
        }
      } catch {
        setReading(false);
        setConfirmed(true);
        setProblem('That did not work. Set what you have below instead.');
      }
    },
    [apiKey, applyScan]
  );

  const toggleEquipment = useCallback((value: EquipmentId) => {
    tapSelection();
    setEquipment(current => {
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return next.length ? next : ['bodyweight'];
    });
  }, []);

  const build = useCallback(async () => {
    if (!profile) return;
    const constraints: SpaceConstraints = {space, discreet, quiet};

    // The nearest named place supplies the wording and the type rotation; the
    // confirmed constraints above are what actually filter the movements.
    const nearest =
      PLACES.find(
        candidate =>
          candidate.constraints.space === space && candidate.constraints.discreet === discreet
      ) ??
      getPlace('home') ??
      PLACES[0];

    const session = buildPlaceSession({
      place: {...nearest, note: summary ? `From your photo: ${summary}` : nearest.note},
      profile,
      history: logs,
      checkIn,
      minutes,
      equipment,
      constraints
    });

    await setSession(session);
    router.replace('/workout/preview');
  }, [checkIn, discreet, equipment, logs, minutes, profile, quiet, router, setSession, space, summary]);

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
        <Text style={styles.headerTitle}>SCAN YOUR SPACE</Text>
        <View style={styles.headerButton} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        What have you got?
      </Text>
      <Text style={styles.sub}>
        Take a photo of the room or your kit. Steady Move reads what equipment is visible and how
        much room there is, then builds from its own movement library — it never invents an
        exercise from a picture.
      </Text>

      {preview ? (
        <Image
          source={{uri: preview}}
          style={styles.preview}
          accessibilityLabel="The photo of your space"
        />
      ) : null}

      <View style={styles.actions}>
        {Platform.OS !== 'web' ? (
          <Button
            label={preview ? 'Take another photo' : 'Take a photo'}
            onPress={() => pick('camera')}
            icon={<Camera size={18} color={colors.onPrimary} strokeWidth={2} />}
            disabled={reading}
          />
        ) : null}
        <Button
          label="Choose a photo"
          variant="secondary"
          onPress={() => pick('library')}
          icon={<ImageIcon size={16} color={colors.ink} strokeWidth={2} />}
          disabled={reading}
        />
      </View>

      {reading ? (
        <Card tone="sage" style={styles.reading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.readingText}>Reading your space…</Text>
        </Card>
      ) : null}

      {summary ? (
        <Card tone="sage" style={styles.summary}>
          <View style={styles.summaryHead}>
            <Sparkles size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.summaryTitle}>What the photo showed</Text>
          </View>
          <Text style={styles.summaryBody}>{summary}</Text>
          <Text style={styles.summaryNote}>
            Change anything below that is wrong — your answer is what gets used.
          </Text>
        </Card>
      ) : null}

      {problem ? (
        <Card tone="caution" style={styles.summary}>
          <View style={styles.summaryHead}>
            <AlertCircle size={16} color={colors.caution} strokeWidth={2} />
            <Text style={[styles.summaryTitle, {color: colors.caution}]}>Nothing was read</Text>
          </View>
          <Text style={styles.summaryBody}>{problem}</Text>
        </Card>
      ) : null}

      {confirmed ? (
        <>
          <SectionHeader title="What you have" subtitle="Tap to correct anything" />
          <View style={styles.list}>
            {EQUIPMENT.map(item => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                multiSelect
                selected={equipment.includes(item.value)}
                onPress={() => toggleEquipment(item.value)}
              />
            ))}
          </View>

          <SectionHeader title="How much room" />
          <SegmentedChoice label="How much room" options={SPACES} value={space} onChange={setSpace} />

          <SectionHeader title="Anything to work around?" />
          <View style={styles.list}>
            <ChoiceChip
              label="People are around"
              detail="Keep movements unremarkable"
              multiSelect
              selected={discreet}
              onPress={() => {
                tapSelection();
                setDiscreet(value => !value);
              }}
            />
            <ChoiceChip
              label="Keep it quiet"
              detail="Nothing that thuds on the floor"
              multiSelect
              selected={quiet}
              onPress={() => {
                tapSelection();
                setQuiet(value => !value);
              }}
            />
          </View>

          <SectionHeader title="How long" />
          <SegmentedChoice label="How long" options={TIMES} value={minutes} onChange={setMinutes} />

          <View style={styles.build}>
            <Button label="Build my session" onPress={build} silent />
          </View>
        </>
      ) : (
        <Card tone="muted" style={styles.hint}>
          <Text style={styles.hintText}>
            {apiKey
              ? 'Your photo is sent to Claude with your own API key, read once, and not stored by Steady Move.'
              : 'Photo analysis needs a Claude API key, which you can add in Settings. Without one you can still take a photo and set what you have by hand.'}
          </Text>
        </Card>
      )}
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

  title: {...type.title, color: colors.ink, marginTop: spacing.lg},
  sub: {...type.small, color: colors.inkSoft, marginTop: spacing.sm},

  preview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceMuted
  },

  actions: {gap: spacing.md, marginTop: spacing.xl},

  reading: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg},
  readingText: {...type.body, color: colors.primary},

  summary: {gap: spacing.sm, marginTop: spacing.lg},
  summaryHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  summaryTitle: {...type.bodyStrong, color: colors.primary},
  summaryBody: {...type.small, color: colors.ink},
  summaryNote: {...type.caption, color: colors.inkSoft, fontWeight: '400'},

  list: {gap: spacing.md},
  build: {marginTop: spacing.xxxl},

  hint: {marginTop: spacing.xl},
  hintText: {...type.caption, color: colors.inkSoft, fontWeight: '400'}
});
