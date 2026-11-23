export type Place = 'indoor' | 'outdoor';
export type Surface = 'grass' | 'hard' | 'dirt';

/**
 * Where the match is played, as the host says it when creating the session.
 * What a camera sees of the ball changes with the light and with the ground: the detection picks its settings from it.
 * It never changes during a session.
 */
export type Court = { place: Place; surface: Surface };
