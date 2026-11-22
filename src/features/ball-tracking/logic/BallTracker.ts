import type { BallConfig } from './ballConfig';
import { type Candidate, isPlausible, selectBest } from './candidates';
import { finiteDifference, type Sample } from './derivatives';
import { Kalman } from './Kalman';

/** Seen in this frame, or only where the filter expects it (hidden, blurred, missed). */
export type BallState = 'detected' | 'predicted';

/**
 * The ball in one frame, in pixels of the analysed frame. `t` in seconds, velocity in px/s,
 * acceleration in px/s², as the POC shows them.
 */
export type TrackedBall = {
  t: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  state: BallState;
  /** Frames in a row without a detection (0 when seen). */
  missed: number;
};

/** Smallest time step: two frames with the same timestamp must not divide by zero. */
const MIN_DT = 1e-4;

/**
 * Follows the ball from frame to frame (POC's tracking.py): picks the best candidate near the
 * prediction, smooths it with the Kalman filter, coasts on the prediction for a few frames when
 * the ball is missing, then drops the track. Velocity and acceleration come from the history of
 * filtered positions, by least squares over the last few samples, not from the filter's state.
 */
export class BallTracker {
  private filter: Kalman | null = null;
  private lastT = 0;
  private missed = 0;
  private radius = 0;
  private history: Sample[] = [];
  private velocities: Sample[] = [];
  private readonly diagonal: number;

  constructor(
    private readonly config: BallConfig,
    frame: { width: number; height: number },
  ) {
    this.diagonal = Math.hypot(frame.width, frame.height);
  }

  /** One frame: where the ball is, or nothing when there is no track. */
  step(t: number, candidates: readonly Candidate[]): TrackedBall | undefined {
    const plausible = candidates.filter((c) => isPlausible(c, this.config));
    const predicted = this.filter?.predict(Math.max(MIN_DT, t - this.lastT));
    const best = selectBest(plausible, predicted, this.diagonal, this.config.weights);

    if (best) {
      if (this.filter) this.filter.correct(best.x, best.y);
      else
        this.filter = new Kalman(
          best.x,
          best.y,
          this.config.processNoise,
          this.config.measurementNoise,
        );
      this.missed = 0;
      this.radius = best.r;
    } else {
      if (!this.filter) return undefined;
      if (++this.missed > this.config.maxMissedFrames) {
        this.reset();
        return undefined;
      }
    }

    this.lastT = t;
    return this.record(t, best ? 'detected' : 'predicted');
  }

  /** Appends the filtered position, and the velocity it implies (POC's `_record`). */
  private record(t: number, state: BallState): TrackedBall {
    const { x, y } = (this.filter as Kalman).position;
    const { historyLength, derivativeWindow } = this.config;
    this.history = [...this.history, { t, x, y }].slice(-historyLength);
    const velocity = finiteDifference(this.history, derivativeWindow);
    this.velocities = [...this.velocities, { t, ...velocity }].slice(-historyLength);
    const acceleration = finiteDifference(this.velocities, derivativeWindow);
    return {
      t,
      x,
      y,
      r: this.radius,
      vx: velocity.x,
      vy: velocity.y,
      ax: acceleration.x,
      ay: acceleration.y,
      state,
      missed: this.missed,
    };
  }

  private reset() {
    this.filter = null;
    this.missed = 0;
    this.history = [];
    this.velocities = [];
  }
}
