/**
 * Client & Server API Helper for Rate-it REST Endpoints
 */

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    // In browser, relative URL goes through Next.js rewrites or Nginx proxy
    return '';
  }
  // Server-side (SSR / ISR) inside Next.js node runtime
  return process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
}

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string;
  is_custom: boolean;
  played_count: number;
  last_played: string | null;
  is_validated: boolean;
  categories: string[];
  created_at: string;
  video_count: number;
  first_video_youtube_id: string | null;
  first_video_title?: string | null;
  first_video_artist_name?: string | null;
  first_video_mal_title?: string | null;
  secretCode?: string;
}

export interface PlaylistsResponse {
  success: boolean;
  validated: PlaylistSummary[];
  community: PlaylistSummary[];
  error?: string;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  youtubeId: string;
  artistName: string;
  description: string;
  malAnimeId?: number | null;
  malTitle?: string | null;
  anilistId?: number | null;
  anilistTitle?: string | null;
  orderIndex: number;
  trackId: number;
}

export interface PlaylistDetailsResponse {
  success: boolean;
  playlist: PlaylistSummary;
  videos: PlaylistVideo[];
  error?: string;
}

/**
 * Fetch all playlists (Server or Client)
 */
export async function fetchPlaylistsApi(options?: {
  password?: string;
  revalidate?: number | false;
}): Promise<{ validated: PlaylistSummary[]; community: PlaylistSummary[] }> {
  const baseUrl = getBaseApiUrl();
  const query = options?.password ? `?password=${encodeURIComponent(options.password)}` : '';
  const url = `${baseUrl}/api/playlists${query}`;

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  };

  // If on server, apply Next.js cache/revalidation tags
  if (typeof window === 'undefined') {
    if (options?.revalidate !== undefined) {
      (fetchOptions as any).next = { revalidate: options.revalidate };
    } else {
      (fetchOptions as any).next = { revalidate: 60 }; // 60s ISR default
    }
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur HTTP ${res.status} lors de la récupération des playlists`);
  }

  const data: PlaylistsResponse = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Échec de la récupération des playlists');
  }

  return {
    validated: data.validated || [],
    community: data.community || [],
  };
}

/**
 * Fetch single playlist details with tracks (Server or Client)
 */
export async function fetchPlaylistDetailsApi(
  id: string,
  options?: { revalidate?: number | false }
): Promise<{ playlist: PlaylistSummary; videos: PlaylistVideo[] }> {
  const baseUrl = getBaseApiUrl();
  const cleanId = encodeURIComponent(id.trim());
  const url = `${baseUrl}/api/playlists/${cleanId}`;

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  };

  if (typeof window === 'undefined') {
    if (options?.revalidate !== undefined) {
      (fetchOptions as any).next = { revalidate: options.revalidate };
    } else {
      (fetchOptions as any).next = { revalidate: 300 }; // 5 min ISR default
    }
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur HTTP ${res.status} lors de la récupération de la playlist`);
  }

  const data: PlaylistDetailsResponse = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Échec de la récupération de la playlist');
  }

  return {
    playlist: data.playlist,
    videos: data.videos || [],
  };
}

/**
 * Create a new playlist via HTTP POST
 */
export async function createPlaylistApi(payload: {
  name: string;
  description: string;
  videos: any[];
  categories?: string[];
}): Promise<{ playlistId: string; secretCode: string }> {
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}/api/playlists`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Erreur lors de la création de la playlist (code ${res.status})`);
  }

  return {
    playlistId: data.playlistId,
    secretCode: data.secretCode,
  };
}
