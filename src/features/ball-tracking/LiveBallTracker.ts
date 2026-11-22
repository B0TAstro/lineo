import { Store } from '@/shared/lib/Store';

import { type BallConfig } from './logic/ballConfig';
import { type BallPoint, toBallPoint } from './logic/ballPoint';
import { BallTracker } from './logic/BallTracker';
import type { DetectCandidates, RawImage } from './native/OpenCvDetector';

/** A camera frame for the live tracking: the image, its visible width, its time in seconds. */
export type LiveFrame = RawImage & { visibleWidth: number; t: number };

export type LiveBallState = {
  /** The recent path, in fractions of the frame (as in the replay). */
  trail: BallPoint[];
  /** Frames analysed since it was turned on, and how many showed the ball. */
  frames: number;
  seen: number;
  /** Time of the last frame analysed, for the drawing. */
  t: number;
  /** Time OpenCV and the tracker took on the last frame, in ms. */
  ms: number;
  /** Size of the camera frames: the preview has the same 16:9 shape. */
  frame: { width: number; height: number } | undefined;
};

const EMPTY: LiveBallState = { trail: [], frames: 0, seen: 0, t: 0, ms: 0, frame: undefined };

/**
 * Dev builds only: the replay's ball tracking, run on the camera as it films, to tune the colour
 * and the sizes on a real court. Same detector, same tracker. The camera sends a frame only when
 * the previous one is done, so the rate follows what the phone can do.
 */
export class LiveBallTracker {
  readonly store = new Store<LiveBallState>(EMPTY);
  private detect: DetectCandidates | undefined;
  private tracker: BallTracker | undefined;
  private trackerWidth = 0;
  private trail: BallPoint[] = [];
  private frames = 0;
  private seen = 0;

  constructor(
    private readonly createDetector: (config: BallConfig) => DetectCandidates,
    private readonly config: BallConfig,
  ) {}

  readonly onFrame = (frame: LiveFrame) => {
    const start = performance.now();
    this.detect ??= this.createDetector(this.config);
    if (!this.tracker || this.trackerWidth !== frame.width) {
      this.tracker = new BallTracker(this.config, frame);
      this.trackerWidth = frame.width;
    }
    const ball = this.tracker.step(frame.t, this.detect(frame));
    const visible = { width: frame.visibleWidth, height: frame.height };
    this.frames++;
    if (ball?.state === 'detected') this.seen++;
    // Lost: the path starts over, as in the POC.
    this.trail = ball
      ? [...this.trail, toBallPoint(ball, visible)].slice(-this.config.trailLength)
      : [];
    this.store.set({
      trail: this.trail,
      frames: this.frames,
      seen: this.seen,
      t: frame.t,
      ms: performance.now() - start,
      frame: visible,
    });
  };

  reset() {
    this.tracker = undefined;
    this.trail = [];
    this.frames = 0;
    this.seen = 0;
    this.store.set(EMPTY);
  }
}
