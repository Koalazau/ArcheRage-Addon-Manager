// import React from 'react';
import { useState, useEffect, useMemo } from 'react';

import { DesktopHeader } from './components/DesktopHeader';
import { EnhancedSidebar } from './components/EnhancedSidebar';
import { AddonList } from './components/AddonList';

import { StatusBar } from './components/StatusBar';
import { Toast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { settingsService } from './services/settings';
import { localAddonService } from './services/localAddonService';

import { supabase } from './services/supabaseClient';

import { fetchAddons as fetchSupabaseAddons, uploadAddon } from './services/supabaseAddonService';
import { Addon, User } from './types';
import { OutdatedAddonPanel } from './components/OutdatedAddonPanel';
import { fileManager } from './services/fileManager';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
}

function App() {
  // Toast utility functions
  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  // ...
  const updateUserRole = async (newRole: 'player' | 'dev') => {
    if (!user) return;
    // Met à jour le rôle dans Supabase
    const { updateUserRoleInSupabase, fetchUserRole, mapSupabaseUserToUser } = await import('./services/supabaseUserService');
    await updateUserRoleInSupabase(user.id, newRole);
    // Recharge le rôle depuis Supabase pour être sûr
    const role = await fetchUserRole(user.id);
    const mappedUser = mapSupabaseUserToUser({
      ...user,
      user_metadata: {
        full_name: user.username,
        avatar_url: user.avatar,
        provider_id: user.discordId,
      }
    } as any, role);
    setUser(mappedUser);
    // Force a reload to ensure UI updates correctly after role change
    window.location.reload();
  };

  const [user, setUser] = useState<User | null>(null);
const [authUser, setAuthUser] = useState<any>(null);

const [addons, setAddons] = useState<Addon[]>([]);

  // Synchronize local downloaded_addons file with Supabase upon login
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Parse local list
        let localList: { id: string; version: string }[] = [];
        try {
          const text = await localAddonService.readDownloadedAddons();
          localList = JSON.parse(text);
        } catch { localList = []; }

        // Parse Supabase list
        let supaList: { id: string; version: string }[] = [];
        try {
          if (user.downloaded_addons) supaList = JSON.parse(user.downloaded_addons);
        } catch { supaList = []; }

        const localFileExists = await localAddonService.fileExists();

        if (localFileExists) {
          // CAS 1 : Le fichier existe. Il est le maître. On force la synchro vers Supabase.
          if (JSON.stringify(localList) !== JSON.stringify(supaList)) {
            const { setDownloadedAddonsList } = await import('./services/supabaseUserService');
            await setDownloadedAddonsList(user.id, localList);
          }
        } else {
          // CAS 2 : Le fichier n'existe pas. On le crée depuis la sauvegarde Supabase.
          await localAddonService.writeDownloadedAddons(JSON.stringify(supaList));
        }
      } catch (e) {
        console.error('[SYNC] Failed to synchronize downloaded_addons:', e);
      }
    })();
  }, [user]);

  // Refresh all data
  const refreshAll = async () => {
    // Reload addon list
    try {
      const addonsFromDb = await fetchSupabaseAddons();
      setAddons(addonsFromDb);

      // --- CLEAN LOCAL DOWNLOADED_ADDONS ---
      try {
        const text = await localAddonService.readDownloadedAddons();
        let localList: { id: string; version: string }[] = [];
        try { localList = JSON.parse(text); } catch { localList = []; }
        const availableIds = new Set(addonsFromDb.map(a => a.id));
        const cleanedList = localList.filter(entry => availableIds.has(entry.id));
        if (cleanedList.length !== localList.length) {
          await localAddonService.writeDownloadedAddons(JSON.stringify(cleanedList));
        }
      } catch (e) { console.warn('Failed to clean local downloaded_addons', e); }
      // -------------------------------------

    } catch (error) {
      setToast({ message: 'Failed to load addons.', type: 'error', show: true });
    }
    // Reload user profile for up-to-date stats
    if (user && authUser) {
      try {
        const { fetchUserProfile, mapSupabaseUserToUser } = await import('./services/supabaseUserService');
        const { data: profile } = await fetchUserProfile(user.id);
        if (profile) {
          console.log('[DEBUG] Profil Supabase:', profile);
          const mappedUser = mapSupabaseUserToUser(authUser, profile);
          setUser(mappedUser);
        }
      } catch (e) {
        // silent fail
      }
    }
  };


// Charge l'utilisateur courant (avec rôle) depuis Supabase après login ou deeplink
useEffect(() => {
  const checkSession = async () => {
    const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
    const supaUser = session?.user as any;
    if (supaUser) {
      console.log('[DEBUG] Auth user found, fetching full profile...', supaUser.id);
      const { fetchUserProfile, mapSupabaseUserToUser } = await import('./services/supabaseUserService');
      const { data: profile, error: profileError } = await fetchUserProfile(supaUser.id);
      setAuthUser(supaUser);

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // On utilise quand même les données de base de l'auth
        const mappedUser = mapSupabaseUserToUser(supaUser, 'player');
        setUser(mappedUser);
        return;
      }

      console.log('[DEBUG] Full profile fetched:', profile);
      const mappedUser = mapSupabaseUserToUser(supaUser, profile);
      console.log('[DEBUG] Mapped user from auth data and profile:', mappedUser);
      setUser(mappedUser);
    } else {
      setUser(null);
    }
  };
  checkSession();
  // On veut écouter le changement de session
  const { data: listener } = supabase.auth.onAuthStateChange(() => {
    checkSession();
  });
  return () => { listener?.subscription?.unsubscribe && listener.subscription.unsubscribe(); };
}, []);

  // DEBUG : Affiche l’état au render
  //'RENDER', { addons, user });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', show: false });
// Guest users local installed addons list (from downloaded_addons file)
const [guestDownloaded, setGuestDownloaded] = useState<{ id: string; version: string }[]>([]);

// Load guest downloaded addons on mount
useEffect(() => {
  (async () => {
    const text = await localAddonService.readDownloadedAddons();
    try {
      setGuestDownloaded(JSON.parse(text));
    } catch {
      setGuestDownloaded([]);
    }
  })();
}, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Sidebar states
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>("grid");
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'avgRating' | 'lastUpdated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showUploadPage, setShowUploadPage] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editAddon, setEditAddon] = useState<import('./types').DeveloperAddon | null>(null);
  // Notification system state
  const [outdatedAddons, setOutdatedAddons] = useState<Addon[]>([]);
  const [showOutdatedPanel, setShowOutdatedPanel] = useState(false);
  const [appError] = useState<Error | null>(null);

// Recharge la liste des addons à chaque fois que l'utilisateur est prêt
useEffect(() => {
  if (user && authUser) {
    refreshAll();
  }
}, [user, authUser]);

  const mainCategories = ['UI', 'Combat', 'Social', 'Utility', 'Economy'];
  const categories = ['All', 'Installed', ...mainCategories, 'Other'];

  const processedAddons = useMemo(() => {
    const checkIsInstalled = (addon: Addon) => {
      try {
         if (guestDownloaded.some((a: any) => String(a.id) === String(addon.id))) return true;
        if (user?.downloaded_addons) {
          const downloaded = JSON.parse(user.downloaded_addons);
          if (downloaded.some((a: any) => String(a.id) === String(addon.id))) return true;
        }
      } catch {}
      return false;
    };

    return addons
      .map(addon => ({ ...addon, isInstalled: checkIsInstalled(addon) }))
      .filter(addon => {
        if (
          searchTerm &&
          !addon.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(addon.author && addon.author.toLowerCase().includes(searchTerm.toLowerCase()))
        ) {
          return false;
        }

        if (selectedCategory === 'All') return true;
        if (selectedCategory === 'Installed') return addon.isInstalled;
        if (selectedCategory === 'Other') return !mainCategories.includes(addon.category);
        
        return addon.category === selectedCategory;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'lastUpdated':
            comparison = new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
            break;
          case 'downloads':
            comparison = (b.downloads ?? 0) - (a.downloads ?? 0);
            break;
          case 'avgRating':
            comparison = ((b.avgRating ?? 0) - (a.avgRating ?? 0));
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [addons, searchTerm, selectedCategory, sortBy, sortOrder, user, guestDownloaded]);

  const [addonStats, setAddonStats] = useState({ installed: 0, upToDate: 0, outdated: 0 });

  // Calcule les statistiques des addons installés
  useEffect(() => {
    console.log('[STATS DEBUG] Running statistics effect. User:', user);

    if ((!user && guestDownloaded.length === 0) || addons.length === 0) {
      if (user) console.log('[STATS DEBUG] Aborting: downloaded_addons is missing or empty.', user.downloaded_addons);

      setAddonStats({ installed: 0, upToDate: 0, outdated: 0 });
      return;
    }

    let downloaded: { id: string; version: string }[] = [];
    if (guestDownloaded.length > 0) {
      downloaded = guestDownloaded;
    } else if (user && user.downloaded_addons) {
      try {
        downloaded = JSON.parse(user.downloaded_addons);
      } catch {
        downloaded = [];
      }
    }

    const installed = downloaded.length;
    let upToDate = 0;
    let outdated = 0;

    const addonsMap = new Map(addons.map(a => [a.id, a.version]));

    downloaded.forEach((installedAddon: { id: string; version: string }) => {
      const latestVersion = addonsMap.get(installedAddon.id);
      if (latestVersion) {
        if (latestVersion === installedAddon.version) {
          upToDate++;
        } else {
          outdated++;
        }
      } else {
        // L'addon est installé mais n'existe plus dans la liste principale, on peut le compter comme "à jour" pour ne pas perturber l'utilisateur
        upToDate++; 
      }
    });

    setAddonStats({ installed, upToDate, outdated });

  }, [user, addons, guestDownloaded]);

  // Detect outdated addons and update notification count
  useEffect(() => {
    // Reuse the same logic as sidebar statistics to detect outdated addons
    let downloaded: { id: string; version: string }[] = [];
    if (guestDownloaded.length > 0) {
      downloaded = guestDownloaded;
    } else if (user?.downloaded_addons) {
      try {
        downloaded = JSON.parse(user.downloaded_addons);
      } catch {
        downloaded = [];
      }
    }

    if (downloaded.length === 0 || addons.length === 0) {
      setOutdatedAddons([]);
      return;
    }

    const addonsMap = new Map(addons.map(a => [String(a.id), a.version]));
    const outdated: Addon[] = [];
    downloaded.forEach(({ id, version }) => {
      const latestVersion = addonsMap.get(String(id));
      if (latestVersion && latestVersion !== version) {
        const addon = addons.find(a => String(a.id) === String(id));
        if (addon) {
          outdated.push({ ...addon, installedVersion: version });
        }
      }
    });
    setOutdatedAddons(outdated);
  }, [addons, user, guestDownloaded]);

  // Add-on upload handler (must be declared before render)
  const handleUploadAddon = async (addonFormData: any) => {
    try {
      // Merge the current user info into the metadata for uploadAddon
      await uploadAddon(addonFormData.file, { ...addonFormData, user });
      setToast({ message: 'Addon uploaded!', type: 'success', show: true });
      // Recharge la liste
      const addonsFromDb = await fetchSupabaseAddons();
      setAddons(addonsFromDb);
    } catch (e: any) {
      setToast({ message: 'Upload failed: ' + (e.message || e), type: 'error', show: true });
    }
  };

  // Initialisation settings (theme, paths)
  const persisted = settingsService.load();
  const [theme, setTheme] = useState<'light'|'dark'>(persisted.theme || 'light');
  const [addonPath, setAddonPath] = useState<string>(persisted.addonPath || '');
  const [backupPath, setBackupPath] = useState<string>(persisted.backupPath || '');

  // Affichage d'erreur global pour débogage
  if (appError) {
    return (
      <div style={{ padding: 40, color: 'red', background: 'white' }}>
        <h1>Application error</h1>
        <pre>{appError.message}</pre>
        <pre>{appError.stack}</pre>
      </div>
    );
  }

  // Enregistre le handler deeplink dès le montage
  useEffect(() => {
    console.log('[DEBUG] useEffect deeplink: window.electron =', window.electron);
    if (window.electron && window.electron.onDeepLink) {
      window.electron.onDeepLink(handleDeeplink);
      console.log('[DEBUG] onDeepLink handler registered in React');
    } else {
      console.error('[DEBUG] window.electron.onDeepLink indisponible');
    }
  }, []);

const handleDeeplink = async (deeplinkUrl?: string) => {
  console.log('[DEBUG] handleDeeplink appelé', deeplinkUrl);
  // Extraction des tokens du deeplink
  let access_token = null, refresh_token = null, expires_in = null, token_type = null;
  if (deeplinkUrl) {
    try {
      const fragment = deeplinkUrl.split('#')[1] || '';
      const params = new URLSearchParams(fragment);
      access_token = params.get('access_token');
      refresh_token = params.get('refresh_token');
      expires_in = params.get('expires_in');
      token_type = params.get('token_type');
      console.log('[DEBUG] Tokens extraits du deeplink:', { access_token, refresh_token, expires_in, token_type });
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        console.log('[DEBUG] Résultat setSession:', { data, error });
      } else {
        console.warn('[DEBUG] Impossible d’extraire les tokens du deeplink');
      }
    } catch (e) {
      console.error('[DEBUG] Erreur extraction/setSession deeplink:', e);
    }
  }
  // Recharge la session utilisateur
  const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
  const supaUser = session?.user as any;
  console.log('[DEBUG] handleDeeplink session:', session, 'supaUser:', supaUser);
  if (supaUser) {
    const { fetchUserRole, mapSupabaseUserToUser } = await import('./services/supabaseUserService');
    const userId = supaUser.id;
    const role = await fetchUserRole(userId);
    const mappedUser = mapSupabaseUserToUser(supaUser, role);
    setUser(mappedUser);
    console.log('[DEBUG] handleDeeplink user set:', mappedUser);
  } else {
    console.log('[DEBUG] handleDeeplink: aucun utilisateur connecté');
  }
};

// Charge les addons au démarrage de l'application
useEffect(() => {
  const loadAddons = async () => {
    try {
      const addonsFromDb = await fetchSupabaseAddons();
      setAddons(addonsFromDb);
    } catch (error) {
      setToast({ message: 'Failed to load addons.', type: 'error', show: true });
    }
  };
  loadAddons();
}, []); // Le tableau vide signifie que cela ne s'exécute qu'une fois au montage

  const handleLogin = async () => {
    console.log('[DEBUG] handleLogin appelé');
    setSyncStatus('syncing');
    try {
      if (window.electron && window.electron.startDiscordOAuthPopup) {
        console.log('[DEBUG] Appel window.electron.startDiscordOAuthPopup');
        await window.electron.startDiscordOAuthPopup();
        // L'utilisateur sera chargé via le handler deeplink (voir useEffect plus haut)
      } else {
        console.warn('[DEBUG] window.electron.startDiscordOAuthPopup indisponible, fallback supabase direct');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: { redirectTo: 'archerage.addonsmanager://auth-callback' }
        });
        if (error) setToast({ message: 'Login failed. Please try again.', type: 'error', show: true });
      }
    } finally {
      setSyncStatus('idle');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);

      setToast({ message: 'Logged out successfully', type: 'info', show: true });
    } catch (error) {
      setToast({ message: 'Logout failed', type: 'error', show: true });
    }
  };

  const handleUploadClick = () => setShowUploadPage(true);
  const handleCloseUpload = () => setShowUploadPage(false);

  // ---- Outdated addon handlers ----
  const handleUpdateAddon = async (addon: Addon) => {
    setToast({ message: `Updating ${addon.name}...`, type: 'info', show: true });
    try {
      let installOk = false;
      const electronAny = (window as any).electron;
      if (electronAny && typeof electronAny.installAddon === 'function') {
        const result = await electronAny.installAddon(addon, user);
        installOk = !!result?.success;
        if (!installOk) throw new Error(result?.error || 'Install failed');
      } else {
        // Fallback to local fileManager mock (dev / browser env)
        await fileManager.installAddon(addon);
        installOk = true;
      }

      // Met à jour le fichier local downloaded_addons (source de vérité)
      const { localAddonService } = await import('./services/localAddonService');
      let localList: any[] = [];
      try {
        localList = JSON.parse(await localAddonService.readDownloadedAddons());
      } catch {}
      const idx = localList.findIndex((a: any) => String(a.id) === String(addon.id));
      if (idx >= 0) {
        localList[idx].version = addon.version;
      } else {
        localList.push({ id: addon.id, version: addon.version });
      }
      await localAddonService.writeDownloadedAddons(JSON.stringify(localList));

      setToast({ message: `${addon.name} updated.`, type: 'success', show: true });
      setOutdatedAddons((prev) => prev.filter((a) => a.id !== addon.id));
      if (outdatedAddons.length === 1) setShowOutdatedPanel(false);
      await refreshAll();
    } catch (e: any) {
      setToast({ message: `Failed to update ${addon.name}`, type: 'error', show: true });
    }
  };

  const handleUpdateAll = async () => {
    setToast({ message: 'Updating all addons...', type: 'info', show: true });
    try {
      let failed = 0;
      const { localAddonService } = await import('./services/localAddonService');
      let localList: any[] = [];
      try {
        localList = JSON.parse(await localAddonService.readDownloadedAddons());
      } catch {}
      for (const a of outdatedAddons) {
        try {
          const electronAny = (window as any).electron;
          if (electronAny && typeof electronAny.installAddon === 'function') {
            const result = await electronAny.installAddon(a, user);
            if (!result?.success) throw new Error(result?.error || 'Install failed');
          } else {
            await fileManager.installAddon(a);
          }
          // Met à jour la version dans la liste locale
          const idx = localList.findIndex((addon: any) => String(addon.id) === String(a.id));
          if (idx >= 0) {
            localList[idx].version = a.version;
          } else {
            localList.push({ id: a.id, version: a.version });
          }
        } catch (err) {
          console.error('[UPDATE ALL] failed for', a.name, err);
          failed++;
        }
      }
      await localAddonService.writeDownloadedAddons(JSON.stringify(localList));
      setToast({ message: 'All addons updated.', type: 'success', show: true });
      setOutdatedAddons([]);
      setShowOutdatedPanel(false);
      await refreshAll();
    } catch {
      setToast({ message: 'Some addons failed to update.', type: 'error', show: true });
    }
  };


// ...
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
      <DesktopHeader
        user={user}
        onUserRoleChange={updateUserRole}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUploadClick={handleUploadClick}
        notifications={outdatedAddons.length}
        onNotificationsClick={() => setShowOutdatedPanel(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
      />
      <OutdatedAddonPanel
        addons={outdatedAddons}
        open={showOutdatedPanel}
        onClose={() => setShowOutdatedPanel(false)}
        onUpdate={handleUpdateAddon}
        onUpdateAll={handleUpdateAll}
        theme={theme}
      />
      <div className="flex-1 overflow-hidden">
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onThemeChange={(newTheme) => {
            setTheme(newTheme);
            settingsService.save({
              ...persisted,
              theme: newTheme,
              addonPath,
              backupPath,
              discordUser: user,
              discordToken: persisted.discordToken
            });
          }}
          addonPath={addonPath}
          backupPath={backupPath}
          onAddonPathChange={(path) => {
            setAddonPath(path);
            settingsService.save({
              ...persisted,
              theme,
              addonPath: path,
              backupPath,
              discordUser: user,
              discordToken: persisted.discordToken
            });
          }}
          onBackupPathChange={(path) => {
            setBackupPath(path);
            settingsService.save({
              ...persisted,
              theme,
              addonPath,
              backupPath: path,
              discordUser: user,
              discordToken: persisted.discordToken
            });
          }}
        />
        <div className="flex w-full min-h-0">
          <EnhancedSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy as (sort: 'name' | 'downloads' | 'avgRating' | 'lastUpdated') => void}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            installedCount={addonStats.installed}
            totalAddons={addons.length}
            upToDateCount={addonStats.upToDate}
            outdatedCount={addonStats.outdated}
            onOutdatedClick={() => setShowOutdatedPanel(true)}
            theme={theme}
          />
          {showUploadPage && user?.isDeveloper ? (
            <div className="flex-1 overflow-y-auto">
              {/* Map Addon[] to DeveloperAddon[] to satisfy type */}
              <DeveloperDashboard theme={theme}  
  addons={addons.map(a => ({
    ...a,
    uploadDate: a.lastUpdated || '',
    approvalStatus: (a as any).approvalStatus || 'approved',
    downloadCount: a.downloads ?? 0
  }))}
  user={user}
  onUploadAddon={handleUploadAddon}
  showUploadForm={showUploadForm}
  setShowUploadForm={setShowUploadForm}
  editAddon={editAddon}
  setEditAddon={setEditAddon}
  onRefresh={refreshAll}
/>
{showUploadPage && !showUploadForm && !editAddon && (
  <div className="flex justify-center mt-4">
    <button
      className="px-4 py-2 rounded font-semibold shadow bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:shadow-lg"
      onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          } else {
            handleCloseUpload();
          }
        }}
    >
      Back to Addon Page
    </button>
  </div>
)}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
            <AddonList
              addons={processedAddons}
              viewMode={viewMode}
              theme={theme}
              user={user}
              onLogin={handleLogin}
              onRefresh={refreshAll}
              searchTerm={searchTerm}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </div>
          )}

        </div>
      </div>
      <StatusBar
        isOnline={true}
        syncStatus={syncStatus}
        isDiscordConnected={!!user}
      />
    </div>
  );
}

export default App;