import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { colors, fonts, radius } from '@/shared/ui/theme';
import type { SideId } from '@/sports/tennis';

import type { ReplayOutcome } from '../../logic/outcome';

/** A side of the net as the replay shows it: its name and its role on this point */
export type Side = { id: SideId; name: string; role: string };

/**
 * The panel beside the video: the three outcomes, always available. Choosing one asks the other
 * side to confirm on the same screen: the result only counts once both sides agree
 */
export function DecisionPanel({
  sides,
  onOutcome,
  onClose,
  footer,
}: {
  sides: readonly [Side, Side];
  onOutcome: (outcome: ReplayOutcome) => void;
  onClose: () => void;
  /** Dev builds only: the test videos switch */
  footer?: ReactNode;
}) {
  const [chosen, setChosen] = useState<ReplayOutcome>();
  const chosenLabel =
    chosen?.kind === 'replayed'
      ? 'Point rejoué'
      : `Point ${sides.find((s) => chosen?.kind === 'point' && s.id === chosen.winner)?.name ?? ''}`;

  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.section}>Point contesté</Text>
        <IconButton
          icon="panelClose"
          label="Fermer la décision"
          variant="plain"
          onPress={onClose}
        />
      </View>
      <Text style={styles.title}>Décision</Text>
      <Text style={styles.hint}>
        {chosen
          ? `${chosenLabel} : l’autre camp est d’accord ?`
          : 'Choisissez ensemble, l’autre camp confirme.'}
      </Text>

      {chosen ? (
        <View style={styles.options}>
          <Button label="Valider" onPress={() => onOutcome(chosen)} />
          <Button label="Changer" variant="ghost" onPress={() => setChosen(undefined)} />
        </View>
      ) : (
        <View style={styles.options}>
          {sides.map((side) => (
            <Option
              key={side.id}
              badge={<Text style={styles.badgeText}>{side.name.charAt(0).toUpperCase()}</Text>}
              title={`Point ${side.name}`}
              detail={side.role}
              onPress={() => setChosen({ kind: 'point', winner: side.id })}
            />
          ))}
          <Option
            badge={<Icon name="rewind" size={16} />}
            title="Point rejoué"
            detail="À rejouer"
            onPress={() => setChosen({ kind: 'replayed' })}
          />
        </View>
      )}
      {footer}
    </ScrollView>
  );
}

function Option({
  badge,
  title,
  detail,
  onPress,
}: {
  badge: ReactNode;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.badge}>{badge}</View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.32,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  title: { fontFamily: fonts.light, fontSize: 24, letterSpacing: -0.24, color: colors.text },
  hint: { fontFamily: fonts.light, fontSize: 12, lineHeight: 17, color: colors.textDim },
  options: { gap: 8, marginTop: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 50,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: colors.bg,
  },
  pressed: { opacity: 0.6 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  optionDetail: { fontFamily: fonts.light, fontSize: 11, color: colors.textDim },
});
