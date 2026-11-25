import type { LinkHealth } from './linkHealth';

type LinkKind = 'bluetooth' | 'wifi';

/** Bluetooth must be fine for this long before the guest leaves the Wi-Fi for it again. */
export const BACK_TO_BLUETOOTH_MS = 10_000;

/**
 * The link a guest sends on. Bluetooth first; the Wi-Fi when Bluetooth falters and the Wi-Fi is
 * fine; back to Bluetooth only once it has been fine for a while, so a link on the edge does not
 * make the guest swing from one to the other. Undefined: no link at all.
 */
export function chooseLink({
  current,
  bluetooth,
  wifi,
  bluetoothOkForMs,
}: {
  current: LinkKind | undefined;
  bluetooth: LinkHealth | undefined;
  wifi: LinkHealth | undefined;
  /** How long Bluetooth has been 'ok' without a break (0 when it is not). */
  bluetoothOkForMs: number;
}): LinkKind | undefined {
  if (current === 'wifi' && wifi === 'ok') {
    return bluetooth === 'ok' && bluetoothOkForMs >= BACK_TO_BLUETOOTH_MS ? 'bluetooth' : 'wifi';
  }
  if (bluetooth === 'ok') return 'bluetooth';
  if (wifi === 'ok') return 'wifi';
  // Neither fine: the least bad, the one in use first
  if (current === 'wifi' && wifi === 'unstable') return 'wifi';
  if (bluetooth === 'unstable') return 'bluetooth';
  if (wifi === 'unstable') return 'wifi';
  return undefined;
}
