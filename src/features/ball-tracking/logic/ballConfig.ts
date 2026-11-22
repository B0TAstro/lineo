/**
 * Ball detection and tracking settings, copied from the POC (`temoin-poc-cv-tracking`,
 * configs/ball.yaml, as calibrated on a yellow tennis ball with apps/calibrate_hsv). Measured
 * close to a webcam: the sizes are to be checked on a real court, where the ball is smaller.
 */
export const BALL_CONFIG = {
  /** Frames are scaled down to this long side before analysis (POC: `processing_width` 640). */
  maxSide: 640,
  blurSize: 5,
  /** OpenCV HSV (H 0-179). Several ranges are OR-ed, for a colour that wraps around H = 0. */
  hsvRanges: [{ lower: [20, 70, 70], upper: [45, 255, 255] }],
  openSize: 5,
  closeSize: 9,
  /** In pixels of the analysed frame. */
  minArea: 150,
  maxArea: 120_000,
  minCircularity: 0.6,
  /** How a candidate is scored (POC's `select_best`). */
  weights: { area: 0.3, circularity: 0.3, distance: 0.4 },
  processNoise: 0.03,
  measurementNoise: 0.1,
  /** Frames the ball may be missing (hidden, too blurred) before the track is dropped. */
  maxMissedFrames: 8,
  /** Positions kept, and samples used for velocity and acceleration. */
  historyLength: 64,
  derivativeWindow: 5,
  /** Drawing, as in the POC: trail length in frames, arrow length per px/s. */
  trailLength: 32,
  velocityScale: 0.15,
} as const;

export type BallConfig = typeof BALL_CONFIG;
