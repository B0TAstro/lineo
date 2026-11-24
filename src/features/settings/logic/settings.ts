/** What the players can set before a match: read when a match starts, so a change applies to the next one */
export type Settings = {
  /** Frame rate the camera aims for: 60 for frame by frame, 30 spares a hot phone */
  fps: 30 | 60;
  /** Finished points kept on disk on top of the one being filmed */
  savedPoints: 1 | 2 | 3;
  /** The server's call counts the point (it can still be turned off during the match) */
  voice: boolean;
  /** The assisted reading card once the whole point is tracked */
  assistedReading: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  fps: 60,
  savedPoints: 2,
  voice: true,
  assistedReading: true,
};

export const FPS_CHOICES = [60, 30] as const;
export const SAVED_POINTS_CHOICES = [1, 2, 3] as const;

const oneOf = <T>(choices: readonly T[], value: unknown, fallback: T): T =>
  choices.includes(value as T) ? (value as T) : fallback;

/** The settings saved on the phone; anything missing or malformed takes its default */
export function parseSettings(text: string | undefined): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {};
  try {
    if (text) saved = JSON.parse(text) as typeof saved;
  } catch {
    // A broken file is not worth an error: back to the defaults
  }
  return {
    fps: oneOf(FPS_CHOICES, saved.fps, DEFAULT_SETTINGS.fps),
    savedPoints: oneOf(SAVED_POINTS_CHOICES, saved.savedPoints, DEFAULT_SETTINGS.savedPoints),
    voice: typeof saved.voice === 'boolean' ? saved.voice : DEFAULT_SETTINGS.voice,
    assistedReading:
      typeof saved.assistedReading === 'boolean'
        ? saved.assistedReading
        : DEFAULT_SETTINGS.assistedReading,
  };
}
