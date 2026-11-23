import {
  BorderTypes,
  ColorConversionCodes,
  ContourApproximationModes,
  DataTypes,
  type Mat,
  MorphShapes,
  OpenCV,
  RetrievalModes,
  ThresholdTypes,
} from 'react-native-fast-opencv';

import type { BallConfig } from '../logic/ballConfig';
import type { Candidate } from '../logic/candidates';

/**
 * One frame as it comes from the clip reader (packed RGB) or the live camera (BGRA or RGBA).
 * `width` is the row length in pixels: a padded camera row just adds columns on the right.
 */
export type RawImage = {
  pixels: ArrayBuffer;
  width: number;
  height: number;
  format: 'rgb' | 'bgra' | 'rgba';
};

/**
 * Finds the blobs that could be the ball, frame after frame: it compares each frame with the one
 * before, so frames must come in order, and `reset` after a jump.
 */
export type BallDetector = {
  /** The candidates, or undefined when the frame repeats the previous one (nothing new to see). */
  detect(image: RawImage): Candidate[] | undefined;
  reset(): void;
};

type Box = { x: number; y: number; width: number; height: number };

/**
 * On a court the ball is a few pixels among yellow stands, clothes and lights, and colour alone
 * finds all of them. The ball is what is bright yellow, moving, and moving on its own:
 * 1. blur, then the grey difference with the previous frame: what moved;
 * 2. the moving areas, each kept only if small: a person moving makes a large one;
 * 3. bright yellow (HSV) AND moving, its blobs, each kept if ball-sized and inside a small moving
 *    area.
 * Only boxes come back to JS; choosing the ball stays in `logic/`.
 */
export function createOpenCvDetector(config: BallConfig): BallDetector {
  const dilateKernel = OpenCV.getStructuringElement(
    MorphShapes.MORPH_ELLIPSE,
    OpenCV.Size.create(config.motionDilate, config.motionDilate),
  );
  const anchor = OpenCV.Point.create(-1, -1);
  const border = OpenCV.Scalar.create(0);
  const blurSize = OpenCV.Size.create(config.blurSize, config.blurSize);
  const ranges = config.hsvRanges.map(({ lower, upper }) => ({
    lower: OpenCV.Scalar.create(lower[0], lower[1], lower[2]),
    upper: OpenCV.Scalar.create(upper[0], upper[1], upper[2]),
  }));
  let previous: Mat | undefined;

  const reset = () => {
    previous?.release();
    previous = undefined;
  };

  const detect = ({ pixels, width, height, format }: RawImage): Candidate[] | undefined => {
    const frame = toRgb(pixels, width, height, format);
    const blurred = OpenCV.Mat.create(height, width, DataTypes.CV_8UC3);
    const gray = OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    OpenCV.GaussianBlur(frame, blurred, blurSize, 0);
    OpenCV.cvtColor(blurred, gray, ColorConversionCodes.COLOR_RGB2GRAY);
    frame.release();

    if (!previous) {
      previous = gray;
      blurred.release();
      return [];
    }

    const motion = OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    OpenCV.absdiff(gray, previous, motion);
    if (OpenCV.mean(motion).a < config.repeatThreshold) {
      // A repeated frame: keep comparing with the one before it
      for (const mat of [gray, blurred, motion]) mat.release();
      return undefined;
    }
    previous.release();
    previous = gray;

    OpenCV.threshold(motion, motion, config.motionThreshold, 255, ThresholdTypes.THRESH_BINARY);
    OpenCV.dilate(motion, motion, dilateKernel, anchor, 1, BorderTypes.BORDER_CONSTANT, border);
    const movers = boxes(motion).filter(
      (box) => Math.max(box.width, box.height) <= config.maxMoverSide * width,
    );

    const hsv = OpenCV.Mat.create(height, width, DataTypes.CV_8UC3);
    const yellow = OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    const part = OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    OpenCV.cvtColor(blurred, hsv, ColorConversionCodes.COLOR_RGB2HSV);
    ranges.forEach((range, i) => {
      OpenCV.inRange(hsv, range.lower, range.upper, i === 0 ? yellow : part);
      if (i > 0) OpenCV.bitwise_or(yellow, part, yellow);
    });
    OpenCV.bitwise_and(yellow, motion, yellow);

    const candidates: Candidate[] = [];
    for (const box of boxes(yellow)) {
      const side = Math.max(box.width, box.height);
      if (box.width * box.height < config.minBallPixels || side > config.maxBallSide * width)
        continue;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      if (movers.some((m) => x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height))
        candidates.push({ x, y, r: side / 2 });
    }

    for (const mat of [blurred, motion, hsv, yellow, part]) mat.release();
    return candidates;
  };

  return { detect, reset };
}

/** The bounding box of each outer blob of a mask. */
function boxes(mask: Mat): Box[] {
  const contours = OpenCV.PointVectorOfVectors.create();
  OpenCV.findContours(
    mask,
    contours,
    RetrievalModes.RETR_EXTERNAL,
    ContourApproximationModes.CHAIN_APPROX_SIMPLE,
  );
  const result: Box[] = [];
  for (let i = 0; i < contours.length; i++) {
    const { x, y, width, height } = OpenCV.boundingRect(contours.get(i));
    result.push({ x, y, width, height });
  }
  contours.release();
  return result;
}

/** The frame as a 3-channel RGB matrix: the camera gives 4 channels, the clip reader 3. */
function toRgb(
  pixels: ArrayBuffer,
  width: number,
  height: number,
  format: RawImage['format'],
): Mat {
  const bytes = new Uint8Array(pixels);
  if (format === 'rgb') return OpenCV.Mat.createFromBuffer('uint8', height, width, 3, bytes);
  const source = OpenCV.Mat.createFromBuffer('uint8', height, width, 4, bytes);
  const rgb = OpenCV.Mat.create(height, width, DataTypes.CV_8UC3);
  OpenCV.cvtColor(
    source,
    rgb,
    format === 'bgra' ? ColorConversionCodes.COLOR_BGRA2RGB : ColorConversionCodes.COLOR_RGBA2RGB,
  );
  source.release();
  return rgb;
}
