import { supabase } from './supabaseClient';

export interface AddonRating {
  id: number;
  addon_id: string;
  user_id: string;
  rating: number; // 1 à 5
  created_at: string;
}

// Récupère la moyenne et le nombre de votes pour un addon
export async function fetchAddonAverageRating(addonId: string): Promise<{ avgRating: number; ratingCount: number }> {
  const { data, error } = await supabase
    .from('addon_ratings')
    .select('rating')
    .eq('addon_id', addonId);
  if (error) throw error;
  const ratings = data?.map((r: any) => r.rating) || [];
  const avgRating = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
  return { avgRating, ratingCount: ratings.length };
}

// Récupère la note de l'utilisateur connecté pour un addon
export async function fetchUserAddonRating(addonId: string, userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('addon_ratings')
    .select('rating')
    .eq('addon_id', addonId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error; // ignore not found
  return data?.rating ?? null;
}

// Ajoute ou met à jour la note de l'utilisateur pour un addon
export async function upsertUserAddonRating(addonId: string, userId: string, rating: number): Promise<void> {
  const { error } = await supabase
    .from('addon_ratings')
    .upsert({ addon_id: addonId, user_id: userId, rating }, { onConflict: 'addon_id,user_id' });
  if (error) throw error;
}

// Récupère toutes les moyennes de tous les addons (pour affichage global)
export async function fetchAllAverageRatings(): Promise<Record<string, { avgRating: number; ratingCount: number }>> {
  const { data, error } = await supabase
    .from('addon_ratings')
    .select('addon_id, rating');
  if (error) throw error;
  const grouped: Record<string, number[]> = {};
  data?.forEach((r: any) => {
    if (!grouped[r.addon_id]) grouped[r.addon_id] = [];
    grouped[r.addon_id].push(r.rating);
  });
  const result: Record<string, { avgRating: number; ratingCount: number }> = {};
  Object.entries(grouped).forEach(([addonId, ratings]) => {
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    result[addonId] = { avgRating: avg, ratingCount: ratings.length };
  });
  return result;
}
