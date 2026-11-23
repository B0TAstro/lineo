import type { FrameCandidates } from '../arc';
import type { Candidate } from '../candidates';

/** Test scenes only: what a detector could return on a made-up rally, with where the ball really is. */

export const WIDTH = 1280;
export const HEIGHT = 720;

export type Point = { x: number; y: number };
export type BallStart = Point & { vx: number; vy: number };

export type Scene = {
  frames: FrameCandidates[];
  /** Where the ball really is at each frame, and how fast (px/s). Undefined: no ball in the scene. */
  truth: (BallStart | undefined)[];
};

export type SceneOptions = {
  seed?: number;
  fps?: number;
  /** Share of frames where the ball is detected. */
  seen?: number;
  /** Detection error in px (standard deviation). */
  noise?: number;
  /** Height (y) of the ground the ball bounces on. */
  ground?: number;
  /** The ball is hit back when it passes these x, at a random speed. */
  walls?: [number, number];
  /** Frames the ball stays undetected after a hit: it is inside the player's moving area. */
  hidden?: number;
  /** Air drag per second: with it the path is no longer an exact parabola. */
  drag?: number;
  /** Pull on the ball in px/s², down the screen. Negative: the path bends up (perspective). */
  gravity?: number;
  /** Things that flicker in place (leaves, a spectator): how many. */
  flickers?: number;
  /** Stray blobs anywhere in the picture, per frame on average. */
  strays?: number;
  /**
   * Something yellow a player carries (a shoe): where it starts, px/s along the baseline, and how
   * far it shuffles around that line, in px (a foot is never still). `lift`: px/s² it speeds up
   * towards the top of the screen (a foot going up for a step).
   */
  shoe?: { x: number; y: number; vx: number; sway?: number; lift?: number };
  /** Frames left out of the clip, by index: uneven frame times. */
  dropped?: readonly number[];
};

const GRAVITY = 900;

/** Deterministic random numbers in [0, 1): the same scene at every run. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gaussian = (random: () => number) =>
  Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

function poisson(random: () => number, mean: number): number {
  if (mean <= 0) return 0;
  const limit = Math.exp(-mean);
  let count = 0;
  let product = random();
  while (product > limit) {
    count++;
    product *= random();
  }
  return count;
}

/** A ball thrown at `start` (or no ball), filmed for `durationS`, with the clutter asked for. */
export function scene(
  durationS: number,
  start: BallStart | undefined,
  options: SceneOptions = {},
): Scene {
  const { seed = 1, fps = 60, seen = 1, noise = 0, hidden = 0, drag = 0 } = options;
  const gravity = options.gravity ?? GRAVITY;
  const random = seededRandom(seed);
  const dt = 1 / fps;
  const flickers: Point[] = Array.from({ length: options.flickers ?? 0 }, () => ({
    x: random() * WIDTH,
    y: random() * HEIGHT,
  }));
  const dropped = new Set(options.dropped ?? []);
  const scene: Scene = { frames: [], truth: [] };
  const ball = start ? { ...start } : undefined;
  let hiddenLeft = 0;
  let bounced = false;

  for (let i = 0; i < Math.round(durationS * fps); i++) {
    const candidates: Candidate[] = [];
    if (ball) {
      ball.vy += gravity * dt;
      ball.vx *= 1 - drag * dt;
      ball.vy *= 1 - drag * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (options.ground !== undefined && ball.y >= options.ground && ball.vy > 0) {
        ball.y = 2 * options.ground - ball.y;
        ball.vy *= -0.75;
        bounced = true;
      }
      const [left, right] = options.walls ?? [-Infinity, Infinity];
      const atWall = (ball.x > right && ball.vx > 0) || (ball.x < left && ball.vx < 0);
      // As in tennis, one bounce at most: the ball is hit back as it comes down again
      const comingDown =
        options.walls !== undefined &&
        options.ground !== undefined &&
        bounced &&
        ball.vy > 0 &&
        ball.y > options.ground - 60;
      if (atWall || comingDown) {
        // A real stroke lifts the ball: without it, it ends up rolling, which is not a flight
        const towards = atWall ? -Math.sign(ball.vx) : ball.x > (left + right) / 2 ? -1 : 1;
        ball.vx = towards * (450 + random() * 500);
        ball.vy = -(200 + random() * 300);
        hiddenLeft = hidden;
        bounced = false;
      }
      if (hiddenLeft > 0) hiddenLeft--;
      else if (random() < seen)
        candidates.push({
          x: ball.x + gaussian(random) * noise,
          y: ball.y + gaussian(random) * noise,
          r: 3,
        });
    }
    for (const flicker of flickers)
      if (random() < 0.35)
        candidates.push({
          x: flicker.x + gaussian(random) * 2.5,
          y: flicker.y + gaussian(random) * 2.5,
          r: 2,
        });
    for (let n = poisson(random, options.strays ?? 0); n > 0; n--)
      candidates.push({ x: random() * WIDTH, y: random() * HEIGHT, r: 2 });
    if (options.shoe) {
      const sway = options.shoe.sway ?? 0;
      const turn = 2 * Math.PI * i * dt;
      candidates.push({
        x:
          options.shoe.x +
          options.shoe.vx * i * dt +
          sway * Math.sin(turn) +
          gaussian(random) * 0.7,
        y:
          options.shoe.y +
          (sway / 3) * Math.cos(turn) -
          ((options.shoe.lift ?? 0) * (i * dt) ** 2) / 2 +
          gaussian(random) * 0.7,
        r: 2,
      });
    }

    if (dropped.has(i)) continue;
    scene.frames.push({ t: i * dt, candidates });
    scene.truth.push(ball ? { ...ball } : undefined);
  }
  return scene;
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
