import { lockAsync, OrientationLock } from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/shared/ui/theme';
import type { Court } from '@/sports/tennis';

import { ClipPlayer, type VideoOrientation } from './ClipPlayer';
import { DecisionPanel, type Side } from './components/DecisionPanel';
import type { PointNav } from './components/PlayerTopBar';
import type { ReplayOutcome } from '../logic/outcome';
import type { ReplayClip } from '../logic/toReplayClips';
import { loadDevVideos } from '../native/loadDevVideos';

type Props = {
  clips: readonly ReplayClip[];
  initialIndex: number;
  fps: number;
  court: Court;
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

export function ReplayScreen({
  clips,
  initialIndex,
  fps,
  court,
  sides,
  onOutcome,
  onClose,
}: Props) {
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

  const point: PointNav = {
    section: `${clip.subtitle} · ${index + 1}/${shown.length}`,
    title: clip.title,
    onPrevious: index > 0 ? () => setIndex(index - 1) : undefined,
    onNext: index < shown.length - 1 ? () => setIndex(index + 1) : undefined,
  };
  const devSwitch = __DEV__ ? (
    <Pressable onPress={toggleDevVideos} style={styles.dev}>
      <Text style={styles.devText}>{devClips ? 'Points du match' : 'Vidéos test'}</Text>
    </Pressable>
  ) : undefined;

  return (
    <ClipPlayer
      key={clip.key}
      segments={clip.segments}
      fps={clip.fps ?? fps}
      court={court}
      point={point}
      renderPanel={(close) =>
        // A test video is not a point of the match: nothing to decide
        devClips ? (
          <View style={styles.devPanel}>{devSwitch}</View>
        ) : (
          <DecisionPanel sides={sides} onOutcome={onOutcome} onClose={close} footer={devSwitch} />
        )
      }
      onVideoOrientation={setOrientation}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  dev: { marginTop: 16, alignSelf: 'flex-start' },
  devText: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim },
  devPanel: { padding: 16 },
});
