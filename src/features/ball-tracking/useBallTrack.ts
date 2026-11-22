import { useEffect, useState, useSyncExternalStore } from 'react';

import type { Timeline } from '@/features/recording';

import { BallTrackAnalysis, type BallTrackState } from './BallTrackAnalysis';
import { BALL_CONFIG } from './logic/ballConfig';
import { nativeClipFrames } from './native/ClipFrames';
import { createOpenCvDetector } from './native/OpenCvDetector';

/**
 * The ball tracking of the point on screen. The analysis does the work; this only wires it to
 * React. Another point (another timeline) drops the previous result.
 */
export function useBallTrack(timeline: Timeline): BallTrackState & { analyse: () => void } {
  const [analysis] = useState(
    () => new BallTrackAnalysis(nativeClipFrames, createOpenCvDetector, BALL_CONFIG),
  );
  useEffect(() => () => analysis.cancel(), [analysis, timeline]);
  const state = useSyncExternalStore(analysis.store.subscribe, analysis.store.get);
  return { ...state, analyse: () => analysis.analyse(timeline) };
}
