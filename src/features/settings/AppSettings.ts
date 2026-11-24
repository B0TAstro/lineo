import { Store } from '@/shared/lib/Store';

import { parseSettings, type Settings } from './logic/settings';

/** How the settings are read and saved: the phone's file, or a fake one in tests */
export type SettingsFile = { read: () => string | undefined; write: (text: string) => void };

/** The settings of the app, loaded once at launch and saved on every change */
export class AppSettings {
  readonly store: Store<Settings>;

  constructor(private readonly file: SettingsFile) {
    this.store = new Store(parseSettings(file.read()));
  }

  update(changes: Partial<Settings>) {
    this.store.set(changes);
    this.file.write(JSON.stringify(this.store.get()));
  }
}
