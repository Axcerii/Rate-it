import { connectToTwitchChat, disconnectFromTwitchChat } from '../services/twitchService.js';
import { getSession, saveSession } from '../store/sessionStore.js';
import { validateTwitchChannel, broadcastRoomUpdate } from '../utils/security.js';

export function registerTwitchHandlers(io, socket) {
  // Connect Host to Twitch Chat room
  socket.on('twitch:connect', async ({ channelName }, callback) => {
    try {
      const { sessionId, isHost } = socket.data;

      if (!sessionId || !isHost) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Non autorisé : seul l\'hôte peut connecter le chat Twitch' });
        }
        return;
      }

      const validChannel = validateTwitchChannel(channelName);
      if (!validChannel) {
        throw new Error('Nom de chaîne Twitch invalide');
      }

      connectToTwitchChat(io, sessionId, validChannel);

      // Save channel name in session state for UI reference
      const session = await getSession(sessionId);
      if (session) {
        session.twitchChannel = validChannel;
        // Reset twitchVotes for safety
        session.twitchVotes = {};
        await saveSession(session);
        broadcastRoomUpdate(io, session);
      }

      console.log(`Socket ${socket.id} requested Twitch connection to #${channelName}`);

      if (typeof callback === 'function') {
        callback({ success: true, channelName });
      }
    } catch (error) {
      console.error('Error connecting Twitch chat socket event:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Disconnect Host from Twitch Chat room
  socket.on('twitch:disconnect', async (payload, callback) => {
    try {
      const { sessionId, isHost } = socket.data;

      if (!sessionId || !isHost) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Unauthorized' });
        }
        return;
      }

      disconnectFromTwitchChat(sessionId);
      
      const session = await getSession(sessionId);
      if (session) {
        session.twitchChannel = null;
        session.twitchVotes = {};
        await saveSession(session);
        broadcastRoomUpdate(io, session);
      }

      console.log(`Socket ${socket.id} requested Twitch disconnect`);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Error disconnecting Twitch chat socket event:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });
}
