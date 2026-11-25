import type { MatchSetup } from './matchSetup';
import { applyPoint, createMatch } from './stateMachine';
import type { SideId } from './types';

/** Games of each side in one set (points for a match tie-break) */
export type SetScore = Record<SideId, number>;

/**
 * The score of every finished set, replayed from the winners of the points: the state only keeps
 * the current set, the match screen shows the earlier ones too
 */
export function setScores(setup: MatchSetup, winners: readonly SideId[]): SetScore[] {
  let state = createMatch(setup.config, setup.firstServer);
  const sets: SetScore[] = [];
  for (const winner of winners) {
    const next = applyPoint(state, winner);
    const setOver = state.config.sides.some((side) => next.sets[side.id] !== state.sets[side.id]);
    if (setOver) {
      // The set ends on this point: what it stood at, plus the game (or tie-break point) just won
      const before = state.tieBreak?.isSuper ? state.tieBreak.points : state.games;
      sets.push({ ...before, [winner]: (before[winner] ?? 0) + 1 });
    }
    state = next;
  }
  return sets;
}
