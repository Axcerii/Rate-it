import { getSession, saveSession } from '../store/sessionStore.js';
import pool from '../db/db.js';

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

      // Fetch videos from PostgreSQL for the default playlist
      const playlistId = 'anime-classics';
      const result = await pool.query(
        `SELECT id::text, title, youtube_id as "youtubeId", anime_name as "animeName", video_type as "type"
         FROM videos 
         WHERE playlist_id = $1 
         ORDER BY order_index ASC`,
        [playlistId]
      );

      if (result.rows.length === 0) {
        throw new Error('No videos found in the selected playlist');
      }

      session.status = 'PLAYING';
      session.playlistId = playlistId;
      session.currentVideoIndex = 0;
      session.videos = result.rows;
      session.votes = {};

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

      session.currentVideoIndex++;

      // Reset votes for the next round
      session.votes = {};
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
