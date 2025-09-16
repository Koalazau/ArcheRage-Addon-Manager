console.log('[MAIN] process.argv:', process.argv);
const fs = require('fs');
const os = require('os');
const path = require('path');

// Emplacement du fichier temporaire pour le deeplink
const deeplinkFile = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  'ArcheRageAddonManager',
  'deeplink.txt'
);

// PATCH WINDOWS : bloque le lancement parasite d'Electron via le protocole custom (version robuste)
if (process.platform === 'win32') {
  const protoArg = process.argv.find(arg => typeof arg === 'string' && arg.startsWith('archerage.addonsmanager://'));
  // Si l'app est relancée juste pour le deeplink (pas d'autres arguments)
  if (protoArg && process.argv.length <= 3) {
    // Écrit le deeplink dans le fichier temporaire
    try {
      const dir = path.dirname(deeplinkFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(deeplinkFile, protoArg, 'utf8');
      console.log('[MAIN][DEEP] Deeplink écrit dans', deeplinkFile, ':', protoArg);
    } catch (e) {
      console.error('[MAIN][DEEP] Erreur écriture deeplink file:', e);
    }
    process.exit(0);
  }
}

const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;
let deeplinkUrl = null;

// GESTION DU PROTOCOLE CUSTOM SUR WINDOWS (deep link)
if (process.platform === 'win32') {
  // Si l'app est lancée avec un protocole custom en argument
  const deeplinkArg = process.argv.find(arg => arg.startsWith('archerage.addonsmanager://'));
  if (deeplinkArg) {
    deeplinkUrl = deeplinkArg;
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    console.log('[MAIN] second-instance event, argv:', argv);
    const deeplinkArg = argv.find(arg => arg.startsWith('archerage.addonsmanager://'));
    if (deeplinkArg && mainWindow) {
      console.log('[MAIN] Envoi deeplink via second-instance :', deeplinkArg);
      mainWindow.webContents.send('deeplink', deeplinkArg);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Enregistre le protocole custom pour le deep link OAuth
  if (!app.isDefaultProtocolClient('archerage.addonsmanager')) {
    app.setAsDefaultProtocolClient('archerage.addonsmanager');
  }

  // Handler IPC pour ouvrir une URL externe depuis preload.js
  ipcMain.handle('open-external-url', async (event, url) => {
    try {
      await shell.openExternal(url);
    } catch (e) {
      console.error('[MAIN] Erreur ouverture URL externe:', e);
    }
  });

  // Handler IPC pour ouvrir le dossier Addon dynamiquement
  ipcMain.handle('open-addon-folder', async (event) => {
    try {
      let addonPath = await event.sender.executeJavaScript('localStorage.getItem("arche-settings")');
      let pathStr = 'Documents/ArcheRage/Addon';
      if (addonPath) {
        const parsed = JSON.parse(addonPath);
        if (parsed.addonPath) pathStr = parsed.addonPath;
      }
      const fullPath = pathStr.includes(':') ? pathStr : require('path').join(require('os').homedir(), pathStr);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      await shell.openPath(fullPath);
    } catch (e) {
      console.error('[MAIN] Erreur ouverture dossier Addon:', e);
    }
  });

  // Handler IPC pour ouvrir/créer le dossier Backup dynamiquement
  ipcMain.handle('open-backup-folder', async (event) => {
    try {
      let backupPath = await event.sender.executeJavaScript('localStorage.getItem("arche-settings")');
      let pathStr = 'Documents/ArcheRage/AddonBackup';
      if (backupPath) {
        const parsed = JSON.parse(backupPath);
        if (parsed.backupPath) pathStr = parsed.backupPath;
      }
      const fullPath = pathStr.includes(':') ? pathStr : require('path').join(require('os').homedir(), pathStr);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      await shell.openPath(fullPath);
    } catch (e) {
      console.error('[MAIN] Erreur ouverture dossier Backup:', e);
    }
  });

  // Handler IPC pour désinstaller un addon
  ipcMain.handle('uninstall-addon', async (event, { addonId, addonName }) => {
    try {
      // 1. Récupère le chemin du dossier Addon
      let settingsRaw = await event.sender.executeJavaScript('localStorage.getItem("arche-settings")');
      let addonPath = 'Documents/ArcheRage/Addon';
      if (settingsRaw) {
        const parsed = JSON.parse(settingsRaw);
        if (parsed.addonPath) addonPath = parsed.addonPath;
      }
      const resolvePath = (p) => p.includes(':') ? p : require('path').join(require('os').homedir(), p);
      const addonDir = resolvePath(addonPath);
      // 2. Supprime le dossier ou le fichier principal de l'addon
      const targetPath = require('path').join(addonDir, addonName);
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        throw new Error('Dossier/fichier addon non trouvé : ' + targetPath);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ------------------ Local downloaded_addons file handlers ------------------
  const getAddonFilePath = () => {
    // Default fallback path relative to user home
    const homedir = require('os').homedir();
    let settings = null;
    try {
      settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'dist', 'settings-cache.json'), 'utf8'));
    } catch {}
    let addonDir = 'Documents/ArcheRage/Addon';
    if (settings && settings.addonPath) addonDir = settings.addonPath;
    const resolved = addonDir.includes(':') ? addonDir : path.join(homedir, addonDir);
    if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
    return path.join(resolved, 'downloaded_addons');
  };

  ipcMain.handle('addon-store-read', async () => {
    try {
      const file = getAddonFilePath();
      if (!fs.existsSync(file)) return '[]';
      return fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.error('[ADDON STORE] read error:', e);
      return '[]';
    }
  });
  ipcMain.handle('addon-store-write', async (event, text) => {
    try {
      const file = getAddonFilePath();
      fs.writeFileSync(file, text, 'utf8');
      return true;
    } catch (e) {
      console.error('[ADDON STORE] write error:', e);
      return false;
    }
  });
  ipcMain.handle('addon-store-add-or-update', async (event, { id, version }) => {
    try {
      const file = getAddonFilePath();
      let arr = [];
      if (fs.existsSync(file)) {
        try { arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch {}
      }
      const idx = arr.findIndex(a => String(a.id) === String(id));
      if (idx >= 0) arr[idx].version = version; else arr.push({ id, version });
      fs.writeFileSync(file, JSON.stringify(arr), 'utf8');
      return true;
    } catch (e) {
      console.error('[ADDON STORE] add/update error:', e);
      return false;
    }
  });
  ipcMain.handle('addonStore:fileExists', () => {
    const file = getAddonFilePath();
    return fs.existsSync(file);
  });

  ipcMain.handle('addon-store-remove', async (event, id) => {
    try {
      const file = getAddonFilePath();
      if (!fs.existsSync(file)) return true;
      let arr = [];
      try { arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch {}
      arr = arr.filter(a => String(a.id) !== String(id));
      fs.writeFileSync(file, JSON.stringify(arr), 'utf8');
      return true;
    } catch (e) {
      console.error('[ADDON STORE] remove error:', e);
      return false;
    }
  });

  // Handler IPC pour installer un addon complet
  ipcMain.handle('install-addon', async (event, { addon, user }) => {
    try {
      const JSZip = require('jszip');
      const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
      const SUPABASE_URL = 'https://bqowsaiwpqmztxyujmoa.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxb3dzYWl3cHFtenR4eXVqbW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTg3OTQsImV4cCI6MjA2NzczNDc5NH0.PfivsdHpMEdGfeoA6WNXm5G7m5WNOTD4XW2mB06641g';
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // 1. Récupère les chemins dynamiques via le renderer
      let settingsRaw = await event.sender.executeJavaScript('localStorage.getItem("arche-settings")');
      let addonPath = 'Documents/ArcheRage/Addon';
      let backupPath = 'Documents/ArcheRage/AddonBackup';
      if (settingsRaw) {
        const parsed = JSON.parse(settingsRaw);
        if (parsed.addonPath) addonPath = parsed.addonPath;
        if (parsed.backupPath) backupPath = parsed.backupPath;
      }
      const resolvePath = (p) => p.includes(':') ? p : require('path').join(require('os').homedir(), p);
      const addonDir = resolvePath(addonPath);
      const backupDir = resolvePath(backupPath);
      if (!fs.existsSync(addonDir)) fs.mkdirSync(addonDir, { recursive: true });
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      // 2. Télécharge le zip depuis Supabase
      const url = addon.downloadUrl || addon.FileURL || addon.fileUrl;
      if (!url) return { success: false, error: 'Aucune URL de téléchargement trouvée.' };
      let zipBuf;
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Erreur HTTP: '+resp.status);
        zipBuf = Buffer.from(await resp.arrayBuffer());
      } catch (e) {
        return { success: false, error: 'Téléchargement échoué: '+e.message };
      }

      // 3. Décompresse avec JSZip
      let zip;
      try {
        zip = await JSZip.loadAsync(zipBuf);
      } catch (e) {
        return { success: false, error: 'Décompression échouée: '+e.message };
      }

      // 4. Pour chaque fichier du zip
      const mergeFiles = (src, dest) => {
        // Fusionne deux fichiers texte (concatène), sinon écrase
        try {
          const srcContent = fs.readFileSync(src);
          if (fs.existsSync(dest)) {
            const destContent = fs.readFileSync(dest);
            // Si c'est du texte, concatène, sinon écrase
            if ((/\.(txt|json|xml|ini|cfg)$/i).test(src) && (/\.(txt|json|xml|ini|cfg)$/i).test(dest)) {
              fs.writeFileSync(dest, Buffer.concat([destContent, Buffer.from('\n'), srcContent]));
            } else {
              fs.writeFileSync(dest, srcContent);
            }
          } else {
            fs.writeFileSync(dest, srcContent);
          }
        } catch (e) {
          throw e;
        }
      };

      const tmp = require('os').tmpdir();
      const tmpExtractDir = require('path').join(tmp, 'arche_addon_tmp_'+Date.now());
      fs.mkdirSync(tmpExtractDir, { recursive: true });

      try {
        const files = Object.keys(zip.files);
        for (const fileName of files) {
          const file = zip.files[fileName];
          if (file.dir) continue;
          const outPath = require('path').join(addonDir, fileName);
          const backupPathFile = require('path').join(backupDir, fileName);
          // Décompresse dans un dossier temporaire
          const fileBuf = await file.async('nodebuffer');
          const tmpFile = require('path').join(tmpExtractDir, fileName);
          fs.mkdirSync(require('path').dirname(tmpFile), { recursive: true });
          fs.writeFileSync(tmpFile, fileBuf);
          // Backup si existe déjà
          if (fs.existsSync(outPath)) {
            fs.mkdirSync(require('path').dirname(backupPathFile), { recursive: true });
            if (fs.existsSync(backupPathFile)) {
              mergeFiles(outPath, backupPathFile); // fusionne backup
            } else {
              fs.copyFileSync(outPath, backupPathFile);
            }
          }
          // Copie/fusionne dans addonDir
          if (fs.existsSync(outPath)) {
            mergeFiles(tmpFile, outPath);
          } else {
            fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
            fs.copyFileSync(tmpFile, outPath);
          }
        }
        // Nettoyage du temp
        fs.rmSync(tmpExtractDir, { recursive: true, force: true });
      } catch (e) {
        return { success: false, error: 'Erreur lors de la copie/fusion des fichiers: '+e.message };
      }

      // 5. Met à jour Supabase (profil et compteur)
      try {
        // a) Ajoute l'addon/version dans le profil
        const userId = user?.id;
        if (userId) {
          const { data: profile, error: pErr } = await supabase.from('profiles').select('downloaded_addons').eq('id', userId).single();
          let downloaded = {};
          if (!pErr && profile && profile.downloaded_addons) downloaded = profile.downloaded_addons;
          downloaded[addon.id] = addon.version;
          await supabase.from('profiles').update({ downloaded_addons: downloaded }).eq('id', userId);
        }
        // b) Incrémente le compteur downloads
        if (addon.id) {
          await supabase.from('addons').update({ downloads: (addon.downloads||0)+1 }).eq('ID', addon.id);
        }
      } catch (e) {
        return { success: false, error: 'Mise à jour Supabase échouée: '+e.message };
      }

      return { success: true };
    } catch (e) {
      console.error('[MAIN] Erreur installation addon:', e);
      return { success: false, error: 'Erreur installation addon: '+e.message };
    }
  });

  // Handler pour ouvrir une popup Electron dédiée à l'OAuth Discord
  ipcMain.handle('start-discord-oauth-popup', async () => {
    try {
      const SUPABASE_URL = 'https://bqowsaiwpqmztxyujmoa.supabase.co';
      const REDIRECT_URI = 'archerage.addonsmanager://auth-callback';
      const OAUTH_URL = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(REDIRECT_URI)}`;
      console.log('[OAUTH POPUP] Handler appelé');
      console.log('[OAUTH POPUP] URL utilisée :', OAUTH_URL);
      oauthPopup = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });
      oauthPopup.loadURL(OAUTH_URL);
      oauthPopup.on('show', () => console.log('[OAUTH POPUP] popup affichée'));
      oauthPopup.on('closed', () => { console.log('[OAUTH POPUP] popup fermée'); oauthPopup = null; });
      // Fermer la popup si le deeplink est reçu (sécurité, mais le timer s'en charge aussi)
      const closePopup = () => { console.log('[OAUTH POPUP] Fermeture popup suite à deeplink'); try { oauthPopup && oauthPopup.close(); } catch {} };
      ipcMain.once('deeplink', closePopup);
      return true;
    } catch (e) {
      console.error('[MAIN] Erreur ouverture popup OAuth:', e);
      return false;
    }
  });

  function createWindow() {
    console.log('[MAIN] createWindow appelé');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'), // S'assure que preload est bien chargé
      },
    });
    // Supprime la barre de menu Electron
    mainWindow.removeMenu();
    Menu.setApplicationMenu(null);
    console.log('[MAIN] Fenêtre principale créée');

    // En dev, charger le serveur Vite. En prod, charger le build local.
    const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;
    const startUrl = isDev
      ? (process.env.ELECTRON_START_URL || 'http://localhost:5173')
      : `file://${path.join(__dirname, '/dist/index.html')}`;
    console.log("[MAIN] Chargement de l'URL front :", startUrl);
    mainWindow.loadURL(startUrl);
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Gestion du deeplink reçu à tout moment (pas seulement à la création)
    app.on('open-url', (event, url) => {
      event.preventDefault();
      console.log('[MAIN] open-url reçu :', url);
      if (mainWindow && mainWindow.webContents) {
        console.log('[MAIN] Envoi deeplink via open-url :', url);
        mainWindow.webContents.send('deeplink', url);
      }
    });
    // Envoie le deeplink à la fenêtre si reçu avant la création de la fenêtre
    if (deeplinkUrl) {
      console.log('[MAIN] deeplinkUrl reçu avant création fenêtre :', deeplinkUrl);
      console.log('[MAIN] Envoi deeplink à la création fenêtre :', deeplinkUrl);
      mainWindow.webContents.send('deeplink', deeplinkUrl);
    }

    return mainWindow;
  }

  // Référence globale à la popup OAuth
  let oauthPopup = null;

  // Vérifie le fichier deeplink toutes les 2 secondes (Windows)
  if (process.platform === 'win32') {
    setInterval(() => {
      try {
        if (fs.existsSync(deeplinkFile)) {
          const url = fs.readFileSync(deeplinkFile, 'utf8').trim();
          if (url && mainWindow && mainWindow.webContents) {
            console.log('[MAIN][DEEP] Deeplink détecté dans le fichier, envoi à renderer :', url);
            mainWindow.webContents.send('deeplink', url);
            fs.unlinkSync(deeplinkFile);
            console.log('[MAIN][DEEP] Fichier deeplink supprimé');
            // Ferme la popup OAuth si elle existe
            if (oauthPopup && !oauthPopup.isDestroyed()) {
              console.log('[MAIN][DEEP] Fermeture de la popup OAuth suite au deeplink');
              oauthPopup.close();
              oauthPopup = null;
            }
          }
        }
      } catch (e) {
        console.error('[MAIN][DEEP] Erreur lecture/suppression deeplink file:', e);
      }
    }, 2000);
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Gestion du popup OAuth Discord
  });

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });
}