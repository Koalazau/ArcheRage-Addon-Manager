import { supabase } from './supabaseClient';
import { User, SupabaseUser } from '../types';

// Utilitaire pour convertir un user Supabase en User local
export function mapSupabaseUserToUser(supaUser: SupabaseUser | null, profileData: any): User | null {
  if (!supaUser) return null;
  console.log('[DEBUG][mapSupabaseUserToUser] profileData.role =', profileData.role);
  return {
    id: supaUser.id,
    // Priorité aux métadonnées de l'authentification pour le nom et l'avatar
    username: supaUser.user_metadata.full_name || supaUser.user_metadata.name || 'Discord User',
    avatar: supaUser.user_metadata.avatar_url || '',
    discordId: supaUser.user_metadata.provider_id || supaUser.id,

    // Données spécifiques de notre table 'profiles'
    isDeveloper: profileData.role && profileData.role.toLowerCase() === 'dev',
    downloaded_addons: profileData.downloaded_addons || '[]',
  };
}

// Met à jour le rôle dans la table profiles de Supabase
export async function updateUserRoleInSupabase(userId: string, newRole: 'player' | 'dev'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);
  if (error) throw error;
}

// Ajoute ou met à jour un addon téléchargé dans le profil utilisateur Supabase
export async function addDownloadedAddonToProfile(userId: string, addonId: string, version: string): Promise<void> {
  // Récupère le profil
  const { data, error } = await supabase
    .from('profiles')
    .select('downloaded_addons')
    .eq('id', userId)
    .single();
  if (error) throw error;
  let downloaded = [];
  try {
    downloaded = data?.downloaded_addons ? JSON.parse(data.downloaded_addons) : [];
  } catch { downloaded = []; }
  const idx = downloaded.findIndex((a: any) => a.id === addonId);
  if (idx >= 0) {
    downloaded[idx].version = version;
  } else {
    downloaded.push({ id: addonId, version });
  }
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ downloaded_addons: JSON.stringify(downloaded) })
    .eq('id', userId);
  if (updateError) throw updateError;
}

// Récupère le profil utilisateur complet (incl. downloaded_addons)
export async function fetchUserProfile(userId: string) {
  const result = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (result.data && result.data.downloaded_addons && typeof result.data.downloaded_addons !== 'string') {
    // Si Supabase renvoie un objet (ex: [{id:...}]), on force en string JSON
    result.data.downloaded_addons = JSON.stringify(result.data.downloaded_addons);
  }
  console.log('[DEBUG] fetchUserProfile result:', result);
  return result;
}

// Récupère uniquement le champ downloaded_addons depuis Supabase
export async function fetchDownloadedAddons(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('downloaded_addons')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data.downloaded_addons || null;
}

// Retire un addon téléchargé du profil utilisateur Supabase
export async function setDownloadedAddonsList(userId: string, list: {id:string;version:string}[]): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ downloaded_addons: JSON.stringify(list) })
    .eq('id', userId);
  if (error) throw error;
}

export async function removeDownloadedAddonFromProfile(userId: string, addonId: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('downloaded_addons')
    .eq('id', userId)
    .single();
  if (error) throw error;
  let downloaded = [];
  try {
    downloaded = data?.downloaded_addons ? JSON.parse(data.downloaded_addons) : [];
  } catch { downloaded = []; }
  const filtered = downloaded.filter((a: any) => a.id !== addonId);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ downloaded_addons: JSON.stringify(filtered) })
    .eq('id', userId);
  if (updateError) throw updateError;
}

// Récupère le rôle depuis la table profiles de Supabase (ou 'player' par défaut)
export async function fetchUserRole(userId: string): Promise<'dev' | 'player'> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error || !data) return 'player';
  return data.role === 'dev' ? 'dev' : 'player';
}
