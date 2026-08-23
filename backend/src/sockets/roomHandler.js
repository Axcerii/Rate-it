import { getSession, saveSession } from '../store/sessionStore.js';
import { disconnectFromTwitchChat } from '../services/twitchService.js';
import { checkAndAdvanceSkip } from './gameHandler.js';

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function registerRoomHandlers(io, socket) {
  // Host creates a room
  socket.on('room:create', async (payload, callback) => {
    try {
      let code;
      let existingSession = null;
      let attempts = 0;

      // Ensure unique code
      do {
        code = generateRoomCode();
        existingSession = await getSession(code);
        attempts++;
      } while (existingSession && attempts < 10);

      if (existingSession) {
        throw new Error('Could not generate a unique room code');
      }

      const session = {
        sessionId: code,
        hostSocketId: socket.id,
        status: 'LOBBY',
        playlistId: '',
        currentVideoIndex: 0,
        players: {},
        votes: {},
      };

      await saveSession(session);

      socket.data.sessionId = code;
      socket.data.isHost = true;
      socket.join(`session:${code}`);

      console.log(`Room created: ${code} by Host ${socket.id}`);

      if (typeof callback === 'function') {
        callback({ success: true, session });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Host reconnects to room
  socket.on('room:reconnect_host', async ({ sessionId }, callback) => {
    try {
      if (!sessionId) {
        throw new Error('Missing room code');
      }

      const formattedCode = sessionId.trim().toUpperCase();
      const session = await getSession(formattedCode);

      if (!session) {
        throw new Error('Room not found');
      }

      session.hostSocketId = socket.id;
      await saveSession(session);

      socket.data.sessionId = formattedCode;
      socket.data.isHost = true;
      socket.join(`session:${formattedCode}`);

      console.log(`Host ${socket.id} reconnected to room ${formattedCode}`);

      if (typeof callback === 'function') {
        callback({ success: true, session });
      }

      io.to(`session:${formattedCode}`).emit('room:update', session);
    } catch (error) {
      console.error('Error reconnecting host:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Player joins a room
  socket.on('room:join', async ({ sessionId, playerName, playerId }, callback) => {
    try {
      if (!sessionId || !playerName || !playerId) {
        throw new Error('Missing room code, player name, or player ID');
      }

      const formattedCode = sessionId.trim().toUpperCase();
      const session = await getSession(formattedCode);

      if (!session) {
        throw new Error('Room not found');
      }

      // Update session state with player info
      if (session.players[playerId]) {
        session.players[playerId].isConnected = true;
        session.players[playerId].name = playerName;
      } else {
        session.players[playerId] = {
          id: playerId,
          name: playerName,
          isConnected: true,
        };
      }

      await saveSession(session);

      socket.data.sessionId = formattedCode;
      socket.data.playerId = playerId;
      socket.data.isHost = false;
      socket.join(`session:${formattedCode}`);

      console.log(`Player ${playerName} (${playerId}) joined room ${formattedCode}`);

      // Notify player they successfully joined
      if (typeof callback === 'function') {
        callback({ success: true, session });
      }

      // Broadcast updated session state to all clients in the room (including host)
      io.to(`session:${formattedCode}`).emit('room:update', session);
    } catch (error) {
      console.error('Error joining room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle disconnection cleanup
  socket.on('disconnect', async () => {
    const { sessionId, playerId, isHost } = socket.data;

    if (!sessionId) return;

    try {
      const session = await getSession(sessionId);
      if (!session) return;

      if (isHost) {
        console.log(`Host ${socket.id} disconnected from room ${sessionId}`);
        session.hostSocketId = null;
        await saveSession(session);
        disconnectFromTwitchChat(sessionId);
        io.to(`session:${sessionId}`).emit('room:update', session);
      } else if (playerId && session.players[playerId]) {
        console.log(`Player ${playerId} disconnected from room ${sessionId}`);
        session.players[playerId].isConnected = false;
        await saveSession(session);
        const advanced = await checkAndAdvanceSkip(io, session);
        if (!advanced) {
          io.to(`session:${sessionId}`).emit('room:update', session);
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
}
