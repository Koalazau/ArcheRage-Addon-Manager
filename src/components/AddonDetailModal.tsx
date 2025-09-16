import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, User as UserIcon, Clock, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { AddonRating } from './AddonRating';

interface AddonDetailModalProps {
  theme?: 'light' | 'dark';
  addon: any;
  open: boolean;
  onClose: () => void;
  onInstall?: (addon: any) => void;
  onUninstall?: (addon: any) => void;
  isInstalled?: boolean;
  loading?: boolean;
  installedVersion?: string | null;
  user?: User | null;
  onLogin: () => void;
  onRefresh?: () => Promise<void>;
  displayOnly?: boolean;
}

export function AddonDetailModal({ addon, open, onClose, onInstall, onUninstall, isInstalled, loading, theme = 'light', installedVersion, user: _user, onLogin: _onLogin, displayOnly = false }: AddonDetailModalProps) {
  const isDark = theme === 'dark';
  const [currentIndex, setCurrentIndex] = useState(0);
  let imageUrls: string[] = [];
  if (Array.isArray(addon.thumbnailUrl)) {
    imageUrls = addon.thumbnailUrl;
  } else if (typeof addon.thumbnailUrl === 'string') {
    try { imageUrls = JSON.parse(addon.thumbnailUrl); }
    catch { imageUrls = (addon.thumbnailUrl || '').split(/,|\n/).map((url: string) => url.trim()).filter(Boolean); }
  }

  // Stop carousel animation in modal
  React.useEffect(() => { setCurrentIndex(0); }, [open, addon.id]);
  if (!open) return null;

  const handlePrev = () => setCurrentIndex(i => (i - 1 + imageUrls.length) % imageUrls.length);
  const handleNext = () => setCurrentIndex(i => (i + 1) % imageUrls.length);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black bg-opacity-60' : 'bg-white bg-opacity-60'}`}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      onClick={onClose}
      style={{ overscrollBehavior: 'contain', display: open ? 'flex' : 'none' }}
    >
      <div
        className={`relative w-full max-w-3xl ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg animate-modal-pop overflow-hidden flex flex-col`}
        style={{ maxHeight: '90vh', minWidth: '320px' }}
        onClick={e => e.stopPropagation()} // Prevents modal from closing on inner click
      >
        {/* Close button */}
        <button
          className={`absolute top-4 right-4 z-20 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} focus:outline-none`}
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        {/* Image & carousel */}
        <div className="relative flex items-center justify-center mb-4">
          {imageUrls.length > 1 && (
            <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-70 rounded-full p-2 z-10 flex items-center justify-center h-10 w-10">
              <ChevronLeft className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          )}
          <div className="w-full flex flex-col items-center justify-center bg-gray-800 rounded-t-lg p-4">
            {imageUrls.length > 0 && (
              <img
                src={imageUrls[currentIndex]}
                alt={addon.name}
                className="w-full max-w-full max-h-[50vh] rounded object-contain mb-3 transition-all duration-300"
                style={{ minHeight: '120px' }}
              />
            )}
          </div>
          {imageUrls.length > 1 && (
            <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-70 rounded-full p-2 z-10 flex items-center justify-center h-10 w-10">
              <ChevronRight className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          )}
        </div>
        {/* Infos générales */}
        <div className={`flex items-center justify-between w-full text-xs mb-4 px-4 gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <span className="flex-1 flex items-center justify-center text-center min-w-0 truncate"><UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />{addon.author || addon.Author || addon.author_name || addon.AuthorName || 'Unknown'}</span>
          <span className="flex-1 flex items-center justify-center text-center min-w-0 truncate"><Clock className="h-4 w-4 mr-1 flex-shrink-0" />{addon.lastUpdated?.split('T')[0]}</span>
          <span className="flex-1 flex items-center justify-center text-center min-w-0 truncate"><Download className="h-4 w-4 mr-1 flex-shrink-0" />{(addon.downloads ?? addon.Downloads ?? addon.downloadCount ?? addon.DownloadCount ?? 0).toLocaleString()} downloads</span>
          <span className="flex-1 flex items-center justify-end min-w-0">
            <AddonRating
              addonId={addon.id}
              initialAvgRating={addon.avg_rating}
              initialRatingCount={addon.ratings_count}
              theme={theme}
              displayOnly={true}
            />
          </span>
        </div>
        <h2 className={`text-xl font-bold mb-2 text-center px-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{addon.name}</h2>
        {addon.warning && (
          <div className="flex items-center gap-2 text-yellow-500 font-semibold px-6 mt-2">
            <AlertTriangle className="h-5 w-5" />
            This addon contains an executable or risky code. Proceed carefully.
          </div>
        )}
        {/* Description avec scroll */}
        <div className={`rounded-lg p-4 mb-4 flex-1 overflow-y-auto shadow-inner mx-4 whitespace-pre-line ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`} style={{minHeight:'56px'}}>
          {addon.description}
        </div>
        {/* Install/Uninstall btns - joli flex */}
        {!displayOnly && (
          <div className="flex flex-row flex-wrap gap-3 px-4 pb-6 w-full items-end justify-center">
            {!isInstalled && addon.status === 'ready-to-use' ? (
              <button
                onClick={() => onInstall && onInstall(addon)}
                disabled={loading}
                className={`flex-1 min-w-[180px] max-w-xs flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {loading ? 'Installing...' : 'Install'}
              </button>
            ) : !isInstalled ? (
              <div className="flex-1 min-w-[180px] max-w-xs flex items-center justify-center px-6 py-3 text-center text-gray-400">
                This Addon Is Not Ready To Use
              </div>
            ) : isInstalled ? (
              <>
                {installedVersion && installedVersion !== addon.version ? (
                  <button
                    onClick={() => onInstall && onInstall(addon)}
                    disabled={loading}
                    className={`flex-1 min-w-[140px] max-w-xs flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                ) : null}
                <button
                  onClick={() => onUninstall && onUninstall(addon)}
                  disabled={loading}
                  className={`flex-1 min-w-[140px] max-w-xs flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {loading ? 'Uninstalling...' : 'Uninstall'}
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
      <style>{`
        .animate-modal-pop {
          animation: modal-pop 0.25s cubic-bezier(.4,2,.6,1) both;
        }
        @keyframes modal-pop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
