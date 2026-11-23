import type { Candidate } from './candidates';
import { type Quadratic, slopeAt, valueAt } from './fitQuadratic';

/** What the detector found in one frame of the clip. `t` in seconds, from the start of the file. */
export type FrameCandidates = { t: number; candidates: readonly Candidate[] };

/** A blob an arc goes through: the frame (its rank in the clip's frames) and the blob. */
export type Hit = { frame: number; candidate: Candidate };

/**
 * A stretch of free flight. Between two hits or bounces only gravity pulls the ball, so on screen
 * x and y each follow a parabola of time (true over the short time of one flight). `hits` are the
 * blobs it goes through, in frame order, one per frame at most.
 */
export type Arc = { x: Quadratic; y: Quadratic; hits: readonly Hit[] };

export function positionAt(arc: Arc, t: number) {
  return { x: valueAt(arc.x, t), y: valueAt(arc.y, t) };
}

/** Pixels per second. */
export function speedAt(arc: Arc, t: number) {
  return Math.hypot(slopeAt(arc.x, t), slopeAt(arc.y, t));
}

export const firstFrame = (arc: Arc) => arc.hits[0]?.frame ?? 0;
export const lastFrame = (arc: Arc) => arc.hits.at(-1)?.frame ?? 0;
