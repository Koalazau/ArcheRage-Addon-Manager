const { contextBridge, ipcRenderer } = require('electron');

const { shell } = require('electron');

console.log('[PRELOAD] preload.js loaded');

let lastDeeplink = null;

contextBridge.exposeInMainWorld('electron', {
  // ...autres handlers,
  uninstallAddon: (addonId, addonName) => ipcRenderer.invoke('uninstall-addon', { addonId, addonName }),
  startDiscordOAuthPopup: async () => {
    console.log('[PRELOAD] startDiscordOAuthPopup called');
    return await ipcRenderer.invoke('start-discord-oauth-popup');
  },

  onDeepLink: (callback) => {
    ipcRenderer.removeAllListeners('deeplink');
    ipcRenderer.on('deeplink', (event, url) => {
      console.log('[PRELOAD] deeplink reçu (bridge):', url);
      console.log('[PRELOAD] appel callback bridge deeplink');
      callback(url);
    });
  },
  getLastDeeplink: () => lastDeeplink,
  openAddonFolder: () => ipcRenderer.invoke('open-addon-folder'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  installAddon: (addon, user) => ipcRenderer.invoke('install-addon', { addon, user }),

  // Local downloaded_addons file manipulation
  addonStore: {
    readDownloadedAddons: () => ipcRenderer.invoke('addon-store-read'),
    writeDownloadedAddons: (text) => ipcRenderer.invoke('addon-store-write', text),
    addOrUpdateAddon: (id, version) => ipcRenderer.invoke('addon-store-add-or-update', { id, version }),
    removeAddon: (id) => ipcRenderer.invoke('addon-store-remove', id),
    fileExists: () => ipcRenderer.invoke('addonStore:fileExists'),
  }
});

// Log direct pour tester la réception du channel IPC même sans contextBridge
ipcRenderer.on('deeplink', (event, url) => {
  console.log('[PRELOAD] deeplink reçu (direct):', url);
  lastDeeplink = url;
});