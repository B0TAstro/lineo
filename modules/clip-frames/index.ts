import { requireNativeModule } from 'expo';

type ClipFramesModule = {
  /**
   * Starts reading the frames of a video between two times, in seconds. One reader at a time: a
   * new open closes the previous one. Frames come out upright (the file's rotation applied) and
   * scaled down so their long side is about `maxSide`.
   */
  open(path: string, startS: number, endS: number, maxSide: number): Promise<FrameSize>;
  /** The next frame as packed RGB, 3 bytes per pixel, row after row. Empty after the last one. */
  next(): Promise<ArrayBuffer>;
  /** Time of the frame `next` returned last, in seconds from the start of the file. */
  time(): number;
  close(): void;
};

export type FrameSize = {
  /** Size of the frames returned. */
  width: number;
  height: number;
  /** Size of the video as played, upright: frame coordinates scale up to it. */
  videoWidth: number;
  videoHeight: number;
};

export default requireNativeModule<ClipFramesModule>('ClipFrames');
