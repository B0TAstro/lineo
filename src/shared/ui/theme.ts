import type { TextStyle } from 'react-native';

/** Lineo design tokens */
export const colors = {
  bg: '#0A0A0A',
  card: '#161816',
  text: '#FFFFFF',
  textDim: '#8A8F8C',
  textSoft: 'rgba(255,255,255,0.6)',
  accent: '#D4F53C',
  onAccent: '#0A0A0A',
  warning: '#F2A93B',
  danger: '#E5484D',
  borderFaint: 'rgba(255,255,255,0.18)',
  border: 'rgba(255,255,255,0.3)',
  borderField: 'rgba(255,255,255,0.35)',
  borderStrong: 'rgba(255,255,255,0.9)',
  divider: 'rgba(255,255,255,0.08)',
} as const;

/** Grid of 8 */
export const space = { s: 8, m: 16, l: 24 } as const;
export const radius = 12;
export const radiusCard = 16;
export const borderWidth = 1.5;
export const touch = 64;
export const touchMatch = 80;

/** Outfit typo: same family name per weight on iOS and Android */
export const fonts = {
  thin: 'Outfit-Thin',
  light: 'Outfit-Light',
  regular: 'Outfit-Regular',
  medium: 'Outfit-Medium',
  semibold: 'Outfit-SemiBold',
} as const;

/** The 5 text styles of the design system */
export const type = {
  score: { fontFamily: fonts.thin, fontSize: 160, fontVariant: ['tabular-nums'] },
  title: { fontFamily: fonts.light, fontSize: 32, letterSpacing: -0.64 },
  button: { fontFamily: fonts.medium, fontSize: 20 },
  body: { fontFamily: fonts.light, fontSize: 16 },
  section: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;
