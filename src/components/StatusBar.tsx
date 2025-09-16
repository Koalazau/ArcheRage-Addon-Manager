import { Wifi, Download, Upload } from 'lucide-react';

interface StatusBarProps {
  isOnline: boolean;
  isDiscordConnected: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export function StatusBar({ 
  isOnline, 
  isDiscordConnected,
  syncStatus
}: StatusBarProps) {
  return (
    <div className="bg-gray-900 border-t border-gray-800 h-8 flex items-center justify-between px-4 text-xs text-gray-400">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Wifi className={`h-3 w-3 ${isOnline ? 'text-green-400' : 'text-red-400'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          {syncStatus === 'syncing' && <Upload className="h-3 w-3 text-blue-400 animate-pulse" />}
          {syncStatus === 'error' && <Download className="h-3 w-3 text-red-400" />}
          <span className={`${
            syncStatus === 'syncing' ? 'text-blue-400' : 
            syncStatus === 'error' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {syncStatus === 'syncing' ? 'Syncing...' : 
             syncStatus === 'error' ? 'Sync Error' : isDiscordConnected ? 'Ready' : 'Connect Discord'}
          </span>
        </div>
      </div>
    </div>
  );
}