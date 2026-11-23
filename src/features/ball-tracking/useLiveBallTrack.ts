import { useEffect, useState, useSyncExternalStore } from 'react';

import type { Court } from '@/sports/tennis';

import { LiveBallTracker, type LiveBallState, type LiveFrame } from './LiveBallTracker';
import { ballConfigFor } from './logic/ballConfigFor';
import { createOpenCvDetector } from './native/OpenCvDetector';

/**
 * Dev builds only: the ball tracked live on the camera, with the settings of the session's court.
 * `onFrame` is undefined while it is off, which tells the camera to keep its frames to itself.
 */
export function useLiveBallTrack(
  enabled: boolean,
  court: Court,
): LiveBallState & { onFrame: ((frame: LiveFrame) => void) | undefined } {
  const [tracker] = useState(() => new LiveBallTracker(createOpenCvDetector, ballConfigFor(court)));
  useEffect(() => {
    if (!enabled) tracker.reset();
  }, [tracker, enabled]);
  const state = useSyncExternalStore(tracker.store.subscribe, tracker.store.get);
  return { ...state, onFrame: enabled ? tracker.onFrame : undefined };
}
