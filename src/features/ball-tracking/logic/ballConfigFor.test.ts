import { describe, expect, test } from '@jest/globals';

import { BALL_CONFIG } from './ballConfig';
import { ballConfigFor, type CourtSettings } from './ballConfigFor';

/** As if clay and indoor courts had been measured: the real table only holds what a video showed */
const MEASURED: CourtSettings = {
  place: { indoor: { brighterBy: 15, motionThreshold: 12 }, outdoor: {} },
  surface: { grass: {}, hard: {}, clay: { maxRedOverGreen: 40, motionThreshold: 16 } },
};

describe('ballConfigFor', () => {
  test('keeps the base settings on a court nothing was measured on', () => {
    expect(ballConfigFor({ place: 'outdoor', surface: 'hard' }, MEASURED)).toEqual(BALL_CONFIG);
  });

  test('changes only what was measured on the surface', () => {
    const config = ballConfigFor({ place: 'outdoor', surface: 'clay' }, MEASURED);

    expect(config).toEqual({ ...BALL_CONFIG, maxRedOverGreen: 40, motionThreshold: 16 });
  });

  test('adds what was measured in the place to what was measured on the surface', () => {
    const config = ballConfigFor({ place: 'indoor', surface: 'clay' }, MEASURED);

    expect(config.brighterBy).toBe(15);
    expect(config.maxRedOverGreen).toBe(40);
  });

  test('lets the surface have the last word on a setting both change', () => {
    const config = ballConfigFor({ place: 'indoor', surface: 'clay' }, MEASURED);

    expect(config.motionThreshold).toBe(16);
  });
});
