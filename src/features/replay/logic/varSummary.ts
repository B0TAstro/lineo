import type { LoggedEvent } from '@/features/session';

/** What the VAR did during the match, for the end screen */
export type VarSummary = {
  /** Times the replay was opened */
  reviewed: number;
  /** Replays closed with a decision that did not replay the point */
  settled: number;
  /** Replays closed, whatever they decided */
  closed: number;
};

/**
 * Read from the log: every opening of the VAR, and what happened before it closed. A point given
 * back to be played again (rejected proposal, removed point) is not settled; a confirmed or
 * corrected point is, and so is closing without changing anything (the players agreed)
 */
export function varSummary(log: readonly LoggedEvent[]): VarSummary {
  const summary: VarSummary = { reviewed: 0, settled: 0, closed: 0 };
  let open = false;
  let replayed = false;
  for (const event of log) {
    switch (event.type) {
      case 'var-opened':
        summary.reviewed++;
        open = true;
        replayed = false;
        break;
      case 'point-rejected':
      case 'point-undone':
        if (open) replayed = true;
        break;
      case 'var-closed':
        if (!open) break;
        summary.closed++;
        if (!replayed) summary.settled++;
        open = false;
        break;
    }
  }
  return summary;
}
