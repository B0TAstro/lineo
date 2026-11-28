import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/shared/ui/Icon';
import { ServeDot } from '@/shared/ui/ServeDot';
import { colors, fonts, type } from '@/shared/ui/theme';
import { type MatchState, pointText, type SetScore, sideName, type SideId } from '@/sports/tennis';

/** The point buttons next to each name: + proposes the point, − takes back the last one */
export type PointControls = {
  canAdd: boolean;
  canRemove: (side: SideId) => boolean;
  onAdd: (side: SideId) => void;
  onRemove: (side: SideId) => void;
};

/** The match screen's score: the points, readable from a distance, and the games of every set */
export function ScoreDisplay({
  state,
  sets,
  teams,
  controls,
}: {
  state: MatchState;
  /** Finished sets, oldest first */
  sets: SetScore[];
  /** UI only: the players of each team in doubles, shown under its name */
  teams: Record<SideId, string[]> | undefined;
  controls: PointControls;
}) {
  const [a, b] = state.config.sides;
  const current: SetScore = { [a.id]: state.games[a.id] ?? 0, [b.id]: state.games[b.id] ?? 0 };

  const side = (id: SideId) => {
    const serving = state.server === id && state.matchWonBy === undefined;
    const players = teams?.[id];
    return (
      <View style={styles.side}>
        <View style={styles.nameRow}>
          <PointButton
            icon="minus"
            label={`Retirer le dernier point de ${sideName(state, id)}`}
            disabled={!controls.canRemove(id)}
            onPress={() => controls.onRemove(id)}
          />
          <View style={styles.name}>
            {serving && !players && <ServeDot size={10} />}
            <Text style={styles.nameText} numberOfLines={1}>
              {sideName(state, id)}
            </Text>
          </View>
          <PointButton
            icon="plus"
            label={`Point pour ${sideName(state, id)}`}
            disabled={!controls.canAdd}
            onPress={() => controls.onAdd(id)}
          />
        </View>
        {players && players.length > 0 && (
          <View style={styles.players}>
            {serving && <ServeDot size={6} />}
            <Text style={styles.playersText} numberOfLines={1}>
              {players.join(' · ')}
            </Text>
          </View>
        )}
        <Text style={styles.point} numberOfLines={1} adjustsFontSizeToFit>
          {pointText(state, id)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.board}>
      {side(a.id)}
      <View style={styles.sets}>
        {[...sets, current].map((set, i) => {
          const live = i === sets.length && state.matchWonBy === undefined;
          return (
            <View key={i} style={styles.setRow}>
              <Text style={[styles.games, live && styles.gamesLive]}>{set[a.id]}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.games, live && styles.gamesLive]}>{set[b.id]}</Text>
            </View>
          );
        })}
        <Text style={styles.setLabel}>{setLabel(state, sets.length)}</Text>
      </View>
      {side(b.id)}
    </View>
  );
}

function setLabel(state: MatchState, finished: number): string {
  if (state.matchWonBy !== undefined) return 'Match terminé';
  if (state.tieBreak?.isSuper) return 'Super tie-break';
  if (state.tieBreak !== undefined) return 'Tie-break';
  return `Set ${finished + 1}`;
}

function PointButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [
        styles.pointButton,
        icon === 'minus' && styles.pointButtonMinus,
        (pressed || disabled) && styles.pointButtonDim,
      ]}
    >
      <Icon name={icon} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'flex-start' },
  side: { flex: 1, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 180 },
  nameText: {
    fontFamily: fonts.medium,
    fontSize: 20,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.text,
  },
  players: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  playersText: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
  // iOS takes the negative letter spacing off after the last digit too: the box comes out
  // narrower than the digit and crops its right edge. The padding gives that width back
  point: {
    ...type.score,
    color: colors.text,
    marginTop: 6,
    paddingHorizontal: -type.score.letterSpacing,
  },
  pointButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointButtonMinus: { opacity: 0.7 },
  pointButtonDim: { opacity: 0.3 },
  sets: { alignItems: 'center', gap: 2, paddingTop: 46 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  games: {
    fontFamily: fonts.regular,
    fontSize: 40,
    color: 'rgba(255,255,255,0.4)',
    fontVariant: ['tabular-nums'],
  },
  gamesLive: { color: colors.text },
  dot: { fontFamily: fonts.regular, fontSize: 32, color: 'rgba(255,255,255,0.25)' },
  setLabel: {
    ...type.section,
    letterSpacing: 1.82,
    color: colors.accent,
  },
});
