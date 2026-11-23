import { describe, expect, test } from '@jest/globals';

import realRally from './__fixtures__/realRally.json';
import { distance, HEIGHT, scene, type Scene, WIDTH } from './__fixtures__/scenes';
import { BALL_CONFIG } from './ballConfig';
import { trackClip } from './trackClip';

const size = { width: WIDTH, height: HEIGHT };
const track = ({ frames }: Scene) => trackClip(frames, size, BALL_CONFIG);

/** Share of the frames where the ball is shown within 12 px of the real one, and elsewhere. */
function accuracy(shot: Scene) {
  const shown = new Map(track(shot).map((ball) => [ball.t, ball]));
  let right = 0;
  let wrong = 0;
  shot.frames.forEach((frame, i) => {
    const ball = shown.get(frame.t);
    const real = shot.truth[i];
    if (!ball || !real) return;
    if (distance(ball, real) <= 12) right++;
    else wrong++;
  });
  return { right: right / shot.frames.length, wrong: wrong / shot.frames.length };
}

describe('trackClip', () => {
  test('no frame, no ball', () => {
    expect(trackClip([], size, BALL_CONFIG)).toEqual([]);
  });

  test('shows the ball on every frame of a flight, detected or not', () => {
    const shot = scene(
      0.6,
      { x: 200, y: 400, vx: 600, vy: -300 },
      { seen: 0.6, noise: 0.5, seed: 3 },
    );
    const balls = track(shot);
    const seenAt = shot.frames.flatMap((frame, i) => (frame.candidates.length > 0 ? [i] : []));
    const first = seenAt[0] ?? 0;
    const last = seenAt.at(-1) ?? 0;

    expect(balls.map((ball) => ball.t)).toEqual(shot.frames.slice(first, last + 1).map((f) => f.t));
    balls.forEach((ball, i) => {
      const frame = first + i;
      expect(distance(ball, shot.truth[frame] ?? { x: NaN, y: NaN })).toBeLessThan(2);
      expect(ball.state).toBe(seenAt.includes(frame) ? 'detected' : 'predicted');
    });
  });

  test('counts the frames in a row without a detection', () => {
    const shot = scene(0.5, { x: 200, y: 400, vx: 600, vy: -300 });
    const frames = shot.frames.map((frame, i) =>
      [10, 11, 12].includes(i) ? { ...frame, candidates: [] } : frame,
    );
    const balls = trackClip(frames, size, BALL_CONFIG);

    expect(balls.slice(9, 14).map((ball) => ball.missed)).toEqual([0, 1, 2, 3, 0]);
  });

  test('knows the new speed right after a bounce', () => {
    const shot = scene(0.8, { x: 200, y: 500, vx: 500, vy: 200 }, { ground: 600 });
    const bounce = shot.truth.findIndex((ball) => ball !== undefined && ball.vy < 0);
    const after = shot.frames[bounce + 3];
    const ball = track(shot).find((b) => b.t === after?.t);
    const real = shot.truth[bounce + 3];

    expect(Math.abs((ball?.vy ?? NaN) - (real?.vy ?? NaN))).toBeLessThan(40);
    expect(Math.abs((ball?.vx ?? NaN) - (real?.vx ?? NaN))).toBeLessThan(40);
  });

  test('gives the pull of gravity as the acceleration', () => {
    const balls = track(scene(0.5, { x: 200, y: 400, vx: 600, vy: -300 }));

    expect(balls[10]?.ay).toBeCloseTo(900, 0);
    expect(balls[10]?.ax).toBeCloseTo(0, 0);
  });

  test('follows the ball, not the shoe that slides along the baseline all the while', () => {
    const shoe = { x: 500, y: 350, vx: 50 };
    const results = [1, 2, 3, 4].map((seed) =>
      accuracy(
        scene(
          8,
          { x: 300, y: 300, vx: 600, vy: -100 },
          {
            seed,
            shoe,
            seen: 0.8,
            noise: 0.7,
            ground: 620,
            walls: [200, 1080],
            hidden: 4,
            drag: 0.4,
          },
        ),
      ),
    );

    expect(Math.min(...results.map((r) => r.right))).toBeGreaterThanOrEqual(0.85);
    expect(Math.max(...results.map((r) => r.wrong))).toBeLessThanOrEqual(0.02);
  });

  test('follows the ball, not a foot that shuffles in place', () => {
    // A foot does not go in a straight line: its path bends like a flight, but it stays there
    const shoe = { x: 640, y: 350, vx: 0, sway: 12 };
    const results = [1, 2, 3, 4].map((seed) =>
      accuracy(
        scene(
          8,
          { x: 300, y: 300, vx: 600, vy: -100 },
          {
            seed,
            shoe,
            seen: 0.8,
            noise: 0.7,
            ground: 620,
            walls: [200, 1080],
            hidden: 4,
            drag: 0.4,
          },
        ),
      ),
    );

    expect(Math.min(...results.map((r) => r.right))).toBeGreaterThanOrEqual(0.85);
    expect(Math.max(...results.map((r) => r.wrong))).toBeLessThanOrEqual(0.02);
  });

  /**
   * What the app's detector finds on 10 s of a real match filmed from behind the baseline (1280 px
   * wide, about 30 frames per second, `scripts/bench/detect.py`): the ball, 2 px wide at the far
   * end, and now and then the far player's yellow shoes. As [time, [x, y, radius][]] per frame.
   */
  describe('on a real rally', () => {
    const real = realRally as unknown as {
      width: number;
      height: number;
      frames: [number, [number, number, number][]][];
    };
    const frames = real.frames.map(([t, blobs]) => ({
      t,
      candidates: blobs.map(([x, y, r]) => ({ x, y, r })),
    }));
    const balls = trackClip(frames, real, BALL_CONFIG);
    const shownBetween = (first: number, last: number) =>
      balls.filter((ball) => ball.t >= (frames[first]?.t ?? 0) && ball.t <= (frames[last]?.t ?? 0));

    test.each([
      [8, 611, 327],
      [39, 587, 327],
      [54, 654, 399],
      [64, 708, 388],
      [81, 649, 350],
      [129, 685, 345],
      [145, 905, 404],
      [159, 676, 334],
      [203, 680, 361],
      [218, 853, 408],
      [266, 580, 328],
    ])('is on the ball at frame %i, where it was checked by eye on the video', (frame, x, y) => {
      const ball = balls.find((b) => b.t === frames[frame]?.t);

      expect(distance(ball ?? { x: NaN, y: NaN }, { x, y })).toBeLessThan(3);
    });

    test("does not take the far player's yellow shoes for the ball", () => {
      // On these frames the ball is not detected: only the shoes are, as the player walks, then
      // stands, along the baseline
      expect(shownBetween(93, 115)).toEqual([]);
      expect(shownBetween(246, 262)).toEqual([]);
    });

    test('shows the ball on more than half of the frames', () => {
      expect(balls.length / frames.length).toBeGreaterThan(0.5);
    });
  });

  describe('on a rally with hits, bounces, drag and clutter', () => {
    const rally = (seed: number, seen: number, flickers: number, strays: number) =>
      scene(
        8,
        { x: 300, y: 300, vx: 600, vy: -100 },
        {
          seed,
          seen,
          flickers,
          strays,
          noise: 0.7,
          ground: 620,
          walls: [200, 1080],
          hidden: 4,
          drag: 0.4,
        },
      );

    test.each([
      { seen: 1, flickers: 10, strays: 1.5, right: 0.9 },
      { seen: 0.8, flickers: 10, strays: 1.5, right: 0.85 },
      { seen: 0.8, flickers: 25, strays: 3, right: 0.85 },
      { seen: 0.6, flickers: 10, strays: 1.5, right: 0.65 },
    ])(
      'ball seen on $seen of the frames, $flickers flickers, $strays strays: right on $right',
      ({ seen, flickers, strays, right }) => {
        const results = [1, 2, 3, 4].map((seed) => accuracy(rally(seed, seen, flickers, strays)));
        const mean = (pick: (r: { right: number; wrong: number }) => number) =>
          results.reduce((sum, r) => sum + pick(r), 0) / results.length;

        expect(mean((r) => r.right)).toBeGreaterThanOrEqual(right);
        expect(mean((r) => r.wrong)).toBeLessThanOrEqual(0.02);
      },
    );
  });
});
