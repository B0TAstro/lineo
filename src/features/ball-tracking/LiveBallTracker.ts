import { Store } from '@/shared/lib/Store';

import { type BallConfig } from './logic/ballConfig';
import { type BallPoint, toBallPoint } from './logic/ballPoint';
import { BallTracker } from './logic/BallTracker';
import type { BallDetector, RawImage } from './native/OpenCvDetector';

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
 * Dev builds only: the replay's detector, run on the camera as it films, to tune the detection on
 * a real court. The camera does not know what comes next, so it uses the frame-by-frame tracker
 * (`BallTracker`), not the replay's arcs. The camera sends a frame only when the previous one is
 * done, so the rate follows what the phone can do.
 */
export class LiveBallTracker {
  readonly store = new Store<LiveBallState>(EMPTY);
  private detector: BallDetector | undefined;
  private tracker: BallTracker | undefined;
  private trackerWidth = 0;
  private trail: BallPoint[] = [];
  private frames = 0;
  private seen = 0;

  constructor(
    private readonly createDetector: (config: BallConfig) => BallDetector,
    private readonly config: BallConfig,
  ) {}

  readonly onFrame = (frame: LiveFrame) => {
    const start = performance.now();
    const detector = (this.detector ??= this.createDetector(this.config));
    if (!this.tracker || this.trackerWidth !== frame.width) {
      this.tracker = new BallTracker(this.config, frame);
      this.trackerWidth = frame.width;
      detector.reset();
    }
    const visible = { width: frame.visibleWidth, height: frame.height };
    // The detector judges a frame once it has seen the next ones: its answers are a frame or two
    // behind the camera, with their own time.
    let t = this.store.get().t;
    for (const judged of detector.detect(frame, frame.t)) {
      const ball = this.tracker.step(judged.t, judged.candidates);
      t = judged.t;
      this.frames++;
      if (ball?.state === 'detected') this.seen++;
      // Lost: the path starts over, as in the POC.
      this.trail = ball
        ? [...this.trail, toBallPoint(ball, visible)].slice(-this.config.trailLength)
        : [];
    }
    this.store.set({
      trail: this.trail,
      frames: this.frames,
      seen: this.seen,
      t,
      ms: performance.now() - start,
      frame: visible,
    });
  };

  reset() {
    this.detector?.reset();
    this.tracker = undefined;
    this.trail = [];
    this.frames = 0;
    this.seen = 0;
    this.store.set(EMPTY);
  }
}
