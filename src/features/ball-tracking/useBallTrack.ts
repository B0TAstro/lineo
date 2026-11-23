import { useEffect, useState, useSyncExternalStore } from 'react';

import type { Timeline } from '@/features/recording';

import { BALL_CONFIG } from './logic/ballConfig';
import { nativeClipFrames } from './native/ClipFrames';
import { createOpenCvDetector } from './native/OpenCvDetector';
import { type BallTrackState, ReplayBallTracker } from './ReplayBallTracker';

/**
 * The ball tracking of the point on screen: an on/off switch, and the time on screen to follow.
 * The tracker does the work; this only wires it to React. Leaving the point stops it.
 */
export function useBallTrack(
  timeline: Timeline,
  timeS: number,
): BallTrackState & { toggle: () => void } {
  const [tracker] = useState(
    () =>
      new ReplayBallTracker(
        timeline,
        nativeClipFrames,
        createOpenCvDetector(BALL_CONFIG),
        BALL_CONFIG,
      ),
  );
  const state = useSyncExternalStore(tracker.store.subscribe, tracker.store.get);
  useEffect(() => () => tracker.stop(), [tracker]);
  useEffect(() => {
    if (state.on) tracker.follow(timeS);
  }, [tracker, state.on, timeS]);
  return { ...state, toggle: () => tracker.setOn(!state.on) };
}
