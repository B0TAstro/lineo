import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/ui/Button';
import { colors, fonts } from '@/shared/ui/theme';

/** A proposed point, waiting for the other side to confirm it: it takes the place of Quitter and Pause */
export function PendingBanner({
  winnerName,
  onConfirm,
  onReject,
}: {
  winnerName: string;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          Point pour {winnerName} ?
        </Text>
        <Text style={styles.detail}>L’autre camp valide.</Text>
      </View>
      <Button label="Refuser" variant="ghost" onPress={onReject} style={styles.button} />
      <Button label="Valider" variant="secondary" onPress={onConfirm} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1 },
  title: { fontFamily: fonts.medium, fontSize: 18, color: colors.text },
  detail: { fontFamily: fonts.light, fontSize: 14, color: colors.textDim },
  button: { minHeight: 60, width: 130 },
});
