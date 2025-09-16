import { Addon, User } from './types';

export {};

declare global {
  interface Window {
    electron: {
      startDiscordOAuthPopup: () => Promise<any>;
      onDeepLink: (cb: (url: string) => void) => void;
      getLastDeeplink: () => string | null;
      openAddonFolder: () => Promise<void>;
      openBackupFolder: () => Promise<void>;
      installAddon: (addon: Addon, user: User | null) => Promise<any>;
      uninstallAddon: (addonId: string, addonName: string) => Promise<any>;
    };
  }
}
