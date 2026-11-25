import { Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, colors } from './theme';

/** On / off (Figma Toggle): lemon with a black knob on the right when on */
export function Toggle({
  value,
  label,
  onChange,
}: {
  value: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={[styles.track, value ? styles.trackOn : styles.trackOff]}
    >
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  trackOn: { backgroundColor: colors.accent, alignItems: 'flex-end' },
  trackOff: {
    backgroundColor: colors.card,
    borderWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'flex-start',
    paddingHorizontal: 2.5,
  },
  knob: { width: 24, height: 24, borderRadius: 12 },
  knobOn: { backgroundColor: colors.bg },
  knobOff: { backgroundColor: colors.textSoft },
});
