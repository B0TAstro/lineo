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

import type { FrameCandidates } from '../logic/arc';
import type { BallConfig } from '../logic/ballConfig';
import { ballBlobs, type Box, type Candidate } from '../logic/candidates';
import { framesToCompare } from '../logic/framesToCompare';

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
 * Finds the blobs that could be the ball, frame after frame. A frame is judged against one before
 * it and one after it, so frames must come in order with their time, the answer for a frame comes
 * a frame or two later, and `reset` is needed after a jump.
 */
export type BallDetector = {
  /**
   * Takes the next frame, at `t` seconds. Gives back the frames it can now judge, with what it
   * found in each: none yet, one, or a few. A frame that repeats the previous one is left out.
   */
  detect(image: RawImage, t: number): FrameCandidates[];
  reset(): void;
};

/** What is kept of a frame while it can still be compared with others: one channel each. */
type Seen = {
  t: number;
  /** Brightness, as filmed: where a 2 px ball stands out best. */
  gray: Mat;
  /** Brightness, blurred: to find what moved without the noise. */
  soft: Mat;
  /** min(red, green) - blue: high on yellow, zero on grey, white and blue. */
  yellow: Mat;
  /** 255 where red is not well above green: not skin, not clay. */
  notSkin: Mat;
};

/**
 * On a court the ball is a few pixels among a crowd, clothes, shoes and shadows. What sets it
 * apart in a frame is that it passes: at its place the picture is brighter and yellower than a
 * moment before and than a moment after. So, on the pixels as filmed (blurring erases a 2 px ball):
 * 1. brighter than the same place in the frame before AND in the frame after, and yellower too:
 *    what passes by. A shadow arriving is darker, a shadow leaving stays bright, a player's shirt
 *    is still there the frame after;
 * 2. not redder than green: a moving arm or leg passes as well, but skin is red before green;
 * 3. ball-sized, and inside a small area that moved: a person moving makes a large one.
 * No absolute colour: yellow in the sun, in the shade and at 2 px against a dark wall are far
 * apart, but the ball is always brighter and yellower than what it flies over.
 *
 * Only boxes come back to JS; choosing among them stays in `logic/`.
 */
export function createOpenCvDetector(config: BallConfig): BallDetector {
  const dilateKernel = OpenCV.getStructuringElement(
    MorphShapes.MORPH_ELLIPSE,
    OpenCV.Size.create(config.motionDilate, config.motionDilate),
  );
  const anchor = OpenCV.Point.create(-1, -1);
  const border = OpenCV.Scalar.create(0);
  const blurSize = OpenCV.Size.create(config.blurSize, config.blurSize);
  /** The frames still needed, oldest first. */
  let history: Seen[] = [];
  /** Rank in `history` of the next frame to judge. */
  let next = 0;

  const release = (...mats: Mat[]) => {
    for (const mat of mats) mat.release();
  };

  const reset = () => {
    for (const seen of history) release(seen.gray, seen.soft, seen.yellow, seen.notSkin);
    history = [];
    next = 0;
  };

  const detect = ({ pixels, width, height, format }: RawImage, t: number): FrameCandidates[] => {
    const channel = () => OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    const rgb = toRgb(pixels, width, height, format);
    const gray = channel();
    const soft = channel();
    OpenCV.cvtColor(rgb, gray, ColorConversionCodes.COLOR_RGB2GRAY);
    OpenCV.GaussianBlur(gray, soft, blurSize, 0);

    const last = history.at(-1);
    if (last) {
      const change = channel();
      OpenCV.absdiff(soft, last.soft, change);
      const repeated = OpenCV.mean(change).a < config.repeatThreshold;
      change.release();
      if (repeated) {
        // A repeated frame (screen recordings): it would hide what passes by
        release(rgb, gray, soft);
        return [];
      }
    }

    const red = channel();
    const green = channel();
    const blue = channel();
    const yellow = channel();
    const notSkin = channel();
    OpenCV.extractChannel(rgb, red, 0);
    OpenCV.extractChannel(rgb, green, 1);
    OpenCV.extractChannel(rgb, blue, 2);
    // On 8-bit pixels a subtraction stops at 0: "how much more", never negative
    OpenCV.min(green, red, yellow);
    OpenCV.subtract(yellow, blue, yellow);
    OpenCV.subtract(red, green, notSkin);
    OpenCV.threshold(
      notSkin,
      notSkin,
      config.maxRedOverGreen,
      255,
      ThresholdTypes.THRESH_BINARY_INV,
    );
    release(rgb, red, green, blue);
    history.push({ t, gray, soft, yellow, notSkin });

    const found: FrameCandidates[] = [];
    for (let centre = history[next]; centre; centre = history[next]) {
      const compare = framesToCompare(
        history.map((seen) => seen.t),
        next,
        config.motionSpanS,
      );
      if (compare === 'wait') break;
      const before = compare === 'none' ? undefined : history[compare.before];
      const after = compare === 'none' ? undefined : history[compare.after];
      found.push({
        t: centre.t,
        candidates: before && after ? search(centre, before, after, width, height) : [],
      });
      next++;
    }

    // Frames too old to be compared with again. One frame before the next to judge always
    // stays: at a low frame rate it is further back than that, and still the one to compare with.
    const upcoming = history[next];
    while (
      upcoming &&
      next > 1 &&
      history[0] &&
      history[0].t < upcoming.t - 2 * config.motionSpanS
    ) {
      const old = history.shift() as Seen;
      release(old.gray, old.soft, old.yellow, old.notSkin);
      next--;
    }
    return found;
  };

  /** The ball-like blobs of `centre`: what is there and not in `before` nor in `after`. */
  const search = (
    centre: Seen,
    before: Seen,
    after: Seen,
    width: number,
    height: number,
  ): Candidate[] => {
    const channel = () => OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);

    /** 255 where `now` is above both `earlier` and `later` by more than `by`. */
    const passing = (now: Mat, earlier: Mat, later: Mat, by: number): Mat => {
      const more = channel();
      const than = channel();
      OpenCV.subtract(now, earlier, more);
      OpenCV.subtract(now, later, than);
      OpenCV.min(more, than, more);
      OpenCV.threshold(more, more, by, 255, ThresholdTypes.THRESH_BINARY);
      than.release();
      return more;
    };

    const ball = passing(centre.gray, before.gray, after.gray, config.brighterBy);
    const yellower = passing(centre.yellow, before.yellow, after.yellow, config.yellowerBy);
    OpenCV.bitwise_and(ball, yellower, ball);
    OpenCV.bitwise_and(ball, centre.notSkin, ball);

    const motion = channel();
    OpenCV.absdiff(centre.soft, before.soft, motion);
    OpenCV.threshold(motion, motion, config.motionThreshold, 255, ThresholdTypes.THRESH_BINARY);
    OpenCV.dilate(motion, motion, dilateKernel, anchor, 1, BorderTypes.BORDER_CONSTANT, border);

    const candidates = ballBlobs(boxes(ball), boxes(motion), width, config);
    release(ball, yellower, motion);
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
