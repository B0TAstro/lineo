import { type ReactNode, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video, { type VideoRef } from 'react-native-video';

import { BallHud, BallTrackOverlay, useBallTrack } from '@/features/ball-tracking';
import { buildTimeline, locate, type Segment } from '@/features/recording';
import { stopBeforePeak, useSoundPeaks } from '@/features/sound-peaks';
import { toUri } from '@/shared/native/files';
import { colors, radius, touch } from '@/shared/ui/theme';
import { ZoomableView } from '@/shared/ui/ZoomableView';

import { PlaybackPanel } from './components/PlaybackPanel';

const DEFAULT_RATE = 0.5;
/** Where a point opens, in seconds before its end (the end is what players argue about) */
const START_BEFORE_END_SECONDS = 1;
/** A jump to a sound peak lands this long before it */
const PEAK_LEAD_SECONDS = 0.15;

export type VideoOrientation = 'portrait' | 'landscape';

/**
 * Plays one point: one file almost always. When a point has several files they are stacked, all loaded, and only the active one is visible, so switching files needs no reload
 */
export function ClipPlayer({
  segments,
  fps,
  header,
  footer,
  onVideoOrientation,
  onClose,
}: {
  segments: readonly Segment[];
  fps: number;
  header: ReactNode;
  footer: ReactNode;
  /** How the point was filmed, once its video is loaded: the screen turns to match it */
  onVideoOrientation: (orientation: VideoOrientation) => void;
  onClose: () => void;
}) {
  const window = useWindowDimensions();
  const portrait = window.height > window.width;
  const timeline = useMemo(() => buildTimeline(segments), [segments]);
  const initial = useMemo(() => {
    const t = Math.max(0, timeline.totalS - START_BEFORE_END_SECONDS);
    return { t, ...locate(timeline, t) };
  }, [timeline]);

  const videoRefs = useRef<(VideoRef | null)[]>([]);
  const timeRef = useRef(initial.t);
  const initialSeekDone = useRef(false);
  const [activeIndex, setActiveIndex] = useState(initial.index);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(DEFAULT_RATE);
  const [timeS, setTimeS] = useState(initial.t);
  const peaks = useSoundPeaks(timeline);
  const ball = useBallTrack(timeline, timeS);

  const setTime = (t: number) => {
    timeRef.current = t;
    setTimeS(t);
  };

  const seekTo = (t: number) => {
    const target = locate(timeline, t, activeIndex);
    videoRefs.current[target.index]?.seek(target.localS, 0);
    setActiveIndex(target.index);
    setTime((timeline.segments[target.index]?.offsetS ?? 0) + target.localS);
  };

  const pauseAt = (t: number) => {
    setPlaying(false);
    seekTo(t);
  };

  const stepFrame = (direction: 1 | -1) => pauseAt(timeRef.current + direction / fps);

  /** Pauses just before the next (or previous) loud sound: a hit, a bounce, or anything else */
  const jumpToPeak = (direction: 1 | -1) => {
    const target = stopBeforePeak(peaks, timeRef.current, direction, PEAK_LEAD_SECONDS);
    if (target !== undefined) pauseAt(target);
  };

  const togglePlay = () => {
    if (!playing && timeRef.current >= timeline.totalS - 1 / fps) seekTo(0);
    setPlaying((p) => !p);
  };

  const onSegmentEnd = (index: number) => {
    if (index !== activeIndex) return;
    const segment = timeline.segments[index];
    const next = timeline.segments[index + 1];
    if (!segment || !next) {
      setPlaying(false);
      setTime(timeline.totalS);
      return;
    }
    const t = segment.offsetS + segment.durationS;
    videoRefs.current[index + 1]?.seek(Math.max(0, t - next.offsetS), 0);
    setActiveIndex(index + 1);
    setTime(t);
  };

  const onInitialSeekDone = () => {
    if (initialSeekDone.current) return;
    initialSeekDone.current = true;
    setPlaying(true);
  };

  const back = (
    <Pressable style={styles.close} onPress={onClose}>
      <Text style={styles.closeText}>← Retour au score</Text>
    </Pressable>
  );

  const top = (
    <View style={styles.top}>
      {back}
      {header}
    </View>
  );

  if (timeline.segments.length === 0) {
    return (
      <SafeAreaView style={styles.empty}>
        <View style={styles.emptyHeader}>{header}</View>
        <Text style={styles.emptyText}>Pas de vidéo pour ce point.</Text>
        {back}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, portrait && styles.containerPortrait]}>
      <View style={styles.stage}>
        <ZoomableView>
          {timeline.segments.map((segment, index) => (
            <Video
              key={segment.path}
              ref={(ref) => {
                videoRefs.current[index] = ref;
              }}
              source={{ uri: toUri(segment.path) }}
              style={[StyleSheet.absoluteFill, index !== activeIndex && styles.hidden]}
              resizeMode="contain"
              paused={!playing || index !== activeIndex}
              rate={rate}
              // Sound at normal speed only: stretched to slow motion it is no help. Played even with
              // the phone on silent, which it usually is on court
              muted={rate !== 1 || index !== activeIndex}
              ignoreSilentSwitch="ignore"
              repeat={false}
              progressUpdateInterval={33}
              onLoad={(e) => {
                if (index !== initial.index) return;
                onVideoOrientation(e.naturalSize.orientation);
                // Already on the right frame: no seek, so no onSeek event to wait for
                if (initial.localS < 1 / fps) onInitialSeekDone();
                else videoRefs.current[index]?.seek(initial.localS, 0);
              }}
              onSeek={() => {
                if (index === initial.index) onInitialSeekDone();
              }}
              onProgress={(e) => {
                if (index === activeIndex && playing) setTime(segment.offsetS + e.currentTime);
              }}
              onEnd={() => onSegmentEnd(index)}
            />
          ))}
          {ball.on && ball.video && (
            <BallTrackOverlay points={ball.points} video={ball.video} timeS={timeS} />
          )}
        </ZoomableView>

        {ball.on && ball.frame && (
          <SafeAreaView
            style={[styles.hud, portrait && styles.hudPortrait]}
            edges={portrait ? ['top'] : ['bottom', 'left']}
            pointerEvents="none"
          >
            <BallHud
              points={ball.points}
              timeS={timeS}
              frame={ball.frame}
              frames={ball.frames}
              seen={ball.seen}
              extra={`${ball.ms.toFixed(0)} ms / image`}
            />
          </SafeAreaView>
        )}
      </View>

      <PlaybackPanel
        portrait={portrait}
        header={top}
        timeS={timeS}
        totalS={timeline.totalS}
        rate={rate}
        onRate={setRate}
        playing={playing}
        onTogglePlay={togglePlay}
        onStepFrame={stepFrame}
        peaks={peaks}
        onJumpToPeak={jumpToPeak}
        onSeek={pauseAt}
        ball={ball}
        onTrackBall={ball.toggle}
        footer={footer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  containerPortrait: { flexDirection: 'column' },
  /** The video alone: every control is in the panel, nothing hides the ball */
  stage: { flex: 1 },
  hidden: { opacity: 0 },
  /** Top of the video in portrait (the panel is below it), bottom left in landscape */
  hud: { position: 'absolute', bottom: 0, left: 0, padding: 8 },
  hudPortrait: { top: 0, bottom: undefined },
  top: { gap: 12 },
  close: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius,
    paddingHorizontal: 18,
    minHeight: touch,
    justifyContent: 'center',
  },
  closeText: { color: colors.line, fontSize: 18, fontWeight: '700' },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  emptyText: { color: colors.line, fontSize: 22 },
  emptyHeader: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    backgroundColor: colors.inkSoft,
    borderRadius: radius,
    padding: 12,
  },
});
