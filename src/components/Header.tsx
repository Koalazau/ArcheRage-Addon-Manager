import { User, LogOut, Upload } from 'lucide-react';
import logoDark from '../../assets/logo_arche.png';
import logoLight from '../../assets/logo_arche_light.png';
import { User as UserType } from '../types';

interface HeaderProps {
  theme: 'light' | 'dark';
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => void;
  onToggleDeveloper: () => void;
  isDeveloperMode: boolean;
}

export function Header({ user, onLogin, onLogout, onToggleDeveloper, isDeveloperMode, theme }: HeaderProps) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img src={theme === 'dark' ? logoDark : logoLight} alt="ArcheRage Logo" className="h-12 pt-0.5" />
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {user.isDeveloper && (
                <button
                  onClick={onToggleDeveloper}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isDeveloperMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>{isDeveloperMode ? 'Developer Mode' : 'Switch to Dev'}</span>
                </button>
              )}
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border-2 border-purple-400"
                />
                <div>
                  <p className="text-sm font-medium text-white">{user.username || 'DiscordUser'}</p>
                  <p className="text-xs text-gray-400">
                    {user.isDeveloper ? 'Developer' : 'Player'}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Login with Discord</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}