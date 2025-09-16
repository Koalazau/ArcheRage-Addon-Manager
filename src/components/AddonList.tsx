import { Addon } from '../types';
import { EnhancedAddonCard } from './EnhancedAddonCard';

import { User } from '../types';

interface AddonListProps {
  theme: 'light' | 'dark';
  addons: Addon[];
  viewMode: 'grid' | 'list';
  user?: User | null;
  onLogin: () => void;
  onRefresh?: () => Promise<void>;
  selectedCategory?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'downloads' | 'avgRating' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

export function AddonList({ addons, viewMode, selectedCategory, searchTerm, theme, user, onLogin, onRefresh, sortBy, sortOrder }: AddonListProps) {
  // Filtrage par catégorie (si fourni)
    let filteredAddons = addons;

  // Tri des addons
  if (sortBy) {
    switch (sortBy) {
      case 'name':
        filteredAddons = [...filteredAddons].sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        break;
      case 'downloads':
        filteredAddons = [...filteredAddons].sort((a, b) => {
          return sortOrder === 'asc' ? (a.downloads || 0) - (b.downloads || 0) : (b.downloads || 0) - (a.downloads || 0);
        });
        break;
      case 'avgRating':
        filteredAddons = [...filteredAddons].sort((a, b) => {
          return sortOrder === 'asc' ? (a.avgRating || 0) - (b.avgRating || 0) : (b.avgRating || 0) - (a.avgRating || 0);
        });
        break;
      case 'lastUpdated':
        filteredAddons = [...filteredAddons].sort((a, b) => {
          const dateA = new Date(a.lastUpdated || '').getTime();
          const dateB = new Date(b.lastUpdated || '').getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        break;
    }
  }

  if (searchTerm) {
    filteredAddons = filteredAddons.filter(addon => 
      addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (addon.author && addon.author.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  if (selectedCategory && selectedCategory !== 'All') {
    filteredAddons = addons.filter(addon => addon.category && addon.category.toLowerCase() === selectedCategory.toLowerCase());
  }
  if (!filteredAddons || filteredAddons.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-gray-400">No addons found.</div>;
  }
  if (viewMode === 'list') {
    return (
      <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto w-full">
        {filteredAddons.map((addon) => (
          <div key={`${addon.id}-${addon.version}`} className="w-full">
            <EnhancedAddonCard theme={theme} 
              addon={addon}
              viewMode={viewMode}
              user={user}
              onLogin={onLogin}
              onRefresh={onRefresh}
            />
          </div>
        ))}
      </div>
    );
  }
  // grid mode
  return (
    <div className="flex flex-wrap gap-4 p-4 justify-start">
      {filteredAddons.map((addon) => (
        <EnhancedAddonCard 
          key={`${addon.id}-${addon.version}`} 
          theme={theme} 
          addon={addon}
          user={user}
          onLogin={onLogin}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
