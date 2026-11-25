import { useLocalSearchParams } from 'expo-router';

import { GuestMatch, HostMatch, InvalidLink } from '@/features/match';
import { toSession } from '@/features/session';
import { useOrientation } from '@/shared/ui/orientation';

export default function MatchRoute() {
  useOrientation('landscape');
  // role 'host' | 'guest', s session code, k session key, w the host's Wi-Fi addresses, form match settings
  const params = useLocalSearchParams<{
    role?: string;
    s?: string;
    k?: string;
    w?: string;
    form?: string;
  }>();

  const session = toSession(params.s, params.k, params.w);
  if (!session) return <InvalidLink />;
  if (params.role === 'guest') {
    return (
      <GuestMatch sessionId={session.sessionId} sessionKey={session.key} wifi={session.wifi} />
    );
  }
  if (params.role === 'host') {
    return (
      <HostMatch sessionId={session.sessionId} sessionKey={session.key} rawForm={params.form} />
    );
  }
  return <InvalidLink />;
}
