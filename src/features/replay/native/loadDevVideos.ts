import { Directory, File, Paths } from 'expo-file-system';

import type { ReplayClip } from '../logic/toReplayClips';

/** What `npm run dev:videos` writes next to the videos. */
type Manifest = { name: string; durationS: number; fps: number }[];

/**
 * Dev builds only: the test videos `npm run dev:videos` copied to the phone (real matches found
 * online), played as points of the replay to try the ball tracking without filming a match.
 */
export async function loadDevVideos(): Promise<ReplayClip[]> {
  const folder = new Directory(Paths.document, 'dev-videos');
  const manifest = new File(folder, 'index.json');
  if (!manifest.exists) return [];
  const videos = JSON.parse(await manifest.text()) as Manifest;
  return videos.map(({ name, durationS, fps }) => {
    const file = new File(folder, name);
    return {
      key: `dev-${name}`,
      title: name,
      subtitle: 'Vidéo test',
      fps,
      segments: [
        {
          path: file.uri,
          startedAt: 0,
          endedAt: durationS * 1000,
          durationS,
          sizeBytes: file.size ?? 0,
        },
      ],
    };
  });
}
