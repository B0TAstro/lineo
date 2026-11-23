import { locate, type Timeline } from '@/features/recording';
import { Store } from '@/shared/lib/Store';

import { type BallConfig } from './logic/ballConfig';
import { type BallPoint, toBallPoint } from './logic/ballPoint';
import { BallTracker } from './logic/BallTracker';
import type { ClipFrames } from './native/ClipFrames';
import type { BallDetector } from './native/OpenCvDetector';

/** Reading starts this long before the frame asked for: a track needs a few frames to start. */
const PREROLL_S = 0.1;
/** Further behind the frame on screen than this, the reader jumps instead of catching up. */
const MAX_LAG_S = 0.5;
/** Half a frame at 120 fps: a frame this close to the time asked for is that frame. */
const SAME_FRAME_S = 0.004;

export type BallTrackState = {
  on: boolean;
  /** The current track, oldest first: drawn up to the time on screen. Starts over after a jump. */
  points: BallPoint[];
  /** Frames analysed since it was turned on, and how many of them showed the ball. */
  frames: number;
  seen: number;
  /** Time the last frame took (OpenCV and the tracker), in ms. */
  ms: number;
  /** Size of the video as played, for the drawing. */
  video: { width: number; height: number } | undefined;
  /** Size of the analysed frames, for the figures in pixels. */
  frame: { width: number; height: number } | undefined;
  error: string | undefined;
};

const OFF: BallTrackState = {
  on: false,
  points: [],
  frames: 0,
  seen: 0,
  ms: 0,
  video: undefined,
  frame: undefined,
  error: undefined,
};

type Reader = {
  index: number;
  size: { width: number; height: number };
  /** Time of the last frame read, in the file; before the first, where reading started. */
  t: number;
  ended: boolean;
  tracker: BallTracker;
};

/**
 * The ball tracked on the replay, frame by frame, like the POC on its webcam: while it is on,
 * every frame the replay shows is read (native reader), searched (OpenCV) and followed (`logic/`),
 * as playback, frame by frame or a seek reaches it. Nothing runs while it is off, nor while the
 * match is filmed.
 *
 * The reader only goes forward: going back, or falling too far behind, reopens it a little before
 * the time asked for, and the track starts over.
 */
export class ReplayBallTracker {
  readonly store = new Store<BallTrackState>(OFF);
  private generation = 0;
  private target = 0;
  /** The generation the running pump works for: at most one pump per generation. */
  private pumping = -1;
  private reader: Reader | undefined;
  private points: BallPoint[] = [];

  constructor(
    private readonly timeline: Timeline,
    private readonly frames: ClipFrames,
    private readonly detector: BallDetector,
    private readonly config: BallConfig,
  ) {}

  setOn(on: boolean) {
    this.stop();
    if (on) this.store.set({ ...OFF, on: true });
  }

  /** The time on screen, on the replay timeline: analysis catches up with it. */
  follow(timeS: number) {
    if (!this.store.get().on) return;
    this.target = timeS;
    if (this.pumping !== this.generation) void this.pump(this.generation);
  }

  /** Turns it off and lets the reader go (another point, the replay closed). */
  stop() {
    this.generation++;
    this.reader = undefined;
    this.points = [];
    this.detector.reset();
    this.frames.close();
    this.store.set(OFF);
  }

  private async pump(generation: number) {
    this.pumping = generation;
    try {
      for (;;) {
        if (generation !== this.generation) return;
        const { index, localS } = locate(this.timeline, this.target);
        const reader = this.reader;
        if (
          !reader ||
          reader.index !== index ||
          localS < reader.t - SAME_FRAME_S ||
          localS - reader.t > MAX_LAG_S
        ) {
          await this.open(index, localS);
          if (generation !== this.generation) return;
          continue;
        }
        if (reader.ended || reader.t >= localS - SAME_FRAME_S) return;

        const pixels = await this.frames.next();
        if (generation !== this.generation) return;
        if (pixels.byteLength === 0) {
          reader.ended = true;
          return;
        }
        reader.t = this.frames.time();
        this.analyse(reader, pixels);
      }
    } catch (reason) {
      if (generation === this.generation) this.store.set({ error: String(reason) });
    } finally {
      if (this.pumping === generation) this.pumping = -1;
    }
  }

  private async open(index: number, localS: number) {
    const segment = this.timeline.segments[index];
    if (!segment) return;
    const startS = Math.max(0, localS - PREROLL_S);
    const size = await this.frames.open(
      segment.path,
      startS,
      segment.durationS,
      this.config.maxSide,
    );
    // One track per reading: a jump in time breaks the ball's motion
    this.detector.reset();
    this.points = [];
    this.reader = {
      index,
      size,
      t: startS - SAME_FRAME_S,
      ended: false,
      tracker: new BallTracker(this.config, size),
    };
    this.store.set({
      points: [],
      video: { width: size.videoWidth, height: size.videoHeight },
      frame: { width: size.width, height: size.height },
    });
  }

  private analyse(reader: Reader, pixels: ArrayBuffer) {
    const start = performance.now();
    const { width, height } = reader.size;
    const candidates = this.detector.detect({ pixels, width, height, format: 'rgb' });
    // A repeated frame (screen recordings): nothing new, the track waits for the next one
    if (!candidates) return;
    const ball = reader.tracker.step(reader.t, candidates);
    const offsetS = this.timeline.segments[reader.index]?.offsetS ?? 0;
    // Lost: the path starts over, as in the POC
    this.points = ball ? [...this.points, toBallPoint(ball, reader.size, offsetS)] : [];
    const { frames, seen } = this.store.get();
    this.store.set({
      points: this.points,
      frames: frames + 1,
      seen: seen + (ball?.state === 'detected' ? 1 : 0),
      ms: performance.now() - start,
    });
  }
}
