import type { LinkState } from '@/shared/ui/StatusDot';

import type { Session } from './Session';

/** The state of the link, always on screen: its dot, a short text for the status pill, a word for the info panel */
export type LinkSummary = { state: LinkState; text: string; word: string };

export function linkStatus(session: Session): LinkSummary {
  if (session.role === 'host') {
    if (session.link === 'off') return { state: 'lost', text: 'Bluetooth coupé', word: 'Coupé' };
    const phones = session.guests + 1;
    return {
      state: 'ok',
      text: phones === 1 ? 'Seul téléphone' : `${phones} téléphones liés`,
      word: 'Connecté',
    };
  }
  switch (session.link) {
    case 'connected':
      return { state: 'ok', text: 'Relié à l’hôte', word: 'Connecté' };
    case 'lost':
      return { state: 'lost', text: 'Lien perdu, l’enregistrement continue', word: 'Perdu' };
    default:
      return { state: 'unstable', text: 'Recherche de l’hôte…', word: 'Recherche' };
  }
}
