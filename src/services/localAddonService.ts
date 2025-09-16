
/**
 * Local Addon Service
 * --------------------
 * Wrapper used in the renderer process to manipulate the text file `downloaded_addons` via
 * the Electron main process. Falls back to localStorage when the IPC bridge is unavailable
 * (e.g. in the browser during `vite dev`).
 */

export interface DownloadedAddonEntry { id: string; version: string; }

const FALLBACK_KEY = 'installed_addons';

function isBridgeAvailable() {
  return typeof window !== 'undefined' && (window as any).electron && (window as any).electron.addonStore;
}

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

export const localAddonService = {
  /**
   * Checks if the downloaded_addons file truly exists on disk.
   * In dev mode, falls back to checking localStorage presence.
   */
  async fileExists(): Promise<boolean> {
    if (isBridgeAvailable()) {
      // This requires a 'fileExists' handler in the main process via preload script
      return (window as any).electron.addonStore.fileExists();
    }
    // Fallback for browser development
    return localStorage.getItem(FALLBACK_KEY) !== null;
  },

  /** Read the raw JSON string from the file. Returns `'[]'` if nothing found */
  async readDownloadedAddons(): Promise<string> {
    if (isBridgeAvailable()) {
      try {
        const text = await (window as any).electron.addonStore.readDownloadedAddons();
        return text ?? '[]';
      } catch {
        return '[]';
      }
    }
    // Fallback: localStorage
    return localStorage.getItem(FALLBACK_KEY) || '[]';
  },

  /** Overwrite the file with the provided JSON string */
  async writeDownloadedAddons(text: string): Promise<void> {
    if (isBridgeAvailable()) {
      await (window as any).electron.addonStore.writeDownloadedAddons(text);
    } else {
      localStorage.setItem(FALLBACK_KEY, text);
    }
    // notify listeners
    listeners.forEach(fn => {
      try { fn(); } catch { /* ignore */ }
    });
  },

  /** Add or update an addon entry */
  async addOrUpdateAddon(id: string, version: string): Promise<void> {
    if (isBridgeAvailable()) {
      await (window as any).electron.addonStore.addOrUpdateAddon(id, version);
      return;
    }
    // Fallback
    try {
      const arr: DownloadedAddonEntry[] = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
      const idx = arr.findIndex(a => String(a.id) === String(id));
      if (idx >= 0) arr[idx].version = version; else arr.push({ id, version });
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(arr));
    } catch {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify([{ id, version }]));
    }
  },

  /** Remove an addon entry */
  async removeAddon(id: string): Promise<void> {
    if (isBridgeAvailable()) {
      await (window as any).electron.addonStore.removeAddon(id);
      return;
    }
    try {
      const arr: DownloadedAddonEntry[] = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
      const filtered = arr.filter(a => String(a.id) !== String(id));
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
  },
};
