import { getSession, saveSession, deleteSession } from '../store/sessionStore.js';
import { disconnectFromTwitchChat } from '../services/twitchService.js';
import { checkAndAdvanceSkip } from './gameHandler.js';
import {
  sanitizeText,
  validateRoomCode,
  generateSecureToken,
  safeTimingCompare,
  broadcastRoomUpdate,
  sanitizeSessionForSocket,
} from '../utils/security.js';

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
  socket.on('room:create', async (payload = {}, callback) => {
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
        throw new Error('Impossible de générer un code de salle unique');
      }

      const isHostPlayer = payload.isHostPlayer !== false; // default true
      const hostPlayerId = sanitizeText(payload.playerId, 50) || `host_${code}`;
      const hostName = sanitizeText(payload.hostName, 50) || 'Hôte';
      const hostToken = generateSecureToken(32);

      const session = {
        sessionId: code,
        hostSocketId: socket.id,
        hostPlayerId: hostPlayerId,
        hostToken: hostToken,
        isHostPlayer: isHostPlayer,
        status: 'LOBBY',
        playlistId: '',
        currentVideoIndex: 0,
        players: {},
        votes: {},
      };

      if (isHostPlayer) {
        session.players[hostPlayerId] = {
          id: hostPlayerId,
          name: hostName,
          isConnected: true,
          isHost: true,
        };
      }

      await saveSession(session);

      socket.data.sessionId = code;
      socket.data.isHost = true;
      socket.data.playerId = hostPlayerId;
      socket.join(`session:${code}`);

      console.log(`Room created: ${code} by Host ${socket.id} (isHostPlayer: ${isHostPlayer})`);

      if (typeof callback === 'function') {
        // Return hostToken exclusively to the room creator in direct callback
        callback({
          success: true,
          session: sanitizeSessionForSocket(session, socket.data),
          hostToken,
        });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Host reconnects to room
  socket.on('room:reconnect_host', async (payload = {}, callback) => {
    try {
      const formattedCode = validateRoomCode(payload.sessionId);
      if (!formattedCode) {
        throw new Error('Code de salle invalide');
      }

      const session = await getSession(formattedCode);

      if (!session) {
        throw new Error('Salle introuvable');
      }

      // Verify host token to prevent unauthorized host session hijacking
      const providedHostToken = payload.hostToken;
      if (!providedHostToken || !session.hostToken || !safeTimingCompare(String(providedHostToken), String(session.hostToken))) {
        throw new Error('Authentification de l\'hôte échouée (token invalide ou manquant)');
      }

      const hostPlayerId = session.hostPlayerId || payload.playerId || `host_${formattedCode}`;
      session.hostSocketId = socket.id;
      session.hostPlayerId = hostPlayerId;

      if (session.isHostPlayer) {
        session.players = session.players || {};
        if (session.players[hostPlayerId]) {
          session.players[hostPlayerId].isConnected = true;
        } else {
          session.players[hostPlayerId] = {
            id: hostPlayerId,
            name: payload.hostName || 'Hôte',
            isConnected: true,
            isHost: true,
          };
        }
      }

      await saveSession(session);

      socket.data.sessionId = formattedCode;
      socket.data.isHost = true;
      socket.data.playerId = hostPlayerId;
      socket.join(`session:${formattedCode}`);

      console.log(`Host ${socket.id} securely reconnected to room ${formattedCode}`);

      if (typeof callback === 'function') {
        callback({
          success: true,
          session: sanitizeSessionForSocket(session, socket.data),
        });
      }

      broadcastRoomUpdate(io, session);
    } catch (error) {
      console.error('Error reconnecting host:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Host toggles host player setting in lobby
  socket.on('room:toggle_host_player', async ({ isHostPlayer, hostName }, callback) => {
    try {
      const { sessionId, isHost } = socket.data;
      if (!sessionId || !isHost) {
        throw new Error('Non autorisé');
      }

      const session = await getSession(sessionId);
      if (!session) {
        throw new Error('Session introuvable');
      }

      const hostPlayerId = session.hostPlayerId || `host_${sessionId}`;
      session.isHostPlayer = !!isHostPlayer;
      session.hostPlayerId = hostPlayerId;

      const cleanHostName = sanitizeText(hostName, 50);
      if (isHostPlayer) {
        session.players[hostPlayerId] = {
          id: hostPlayerId,
          name: cleanHostName || session.players[hostPlayerId]?.name || 'Hôte',
          isConnected: true,
          isHost: true,
        };
      } else {
        delete session.players[hostPlayerId];
        delete session.votes[hostPlayerId];
        if (session.skips) delete session.skips[hostPlayerId];
        if (session.revealSkips) delete session.revealSkips[hostPlayerId];
      }

      await saveSession(session);
      broadcastRoomUpdate(io, session);

      if (typeof callback === 'function') {
        callback({
          success: true,
          session: sanitizeSessionForSocket(session, socket.data),
        });
      }
    } catch (error) {
      console.error('Error toggling host player:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Player joins a room
  socket.on('room:join', async ({ sessionId, playerName, playerId }, callback) => {
    try {
      const formattedCode = validateRoomCode(sessionId);
      if (!formattedCode) {
        throw new Error('Code de salle invalide');
      }

      const cleanPlayerName = sanitizeText(playerName, 50);
      const cleanPlayerId = sanitizeText(playerId, 50);
      if (!cleanPlayerName || !cleanPlayerId) {
        throw new Error('Pseudonyme ou ID joueur invalide');
      }

      const session = await getSession(formattedCode);

      if (!session) {
        throw new Error('Salle introuvable');
      }

      // Update session state with player info
      if (session.players[cleanPlayerId]) {
        session.players[cleanPlayerId].isConnected = true;
        session.players[cleanPlayerId].name = cleanPlayerName;
      } else {
        session.players[cleanPlayerId] = {
          id: cleanPlayerId,
          name: cleanPlayerName,
          isConnected: true,
        };
      }

      await saveSession(session);

      socket.data.sessionId = formattedCode;
      socket.data.playerId = cleanPlayerId;
      socket.data.isHost = false;
      socket.join(`session:${formattedCode}`);

      console.log(`Player ${cleanPlayerName} (${cleanPlayerId}) joined room ${formattedCode}`);

      // Notify player they successfully joined with sanitized view
      if (typeof callback === 'function') {
        callback({
          success: true,
          session: sanitizeSessionForSocket(session, socket.data),
        });
      }

      // Broadcast updated session state to all clients in the room
      broadcastRoomUpdate(io, session);
    } catch (error) {
      console.error('Error joining room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Host deletes a room session
  socket.on('room:delete', async (payload, callback) => {
    try {
      const { sessionId, isHost } = socket.data;

      if (!sessionId || !isHost) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Non autorisé : seul l\'hôte peut supprimer la salle' });
        }
        return;
      }
      disconnectFromTwitchChat(sessionId);
      await deleteSession(sessionId);

      // Broadcast to all clients in the room session that it was deleted
      io.to(`session:${sessionId}`).emit('room:deleted');
      console.log(`Room ${sessionId} deleted by host ${socket.id} - socket disconnected properly`);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle disconnection cleanup
  socket.on('disconnect', async (reason) => {
    const { sessionId, playerId, isHost } = socket.data;

    if (!sessionId) {
      console.log(`Socket ${socket.id} disconnected (reason: ${reason})`);
      return;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) return;

      if (isHost) {
        console.log(`Host ${socket.id} disconnected properly from room ${sessionId} (reason: ${reason})`);
        session.hostSocketId = null;
        await saveSession(session);
        disconnectFromTwitchChat(sessionId);
        broadcastRoomUpdate(io, session);
      } else if (playerId && session.players[playerId]) {
        console.log(`Player ${playerId} disconnected properly from room ${sessionId} (reason: ${reason})`);
        session.players[playerId].isConnected = false;
        await saveSession(session);
        const advanced = await checkAndAdvanceSkip(io, session);
        if (!advanced) {
          broadcastRoomUpdate(io, session);
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
}
