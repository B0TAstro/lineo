import { type Arc, firstFrame, type FrameCandidates, lastFrame, positionAt } from './arc';
import type { BallConfig } from './ballConfig';

/** An arc of the ball's path, and the frames it speaks for (first and last included). */
export type ArcPiece = { arc: Arc; first: number; last: number };

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The ball's path through the clip: the chain of arcs seen on the most frames, where each arc
 * starts where the one before could have taken the ball. There is one ball: of two arcs at the
 * same time one is something else (a shoe, another court's ball), and an arc too far to reach
 * is not the next one.
 *
 * Best chain ending at each arc, built in time order (dynamic programming, as the longest path of
 * a graph whose edges are "can follow").
 */
export function linkArcs(
  arcs: readonly Arc[],
  frames: readonly FrameCandidates[],
  width: number,
  config: BallConfig,
): ArcPiece[] {
  const ordered = [...arcs].sort(
    (a, b) => firstFrame(a) - firstFrame(b) || lastFrame(a) - lastFrame(b),
  );
  const timeOf = (frame: number) => frames[frame]?.t ?? 0;

  /** Where `next` takes over from `previous`: the frame of the overlap where they are closest. */
  const crossing = (previous: Arc, next: Arc) => {
    let frame = firstFrame(next);
    let gap = Infinity;
    for (let f = firstFrame(next); f <= lastFrame(previous); f++) {
      const d = distance(positionAt(previous, timeOf(f)), positionAt(next, timeOf(f)));
      if (d < gap) {
        gap = d;
        frame = f;
      }
    }
    return { frame, gap };
  };

  const canFollow = (previous: Arc, next: Arc) => {
    if (firstFrame(previous) >= firstFrame(next) || lastFrame(previous) >= lastFrame(next))
      return false;
    const endT = timeOf(lastFrame(previous));
    const startT = timeOf(firstFrame(next));
    const reach = config.joinDistance * width;
    if (startT <= endT)
      return endT - startT <= config.joinOverlapS && crossing(previous, next).gap <= reach;
    // A hole between them: the ball has had that long to get from one to the other
    return (
      distance(positionAt(previous, endT), positionAt(next, startT)) <=
      reach + config.maxSpeed * width * (startT - endT)
    );
  };

  const total: number[] = [];
  const before: number[] = [];
  ordered.forEach((arc, i) => {
    total[i] = arc.hits.length;
    before[i] = -1;
    for (let j = 0; j < i; j++) {
      const previous = ordered[j] as Arc;
      if (!canFollow(previous, arc)) continue;
      // Frames both arcs cover count once
      const shared = Math.max(0, lastFrame(previous) - firstFrame(arc) + 1);
      const chained = (total[j] ?? 0) + arc.hits.length - shared;
      if (chained > (total[i] ?? 0)) {
        total[i] = chained;
        before[i] = j;
      }
    }
  });

  let end = -1;
  total.forEach((value, i) => {
    if (value > (total[end] ?? 0)) end = i;
  });
  const chain: Arc[] = [];
  for (let i = end; i >= 0; i = before[i] ?? -1) chain.unshift(ordered[i] as Arc);

  const pieces = chain.map((arc) => ({ arc, first: firstFrame(arc), last: lastFrame(arc) }));
  pieces.forEach((piece, i) => {
    const previous = pieces[i - 1];
    if (!previous || previous.last < piece.first) return;
    // Never before the previous piece's own start, so it keeps at least one frame
    const cut = Math.max(crossing(previous.arc, piece.arc).frame, previous.first + 1);
    previous.last = cut - 1;
    piece.first = cut;
  });
  return pieces;
}
