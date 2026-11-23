import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BALL_CONFIG } from '../logic/ballConfig';
import type { BallPoint } from '../logic/ballPoint';

/** Colours of the POC overlay (visualization in configs/ball.yaml). */
const BALL = '#FFFF00';
const PREDICTED = '#FF8C00';
const TRAIL = '#FFC800';
const VELOCITY = '#FF0000';
/**
 * A point closer than this to the time on screen is the ball "now": while the replay plays, the
 * analysis may trail the picture by a few frames.
 */
const NOW_TOLERANCE_S = 0.1;
/** A longer hole between two points is a lost track: the trail is not drawn across it. */
const MAX_GAP_S = 0.1;
const ARROW_HEAD = 8;

type Px = { x: number; y: number };

/**
 * The ball as the POC draws it: the recent trail, thicker and brighter as it gets closer to now,
 * a circle at the ball's radius (yellow when seen, orange when only predicted), its centre, and
 * the velocity as a red arrow. Lives inside the zoomable view in the replay, so it zooms with the
 * video. A help to read the picture, never a verdict.
 */
export function BallTrackOverlay({
  points,
  video,
  timeS,
}: {
  points: readonly BallPoint[];
  /** Size of the picture, for its shape: placed as resizeMode "contain" places it. */
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
      {trail.slice(1).map((point, i) => {
        const previous = trail[i] as BallPoint;
        const age = (i + 1) / trail.length;
        return (
          <Line
            key={point.t}
            from={toPx(previous.x, previous.y)}
            to={toPx(point.x, point.y)}
            thickness={Math.max(1, Math.round(1 + 3 * age))}
            color={TRAIL}
            opacity={0.35 + 0.65 * age}
          />
        );
      })}

      {now && <Ball point={now} center={toPx(now.x, now.y)} radius={now.r * shown.width} />}
      {now && (
        <Arrow
          from={toPx(now.x, now.y)}
          to={toPx(
            now.x + now.vx * BALL_CONFIG.velocityScale,
            now.y + now.vy * BALL_CONFIG.velocityScale,
          )}
        />
      )}
    </View>
  );
}

/** The last points before now, cut at the first hole (where the track was lost). */
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

function Ball({ point, center, radius }: { point: BallPoint; center: Px; radius: number }) {
  const color = point.state === 'detected' ? BALL : PREDICTED;
  const size = Math.max(2, radius) * 2;
  return (
    <>
      <View
        style={[
          styles.circle,
          { borderColor: color, width: size, height: size, borderRadius: size / 2 },
          { left: center.x - size / 2, top: center.y - size / 2 },
        ]}
      />
      <View
        style={[styles.center, { backgroundColor: color, left: center.x - 3, top: center.y - 3 }]}
      />
    </>
  );
}

/** The velocity vector, with a two-stroke head (cv2.arrowedLine). */
function Arrow({ from, to }: { from: Px; to: Px }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < 1) return null;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.min(ARROW_HEAD, length / 2);
  const barb = (side: 1 | -1): Px => ({
    x: to.x - head * Math.cos(angle + (side * Math.PI) / 6),
    y: to.y - head * Math.sin(angle + (side * Math.PI) / 6),
  });
  return (
    <>
      <Line from={from} to={to} thickness={2} color={VELOCITY} />
      <Line from={barb(1)} to={to} thickness={2} color={VELOCITY} />
      <Line from={barb(-1)} to={to} thickness={2} color={VELOCITY} />
    </>
  );
}

/** A straight line between two points: a thin view, rotated about its middle. */
function Line({
  from,
  to,
  thickness,
  color,
  opacity = 1,
}: {
  from: Px;
  to: Px;
  thickness: number;
  color: string;
  opacity?: number;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return (
    <View
      style={{
        position: 'absolute',
        left: (from.x + to.x) / 2 - length / 2,
        top: (from.y + to.y) / 2 - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        opacity,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute', borderWidth: 2 },
  center: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
});
