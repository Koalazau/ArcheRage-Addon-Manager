import { supabase } from './supabaseClient';
import JSZip from 'jszip';

import { Addon as AppAddon } from '../types';

export async function fetchAddons(): Promise<AppAddon[]> {
  // 1. Fetch basic addon rows

  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .order('UploadDate', { ascending: false });
  console.log('[DEBUG] Supabase raw data:', data, error);
  if (error) throw error;
  if (!data) return [];
  // 2. Build base list
  const baseList: AppAddon[] = data.map((addon: any) => ({
    id: addon.ID || addon.id,
    name: addon.Name || addon.name,
    description: addon.Description || addon.description,
    version: addon.Version || addon.version,
    author: addon.Author || addon.author,
    category: addon.Category || 'Other',
    downloadUrl: addon.FileURL || '',
    thumbnailUrl: addon.ThumbnailURL || addon.ThumbnailUrl || '',
    fileSize: addon.FileSize || '',
    lastUpdated: addon.UploadDate || '',
    downloads: addon.Downloads || 0,
    warning: addon.Warning || false,

    isInstalled: false,
    installedVersion: undefined,
    status: addon.Status || 'ready-to-use',
    userId: addon.UserID || addon.userId || '',
    }));

  // 3. Fetch ratings in bulk using helper (falls back silently on error)
  try {
    const { fetchAllAverageRatings } = await import('./supabaseRatingsService');
    const ratingsMap = await fetchAllAverageRatings();
    baseList.forEach((a) => {
      const r = ratingsMap[a.id];
      if (r) {
        a.avgRating = r.avgRating;
        a.ratingCount = r.ratingCount;
      } else {
        a.avgRating = 0;
        a.ratingCount = 0;
      }
    });
  } catch (e) {
    console.warn('[ADDON FETCH] Failed to fetch ratings:', e);
  }

  return baseList;
}

// Supprime une miniature du bucket Supabase à partir de son URL publique
export async function deleteThumbnailFromStorage(url: string): Promise<void> {
  // Récupère le chemin relatif dans le bucket à partir de l'URL publique
  const match = url.match(/addons\/(.+)$/);
  if (!match || !match[1]) throw new Error('URL de miniature invalide');
  const path = match[1];
  const { error } = await supabase.storage.from('addons').remove([path]);
  if (error) throw error;
}

// Upload plusieurs miniatures et retourne les URLs publiques
export async function uploadMultipleThumbnails(files: File[], basePath: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const safeThumbName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const thumbPath = `${basePath}/thumbnail_${safeThumbName}`;
    const { data: thumbData, error: thumbError } = await supabase.storage
      .from('addons')
      .upload(thumbPath, file);
    if (thumbError) throw thumbError;
    const url = thumbData?.path
      ? supabase.storage.from('addons').getPublicUrl(thumbData.path).data.publicUrl
      : '';
    if (url) urls.push(url);
  }
  return urls;
}

export async function uploadAddon(
  file: File,
  metadata: Omit<AppAddon, 'id' | 'file_url' | 'upload_date'> & { thumbnailFiles?: File[] }
): Promise<void> {
  // Crée un sous-dossier unique pour cet addon
  const safeName = (metadata.name || 'addon').replace(/[^a-zA-Z0-9_-]/g, '_');
  const userId = metadata.userId || '';
  const basePath = `${safeName}_${userId}`; // No timestamp used

  // Nettoie le nom du zip
  function sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
  const safeZipName = sanitizeFilename(file.name);
  const filePath = `${basePath}/${safeZipName}`;
  const { data: uploadData, error: storageError } = await supabase.storage
    .from('addons')
    .upload(filePath, file);
  if (storageError) throw storageError;

  // Récupère l'URL publique du fichier
  const publicUrl = uploadData?.path
    ? supabase.storage.from('addons').getPublicUrl(uploadData.path).data.publicUrl
    : '';

  // Upload toutes les miniatures si fournies
  let thumbnailUrls: string[] = [];
  if (metadata.thumbnailFiles && Array.isArray(metadata.thumbnailFiles) && metadata.thumbnailFiles.length > 0) {
    thumbnailUrls = await uploadMultipleThumbnails(metadata.thumbnailFiles, basePath);
  }

    // ---------------- Secure Scan -----------------
  let hasWarning = false;
  try {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files) as any[];
    for (const fileEntry of entries) {
      const name = fileEntry.name.toLowerCase();
      if (name.endsWith('.exe') || name.endsWith('.bat')) { hasWarning = true; break; }
      if (name.endsWith('.lua')) {
        try {
          const txt = await fileEntry.async('string');
          if (/io\.popen|os\.execute/i.test(txt)) { hasWarning = true; break; }
        } catch {}
      }
    }
  } catch (e) {
    console.warn('[SECURITY SCAN] Failed to inspect addon zip', e);
  }

  // Insert metadata in DB
  const {
    name,
    description,
    version,
    category,
    fileSize,
    status,
    user, // objet user passé dans metadata !
  } = metadata as any;

  const Author = user?.username || '';
  const UserID = user?.id || '';

  const addonRow = {
    Name: name,
    Description: description,
    Version: version,
    Author,
    Category: category,
    UploadDate: new Date().toISOString(),
    ThumbnailURL: JSON.stringify(thumbnailUrls),
    FileSize: fileSize,
    Downloads: 0,

    Status: status || 'ready-to-use',
    UserID,
    FileURL: publicUrl || '',
    Warning: hasWarning,
  };

  // Debug: log the row to be inserted
  console.log('[UPLOAD] addonRow to insert:', addonRow);

  const { error: dbError } = await supabase.from('addons').insert([
    addonRow
  ]);
  if (dbError) throw dbError;
}

// Helper to compute the storage folder name
function getAddonStorageFolder(addonName: string, userId: string) {
  const safeName = (addonName || 'addon').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeName}_${userId}`;
}

export async function deleteAddon(addonId: string, addonName: string, userId: string): Promise<void> {
  // Compute the folder path
  const storageFolder = getAddonStorageFolder(addonName, userId);
  console.log('[SUPABASE REMOVE] Trying to remove recursively:', storageFolder);

  // 1. List all files in the folder
  const { data: fileList, error: listError } = await supabase.storage
    .from('addons')
    .list(storageFolder, { limit: 100 });
  if (listError) {
    console.error('[SUPABASE STORAGE LIST ERROR]', listError);
    throw listError;
  }
  if (fileList && fileList.length > 0) {
    // 2. Build full paths and remove all files
    const paths = fileList.map(obj => `${storageFolder}/${obj.name}`);
    const { error: removeError } = await supabase.storage
      .from('addons')
      .remove(paths);
    if (removeError) {
      console.error('[SUPABASE STORAGE DELETE ERROR]', removeError);
      throw removeError;
    }
  }
  // Toujours supprimer la ligne addon, même si fileList est vide
  const { error: dbError } = await supabase
    .from('addons')
    .delete()
    .eq('ID', addonId);
  if (dbError) throw dbError;
  if (dbError) throw dbError;
  // Nettoyage des profils pour retirer l'addon supprimé de downloaded_addons
  await removeAddonFromAllProfiles(addonId);
}

/**
 * Appelle le RPC Supabase pour retirer l'addon supprimé de tous les downloaded_addons dans profiles
 */
export async function removeAddonFromAllProfiles(deletedAddonId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_addon_from_all_profiles', { deleted_addon_id: deletedAddonId });
  if (error) throw error;
}

export async function updateAddon(
  addon: any // DeveloperAddon & { thumbnailFiles?: File[], file?: File | null, thumbnailUrl?: string | string[] }
): Promise<void> {
  // Récupère le dossier de stockage
  const storageFolder = getAddonStorageFolder(addon.name, addon.userId);

  // 1. Si nouveau fichier fourni, remplace dans le bucket
  let hasWarning = addon.warning ?? false;
  let fileUrlToSave = addon.downloadUrl || '';
  if (addon.file && addon.file instanceof File) {
    // Scan zip comme lors de l'upload
    try {
      const zip = await JSZip.loadAsync(addon.file);
      hasWarning = false;
      for (const entry of Object.values(zip.files) as any[]) {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.exe') || name.endsWith('.bat')) { hasWarning = true; break; }
        if (name.endsWith('.lua')) {
          const txt = await entry.async('string');
          if (/io\.popen|os\.execute/i.test(txt)) { hasWarning = true; break; }
        }
      }
    } catch (e) { console.warn('[SECURITY SCAN UPDATE] failed', e); }

    // Nettoie le nom
    const safeZipName = addon.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${storageFolder}/${safeZipName}`;
    // Supprime l'ancien fichier si différent
    if (addon.downloadUrl && typeof addon.downloadUrl === 'string') {
      const match = addon.downloadUrl.match(/addons\/(.+)/);
      if (match && match[1] && match[1] !== `${storageFolder}/${safeZipName}`) {
        await supabase.storage.from('addons').remove([match[1]]);
      }
    }
    const { data: uploadData, error: uploadError } = await supabase.storage.from('addons').upload(filePath, addon.file, { upsert: true });
    if (uploadError) throw uploadError;
    // Récupère la nouvelle URL publique
    fileUrlToSave = uploadData?.path
      ? supabase.storage.from('addons').getPublicUrl(uploadData.path).data.publicUrl
      : '';
  }

  // 2. Gestion des images miniatures (multi)
  let existingUrls: string[] = [];
  if (addon.thumbnailUrl) {
    // Peut être déjà un tableau ou un string JSON
    if (Array.isArray(addon.thumbnailUrl)) {
      existingUrls = addon.thumbnailUrl;
    } else if (typeof addon.thumbnailUrl === 'string') {
      try {
        existingUrls = JSON.parse(addon.thumbnailUrl);
      } catch {
        // fallback split virgule
        existingUrls = addon.thumbnailUrl.split(/,|\n/).filter(Boolean);
      }
    }
  }
  // Upload des nouvelles images (thumbnailFiles)
  let newUrls: string[] = [];
  if (addon.thumbnailFiles && Array.isArray(addon.thumbnailFiles) && addon.thumbnailFiles.length > 0) {
    newUrls = await uploadMultipleThumbnails(addon.thumbnailFiles, storageFolder);
  }
  // Concatène les URLs restantes (après suppression éventuelle côté front) + nouvelles
  const allUrls = [...existingUrls, ...newUrls].slice(0, 5);

  // 3. Met à jour la ligne dans la table addons
  const { error: dbError } = await supabase
    .from('addons')
    .update({
      Name: addon.name,
      Description: addon.description,
      Version: addon.version,
      Author: addon.author,
      Category: addon.category,
      UploadDate: new Date().toISOString(),
      ThumbnailURL: JSON.stringify(allUrls),
      FileSize: addon.fileSize,
      Status: addon.status,
      UserID: addon.userId,
      FileURL: fileUrlToSave || '',
      Warning: hasWarning,
    })
    .eq('ID', addon.id);
  if (dbError) throw dbError;
}

export async function incrementAddonDownloads(addonId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_addon_downloads', { addon_id: addonId });
  if (error) throw error;
}

export async function downloadAddon(fileUrl: string): Promise<string> {
  // Returns the public URL for download (could also fetch as blob if needed)
  return fileUrl;
}
