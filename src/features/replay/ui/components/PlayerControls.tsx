import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/shared/ui/Icon';
import { colors } from '@/shared/ui/theme';

/** Over the middle of the video: one frame back, the previous sound, play, the next sound, one frame on */
export function PlayerControls({
  playing,
  hasPeaks,
  onTogglePlay,
  onStepFrame,
  onJumpToPeak,
}: {
  playing: boolean;
  hasPeaks: boolean;
  onTogglePlay: () => void;
  onStepFrame: (direction: 1 | -1) => void;
  onJumpToPeak: (direction: 1 | -1) => void;
}) {
  return (
    <View style={styles.row} pointerEvents="box-none">
      <Round icon="frameBack" label="Image précédente" onPress={() => onStepFrame(-1)} />
      <Round
        icon="rewind"
        label="Son précédent"
        disabled={!hasPeaks}
        onPress={() => onJumpToPeak(-1)}
      />
      <Pressable
        onPress={onTogglePlay}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause' : 'Lecture'}
        style={({ pressed }) => [styles.play, pressed && styles.pressed]}
      >
        <Icon name={playing ? 'pause' : 'play'} size={34} color={colors.onAccent} />
      </Pressable>
      <Round
        icon="forward"
        label="Son suivant"
        disabled={!hasPeaks}
        onPress={() => onJumpToPeak(1)}
      />
      <Round icon="frameNext" label="Image suivante" onPress={() => onStepFrame(1)} />
    </View>
  );
}

function Round({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.round, (pressed || disabled) && styles.pressed]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10,10,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.4 },
});
