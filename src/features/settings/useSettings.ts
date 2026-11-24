import { useSyncExternalStore } from 'react';

import { AppSettings } from './AppSettings';
import { readSettingsFile, writeSettingsFile } from './native/settingsFile';

/** One for the whole app: every screen reads the same settings */
export const appSettings = new AppSettings({ read: readSettingsFile, write: writeSettingsFile });

export function useSettings() {
  return useSyncExternalStore(appSettings.store.subscribe, appSettings.store.get);
}
