import { View } from 'react-native';

import { colors } from './theme';

export type LinkState = 'ok' | 'unstable' | 'lost';

const COLOR: Record<LinkState, string> = {
  ok: colors.accent,
  unstable: colors.warning,
  lost: colors.danger,
};

/** The state of the link, always small: lemon when it holds, orange when unstable, red when lost */
export function StatusDot({ state, size = 14 }: { state: LinkState; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLOR[state] }}
    />
  );
}
