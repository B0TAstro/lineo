import { describe, expect, test } from '@jest/globals';

import { fitQuadratic, slopeAt, valueAt } from './fitQuadratic';

describe('fitQuadratic', () => {
  const parabola = (t: number) => 5 - 3 * t + 40 * t * t;

  test('finds the parabola its samples lie on, at uneven times', () => {
    const times = [0.1, 0.12, 0.2, 0.31, 0.5];
    const fit = fitQuadratic(times, times.map(parabola));

    expect(valueAt(fit, 0.4)).toBeCloseTo(parabola(0.4), 6);
    expect(valueAt(fit, 1)).toBeCloseTo(parabola(1), 6);
  });

  test('gives the slope at any time', () => {
    const times = [0, 0.1, 0.2, 0.3];
    const fit = fitQuadratic(times, times.map(parabola));

    expect(slopeAt(fit, 0.25)).toBeCloseTo(-3 + 80 * 0.25, 6);
  });

  test('averages out the noise of many samples', () => {
    const times = Array.from({ length: 30 }, (_, i) => i / 60);
    const noisy = times.map((t, i) => parabola(t) + (i % 2 === 0 ? 0.5 : -0.5));
    const fit = fitQuadratic(times, noisy);

    expect(Math.abs(valueAt(fit, 0.25) - parabola(0.25))).toBeLessThan(0.2);
  });

  test('is the straight line through two samples', () => {
    const fit = fitQuadratic([1, 3], [10, 20]);

    expect(valueAt(fit, 2)).toBeCloseTo(15, 6);
    expect(slopeAt(fit, 5)).toBeCloseTo(5, 6);
  });
});
