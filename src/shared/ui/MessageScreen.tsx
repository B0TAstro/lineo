import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

/** A full screen that says one thing: waiting, a permission to grant, a missing camera */
export function MessageScreen({
  message,
  hint,
  children,
}: {
  message: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{message}</Text>
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
    backgroundColor: colors.bg,
  },
  message: { color: colors.text, fontSize: 22, textAlign: 'center' },
  hint: { color: colors.textSoft, fontSize: 18, textAlign: 'center' },
});
