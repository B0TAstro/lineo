import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';

import { colors } from '@/shared/ui/theme';

import { BALL_CONFIG } from '../logic/ballConfig';
import type { BallPoint } from '../logic/ballPoint';
import type { BounceMark } from '../logic/bounceMarks';

/**
 * A point closer than this to the time on screen is the ball "now": while the replay plays, the
 * analysis may trail the picture by a few frames
 */
const NOW_TOLERANCE_S = 0.1;
/** A longer hole between two points is a lost track: the trail is not drawn across it */
const MAX_GAP_S = 0.1;
/** The sphere never gets smaller than this, so it stays visible on a ball far away */
const MIN_RADIUS = 6;
/** The mark on the ground at a bounce (Figma: 64 × 28 around a ball of 14) */
const MARK = { rx: 32, ry: 14, ball: 6 };

type Px = { x: number; y: number };

/**
 * The ball over the replay: a lemon sphere where the tracking puts it, a light white trail behind,
 * and a mark on the ground at each bounce. Lives inside the zoomable view, so it zooms with the
 * video. A help to read the picture, never a verdict
 */
export function BallTrackOverlay({
  points,
  bounces = [],
  video,
  timeS,
}: {
  points: readonly BallPoint[];
  /** UI only: drawn at every loud sound, see `bounceMarks` */
  bounces?: readonly BounceMark[];
  /** Size of the picture, for its shape: placed as resizeMode "contain" places it */
  video: { width: number; height: number };
  timeS: number;
}) {
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const scale = Math.min(stage.width / video.width, stage.height / video.height) || 0;
  const shown = { width: video.width * scale, height: video.height * scale };
  const origin = { x: (stage.width - shown.width) / 2, y: (stage.height - shown.height) / 2 };
  const toPx = (x: number, y: number): Px => ({
    x: origin.x + x * shown.width,
    y: origin.y + y * shown.height,
  });

  const past = points.filter((p) => p.t <= timeS + NOW_TOLERANCE_S);
  const last = past.at(-1);
  const now = last && timeS - last.t <= NOW_TOLERANCE_S ? last : undefined;
  const trail = now ? recentTrail(past, BALL_CONFIG.trailLength) : [];

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => setStage(e.nativeEvent.layout)}
    >
      <Svg style={StyleSheet.absoluteFill}>
        {bounces
          .filter((mark) => mark.t <= timeS)
          .map((mark) => {
            const at = toPx(mark.x, mark.y);
            return (
              <Ellipse
                key={`mark-${mark.t}`}
                cx={at.x}
                cy={at.y}
                rx={MARK.rx}
                ry={MARK.ry}
                fill={colors.accent}
                fillOpacity={0.15}
                stroke={colors.accent}
                strokeWidth={2}
                strokeDasharray="8 6"
              />
            );
          })}
        {bounces
          .filter((mark) => mark.t <= timeS)
          .map((mark) => {
            const at = toPx(mark.x, mark.y);
            return (
              <Circle
                key={`ball-${mark.t}`}
                cx={at.x}
                cy={at.y}
                r={MARK.ball}
                fill={colors.accent}
                stroke={colors.bg}
                strokeWidth={2}
              />
            );
          })}

        {/* The trail: white, fading out away from now */}
        {trail.slice(1).map((point, i) => {
          const previous = trail[i] as BallPoint;
          const from = toPx(previous.x, previous.y);
          const to = toPx(point.x, point.y);
          const age = (i + 1) / trail.length;
          return (
            <Line
              key={point.t}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={colors.text}
              strokeOpacity={0.45 * age}
              strokeWidth={1 + 2 * age}
              strokeLinecap="round"
            />
          );
        })}

        {now && (
          <Circle
            cx={toPx(now.x, now.y).x}
            cy={toPx(now.x, now.y).y}
            r={Math.max(MIN_RADIUS, now.r * shown.width)}
            fill={colors.accent}
            // Only predicted (not seen in this frame): fainter
            fillOpacity={now.state === 'detected' ? 0.85 : 0.45}
          />
        )}
      </Svg>
    </View>
  );
}

/** The last points before now, cut at the first hole (where the track was lost) */
function recentTrail(past: readonly BallPoint[], length: number): BallPoint[] {
  const trail: BallPoint[] = [];
  for (let i = past.length - 1; i >= 0 && trail.length < length; i--) {
    const point = past[i] as BallPoint;
    const newer = trail[0];
    if (newer && newer.t - point.t > MAX_GAP_S) break;
    trail.unshift(point);
  }
  return trail;
}
