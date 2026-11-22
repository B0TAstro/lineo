import {
  ColorConversionCodes,
  ContourApproximationModes,
  DataTypes,
  type Mat,
  MorphShapes,
  MorphTypes,
  OpenCV,
  RetrievalModes,
} from 'react-native-fast-opencv';

import type { BallConfig } from '../logic/ballConfig';
import { type Candidate, circularity } from '../logic/candidates';

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

/** Finds the blobs of ball colour in one frame. */
export type DetectCandidates = (image: RawImage) => Candidate[];

/**
 * The POC's pixel chain on OpenCV: blur, HSV, colour threshold, open then close, outer contours.
 * Only the contours' measures come back to JS; filtering and choosing stay in `logic/`.
 *
 * react-native-fast-opencv has no minEnclosingCircle: the bounding box gives the centre, and its
 * longer side the diameter.
 */
export function createOpenCvDetector(config: BallConfig): DetectCandidates {
  const openKernel = OpenCV.getStructuringElement(
    MorphShapes.MORPH_ELLIPSE,
    OpenCV.Size.create(config.openSize, config.openSize),
  );
  const closeKernel = OpenCV.getStructuringElement(
    MorphShapes.MORPH_ELLIPSE,
    OpenCV.Size.create(config.closeSize, config.closeSize),
  );
  const blurSize = OpenCV.Size.create(config.blurSize, config.blurSize);
  const ranges = config.hsvRanges.map(({ lower, upper }) => ({
    lower: OpenCV.Scalar.create(lower[0], lower[1], lower[2]),
    upper: OpenCV.Scalar.create(upper[0], upper[1], upper[2]),
  }));

  return ({ pixels, width, height, format }) => {
    const frame = toRgb(pixels, width, height, format);
    const blurred = OpenCV.Mat.create(height, width, DataTypes.CV_8UC3);
    const hsv = OpenCV.Mat.create(height, width, DataTypes.CV_8UC3);
    const mask = OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    const part = OpenCV.Mat.create(height, width, DataTypes.CV_8UC1);
    const mats: Mat[] = [frame, blurred, hsv, mask, part];

    OpenCV.GaussianBlur(frame, blurred, blurSize, 0);
    OpenCV.cvtColor(blurred, hsv, ColorConversionCodes.COLOR_RGB2HSV);
    ranges.forEach((range, i) => {
      OpenCV.inRange(hsv, range.lower, range.upper, i === 0 ? mask : part);
      if (i > 0) OpenCV.bitwise_or(mask, part, mask);
    });
    // Open removes isolated specks, close fills the holes of a highlight on the ball.
    OpenCV.morphologyEx(mask, mask, MorphTypes.MORPH_OPEN, openKernel);
    OpenCV.morphologyEx(mask, mask, MorphTypes.MORPH_CLOSE, closeKernel);

    const contours = OpenCV.PointVectorOfVectors.create();
    OpenCV.findContours(
      mask,
      contours,
      RetrievalModes.RETR_EXTERNAL,
      ContourApproximationModes.CHAIN_APPROX_SIMPLE,
    );

    const candidates: Candidate[] = [];
    for (let i = 0; i < contours.length; i++) {
      const contour = contours.get(i);
      const area = OpenCV.contourArea(contour).value;
      // Cheap reject first: most blobs are specks or large yellow things.
      if (area >= config.minArea && area <= config.maxArea) {
        const perimeter = OpenCV.arcLength(contour, true).value;
        const box = OpenCV.boundingRect(contour);
        candidates.push({
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          r: Math.max(box.width, box.height) / 2,
          area,
          circularity: circularity(area, perimeter),
        });
      }
    }

    contours.release();
    for (const mat of mats) mat.release();
    return candidates;
  };
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
