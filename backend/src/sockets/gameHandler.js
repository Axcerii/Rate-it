import { getSession, saveSession } from '../store/sessionStore.js';
import pool from '../db/db.js';
import { fetchUserCompletedAnime } from '../services/malService.js';

async function recordAndFetchVideoRatings(session, currentVideo) {
  if (!session || !currentVideo) return;

  const videoId = parseInt(currentVideo.id, 10) || null;
  const youtubeId = currentVideo.youtubeId;
  const playlistId = session.playlistId;
  const sessionId = session.sessionId;

  // Track recorded rounds on session to avoid inserting twice for same session & video
  session.savedRatingsMap = session.savedRatingsMap || {};
  const saveKey = `${sessionId}_${currentVideo.id}`;

  if (!session.savedRatingsMap[saveKey]) {
    session.savedRatingsMap[saveKey] = true;

    // 1. Insert player votes
    for (const pid in session.votes) {
      const ratingVal = session.votes[pid];
      if (typeof ratingVal === 'number' && ratingVal >= 1 && ratingVal <= 5) {
        const playerName = session.players?.[pid]?.name || 'Anonymous Player';
        try {
          await pool.query(
            `INSERT INTO ratings (video_id, youtube_id, playlist_id, session_id, player_name, rating, source)
             VALUES ($1, $2, $3, $4, $5, $6, 'PLAYER')`,
            [videoId, youtubeId, playlistId, sessionId, playerName, ratingVal]
          );
        } catch (err) {
          console.error('Failed to insert player rating:', err);
        }
      }
    }

    // 2. Insert Twitch votes
    for (const username in session.twitchVotes) {
      const ratingVal = session.twitchVotes[username];
      if (typeof ratingVal === 'number' && ratingVal >= 1 && ratingVal <= 5) {
        try {
          await pool.query(
            `INSERT INTO ratings (video_id, youtube_id, playlist_id, session_id, player_name, rating, source)
             VALUES ($1, $2, $3, $4, $5, $6, 'TWITCH')`,
            [videoId, youtubeId, playlistId, sessionId, username, ratingVal]
          );
        } catch (err) {
          console.error('Failed to insert Twitch rating:', err);
        }
      }
    }
  }

  // 3. Query historical average and total rating count for this youtube_id
  try {
    const statsRes = await pool.query(
      `SELECT COUNT(*)::int as count, COALESCE(AVG(rating), 0) as avg
       FROM ratings
       WHERE youtube_id = $1`,
      [youtubeId]
    );

    const histCount = statsRes.rows[0].count;
    const histAvg = parseFloat(parseFloat(statsRes.rows[0].avg).toFixed(2));

    if (session.results && session.results[currentVideo.id]) {
      session.results[currentVideo.id].historicalAverage = histAvg;
      session.results[currentVideo.id].historicalVotesCount = histCount;
    }
  } catch (err) {
    console.error('Failed to fetch historical ratings stats:', err);
  }
}

export async function checkAndAdvanceSkip(io, session) {
  if (!session || session.status !== 'PLAYING') return false;

  const activePlayers = Object.values(session.players || {}).filter(p => p.isConnected);
  if (activePlayers.length === 0) return false;

  const phase = session.phase || 'VOTING';

  if (phase === 'VOTING') {
    const allSkipped = activePlayers.every(p => session.skips && session.skips[p.id]);
    if (allSkipped) {
      session.phase = 'REVEAL';
      // Accumulate round results
      const currentVideo = session.videos?.[session.currentVideoIndex];
      if (currentVideo) {
        const votesList = Object.values(session.votes || {});
        const sum = votesList.reduce((sum, v) => sum + v, 0);
        const count = votesList.length;
        const average = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

        const twitchVotesList = Object.values(session.twitchVotes || {});
        const twitchSum = twitchVotesList.reduce((sum, v) => sum + v, 0);
        const twitchCount = twitchVotesList.length;
        const twitchAverage = twitchCount > 0 ? parseFloat((twitchSum / twitchCount).toFixed(2)) : 0;

        session.results = session.results || {};
        session.results[currentVideo.id] = {
          id: currentVideo.id,
          title: currentVideo.title,
          youtubeId: currentVideo.youtubeId,
          artistName: currentVideo.artistName,
          description: currentVideo.description,
          average,
          votesCount: count,
          twitchAverage,
          twitchVotesCount: twitchCount,
        };
        await recordAndFetchVideoRatings(session, currentVideo);
      }
      await saveSession(session);
      io.to(`session:${session.sessionId}`).emit('room:update', session);
      return true;
    }
  } else if (phase === 'REVEAL') {
    const allSkipped = activePlayers.every(p => session.revealSkips && session.revealSkips[p.id]);
    if (allSkipped) {
      session.currentVideoIndex++;
      session.votes = {};
      session.twitchVotes = {};
      session.skips = {};
      session.revealSkips = {};
      session.phase = 'VOTING';

      for (const pid in session.players) {
        session.players[pid].vote = undefined;
        session.players[pid].hasSkipped = false;
      }

      if (session.currentVideoIndex >= session.videos.length) {
        session.status = 'LEADERBOARD';
      }

      await saveSession(session);
      io.to(`session:${session.sessionId}`).emit('room:update', session);
      return true;
    }
  }

  return false;
}

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
              `SELECT id::text, title, youtube_id as "youtubeId", artist_name as "artistName", description
               FROM videos
               ORDER BY order_index ASC`
            );

            // Filter videos whose description, title, or artist matches
            const matchedVideos = allVideosResult.rows.filter(video => {
              const textToSearch = `${video.description || ''} ${video.artistName || ''} ${video.title || ''}`.toLowerCase().trim();
              
              return malTitles.some(entry => {
                const titleLower = entry.title ? entry.title.toLowerCase().trim() : '';
                const engTitleLower = entry.englishTitle ? entry.englishTitle.toLowerCase().trim() : '';
                
                return (
                  (titleLower && textToSearch.includes(titleLower)) ||
                  (engTitleLower && textToSearch.includes(engTitleLower))
                );
              });
            });

            // Remove duplicate tracks by youtubeId
            const seenYoutubeIds = new Set();
            videos = matchedVideos.filter(video => {
              if (seenYoutubeIds.has(video.youtubeId)) {
                return false;
              }
              seenYoutubeIds.add(video.youtubeId);
              return true;
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
          `SELECT id::text, title, youtube_id as "youtubeId", artist_name as "artistName", description
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
      session.phase = 'VOTING';
      session.playlistId = activePlaylistId;
      session.currentVideoIndex = 0;
      session.videos = videos;
      session.votes = {};
      session.twitchVotes = {};
      session.skips = {};
      session.revealSkips = {};

      // Reset any votes & skips in player objects
      for (const pid in session.players) {
        session.players[pid].vote = undefined;
        session.players[pid].hasSkipped = false;
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

  // Reveal vote results for current round
  socket.on('game:show_results', async (payload, callback) => {
    const { sessionId } = socket.data;
    if (!sessionId) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized' });
      }
      return;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) throw new Error('Session not found');

      session.phase = 'REVEAL';

      const currentVideo = session.videos?.[session.currentVideoIndex];
      if (currentVideo) {
        const votesList = Object.values(session.votes || {});
        const sum = votesList.reduce((sum, v) => sum + v, 0);
        const count = votesList.length;
        const average = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

        const twitchVotesList = Object.values(session.twitchVotes || {});
        const twitchSum = twitchVotesList.reduce((sum, v) => sum + v, 0);
        const twitchCount = twitchVotesList.length;
        const twitchAverage = twitchCount > 0 ? parseFloat((twitchSum / twitchCount).toFixed(2)) : 0;

        session.results = session.results || {};
        session.results[currentVideo.id] = {
          id: currentVideo.id,
          title: currentVideo.title,
          youtubeId: currentVideo.youtubeId,
          artistName: currentVideo.artistName,
          description: currentVideo.description,
          average,
          votesCount: count,
          twitchAverage,
          twitchVotesCount: twitchCount,
        };
        await recordAndFetchVideoRatings(session, currentVideo);
      }

      await saveSession(session);
      io.to(`session:${sessionId}`).emit('room:update', session);

      if (typeof callback === 'function') {
        callback({ success: true, session });
      }
    } catch (error) {
      console.error('Error showing results:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Active player toggles skip status
  socket.on('game:player_skip', async (payload, callback) => {
    const { sessionId, playerId } = socket.data;

    if (!sessionId || !playerId) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized: You are not in a room session' });
      }
      return;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) throw new Error('Session not found');
      if (session.status !== 'PLAYING') throw new Error('Game is not playing');

      const currentPhase = session.phase || 'VOTING';

      if (currentPhase === 'VOTING') {
        session.skips = session.skips || {};
        session.skips[playerId] = !session.skips[playerId];
        if (session.players[playerId]) {
          session.players[playerId].hasSkipped = session.skips[playerId];
        }
      } else if (currentPhase === 'REVEAL') {
        session.revealSkips = session.revealSkips || {};
        session.revealSkips[playerId] = !session.revealSkips[playerId];
      }

      const advanced = await checkAndAdvanceSkip(io, session);
      if (!advanced) {
        await saveSession(session);
        io.to(`session:${sessionId}`).emit('room:update', session);
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          hasSkipped: currentPhase === 'VOTING' ? session.skips[playerId] : session.revealSkips[playerId]
        });
      }
    } catch (error) {
      console.error('Error handling player skip:', error);
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

      // Accumulate votes for the current video before advancing if not accumulated yet
      const currentVideo = session.videos[session.currentVideoIndex];
      if (currentVideo) {
        const votesList = Object.values(session.votes || {});
        const sum = votesList.reduce((sum, v) => sum + v, 0);
        const count = votesList.length;
        const average = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

        const twitchVotesList = Object.values(session.twitchVotes || {});
        const twitchSum = twitchVotesList.reduce((sum, v) => sum + v, 0);
        const twitchCount = twitchVotesList.length;
        const twitchAverage = twitchCount > 0 ? parseFloat((twitchSum / twitchCount).toFixed(2)) : 0;

        session.results = session.results || {};
        session.results[currentVideo.id] = {
          id: currentVideo.id,
          title: currentVideo.title,
          youtubeId: currentVideo.youtubeId,
          artistName: currentVideo.artistName,
          description: currentVideo.description,
          average,
          votesCount: count,
          twitchAverage,
          twitchVotesCount: twitchCount,
        };
        await recordAndFetchVideoRatings(session, currentVideo);
      }

      session.currentVideoIndex++;
      session.votes = {};
      session.twitchVotes = {};
      session.skips = {};
      session.revealSkips = {};
      session.phase = 'VOTING';

      for (const pid in session.players) {
        session.players[pid].vote = undefined;
        session.players[pid].hasSkipped = false;
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
        session.status = 'PLAYING';
        session.phase = 'VOTING';
        session.votes = {};
        session.skips = {};
        session.revealSkips = {};

        for (const pid in session.players) {
          session.players[pid].vote = undefined;
          session.players[pid].hasSkipped = false;
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
