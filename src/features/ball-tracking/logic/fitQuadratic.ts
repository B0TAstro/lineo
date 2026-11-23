/**
 * v(t) = a + b·(t − origin) + c·(t − origin)². Times are counted from `origin`, the mean of the
 * samples, which keeps the sums small and the fit steady.
 */
export type Quadratic = { origin: number; a: number; b: number; c: number };

/**
 * The parabola closest to the samples (least squares): what a thing in free flight follows on
 * each axis. With fewer than three different times there is no curve to find: the straight line
 * through them, or their mean.
 */
export function fitQuadratic(times: readonly number[], values: readonly number[]): Quadratic {
  const count = times.length;
  if (count === 0) return { origin: 0, a: 0, b: 0, c: 0 };
  const origin = times.reduce((sum, t) => sum + t, 0) / count;

  // Sums of the powers of the centred times (the first one is zero) and of their products
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let r0 = 0;
  let r1 = 0;
  let r2 = 0;
  times.forEach((time, i) => {
    const t = time - origin;
    const v = values[i] ?? 0;
    s2 += t * t;
    s3 += t * t * t;
    s4 += t * t * t * t;
    r0 += v;
    r1 += v * t;
    r2 += v * t * t;
  });

  // Normal equations [n 0 s2; 0 s2 s3; s2 s3 s4]·[a b c] = [r0 r1 r2], solved by Cramer's rule
  const det = count * (s2 * s4 - s3 * s3) - s2 * s2 * s2;
  if (det <= 1e-9 * count * s2 * s4) {
    return { origin, a: r0 / count, b: s2 > 0 ? r1 / s2 : 0, c: 0 };
  }
  return {
    origin,
    a: (r0 * (s2 * s4 - s3 * s3) + s2 * (r1 * s3 - s2 * r2)) / det,
    b: (count * (r1 * s4 - r2 * s3) + r0 * s2 * s3 - s2 * s2 * r1) / det,
    c: (count * (s2 * r2 - s3 * r1) - r0 * s2 * s2) / det,
  };
}

export function valueAt({ origin, a, b, c }: Quadratic, t: number): number {
  const dt = t - origin;
  return a + b * dt + c * dt * dt;
}

/** How fast the value changes at `t`, per second. */
export function slopeAt({ origin, b, c }: Quadratic, t: number): number {
  return b + 2 * c * (t - origin);
}
