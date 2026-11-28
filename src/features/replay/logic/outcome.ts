import type { MatchEvent, MatchView } from '@/features/session';
import type { SideId } from '@/sports/tennis';

/** What the players decided, looking at the replay */
export type ReplayOutcome = { kind: 'point'; winner: SideId } | { kind: 'replayed' };

/**
 * The events that record the players' decision, then send every phone back to the score: the
 * last counted point is kept, given to the other side, or removed (played again)
 */
export function outcomeEvents(view: MatchView, outcome: ReplayOutcome): MatchEvent[] {
  const events: MatchEvent[] = [];
  if (outcome.kind === 'point') {
    if (view.points.at(-1) !== outcome.winner) {
      events.push({ type: 'point-corrected', winner: outcome.winner });
    }
  } else {
    events.push({ type: 'point-undone' });
  }
  events.push({ type: 'var-closed' });
  return events;
}
