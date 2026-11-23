import type { Court, Place, Surface } from '@/sports/tennis';

import { BALL_CONFIG, type BallConfig } from './ballConfig';

/** What a place and a surface change in the base settings. */
export type CourtSettings = {
  place: Record<Place, Partial<BallConfig>>;
  surface: Record<Surface, Partial<BallConfig>>;
};

/**
 * The base settings (`BALL_CONFIG`) were measured on one video. A setting enters here only once
 * a video of that court shows it is needed (`scripts/bench`), with a test on that video: until
 * then a court keeps the base settings. Nothing has been measured anywhere else yet.
 */
export const COURT_SETTINGS: CourtSettings = {
  place: { indoor: {}, outdoor: {} },
  surface: { grass: {}, hard: {}, clay: {} },
};

/**
 * The detection and tracking settings for the court of the session: the base ones, then what its
 * place changes, then what its surface changes (the surface has the last word).
 */
export function ballConfigFor(court: Court, settings: CourtSettings = COURT_SETTINGS): BallConfig {
  return { ...BALL_CONFIG, ...settings.place[court.place], ...settings.surface[court.surface] };
}
