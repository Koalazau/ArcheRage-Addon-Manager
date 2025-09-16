import { Star, Clock, User } from 'lucide-react';
import { Addon } from '../types';

interface AddonCardProps {
  addon: Addon;
}

export function AddonCard({ addon }: AddonCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700">
      <div className="aspect-video">
        <img
          src={addon.thumbnailUrl}
          alt={addon.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{addon.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {addon.author}
              </span>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {addon.lastUpdated}
              </span>
            </div>
          </div>
          {/* Star rating: 5 étoiles centrées sous la description */}
        </div>

        <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-3">{addon.description}</p>

        {/* Star rating: 5 étoiles centrées sous la description */}
        <div className="flex justify-center mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 inline ${addon.avgRating && addon.avgRating >= i + 1 ? 'text-yellow-400' : 'text-gray-400'}`}
              fill={addon.avgRating && addon.avgRating >= i + 1 ? '#facc15' : 'none'}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{addon.fileSize}</span>
          <span>{addon.downloads.toLocaleString()} downloads</span>
          <span className="text-purple-400">v{addon.version}</span>
        </div>
        <div className="flex justify-end text-xs text-gray-500">
          {addon.lastUpdated}
        </div>
      </div>
    </div>
  );
}