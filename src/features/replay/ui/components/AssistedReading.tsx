import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { Icon } from '@/shared/ui/Icon';
import { colors, fonts } from '@/shared/ui/theme';

/** What the assisted reading says about the disputed bounce. Never a verdict, always its doubt */
export type Reading = {
  /** 0..1: how sure the reading is that the ball was out */
  outShare: number;
  bounce: string;
  line: string;
  margin: string;
};

/**
 * UI only: the in / out reading arrives with v0.9 (court lines, bounce, margin of error). Until
 * then a release build shows dashes, and a dev build the mockup's figures, marked "Aperçu", to
 * check the design: the app must never show a made-up figure to players
 */
const PREVIEW: Reading | undefined = __DEV__
  ? { outShare: 0.7, bounce: '4 cm à l’extérieur', line: 'de côté', margin: '± 9 cm' }
  : undefined;

/** Between 40 and 60 %, the reading says it cannot tell (design.md §5.7) */
const UNSURE = { from: 0.4, to: 0.6 };
const GAUGE = { width: 208, height: 14 };

const verdictWord = (share: number) =>
  share >= UNSURE.to ? 'dehors' : share <= UNSURE.from ? 'dedans' : 'incertain';
const percent = (share: number) => Math.round((share >= 0.5 ? share : 1 - share) * 100);

/**
 * Over the replay once the whole point has been tracked: how sure the reading is that the ball was
 * out, the gauge from in to out, and the figures behind it. Closed, it folds into a small pill
 */
export function AssistedReading({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const reading = PREVIEW;
  const headline = reading ? `${percent(reading.outShare)} %` : '— %';
  const word = reading ? verdictWord(reading.outShare) : 'à venir';

  if (!open) {
    return (
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la lecture assistée"
        style={styles.pill}
      >
        <Icon name="sparkle" size={16} color={colors.accent} />
        <Text style={styles.pillText}>
          {headline} {word}
        </Text>
        <Icon name="chevronRight" size={16} />
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="sparkle" size={16} color={colors.accent} />
        <Text style={styles.section}>Lecture assistée</Text>
        {reading && <Text style={styles.preview}>Aperçu</Text>}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Masquer la lecture assistée"
          hitSlop={8}
          style={styles.close}
        >
          <Icon name="close" size={16} />
        </Pressable>
      </View>

      <View style={styles.headline}>
        <Text style={styles.percent}>{headline}</Text>
        <Text style={styles.word}>{word}</Text>
      </View>

      <View style={styles.gaugeBlock}>
        <Gauge share={reading?.outShare} />
        <View style={styles.gaugeLabels}>
          <Text style={styles.gaugeLabel}>Dedans</Text>
          <Text style={styles.gaugeLabel}>Incertain</Text>
          <Text style={styles.gaugeLabel}>Dehors</Text>
        </View>
      </View>

      <View style={styles.rule} />
      <Figure label="Rebond" value={reading?.bounce ?? '—'} />
      <Figure label="Ligne" value={reading?.line ?? '—'} />
      <Figure label="Marge d’erreur" value={reading?.margin ?? '—'} />
    </View>
  );
}

/** From in (left) to out (right): the unsure band in the middle, lemon from the middle to the reading */
function Gauge({ share }: { share: number | undefined }) {
  const { width, height } = GAUGE;
  const at = share === undefined ? undefined : share * width;
  const middle = width / 2;
  return (
    <Svg width={width} height={height}>
      <Rect y={4} width={width} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.15} />
      <Rect
        x={UNSURE.from * width}
        y={4}
        width={(UNSURE.to - UNSURE.from) * width}
        height={6}
        fill="#FFFFFF"
        fillOpacity={0.12}
      />
      {at !== undefined && (
        <>
          <Rect
            x={Math.min(middle, at)}
            y={4}
            width={Math.abs(at - middle)}
            height={6}
            rx={3}
            fill={colors.accent}
          />
          <Circle cx={at} cy={7} r={6} fill={colors.accent} stroke={colors.bg} strokeWidth={2} />
        </>
      )}
    </Svg>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={styles.figureValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,245,60,0.35)',
    backgroundColor: 'rgba(10,10,10,0.88)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.32,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  preview: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.onAccent,
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  percent: { fontFamily: fonts.light, fontSize: 34, letterSpacing: -0.68, color: colors.accent },
  word: { fontFamily: fonts.light, fontSize: 18, color: colors.text },
  gaugeBlock: { gap: 6 },
  gaugeLabels: { width: GAUGE.width, flexDirection: 'row', justifyContent: 'space-between' },
  gaugeLabel: { fontFamily: fonts.light, fontSize: 10, color: colors.textDim },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  figure: { flexDirection: 'row', justifyContent: 'space-between' },
  figureLabel: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
  figureValue: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,245,60,0.35)',
    backgroundColor: 'rgba(10,10,10,0.88)',
  },
  pillText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
});
