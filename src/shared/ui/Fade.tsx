import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** A dark gradient over a video, so white text stays readable on a bright court */
export function Fade({
  from,
  to,
  style,
}: {
  /** Opacity of the black at the top, then at the bottom */
  from: number;
  to: number;
  style: ViewStyle;
}) {
  const id = `fade-${from}-${to}`;
  return (
    <View pointerEvents="none" style={style}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0A0A0A" stopOpacity={from} />
            <Stop offset="1" stopColor="#0A0A0A" stopOpacity={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
