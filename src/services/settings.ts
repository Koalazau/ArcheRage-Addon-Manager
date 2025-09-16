import { User } from '../types';

export interface PersistedSettings {
  theme: 'light' | 'dark';
  addonPath: string;
  backupPath: string;
  discordUser: User | null;
  discordToken: string | null;
}

const SETTINGS_KEY = 'arche-settings';

export const settingsService = {
  load(): PersistedSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      theme: 'light',
      addonPath: 'Documents/ArcheRage/Addon',
      backupPath: 'Documents/ArcheRage/AddonBackup',
      discordUser: null,
      discordToken: null
    };
  },
  save(settings: PersistedSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
  clear() {
    localStorage.removeItem(SETTINGS_KEY);
  }
};
