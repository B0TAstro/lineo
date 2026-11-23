import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from './Icon';
import { colors, radius } from './theme';

/** A small square button for a setting, out of the way of the match buttons */
export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tool: {
    width: 48,
    height: 48,
    borderRadius: radius,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.5 },
});
