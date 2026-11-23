import ClipFramesModule, { type FrameSize } from '../../../../modules/clip-frames';

export type { FrameSize };

/**
 * Reads the frames of a time window of a clip, one after the other: the native module on the
 * phone, a fake one in tests. One reader at a time.
 */
export interface ClipFrames {
  open(path: string, startS: number, endS: number, maxSide: number): Promise<FrameSize>;
  /** Packed RGB, 3 bytes per pixel. Empty after the last frame. */
  next(): Promise<ArrayBuffer>;
  /** Time of the last frame `next` returned, in seconds from the start of the file. */
  time(): number;
  close(): void;
}

export const nativeClipFrames: ClipFrames = ClipFramesModule;
