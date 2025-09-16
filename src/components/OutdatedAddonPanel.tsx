import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Addon } from '../types';

interface Props {
  addons: Addon[];
  open: boolean;
  onClose: () => void;
  onUpdate: (addon: Addon) => Promise<void>;
  onUpdateAll: () => Promise<void>;
  theme?: 'light' | 'dark';
}

export function OutdatedAddonPanel({ addons, open, onClose, onUpdate, onUpdateAll, theme: _theme = 'light' }: Props) {
  const theme = _theme;
  const isDark = theme === 'dark';
  // Effet: si open passe de true à false OU si addons passe de non-vide à vide, reload
  const prevOpen = useRef(open);
  const prevCount = useRef(addons.length);
  useEffect(() => {
    if (prevOpen.current && !open) {
      window.location.reload();
    }
    if (prevCount.current > 0 && addons.length === 0 && open) {
      onClose();
      window.location.reload();
    }
    prevOpen.current = open;
    prevCount.current = addons.length;
  }, [open, addons.length, onClose]);
  if (!open) return null;


  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end">
      {/* backdrop clickable */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className={`relative w-full max-w-md h-full flex flex-col animate-slide-in-right ${isDark ? 'bg-gray-900' : 'bg-white'} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${theme === 'dark' ? 'dark:border-gray-700' : 'light:border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex items-center gap-2`}>
            {addons.length} Update{addons.length !== 1 && 's'} Available
          </h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'} ${isDark ? 'text-gray-300' : 'text-gray-900'} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Update All */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'dark:border-gray-700' : 'light:border-gray-200'}`}>
          <button
            onClick={onUpdateAll}
            className={`w-full font-semibold py-2 rounded-md text-sm ${isDark ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-yellow-500 hover:bg-yellow-600'} text-gray-900`}
          >
            Update All
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 p-3">
          {addons.map((addon) => (
            <div key={addon.id} className={`flex items-center gap-3 border rounded-md p-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <img
                src={((): string => {
                  const t = addon.thumbnailUrl;
                  if (Array.isArray(t)) return t[0] || '';
                  if (typeof t === 'string') {
                    // If it's a JSON stringified array, try to parse
                    const trimmed = t.trim();
                    if (trimmed.startsWith('[')) {
                      try {
                        const arr = JSON.parse(trimmed);
                        if (Array.isArray(arr)) return arr[0] || '';
                      } catch {}
                    }
                    // Otherwise assume comma-separated string
                    return trimmed.replace(/^\[|\]$/g, '').split(',')[0].replace(/^"|"$/g, '').trim();
                  }
                  return '';
                })()}
                alt={addon.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-black'}" title={addon.name}>{addon.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Installed v{addon.installedVersion ?? '–'} → New v{addon.version}</p>
              </div>
              <button
                onClick={() => onUpdate(addon)}
                className={`font-semibold text-xs px-3 py-1 rounded-md ${isDark ? 'bg-yellow-600 hover:bg-yellow-500 text-gray-900' : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'}`}
              >
                Update
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// simple slide animation with tailwind arbitrary keyframes (needs tailwind config)
// .animate-slide-in-right { @apply animate-[slide-in_0.3s_ease-out_forwards]; }
// @keyframes slide-in { from { transform: translateX(100%); opacity:0;} to { transform: translateX(0); opacity:1;} }
