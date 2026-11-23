import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from './theme';

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
    padding: space.l,
    gap: space.l,
    backgroundColor: colors.bg,
  },
  message: { ...type.title, fontSize: 28, color: colors.text, textAlign: 'center' },
  hint: { ...type.body, fontSize: 17, color: colors.textDim, textAlign: 'center' },
});
