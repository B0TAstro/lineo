import { describe, expect, test } from '@jest/globals';

import { BALL_CONFIG } from './ballConfig';
import { ballBlobs } from './candidates';

const WIDTH = 1280;
const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
/** A small area that moved, around (100, 100): what a ball leaves between two frames. */
const smallMover = box(92, 94, 20, 12);
/** A player moving: far larger than a ball's trace. */
const player = box(400, 200, 90, 220);

describe('ballBlobs', () => {
  test('keeps a small blob alone in a small moving area, at its centre', () => {
    expect(ballBlobs([box(98, 99, 4, 3)], [smallMover], WIDTH, BALL_CONFIG)).toEqual([
      { x: 100, y: 100.5, r: 2 },
    ]);
  });

  test('keeps a far ball, two pixels wide', () => {
    expect(ballBlobs([box(99, 100, 2, 1)], [smallMover], WIDTH, BALL_CONFIG)).toHaveLength(1);
  });

  test('drops a single pixel: noise', () => {
    expect(ballBlobs([box(100, 100, 1, 1)], [smallMover], WIDTH, BALL_CONFIG)).toEqual([]);
  });

  test('drops a blob larger than a ball can be', () => {
    expect(ballBlobs([box(80, 90, 60, 20)], [box(70, 80, 80, 40)], WIDTH, BALL_CONFIG)).toEqual([]);
  });

  test('drops a small blob inside a large moving area: part of a player', () => {
    expect(ballBlobs([box(440, 300, 4, 4)], [player], WIDTH, BALL_CONFIG)).toEqual([]);
  });

  test('drops a blob where nothing moved', () => {
    expect(ballBlobs([box(700, 500, 4, 4)], [smallMover], WIDTH, BALL_CONFIG)).toEqual([]);
  });
});
