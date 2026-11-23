import type { FrameCandidates } from './arc';
import type { BallConfig } from './ballConfig';
import type { TrackedBall } from './BallTracker';
import { findArcs } from './findArcs';
import { slopeAt, valueAt } from './fitQuadratic';
import { linkArcs } from './linkArcs';
import { withoutResidents } from './withoutResidents';

/**
 * The ball through a clip whose frames are all known (the replay): its arcs of free flight, then
 * the chain of them that is the ball. One entry per frame an arc covers, at the arc's position:
 * "detected" where a blob is on the arc, "predicted" where the ball was missed in between (hidden
 * by a player, too blurred). Frames between two arcs have no ball.
 *
 * Unlike the frame-by-frame `BallTracker`, it uses what comes after a frame as much as what came
 * before: the speed is right from the first frame after a bounce, and a stray blob cannot pull the
 * path away.
 */
export function trackClip(
  frames: readonly FrameCandidates[],
  size: { width: number; height: number },
  config: BallConfig,
): TrackedBall[] {
  const passing = withoutResidents(frames, size.width, config);
  const arcs = findArcs(passing, size.width, config);
  const balls: TrackedBall[] = [];

  for (const { arc, first, last } of linkArcs(arcs, passing, size.width, config)) {
    const seen = new Map(arc.hits.map((hit) => [hit.frame, hit.candidate]));
    let radius = arc.hits[0]?.candidate.r ?? 0;
    let missed = 0;
    for (let frame = first; frame <= last; frame++) {
      const t = frames[frame]?.t;
      if (t === undefined) continue;
      const blob = seen.get(frame);
      missed = blob ? 0 : missed + 1;
      if (blob) radius = blob.r;
      balls.push({
        t,
        x: valueAt(arc.x, t),
        y: valueAt(arc.y, t),
        r: radius,
        vx: slopeAt(arc.x, t),
        vy: slopeAt(arc.y, t),
        ax: 2 * arc.x.c,
        ay: 2 * arc.y.c,
        state: blob ? 'detected' : 'predicted',
        missed,
      });
    }
  }
  return balls;
}
