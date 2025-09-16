import { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  addonPath: string;
  backupPath: string;
  onAddonPathChange: (path: string) => void;
  onBackupPathChange: (path: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  addonPath,
  backupPath,
  onAddonPathChange,
  onBackupPathChange
}: SettingsModalProps) {
  const [localAddonPath, setLocalAddonPath] = useState(addonPath);
  const [localBackupPath, setLocalBackupPath] = useState(backupPath);
  const [localTheme, setLocalTheme] = useState(theme);

  const handleSave = () => {
    onAddonPathChange(localAddonPath);
    onBackupPathChange(localBackupPath);
    onThemeChange(localTheme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className={`${theme === 'dark' ? 'bg-gray-900 border border-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-lg shadow-lg p-8 w-full max-w-md`}>
        <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">Theme</label>
            <select
              value={localTheme}
              onChange={e => setLocalTheme(e.target.value as 'light' | 'dark')}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">Addon Folder</label>
            <input
              type="text"
              value={localAddonPath}
              onChange={e => setLocalAddonPath(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">Backup Folder</label>
            <input
              type="text"
              value={localBackupPath}
              onChange={e => setLocalBackupPath(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div className="flex justify-end mt-6 space-x-2">
          <button onClick={onClose} className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Save</button>
        </div>
      </div>
    </div>
  );
}
