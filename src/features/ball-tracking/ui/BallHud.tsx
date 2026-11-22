import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/shared/ui/theme';

import type { BallPoint } from '../logic/ballPoint';

/** A point closer than this to the time on screen is the ball "now". */
const NOW_TOLERANCE_S = 0.02;

/**
 * The POC's figures for the frame on screen: state, frames without a detection, position, radius,
 * velocity and acceleration, in pixels of the analysed frame.
 */
export function BallHud({
  points,
  timeS,
  frame,
  frames,
  seen,
  extra,
}: {
  points: readonly BallPoint[];
  timeS: number;
  frame: { width: number; height: number };
  frames: number;
  seen: number;
  /** A first line of its own (fps, time per frame). */
  extra?: string;
}) {
  const now = points.findLast((p) => p.t <= timeS + NOW_TOLERANCE_S);
  const ball = now && timeS - now.t <= NOW_TOLERANCE_S ? now : undefined;
  const px = (fraction: number, side: 'width' | 'height') => (fraction * frame[side]).toFixed(1);
  const rate = frames > 0 ? Math.round((seen / frames) * 100) : 0;

  const lines = [
    `${extra ? `${extra}   ` : ''}${frame.width}×${frame.height} px   balle vue ${rate} %`,
    ball
      ? `ÉTAT ${ball.state === 'detected' ? 'DÉTECTÉE' : 'PRÉDITE'}   images sans détection ${ball.missed}`
      : 'ÉTAT PERDUE',
  ];
  if (ball) {
    const vx = ball.vx * frame.width;
    const vy = ball.vy * frame.height;
    lines.push(
      `position (${px(ball.x, 'width')}, ${px(ball.y, 'height')})   rayon ${px(ball.r, 'width')}`,
      `vitesse (${vx.toFixed(1)}, ${vy.toFixed(1)}) px/s   norme ${Math.hypot(vx, vy).toFixed(1)}`,
      `accél. (${(ball.ax * frame.width).toFixed(0)}, ${(ball.ay * frame.height).toFixed(0)}) px/s²`,
    );
  }

  return (
    <View style={styles.hud} pointerEvents="none">
      {lines.map((line) => (
        <Text key={line} style={styles.text}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { backgroundColor: 'rgba(17,17,17,0.75)', borderRadius: radius, padding: 10, gap: 2 },
  text: { color: colors.line, fontSize: 12, fontVariant: ['tabular-nums'] },
});
