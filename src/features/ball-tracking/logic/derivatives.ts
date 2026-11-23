/** A timestamped pair: a position (x, y) or a velocity (vx, vy). `t` in seconds. */
export type Sample = { t: number; x: number; y: number };

/**
 * Least-squares slope of values against times (POC's `linear_slope`). Over a window rather than
 * between two points: a two-point difference jumps on a single pixel of jitter.
 */
export function linearSlope(times: readonly number[], values: readonly number[]): number {
  const count = times.length;
  if (count < 2) return 0;
  const meanT = times.reduce((sum, t) => sum + t, 0) / count;
  const meanV = values.reduce((sum, v) => sum + v, 0) / count;
  let numerator = 0;
  let denominator = 0;
  times.forEach((t, i) => {
    numerator += (t - meanT) * ((values[i] ?? meanV) - meanV);
    denominator += (t - meanT) ** 2;
  });
  return denominator > 0 ? numerator / denominator : 0;
}

/** Derivative of the last `window` samples, per second, on both axes (POC's `finite_difference`). */
export function finiteDifference(
  samples: readonly Sample[],
  window: number,
): { x: number; y: number } {
  const recent = samples.slice(-Math.max(2, window));
  if (recent.length < 2) return { x: 0, y: 0 };
  const times = recent.map((s) => s.t);
  return {
    x: linearSlope(
      times,
      recent.map((s) => s.x),
    ),
    y: linearSlope(
      times,
      recent.map((s) => s.y),
    ),
  };
}
