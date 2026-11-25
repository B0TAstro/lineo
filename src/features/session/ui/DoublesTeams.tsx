import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/shared/ui/Chip';
import { TextField } from '@/shared/ui/TextField';
import { colors, fonts, space, type } from '@/shared/ui/theme';

/**
 * UI only: doubles are not scored yet (a side holds one player in `toMatchSetup`). The screen
 * collects the teams as in the mockup; the match is then played between the two team names
 */
export type DoublesDraft = {
  teams: { A: string; B: string };
  players: { name: string; team: 'A' | 'B' }[];
  /** Index in `players` */
  firstServer: number;
};

export const DEFAULT_DOUBLES: DoublesDraft = {
  teams: { A: 'Équipe A', B: 'Équipe B' },
  players: [
    { name: '', team: 'A' },
    { name: '', team: 'A' },
    { name: '', team: 'B' },
    { name: '', team: 'B' },
  ],
  firstServer: 0,
};

/** Step 3 of a doubles session: the two team names, who plays in which, who serves first */
export function DoublesTeams({
  draft,
  onChange,
}: {
  draft: DoublesDraft;
  onChange: (draft: DoublesDraft) => void;
}) {
  const setPlayer = (index: number, patch: Partial<DoublesDraft['players'][number]>) =>
    onChange({
      ...draft,
      players: draft.players.map((player, i) => (i === index ? { ...player, ...patch } : player)),
    });
  const playerName = (index: number) => draft.players[index]?.name || `Joueur ${index + 1}`;

  return (
    <View style={styles.fields}>
      <View style={styles.field}>
        <Text style={styles.label}>Équipes</Text>
        <View style={styles.row}>
          {(['A', 'B'] as const).map((team) => (
            <TextField
              key={team}
              value={draft.teams[team]}
              onChangeText={(name) =>
                onChange({ ...draft, teams: { ...draft.teams, [team]: name } })
              }
              placeholder={`Équipe ${team}`}
              maxLength={16}
              style={styles.input}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Joueurs</Text>
        <View style={styles.players}>
          {draft.players.map((player, i) => (
            <View key={i} style={styles.player}>
              <TextField
                value={player.name}
                onChangeText={(name) => setPlayer(i, { name })}
                placeholder="Prénom ou initiales"
                maxLength={16}
                style={styles.input}
              />
              <View style={styles.teamChoice}>
                {(['A', 'B'] as const).map((team) => (
                  <Chip
                    key={team}
                    label={team}
                    selected={player.team === team}
                    onPress={() => setPlayer(i, { team })}
                    style={styles.chip}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Premier serveur</Text>
        <View style={styles.servers}>
          {draft.players.map((_, i) => (
            <Chip
              key={i}
              label={playerName(i)}
              selected={draft.firstServer === i}
              compact
              onPress={() => onChange({ ...draft, firstServer: i })}
              style={styles.chip}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 20 },
  field: { gap: 12 },
  label: { ...type.section, color: colors.textDim },
  row: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, height: 52, fontFamily: fonts.regular },
  players: { gap: space.s },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamChoice: { width: 118, flexDirection: 'row', gap: 6 },
  servers: { flexDirection: 'row', gap: space.s },
  chip: { height: 52 },
});
