import type { BallPoint } from './ballPoint';

/** Where the ball was at a loud sound, in fractions of the frame like a `BallPoint` */
export type BounceMark = { t: number; x: number; y: number };

/** A sound and a ball position further apart than this are not the same moment */
const MAX_GAP_S = 0.1;

/**
 * UI only: the mark is drawn where the ball was at each loud sound. A loud sound is not a bounce
 * yet: v0.9 will confirm it with a sharp change of the trajectory, and only then call it one
 */
export function bounceMarks(points: readonly BallPoint[], peaks: readonly number[]): BounceMark[] {
  const marks: BounceMark[] = [];
  for (const t of peaks) {
    let nearest: BallPoint | undefined;
    for (const point of points) {
      if (
        Math.abs(point.t - t) <= MAX_GAP_S &&
        (!nearest || Math.abs(point.t - t) < Math.abs(nearest.t - t))
      )
        nearest = point;
    }
    if (nearest) marks.push({ t, x: nearest.x, y: nearest.y });
  }
  return marks;
}
