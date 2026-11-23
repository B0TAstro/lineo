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

/** A rectangle of the analysed frame, in pixels: around a blob, or around an area that moved. */
export type Box = { x: number; y: number; width: number; height: number };

/**
 * The blobs that can be the ball, as candidates at their centre: ball-sized, and inside a small
 * area that moved. A person moving makes a large one: their hands, feet and racket are not
 * taken for the ball, at the price of the ball itself while it is against them.
 */
export function ballBlobs(
  blobs: readonly Box[],
  movers: readonly Box[],
  frameWidth: number,
  config: { minBallPixels: number; maxBallSide: number; maxMoverSide: number },
): Candidate[] {
  const small = movers.filter(
    (mover) => Math.max(mover.width, mover.height) <= config.maxMoverSide * frameWidth,
  );
  const candidates: Candidate[] = [];
  for (const blob of blobs) {
    const side = Math.max(blob.width, blob.height);
    if (blob.width * blob.height < config.minBallPixels) continue;
    if (side > config.maxBallSide * frameWidth) continue;
    const x = blob.x + blob.width / 2;
    const y = blob.y + blob.height / 2;
    const alone = small.some(
      (m) => x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height,
    );
    if (alone) candidates.push({ x, y, r: side / 2 });
  }
  return candidates;
}
