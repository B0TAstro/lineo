import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { ScreenTitle } from '@/shared/ui/ScreenTitle';
import { colors, fonts, radius, space, type } from '@/shared/ui/theme';
import { Toggle } from '@/shared/ui/Toggle';

import { FPS_CHOICES, SAVED_POINTS_CHOICES } from '../logic/settings';
import { appSettings, useSettings } from '../useSettings';

/** Opened from the home screen: the settings apply from the next match */
export function SettingsScreen() {
  const settings = useSettings();
  const update = (changes: Parameters<typeof appSettings.update>[0]) => appSettings.update(changes);

  const pick = <T extends number>(
    title: string,
    choices: readonly T[],
    label: (value: T) => string,
    onPick: (value: T) => void,
  ) =>
    Alert.alert(title, undefined, [
      ...choices.map((value) => ({ text: label(value), onPress: () => onPick(value) })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="close" label="Fermer" variant="plain" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle section="Lineo" title="Paramètres" />

        <Group label="Enregistrement">
          <Row
            label="Images par seconde"
            value={`${settings.fps} i/s`}
            onPress={() =>
              pick(
                'Images par seconde',
                FPS_CHOICES,
                (fps) => `${fps} i/s`,
                (fps) => update({ fps }),
              )
            }
          />
          <Row
            label="Points gardés en mémoire"
            value={String(settings.savedPoints)}
            onPress={() =>
              pick(
                'Points gardés en mémoire',
                SAVED_POINTS_CHOICES,
                (n) => `${n} point${n > 1 ? 's' : ''}`,
                (savedPoints) => update({ savedPoints }),
              )
            }
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
          <Row label="Lecture assistée du replay" last>
            <Toggle
              value={settings.assistedReading}
              label="Lecture assistée du replay"
              onChange={(assistedReading) => update({ assistedReading })}
            />
          </Row>
        </Group>

        <Group label="Vos données">
          <Row label="Vidéos supprimées en fin de match" value="Toujours" last />
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
        <Text style={styles.version}>Lineo · v{Constants.expoConfig?.version ?? '—'}</Text>
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

/** A line of a card: a label, then a value with its chevron (tap to change) or a control */
function Row({
  label,
  value,
  onPress,
  last,
  children,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && <Icon name="chevronRight" />}
      {children}
    </Pressable>
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
  pressed: { opacity: 0.6 },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  rowValue: { fontFamily: fonts.light, fontSize: 16, color: colors.textDim },
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
