import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from './theme';

/** A screen's title, with its section in lemon above it ("Nouvelle session · 1/3", "Session") */
export function ScreenTitle({ section, title }: { section: string; title: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.section}>{section}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  section: { ...type.section, color: colors.accent },
  title: { ...type.title, color: colors.text },
});
