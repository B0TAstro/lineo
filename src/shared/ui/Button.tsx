import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius, touch } from './theme';

type Variant = 'primary' | 'outline' | 'var' | 'soft';

/** Large match button: 64 pt minimum, readable with a sweaty thumb */
export function Button({
  label,
  detail,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const onAccent = variant === 'primary' || variant === 'var';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || disabled) && styles.dim,
        style,
      ]}
    >
      <Text style={[styles.label, onAccent && styles.labelOnAccent]}>{label}</Text>
      {detail != null && (
        <Text style={[styles.detail, onAccent && styles.labelOnAccent]}>{detail}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch + 16,
    borderRadius: radius,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  primary: { backgroundColor: colors.accent },
  outline: { borderWidth: 2, borderColor: colors.text },
  var: { backgroundColor: colors.accent },
  soft: { backgroundColor: colors.card },
  dim: { opacity: 0.4 },
  label: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  labelOnAccent: { color: colors.onAccent },
  detail: { color: colors.textSoft, fontSize: 16, textAlign: 'center' },
});
