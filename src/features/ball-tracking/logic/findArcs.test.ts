import { describe, expect, test } from '@jest/globals';

import { distance, scene, type Scene, WIDTH } from './__fixtures__/scenes';
import { type Arc, positionAt } from './arc';
import { BALL_CONFIG } from './ballConfig';
import { findArcs } from './findArcs';

const flight = { x: 200, y: 400, vx: 600, vy: -300 };

const arcsOf = ({ frames }: Scene) => findArcs(frames, WIDTH, BALL_CONFIG);

/** Frames where the detector saw the ball: a ball blob has radius 3 in the test scenes. */
const sightings = ({ frames }: Scene) =>
  frames.filter((frame) => frame.candidates.some((c) => c.r === 3)).length;

/** Furthest the arc is from the real ball, over the frames it goes through. */
function worstError(arc: Arc, { frames, truth }: Scene): number {
  return Math.max(
    ...arc.hits.map(({ frame }) => {
      const real = truth[frame];
      const t = frames[frame]?.t;
      return real && t !== undefined ? distance(positionAt(arc, t), real) : Infinity;
    }),
  );
}

describe('findArcs', () => {
  test('follows a ball in free flight with one arc through every frame', () => {
    const shot = scene(0.5, flight);
    const arcs = arcsOf(shot);

    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.hits).toHaveLength(shot.frames.length);
    expect(worstError(arcs[0] as Arc, shot)).toBeLessThan(1);
  });

  test('keeps one arc when the ball is missed on many frames', () => {
    const shot = scene(0.6, flight, { seen: 0.6, noise: 0.5, seed: 3 });
    const arcs = arcsOf(shot);

    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.hits).toHaveLength(sightings(shot));
    expect(worstError(arcs[0] as Arc, shot)).toBeLessThan(2);
  });

  test('finds nothing in blobs that flicker in place', () => {
    expect(arcsOf(scene(2, undefined, { flickers: 25, seed: 5 }))).toEqual([]);
  });

  test('finds nothing in stray blobs', () => {
    expect(arcsOf(scene(2, undefined, { strays: 6, seed: 7 }))).toEqual([]);
  });

  test('finds nothing in a blob carried in a straight line: a shoe does not fall', () => {
    const shoe = { x: 600, y: 350, vx: 60 };

    expect(arcsOf(scene(1.5, undefined, { shoe, seed: 2 }))).toEqual([]);
  });

  test('finds nothing in a blob whose path bends up a little: nothing falls upwards', () => {
    // A foot lifted for a step: it travels, its path bends, but the wrong way for a flight
    const shoe = { x: 600, y: 350, vx: 90, lift: 60 };

    expect(arcsOf(scene(1, undefined, { shoe, seed: 2 }))).toEqual([]);
  });

  test('follows a ball whose path bends up strongly: fast, above the camera and close to it', () => {
    const shot = scene(0.4, { x: 200, y: 500, vx: 900, vy: 300 }, { gravity: -3000 });
    const arcs = arcsOf(shot);

    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.hits).toHaveLength(shot.frames.length);
  });

  test('ends an arc at a bounce and starts another one', () => {
    const shot = scene(0.8, { x: 200, y: 500, vx: 500, vy: 200 }, { ground: 600 });
    const bounce = shot.truth.findIndex((ball) => ball !== undefined && ball.vy < 0);
    const arcs = arcsOf(shot);

    expect(arcs).toHaveLength(2);
    const [before, after] = arcs as [Arc, Arc];
    // The frame of the bounce itself can sit on both paths
    expect(before.hits.at(-1)?.frame).toBeGreaterThanOrEqual(bounce - 1);
    expect(before.hits.at(-1)?.frame).toBeLessThanOrEqual(bounce);
    expect(after.hits[0]?.frame).toBeGreaterThanOrEqual(bounce - 1);
    expect(after.hits[0]?.frame).toBeLessThanOrEqual(bounce);
    expect(after.hits.at(-1)?.frame).toBe(shot.frames.length - 1);
  });

  test('uses the real time of each frame, not its rank', () => {
    const shot = scene(0.8, flight, { fps: 30, dropped: [5, 6, 11] });
    const arcs = arcsOf(shot);

    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.hits).toHaveLength(shot.frames.length);
    expect(worstError(arcs[0] as Arc, shot)).toBeLessThan(1);
  });

  test('picks the ball out of the clutter around it', () => {
    const shot = scene(0.6, flight, { noise: 0.5, flickers: 15, strays: 5, seed: 11 });
    const arcs = arcsOf(shot);

    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.hits.length).toBeGreaterThanOrEqual(shot.frames.length - 2);
    expect(worstError(arcs[0] as Arc, shot)).toBeLessThan(3);
  });
});
