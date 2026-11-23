import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from './Icon';
import { colors } from './theme';

/**
 * A round icon button: `tool` in the match screen's rail, `plain` for back and close at the top of
 * a screen, `overlay` over the camera image
 */
export function IconButton({
  icon,
  label,
  variant = 'tool',
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  variant?: 'tool' | 'plain' | 'overlay';
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled ?? false }}
      hitSlop={8}
      style={({ pressed }) => [styles.base, styles[variant], (pressed || disabled) && styles.dim]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  tool: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: colors.card,
  },
  plain: { width: 44, height: 44 },
  overlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(10,10,10,0.7)',
  },
  dim: { opacity: 0.4 },
});
