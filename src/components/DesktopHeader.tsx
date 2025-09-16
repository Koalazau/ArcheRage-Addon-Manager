import logoDark from '../../assets/logo_arche.png';
import logoLight from '../../assets/logo_arche_light.png';
import { Bell, User, LogOut, Upload, Settings, RefreshCw } from 'lucide-react';
import { User as UserType } from '../types';

interface DesktopHeaderProps {
  onUserRoleChange: (role: 'player' | 'dev') => void;
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => void;
  onUploadClick: () => void;
  notifications: number;
  onNotificationsClick: () => void;
  onOpenSettings: () => void;
  theme: 'light' | 'dark';
}

import { useState, useEffect, useRef } from 'react';


export function DesktopHeader({ 
  user, 
  onLogin, 
  onLogout, 
  onUploadClick,
  notifications,
  onOpenSettings,
  theme,
  onUserRoleChange,
  onNotificationsClick,
}: DesktopHeaderProps) {
  const [role, setRole] = useState<'player' | 'dev'>('player');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && user.isDeveloper) {
      setRole('dev');
    } else {
      setRole('player');
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    }
    if (roleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleMenuOpen]);


  return (
    <div className={
      `${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-300'} border-b select-none`
    }>
      {/* Single Header Bar */}
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.location.reload()}>
            <img src={theme === 'dark' ? logoDark : logoLight} alt="Logo" className="h-8 pt-0.5" />
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'} text-sm`}>Addon Manager</span>
          </div>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center space-x-4">
          {/* Refresh */}
          <button
            className={`p-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            title="Refresh page"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {/* Notifications */}
          <button onClick={onNotificationsClick} title="Update panel" className={`relative p-2 animate-bell ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className={`absolute -top-1 -right-1 bg-red-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-xs rounded-full w-5 h-5 flex items-center justify-center`}>
                {notifications}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            className={`p-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            onClick={onOpenSettings}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* User Section */}
          {user ? (
            <div className="flex items-center space-x-3">
              {user.isDeveloper && (
                <button
                  onClick={onUploadClick}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm transition-colors bg-purple-600 text-white hover:bg-purple-700`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Dev Panel</span>
                </button>
              )}
              
              <div className="flex items-center space-x-2">
                <img
                  src={user.avatar && user.avatar.startsWith('http')
                    ? user.avatar
                    : user.avatar
                      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                      : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border-2 border-purple-400 bg-gray-800 object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                />
                <div className="text-sm">
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.username}</p>
                  <div className="relative inline-block">
                    <button
                      className={`flex items-center text-xs font-semibold focus:outline-none transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}
                      onClick={() => setRoleMenuOpen((open) => !open)}
                      type="button"
                    >
                      <span>{role === 'dev' ? 'Developer' : 'Player'}</span>
                      <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {roleMenuOpen && (
                      <div className={`absolute left-0 z-10 mt-1 w-24 rounded-md shadow-lg bg-white dark:bg-gray-900 ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                        <div className="py-1">
                          <button
                            className={`block w-full text-left px-4 py-2 text-xs ${role === 'player' ? 'font-bold' : ''} ${theme === 'dark' ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                            onClick={() => { setRole('player'); setRoleMenuOpen(false); onUserRoleChange('player'); }}
                          >
                            Player
                          </button>
                          <button
                            className={`block w-full text-left px-4 py-2 text-xs ${role === 'dev' ? 'font-bold' : ''} ${theme === 'dark' ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                            onClick={() => { setRole('dev'); setRoleMenuOpen(false); onUserRoleChange('dev'); }}
                          >
                            Developer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className={`p-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className={`flex items-center space-x-2 bg-purple-600 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm`}
            >
              <User className="h-4 w-4" />
              <span>Login with Discord</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}