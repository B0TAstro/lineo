import LogoFull from '../../../assets/logo/lineo-full.svg';
import LogoSymbol from '../../../assets/logo/lineo-symbol.svg';

/** Sizes in Figma: the logo scales, never recomposed or recoloured */
const RATIO = { full: 242 / 152, symbol: 1 } as const;

/** The Lineo logo, always on a dark background: `full` (the name, its o is the ball) or `symbol` (the ball alone) */
export function Logo({
  variant = 'full',
  height,
}: {
  variant?: keyof typeof RATIO;
  height: number;
}) {
  const Svg = variant === 'full' ? LogoFull : LogoSymbol;
  return <Svg width={height * RATIO[variant]} height={height} />;
}
