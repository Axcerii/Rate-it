import { getSession, saveSession } from '../store/sessionStore.js';
import pool from '../db/db.js';
import { fetchUserCompletedAnime } from '../services/malService.js';

export function registerGameHandlers(io, socket) {
  // Start the game session
  socket.on('game:start', async (payload, callback) => {
    const { sessionId, isHost } = socket.data;

    if (!sessionId || !isHost) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized: Only the Host can start the game' });
      }
      return;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const { malUsername, playlistId } = payload || {};
      let videos = [];
      let activePlaylistId = playlistId || 'anime-classics';

      if (malUsername && malUsername.trim()) {
        const username = malUsername.trim();
        console.log(`Filtering playlist using MyAnimeList completed list of: ${username}`);
        activePlaylistId = 'mal-custom';
        try {
          const malTitles = await fetchUserCompletedAnime(username);
          if (malTitles.length > 0) {
            // Get all videos in DB to match
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
            videos = allVideosResult.rows.filter(video => {
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
            console.log(`Found ${videos.length} matching MAL videos out of ${allVideosResult.rows.length} total videos`);
          }
        } catch (err) {
          console.error(`Failed to filter with MAL list for user ${username}, falling back to default:`, err);
        }
      }

      // If not MAL, or if MAL query returned 0 matches, fetch from selected playlistId
      if (videos.length === 0) {
        if (activePlaylistId === 'mal-custom') {
          activePlaylistId = 'anime-classics';
        }
        const result = await pool.query(
          `SELECT id::text, title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type"
           FROM videos 
           WHERE playlist_id = $1 
           ORDER BY order_index ASC`,
          [activePlaylistId]
        );
        videos = result.rows;
      }

      // Filter out any disabled videos
      const disabledIds = session.disabledVideoIds || {};
      videos = videos.filter(video => !disabledIds[video.id]);

      if (videos.length === 0) {
        throw new Error('No active videos left (all videos in the playlist are disabled).');
      }

      // Increment played_count and set last_played for the selected playlist
      try {
        await pool.query(
          `UPDATE playlists 
           SET played_count = COALESCE(played_count, 0) + 1, last_played = NOW() 
           WHERE id = $1`,
          [activePlaylistId]
        );
      } catch (err) {
        console.error(`Failed to update play metrics for playlist ${activePlaylistId}:`, err);
      }

      session.status = 'PLAYING';
      session.playlistId = activePlaylistId;
      session.currentVideoIndex = 0;
      session.videos = videos;
      session.votes = {};
      session.twitchVotes = {};

      // Reset any votes in player objects
      for (const pid in session.players) {
        session.players[pid].vote = undefined;
      }

      await saveSession(session);

      console.log(`Game started for room ${sessionId} with ${session.videos.length} videos`);

      // Notify all clients in the room
      io.to(`session:${sessionId}`).emit('room:update', session);

      if (typeof callback === 'function') {
        callback({ success: true, session });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Advance to next video
  socket.on('game:next', async (payload, callback) => {
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

      if (!session.videos || session.videos.length === 0) {
        throw new Error('No videos found in session');
      }

      // Accumulate votes for the current video before advancing
      const currentVideo = session.videos[session.currentVideoIndex];
      if (currentVideo) {
        const votesList = Object.values(session.votes || {});
        const sum = votesList.reduce((sum, v) => sum + v, 0);
        const count = votesList.length;
        const average = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

        // Calculate Twitch votes average
        const twitchVotesList = Object.values(session.twitchVotes || {});
        const twitchSum = twitchVotesList.reduce((sum, v) => sum + v, 0);
        const twitchCount = twitchVotesList.length;
        const twitchAverage = twitchCount > 0 ? parseFloat((twitchSum / twitchCount).toFixed(2)) : 0;

        session.results = session.results || {};
        session.results[currentVideo.id] = {
          id: currentVideo.id,
          title: currentVideo.title,
          youtubeId: currentVideo.youtubeId,
          animeName: currentVideo.animeName,
          type: currentVideo.type,
          average,
          votesCount: count,
          twitchAverage,
          twitchVotesCount: twitchCount,
        };
      }

      session.currentVideoIndex++;

      // Reset votes for the next round
      session.votes = {};
      session.twitchVotes = {};
      for (const pid in session.players) {
        session.players[pid].vote = undefined;
      }

      if (session.currentVideoIndex >= session.videos.length) {
        session.status = 'LEADERBOARD';
        console.log(`Game in room ${sessionId} reached leaderboard`);
      } else {
        console.log(`Game in room ${sessionId} advanced to video index ${session.currentVideoIndex}`);
      }

      await saveSession(session);
      io.to(`session:${sessionId}`).emit('room:update', session);

      if (typeof callback === 'function') {
        callback({ success: true, session });
      }
    } catch (error) {
      console.error('Error advancing video:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Navigate to previous video
  socket.on('game:previous', async (payload, callback) => {
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

      if (session.currentVideoIndex > 0) {
        session.currentVideoIndex--;
        session.status = 'PLAYING'; // If we were on leaderboard, go back to playing

        // Reset votes for the replayed round
        session.votes = {};
        for (const pid in session.players) {
          session.players[pid].vote = undefined;
        }

        await saveSession(session);
        io.to(`session:${sessionId}`).emit('room:update', session);
        console.log(`Game in room ${sessionId} reverted to video index ${session.currentVideoIndex}`);
      }

      if (typeof callback === 'function') {
        callback({ success: true, session });
      }
    } catch (error) {
      console.error('Error going to previous video:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });
}
