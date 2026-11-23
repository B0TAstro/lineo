import { describe, expect, test } from '@jest/globals';

import { framesToCompare } from './framesToCompare';

const every = (fps: number, count: number) => Array.from({ length: count }, (_, i) => i / fps);

describe('framesToCompare', () => {
  test('at 30 frames per second, the frame before and the frame after', () => {
    expect(framesToCompare(every(30, 4), 1, 0.03)).toEqual({ before: 0, after: 2 });
  });

  test('at 60 frames per second, two frames away: the same time apart as at 30', () => {
    expect(framesToCompare(every(60, 6), 2, 0.03)).toEqual({ before: 0, after: 4 });
  });

  test('at 120 frames per second, four frames away', () => {
    expect(framesToCompare(every(120, 12), 5, 0.03)).toEqual({ before: 1, after: 9 });
  });

  test('waits for a frame far enough after', () => {
    expect(framesToCompare(every(60, 4), 2, 0.03)).toBe('wait');
  });

  test('has nothing to compare the first frame with', () => {
    expect(framesToCompare(every(30, 4), 0, 0.03)).toBe('none');
  });

  test('takes the closest frames it has near the start, even if less far before', () => {
    expect(framesToCompare(every(60, 6), 1, 0.03)).toEqual({ before: 0, after: 3 });
  });

  test('follows uneven frame times: the frames closest to the time wanted', () => {
    const times = [0, 0.02, 0.05, 0.07, 0.1];

    expect(framesToCompare(times, 2, 0.03)).toEqual({ before: 1, after: 3 });
  });
});
