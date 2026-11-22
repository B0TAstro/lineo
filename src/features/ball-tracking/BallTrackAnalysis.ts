import type { Timeline } from '@/features/recording';
import { Store } from '@/shared/lib/Store';

import { type BallConfig } from './logic/ballConfig';
import { type BallPoint, toBallPoint } from './logic/ballPoint';
import { BallTracker } from './logic/BallTracker';
import type { ClipFrames } from './native/ClipFrames';
import type { DetectCandidates } from './native/OpenCvDetector';

/** The path found so far is published every so many frames, not at each one. */
const PUBLISH_EVERY = 10;

export type BallTrackState = {
  status: 'idle' | 'running' | 'done' | 'error';
  /** 0..1 while running. */
  progress: number;
  /** Grows while running: the replay plays while the rest of the clip is analysed. */
  points: BallPoint[];
  /** Frames analysed, and how many of them showed the ball. */
  frames: number;
  seen: number;
  /** Size of the video as played, for the drawing. */
  video: { width: number; height: number } | undefined;
  /** Size of the analysed frames, for the figures in pixels. */
  frame: { width: number; height: number } | undefined;
  error: string | undefined;
};

const IDLE: BallTrackState = {
  status: 'idle',
  progress: 0,
  points: [],
  frames: 0,
  seen: 0,
  video: undefined,
  frame: undefined,
  error: undefined,
};

/**
 * Follows the ball through the whole point on screen, on demand only: frames read by the native
 * reader, blobs found by OpenCV, the ball picked and smoothed in `logic/`. Nothing runs while the
 * match is filmed. The path is published as it grows, so the replay can play along.
 *
 * Runs one after the other: a new analysis (or a cancel) stops the current one at its next frame,
 * and it closes the reader before the next opens it.
 */
export class BallTrackAnalysis {
  readonly store = new Store<BallTrackState>(IDLE);
  private generation = 0;
  private running: Promise<void> = Promise.resolve();
  private detect: DetectCandidates | undefined;

  constructor(
    private readonly frames: ClipFrames,
    private readonly createDetector: (config: BallConfig) => DetectCandidates,
    private readonly config: BallConfig,
  ) {}

  /** Analyses every file of the point, first to last. */
  analyse(timeline: Timeline) {
    const generation = ++this.generation;
    const previous = this.running;
    this.running = previous.then(() => this.run(generation, timeline));
  }

  /** Stops the analysis and forgets its result (another point is on screen). */
  cancel() {
    this.generation++;
    this.store.set(IDLE);
  }

  private async run(generation: number, timeline: Timeline) {
    if (generation !== this.generation) return;
    this.store.set({ ...IDLE, status: 'running' });
    const points: BallPoint[] = [];
    let frames = 0;
    let seen = 0;
    let video: BallTrackState['video'];
    let frame: BallTrackState['frame'];

    try {
      for (const segment of timeline.segments) {
        const size = await this.frames.open(
          segment.path,
          0,
          segment.durationS,
          this.config.maxSide,
        );
        video ??= { width: size.videoWidth, height: size.videoHeight };
        frame ??= { width: size.width, height: size.height };
        this.detect ??= this.createDetector(this.config);
        // One track per file: the cut between two files is a jump in time.
        const tracker = new BallTracker(this.config, size);

        for (;;) {
          const pixels = await this.frames.next();
          if (generation !== this.generation) return;
          if (pixels.byteLength === 0) break;
          const t = this.frames.time();
          const ball = tracker.step(
            t,
            this.detect({ pixels, width: size.width, height: size.height, format: 'rgb' }),
          );
          frames++;
          if (ball) {
            if (ball.state === 'detected') seen++;
            points.push(toBallPoint(ball, size, segment.offsetS));
          }
          if (frames % PUBLISH_EVERY === 0) {
            const doneS = segment.offsetS + t;
            this.store.set({
              progress: Math.min(1, doneS / Math.max(1e-3, timeline.totalS)),
              points: [...points],
              frames,
              seen,
              video,
              frame,
            });
          }
        }
        this.frames.close();
      }

      this.store.set({ status: 'done', progress: 1, points, frames, seen, video, frame });
    } catch (reason) {
      if (generation === this.generation)
        this.store.set({ status: 'error', error: String(reason) });
    } finally {
      this.frames.close();
    }
  }
}
