import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/shared/ui/Icon';
import { colors, fonts } from '@/shared/ui/theme';

/** One choice; `disabled`: shown, not yet available */
export type SelectOption<T> = { value: T; label: string; disabled?: boolean };

/**
 * A line of a settings card that opens in place on its choices: the current one checked, the ones
 * not available yet dimmed with « Bientôt ». Picking one closes it
 */
export function SelectRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
  last,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  last?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <View style={!last && styles.line}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{current?.label}</Text>
        <View style={open && styles.chevronOpen}>
          <Icon name="chevronRight" />
        </View>
      </Pressable>
      {open && (
        <View style={styles.options}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                disabled={option.disabled}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: option.disabled ?? false }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    selected && styles.optionSelected,
                    option.disabled && styles.optionDisabled,
                  ]}
                >
                  {option.label}
                </Text>
                {option.disabled ? (
                  <Text style={styles.soon}>Bientôt</Text>
                ) : (
                  selected && <Icon name="check" size={20} color={colors.accent} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  label: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  value: { fontFamily: fonts.light, fontSize: 16, color: colors.textDim },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  options: { paddingBottom: 8 },
  option: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
  },
  optionLabel: { fontFamily: fonts.light, fontSize: 16, color: colors.textSoft },
  optionSelected: { fontFamily: fonts.regular, color: colors.text },
  optionDisabled: { opacity: 0.4 },
  soon: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim },
});
