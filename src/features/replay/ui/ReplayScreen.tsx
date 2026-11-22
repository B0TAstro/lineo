import { lockAsync, OrientationLock } from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/shared/ui/theme';

import { ClipPlayer, type VideoOrientation } from './ClipPlayer';
import { ControlButton } from './components/ControlButton';
import { NavButton } from './components/NavButton';
import { OutcomeBar, type Side } from './components/OutcomeBar';
import type { ReplayOutcome } from '../logic/outcome';
import type { ReplayClip } from '../logic/toReplayClips';
import { loadDevVideos } from '../native/loadDevVideos';

type Props = {
  clips: readonly ReplayClip[];
  initialIndex: number;
  fps: number;
  sides: readonly [Side, Side];
  onOutcome: (outcome: ReplayOutcome) => void;
  onClose: () => void;
};

/** Shown when `npm run dev:videos` has not been run on this phone */
const NO_DEV_VIDEOS: ReplayClip = {
  key: 'dev-none',
  title: 'Aucune vidéo test',
  subtitle: 'npm run dev:videos',
  segments: [],
};

export function ReplayScreen({ clips, initialIndex, fps, sides, onOutcome, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  // Dev builds only: test videos instead of the match's points
  const [devClips, setDevClips] = useState<ReplayClip[]>();
  const [orientation, setOrientation] = useState<VideoOrientation>('landscape');

  // The screen turns with the video: a clip filmed upright is played upright, full height
  useEffect(() => {
    void lockAsync(
      orientation === 'portrait' ? OrientationLock.PORTRAIT_UP : OrientationLock.LANDSCAPE,
    );
  }, [orientation]);
  // Back to the score, which is landscape
  useEffect(() => () => void lockAsync(OrientationLock.LANDSCAPE), []);

  const shown = devClips ?? clips;
  const clip = shown[index];
  if (!clip) return null;

  const toggleDevVideos = () => {
    if (devClips) {
      setDevClips(undefined);
      setIndex(initialIndex);
      return;
    }
    void loadDevVideos().then((videos) => {
      setDevClips(videos.length > 0 ? videos : [NO_DEV_VIDEOS]);
      setIndex(0);
    });
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.nav}>
        <NavButton label="◀" disabled={index === 0} onPress={() => setIndex(index - 1)} />
        <View style={styles.navText}>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            {clip.subtitle} · {index + 1}/{shown.length}
          </Text>
          <Text style={styles.navTitle} numberOfLines={2}>
            {clip.title}
          </Text>
        </View>
        <NavButton
          label="▶"
          disabled={index === shown.length - 1}
          onPress={() => setIndex(index + 1)}
        />
      </View>
      {__DEV__ && (
        <View style={styles.row}>
          <ControlButton
            label={devClips ? 'Points du match' : 'Vidéos test'}
            onPress={toggleDevVideos}
          />
        </View>
      )}
    </View>
  );

  return (
    <ClipPlayer
      key={clip.key}
      segments={clip.segments}
      fps={clip.fps ?? fps}
      header={header}
      // A test video is not a point of the match: nothing to decide
      footer={devClips ? null : <OutcomeBar sides={sides} onOutcome={onOutcome} />}
      onVideoOrientation={setOrientation}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navText: { flexShrink: 1, flexGrow: 1 },
  navSubtitle: { color: colors.ball, fontSize: 16, fontWeight: '800' },
  navTitle: { color: colors.line, fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row' },
});
