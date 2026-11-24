/**
 * The match's times, measured on this phone: the log has no clock (a phone's time is not
 * another's). A guest that joined late counts from when it joined
 */
export class MatchClock {
  private readonly startedAt: number;
  private endedAt: number | undefined;
  private varSince: number | undefined;
  private readonly varDurations: number[] = [];

  constructor(private readonly now: () => number = Date.now) {
    this.startedAt = now();
  }

  /** Called whenever the replay opens or closes on this phone */
  varChanged(open: boolean) {
    if (open && this.varSince === undefined) this.varSince = this.now();
    if (!open && this.varSince !== undefined) {
      this.varDurations.push(this.now() - this.varSince);
      this.varSince = undefined;
    }
  }

  finish() {
    this.endedAt ??= this.now();
  }

  /** Length of the match, and the average time from opening the replay to its decision */
  summary(): { durationMs: number; averageVarMs: number | undefined } {
    const total = this.varDurations.reduce((sum, ms) => sum + ms, 0);
    return {
      durationMs: (this.endedAt ?? this.now()) - this.startedAt,
      averageVarMs: this.varDurations.length > 0 ? total / this.varDurations.length : undefined,
    };
  }
}
