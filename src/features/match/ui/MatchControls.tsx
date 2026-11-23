import { StyleSheet, View } from 'react-native';

import { PendingBanner } from '@/features/score';
import type { MatchEvent, MatchView } from '@/features/session';
import { Button } from '@/shared/ui/Button';
import { sideName } from '@/sports/tennis';

/**
 * The bar under the score: Quitter, Pause and VAR, or the proposed point to confirm. The points
 * themselves are the + and − next to the names
 */
export function MatchControls({
  view,
  opening,
  dispatch,
  onLeave,
}: {
  view: MatchView;
  /** When VAR pressed, the clips are still being written */
  opening: boolean;
  dispatch: (event: MatchEvent) => void;
  onLeave: () => void;
}) {
  const { state, pending } = view;

  return (
    <View style={styles.bar}>
      {pending !== undefined ? (
        <PendingBanner
          winnerName={sideName(state, pending)}
          onConfirm={() => dispatch({ type: 'point-confirmed' })}
          onReject={() => dispatch({ type: 'point-rejected' })}
        />
      ) : (
        <>
          <Button
            label="Quitter"
            icon="exit"
            variant="ghost"
            onPress={onLeave}
            style={styles.small}
          />
          {/* UI only: pausing the match (and its recording) is not wired yet */}
          <Button
            label="Pause"
            icon="pause"
            variant="ghost"
            disabled
            onPress={() => {}}
            style={styles.small}
          />
        </>
      )}
      <Button
        label={opening ? '…' : 'VAR'}
        icon="rewind"
        variant="var"
        onPress={() => dispatch({ type: 'var-opened' })}
        disabled={view.varOpen}
        style={styles.var}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  small: { width: 170, minHeight: 60 },
  var: { flex: 1, minHeight: 60 },
});
