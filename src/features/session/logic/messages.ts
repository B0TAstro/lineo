import type { LoggedEvent, MatchEvent } from './matchLog';

/**
 * Messages between phones. Star topology: guests only talk to the host. Never any video.
 *
 * - A guest asks for the whole log when it connects, or when it notices a missing event.
 * - The host sends every new event to all guests, and the whole log when one asks.
 * - Every second the host pings on each link, with the addresses it listens on over Wi-Fi; each
 *   guest answers on the link the ping came by. Both sides judge their links by it (heartbeat).
 */
export type GuestMessage =
  { t: 'intent'; event: MatchEvent } | { t: 'sync' } | { t: 'pong'; n: number; device: string };

export type HostMessage<Setup> =
  | { t: 'snapshot'; setup: Setup; log: LoggedEvent[] }
  | { t: 'event'; event: LoggedEvent }
  | { t: 'ping'; n: number; wifi: string[] };

/**
 * 2: every message is sealed with the session key from the QR code.
 * 3: and signed with the side that sealed it (host or guest).
 * 4: heartbeat (ping, pong) and the host's Wi-Fi addresses in the QR code.
 */
export const PROTOCOL_VERSION = 4;
