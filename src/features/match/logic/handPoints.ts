import { type LoggedEvent, replayLog } from '@/features/session';
import { type MatchSetup, scoreLabel, sideName, type SideId } from '@/sports/tennis';

/** A point given or taken back by hand, with + or −: who for, on which phone, the score after */
export type HandPoint = {
  added: boolean;
  side: SideId;
  name: string;
  phone: string;
  score: string;
};

/**
 * Every + and − tapped during the match, in order, for the end screen: they count at once with no
 * confirmation, so everyone can see afterwards what was tapped and where. The phones are named by
 * their order of first tap: the host, then « Téléphone 2 », « Téléphone 3 »…
 */
export function handPoints(setup: MatchSetup, log: readonly LoggedEvent[]): HandPoint[] {
  const phones = new Map<string, string>([['host', 'Hôte']]);
  const phoneName = (by: string) => {
    if (!phones.has(by)) phones.set(by, `Téléphone ${phones.size + 1}`);
    return phones.get(by) ?? by;
  };
  const result: HandPoint[] = [];
  log.forEach((event, i) => {
    const tapped = event.type === 'point-tapped';
    const undone = event.type === 'point-undone' && event.by !== undefined;
    if (!tapped && !undone) return;
    const before = replayLog(setup, log.slice(0, i));
    const after = replayLog(setup, log.slice(0, i + 1));
    const side = tapped ? event.winner : before.points.at(-1);
    if (side === undefined) return;
    result.push({
      added: tapped,
      side,
      name: sideName(after.state, side),
      phone: phoneName(event.by ?? ''),
      score: scoreLabel(after.state),
    });
  });
  return result;
}
