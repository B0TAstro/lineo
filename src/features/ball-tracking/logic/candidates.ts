import type { BallConfig } from './ballConfig';

/** A blob of ball colour in one frame, in pixels of the analysed frame. */
export type Candidate = { x: number; y: number; r: number; area: number; circularity: number };

/** 1 for a perfect disc, lower for anything stretched or ragged: 4πA / P². */
export function circularity(area: number, perimeter: number): number {
  if (perimeter <= 0) return 0;
  return Math.min(1, (4 * Math.PI * area) / (perimeter * perimeter));
}

/** Whether a blob is ball-sized and round enough to be considered at all. */
export function isPlausible(candidate: Candidate, config: BallConfig): boolean {
  return (
    candidate.area >= config.minArea &&
    candidate.area <= config.maxArea &&
    candidate.circularity >= config.minCircularity
  );
}

/**
 * The most ball-like candidate (POC's `select_best`): big, round, and close to where the filter
 * expects the ball. The distance is a soft score, not a gate: a far blob can still win.
 */
export function selectBest(
  candidates: readonly Candidate[],
  predicted: { x: number; y: number } | undefined,
  diagonal: number,
  weights: BallConfig['weights'],
): Candidate | undefined {
  const largest = Math.max(0, ...candidates.map((c) => c.area));
  let best: Candidate | undefined;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const areaScore = largest > 0 ? candidate.area / largest : 0;
    const distanceScore = predicted
      ? Math.max(0, 1 - Math.hypot(candidate.x - predicted.x, candidate.y - predicted.y) / diagonal)
      : 1;
    const score =
      weights.area * areaScore +
      weights.circularity * candidate.circularity +
      weights.distance * distanceScore;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
