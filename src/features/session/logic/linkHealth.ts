/** How a link is doing, judged by the host's pings that came by it. */
export type LinkHealth = 'ok' | 'unstable' | 'lost';

/** The host pings every second on each link. */
export const PING_EVERY_MS = 1000;
/** A ping within this long: the link is fine (one ping late is still fine). */
const OK_WITHIN_MS = 2500;
/** No ping for this long: the link is gone. In between, about 3 pings missed: unstable. */
const LOST_AFTER_MS = 6000;

/**
 * The health of a link from the last ping it carried, at `now`; undefined when it never carried
 * one. Thresholds to tune on a court.
 */
export function linkHealth(lastPingAt: number | undefined, now: number): LinkHealth | undefined {
  if (lastPingAt === undefined) return undefined;
  const silence = now - lastPingAt;
  if (silence < OK_WITHIN_MS) return 'ok';
  if (silence < LOST_AFTER_MS) return 'unstable';
  return 'lost';
}
