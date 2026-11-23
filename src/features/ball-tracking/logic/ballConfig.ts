/**
 * Ball detection and tracking settings, measured on matches filmed from behind the baseline
 * (`dev-videos/`, 720p): there the ball is 3 to 10 px wide, among yellow stands, spectators and
 * players. The POC's settings (configs/ball.yaml) were a starting point for a ball 30 cm from a
 * webcam, and find nothing there.
 *
 * Sizes and distances are fractions of the frame width, so they hold at any resolution.
 */
export const BALL_CONFIG = {
  /** Frames are read at this long side: a far ball is only a few pixels, scaling down loses it. */
  maxSide: 1280,
  blurSize: 3,
  /**
   * OpenCV HSV (H 0-179). Only bright yellow (V ≥ 140): the ball in light is the brightest
   * yellow-green thing on court, where the green court and the shade are darker.
   */
  hsvRanges: [{ lower: [25, 50, 140], upper: [45, 255, 255] }],
  /** Grey level change between two frames that counts as motion (0-255). */
  motionThreshold: 20,
  /** Motion is widened by this kernel, to cover the ball's old and new position. */
  motionDilate: 5,
  /** Mean grey difference under which a frame repeats the previous one (screen recordings). */
  repeatThreshold: 0.3,
  /** Pixels a blob must have to be a ball. */
  minBallPixels: 2,
  /** Longest side of a ball blob, of the frame width. */
  maxBallSide: 0.03,
  /**
   * Longest side of the moving area around a ball, of the frame width. A person moving makes a
   * larger one: a spectator in yellow is not taken for the ball.
   */
  maxMoverSide: 0.04,
  /**
   * A track starts on two blobs one frame apart, this far apart (of the frame width): enough to
   * be moving, not so far that two unrelated blobs make a track.
   */
  minStartMove: 0.003,
  maxStartMove: 0.05,
  /** Distance from the prediction within which a blob is the tracked ball, of the frame width. */
  gate: 0.06,
  /** The gate widens by this share per frame missed: the longer unseen, the less sure where. */
  gateGrowth: 0.5,
  /**
   * A ball in play keeps moving: a track slower than this (frame widths per second) for this many
   * frames is dropped, it was a person.
   */
  minSpeed: 0.12,
  slowFrames: 6,
  /** Kalman filter, in pixels: noise per 1/60 s step, measurement noise, starting uncertainty. */
  processNoise: 1.5,
  measurementNoise: 1,
  initialCovariance: 10,
  /** Frames the ball may be missing (hidden, too blurred) before the track is dropped. */
  maxMissedFrames: 8,
  /** Positions kept, and samples used for velocity and acceleration (as the POC). */
  historyLength: 64,
  derivativeWindow: 5,
  /** Drawing, as in the POC: trail length in frames, arrow length per px/s. */
  trailLength: 32,
  velocityScale: 0.15,
} as const;

export type BallConfig = typeof BALL_CONFIG;
