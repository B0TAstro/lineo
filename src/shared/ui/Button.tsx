import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { borderWidth, colors, fonts, radius, touch, type } from './theme';

type Variant = 'primary' | 'secondary' | 'var' | 'ghost';

/** A full button, 64 pt high: readable with a sweaty thumb */
export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const onAccent = variant === 'primary' || variant === 'var';
  const color = onAccent ? colors.onAccent : colors.text;
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
      <View style={styles.content}>
        {icon && <Icon name={icon} color={color} />}
        <Text style={[styles.label, variant === 'var' && styles.labelVar, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch,
    borderRadius: radius,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { borderWidth, borderColor: colors.borderStrong },
  var: { backgroundColor: colors.accent },
  ghost: { backgroundColor: colors.card, borderWidth, borderColor: colors.borderFaint },
  dim: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...type.button, textAlign: 'center' },
  labelVar: { fontFamily: fonts.semibold },
});
