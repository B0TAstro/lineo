/** A frame this close to the time wanted counts as being there: frame times are not exact. */
const NEAR_ENOUGH = 0.9;

/**
 * The frames to compare frame `centre` with, to see what passes by: the one closest to `spanS`
 * before it and the one closest to `spanS` after it. A time span rather than a number of frames:
 * the ball moves as far in two frames at 60 frames per second as in one at 30.
 *
 * `times` are the frames read so far, in order. "wait": a later frame may still be closer to the
 * time wanted. "none": no frame comes before (the first frame of a reading).
 */
export function framesToCompare(
  times: readonly number[],
  centre: number,
  spanS: number,
): { before: number; after: number } | 'wait' | 'none' {
  const at = times[centre];
  if (at === undefined || centre === 0) return 'none';
  const newest = times.at(-1) ?? at;
  if (newest - at < spanS * NEAR_ENOUGH) return 'wait';

  const closestTo = (wanted: number, from: number, to: number) => {
    let best = from;
    for (let i = from; i <= to; i++) {
      if (Math.abs((times[i] ?? Infinity) - wanted) < Math.abs((times[best] ?? Infinity) - wanted))
        best = i;
    }
    return best;
  };
  return {
    before: closestTo(at - spanS, 0, centre - 1),
    after: closestTo(at + spanS, centre + 1, times.length - 1),
  };
}
