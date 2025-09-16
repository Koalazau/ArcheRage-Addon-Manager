export interface Addon {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  downloadUrl: string;
  thumbnailUrl: string;
  fileSize: string;
  lastUpdated: string;
  downloads: number;
  warning?: boolean;
  isInstalled: boolean;
  avgRating?: number;
  ratingCount?: number;
  installedVersion?: string;
  status: 'ready-to-use' | 'under-development' | 'incompatible';
  userId: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
}

export interface User {
  id: string; // Supabase UUID
  username: string; // Discord username
  avatar: string; // Discord avatar URL
  isDeveloper: boolean;
  discordId: string; // Discord user id
  downloaded_addons?: string; // JSON string of {id, version} array
}

// Type Supabase user (simplifié)
export interface SupabaseUser {
  id: string;
  user_metadata: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    provider_id?: string;
    [key: string]: any;
  };
}


export interface DeveloperAddon extends Addon {
  uploadDate: string;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  downloadCount: number;
  file?: File;
}