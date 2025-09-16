export {};

declare global {
  interface ElectronAPI {
    startDiscordOAuth: () => Promise<any>;
    startDiscordOAuthPopup: () => Promise<any>;
    openAddonFolder: () => Promise<void>;
    openBackupFolder: () => Promise<void>;
    onDeepLink: (cb: (url: string) => void) => void;
    getLastDeeplink: () => string | null;
  }
  interface Window {
    electron: ElectronAPI;
  }
}

