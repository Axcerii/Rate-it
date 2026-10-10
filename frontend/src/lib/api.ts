/**
 * Client & Server API Helper for Rate-it REST Endpoints
 */

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    // In browser, relative URL goes through Next.js rewrites or Nginx proxy
    return '';
  }
  // Server-side (SSR / ISR) inside Next.js node runtime
  return (
    process.env.INTERNAL_BACKEND_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : 'http://backend:4000')
  );
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
  categories?: string[];
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
}): Promise<{ validated: PlaylistSummary[]; community: PlaylistSummary[]; categories: string[] }> {
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}/api/playlists`;

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      // Admin credential goes in a header, never in the URL (proxy logs, browser history)
      ...(options?.password ? { 'X-Admin-Auth': options.password } : {}),
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

  try {
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
      categories: data.categories || [],
    };
  } catch (primaryErr) {
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
      const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/playlists`;
      if (fallbackUrl !== url) {
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (fallbackRes.ok) {
            const fbData: PlaylistsResponse = await fallbackRes.json();
            if (fbData.success) {
              return {
                validated: fbData.validated || [],
                community: fbData.community || [],
                categories: fbData.categories || [],
              };
            }
          }
        } catch {
          // Ignore fallback error
        }
      }
    }
    throw primaryErr;
  }
}

/**
 * Fetch active playlist categories
 */
export async function fetchCategoriesApi(): Promise<string[]> {
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}/api/playlists/categories`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.categories || [];
  } catch (err) {
    console.warn('Erreur lors du chargement des catégories via API:', err);
    return [
      'Anime/Manga',
      'Film/Cinéma',
      'Jeux Vidéo',
      'Série/TV',
      'Dessins Animés/Cartoons',
      'Streaming/VTuber',
      'Youtube',
    ];
  }
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

  try {
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
  } catch (primaryErr) {
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
      const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/playlists/${cleanId}`;
      if (fallbackUrl !== url) {
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (fallbackRes.ok) {
            const fbData: PlaylistDetailsResponse = await fallbackRes.json();
            if (fbData.success) {
              return {
                playlist: fbData.playlist,
                videos: fbData.videos || [],
              };
            }
          }
        } catch {
          // Ignore fallback error
        }
      }
    }
    throw primaryErr;
  }
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
