import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BallTrackState } from '@/features/ball-tracking';
import { colors } from '@/shared/ui/theme';

import { ControlButton } from './ControlButton';

export const RATES = [0.25, 0.5, 1] as const;

/**
 * The controls of the replay, beside the video in landscape and under it in portrait: back and the
 * point picker, time and the bar with the sound peaks, play and frame by frame, speed, the sound and
 * ball tools, and the players' decision at the bottom
 */
export function PlaybackPanel({
  portrait,
  header,
  timeS,
  totalS,
  rate,
  onRate,
  playing,
  onTogglePlay,
  onStepFrame,
  peaks,
  onJumpToPeak,
  onSeek,
  ball,
  onTrackBall,
  footer,
}: {
  timeS: number;
  totalS: number;
  rate: number;
  onRate: (rate: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onStepFrame: (direction: 1 | -1) => void;
  peaks: readonly number[];
  onJumpToPeak: (direction: 1 | -1) => void;
  onSeek: (t: number) => void;
  ball: BallTrackState;
  onTrackBall: () => void;
  footer: ReactNode;
  portrait: boolean;
  header: ReactNode;
}) {
  const [barWidth, setBarWidth] = useState(1);
  const progress = totalS > 0 ? timeS / totalS : 0;

  return (
    <SafeAreaView
      style={portrait ? styles.panelPortrait : styles.panel}
      edges={portrait ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'right']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <Text style={styles.time}>
          {(timeS - totalS).toFixed(2)} s · x{rate}
        </Text>
        <Pressable
          style={styles.track}
          onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
          onPress={(e) => onSeek((e.nativeEvent.locationX / barWidth) * totalS)}
        >
          <View style={[styles.trackFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          {peaks.map((t) => (
            <View
              key={t}
              pointerEvents="none"
              style={[styles.peak, { left: `${(t / totalS) * 100}%` }]}
            />
          ))}
        </Pressable>

        <View style={styles.row}>
          <ControlButton label="◀◀" onPress={() => onStepFrame(-1)} />
          <ControlButton label={playing ? '❚❚' : '▶'} onPress={onTogglePlay} />
          <ControlButton label="▶▶" onPress={() => onStepFrame(1)} />
        </View>
        <View style={styles.row}>
          {RATES.map((r) => (
            <ControlButton
              key={r}
              label={`x${r}`}
              selected={rate === r}
              onPress={() => onRate(r)}
            />
          ))}
        </View>

        {/* Tools: the loud sounds (hits, bounces) and the ball */}
        <View style={styles.row}>
          {peaks.length > 0 && <ControlButton label="◀ Son" onPress={() => onJumpToPeak(-1)} />}
          <ControlButton label="Tracking" selected={ball.on} onPress={onTrackBall} />
          {peaks.length > 0 && <ControlButton label="Son ▶" onPress={() => onJumpToPeak(1)} />}
        </View>
        {ballLine(ball) !== undefined && <Text style={styles.ballLine}>{ballLine(ball)}</Text>}
        {footer}
      </ScrollView>
    </SafeAreaView>
  );
}

/** What the tracking has seen so far, in plain words: never more than it saw. */
function ballLine(ball: BallTrackState): string | undefined {
  if (ball.error) return 'Tracking impossible sur ce clip.';
  if (!ball.on || ball.frames === 0) return undefined;
  return `Balle vue sur ${ball.seen} / ${ball.frames} images.`;
}

const styles = StyleSheet.create({
  panel: { width: 340, backgroundColor: colors.bg },
  panelPortrait: { maxHeight: '50%', backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  time: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 32,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: colors.accent },
  /** A sound peak: a mark, not a verdict. */
  peak: { position: 'absolute', top: 6, bottom: 6, width: 2, backgroundColor: colors.text },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  ballLine: { color: colors.textSoft, fontSize: 14, textAlign: 'center' },
});
