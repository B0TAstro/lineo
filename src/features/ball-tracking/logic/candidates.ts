/** A small, bright yellow, moving blob in one frame, in pixels of the analysed frame. */
export type Candidate = { x: number; y: number; r: number };

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** The candidate closest to where the ball should be, if one is within `maxDistance`. */
export function nearest(
  candidates: readonly Candidate[],
  expected: Point,
  maxDistance: number,
): Candidate | undefined {
  let best: Candidate | undefined;
  let bestDistance = maxDistance;
  for (const candidate of candidates) {
    const d = distance(candidate, expected);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * Where a new track can start: a blob of this frame and one of the previous frame, between
 * `minMove` and `maxMove` apart. The closest such pair wins. One blob alone is not enough: a
 * single frame has too many specks that look like a ball.
 */
export function startPair(
  candidates: readonly Candidate[],
  previous: readonly Candidate[],
  minMove: number,
  maxMove: number,
): { from: Candidate; to: Candidate } | undefined {
  let best: { from: Candidate; to: Candidate } | undefined;
  let bestDistance = Infinity;
  for (const to of candidates) {
    for (const from of previous) {
      const d = distance(from, to);
      if (d >= minMove && d <= maxMove && d < bestDistance) {
        best = { from, to };
        bestDistance = d;
      }
    }
  }
  return best;
}
