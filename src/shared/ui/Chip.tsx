import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { borderWidth, colors, fonts, radius } from './theme';

/** One choice among a few (simple or double, who serves first): the selected one is plain white */
export function Chip({
  label,
  selected,
  compact,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  /** Three chips in a row: smaller text */
  compact?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.on,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[styles.label, compact && styles.labelCompact, selected && styles.labelOn]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    height: 56,
    paddingHorizontal: 8,
    borderRadius: radius,
    borderWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.text, borderColor: colors.text },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.regular, fontSize: 18, color: colors.text },
  labelCompact: { fontSize: 16 },
  labelOn: { fontFamily: fonts.medium, color: colors.onAccent },
});
