import { useCallback, useState } from 'react';
import {
  CommonResolutions,
  useCameraDevice,
  useFrameOutput,
  useVideoOutput,
} from 'react-native-vision-camera';
import { createSynchronizable, scheduleOnRN } from 'react-native-worklets';

import { useCapturePermissions } from './useCapturePermissions';
import { useFpsMeter } from './useFpsMeter';

export const TARGET_FPS = 60;
const TARGET_BIT_RATE = 10_000_000;

/**
 * A camera frame handed to JS (dev live tracking): BGRA or RGBA, upright. `width` is the row length
 * in pixels, padding included; `visibleWidth` the picture's. `t` in seconds.
 */
export type CameraFrame = {
  pixels: ArrayBuffer;
  width: number;
  visibleWidth: number;
  height: number;
  format: 'bgra' | 'rgba';
  t: number;
};

/**
 * The match camera: its permissions, front or back, and its two outputs. With `onCameraFrame`
 * (dev builds), the frame output also hands frames to JS, one at a time: the next one only once
 * the previous is processed.
 */
export function useMatchCamera(onCameraFrame?: (frame: CameraFrame) => void) {
  const { camera, micGranted } = useCapturePermissions();
  // Front: the players see the screen, and the score, from the court. Back: better picture...
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(facing);
  const { fps, onFrameTimestamp } = useFpsMeter();
  const [selectedFps, setSelectedFps] = useState<number>();
  const [running, setRunning] = useState(false);

  const live = onCameraFrame !== undefined;
  // Shared with the camera thread: true while JS is busy with a frame, so frames are skipped
  const [busy] = useState(() => createSynchronizable(false));
  const onLiveFrame = useCallback(
    (frame: CameraFrame) => {
      try {
        onCameraFrame?.(frame);
      } finally {
        busy.setBlocking(false);
      }
    },
    [onCameraFrame, busy],
  );

  // Frames are counted, to show the real fps on screen. Live: one at a time also goes to JS, upright and in RGB, which costs the camera a conversion (dev only)
  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_16_9,
    pixelFormat: live ? 'rgb' : 'native',
    enablePhysicalBufferRotation: live,
    onFrame(frame) {
      'worklet';
      const timestamp = frame.timestamp;
      const format =
        frame.pixelFormat === 'rgb-bgra-8-bit'
          ? 'bgra'
          : frame.pixelFormat === 'rgb-rgba-8-bit'
            ? 'rgba'
            : undefined;
      if (live && format && frame.hasPixelBuffer && !busy.getDirty()) {
        busy.setBlocking(true);
        scheduleOnRN(onLiveFrame, {
          // A copy: the camera reuses its buffer once the frame is disposed
          pixels: frame.getPixelBuffer().slice(0),
          width: frame.bytesPerRow / 4,
          visibleWidth: frame.width,
          height: frame.height,
          format,
          t: timestamp,
        });
      }
      frame.dispose();
      scheduleOnRN(onFrameTimestamp, timestamp);
    },
  });
  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.HD_16_9,
    enablePersistentRecorder: true,
    fileType: 'mp4',
    targetBitRate: TARGET_BIT_RATE,
    // The sound of the rally helps read the replay, and its peaks are marked on the timeline.
    enableAudio: micGranted,
  });

  return {
    permission: camera,
    facing,
    flip: () => setFacing(facing === 'back' ? 'front' : 'back'),
    device,
    frameOutput,
    videoOutput,
    fps,
    selectedFps,
    setSelectedFps,
    running,
    setRunning,
  };
}

export type MatchCamera = ReturnType<typeof useMatchCamera>;
