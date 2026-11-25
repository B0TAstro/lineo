import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { colors, fonts } from '@/shared/ui/theme';

/** Which point is shown, and the arrows to the previous and next kept points */
export type PointNav = {
  section: string;
  title: string;
  onPrevious: (() => void) | undefined;
  onNext: (() => void) | undefined;
};

/** Over the top of the video: back to the score, the point and its arrows, the decision panel */
export function PlayerTopBar({
  point,
  onBack,
  onOpenPanel,
  devVideos,
}: {
  point: PointNav;
  onBack: () => void;
  /** Only when the panel is closed: it has its own button to close */
  onOpenPanel: (() => void) | undefined;
  /** Dev builds only: plays the test videos instead of the match's points */
  devVideos: { on: boolean; onToggle: () => void } | undefined;
}) {
  return (
    <View style={styles.bar} pointerEvents="box-none">
      <IconButton icon="back" label="Retour au score" variant="overlay" onPress={onBack} />
      <View style={styles.point}>
        <Arrow icon="chevronLeft" label="Point précédent" onPress={point.onPrevious} />
        <View style={styles.pointText}>
          <Text style={styles.section} numberOfLines={1}>
            {point.section}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {point.title}
          </Text>
        </View>
        <Arrow icon="chevronRight" label="Point suivant" onPress={point.onNext} />
      </View>
      <View style={styles.end}>
        {devVideos && (
          <IconButton
            icon="bot"
            label={devVideos.on ? 'Revenir aux points du match' : 'Vidéos test'}
            variant="overlay"
            selected={devVideos.on}
            onPress={devVideos.onToggle}
          />
        )}
        {onOpenPanel && (
          <IconButton
            icon="panelOpen"
            label="Ouvrir la décision"
            variant="overlay"
            onPress={onOpenPanel}
          />
        )}
      </View>
    </View>
  );
}

function Arrow({
  icon,
  label,
  onPress,
}: {
  icon: 'chevronLeft' | 'chevronRight';
  label: string;
  onPress: (() => void) | undefined;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={!onPress && styles.dim}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  pointText: { alignItems: 'center', flexShrink: 1 },
  section: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.32,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  title: { fontFamily: fonts.regular, fontSize: 18, color: colors.text },
  end: { minWidth: 44, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  dim: { opacity: 0.3 },
});
