import { Pressable, StyleSheet, Text } from 'react-native';

import { borderWidth, colors, fonts, radius } from './theme';

/** One choice among a few (simple or double, who serves first): the selected one is plain white */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.on, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    height: 56,
    paddingHorizontal: 24,
    borderRadius: radius,
    borderWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.text, borderColor: colors.text },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.regular, fontSize: 18, color: colors.text },
  labelOn: { fontFamily: fonts.medium, color: colors.onAccent },
});
