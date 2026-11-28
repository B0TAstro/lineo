import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/shared/ui/IconButton';
import { ScreenTitle } from '@/shared/ui/ScreenTitle';
import { colors, fonts, radius, space, type } from '@/shared/ui/theme';
import { Toggle } from '@/shared/ui/Toggle';

import { SelectRow } from './SelectRow';
import { FPS_CHOICES, REPLAY_START_CHOICES, SAVED_POINTS_CHOICES } from '../logic/settings';
import { appSettings, useSettings } from '../useSettings';

const REPLAY_START_LABELS = { start: 'Au début du point', end: 'Sur la fin du point' } as const;

/** UI only: the videos always go at the end of the match, the other choices are not built yet */
const VIDEO_DELETION = [
  { value: 'always', label: 'Toujours' },
  { value: 'never', label: 'Non', disabled: true },
  { value: 'exceptReviewed', label: 'Sauf les points revus', disabled: true },
] as const;

/**
 * Opened from the home screen, or over a match: the settings apply from the next match (the
 * camera and the buffer keep theirs for the whole match)
 */
export function SettingsScreen({
  duringMatch,
  onClose,
}: {
  /** Opened over a match: says the changes wait for the next one */
  duringMatch?: boolean;
  /** Closes the overlay; on its own route, the screen goes back */
  onClose?: () => void;
} = {}) {
  const settings = useSettings();
  const update = (changes: Parameters<typeof appSettings.update>[0]) => appSettings.update(changes);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <IconButton
          icon="close"
          label="Fermer"
          variant="plain"
          onPress={onClose ?? (() => router.back())}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle section="Lineo" title="Paramètres" />
        {duringMatch && (
          <Text style={styles.note}>
            S’applique au prochain match : celui-ci garde ses réglages.
          </Text>
        )}

        <Group label="Enregistrement">
          <SelectRow
            label="Images par seconde"
            value={settings.fps}
            options={FPS_CHOICES.map((fps) => ({ value: fps, label: `${fps} i/s` }))}
            onChange={(fps) => update({ fps })}
          />
          <SelectRow
            label="Points gardés en mémoire"
            value={settings.savedPoints}
            options={SAVED_POINTS_CHOICES.map((n) => ({
              value: n,
              label: `${n} point${n > 1 ? 's' : ''}`,
            }))}
            onChange={(savedPoints) => update({ savedPoints })}
            last
          />
        </Group>

        <Group label="Pendant le match">
          <Row label="Score à la voix">
            <Toggle
              value={settings.voice}
              label="Score à la voix"
              onChange={(voice) => update({ voice })}
            />
          </Row>
          <Row label="Lecture assistée du replay">
            <Toggle
              value={settings.assistedReading}
              label="Lecture assistée du replay"
              onChange={(assistedReading) => update({ assistedReading })}
            />
          </Row>
          <SelectRow
            label="Le replay s’ouvre"
            value={settings.replayStart}
            options={REPLAY_START_CHOICES.map((start) => ({
              value: start,
              label: REPLAY_START_LABELS[start],
            }))}
            onChange={(replayStart) => update({ replayStart })}
            last
          />
        </Group>

        <Group label="Vos données">
          <SelectRow
            label="Vidéos supprimées en fin de match"
            value="always"
            options={VIDEO_DELETION}
            onChange={() => {}}
            last
          />
        </Group>

        <Text style={styles.note}>
          Tout est filmé et traité sur ce téléphone. Aucune vidéo n’est envoyée sur un serveur.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {/* UI only: the terms and the privacy policy are not written yet */}
        <View style={styles.links}>
          <Text style={styles.link}>Conditions d’utilisation</Text>
          <Text style={styles.linkDot}>·</Text>
          <Text style={styles.link}>Confidentialité</Text>
        </View>
        <Text style={styles.version}>Lineo v{Constants.expoConfig?.version ?? '—'}</Text>
      </View>
    </SafeAreaView>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** A line of a card: a label, then its control */
function Row({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', paddingHorizontal: 12 },
  content: {
    paddingHorizontal: space.l,
    paddingTop: space.l,
    paddingBottom: space.l,
    gap: space.l,
  },
  group: { gap: 12 },
  groupLabel: { ...type.section, color: colors.textDim },
  card: {
    paddingHorizontal: space.m,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
  },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  note: { fontFamily: fonts.light, fontSize: 14, lineHeight: 21, color: colors.textSoft },
  footer: { alignItems: 'center', gap: space.s, paddingBottom: space.m },
  links: { flexDirection: 'row', gap: 10 },
  link: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSoft,
    textDecorationLine: 'underline',
  },
  linkDot: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  version: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
});
