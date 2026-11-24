import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { VarSummary } from '@/features/replay';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { ServeDot } from '@/shared/ui/ServeDot';
import { colors, fonts, radius, space, type } from '@/shared/ui/theme';
import { type MatchState, type SetScore, sideName, type SideId } from '@/sports/tennis';

/**
 * The end of the match, on every phone: who won, the score of every set, what the VAR did, and the
 * proof that the videos are gone (they are deleted as this screen opens)
 */
export function MatchEndScreen({
  state,
  sets,
  teams,
  vars,
  durationMs,
  averageVarMs,
}: {
  state: MatchState;
  sets: SetScore[];
  /** UI only: the players of each team in doubles */
  teams: Record<SideId, string[]> | undefined;
  vars: VarSummary;
  durationMs: number;
  averageVarMs: number | undefined;
}) {
  const winner = state.matchWonBy as SideId;
  const [a, b] = state.config.sides;
  const winnerPlayers = teams?.[winner]?.filter(Boolean) ?? [];
  const subtitle = [
    winnerPlayers.length > 0 ? winnerPlayers.join(' et ') : undefined,
    `en ${sets.length} set${sets.length > 1 ? 's' : ''}`,
    duration(durationMs),
  ]
    .filter(Boolean)
    .join(' · ');
  // The deciding set of a match with a super tie-break is the tie-break itself
  const decider = 2 * state.config.setsToWinMatch - 2;
  const setLabel = (i: number) =>
    state.config.superTieBreakTarget !== null && i === decider ? 'Super TB' : `Set ${i + 1}`;

  const row = (id: SideId) => {
    const won = id === winner;
    const players = teams?.[id]?.filter(Boolean) ?? [];
    return (
      <View style={styles.row}>
        <View style={styles.who}>
          <View style={styles.nameLine}>
            {won && <ServeDot size={8} />}
            <Text style={[styles.name, !won && styles.nameLost]} numberOfLines={1}>
              {sideName(state, id)}
            </Text>
          </View>
          {players.length > 0 && <Text style={styles.players}>{players.join(' · ')}</Text>}
        </View>
        {sets.map((set, i) => {
          const other = id === a.id ? b.id : a.id;
          const tookIt = (set[id] ?? 0) > (set[other] ?? 0);
          return (
            <Text key={i} style={[styles.games, !tookIt && styles.gamesLost]}>
              {set[id] ?? 0}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.columns}>
        <View style={styles.left}>
          <Text style={styles.section}>Match terminé</Text>
          <Text style={styles.title} numberOfLines={1}>
            {sideName(state, winner)} gagne
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.table}>
            {row(winner)}
            <View style={styles.rule} />
            {row(winner === a.id ? b.id : a.id)}
            <View style={styles.row}>
              <View style={styles.who} />
              {sets.map((_, i) => (
                <Text key={i} style={styles.setLabel}>
                  {setLabel(i)}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <View style={styles.card}>
            <Figure label="Durée" value={duration(durationMs)} />
            <Figure label="Points revus au VAR" value={String(vars.reviewed)} />
            <Figure
              label="Litiges réglés sans rejouer"
              value={`${vars.settled} sur ${vars.closed}`}
              accent
              last
            />
          </View>
          {averageVarMs !== undefined && (
            <Text style={styles.caption}>
              Litiges réglés en moyenne en {Math.round(averageVarMs / 1000)} s après le replay.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.deleted}>
          <Icon name="check" />
          <Text style={styles.deletedText}>Vidéos supprimées</Text>
        </View>
        <Button label="Terminer" onPress={() => router.replace('/')} style={styles.done} />
      </View>
    </SafeAreaView>
  );
}

/** 1 h 24, or 42 min under an hour */
function duration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

function Figure({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.figure, !last && styles.figureLine]}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, accent && styles.figureAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 56,
    paddingVertical: space.l,
    justifyContent: 'space-between',
  },
  columns: { flexDirection: 'row', justifyContent: 'space-between', gap: 48 },
  left: { flex: 1, maxWidth: 400 },
  section: { ...type.section, color: colors.accent },
  title: { fontFamily: fonts.light, fontSize: 40, letterSpacing: -0.8, color: colors.text },
  subtitle: { fontFamily: fonts.light, fontSize: 15, color: colors.textDim },
  table: { marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  who: { width: 140 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  name: {
    fontFamily: fonts.medium,
    fontSize: 18,
    letterSpacing: 1.44,
    textTransform: 'uppercase',
    color: colors.text,
  },
  nameLost: { color: 'rgba(255,255,255,0.5)' },
  players: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim, marginTop: 2 },
  games: {
    width: 66,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 48,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  gamesLost: { color: 'rgba(255,255,255,0.3)' },
  rule: { height: 1, backgroundColor: colors.divider },
  setLabel: {
    width: 66,
    textAlign: 'center',
    fontFamily: fonts.light,
    fontSize: 12,
    color: colors.textDim,
  },
  right: { width: 278, gap: 12 },
  card: {
    paddingHorizontal: 16,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
  },
  figure: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  figureLine: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  figureLabel: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim },
  figureValue: { fontFamily: fonts.light, fontSize: 20, color: colors.text },
  figureAccent: { color: colors.accent },
  caption: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
  footer: { flexDirection: 'row', gap: 48 },
  deleted: {
    flex: 1,
    maxWidth: 436,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: space.m,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
  },
  deletedText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  done: { width: 278, minHeight: 60 },
});
