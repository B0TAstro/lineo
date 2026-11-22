import { useEffect, useState, useSyncExternalStore } from 'react';

import { LiveBallTracker, type LiveBallState, type LiveFrame } from './LiveBallTracker';
import { BALL_CONFIG } from './logic/ballConfig';
import { createOpenCvDetector } from './native/OpenCvDetector';

/**
 * Dev builds only: the ball tracked live on the camera. `onFrame` is undefined while it is off,
 * which tells the camera to keep its frames to itself.
 */
export function useLiveBallTrack(
  enabled: boolean,
): LiveBallState & { onFrame: ((frame: LiveFrame) => void) | undefined } {
  const [tracker] = useState(() => new LiveBallTracker(createOpenCvDetector, BALL_CONFIG));
  useEffect(() => {
    if (!enabled) tracker.reset();
  }, [tracker, enabled]);
  const state = useSyncExternalStore(tracker.store.subscribe, tracker.store.get);
  return { ...state, onFrame: enabled ? tracker.onFrame : undefined };
}
