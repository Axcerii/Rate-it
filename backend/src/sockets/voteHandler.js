import { getSession, saveSession } from '../store/sessionStore.js';
import { validateRating, broadcastRoomUpdate } from '../utils/security.js';

export function registerVoteHandlers(io, socket) {
  // Player submits a vote
  socket.on('game:vote', async ({ voteValue }, callback) => {
    try {
      const { sessionId, playerId } = socket.data;

      if (!sessionId || !playerId) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Non autorisé : vous n\'êtes pas dans une session de salle' });
        }
        return;
      }

      const parsedVote = validateRating(voteValue);
      if (parsedVote === null) {
        throw new Error('La note doit être un nombre entier entre 1 et 5');
      }

      const session = await getSession(sessionId);
      if (!session) {
        throw new Error('Session introuvable');
      }

      if (session.status !== 'PLAYING') {
        throw new Error('Le vote est uniquement actif pendant la lecture');
      }

      // Record player's vote
      session.votes = session.votes || {};
      session.votes[playerId] = parsedVote;

      if (session.players[playerId]) {
        session.players[playerId].vote = parsedVote;
      }

      // If results were already accumulated for the current video (e.g. during REVEAL phase), update them too
      const currentVideo = session.videos?.[session.currentVideoIndex];
      if (currentVideo && session.results?.[currentVideo.id]) {
        const resObj = session.results[currentVideo.id];
        resObj.playerVotes = resObj.playerVotes || {};
        resObj.playerVotes[playerId] = parsedVote;

        const votesList = Object.values(session.votes);
        const sum = votesList.reduce((acc, v) => acc + v, 0);
        resObj.average = votesList.length > 0 ? parseFloat((sum / votesList.length).toFixed(2)) : 0;
        resObj.votesCount = votesList.length;
      }

      await saveSession(session);

      console.log(`Room ${sessionId}: Player ${playerId} voted ${parsedVote}`);

      // Securely broadcast updated session state to all clients in the room (with voting masking)
      broadcastRoomUpdate(io, session);

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
