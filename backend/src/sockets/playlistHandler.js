import pool from '../db/db.js';
import {
  getPlaylistsList,
  getPlaylistById,
  createPlaylistRecord,
  invalidatePlaylistCaches,
} from '../services/playlistService.js';
import { getSession, saveSession } from '../store/sessionStore.js';
import { fetchUserCompletedAnime } from '../services/malService.js';
import { fetchUserCompletedAnimeFromAnilist, resolveAnilistForAnime } from '../services/anilistService.js';
import { filterVideosByMalList } from '../services/malMatcher.js';
import {
  sanitizeText,
  escapeLikePattern,
  validateYoutubeId,
  verifyYoutubeVideo,
  safeTimingCompare,
  checkAdminRateLimit,
  recordAdminAttempt,
  sanitizeVideoId,
  validateMalUsername,
  validateAnilistUsername,
  broadcastRoomUpdate,
  generatePlaylistSecretCode,
  checkSecretCodeRateLimit,
  recordSecretCodeAttempt,
  validateAndSanitizeCategories,
} from '../utils/security.js';
import { buildVideoSearchConditions } from '../utils/searchHelper.js';

function verifyAdminAuth(password, socket) {
  const configuredPassword = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim() : '';
  if (!configuredPassword) {
    console.error('Connexion admin refusée : la variable d\'environnement ADMIN_PASSWORD n\'est pas configurée sur le serveur.');
    throw new Error('Connexion impossible : aucun mot de passe administrateur n\'est configuré sur le serveur.');
  }

  const forwarded = socket?.handshake?.headers?.['x-forwarded-for'];
  const clientKey = forwarded ? forwarded.split(',')[0].trim() : (socket?.handshake?.address || socket?.id || 'admin');

  const rateLimit = checkAdminRateLimit(clientKey);
  if (!rateLimit.allowed) {
    throw new Error(`Trop de tentatives administratives incorrectes. Verrouillé pour encore ${rateLimit.remainingSec}s.`);
  }

  const isValid = safeTimingCompare(String(password || ''), configuredPassword);

  recordAdminAttempt(clientKey, isValid);

  if (!isValid) {
    throw new Error('Mot de passe administrateur invalide');
  }
}

function generatePlaylistId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PL-${code}`;
}

export function registerPlaylistHandlers(io, socket) {
  // 0. Verify Admin Password
  socket.on('admin:verify', async ({ password }, callback) => {
    try {
      verifyAdminAuth(password, socket);
      if (typeof callback === 'function') {
        callback({ success: true, message: 'Mot de passe administrateur validé avec succès' });
      }
    } catch (error) {
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message || 'Mot de passe administrateur invalide' });
      }
    }
  });

  // 1. Get all playlists (Validated & Community) - includes secretCode if admin authenticated
  socket.on('playlist:list', async (payload, callback) => {
    try {
      let isAdmin = false;
      if (payload && payload.password) {
        try {
          verifyAdminAuth(payload.password, socket);
          isAdmin = true;
        } catch (_) {
          isAdmin = false;
        }
      }

      const result = await getPlaylistsList({ isAdmin });
      if (typeof callback === 'function') {
        callback({
          success: true,
          validated: result.validated,
          community: result.community,
        });
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 2. Create custom playlist (Bounded to max 200 tracks to prevent DoS)
  socket.on('playlist:create', async ({ name, description, videos, categories }, callback) => {
    try {
      const result = await createPlaylistRecord({ name, description, videos, categories });
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (error) {
      console.error('Error creating custom playlist:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 2b. Verify secret code & load playlist in edit mode (fails if playlist is validated)
  socket.on('playlist:verify_secret_code', async ({ secretCode }, callback) => {
    try {
      const forwarded = socket?.handshake?.headers?.['x-forwarded-for'];
      const clientKey = forwarded ? forwarded.split(',')[0].trim() : (socket?.handshake?.address || socket?.id || 'client');
      const rateLimit = checkSecretCodeRateLimit(clientKey);
      if (!rateLimit.allowed) {
        throw new Error(`Trop de tentatives incorrectes. Veuillez patienter encore ${rateLimit.remainingSec}s.`);
      }

      const cleanSecret = sanitizeText(secretCode, 64);
      if (!cleanSecret || cleanSecret.length < 10) {
        recordSecretCodeAttempt(clientKey, false);
        throw new Error('Code secret invalide ou mal formaté.');
      }

      const playlistRes = await pool.query(
        `SELECT id, name, description, is_custom, is_validated, played_count, last_played, created_at
         FROM playlists
         WHERE secret_code = $1`,
        [cleanSecret]
      );

      if (playlistRes.rows.length === 0) {
        recordSecretCodeAttempt(clientKey, false);
        throw new Error('Code secret introuvable ou incorrect. Vérifiez votre code.');
      }

      const playlist = playlistRes.rows[0];

      // Security check: cannot edit a validated playlist with secret code
      if (playlist.is_validated) {
        recordSecretCodeAttempt(clientKey, false);
        throw new Error('Cette playlist a été validée par un administrateur et ne peut plus être modifiée avec un code secret.');
      }

      recordSecretCodeAttempt(clientKey, true);

      // Fetch tracks for editing
      const videosRes = await pool.query(
        `SELECT v.id::text, v.title, v.youtube_id as "youtubeId", v.artist_name as "artistName", 
                v.description, v.mal_anime_id as "malAnimeId", v.mal_title as "malTitle", 
                v.anilist_id as "anilistId", v.anilist_title as "anilistTitle",
                pt.order_index as "orderIndex", pt.id as "trackId"
         FROM playlist_tracks pt
         JOIN videos v ON pt.video_id = v.id
         WHERE pt.playlist_id = $1
         ORDER BY pt.order_index ASC`,
        [playlist.id]
      );

      if (typeof callback === 'function') {
        callback({
          success: true,
          playlist,
          videos: videosRes.rows,
        });
      }
    } catch (error) {
      console.warn('Secret code verification error:', error.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 2c. Update playlist with secret code (replaces tracks and updates metadata, blocked if validated)
  socket.on('playlist:update_with_secret', async ({ id, secretCode, name, description, videos }, callback) => {
    const client = await pool.connect();
    try {
      const cleanId = sanitizeText(id, 50);
      const cleanSecret = sanitizeText(secretCode, 64);
      const cleanName = sanitizeText(name, 100);
      const cleanDescription = sanitizeText(description, 1000);

      if (!cleanId || !cleanSecret) {
        throw new Error('Identifiant et code secret de la playlist obligatoires.');
      }

      if (!cleanName || !Array.isArray(videos) || videos.length === 0) {
        throw new Error('Le nom de la playlist et au moins un titre sont requis.');
      }

      if (videos.length > 200) {
        throw new Error('Une playlist ne peut pas contenir plus de 200 pistes.');
      }

      // 1. Verify playlist ownership & validation status
      const checkRes = await client.query(
        `SELECT id, name, is_validated, secret_code FROM playlists WHERE id = $1`,
        [cleanId]
      );

      if (checkRes.rows.length === 0) {
        throw new Error('Playlist introuvable.');
      }

      const existingPlaylist = checkRes.rows[0];

      if (existingPlaylist.is_validated) {
        throw new Error('Cette playlist a été validée par l\'administration et ne peut plus être modifiée.');
      }

      if (!safeTimingCompare(existingPlaylist.secret_code, cleanSecret)) {
        throw new Error('Code secret invalide pour cette playlist.');
      }

      await client.query('BEGIN');

      // 2. Update playlist metadata
      await client.query(
        `UPDATE playlists SET name = $1, description = $2 WHERE id = $3`,
        [cleanName, cleanDescription, cleanId]
      );

      // 3. Clear existing playlist_tracks for this playlist
      await client.query(
        `DELETE FROM playlist_tracks WHERE playlist_id = $1`,
        [cleanId]
      );

      // Identify videos already in database to avoid redundant YouTube API calls
      const candidateYtIds = videos.map((v) => validateYoutubeId(v.youtubeId)).filter(Boolean);
      let existingVideosMap = new Map();
      if (candidateYtIds.length > 0) {
        const existingRes = await client.query(
          'SELECT youtube_id, id FROM videos WHERE youtube_id = ANY($1)',
          [candidateYtIds]
        );
        existingVideosMap = new Map(existingRes.rows.map((r) => [r.youtube_id, r.id]));
      }

      // 4. Upsert videos into catalog and recreate playlist_tracks links (only verify with YouTube if not yet in DB)
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

        // Re-insert link into playlist_tracks with updated order_index
        await client.query(
          `INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
           VALUES ($1, $2, $3)`,
          [cleanId, videoId, i]
        );
      }

      await client.query('COMMIT');
      console.log(`Playlist updated with secret code: ${cleanId} - "${cleanName}" (${videos.length} tracks)`);
      await invalidatePlaylistCaches(cleanId);

      if (typeof callback === 'function') {
        callback({ success: true, playlistId: cleanId });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating playlist with secret code:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    } finally {
      client.release();
    }
  });

  // 3. Get single playlist details (including tracks)
  socket.on('playlist:get', async ({ id }, callback) => {
    try {
      const result = await getPlaylistById(id);
      if (typeof callback === 'function') {
        callback({
          success: true,
          playlist: result.playlist,
          videos: result.videos,
        });
      }
    } catch (error) {
      console.error(`Error retrieving playlist ${id}:`, error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 4. Search existing database videos
  socket.on('playlist:search_videos', async ({ query }, callback) => {
    try {
      const searchCondition = buildVideoSearchConditions(query, 1, 'videos');
      if (!searchCondition.clause) {
        if (typeof callback === 'function') callback({ success: true, results: [] });
        return;
      }
      const result = await pool.query(
        `SELECT id::text, title, youtube_id as "youtubeId", artist_name as "artistName", description, 
                mal_anime_id as "malAnimeId", mal_title as "malTitle",
                anilist_id as "anilistId", anilist_title as "anilistTitle"
         FROM videos
         WHERE ${searchCondition.clause}
         ORDER BY id DESC
         LIMIT 20`,
        searchCondition.params
      );

      if (typeof callback === 'function') {
        callback({ success: true, results: result.rows });
      }
    } catch (error) {
      console.error('Error searching videos:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 5. Toggle track status in active session
  socket.on('playlist:toggle_video', async ({ videoId }, callback) => {
    try {
      const { sessionId, isHost } = socket.data;

      if (!sessionId || !isHost) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Unauthorized' });
        }
        return;
      }

      const cleanVideoId = sanitizeVideoId(videoId);
      if (!cleanVideoId) {
        throw new Error('ID vidéo invalide');
      }

      const session = await getSession(sessionId);
      if (!session) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Session not found' });
        }
        return;
      }

      session.disabledVideoIds = session.disabledVideoIds || {};
      session.disabledVideoIds[cleanVideoId] = !session.disabledVideoIds[cleanVideoId];

      await saveSession(session);
      broadcastRoomUpdate(io, session);

      if (typeof callback === 'function') {
        callback({ success: true, disabledVideoIds: session.disabledVideoIds });
      }
    } catch (error) {
      console.error('Error toggling track:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 6. Admin: Toggle validation status
  socket.on('playlist:validate', async ({ id, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanId = sanitizeText(id, 50);
      if (!cleanId) throw new Error('ID de playlist invalide');

      await pool.query(
        'UPDATE playlists SET is_validated = NOT is_validated WHERE id = $1',
        [cleanId]
      );

      console.log(`Admin toggled validation for playlist: ${cleanId}`);
      await invalidatePlaylistCaches(cleanId);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error(`Error validating playlist ${id}:`, error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 6b. Admin: Update playlist metadata (Name, Description, is_validated, is_custom, categories)
  socket.on('playlist:admin_update_playlist', async ({ id, name, description, isValidated, isCustom, categories, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanId = sanitizeText(id, 50);
      const cleanName = name !== undefined ? sanitizeText(name, 100) : null;
      const cleanDesc = description !== undefined ? sanitizeText(description, 1000) : null;
      const cleanCategories = categories !== undefined ? validateAndSanitizeCategories(categories) : null;

      if (!cleanId) {
        throw new Error('ID de playlist obligatoire');
      }

      if (name !== undefined && !cleanName) {
        throw new Error('Le nom de la playlist ne peut pas être vide');
      }

      const updateRes = await pool.query(
        `UPDATE playlists 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             is_validated = COALESCE($3, is_validated),
             is_custom = COALESCE($4, is_custom),
             categories = COALESCE($5, categories)
         WHERE id = $6
         RETURNING id, name, description, is_custom as "isCustom", is_validated as "isValidated", categories, played_count as "playedCount", last_played as "lastPlayed", secret_code as "secretCode"`,
        [
          cleanName,
          cleanDesc,
          typeof isValidated === 'boolean' ? isValidated : null,
          typeof isCustom === 'boolean' ? isCustom : null,
          cleanCategories,
          cleanId
        ]
      );

      if (updateRes.rows.length === 0) {
        throw new Error('Playlist introuvable');
      }

      console.log(`Admin updated playlist ${cleanId}: "${cleanName}"`);

      if (typeof callback === 'function') {
        callback({ success: true, playlist: updateRes.rows[0] });
      }
    } catch (error) {
      console.error(`Error updating playlist ${id} as admin:`, error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 6c. Admin: Set specific track as first video in playlist (reorder index 0)
  socket.on('playlist:admin_set_first_video', async ({ playlistId, trackId, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanPlaylistId = sanitizeText(playlistId, 50);
      const targetTrackId = parseInt(trackId, 10);

      if (!cleanPlaylistId || isNaN(targetTrackId)) {
        throw new Error('Identifiant de playlist et de piste valides requis');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verify the track exists in the given playlist
        const trackCheck = await client.query(
          'SELECT id, order_index FROM playlist_tracks WHERE playlist_id = $1 AND id = $2',
          [cleanPlaylistId, targetTrackId]
        );

        if (trackCheck.rows.length === 0) {
          throw new Error('Piste introuvable dans cette playlist');
        }

        // Get all tracks for the playlist in current order
        const allTracksRes = await client.query(
          'SELECT id FROM playlist_tracks WHERE playlist_id = $1 ORDER BY order_index ASC, id ASC',
          [cleanPlaylistId]
        );

        // Put target track first, followed by others
        const reorderedIds = [
          targetTrackId,
          ...allTracksRes.rows.map((r) => r.id).filter((id) => id !== targetTrackId),
        ];

        // Update each track's order_index with parameterized query
        for (let i = 0; i < reorderedIds.length; i++) {
          await client.query(
            'UPDATE playlist_tracks SET order_index = $1 WHERE id = $2 AND playlist_id = $3',
            [i, reorderedIds[i], cleanPlaylistId]
          );
        }

        await client.query('COMMIT');

        // Fetch refreshed tracks list
        const updatedRes = await client.query(
          `SELECT v.id::text, v.title, v.youtube_id as "youtubeId", v.artist_name as "artistName", 
                  v.description, v.mal_anime_id as "malAnimeId", v.mal_title as "malTitle", 
                  v.anilist_id as "anilistId", v.anilist_title as "anilistTitle",
                  pt.order_index as "orderIndex", pt.id as "trackId"
           FROM playlist_tracks pt
           JOIN videos v ON pt.video_id = v.id
           WHERE pt.playlist_id = $1
           ORDER BY pt.order_index ASC`,
          [cleanPlaylistId]
        );

        console.log(`Admin set track ${targetTrackId} as first video in playlist ${cleanPlaylistId}`);

        if (typeof callback === 'function') {
          callback({ success: true, videos: updatedRes.rows });
        }
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error setting first video as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 7. Admin: Delete playlist
  socket.on('playlist:delete', async ({ id, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanId = sanitizeText(id, 50);
      if (!cleanId) throw new Error('ID de playlist invalide');

      await pool.query('DELETE FROM playlists WHERE id = $1', [cleanId]);
      console.log(`Admin deleted playlist: ${cleanId}`);
      await invalidatePlaylistCaches(cleanId);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error(`Error deleting playlist ${id}:`, error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 8. Admin: Clean stale playlists (played_count <= 1 AND older than 30 days)
  socket.on('playlist:clean_stale', async ({ password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const result = await pool.query(
        `DELETE FROM playlists 
         WHERE is_custom = TRUE 
           AND (played_count <= 1 OR played_count IS NULL)
           AND (
             (last_played IS NOT NULL AND last_played < NOW() - INTERVAL '30 days')
             OR (last_played IS NULL AND created_at < NOW() - INTERVAL '30 days')
           )`
      );

      console.log(`Admin cleaned stale playlists. Total deleted: ${result.rowCount}`);

      if (typeof callback === 'function') {
        callback({ success: true, count: result.rowCount });
      }
    } catch (error) {
      console.error('Error cleaning stale playlists:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 9. Match and return MAL videos for lobby preview
  socket.on('playlist:get_mal_videos', async ({ username }, callback) => {
    try {
      const cleanUsername = validateMalUsername(username);
      if (!cleanUsername) {
        throw new Error('Nom d\'utilisateur MyAnimeList invalide (2-20 caractères alphanumériques)');
      }

      console.log(`Lobby fetching MAL list for user: ${cleanUsername}`);
      const malTitles = await fetchUserCompletedAnime(cleanUsername);
      
      if (malTitles.length === 0) {
        throw new Error('Aucun animé terminé trouvé sur ce profil MyAnimeList.');
      }

      // Fetch all unique videos from the database
      const allVideosResult = await pool.query(
        `SELECT id::text, title, youtube_id as "youtubeId", artist_name as "artistName", description, 
                mal_anime_id as "malAnimeId", mal_title as "malTitle",
                anilist_id as "anilistId", anilist_title as "anilistTitle"
         FROM videos
         ORDER BY id ASC`
      );

      // Filter videos using malMatcher helper
      const uniqueMatchedVideos = filterVideosByMalList(allVideosResult.rows, malTitles);

      if (typeof callback === 'function') {
        callback({
          success: true,
          videos: uniqueMatchedVideos
        });
      }
    } catch (error) {
      console.error('Error matching MAL videos:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 9b. Match and return AniList videos for lobby preview / import
  socket.on('playlist:get_anilist_videos', async ({ username }, callback) => {
    try {
      const cleanUsername = validateAnilistUsername(username);
      if (!cleanUsername) {
        throw new Error("Nom d'utilisateur AniList invalide (2-30 caractères alphanumériques)");
      }

      console.log(`Lobby fetching AniList list for user: ${cleanUsername}`);
      const anilistTitles = await fetchUserCompletedAnimeFromAnilist(cleanUsername);

      if (anilistTitles.length === 0) {
        throw new Error('Aucun animé terminé trouvé sur ce profil AniList.');
      }

      // Fetch all unique videos from the database
      const allVideosResult = await pool.query(
        `SELECT id::text, title, youtube_id as "youtubeId", artist_name as "artistName", description, 
                mal_anime_id as "malAnimeId", mal_title as "malTitle",
                anilist_id as "anilistId", anilist_title as "anilistTitle"
         FROM videos
         ORDER BY id ASC`
      );

      // Filter videos using matcher helper
      const uniqueMatchedVideos = filterVideosByMalList(allVideosResult.rows, anilistTitles);

      if (typeof callback === 'function') {
        callback({
          success: true,
          videos: uniqueMatchedVideos
        });
      }
    } catch (error) {
      console.error('Error matching AniList videos:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Add video to playlist
  socket.on('playlist:admin_add_video', async ({ playlistId, title, youtubeId, artistName, description, malAnimeId, malTitle, anilistId, anilistTitle, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanPlaylistId = sanitizeText(playlistId, 50);
      const cleanTitle = sanitizeText(title, 255);
      const validYtId = validateYoutubeId(youtubeId);
      const cleanArtistName = sanitizeText(artistName, 255) || 'Unknown Artist';
      const cleanVideoDesc = sanitizeText(description, 1000);
      let cleanMalTitle = sanitizeText(malTitle, 255);
      let cleanAnilistTitle = sanitizeText(anilistTitle, 255);
      let parsedMalAnimeId = malAnimeId ? parseInt(malAnimeId, 10) : null;
      let parsedAnilistId = anilistId ? parseInt(anilistId, 10) : null;

      if (!cleanPlaylistId || !cleanTitle || !validYtId) {
        throw new Error('Playlist ID, Titre et ID YouTube valide sont requis');
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
        } catch (e) {
          console.warn('Auto-resolve AniList failed for admin add:', e.message);
        }
      }

      // Only verify on YouTube if the video does not already exist in database
      const existingVideoRes = await pool.query('SELECT id FROM videos WHERE youtube_id = $1', [validYtId]);
      if (existingVideoRes.rows.length === 0) {
        const ytCheck = await verifyYoutubeVideo(validYtId);
        if (!ytCheck.valid) {
          throw new Error(`La vidéo (${validYtId}) est indisponible sur YouTube : ${ytCheck.error}`);
        }
      }

      // Upsert into unique videos catalog
      const videoUpsertRes = await pool.query(
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
          !isNaN(parsedAnilistId) ? parsedAnilistId : null,
          cleanAnilistTitle || null,
        ]
      );
      const videoId = videoUpsertRes.rows[0].id;

      // Check max order_index in playlist_tracks
      const maxIndexRes = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) as max FROM playlist_tracks WHERE playlist_id = $1',
        [cleanPlaylistId]
      );
      const nextIndex = maxIndexRes.rows[0].max + 1;

      // Insert link into playlist_tracks
      await pool.query(
        `INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
         VALUES ($1, $2, $3)`,
        [cleanPlaylistId, videoId, nextIndex]
      );

      console.log(`Admin added video ${videoId} to playlist ${cleanPlaylistId}`);

      if (typeof callback === 'function') {
        callback({ success: true, videoId: String(videoId) });
      }
    } catch (error) {
      console.error('Error adding video as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Add existing video from database to playlist
  socket.on('playlist:admin_add_existing_video', async ({ playlistId, videoId, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanPlaylistId = sanitizeText(playlistId, 50);
      const cleanVideoId = parseInt(videoId, 10);

      if (!cleanPlaylistId || isNaN(cleanVideoId)) {
        throw new Error('Playlist ID et ID Vidéo valides requis');
      }

      // Fetch source video details
      const sourceRes = await pool.query(
        `SELECT id, title, youtube_id, artist_name, description, mal_anime_id, mal_title
         FROM videos
         WHERE id = $1`,
        [cleanVideoId]
      );

      if (sourceRes.rows.length === 0) {
        throw new Error('Vidéo source introuvable dans la base de données');
      }

      // Check max order_index in playlist_tracks
      const maxIndexRes = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) as max FROM playlist_tracks WHERE playlist_id = $1',
        [cleanPlaylistId]
      );
      const nextIndex = maxIndexRes.rows[0].max + 1;

      // Insert link into playlist_tracks (zero duplication in videos table!)
      await pool.query(
        `INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
         VALUES ($1, $2, $3)`,
        [cleanPlaylistId, cleanVideoId, nextIndex]
      );

      console.log(`Admin linked existing video ${cleanVideoId} to playlist ${cleanPlaylistId}`);

      if (typeof callback === 'function') {
        callback({ success: true, videoId: String(cleanVideoId) });
      }
    } catch (error) {
      console.error('Error adding existing video as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Delete video from playlist
  socket.on('playlist:admin_delete_video', async ({ playlistId, videoId, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanPlaylistId = sanitizeText(playlistId, 50);
      const cleanVideoId = parseInt(videoId, 10);
      if (!cleanPlaylistId || isNaN(cleanVideoId)) {
        throw new Error('Playlist ID et ID Vidéo valides sont requis');
      }

      await pool.query(
        'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND video_id = $2',
        [cleanPlaylistId, cleanVideoId]
      );

      console.log(`Admin unlinked video ${cleanVideoId} from playlist ${cleanPlaylistId}`);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Error deleting video as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Delete video directly by ID
  socket.on('playlist:admin_delete_video_direct', async ({ videoId, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanVideoId = parseInt(videoId, 10);
      if (isNaN(cleanVideoId)) {
        throw new Error('ID Vidéo valide requis');
      }

      // Deletes the video globally from catalog (cascades on playlist_tracks and sets ratings to null)
      await pool.query('DELETE FROM videos WHERE id = $1', [cleanVideoId]);
      console.log(`Admin deleted video ${cleanVideoId} directly from catalog`);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Error deleting video directly as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Update existing video details (updates across ALL playlists simultaneously)
  socket.on('playlist:admin_update_video', async ({ videoId, title, youtubeId, artistName, description, malAnimeId, malTitle, anilistId, anilistTitle, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const cleanVideoId = parseInt(videoId, 10);
      const cleanTitle = sanitizeText(title, 255);
      const validYtId = validateYoutubeId(youtubeId);
      const cleanArtistName = sanitizeText(artistName, 255) || 'Unknown Artist';
      const cleanVideoDesc = sanitizeText(description, 1000);
      let cleanMalTitle = sanitizeText(malTitle, 255);
      let cleanAnilistTitle = sanitizeText(anilistTitle, 255);
      let parsedMalAnimeId = malAnimeId ? parseInt(malAnimeId, 10) : null;
      let parsedAnilistId = anilistId ? parseInt(anilistId, 10) : null;

      if (isNaN(cleanVideoId) || !cleanTitle || !validYtId) {
        throw new Error('ID Vidéo, Titre et ID YouTube valide sont requis');
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
        } catch (e) {
          console.warn('Auto-resolve AniList failed for admin update:', e.message);
        }
      }

      const ytCheck = await verifyYoutubeVideo(validYtId);
      if (!ytCheck.valid) {
        throw new Error(`La vidéo (${validYtId}) est indisponible sur YouTube : ${ytCheck.error}`);
      }

      const updateRes = await pool.query(
        `UPDATE videos
         SET title = $1,
             youtube_id = $2,
             artist_name = $3,
             description = $4,
             mal_anime_id = $5,
             mal_title = $6,
             anilist_id = $7,
             anilist_title = $8
         WHERE id = $9
         RETURNING id::text, title, youtube_id as "youtubeId", artist_name as "artistName", description, 
                   mal_anime_id as "malAnimeId", mal_title as "malTitle",
                   anilist_id as "anilistId", anilist_title as "anilistTitle"`,
        [
          cleanTitle,
          validYtId,
          cleanArtistName,
          cleanVideoDesc,
          parsedMalAnimeId,
          cleanMalTitle || null,
          !isNaN(parsedAnilistId) ? parsedAnilistId : null,
          cleanAnilistTitle || null,
          cleanVideoId,
        ]
      );

      if (updateRes.rows.length === 0) {
        throw new Error('Vidéo introuvable dans la base de données');
      }

      console.log(`Admin updated video ${cleanVideoId}: "${cleanTitle}" across all playlists`);

      if (typeof callback === 'function') {
        callback({ success: true, video: updateRes.rows[0] });
      }
    } catch (error) {
      console.error('Error updating video as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Search across all videos in database
  socket.on('playlist:admin_search_all_videos', async ({ query = '', limit = 100, offset = 0, password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const searchCondition = buildVideoSearchConditions(query, 1, 'v');

      let sql = `
        SELECT v.id::text,
               v.title, v.youtube_id as "youtubeId", v.artist_name as "artistName",
               v.description, v.mal_anime_id as "malAnimeId", v.mal_title as "malTitle",
               v.anilist_id as "anilistId", v.anilist_title as "anilistTitle",
               COUNT(pt.id)::int as "playlistsCount"
        FROM videos v
        LEFT JOIN playlist_tracks pt ON v.id = pt.video_id
      `;

      const params = [...searchCondition.params];
      if (searchCondition.clause) {
        sql += ` WHERE ${searchCondition.clause}`;
        sql += ` GROUP BY v.id`;
        params.push(parsedLimit);
        params.push(parsedOffset);
        sql += ` ORDER BY v.id DESC LIMIT $${searchCondition.nextParamIndex} OFFSET $${searchCondition.nextParamIndex + 1}`;
      } else {
        sql += ` GROUP BY v.id`;
        params.push(parsedLimit);
        params.push(parsedOffset);
        sql += ` ORDER BY v.id DESC LIMIT $1 OFFSET $2`;
      }

      const res = await pool.query(sql, params);

      // Total count of distinct videos
      let countSql = `SELECT COUNT(*)::int as total FROM videos v`;
      let countParams = [];
      if (searchCondition.clause) {
        countSql += ` WHERE ${searchCondition.clause}`;
        countParams = [...searchCondition.params];
      }
      const countRes = await pool.query(countSql, countParams);

      if (typeof callback === 'function') {
        callback({
          success: true,
          videos: res.rows,
          total: countRes.rows[0].total,
        });
      }
    } catch (error) {
      console.error('Error searching all videos as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Get rating statistics for a specific video
  socket.on('video:get_stats', async ({ youtubeId }, callback) => {
    try {
      const validYtId = validateYoutubeId(youtubeId);
      if (!validYtId) {
        throw new Error('YouTube ID valide requis');
      }

      const res = await pool.query(
        `SELECT 
           COUNT(*)::int as total,
           COALESCE(AVG(rating), 0) as avg,
           COUNT(CASE WHEN rating = 1 THEN 1 END)::int as r1,
           COUNT(CASE WHEN rating = 2 THEN 1 END)::int as r2,
           COUNT(CASE WHEN rating = 3 THEN 1 END)::int as r3,
           COUNT(CASE WHEN rating = 4 THEN 1 END)::int as r4,
           COUNT(CASE WHEN rating = 5 THEN 1 END)::int as r5
         FROM ratings
         WHERE youtube_id = $1`,
        [validYtId]
      );

      const row = res.rows[0];
      const stats = {
        youtubeId: validYtId,
        totalVotes: row.total,
        averageRating: parseFloat(parseFloat(row.avg).toFixed(2)),
        distribution: {
          1: row.r1,
          2: row.r2,
          3: row.r3,
          4: row.r4,
          5: row.r5,
        },
      };

      if (typeof callback === 'function') {
        callback({ success: true, stats });
      }
    } catch (error) {
      console.error(`Error fetching stats for video ${youtubeId}:`, error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Get global ratings statistics and top/worst rated tracks
  socket.on('admin:get_global_stats', async ({ password }, callback) => {
    try {
      verifyAdminAuth(password, socket);

      // 1. Overall aggregated counts
      const overallRes = await pool.query(
        `SELECT 
           COUNT(*)::int as total,
           COALESCE(AVG(rating), 0) as avg,
           COUNT(CASE WHEN rating = 1 THEN 1 END)::int as r1,
           COUNT(CASE WHEN rating = 2 THEN 1 END)::int as r2,
           COUNT(CASE WHEN rating = 3 THEN 1 END)::int as r3,
           COUNT(CASE WHEN rating = 4 THEN 1 END)::int as r4,
           COUNT(CASE WHEN rating = 5 THEN 1 END)::int as r5
         FROM ratings`
      );
      const overallRow = overallRes.rows[0];

      // 2. Top-rated tracks (at least 1 vote)
      const topTracksRes = await pool.query(
        `SELECT 
           r.youtube_id as "youtubeId",
           v.title,
           v.artist_name as "artistName",
           v.description,
           COUNT(r.id)::int as "totalVotes",
           ROUND(AVG(r.rating)::numeric, 2)::float as "averageRating"
         FROM ratings r
         LEFT JOIN videos v ON r.youtube_id = v.youtube_id
         GROUP BY r.youtube_id, v.title, v.artist_name, v.description
         ORDER BY "averageRating" DESC, "totalVotes" DESC
         LIMIT 10`
      );

      // 3. Worst-rated tracks (at least 1 vote)
      const worstTracksRes = await pool.query(
        `SELECT 
           r.youtube_id as "youtubeId",
           v.title,
           v.artist_name as "artistName",
           v.description,
           COUNT(r.id)::int as "totalVotes",
           ROUND(AVG(r.rating)::numeric, 2)::float as "averageRating"
         FROM ratings r
         LEFT JOIN videos v ON r.youtube_id = v.youtube_id
         GROUP BY r.youtube_id, v.title, v.artist_name, v.description
         ORDER BY "averageRating" ASC, "totalVotes" DESC
         LIMIT 10`
      );

      if (typeof callback === 'function') {
        callback({
          success: true,
          overall: {
            totalVotes: overallRow.total,
            averageRating: parseFloat(parseFloat(overallRow.avg).toFixed(2)),
            distribution: {
              1: overallRow.r1,
              2: overallRow.r2,
              3: overallRow.r3,
              4: overallRow.r4,
              5: overallRow.r5,
            },
          },
          topTracks: topTracksRes.rows,
          worstTracks: worstTracksRes.rows,
        });
      }
    } catch (error) {
      console.error('Error fetching global ratings stats:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 10. Verify YouTube video availability live (for UI forms)
  socket.on('video:verify', async ({ youtubeId }, callback) => {
    try {
      const validYtId = validateYoutubeId(youtubeId);
      if (!validYtId) {
        throw new Error('Identifiant ou lien YouTube invalide');
      }

      const result = await verifyYoutubeVideo(validYtId);
      if (typeof callback === 'function') {
        callback({
          success: true,
          youtubeId: validYtId,
          ...result,
        });
      }
    } catch (error) {
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });
}
