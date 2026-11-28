import { router } from 'expo-router';

import { useGuestSession } from '@/features/session';
import { Button } from '@/shared/ui/Button';
import { MessageScreen } from '@/shared/ui/MessageScreen';

import { MatchScreen } from './MatchScreen';

/** A phone that scanned the QR code: waits for the host's log, then shows the same match */
export function GuestMatch({
  sessionId,
  sessionKey,
  wifi,
}: {
  sessionId: string;
  sessionKey: string;
  /** The host's Wi-Fi addresses, from the QR code */
  wifi: string[];
}) {
  const session = useGuestSession(sessionId, sessionKey, wifi);
  if (!session.view || !session.form) {
    return (
      <MessageScreen
        message={
          session.link === 'connecting'
            ? 'Connexion à l’hôte…'
            : `Recherche de la session ${sessionId}…`
        }
        hint="Gardez les deux téléphones proches, avec le Bluetooth activé ou sur le même Wi-Fi."
      >
        <Button label="Annuler" variant="secondary" onPress={() => router.replace('/')} />
      </MessageScreen>
    );
  }
  return <MatchScreen session={{ ...session, form: session.form, view: session.view }} />;
}
