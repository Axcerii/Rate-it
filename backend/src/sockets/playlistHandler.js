import pool from '../db/db.js';
import { getSession, saveSession } from '../store/sessionStore.js';
import { fetchUserCompletedAnime } from '../services/malService.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function generatePlaylistId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PL-${code}`;
}

export function registerPlaylistHandlers(io, socket) {
  // 1. Get all playlists (Validated & Community)
  socket.on('playlist:list', async (payload, callback) => {
    try {
      // Fetch validated playlists
      const validatedRes = await pool.query(
        `SELECT id, name, description, is_custom, played_count, last_played, is_validated, created_at
         FROM playlists
         WHERE is_validated = TRUE
         ORDER BY played_count DESC, created_at DESC`
      );

      // Fetch community (custom & not validated) playlists
      const communityRes = await pool.query(
        `SELECT id, name, description, is_custom, played_count, last_played, is_validated, created_at
         FROM playlists
         WHERE is_custom = TRUE AND is_validated = FALSE
         ORDER BY played_count DESC, created_at DESC`
      );

      if (typeof callback === 'function') {
        callback({
          success: true,
          validated: validatedRes.rows,
          community: communityRes.rows,
        });
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 2. Create custom playlist
  socket.on('playlist:create', async ({ name, description, videos }, callback) => {
    const client = await pool.connect();
    try {
      if (!name || !Array.isArray(videos) || videos.length === 0) {
        throw new Error('Playlist name and at least one track are required.');
      }

      await client.query('BEGIN');

      const playlistId = generatePlaylistId();

      // Insert playlist
      await client.query(
        `INSERT INTO playlists (id, name, description, is_custom, is_validated)
         VALUES ($1, $2, $3, TRUE, FALSE)`,
        [playlistId, name.trim(), description ? description.trim() : '']
      );

      // Insert videos
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        if (!video.title || !video.youtubeId) {
          throw new Error(`Track at index ${i} is missing title or YouTube URL.`);
        }
        await client.query(
          `INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            playlistId,
            video.title.trim(),
            video.youtubeId.trim(),
            video.animeName ? video.animeName.trim() : 'Unknown Anime',
            video.type ? video.type.trim() : 'OP',
            i,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`Custom playlist created: ${playlistId} - "${name}" with ${videos.length} tracks`);

      if (typeof callback === 'function') {
        callback({ success: true, playlistId });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating custom playlist:', error);
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
      if (!id) {
        throw new Error('Playlist ID is required');
      }

      const playlistRes = await pool.query(
        'SELECT * FROM playlists WHERE id = $1',
        [id]
      );

      if (playlistRes.rows.length === 0) {
        throw new Error('Playlist not found');
      }

      const videosRes = await pool.query(
        `SELECT id::text, title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type", order_index
         FROM videos
         WHERE playlist_id = $1
         ORDER BY order_index ASC`,
        [id]
      );

      if (typeof callback === 'function') {
        callback({
          success: true,
          playlist: playlistRes.rows[0],
          videos: videosRes.rows,
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
      const searchQuery = `%${(query || '').trim()}%`;
      const result = await pool.query(
        `SELECT DISTINCT ON (youtube_id) title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type"
         FROM videos
         WHERE anime_name ILIKE $1 OR title ILIKE $1
         LIMIT 15`,
        [searchQuery]
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
    const { sessionId, isHost } = socket.data;

    if (!sessionId || !isHost) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized' });
      }
      return;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.disabledVideoIds = session.disabledVideoIds || {};
      if (session.disabledVideoIds[videoId]) {
        delete session.disabledVideoIds[videoId];
      } else {
        session.disabledVideoIds[videoId] = true;
      }

      await saveSession(session);
      io.to(`session:${sessionId}`).emit('room:update', session);

      if (typeof callback === 'function') {
        callback({ success: true, disabledVideoIds: session.disabledVideoIds });
      }
    } catch (error) {
      console.error('Error toggling lobby video:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 6. Admin: Toggle validation status
  socket.on('playlist:validate', async ({ id, isValidated, password }, callback) => {
    try {
      if (password !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }

      await pool.query(
        'UPDATE playlists SET is_validated = $1 WHERE id = $2',
        [isValidated, id]
      );

      console.log(`Admin validation updated for playlist ${id}: ${isValidated}`);

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

  // 7. Admin: Delete playlist
  socket.on('playlist:delete', async ({ id, password }, callback) => {
    try {
      if (password !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }

      await pool.query('DELETE FROM playlists WHERE id = $1', [id]);
      console.log(`Admin deleted playlist: ${id}`);

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
      if (password !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }

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
      if (!username || !username.trim()) {
        throw new Error('Username is required');
      }

      console.log(`Lobby fetching MAL list for user: ${username}`);
      const malTitles = await fetchUserCompletedAnime(username.trim());
      
      if (malTitles.length === 0) {
        throw new Error('No completed anime found on this MyAnimeList profile.');
      }

      // Fetch all videos from the database
      const allVideosResult = await pool.query(
        `SELECT id::text, title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type"
         FROM videos
         ORDER BY order_index ASC`
      );

      const ANIME_SYNONYMS = {
        'neon genesis evangelion': ['neon genesis evangelion', 'evangelion', 'shinseiki evangelion'],
        'attack on titan': ['attack on titan', 'shingeki no kyojin', 'snk'],
        'naruto shippuden': ['naruto shippuden', 'naruto shippuuden', 'naruto: shippuuden', 'naruto'],
        'tokyo ghoul': ['tokyo ghoul', 'tokyo kushushu']
      };

      // Filter videos whose anime name matches (substring match, case insensitive, with synonyms)
      const matchedVideos = allVideosResult.rows.filter(video => {
        const videoAnimeNameLower = video.animeName.toLowerCase().trim();
        const synonyms = ANIME_SYNONYMS[videoAnimeNameLower] || [videoAnimeNameLower];
        
        return malTitles.some(entry => {
          const titleLower = entry.title ? entry.title.toLowerCase().trim() : '';
          const engTitleLower = entry.englishTitle ? entry.englishTitle.toLowerCase().trim() : '';
          
          return synonyms.some(syn => 
            (titleLower && (titleLower.includes(syn) || syn.includes(titleLower))) ||
            (engTitleLower && (engTitleLower.includes(syn) || syn.includes(engTitleLower)))
          );
        });
      });

      // Remove duplicate tracks by youtubeId
      const seenYoutubeIds = new Set();
      const uniqueMatchedVideos = matchedVideos.filter(video => {
        if (seenYoutubeIds.has(video.youtubeId)) {
          return false;
        }
        seenYoutubeIds.add(video.youtubeId);
        return true;
      });

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

  // Admin: Add video to playlist
  socket.on('playlist:admin_add_video', async ({ playlistId, title, youtubeId, animeName, type, password }, callback) => {
    try {
      if (password !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      if (!playlistId || !title || !youtubeId) {
        throw new Error('Playlist ID, Title, and YouTube ID are required');
      }

      // Check order_index max
      const maxIndexRes = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) as max FROM videos WHERE playlist_id = $1',
        [playlistId]
      );
      const nextIndex = maxIndexRes.rows[0].max + 1;

      // Insert video
      const insertRes = await pool.query(
        `INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::text`,
        [
          playlistId,
          title.trim(),
          youtubeId.trim(),
          animeName ? animeName.trim() : 'Unknown Anime',
          type ? type.trim() : 'OP',
          nextIndex
        ]
      );

      console.log(`Admin added video ${insertRes.rows[0].id} to playlist ${playlistId}`);

      if (typeof callback === 'function') {
        callback({ success: true, videoId: insertRes.rows[0].id });
      }
    } catch (error) {
      console.error('Error adding video as admin:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Admin: Delete video from playlist
  socket.on('playlist:admin_delete_video', async ({ playlistId, videoId, password }, callback) => {
    try {
      if (password !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      if (!playlistId || !videoId) {
        throw new Error('Playlist ID and Video ID are required');
      }

      await pool.query(
        'DELETE FROM videos WHERE playlist_id = $1 AND id = $2',
        [playlistId, parseInt(videoId, 10)]
      );

      console.log(`Admin deleted video ${videoId} from playlist ${playlistId}`);

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
}
