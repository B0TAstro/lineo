import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/shared/ui/Button';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { Logo } from '@/shared/ui/Logo';
import { colors, fonts, radiusCard, space, type } from '@/shared/ui/theme';

/** How the app is used, in three steps: the last one, VAR, is the accent */
const TIPS: { icon: IconName; title: string; text: string; accent?: boolean }[] = [
  { icon: 'camera', title: 'Posez votre téléphone', text: 'Un à chaque fond de court.' },
  {
    icon: 'mic',
    title: 'Jouez normalement, l’app suit',
    text: 'Annoncez le score comme d’habitude, il se met à jour tout seul.',
  },
  {
    icon: 'rewind',
    title: 'Un doute ? Appuyez sur la VAR',
    text: 'Revoyez le point au ralenti et décidez ensemble.',
    accent: true,
  },
];

/** The first screen: create a session, or join one with its QR code */
export function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <IconButton
          icon="settings"
          label="Paramètres"
          variant="plain"
          onPress={() => router.push('/settings')}
        />
      </View>
      <View style={styles.header} accessibilityRole="header" accessibilityLabel="Lineo">
        <Logo height={110} />
        <Text style={styles.tagline}>la ligne a toujours raison.</Text>
      </View>

      <View style={styles.spaceAbove} />
      <View style={styles.card}>
        {TIPS.map((tip, i) => (
          <View key={tip.icon} style={[styles.tip, i < TIPS.length - 1 && styles.tipLine]}>
            <View style={[styles.tipIcon, tip.accent && styles.tipIconAccent]}>
              <Icon name={tip.icon} color={tip.accent ? colors.onAccent : colors.text} />
            </View>
            <View style={styles.tipText}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.spaceBelow} />

      <View style={styles.actions}>
        <Button label="Créer une session" onPress={() => router.push('/create')} />
        <Button
          label="Rejoindre une session"
          variant="secondary"
          onPress={() => router.push('/join')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.l },
  top: { flexDirection: 'row', justifyContent: 'flex-end', marginRight: -10 },
  header: { alignItems: 'center', marginTop: space.s },
  tagline: { ...type.body, fontSize: 17, color: colors.accent },
  // Figma keeps more air above the card than below it
  spaceAbove: { flex: 2.3 },
  spaceBelow: { flex: 1 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radiusCard,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  tipLine: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIconAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  tipText: { flex: 1, gap: 2 },
  tipTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.text },
  tipBody: { fontFamily: fonts.light, fontSize: 14, lineHeight: 20, color: colors.textSoft },
  actions: { gap: 12, marginBottom: space.l },
});
