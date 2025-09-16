import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, ChevronDown } from 'lucide-react';
import { fetchUserAddonRating, fetchAddonAverageRating, upsertUserAddonRating } from '../services/supabaseRatingsService';
import type { User } from '../types';

interface AddonRatingProps {
  addonId: string;
  user?: User | null;
  initialAvgRating?: number | null;
  initialRatingCount?: number;
  onRefresh?: () => void;
  className?: string;
  displayOnly?: boolean;
  theme?: 'light' | 'dark';
}

export const AddonRating: React.FC<AddonRatingProps> = ({
  theme = 'light',
  addonId,
  user,
  initialAvgRating = null,
  initialRatingCount = 0,
  onRefresh,
  className = '',
  displayOnly = false,
}) => {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState(initialAvgRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);

  useEffect(() => {
    setAvgRating(initialAvgRating);
    setRatingCount(initialRatingCount);
  }, [initialAvgRating, initialRatingCount]);

  const [isRatingOpen, setRatingOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown itself
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom, left: rect.right });
    }
  };

  useEffect(() => {
    if (isRatingOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isRatingOpen]);

  useEffect(() => {
    let ignore = false;
    async function fetchRatings() {
      if (user?.id) {
        try {
          const ur = await fetchUserAddonRating(addonId, user.id);
          if (!ignore) setUserRating(ur);
        } catch {}
      }
      try {
        const { avgRating: avg, ratingCount: count } = await fetchAddonAverageRating(addonId);
        if (!ignore) {
          setAvgRating(avg);
          setRatingCount(count);
        }
      } catch {}
    }
    fetchRatings();
    return () => { ignore = true; };
  }, [addonId, user?.id]);

  // Ferme le menu si clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close if the click is outside the button AND outside the dropdown
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setRatingOpen(false);
      }
    };
    if (isRatingOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRatingOpen]);

  const handleRating = async (rating: number) => {
    if (!user) return;
    setUserRating(rating);
    try {
      await upsertUserAddonRating(addonId, user.id, rating);
      const { avgRating: avg, ratingCount: count } = await fetchAddonAverageRating(addonId);
      setAvgRating(avg);
      setRatingCount(count);
      if (onRefresh) await onRefresh();
    } catch {}
    setRatingOpen(false);
  };

  return (
    <div className={`flex items-center gap-2 ${className.replace('justify-between', '')}`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`h-4 w-4 ${avgRating && avgRating >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
        ))}
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({ratingCount} Ratings)</span>
      </div>
      {!displayOnly && user && (
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={e => { e.stopPropagation(); setRatingOpen(v => !v); }}
            className="flex items-center text-xs text-purple-600 dark:text-purple-400 font-semibold px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            {userRating ? `You Rated: ${userRating}` : 'Rate'}
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isRatingOpen ? 'rotate-180' : ''}`} />
          </button>
          {isRatingOpen && createPortal(
            <div 
              ref={dropdownRef}
              style={{ top: dropdownPosition.top, left: dropdownPosition.left, width: '50px' }}
              className={`fixed border rounded-lg shadow-lg z-[9999] transform -translate-x-full ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} onClick={e => { e.stopPropagation(); handleRating(i); }} className="flex items-center justify-center px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{i}</span>
                  <Star className="h-4 w-4 ml-1 text-yellow-400 fill-yellow-400" />
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};
