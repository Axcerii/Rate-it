import { connectToTwitchChat, disconnectFromTwitchChat } from '../services/twitchService.js';
import { getSession, saveSession, acquireSessionLock } from '../store/sessionStore.js';
import { validateTwitchChannel, broadcastRoomUpdate } from '../utils/security.js';

export function registerTwitchHandlers(io, socket) {
  // Connect Host to Twitch Chat room
  socket.on('twitch:connect', async ({ channelName }, callback) => {
    let release;
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
      release = await acquireSessionLock(sessionId);
      const session = await getSession(sessionId);
      if (session) {
        session.twitchChannel = validChannel;
        // Reset twitchVotes for safety
        session.twitchVotes = {};
        await saveSession(session);
        broadcastRoomUpdate(io, session, { light: true });
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
    } finally {
      release?.();
    }
  });

  // Disconnect Host from Twitch Chat room
  socket.on('twitch:disconnect', async (payload, callback) => {
    let release;
    try {
      const { sessionId, isHost } = socket.data;

      if (!sessionId || !isHost) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Unauthorized' });
        }
        return;
      }

      disconnectFromTwitchChat(sessionId);
      
      release = await acquireSessionLock(sessionId);
      const session = await getSession(sessionId);
      if (session) {
        session.twitchChannel = null;
        session.twitchVotes = {};
        await saveSession(session);
        broadcastRoomUpdate(io, session, { light: true });
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
    } finally {
      release?.();
    }
  });
}
