import type { FrameCandidates } from './arc';
import type { BallConfig } from './ballConfig';
import type { Candidate } from './candidates';

/** The blobs of one frame, by the square of the grid they are in: only close ones are compared. */
type Grid = Map<number, Candidate[]>;

/**
 * The frames without the blobs that stay around one place: a player's foot, a leaf, a spectator.
 * The ball passes: it is near any given spot for a few frames. What is found near the same spot
 * for a good part of a second and a half lives there, and is not the ball.
 *
 * The camera does not move during a point, so a place on screen is a place on the court.
 * The blobs kept are the very same objects, in frames at the same rank.
 */
export function withoutResidents(
  frames: readonly FrameCandidates[],
  width: number,
  config: BallConfig,
): FrameCandidates[] {
  const radius = config.residentRadius * width;
  const half = config.residentSpanS / 2;
  const square = (value: number) => Math.floor(value / radius);
  const keyOf = (column: number, row: number) => column * 100_003 + row;

  const grids: Grid[] = frames.map((frame) => {
    const grid: Grid = new Map();
    for (const candidate of frame.candidates) {
      const key = keyOf(square(candidate.x), square(candidate.y));
      const there = grid.get(key);
      if (there) there.push(candidate);
      else grid.set(key, [candidate]);
    }
    return grid;
  });

  const hasBlobNear = (grid: Grid, { x, y }: Candidate) => {
    for (let column = square(x) - 1; column <= square(x) + 1; column++) {
      for (let row = square(y) - 1; row <= square(y) + 1; row++) {
        for (const other of grid.get(keyOf(column, row)) ?? []) {
          if (Math.hypot(other.x - x, other.y - y) <= radius) return true;
        }
      }
    }
    return false;
  };

  let from = 0;
  let to = 0;
  return frames.map((frame, i) => {
    if (frame.candidates.length === 0) return frame;
    while ((frames[from]?.t ?? Infinity) < frame.t - half) from++;
    while ((frames[to + 1]?.t ?? Infinity) <= frame.t + half) to++;
    const seconds = (frames[to]?.t ?? 0) - (frames[from]?.t ?? 0);
    if (seconds <= 0) return frame;
    // As many frames as `residentShare` of the full span holds at this frame rate: a clip shorter
    // than that cannot tell what stays, and nothing is dropped.
    const needed = config.residentShare * config.residentSpanS * ((to - from) / seconds);

    const passing = frame.candidates.filter((candidate) => {
      let near = 0;
      for (let j = from; j <= to; j++) {
        if (j === i || hasBlobNear(grids[j] as Grid, candidate)) near++;
        if (near >= needed) return false;
      }
      return true;
    });
    return passing.length === frame.candidates.length ? frame : { ...frame, candidates: passing };
  });
}
