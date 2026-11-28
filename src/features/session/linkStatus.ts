import type { LinkState } from '@/shared/ui/StatusDot';

import type { LinkHealth } from './logic/linkHealth';
import type { LinkKind } from './native/Transport';
import type { GuestSession, Session } from './Session';

/** One link in the info panel: its dot (none when it is off) and a word */
export type LinkRow = { state: LinkState | undefined; word: string };

/**
 * The state of the link, always on screen: its dot, a short text for the status pill, a word for
 * the info panel, the link it goes by (the pill's icon), and each link on its own
 */
export type LinkSummary = {
  state: LinkState;
  text: string;
  word: string;
  via: LinkKind | undefined;
  bluetooth: LinkRow;
  wifi: LinkRow;
};

const HEALTH: Record<LinkHealth, LinkRow> = {
  ok: { state: 'ok', word: 'Connecté' },
  unstable: { state: 'unstable', word: 'Instable' },
  lost: { state: 'lost', word: 'Perdu' },
};

export function linkStatus(session: Session): LinkSummary {
  if (session.role === 'guest') return guestStatus(session);

  const bluetooth: LinkRow =
    session.link === 'connected'
      ? { state: 'ok', word: 'Activé' }
      : { state: 'lost', word: 'Coupé' };
  const wifi: LinkRow =
    session.wifi.length > 0
      ? { state: 'ok', word: session.byLink.wifi > 0 ? 'Connecté' : 'Activé' }
      : { state: undefined, word: 'Pas de réseau' };
  const via =
    session.link === 'connected' ? 'bluetooth' : session.wifi.length > 0 ? 'wifi' : undefined;
  if (!via) return { state: 'lost', text: 'Bluetooth coupé', word: 'Coupé', via, bluetooth, wifi };
  const phones = session.guests + 1;
  return {
    state: 'ok',
    text: phones === 1 ? 'Seul téléphone' : `${phones} téléphones liés`,
    word: 'Connecté',
    via,
    bluetooth,
    wifi,
  };
}

function guestStatus(session: GuestSession): LinkSummary {
  const { via, health, link } = session;
  const bluetooth: LinkRow = health.bluetooth
    ? HEALTH[health.bluetooth]
    : { state: 'unstable', word: link === 'connecting' ? 'Connexion' : 'Recherche' };
  const wifi: LinkRow = health.wifi
    ? HEALTH[health.wifi]
    : session.wifiKnown
      ? { state: 'unstable', word: 'Connexion' }
      : { state: undefined, word: 'Pas d’adresse' };
  const rows = { via, bluetooth, wifi };

  if (via === 'wifi') {
    const text =
      health.bluetooth === 'ok' ? 'Relié par Wi-Fi' : 'Relié par Wi-Fi · Bluetooth instable';
    return { state: health.wifi === 'ok' ? 'ok' : 'unstable', text, word: 'Wi-Fi', ...rows };
  }
  if (via === 'bluetooth' || link === 'connected') {
    return {
      state: health.bluetooth === 'unstable' ? 'unstable' : 'ok',
      text: 'Relié par Bluetooth',
      word: 'Connecté',
      ...rows,
    };
  }
  if (link === 'lost') {
    return { state: 'lost', text: 'Lien perdu, l’enregistrement continue', word: 'Perdu', ...rows };
  }
  return { state: 'unstable', text: 'Recherche de l’hôte…', word: 'Recherche', ...rows };
}
