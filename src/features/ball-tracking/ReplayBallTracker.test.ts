import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import type { Timeline } from '@/features/recording';

import { BALL_CONFIG } from './logic/ballConfig';
import type { Candidate } from './logic/candidates';
import type { ClipFrames } from './native/ClipFrames';
import type { BallDetector } from './native/OpenCvDetector';
import { ReplayBallTracker } from './ReplayBallTracker';

// The tracker only needs `locate` from the recording feature, which is pure. Its index also
// brings the camera and the session, which do not load without a phone.
jest.mock('@/features/recording', () => jest.requireActual('../recording/logic/timeline'));

const FPS = 60;
const WIDTH = 1280;
const HEIGHT = 720;

/** A ball that hops along the ground: one hop per second, a bounce at every whole second. */
const ballAt = (t: number): Candidate => {
  const hop = t - Math.floor(t);
  return { x: 100 + 120 * t, y: 600 - 600 * hop * (1 - hop), r: 3 };
};

/** A clip whose frames only carry their own time: the fake detector reads it back. */
class FakeClipFrames implements ClipFrames {
  /** Where each reading started, in seconds. */
  readonly opened: number[] = [];
  /** Frames handed out since the start. */
  read = 0;
  private frame = 0;
  private lastFrame = 0;

  async open(_path: string, startS: number, endS: number) {
    this.opened.push(startS);
    this.frame = Math.ceil(startS * FPS - 1e-6) - 1;
    this.lastFrame = Math.floor(endS * FPS + 1e-6);
    return { width: WIDTH, height: HEIGHT, videoWidth: WIDTH, videoHeight: HEIGHT };
  }

  async next() {
    if (this.frame >= this.lastFrame) return new ArrayBuffer(0);
    this.frame++;
    this.read++;
    return new Float64Array([this.frame / FPS]).buffer;
  }

  time() {
    return this.frame / FPS;
  }

  close() {}
}

/** Like the real one, judges a frame once it has seen the next: its answer comes a frame late. */
const createDetector = (): BallDetector => {
  let waiting: number | undefined;
  return {
    detect: (_image, t) => {
      const judged = waiting;
      waiting = t;
      return judged === undefined ? [] : [{ t: judged, candidates: [ballAt(judged)] }];
    },
    reset: () => {
      waiting = undefined;
    },
  };
};

/** Lets the tracker read all it wants: the fakes answer at once. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const oneFile: Timeline = {
  segments: [{ path: 'point.mp4', offsetS: 0, durationS: 8 }],
  totalS: 8,
};

describe('ReplayBallTracker', () => {
  let frames: FakeClipFrames;
  let tracker: ReplayBallTracker;

  const start = (timeline: Timeline = oneFile) => {
    frames = new FakeClipFrames();
    tracker = new ReplayBallTracker(timeline, frames, createDetector(), BALL_CONFIG);
  };
  const pointAt = (timeS: number) =>
    tracker.store.get().points.find((point) => Math.abs(point.t - timeS) < 1e-6);

  beforeEach(() => start());

  test('reads nothing while it is off', async () => {
    tracker.follow(2.5);
    await settled();

    expect(frames.opened).toEqual([]);
  });

  test('reads from before the time on screen to after it, and shows the ball there', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();

    expect(frames.opened).toEqual([1]);
    expect((pointAt(2.5)?.x ?? NaN) * WIDTH).toBeCloseTo(ballAt(2.5).x, 0);
    expect((pointAt(2.5)?.y ?? NaN) * HEIGHT).toBeCloseTo(ballAt(2.5).y, 0);
    // The path is already known after the time on screen: playing on has nothing to wait for
    expect(pointAt(3.5)).toBeDefined();
  });

  test('going back inside what it has read reads nothing again and keeps the path', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();
    const read = frames.read;

    tracker.follow(2.5 - 1 / FPS);
    await settled();
    tracker.follow(1.2);
    await settled();

    expect(frames.opened).toEqual([1]);
    expect(frames.read).toBe(read);
    expect((pointAt(1.2)?.y ?? NaN) * HEIGHT).toBeCloseTo(ballAt(1.2).y, 0);
  });

  test('going back before what it has read starts again from earlier', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();

    tracker.follow(0.4);
    await settled();

    expect(frames.opened).toEqual([1, 0]);
    expect(pointAt(0.4)).toBeDefined();
  });

  test('keeps reading ahead as the time on screen moves on, without starting again', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();

    tracker.follow(2.9);
    await settled();

    expect(frames.opened).toEqual([1]);
    expect(pointAt(4.3)).toBeDefined();
    // What was read before is still there
    expect(pointAt(1.2)).toBeDefined();
  });

  test('after a jump far ahead, starts again just before the time on screen', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();

    tracker.follow(6);
    await settled();

    expect(frames.opened).toEqual([1, 5.8]);
    expect(pointAt(6)).toBeDefined();
  });

  test('gives the path on the replay timeline when the point has two files', async () => {
    start({
      segments: [
        { path: 'first.mp4', offsetS: 0, durationS: 3 },
        { path: 'second.mp4', offsetS: 3, durationS: 5 },
      ],
      totalS: 8,
    });
    tracker.setOn(true);
    tracker.follow(5);
    await settled();

    // 2 s into the second file
    expect(frames.opened).toEqual([0.5]);
    expect((pointAt(5)?.x ?? NaN) * WIDTH).toBeCloseTo(ballAt(2).x, 0);
  });

  test('counts the frames read and those where the ball is detected', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();
    const { frames: readFrames, seen } = tracker.store.get();

    // From 1 s to 4 s, both ends included, but for the last one: the detector waits for its next
    expect(readFrames).toBe(180);
    expect(seen).toBeGreaterThan(170);
  });

  test('tells how long working out the path took, to check it on a phone', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();

    expect(tracker.store.get().trackMs).toBeGreaterThan(0);
  });

  test('turned off, forgets the path', async () => {
    tracker.setOn(true);
    tracker.follow(2.5);
    await settled();

    tracker.setOn(false);

    expect(tracker.store.get().points).toEqual([]);
    expect(tracker.store.get().on).toBe(false);
  });
});
