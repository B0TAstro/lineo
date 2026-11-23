import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ClipStats } from '@/features/recording';
import { colors, radius } from '@/shared/ui/theme';

/** Dev builds only. What the phone measures (fps, files, events), for tests on a real court */
export function DevStats({
  fps,
  selectedFps,
  stats,
  sessionId,
  eventCount,
  voiceError,
  liveBall,
  liveBallMs,
  onToggleLiveBall,
}: {
  fps: number;
  selectedFps: number | undefined;
  stats: ClipStats;
  sessionId: string;
  eventCount: number;
  voiceError: string | undefined;
  liveBall: boolean;
  liveBallMs: number;
  onToggleLiveBall: () => void;
}) {
  return (
    <View style={styles.stats}>
      <Text style={styles.text}>
        {fps.toFixed(0)} fps mesurés · {selectedFps ?? '—'} configurés
      </Text>
      <Text style={styles.text}>
        {stats.savedCount + 1} points gardés · {stats.totalMB.toFixed(0)} Mo · {stats.deletedCount}{' '}
        fichiers supprimés · {stats.errorCount} erreurs
      </Text>
      <Text style={styles.text}>
        Session {sessionId} · {eventCount} événements
      </Text>
      {voiceError !== undefined && <Text style={styles.text}>Voix : {voiceError}</Text>}
      <Pressable style={[styles.toggle, liveBall && styles.toggleOn]} onPress={onToggleLiveBall}>
        <Text style={[styles.text, liveBall && styles.toggleTextOn]}>
          {liveBall ? `Balle live · ${liveBallMs.toFixed(0)} ms / image` : 'Balle live (OpenCV)'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { backgroundColor: colors.card, borderRadius: radius, padding: 12, gap: 4 },
  text: { color: colors.textSoft, fontSize: 13, fontVariant: ['tabular-nums'] },
  toggle: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.textSoft,
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleTextOn: { color: colors.onAccent },
});
