import { describe, expect, test } from '@jest/globals';

import { WIDTH } from './__fixtures__/scenes';
import type { Arc, FrameCandidates } from './arc';
import { BALL_CONFIG } from './ballConfig';
import { fitQuadratic } from './fitQuadratic';
import { linkArcs } from './linkArcs';

const FPS = 60;
const frames: FrameCandidates[] = Array.from({ length: 80 }, (_, i) => ({
  t: i / FPS,
  candidates: [],
}));

/** An arc seen on every frame from `first` to `last`, at `path(t)`. */
function arcOn(first: number, last: number, path: (t: number) => { x: number; y: number }): Arc {
  const indexes = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const times = indexes.map((frame) => frame / FPS);
  const points = times.map(path);
  return {
    x: fitQuadratic(
      times,
      points.map((p) => p.x),
    ),
    y: fitQuadratic(
      times,
      points.map((p) => p.y),
    ),
    hits: indexes.map((frame, i) => ({ frame, candidate: { ...(points[i] ?? path(0)), r: 3 } })),
  };
}

const link = (arcs: Arc[]) => linkArcs(arcs, frames, WIDTH, BALL_CONFIG);

/** Falls to the ground (y = 600) at frame 20, then goes up again. */
const fall = (t: number) => ({ x: 200 + 600 * t, y: 600 - 900 * (1 / 3 - t) });
const rise = (t: number) => ({ x: 200 + 600 * t, y: 600 - 700 * (t - 1 / 3) });

describe('linkArcs', () => {
  test('keeps the two arcs of a bounce, in time order', () => {
    const before = arcOn(0, 20, fall);
    const after = arcOn(21, 45, rise);

    expect(link([after, before]).map((piece) => piece.arc)).toEqual([before, after]);
  });

  test('of two arcs at the same time, keeps the one seen on more frames', () => {
    const ball = arcOn(0, 40, (t) => ({ x: 200 + 600 * t, y: 300 }));
    const shoe = arcOn(5, 25, (t) => ({ x: 900 - 200 * t, y: 650 }));

    expect(link([shoe, ball]).map((piece) => piece.arc)).toEqual([ball]);
  });

  test('does not jump to an arc the ball could not reach in time', () => {
    const first = arcOn(0, 20, (t) => ({ x: 100 + 300 * t, y: 300 }));
    // 1000 px away two frames later: not the same ball, even though it is seen for longer
    const elsewhere = arcOn(22, 50, (t) => ({ x: 1200 - 100 * t, y: 600 }));
    const next = arcOn(23, 44, (t) => ({ x: 100 + 300 * t, y: 300 + 500 * (t - 23 / FPS) }));

    expect(link([first, elsewhere, next]).map((piece) => piece.arc)).toEqual([first, next]);
  });

  test('cuts two arcs that overlap where they cross, so each frame has one ball', () => {
    const before = arcOn(0, 22, fall);
    const after = arcOn(19, 45, rise);
    const [a, b] = link([before, after]);

    expect(a?.first).toBe(0);
    expect(b?.last).toBe(45);
    expect(b?.first).toBe((a?.last ?? NaN) + 1);
    // They cross at the bounce, frame 20
    expect(Math.abs((a?.last ?? NaN) - 20)).toBeLessThanOrEqual(1);
  });
});
