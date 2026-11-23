import {
  type Arc,
  firstFrame,
  type FrameCandidates,
  type Hit,
  lastFrame,
  positionAt,
  speedAt,
} from './arc';
import type { BallConfig } from './ballConfig';
import type { Candidate } from './candidates';
import { fitQuadratic } from './fitQuadratic';

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Frames after `from` that a seed may use for its second and third blob: up to two frames missed. */
const SEED_STEPS = [1, 2, 3];

/**
 * Every stretch of free flight in the clip, found on all its frames at once (after Yan, Christmas
 * and Kittler's tennis ball tracker, BMVC 2005).
 *
 * A single frame cannot tell the ball from the other blobs, and neither can two: what sets the
 * ball apart is that its blobs line up on a parabola, frame after frame. So:
 * 1. a seed is three blobs close in time and about in line, moving;
 * 2. the parabola through them picks up the blobs it passes close to, a little further at each
 *    pass, and is fitted again on all of them, until it finds no more;
 * 3. it is kept if enough frames agree with it and it really travels: blobs flickering in place
 *    and strays do not.
 * A bounce or a hit breaks the parabola: the arc stops there, and another one starts after it.
 */
export function findArcs(
  frames: readonly FrameCandidates[],
  width: number,
  config: BallConfig,
): Arc[] {
  const seedTolerance = config.seedTolerance * width;
  const arcs: Arc[] = [];
  /**
   * The arc each blob was last grown into, kept or not. Three blobs of one arc would only grow
   * into it again: without this, a shoe seen on every frame is grown, and rejected, once per frame.
   */
  const grownInto = new Map<Candidate, number>();
  let grown = 0;

  frames.forEach((first, i) => {
    for (const toMiddle of SEED_STEPS) {
      for (const toLast of SEED_STEPS) {
        const middle = frames[i + toMiddle];
        const last = frames[i + toMiddle + toLast];
        if (!middle || !last) continue;
        const span = last.t - first.t;
        if (span <= 0 || span > config.seedSpanS) continue;
        const share = (middle.t - first.t) / span;

        for (const a of first.candidates) {
          for (const c of last.candidates) {
            const moved = distance(a, c);
            if (moved < config.minSeedSpeed * width * span) continue;
            if (moved > config.maxSpeed * width * span) continue;
            const between = { x: a.x + (c.x - a.x) * share, y: a.y + (c.y - a.y) * share };

            for (const b of middle.candidates) {
              if (distance(b, between) > seedTolerance) continue;
              const known = grownInto.get(a);
              if (known !== undefined && known === grownInto.get(b) && known === grownInto.get(c))
                continue;
              const arc = grow(frames, width, config, [
                { frame: i, candidate: a },
                { frame: i + toMiddle, candidate: b },
                { frame: i + toMiddle + toLast, candidate: c },
              ]);
              grown++;
              for (const hit of arc.hits) grownInto.set(hit.candidate, grown);
              if (isFlight(arc, frames, width, config)) arcs.push(arc);
            }
          }
        }
      }
    }
  });

  return withoutEchoes(arcs).sort(
    (a, b) => firstFrame(a) - firstFrame(b) || lastFrame(a) - lastFrame(b),
  );
}

/**
 * Drops the arcs that mostly go through the blobs of longer ones: the same flight fitted twice, or
 * a tight curve that takes the end of one flight and the start of the next for a single one (the
 * few frames around a bounce are close to a parabola). They say nothing the longer arcs do not.
 */
function withoutEchoes(arcs: readonly Arc[]): Arc[] {
  const explained = new Set<Candidate>();
  const kept: Arc[] = [];
  for (const arc of [...arcs].sort((a, b) => b.hits.length - a.hits.length)) {
    const fresh = arc.hits.filter((hit) => !explained.has(hit.candidate)).length;
    if (fresh * 2 < arc.hits.length) continue;
    kept.push(arc);
    for (const hit of arc.hits) explained.add(hit.candidate);
  }
  return kept;
}

function fit(frames: readonly FrameCandidates[], hits: readonly Hit[]): Arc {
  const times = hits.map((hit) => frames[hit.frame]?.t ?? 0);
  return {
    x: fitQuadratic(
      times,
      hits.map((hit) => hit.candidate.x),
    ),
    y: fitQuadratic(
      times,
      hits.map((hit) => hit.candidate.y),
    ),
    hits,
  };
}

/** Fits, picks up the blobs close to the fit, and again, as long as each pass finds more. */
function grow(
  frames: readonly FrameCandidates[],
  width: number,
  config: BallConfig,
  seed: readonly Hit[],
): Arc {
  let arc = fit(frames, seed);
  for (;;) {
    const hits = hitsAlong(frames, arc, config.arcTolerance * width, config.arcReachS);
    if (hits.length <= arc.hits.length) return arc;
    arc = fit(frames, hits);
  }
}

/** The blob closest to the arc in each frame, from a little before its first one to a little after its last. */
function hitsAlong(
  frames: readonly FrameCandidates[],
  arc: Arc,
  tolerance: number,
  reachS: number,
): Hit[] {
  const fromT = (frames[firstFrame(arc)]?.t ?? 0) - reachS;
  const toT = (frames[lastFrame(arc)]?.t ?? 0) + reachS;
  let start = firstFrame(arc);
  while (start > 0 && (frames[start - 1]?.t ?? -Infinity) >= fromT) start--;

  const hits: Hit[] = [];
  for (let frame = start; frame < frames.length; frame++) {
    const { t, candidates } = frames[frame] as FrameCandidates;
    if (t > toT) break;
    const expected = positionAt(arc, t);
    let closest: Candidate | undefined;
    let closestDistance = tolerance;
    for (const candidate of candidates) {
      const d = distance(candidate, expected);
      if (d <= closestDistance) {
        closest = candidate;
        closestDistance = d;
      }
    }
    if (closest) hits.push({ frame, candidate: closest });
  }
  return hits;
}

/** Enough frames agree, without long holes, the arc travels, and no faster than a ball can. */
function isFlight(
  arc: Arc,
  frames: readonly FrameCandidates[],
  width: number,
  config: BallConfig,
): boolean {
  const { hits } = arc;
  const timeOf = (hit: Hit | undefined) => frames[hit?.frame ?? 0]?.t ?? 0;
  if (hits.length < config.minArcHits) return false;
  if (hits.length / (lastFrame(arc) - firstFrame(arc) + 1) < config.minArcDensity) return false;

  // Travel of the middle half of the blobs: a flicker with one stray blob far from it at one end
  // goes a long way on paper, but almost all its blobs are in one place.
  const quarter = Math.floor(hits.length / 4);
  const from = positionAt(arc, timeOf(hits[quarter]));
  const to = positionAt(arc, timeOf(hits[hits.length - 1 - quarter]));
  if (distance(from, to) < config.minArcTravel * width) return false;

  // How far the path bends away from a straight line over its time, down the screen (positive)
  // or up. Gravity always bends a flight down. A shoe sliding along the baseline is seen on many
  // frames and travels, but in a straight line, or bending up a little when the foot is lifted.
  // Only perspective bends a flight up, and then strongly: a fast ball above the camera, close to it.
  const duration = timeOf(hits.at(-1)) - timeOf(hits[0]);
  const bend = (arc.y.c * duration * duration) / 4;
  if (bend < config.minArcBend * width && bend > -config.minArcRise * width) return false;

  const fastest = Math.max(speedAt(arc, timeOf(hits[0])), speedAt(arc, timeOf(hits.at(-1))));
  return fastest <= config.maxSpeed * width;
}
