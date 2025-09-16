import React, { useState, useEffect } from 'react';
import { Upload, Plus, Edit, Trash2, Download, Star, Eye, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, Wrench } from 'lucide-react';

import { AddonDetailModal } from './AddonDetailModal';
import { Toast } from './Toast';
import { DeveloperAddon } from '../types';
import { fetchUserAddonRating, fetchAddonAverageRating, upsertUserAddonRating } from '../services/supabaseRatingsService';

import { User } from '../types';

// Helper returning badge information for addon status
interface BadgeInfo { icon: any; text: string; className: string }
const getStatusBadge = (status: string, isInstalled: boolean, installedVersion: string | null, latestVersion: string): BadgeInfo => {
  if (isInstalled) {
    if (status === 'ready-to-use') {
      if (installedVersion && installedVersion !== latestVersion) {
        return { icon: RefreshCw, text: 'Awaiting Update', className: 'bg-yellow-900 text-yellow-300' };
      }
      return { icon: CheckCircle, text: 'Installed', className: 'bg-blue-900 text-blue-300' };
    }
  }
  switch (status) {
    case 'ready-to-use':
      return { icon: CheckCircle, text: 'Ready to Use', className: 'bg-green-900 text-green-300' };
    case 'under-development':
      return { icon: Wrench, text: 'Under Development', className: 'bg-yellow-900 text-yellow-300' };
    case 'incompatible':
      return { icon: AlertTriangle, text: 'Incompatible', className: 'bg-red-900 text-red-300' };
    default:
      return { icon: CheckCircle, text: 'Ready to Use', className: 'bg-green-900 text-green-300' };
  }
};

// Image carousel for each addon (logic identical to EnhancedAddonCard)
function AddonImageCarousel({ addon }: { addon: DeveloperAddon }) {
  let imageUrls: string[] = [];
  if (Array.isArray(addon.thumbnailUrl)) {
    imageUrls = addon.thumbnailUrl;
  } else if (typeof addon.thumbnailUrl === 'string') {
    try { imageUrls = JSON.parse(addon.thumbnailUrl); }
    catch { imageUrls = (addon.thumbnailUrl || '').split(/,|\n/).map((url: string) => url.trim()).filter(Boolean); }
  }
  const [currentIndex, setCurrentIndex] = React.useState(0);
  React.useEffect(() => {
    if (imageUrls.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(idx => (idx + 1) % imageUrls.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [imageUrls.length]);
  if (!imageUrls.length) return <div className="w-32 h-32 flex items-center justify-center bg-gray-900/10 dark:bg-gray-800/30 rounded-lg text-xs text-gray-400 mr-4">No image</div>;
  return (
    <div className="flex-shrink-0 relative w-32 h-32 flex items-center justify-center bg-gray-900/10 dark:bg-gray-800/30 rounded-lg overflow-hidden mr-4">
      <img src={imageUrls[currentIndex]} alt={addon.name} className="w-full h-full object-cover transition-all duration-500" />
      {imageUrls.length > 1 && (
        <>
          {/* Left arrow */}
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/70 dark:bg-gray-700/70 rounded-full p-1 shadow hover:bg-white dark:hover:bg-gray-800 z-10"
            onClick={e => { e.stopPropagation(); setCurrentIndex(idx => (idx - 1 + imageUrls.length) % imageUrls.length); }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor"><path d="M10 4l-4 4 4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {/* Right arrow */}
          <button
            type="button"
            aria-label="Next image"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/70 dark:bg-gray-700/70 rounded-full p-1 shadow hover:bg-white dark:hover:bg-gray-800 z-10"
            onClick={e => { e.stopPropagation(); setCurrentIndex(idx => (idx + 1) % imageUrls.length); }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor"><path d="M6 4l4 4-4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {/* Indicator dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imageUrls.map((_, idx) => (
              <span key={idx} className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-purple-400' : 'bg-gray-500 dark:bg-gray-600 opacity-50'} block`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Component to display and manage addon rating
const AddonRating = ({ addon, user }: { addon: DeveloperAddon, user: User }) => {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(addon.avgRating ?? null);
  const [ratingCount, setRatingCount] = useState<number>(addon.ratingCount ?? 0);
  const [isRatingOpen, setRatingOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchRatings() {
      if (user?.id) {
        try {
          const ur = await fetchUserAddonRating(addon.id, user.id);
          if (!ignore) setUserRating(ur);
        } catch (error) {
          console.error("Error fetching user rating:", error);
        }
      }
      try {
        const { avgRating: avg, ratingCount: count } = await fetchAddonAverageRating(addon.id);
        if (!ignore) {
          setAvgRating(avg);
          setRatingCount(count);
        }
      } catch (error) {
        console.error("Error fetching average rating:", error);
      }
    }
    fetchRatings();
    return () => { ignore = true; };
  }, [addon.id, user?.id]);

  const handleRating = async (rating: number) => {
    if (!user) return;
    setUserRating(rating);
    try {
      await upsertUserAddonRating(addon.id, user.id, rating);
      const { avgRating: avg, ratingCount: count } = await fetchAddonAverageRating(addon.id);
      setAvgRating(avg);
      setRatingCount(count);
    } catch (error) {
      console.error("Error upserting rating:", error);
    }
    setRatingOpen(false);
  };

  return (
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`h-4 w-4 ${avgRating && avgRating >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
        ))}
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({ratingCount} Ratings)</span>
      </div>

      {user && (
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setRatingOpen(!isRatingOpen); }} 
            className="flex items-center text-xs text-purple-600 dark:text-purple-400 font-semibold">
            {userRating ? `You Rated: ${userRating}` : 'Rate'}
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isRatingOpen ? 'rotate-180' : ''}`} />
          </button>
          {isRatingOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} onClick={(e) => { e.stopPropagation(); handleRating(i); }} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <span>{i}</span>
                  <Star className="h-4 w-4 ml-2 text-yellow-400 fill-yellow-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface DeveloperDashboardProps {
  addons: DeveloperAddon[];
  user: User;
  onUploadAddon: (formData: any) => Promise<void>;
  showUploadForm: boolean;
  setShowUploadForm: (show: boolean) => void;
  editAddon: DeveloperAddon | null;
  setEditAddon: (addon: DeveloperAddon | null) => void;
  theme: 'light' | 'dark';
  onRefresh?: () => Promise<void>;
}

export function DeveloperDashboard({ addons, user, onUploadAddon, showUploadForm, setShowUploadForm, editAddon, setEditAddon, theme, onRefresh }: DeveloperDashboardProps) {
  const [toast, setToast] = useState<{ message: string, type: 'info'|'success'|'error', show: boolean, duration?: number }>({ message: '', type: 'info', show: false, duration: 5000 });
  const [detailModalAddon, setDetailModalAddon] = useState<DeveloperAddon | null>(null);
  const [installedMap, setInstalledMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    (async () => {
      try {
        // Local installed addons
        const { localAddonService } = await import('../services/localAddonService');
        const localJson = await localAddonService.readDownloadedAddons();
        let localArr: any[] = [];
        try { localArr = JSON.parse(localJson); } catch {}
        const map: Record<string, string | null> = {};
        localArr.forEach((a: any) => { map[String(a.id)] = a.version || null; });

        // Profile installed addons
        if (user?.id) {
          const downloadedAddons = await import('../services/supabaseUserService').then(s => s.fetchDownloadedAddons(user.id));
          let profArr: any[] = [];
          if (typeof downloadedAddons === 'string') {
            try { profArr = JSON.parse(downloadedAddons); } catch {}
          }
          profArr.forEach((a: any) => { if (!map[String(a.id)]) map[String(a.id)] = a.version || null; });
        }
        setInstalledMap(map);
      } catch {
        /* ignore errors */
      }
    })();
  }, [user?.id, addons]);
  // Filter addons to keep only those from this developer
  const yourAddons = addons.filter(a => a.userId === user.id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'UI',
    fileSizeValue: '10', // numeric value only
    fileSizeUnit: 'KB', // selected unit ('KB' or 'MB')
    thumbnailUrl: '', // will be ignored on upload, replaced by thumbnailFiles
    userId: user.id,
    thumbnailFiles: [] as File[], // <-- multi-image support
    thumbnailFile: null as File | null, // (temporarily kept for compatibility)
    status: 'ready-to-use' as 'ready-to-use' | 'under-development' | 'incompatible',
    file: null as File | null
  });

  const validateZipSignature = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        // ZIP magic numbers: 50 4B 03 04 or 50 4B 05 06 etc. Check first two bytes "PK"
        resolve(bytes[0] === 0x50 && bytes[1] === 0x4B);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 2));
    });
  };
  const validateImageSignature = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        // PNG 89 50 4E 47 , JPEG FF D8 FF
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
        const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        resolve(isPng || isJpg);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAddon && (!formData.file || !formData.file.name.toLowerCase().endsWith('.zip'))) {
      alert('Please select a .zip file to upload.');
      return;
    }
    e.preventDefault();

    // Security validation
    // Validate main addon ZIP (only when a new file is chosen)
    if (formData.file) {
      const isZipOk = await validateZipSignature(formData.file);
      if (!isZipOk) {
        setToast({ message: 'The selected addon file is not a valid .zip archive.', type: 'error', show: true, duration: 5000 });
        return;
      }
    }
    // Validate new thumbnail files selected
    for (const img of formData.thumbnailFiles) {
      const isImgOk = await validateImageSignature(img);
      if (!isImgOk) {
        setToast({ message: `Image ${img.name} is not a valid JPG/PNG.`, type: 'error', show: true, duration: 5000 });
        return;
      }
    }

    // Editing
    if (editAddon) {
      // Increment version only if the file is modified
      let newVersion = editAddon.version || '1.0';
      if (formData.file && formData.file !== editAddon.file && editAddon.version && !isNaN(Number(editAddon.version))) {
        newVersion = (parseFloat(editAddon.version) + 0.1).toFixed(1);
      }
      const updatedAddon = {
        ...editAddon,
        ...formData,
        fileSize: `${formData.fileSizeValue} ${formData.fileSizeUnit}`,
        version: newVersion,
        author: user.username,
        lastUpdated: new Date().toISOString().split('T')[0],
        thumbnailFile: formData.thumbnailFile || undefined,
        file: formData.file || undefined,
      };
      // Will call the updateAddon function (to be implemented in the service)
      const { updateAddon } = await import('../services/supabaseAddonService');
      await updateAddon(updatedAddon);
      setToast({ message: 'Addon updated.', type: 'success', show: true, duration: 5000 });
      setShowUploadForm(false);
      setEditAddon(null);
    } else {
      // Creation
      if (formData.file) {
        const addonToUpload = {
          ...formData,
          fileSize: `${formData.fileSizeValue} ${formData.fileSizeUnit}`,
          version: '1.0',
          author: user.username,
          downloadUrl: '',
          lastUpdated: new Date().toISOString().split('T')[0],
          downloads: 0,
          // Addon status
          isInstalled: false,
          file: formData.file,
          thumbnailFile: formData.thumbnailFile || undefined,
          approvalStatus: 'pending' as 'pending',
          userId: formData.userId,
        };
        const finalCategory = formData.category === 'Other' ? customCategory : formData.category;
        await onUploadAddon({ ...addonToUpload, category: finalCategory });
        setToast({ message: 'Addon uploaded.', type: 'success', show: true, duration: 5000 });
        setShowUploadForm(false);
        setEditAddon(null);
      }
    }
    if (onRefresh) await onRefresh();
    setShowUploadForm(false);
    setEditAddon(null);
    setFormData({
      name: '',
      description: '',
      category: 'UI',
      fileSizeValue: '',
      fileSizeUnit: 'KB',
      thumbnailUrl: '',
      thumbnailFiles: [],
      thumbnailFile: null,
      status: 'ready-to-use',
      userId: user.id,
      file: null
    });
  };

  const categories = ['UI', 'Combat', 'Social', 'Utility', 'Economy', 'Other'];
  const [customCategory, setCustomCategory] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const statusOptions = [
    { value: 'ready-to-use', label: 'Ready to Use' },
    { value: 'under-development', label: 'Under Development' },
    { value: 'incompatible', label: 'Incompatible with Current Game Version' }
  ];

  return (
    <div className="flex-1 p-6">
      {/* Main content below, ensure all opened divs are closed at the end of the function */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className={`text-2xl font-bold text-${theme === 'dark' ? 'white' : 'gray-900'}`}>Developer Dashboard</h2>
          <p className={`text-${theme === 'dark' ? 'gray-400' : 'gray-500'}`}>Manage your addons and uploads</p>
        </div>
        <button
          onClick={() => {
            setEditAddon(null);
            setFormData({
              name: '',
              description: '',
              category: 'UI',
              fileSizeValue: '',
              fileSizeUnit: 'Ko',
              thumbnailUrl: '',
              thumbnailFiles: [],
              thumbnailFile: null,
              status: 'ready-to-use',
              userId: user.id,
              file: null
            });
            setShowUploadForm(true);
          }}
          className={`flex items-center space-x-2 bg-purple-600 text-${theme === 'dark' ? 'white' : 'gray-900'} px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors ${showUploadForm ? 'hidden' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>Upload New Addon</span>
        </button>
      </div>

      {showUploadForm && (
        <div className={`bg-${theme === 'dark' ? 'gray-800' : 'white'} rounded-lg p-6 mb-8 border border-${theme === 'dark' ? 'gray-700' : 'gray-300'}`}>
          <h3 className={`text-lg font-semibold text-${theme === 'dark' ? 'white' : 'gray-900'} mb-4`}>{editAddon ? 'Edit Addon' : 'Upload New Addon'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
            {/* Display an error if the file type is wrong */}
            {formData.file && !formData.file.name.toLowerCase().endsWith('.zip') && (
              <div className="text-red-500 text-sm">Please select a .zip file to upload.</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                  Addon Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'} h-24`}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formData.category === 'Other' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                  File Size
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.fileSizeValue}
                    onChange={(e) => setFormData({ ...formData, fileSizeValue: e.target.value })}
                    className={`w-24 bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'}`}
                    placeholder="10"
                    required
                  />
                  <select
                    value={formData.fileSizeUnit}
                    onChange={(e) => setFormData({ ...formData, fileSizeUnit: e.target.value })}
                    className={`bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-2 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'}`}
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                  Images of the addon (.jpg/.png, max 5)
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    // Add new images to the existing list, without exceeding 5
                    let newFiles = [...formData.thumbnailFiles, ...files];
                    if (newFiles.length > 5) newFiles = newFiles.slice(0, 5);
                    setFormData({ ...formData, thumbnailFiles: newFiles });
                  }}
                  className={`w-full bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'}`}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Images already uploaded (URLs) */}
                  {formData.thumbnailUrl && (() => {
                    let urls: string[] = [];
                    if (Array.isArray(formData.thumbnailUrl)) {
                      urls = formData.thumbnailUrl;
                    } else if (typeof formData.thumbnailUrl === 'string') {
                      try { urls = JSON.parse(formData.thumbnailUrl); } catch { urls = []; }
                    }
                    return urls.map((url, idx) => (
                      <div key={"uploaded-"+idx} className="relative w-16 h-16">
                        <img
                          src={url}
                          alt={`uploaded-miniature-${idx}`}
                          className="w-16 h-16 object-cover rounded border border-gray-200"
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                          title="Supprimer cette image déjà en ligne"
                          onClick={async () => {
                            try {
                              const { deleteThumbnailFromStorage } = await import('../services/supabaseAddonService');
                              await deleteThumbnailFromStorage(url);
                              const newUrls = [...urls];
                              newUrls.splice(idx, 1);
                              setFormData({
                                ...formData,
                                thumbnailUrl: JSON.stringify(newUrls),
                              });
                            } catch (err) {
                              alert('Failed to delete image from Supabase: ' + (err instanceof Error ? err.message : String(err)));
                            }
                          }}
                        >×</button>
                      </div>
                    ));
                  })()}
                  {/* Images en cours d'ajout (File) */}
                  {formData.thumbnailFiles && formData.thumbnailFiles.map((file, idx) => (
                    <div key={"new-"+idx} className="relative w-16 h-16">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`miniature-${idx}`}
                        className="w-16 h-16 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                        title="Supprimer cette image"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            thumbnailFiles: formData.thumbnailFiles.filter((_, i) => i !== idx)
                          });
                        }}
                      >×</button>
                    </div>
                  ))}
                  {/* Compteur total */}
                  <span className="self-center text-xs text-gray-500 ml-2">
                    {((editAddon && editAddon.thumbnailUrl ? editAddon.thumbnailUrl.split(/,|\n/).filter(Boolean).length : 0) + (formData.thumbnailFiles?.length || 0))}/5 photos
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                Addon Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className={`w-full bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'}`}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mb-1`}>
                Addon File (ZIP)
              </label>
              <input
                type="file"
                accept=".zip,.rar,.7z"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFormData({ 
                    ...formData, 
                    file: file || null
                  });
                }}
                className={`w-full bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-2 text-${theme === 'dark' ? 'white' : 'gray-900'} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700`}
                required={!editAddon}
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className={`flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors`}
              >
                <Upload className="h-4 w-4" />
                <span>{editAddon ? 'Update Addon' : 'Upload Addon'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowUploadForm(false); setEditAddon(null); }}
                className={`px-4 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!showUploadForm && (
        <div className={`bg-${theme === 'dark' ? 'gray-800' : 'white'} rounded-lg p-6 mb-8 border border-${theme === 'dark' ? 'gray-700' : 'gray-300'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold text-${theme === 'dark' ? 'white' : 'gray-900'}`}>My Addon List</h3>
            <div>
              <label htmlFor="categoryFilter" className={`text-${theme === 'dark' ? 'gray-300' : 'gray-700'} mr-2`}>Category:</label>
              <select
                id="categoryFilter"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className={`bg-${theme === 'dark' ? 'gray-900' : 'white'} border border-${theme === 'dark' ? 'gray-600' : 'gray-300'} rounded-lg px-3 py-1 text-${theme === 'dark' ? 'white' : 'gray-900'}`}
              >
                <option value="">All</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            {yourAddons
              .filter((addon: DeveloperAddon) => !categoryFilter || (addon.category && addon.category.toLowerCase() === categoryFilter.toLowerCase()))
              .map((addon: DeveloperAddon) => (
                <div key={addon.id} className={`bg-${theme === 'dark' ? 'gray-900' : 'white'} rounded-lg p-6 mb-8 border border-${theme === 'dark' ? 'gray-700' : 'gray-300'} shadow-md hover:shadow-lg transition-shadow`}>
                  <div className="flex flex-row gap-4 items-stretch">
                    {/* Image carousel + status badge */}
                     <div className="relative w-32 h-32 flex-shrink-0">
                       <AddonImageCarousel addon={addon} />
                       {(() => {
                         const installedVersion = installedMap[String(addon.id)] ?? null;
                          const isInstalled = installedVersion !== null;
                          const badge = getStatusBadge(addon.status, isInstalled, installedVersion, addon.version);
                         const Icon = badge.icon;
                         return (
                           <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${badge.className}`}>
                             <Icon className="h-3 w-3" />
                             <span>{badge.text}</span>
                           </div>
                         );
                       })()}
                     </div>
                    {/* Infos addon à droite */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        {/* Titre, version, catégorie */}
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <>
                              <h4 className={
                                `text-lg font-semibold mb-0 ${addon.warning ? 'text-yellow-600 dark:text-yellow-400' : (theme === 'dark' ? 'text-white' : 'text-gray-900')}`
                              }>{addon.name}</h4>
                              {addon.warning && <AlertTriangle className="h-4 w-4 text-orange-400" />}
                              </>
                            <span className="text-purple-400 font-semibold">v{addon.version}</span>
                            {addon.category && (
                              <span className={`px-2 py-0.5 rounded text-xs border ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-500' : 'bg-gray-200 text-gray-700 border-gray-400'}`}>{addon.category}</span>
                            )}
                          </div>
                        </div>
                        {/* Boutons */}
                        <div className="flex space-x-2 ml-2">
                            {/* Bouton oeil (voir détails) */}
                            <button
                              className="p-2 text-gray-500' + (theme === 'dark' ? ' text-gray-400' : '') hover:text-purple-400 transition-colors"
                              title="Voir les détails de l'addon"
                              onClick={() => setDetailModalAddon(addon)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          <button
                            className="p-2 text-gray-500' + (theme === 'dark' ? ' text-gray-400' : '') hover:text-gray-900' + (theme === 'dark' ? ' text-white' : '') transition-colors"
                            onClick={() => {
                              setEditAddon(addon);
                              const [fileSizeValue, fileSizeUnit] = (addon.fileSize || '').split(' ');
                              setFormData({
                                name: addon.name,
                                description: addon.description,
                                category: addon.category || 'UI',
                                fileSizeValue: fileSizeValue || '',
                                fileSizeUnit: fileSizeUnit || 'Ko',
                                thumbnailUrl: addon.thumbnailUrl || '',
                                thumbnailFiles: [],
                                thumbnailFile: null,
                                status: addon.status || 'ready-to-use',
                                userId: addon.userId,
                                file: null
                              });
                              setShowUploadForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-500' + (theme === 'dark' ? ' text-gray-400' : '') hover:text-red-400 transition-colors"
                            onClick={async () => {
                              
                              try {
                                const { deleteAddon } = await import('../services/supabaseAddonService');
                                await deleteAddon(addon.id, addon.name, addon.userId);
                                setToast({ message: 'Addon deleted.', type: 'success', show: true, duration: 5000 });
                                setShowUploadForm(false);
                                setEditAddon(null);
                                if (onRefresh) await onRefresh();
                              } catch (error) {
                                console.error(error);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {/* Description */}
                      <p className={`mb-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} overflow-hidden`} style={{display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>{addon.description}</p>
                      {/* Infos générales */}
                      <div className="mt-1">
                        <AddonRating addon={addon} user={user} />
                        <div className={"flex items-center space-x-6 text-xs mt-2 " + (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                          <span className="flex items-center">
                            <Download className="h-3 w-3 mr-1" />
                            {addon.downloadCount?.toLocaleString()} downloads
                          </span>
                          <span>Uploaded: {addon.uploadDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    {/* Modal détail addon (oeil) */}
    {detailModalAddon && (
      <AddonDetailModal
        addon={detailModalAddon}
        open={!!detailModalAddon}
        onClose={() => setDetailModalAddon(null)}
        displayOnly={true}
        user={user}
        onLogin={() => {}}
        theme={theme}
      />
    )}
  {toast.show && (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast({ message: '', type: 'info', show: false, duration: 5000 })}
      duration={toast.duration}
    />
  )}
</div>
); // <-- fermeture correcte du composant
}