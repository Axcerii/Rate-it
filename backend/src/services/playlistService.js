import pool from '../db/db.js';
import redisClient from '../store/redis.js';
import { resolveAnilistForAnime } from './anilistService.js';
import {
  sanitizeText,
  validatePlaylistId,
  validateYoutubeId,
  verifyYoutubeVideo,
  generatePlaylistSecretCode,
  validateAndSanitizeCategories,
} from '../utils/security.js';

export function generatePlaylistId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PL-${code}`;
}

const CACHE_KEY_PUBLIC_LIST = 'playlists:list:public';
const CACHE_TTL_LIST_SECONDS = 60; // 1 minute
const CACHE_TTL_DETAILS_SECONDS = 300; // 5 minutes

/**
 * Invalidate all playlist caches in Redis
 */
export async function invalidatePlaylistCaches(playlistId = null) {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.del(CACHE_KEY_PUBLIC_LIST);
      if (playlistId) {
        await redisClient.del(`playlist:details:${playlistId}`);
      }
    }
  } catch (err) {
    console.warn('Erreur lors de l\'invalidation du cache Redis des playlists:', err.message);
  }
}

/**
 * Fetch all playlists (Validated & Community)
 * Leverages Redis cache for unauthenticated (public) queries to avoid DB load.
 */
export async function getPlaylistsList({ isAdmin = false } = {}) {
  // If not admin, check Redis cache first
  if (!isAdmin && redisClient && redisClient.isOpen) {
    try {
      const cached = await redisClient.get(CACHE_KEY_PUBLIC_LIST);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Redis cache get error for playlists list:', err.message);
    }
  }

  const secretField = isAdmin ? ', secret_code as "secretCode"' : '';

  // 1. Fetch validated playlists
  const validatedRes = await pool.query(
    `SELECT id, name, description, is_custom, played_count, last_played, is_validated, categories, created_at${secretField},
            (SELECT COUNT(*)::int FROM playlist_tracks pt WHERE pt.playlist_id = playlists.id) AS video_count,
            (SELECT v.youtube_id 
             FROM playlist_tracks pt 
             JOIN videos v ON pt.video_id = v.id 
             WHERE pt.playlist_id = playlists.id 
             ORDER BY pt.order_index ASC 
             LIMIT 1) AS first_video_youtube_id
     FROM playlists
     WHERE is_validated = TRUE
     ORDER BY played_count DESC, created_at DESC`
  );

  // 2. Fetch community (custom & not validated) playlists
  const communityRes = await pool.query(
    `SELECT id, name, description, is_custom, played_count, last_played, is_validated, categories, created_at${secretField},
            (SELECT COUNT(*)::int FROM playlist_tracks pt WHERE pt.playlist_id = playlists.id) AS video_count,
            (SELECT v.youtube_id 
             FROM playlist_tracks pt 
             JOIN videos v ON pt.video_id = v.id 
             WHERE pt.playlist_id = playlists.id 
             ORDER BY pt.order_index ASC 
             LIMIT 1) AS first_video_youtube_id
     FROM playlists
     WHERE is_custom = TRUE AND is_validated = FALSE
     ORDER BY played_count DESC, created_at DESC`
  );

  const result = {
    validated: validatedRes.rows,
    community: communityRes.rows,
  };

  // Cache in Redis for public requests
  if (!isAdmin && redisClient && redisClient.isOpen) {
    try {
      await redisClient.setEx(CACHE_KEY_PUBLIC_LIST, CACHE_TTL_LIST_SECONDS, JSON.stringify(result));
    } catch (err) {
      console.warn('Redis cache set error for playlists list:', err.message);
    }
  }

  return result;
}

/**
 * Fetch a single playlist and its tracks
 * Leverages Redis cache for fast retrieval
 */
export async function getPlaylistById(id) {
  const cleanId = validatePlaylistId(id);
  if (!cleanId) {
    throw new Error('Format d\'identifiant de playlist invalide');
  }

  const cacheKey = `playlist:details:${cleanId}`;

  if (redisClient && redisClient.isOpen) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`Redis cache get error for playlist ${cleanId}:`, err.message);
    }
  }

  const playlistRes = await pool.query(
    `SELECT *, (SELECT COUNT(*)::int FROM playlist_tracks pt WHERE pt.playlist_id = playlists.id) AS video_count 
     FROM playlists 
     WHERE id = $1`,
    [cleanId]
  );

  if (playlistRes.rows.length === 0) {
    throw new Error('Playlist introuvable');
  }

  const videosRes = await pool.query(
    `SELECT v.id::text, v.title, v.youtube_id as "youtubeId", v.artist_name as "artistName", 
            v.description, v.mal_anime_id as "malAnimeId", v.mal_title as "malTitle", 
            v.anilist_id as "anilistId", v.anilist_title as "anilistTitle",
            pt.order_index as "orderIndex", pt.id as "trackId"
     FROM playlist_tracks pt
     JOIN videos v ON pt.video_id = v.id
     WHERE pt.playlist_id = $1
     ORDER BY pt.order_index ASC`,
    [cleanId]
  );

  // Strip secret_code from public response for security
  const playlistData = { ...playlistRes.rows[0] };
  delete playlistData.secret_code;

  const result = {
    playlist: playlistData,
    videos: videosRes.rows,
  };

  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL_DETAILS_SECONDS, JSON.stringify(result));
    } catch (err) {
      console.warn(`Redis cache set error for playlist ${cleanId}:`, err.message);
    }
  }

  return result;
}

/**
 * Create a new custom playlist
 */
export async function createPlaylistRecord({ name, description, videos, categories }) {
  const cleanName = sanitizeText(name, 100);
  const cleanDescription = sanitizeText(description, 1000);
  const cleanCategories = validateAndSanitizeCategories(categories);

  if (!cleanName || !Array.isArray(videos) || videos.length === 0) {
    throw new Error('Le nom de la playlist et au moins un titre sont requis.');
  }

  if (videos.length > 200) {
    throw new Error('Une playlist ne peut pas contenir plus de 200 pistes.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const playlistId = generatePlaylistId();
    const secretCode = generatePlaylistSecretCode();

    // 1. Insert playlist record
    await client.query(
      `INSERT INTO playlists (id, name, description, is_custom, is_validated, secret_code, categories)
       VALUES ($1, $2, $3, TRUE, FALSE, $4, $5)`,
      [playlistId, cleanName, cleanDescription, secretCode, cleanCategories]
    );

    // 2. Identify videos already in database to avoid redundant YouTube API calls
    const candidateYtIds = videos.map((v) => validateYoutubeId(v.youtubeId)).filter(Boolean);
    let existingVideosMap = new Map();
    if (candidateYtIds.length > 0) {
      const existingRes = await client.query(
        'SELECT youtube_id, id FROM videos WHERE youtube_id = ANY($1)',
        [candidateYtIds]
      );
      existingVideosMap = new Map(existingRes.rows.map((r) => [r.youtube_id, r.id]));
    }

    // 3. Insert / upsert videos and link to playlist_tracks
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const cleanTitle = sanitizeText(video.title, 255);
      const validYtId = validateYoutubeId(video.youtubeId);
      const cleanArtistName = sanitizeText(video.artistName, 255) || 'Unknown Artist';
      const cleanVideoDesc = sanitizeText(video.description, 1000);
      let cleanMalTitle = sanitizeText(video.malTitle, 255);
      let cleanAnilistTitle = sanitizeText(video.anilistTitle, 255);
      let parsedMalAnimeId = video.malAnimeId ? parseInt(video.malAnimeId, 10) : null;
      let parsedAnilistId = video.anilistId ? parseInt(video.anilistId, 10) : null;

      if (!cleanTitle || !validYtId) {
        throw new Error(`La piste à l'index ${i + 1} a un titre ou un lien YouTube invalide.`);
      }

      // Only verify on YouTube if this video is NOT already stored in the database
      if (!existingVideosMap.has(validYtId)) {
        const ytCheck = await verifyYoutubeVideo(validYtId);
        if (!ytCheck.valid) {
          throw new Error(`La vidéo de la piste ${i + 1} ("${cleanTitle}") n'est pas disponible sur YouTube : ${ytCheck.error}`);
        }

        // Auto-resolve AniList <-> MAL link only if an anime reference is present
        if ((!parsedAnilistId || !parsedMalAnimeId) && (parsedMalAnimeId || parsedAnilistId || cleanMalTitle)) {
          try {
            const resolved = await resolveAnilistForAnime({
              malAnimeId: parsedMalAnimeId,
              malTitle: cleanMalTitle,
              anilistId: parsedAnilistId,
            });
            if (resolved) {
              if (!parsedAnilistId && resolved.anilistId) parsedAnilistId = resolved.anilistId;
              if (!cleanAnilistTitle && resolved.anilistTitle) cleanAnilistTitle = resolved.anilistTitle;
              if (!parsedMalAnimeId && resolved.idMal) parsedMalAnimeId = resolved.idMal;
            }
          } catch (_) {}
        }
      }

      // Upsert into unique videos catalog
      const videoUpsertRes = await client.query(
        `INSERT INTO videos (youtube_id, title, artist_name, description, mal_anime_id, mal_title, anilist_id, anilist_title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (youtube_id) DO UPDATE SET
           title = COALESCE(NULLIF(EXCLUDED.title, ''), videos.title),
           artist_name = COALESCE(NULLIF(EXCLUDED.artist_name, ''), videos.artist_name),
           description = COALESCE(NULLIF(EXCLUDED.description, ''), videos.description),
           mal_anime_id = COALESCE(EXCLUDED.mal_anime_id, videos.mal_anime_id),
           mal_title = COALESCE(NULLIF(EXCLUDED.mal_title, ''), videos.mal_title),
           anilist_id = COALESCE(EXCLUDED.anilist_id, videos.anilist_id),
           anilist_title = COALESCE(NULLIF(EXCLUDED.anilist_title, ''), videos.anilist_title)
         RETURNING id`,
        [
          validYtId,
          cleanTitle,
          cleanArtistName,
          cleanVideoDesc,
          parsedMalAnimeId,
          cleanMalTitle || null,
          parsedAnilistId,
          cleanAnilistTitle || null,
        ]
      );

      const videoId = videoUpsertRes.rows[0].id;

      // Insert link into playlist_tracks
      await client.query(
        `INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
         VALUES ($1, $2, $3)`,
        [playlistId, videoId, i]
      );
    }

    await client.query('COMMIT');
    console.log(`Custom playlist created: ${playlistId} - "${cleanName}" with ${videos.length} tracks`);

    // Invalidate caches
    await invalidatePlaylistCaches(playlistId);

    return {
      success: true,
      playlistId,
      secretCode,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
