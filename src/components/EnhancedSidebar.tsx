
import { Search, Filter, Grid, List, SortAsc, SortDesc, Star, Download, Clock, User, Folder, HardDrive, CheckCircle, AlertTriangle, Database } from 'lucide-react';
// Cleanup: only icons that are actually used in the JSX are imported.

interface EnhancedSidebarProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: 'name' | 'downloads' | 'avgRating' | 'lastUpdated';
  onSortChange: (sort: 'name' | 'downloads' | 'avgRating' | 'lastUpdated') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  installedCount: number;
  totalAddons: number;
  upToDateCount: number;
  outdatedCount: number;
  onOutdatedClick?: () => void;
  theme: 'light' | 'dark';
}

export function EnhancedSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  installedCount,
  totalAddons,
  upToDateCount,
  outdatedCount,
  onOutdatedClick,
  theme
}: EnhancedSidebarProps) {


  const sortOptions = [
    { key: 'name', label: 'Name', icon: User },
    { key: 'downloads', label: 'Downloads', icon: Download },
    { key: 'avgRating', label: 'Rating', icon: Star },
    { key: 'lastUpdated', label: 'Last Updated', icon: Clock }
  ];

  return (
    <div className={`w-72 flex flex-col ${theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-gray-100 border-gray-300 text-gray-800'}`}>
      <div className={`${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} p-6 border-b`}>
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              <Search className="h-4 w-4 inline mr-2" />
              Search Addons
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Name, Author"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Categories */}
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              <Filter className="h-4 w-4 inline mr-2" />
              Categories
            </label>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white shadow-sm'
                      : (theme === 'dark' ? 'text-gray-300' : 'text-gray-600') + ' hover:bg-gray-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode */}
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              Display Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white'
                    : (theme === 'dark' ? 'text-gray-300' : 'text-gray-600') + ' hover:bg-gray-800'
                }`}
              >
                <Grid className="h-4 w-4" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : (theme === 'dark' ? 'text-gray-300' : 'text-gray-600') + ' hover:bg-gray-800'
                }`}
              >
                <List className="h-4 w-4" />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              Sort By
            </label>
            <div className="space-y-1">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    onClick={() => onSortChange(option.key as any)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center ${
                      sortBy === option.key
                        ? 'bg-purple-600 text-white'
                        : (theme === 'dark' ? 'text-gray-300' : 'text-gray-600') + ' hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={() => onSortOrderChange('asc')}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  sortOrder === 'asc'
                    ? 'bg-purple-600 text-white'
                    : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700') + ' hover:text-white'
                }`}
              >
                <SortAsc className="h-3 w-3" />
                <span>Asc</span>
              </button>
              <button
                onClick={() => onSortOrderChange('desc')}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  sortOrder === 'desc'
                    ? 'bg-purple-600 text-white'
                    : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700') + ' hover:text-white'
                }`}
              >
                <SortDesc className="h-3 w-3" />
                <span>Desc</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-6 border-b border-gray-800">
        <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-3`}>Statistics</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Installed:
            </span>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-purple-600'}`}>{installedCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Up to Date:
            </span>
            <span className="text-green-400 font-medium">{upToDateCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              Outdated:
            </span>
            <span className={`font-medium ${outdatedCount > 0 ? 'text-orange-400' : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}`}>
              {outdatedCount > 0 ? outdatedCount : 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <Database className="h-3 w-3 mr-1" />
              Total Available:
            </span>
            <span className="text-purple-400 font-medium">{totalAddons}</span>
          </div>
          <div className="mt-3 p-2 bg-gray-800 rounded-lg">
            <div className="text-xs text-center">
              {outdatedCount === 0 ? (
                <span className="text-green-400 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All addons are ready to use
                </span>
              ) : (
                <button
                  onClick={onOutdatedClick}
                  className="text-orange-400 flex items-center justify-center w-full focus:outline-none hover:underline cursor-pointer">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {outdatedCount} addon{outdatedCount > 1 ? 's' : ''} need{outdatedCount === 1 ? 's' : ''} update
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 flex-1">
        <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-3`}>Quick Actions</h3>
        <div className="space-y-2">
          
          <button
            className={`w-full flex items-center space-x-2 px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:bg-gray-800 rounded-lg transition-colors`}
            onClick={() => window.electron.openAddonFolder && window.electron.openAddonFolder()}
          >
            <Folder className="h-4 w-4" />
            <span>Open Addon Folder</span>
          </button>
          <button
            className={`w-full flex items-center space-x-2 px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:bg-gray-800 rounded-lg transition-colors`}
            onClick={() => window.electron.openBackupFolder && window.electron.openBackupFolder()}
          >
            <HardDrive className="h-4 w-4" />
            <span>Open Back Up Folder</span>
          </button>
        </div>
      </div>
    </div>
  );
}