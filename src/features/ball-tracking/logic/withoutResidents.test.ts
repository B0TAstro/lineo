import { describe, expect, test } from '@jest/globals';

import { scene, WIDTH } from './__fixtures__/scenes';
import { BALL_CONFIG } from './ballConfig';
import { withoutResidents } from './withoutResidents';

const flight = { x: 200, y: 400, vx: 600, vy: -300 };

/** How many blobs are left, by radius: 3 for the ball, 2 for everything else in the test scenes. */
const left = (frames: readonly { candidates: readonly { r: number }[] }[], r: number) =>
  frames.reduce((sum, frame) => sum + frame.candidates.filter((c) => c.r === r).length, 0);

const filter = (frames: Parameters<typeof withoutResidents>[0]) =>
  withoutResidents(frames, WIDTH, BALL_CONFIG);

describe('withoutResidents', () => {
  test('keeps a ball that passes by', () => {
    const { frames } = scene(1.5, flight);

    expect(filter(frames)).toEqual(frames);
  });

  test('keeps a slow ball far from the camera: it still moves on', () => {
    // 150 px/s: a ball at the far baseline, coming towards the camera
    const { frames } = scene(3, { x: 300, y: 300, vx: 150, vy: -100 });

    expect(filter(frames)).toEqual(frames);
  });

  test('drops a blob that stays in place: a foot, a leaf, a spectator', () => {
    const { frames } = scene(3, undefined, { shoe: { x: 600, y: 350, vx: 0 } });

    expect(left(filter(frames), 2)).toBe(0);
  });

  test('drops a blob that only drifts: a player walking', () => {
    const { frames } = scene(3, undefined, { shoe: { x: 600, y: 350, vx: 15 } });

    expect(left(filter(frames), 2)).toBe(0);
  });

  test('keeps the ball and drops the foot in the same clip', () => {
    const { frames } = scene(3, flight, {
      shoe: { x: 900, y: 650, vx: 0 },
      ground: 620,
      walls: [200, 1080],
    });
    const filtered = filter(frames);

    expect(left(filtered, 3)).toBe(left(frames, 3));
    expect(left(filtered, 2)).toBe(0);
  });

  test('judges nothing on a clip too short to tell what stays', () => {
    const { frames } = scene(0.4, undefined, { shoe: { x: 600, y: 350, vx: 0 } });

    expect(filter(frames)).toEqual(frames);
  });

  test('keeps the very same blobs, so they can be matched afterwards', () => {
    const { frames } = scene(1, flight);

    expect(filter(frames)[10]?.candidates[0]).toBe(frames[10]?.candidates[0]);
  });
});
