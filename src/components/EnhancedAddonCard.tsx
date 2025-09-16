import { Clock, User as UserIcon, CheckCircle, RefreshCw, AlertTriangle, Wrench } from 'lucide-react';
import { AddonRating } from './AddonRating';
import { localAddonService } from '../services/localAddonService';
import { Addon } from '../types';

import type { User } from '../types';
import { AddonDetailModal } from './AddonDetailModal';
import { Toast } from './Toast';

interface EnhancedAddonCardProps {
  theme: 'light' | 'dark';
  addon: Addon;
  viewMode?: 'list' | 'grid';
  user?: User | null;
  onLogin: () => void;
  onRefresh?: () => Promise<void>;
}

import { useState, useEffect } from 'react';

// Carousel d'images pour chaque addon (identique à DeveloperDashboard)
function AddonImageCarousel({ addon, className }: { addon: Addon, className?: string }) {
  let imageUrls: string[] = [];
  if (Array.isArray(addon.thumbnailUrl)) {
    imageUrls = addon.thumbnailUrl;
  } else if (typeof addon.thumbnailUrl === 'string') {
    try { imageUrls = JSON.parse(addon.thumbnailUrl); }
    catch { imageUrls = (addon.thumbnailUrl || '').split(/,|\n/).map((url: string) => url.trim()).filter(Boolean); }
  }
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (imageUrls.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(idx => (idx + 1) % imageUrls.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [imageUrls.length]);
  if (!imageUrls.length) return <div className={`w-full h-full flex items-center justify-center bg-gray-900/10 dark:bg-gray-800/30 rounded-lg text-xs text-gray-400 ${className}`}>No image</div>;
  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-gray-900/10 dark:bg-gray-800/30 overflow-hidden ${className}`}>
      <img src={imageUrls[currentIndex]} alt={addon.name} className="w-full h-full object-cover transition-all duration-500" />

      {imageUrls.length > 1 && (
        <>
          {/* Flèche gauche */}
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/70 dark:bg-gray-700/70 rounded-full p-1 shadow hover:bg-white dark:hover:bg-gray-800 z-10"
            onClick={e => { e.stopPropagation(); setCurrentIndex(idx => (idx - 1 + imageUrls.length) % imageUrls.length); }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor"><path d="M10 4l-4 4 4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {/* Flèche droite */}
          <button
            type="button"
            aria-label="Next image"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/70 dark:bg-gray-700/70 rounded-full p-1 shadow hover:bg-white dark:hover:bg-gray-800 z-10"
            onClick={e => { e.stopPropagation(); setCurrentIndex(idx => (idx + 1) % imageUrls.length); }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor"><path d="M6 4l4 4-4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {/* Points indicateurs */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imageUrls.map((_, idx) => (
              <span key={idx} className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-purple-400' : 'bg-gray-500 dark:bg-gray-600 opacity-50'} block`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}



export function EnhancedAddonCard({ addon, viewMode, theme, user, onLogin, onRefresh }: EnhancedAddonCardProps) {

  const [showModal, setShowModal] = useState(false);



  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'info'|'success'|'error', show: boolean }>({ message: '', type: 'info', show: false });
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);

  useEffect(() => {
    async function checkInstalled() {
      let installedLocally = false;
      let localVersion: string | null = null;
      try {
        const installed = JSON.parse(await localAddonService.readDownloadedAddons());
        const foundLocal = installed.find((a: any) => a.id === addon.id);
        if (foundLocal) {
          installedLocally = true;
          localVersion = foundLocal.version;
        }
      } catch {}

      let installedInProfile = false;
      let profileVersion: string | null = null;
      if (user?.id) {
        try {
          const downloadedAddons = await import('../services/supabaseUserService').then(s => s.fetchDownloadedAddons(user.id));
          if (downloadedAddons) {
            let downloaded: any[] = [];
            if (typeof downloadedAddons === 'string') {
              try { downloaded = JSON.parse(downloadedAddons); } catch { /* ignore */ }
            }
            const foundInProfile = downloaded.find((a: any) => String(a.id) === String(addon.id));
            if (foundInProfile) {
              installedInProfile = true;
              profileVersion = foundInProfile.version;
            }
          }
        } catch {}
      }

      const isNowInstalled = installedLocally || installedInProfile;
      setIsInstalled(isNowInstalled);
      setInstalledVersion(profileVersion || localVersion);
    }
    checkInstalled();
  }, [addon.id, showModal, user?.id]);




  // Badge status couleur
  const getStatusBadge = (status: string) => {
    if (isInstalled) {
      if (status === 'ready-to-use') {
        if (installedVersion && installedVersion !== addon.version) {
          return { icon: RefreshCw, text: 'Awaiting Update', className: 'bg-yellow-900 text-yellow-300' };
        }
        return { icon: CheckCircle, text: 'Installed', className: 'bg-blue-900 text-blue-300' };
      }
    }

    switch (status) {
      case 'ready-to-use':
        return { icon: CheckCircle, text: 'Ready to Use', className: 'bg-green-900 text-green-300' };
      case 'under-development':
        return { icon: Wrench, text: 'Under Development', className: 'bg-yellow-900 text-yellow-300' };
      case 'incompatible':
        return { icon: AlertTriangle, text: 'Incompatible', className: 'bg-red-900 text-red-300' };
      default:
        return { icon: CheckCircle, text: 'Ready to Use', className: 'bg-green-900 text-green-300' };
    }
  };
  const statusBadge = getStatusBadge(addon.status);
  const StatusIcon = statusBadge.icon;

  

    const renderCard = () => {
    if (viewMode === 'list') {
      return (
        <div className={`rounded-lg border flex flex-row items-center min-h-[120px] w-full max-w-none shadow hover:shadow-lg transition-all overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`} onClick={() => setShowModal(true)}>
          <div className="relative w-32 h-28 flex-shrink-0 ml-3">
            <AddonImageCarousel addon={addon} className="rounded-lg" />
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusBadge.className}`}>
              <StatusIcon className="h-3 w-3" />
              <span>{statusBadge.text}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-between px-4 py-3 min-w-0">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h3 className={`text-base font-semibold truncate max-w-full ${addon.warning ? 'text-yellow-600 dark:text-yellow-400' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{addon.name}</h3>{addon.warning && <AlertTriangle className="h-4 w-4 text-orange-400 ml-2" />}
              </div>
              <div className={`flex items-center space-x-4 text-xs mb-1 flex-wrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="flex items-center">
                  <UserIcon className="h-3 w-3 mr-1" />{addon.author}
                </span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />{addon.lastUpdated?.split('T')[0]}
                </span>
              </div>
              <p className={`text-xs mb-2 line-clamp-2 min-h-[2.5em] ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{addon.description}</p>
              <div onClick={e => e.stopPropagation()} className="mt-2">
                <AddonRating 
                  addonId={addon.id}
                  user={user}
                  initialAvgRating={addon.avgRating}
                  initialRatingCount={addon.ratingCount}
                  onRefresh={onRefresh}
                  theme={theme}
                  className="w-full justify-between"
                />
              </div>
            </div>
            <div className="mt-auto">
              <div className="flex items-center gap-4 text-xs flex-wrap w-full ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">
                <span>{addon.fileSize}</span>
                <span>{addon.downloads?.toLocaleString?.() ?? 0} downloads</span>
                <span className="text-purple-400 dark:text-purple-500 font-semibold">v{addon.version}</span>
                {addon.category && (
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-200 text-gray-700 border-gray-400'}`}>{addon.category}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } else { // GRID VIEW
      return (
        <div
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} relative flex flex-col rounded-xl shadow-lg border hover:shadow-2xl transition-all duration-300 overflow-hidden group mb-4 w-[340px] h-[300px] min-w-[340px] max-w-[340px] cursor-pointer`}
          onClick={() => setShowModal(true)}
        >
          <div className="relative w-full h-32 bg-gray-200 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
            <AddonImageCarousel addon={addon} className="rounded-lg" />
            {addon.status && (
              <span className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(addon.status).className}`}>
                {getStatusBadge(addon.status).text}
              </span>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h3 className={`text-base font-semibold truncate max-w-full ${addon.warning ? 'text-yellow-600 dark:text-yellow-400' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{addon.name}</h3>{addon.warning && <AlertTriangle className="h-4 w-4 text-orange-400 ml-2" />}
              </div>
              <div className={`flex items-center text-xs mb-1 flex-wrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="flex items-center">
                  <UserIcon className="h-3 w-3 mr-1" />{addon.author}
                </span>
                <span className="flex items-center ml-auto">
                  <Clock className="h-3 w-3 mr-1" />{addon.lastUpdated?.split('T')[0]}
                </span>
              </div>
              <p className={`text-xs mb-3 line-clamp-2 min-h-[2.5em] max-w-full w-auto overflow-hidden ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{addon.description}</p>
              <div onClick={e => e.stopPropagation()}>
                <AddonRating 
                  addonId={addon.id}
                  user={user}
                  initialAvgRating={addon.avgRating}
                  initialRatingCount={addon.ratingCount}
                  onRefresh={onRefresh}
                  theme={theme}
                  className="w-full justify-between"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-4 flex-wrap w-full">
              <span>{addon.fileSize}</span>
              <span>{addon.downloads?.toLocaleString?.() ?? 0} downloads</span>
              <span className="text-purple-400 dark:text-purple-500 font-semibold">v{addon.version}</span>
              {addon.category && (
                <span className={`ml-auto px-2 py-0.5 rounded text-xs border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-200 text-gray-700 border-gray-400'}`}>{addon.category}</span>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      {renderCard()}
      <AddonDetailModal
        addon={addon}
        open={showModal}
        onClose={() => setShowModal(false)}
        theme={theme}
        user={user}
        onLogin={onLogin}
        onRefresh={onRefresh}
        installedVersion={installedVersion}
        onInstall={async () => {
          setLoading(true);
          setToast({ message: 'Installing...', type: 'info', show: true });
          try {
            const electronAny = window.electron as any;
            if (electronAny && typeof electronAny.installAddon === 'function') {
              const result = await electronAny.installAddon(addon, user);
              if (result.success) {
                try {
                  const { incrementAddonDownloads } = await import('../services/supabaseAddonService');
                  await incrementAddonDownloads(addon.id);
                } catch (err) { /* ignore */ }
                try {
                  if (user) {
                    const { addDownloadedAddonToProfile } = await import('../services/supabaseUserService');
                    await addDownloadedAddonToProfile(user.id, addon.id, addon.version);
                  }
                } catch (err) { /* ignore */ }
                // update guest/local downloaded_addons list
                try {
                  const current = JSON.parse(await localAddonService.readDownloadedAddons());
                  const idx = current.findIndex((a: any)=> String(a.id) === String(addon.id));
                  const entry = { id: String(addon.id), version: addon.version };
                  if (idx >= 0) current[idx] = entry; else current.push(entry);
                  await localAddonService.writeDownloadedAddons(JSON.stringify(current));
                } catch {/* ignore */}
                const wasUpdate = isInstalled && installedVersion && installedVersion !== addon.version;
                setIsInstalled(true);
                setToast({ message: wasUpdate ? 'Addon updated.' : 'Addon installed.', type: 'success', show: true });
                if (onRefresh) await onRefresh();
                setShowModal(false);
              } else {
                setToast({ message: result.error || 'Unknown installation error', type: 'error', show: true });
              }
            } else {
              setToast({ message: 'installAddon function not available in window.electron', type: 'error', show: true });
            }
          } catch (e: any) {
            setToast({ message: 'Fatal error: ' + (e?.message || String(e)), type: 'error', show: true });
          } finally {
            setLoading(false);
            setTimeout(() => setToast({ ...toast, show: false }), 3000);
          }
        }}
        onUninstall={async () => {
          setLoading(true);
          try {
            const electronAny = window.electron as any;
            if (electronAny && typeof electronAny.uninstallAddon === 'function') {
              // Détermine le nom du dossier à désinstaller : extrait le nom du .zip depuis l'URL Supabase
              let uninstallName = addon.name;
              const urlCandidate: string | undefined = (addon.downloadUrl || (addon as any).FileURL || (addon as any).fileUrl) as string | undefined;
              if (urlCandidate) {
                try {
                  const lastPart = urlCandidate.split('/').pop() || '';
                  uninstallName = lastPart.replace(/\.zip$/i, '');
                } catch {/* fallback to addon.name */}
              }
              await electronAny.uninstallAddon(addon.id, uninstallName);
            }
            try {
              const installed = JSON.parse(await localAddonService.readDownloadedAddons());
              const filtered = installed.filter((a: any) => a.id !== addon.id);
              await localAddonService.writeDownloadedAddons(JSON.stringify(filtered));
            } catch {}
            try {
              if (user) {
                const { removeDownloadedAddonFromProfile } = await import('../services/supabaseUserService');
                await removeDownloadedAddonFromProfile(user.id, String(addon.id));

              }
            } catch (e: any) {
              setToast({ message: 'Failed to remove from Supabase: ' + (e?.message || e), type: 'error', show: true });
            }
            setIsInstalled(false);
            setToast({ message: 'Addon removed.', type: 'success', show: true });
            if (onRefresh) await onRefresh();
            setShowModal(false);
          } catch (e: any) {
            setToast({ message: 'Uninstall failed: ' + (e?.message || e), type: 'error', show: true });
          } finally {
            setLoading(false);
          }
        }}
        isInstalled={isInstalled}
        loading={loading}
      />
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
}