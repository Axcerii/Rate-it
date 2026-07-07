import { getSession, saveSession } from '../store/sessionStore.js';

export function registerVoteHandlers(io, socket) {
  // Player submits a vote
  socket.on('game:vote', async ({ voteValue }, callback) => {
    const { sessionId, playerId } = socket.data;

    if (!sessionId || !playerId) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized: You are not in a room session' });
      }
      return;
    }

    try {
      const parsedVote = parseInt(voteValue, 10);
      if (isNaN(parsedVote) || parsedVote < 1 || parsedVote > 5) {
        throw new Error('Vote value must be an integer between 1 and 5');
      }

      const session = await getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'PLAYING') {
        throw new Error('Voting is only active during playback');
      }

      // Record player's vote
      session.votes = session.votes || {};
      session.votes[playerId] = parsedVote;

      if (session.players[playerId]) {
        session.players[playerId].vote = parsedVote;
      }

      await saveSession(session);

      console.log(`Room ${sessionId}: Player ${playerId} voted ${parsedVote}`);

      // Broadcast updated session state to all clients in the room
      io.to(`session:${sessionId}`).emit('room:update', session);

      if (typeof callback === 'function') {
        callback({ success: true, vote: parsedVote });
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });
}
