import type { BallState, TrackedBall } from './BallTracker';

/**
 * The ball in one frame, ready to draw: positions and speeds as fractions of the frame (x, vx, ax
 * of its width; y, vy, ay of its height; r of its width), so the drawing only needs the size it is
 * shown at. `t` in seconds, on the replay timeline or the camera clock.
 */
export type BallPoint = {
  t: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  state: BallState;
  missed: number;
};

/** From the tracker's pixels of the analysed frame to fractions of it. */
export function toBallPoint(
  ball: TrackedBall,
  frame: { width: number; height: number },
  offsetS = 0,
): BallPoint {
  return {
    t: offsetS + ball.t,
    x: ball.x / frame.width,
    y: ball.y / frame.height,
    r: ball.r / frame.width,
    vx: ball.vx / frame.width,
    vy: ball.vy / frame.height,
    ax: ball.ax / frame.width,
    ay: ball.ay / frame.height,
    state: ball.state,
    missed: ball.missed,
  };
}
