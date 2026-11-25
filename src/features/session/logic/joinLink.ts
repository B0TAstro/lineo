import { fromBase64Url, toBase64Url } from '@/shared/lib/base64url';

import { PROTOCOL_VERSION } from './messages';
import { KEY_BYTES } from './SealedCodec';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O: read aloud without confusion

/**
 * What a guest needs to join: the session to look for, the key to talk to it, and where the host
 * listens on the local Wi-Fi (`ip:port`, none when it has no Wi-Fi).
 */
export type Join = { sessionId: string; key: string; wifi: string[] };

/** A short code for the session: the host advertises it, the QR code carries it. */
export function newSessionId(): string {
  return Array.from(
    { length: 4 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join('');
}

/** The session key, as text for the QR code and the route. */
export const newSessionKey = (randomBytes: (count: number) => Uint8Array) =>
  toBase64Url(randomBytes(KEY_BYTES));

/** The key as bytes, or null if it is not a key. */
export function decodeSessionKey(key: string): Uint8Array | null {
  const bytes = fromBase64Url(key);
  return bytes?.length === KEY_BYTES ? bytes : null;
}

export const buildJoinLink = ({ sessionId, key, wifi }: Join) =>
  `lineo://join?s=${sessionId}&k=${key}&v=${PROTOCOL_VERSION}` +
  (wifi.length > 0 ? `&w=${wifi.join(',')}` : '');

/** An `ip:port` of the local network: what a QR code or a route may carry, nothing else. */
const WIFI_ENDPOINT = /^\d{1,3}(\.\d{1,3}){3}:\d{1,5}$/;

/** The Wi-Fi addresses of a link or a route (`w`), the malformed ones dropped. */
export const toWifi = (w: string | undefined): string[] =>
  (w ?? '').split(',').filter((endpoint) => WIFI_ENDPOINT.test(endpoint));

/** The session code and its key, or null if either is malformed (a hand-made link, say). */
export function toSession(s: string | undefined, k: string | undefined, w?: string): Join | null {
  if (!s || !/^[A-Z]{4}$/.test(s) || !k || !decodeSessionKey(k)) return null;
  return { sessionId: s, key: k, wifi: toWifi(w) };
}

/**
 * The session in the link's parameters (scanned in the app, or opened from the iPhone Camera
 * app), or null if it is not a Lineo link of this version.
 */
export function toJoin(params: { s?: string; k?: string; v?: string; w?: string }): Join | null {
  if (Number(params.v) !== PROTOCOL_VERSION) return null;
  return toSession(params.s, params.k, params.w);
}

/** A scanned QR code: its parameters in any order, `w` optional. */
export function parseJoinLink(text: string): Join | null {
  const match = /^lineo:\/\/join\?(.*)$/.exec(text.trim());
  if (!match) return null;
  const params: Record<string, string> = {};
  for (const pair of (match[1] ?? '').split('&')) {
    const [name, value] = pair.split('=');
    if (name) params[name] = value ?? '';
  }
  return toJoin(params);
}
