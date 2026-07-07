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

      const { malUsername } = payload || {};
      let videos = [];
      let playlistId = 'anime-classics';

      if (malUsername && malUsername.trim()) {
        const username = malUsername.trim();
        console.log(`Filtering playlist using MyAnimeList completed list of: ${username}`);
        try {
          const malTitles = await fetchUserCompletedAnime(username);
          if (malTitles.length > 0) {
            // Get all videos in DB to match
            const allVideosResult = await pool.query(
              `SELECT id::text, title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type"
               FROM videos
               ORDER BY order_index ASC`
            );

            // Filter videos whose anime name matches (substring match, case insensitive)
            videos = allVideosResult.rows.filter(video => {
              const videoAnimeNameLower = video.animeName.toLowerCase();
              return malTitles.some(title => 
                videoAnimeNameLower.includes(title) || title.includes(videoAnimeNameLower)
              );
            });
            console.log(`Found ${videos.length} matching MAL videos out of ${allVideosResult.rows.length} total videos`);
          }
        } catch (err) {
          console.error(`Failed to filter with MAL list for user ${username}, falling back to full playlist:`, err);
        }
      }

      // Fallback if no MAL username or no matches found
      if (videos.length === 0) {
        const result = await pool.query(
          `SELECT id::text, title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type"
           FROM videos 
           WHERE playlist_id = $1 
           ORDER BY order_index ASC`,
          [playlistId]
        );
        videos = result.rows;
      } else {
        playlistId = 'mal-custom';
      }

      if (videos.length === 0) {
        throw new Error('No videos found in the selected playlist');
      }

      session.status = 'PLAYING';
      session.playlistId = playlistId;
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
