import { File, Paths } from 'expo-file-system';

/** The only thing the app keeps between two launches: a few settings, never a video or a name */
const file = () => new File(Paths.document, 'settings.json');

export function readSettingsFile(): string | undefined {
  try {
    const settings = file();
    return settings.exists ? settings.textSync() : undefined;
  } catch (e) {
    console.warn('Could not read the settings', e);
    return undefined;
  }
}

export function writeSettingsFile(text: string) {
  try {
    file().writeSync(text);
  } catch (e) {
    console.warn('Could not save the settings', e);
  }
}
