import { View } from 'react-native';

import { colors } from './theme';

/** Next to the server's name */
export function ServeDot({ size = 16 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }}
    />
  );
}
