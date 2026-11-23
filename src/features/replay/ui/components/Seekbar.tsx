import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';

import { colors } from '@/shared/ui/theme';

const THUMB = 18;
const PEAK = 11;

/**
 * The point's timeline: tap or drag to move in it. Every loud sound (a hit, a bounce, a shout) is a
 * lemon diamond: a mark, never a verdict
 */
export function Seekbar({
  timeS,
  totalS,
  peaks,
  onSeek,
}: {
  timeS: number;
  totalS: number;
  peaks: readonly number[];
  /** While dragging too: the video follows the finger, paused */
  onSeek: (t: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const progress = totalS > 0 ? Math.min(1, Math.max(0, timeS / totalS)) : 0;
  const seekAt = (x: number) => onSeek(Math.min(1, Math.max(0, x / width)) * totalS);

  const tap = useTapGesture({ runOnJS: true, onActivate: (e) => seekAt(e.x) });
  const pan = usePanGesture({
    runOnJS: true,
    onActivate: (e) => seekAt(e.x),
    onUpdate: (e) => seekAt(e.x),
  });
  const gesture = useSimultaneousGestures(tap, pan);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.hitArea}
        onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
        accessibilityRole="adjustable"
        accessibilityLabel="Position dans le point"
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: progress * width }]} />
        </View>
        {totalS > 0 &&
          peaks.map((t) => (
            <View
              key={t}
              pointerEvents="none"
              style={[styles.peak, { left: (t / totalS) * width - PEAK / 2 }]}
            />
          ))}
        <View pointerEvents="none" style={[styles.thumb, { left: progress * width - THUMB / 2 }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hitArea: { flex: 1, height: 32, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.text },
  peak: {
    position: 'absolute',
    top: (32 - PEAK) / 2,
    width: PEAK,
    height: PEAK,
    backgroundColor: colors.accent,
    transform: [{ rotate: '45deg' }],
  },
  thumb: {
    position: 'absolute',
    top: (32 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.text,
  },
});
