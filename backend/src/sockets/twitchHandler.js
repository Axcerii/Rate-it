import { connectToTwitchChat, disconnectFromTwitchChat } from '../services/twitchService.js';
import { getSession, saveSession } from '../store/sessionStore.js';

export function registerTwitchHandlers(io, socket) {
  // Connect Host to Twitch Chat room
  socket.on('twitch:connect', async ({ channelName }, callback) => {
    const { sessionId, isHost } = socket.data;

    if (!sessionId || !isHost) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized: Only Host can connect Twitch Chat' });
      }
      return;
    }

    try {
      if (!channelName) {
        throw new Error('Twitch channel name is required');
      }

      connectToTwitchChat(io, sessionId, channelName);

      // Save channel name in session state for UI reference
      const session = await getSession(sessionId);
      if (session) {
        session.twitchChannel = channelName.trim();
        // Reset twitchVotes for safety
        session.twitchVotes = {};
        await saveSession(session);
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
    const { sessionId, isHost } = socket.data;

    if (!sessionId || !isHost) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Unauthorized' });
      }
      return;
    }

    try {
      disconnectFromTwitchChat(sessionId);
      
      const session = await getSession(sessionId);
      if (session) {
        session.twitchChannel = null;
        session.twitchVotes = {};
        await saveSession(session);
        io.to(`session:${sessionId}`).emit('room:update', session);
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
