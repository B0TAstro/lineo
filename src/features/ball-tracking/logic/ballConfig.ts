/**
 * Ball detection and tracking settings, measured on a match filmed from behind the baseline
 * (1280 px wide): there the ball is 2 to 10 px wide, among a crowd, players in
 * yellow shoes and their shadows. The POC's settings (configs/ball.yaml) were a starting point
 * for a ball 30 cm from a webcam, and find nothing there.
 *
 * Sizes and distances are fractions of the frame width, so they hold at any resolution.
 */
export const BALL_CONFIG = {
  /** Frames are read at this long side: a far ball is only a few pixels, scaling down loses it. */
  maxSide: 1280,
  /**
   * A frame is compared with the frames this long before and after it (two frames away at 60
   * frames per second, one at 30): the ball is what is there in between, and gone on both sides.
   */
  motionSpanS: 0.03,
  /** Grey levels (0-255) the ball is brighter by than the same place before and after. */
  brighterBy: 25,
  /**
   * And yellower by, as min(red, green) - blue. Small: at 2 px the ball's colour is mostly the
   * background's (video stores colour at half the resolution), its brightness is what stands out.
   */
  yellowerBy: 4,
  /** Red may be above green by this much: skin and clay are redder, the ball is not. */
  maxRedOverGreen: 10,
  /** The grey picture is blurred by this kernel before looking for what moved (not for the ball). */
  blurSize: 3,
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
  // Live tracking (dev only): the frame-by-frame `BallTracker`
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
  // Replay: the path is found on all the frames at once, as arcs of free flight (`trackClip`).
  // Speeds in frame widths per second, distances in frame widths: they hold at any resolution and
  // frame rate.
  /**
   * A blob with others within this distance, on this share of the frames of this time span,
   * stays there (a foot, a leaf, a spectator): the ball only passes.
   */
  residentRadius: 0.012,
  residentSpanS: 1.5,
  residentShare: 0.4,
  /** The fastest the ball crosses the picture. */
  maxSpeed: 4,
  /** Three blobs within this time, about in line, can start an arc. */
  seedSpanS: 0.12,
  /** How far the middle blob may be from the straight line between the two others. */
  seedTolerance: 0.006,
  /** The three blobs must move at least this fast: not one blob flickering in place. */
  minSeedSpeed: 0.04,
  /** A blob this close to an arc is the ball on that arc. */
  arcTolerance: 0.004,
  /** An arc looks this far before its first blob and after its last one for more. */
  arcReachS: 0.1,
  /** An arc is kept if it goes through this many blobs, on this share of its frames... */
  minArcHits: 6,
  minArcDensity: 0.3,
  /** ...and the middle half of them travels this far: a flicker never does. */
  minArcTravel: 0.012,
  /**
   * ...and its path bends at least this far from a straight line, down the screen: a ball in
   * flight falls, a yellow shoe sliding along the baseline does not. Or bends up this much, which
   * only perspective does (a fast ball above the camera, close to it): a lifted foot bends less.
   */
  minArcBend: 0.002,
  minArcRise: 0.008,
  /** Two arcs follow each other if they meet within this distance, overlapping at most this long. */
  joinDistance: 0.03,
  joinOverlapS: 0.15,
  /** Positions kept, and samples used for velocity and acceleration (as the POC). */
  historyLength: 64,
  derivativeWindow: 5,
  /** Drawing, as in the POC: trail length in frames, arrow length per px/s. */
  trailLength: 32,
  velocityScale: 0.15,
} as const;

/** The same settings with any value: what a court changes (`ballConfigFor`). */
export type BallConfig = { readonly [Setting in keyof typeof BALL_CONFIG]: number };
