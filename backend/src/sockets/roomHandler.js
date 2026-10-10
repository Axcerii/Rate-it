import { getSession, saveSession, deleteSession, acquireSessionLock } from '../store/sessionStore.js';
import { connectToTwitchChat, disconnectFromTwitchChat, isTwitchChatActive } from '../services/twitchService.js';
import { checkAndAdvanceSkip } from './gameHandler.js';
import {
  sanitizeText,
  validateRoomCode,
  validatePlayerId,
  generateSecureToken,
  safeTimingCompare,
  broadcastRoomUpdate,
  sanitizeSessionForSocket,
} from '../utils/security.js';

// Every player receives the whole room state on each update: an unbounded room would take the backend down
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS_PER_ROOM, 10) || 100;

// A socket that creates or joins another room must stop receiving the events of the previous one
function joinSessionRoom(socket, sessionId) {
  const roomName = `session:${sessionId}`;
  for (const room of socket.rooms) {
    if (room.startsWith('session:') && room !== roomName) socket.leave(room);
  }
  socket.join(roomName);
}

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
      const hostPlayerId = validatePlayerId(payload.playerId) || `host_${code}`;
      const hostName = sanitizeText(payload.hostName, 50) || 'HOST';
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
      joinSessionRoom(socket, code);

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
    let release;
    try {
      const formattedCode = validateRoomCode(payload.sessionId);
      if (!formattedCode) {
        throw new Error('Code de salle invalide');
      }

      release = await acquireSessionLock(formattedCode);
      const session = await getSession(formattedCode);

      if (!session) {
        throw new Error('Salle introuvable');
      }

      // Verify host token to prevent unauthorized host session hijacking
      const providedHostToken = payload.hostToken;
      if (!providedHostToken || !session.hostToken || !safeTimingCompare(String(providedHostToken), String(session.hostToken))) {
        throw new Error('Authentification de l\'hôte échouée (token invalide ou manquant)');
      }

      const hostPlayerId = session.hostPlayerId || validatePlayerId(payload.playerId) || `host_${formattedCode}`;
      session.hostSocketId = socket.id;
      session.hostPlayerId = hostPlayerId;

      if (session.isHostPlayer) {
        session.players = session.players || {};
        if (session.players[hostPlayerId]) {
          session.players[hostPlayerId].isConnected = true;
          if (payload.hostName) {
            session.players[hostPlayerId].name = sanitizeText(payload.hostName, 50);
          }
        } else {
          session.players[hostPlayerId] = {
            id: hostPlayerId,
            name: sanitizeText(payload.hostName, 50) || 'HOST',
            isConnected: true,
            isHost: true,
          };
        }
      }

      await saveSession(session);

      socket.data.sessionId = formattedCode;
      socket.data.isHost = true;
      socket.data.playerId = hostPlayerId;
      joinSessionRoom(socket, formattedCode);

      console.log(`Host ${socket.id} securely reconnected to room ${formattedCode}`);

      // The Twitch link is closed when the host socket drops (refresh, network blip): restore it
      if (session.twitchChannel && !isTwitchChatActive(formattedCode)) {
        connectToTwitchChat(io, formattedCode, session.twitchChannel);
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          session: sanitizeSessionForSocket(session, socket.data),
        });
      }

      broadcastRoomUpdate(io, session, { light: true });
    } catch (error) {
      console.error('Error reconnecting host:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    } finally {
      release?.();
    }
  });

  // Host toggles host player setting in lobby
  socket.on('room:toggle_host_player', async ({ isHostPlayer, hostName }, callback) => {
    let release;
    try {
      const { sessionId, isHost } = socket.data;
      if (!sessionId || !isHost) {
        throw new Error('Non autorisé');
      }

      release = await acquireSessionLock(sessionId);
      const session = await getSession(sessionId);
      if (!session) {
        throw new Error('Session introuvable');
      }

      const hostPlayerId = session.hostPlayerId || `host_${sessionId}`;
      session.isHostPlayer = !!isHostPlayer;
      session.hostPlayerId = hostPlayerId;
      socket.data.playerId = hostPlayerId;

      const cleanHostName = sanitizeText(hostName, 50);
      if (isHostPlayer) {
        session.players[hostPlayerId] = {
          id: hostPlayerId,
          name: cleanHostName || session.players[hostPlayerId]?.name || 'HOST',
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
      broadcastRoomUpdate(io, session, { light: true });

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
    } finally {
      release?.();
    }
  });

  // Player joins a room
  socket.on('room:join', async ({ sessionId, playerName, playerId, playerToken }, callback) => {
    let release;
    try {
      const formattedCode = validateRoomCode(sessionId);
      if (!formattedCode) {
        throw new Error('Code de salle invalide');
      }

      const cleanPlayerName = sanitizeText(playerName, 50);
      const cleanPlayerId = validatePlayerId(playerId);
      if (!cleanPlayerName || !cleanPlayerId) {
        throw new Error('Pseudonyme ou ID joueur invalide');
      }

      release = await acquireSessionLock(formattedCode);
      const session = await getSession(formattedCode);

      if (!session) {
        throw new Error('Salle introuvable');
      }

      // Player ids are visible to everyone in the room (room:update): knowing one must not be enough
      // to take over that player. The host player can only come back through room:reconnect_host.
      const existingPlayer = Object.hasOwn(session.players, cleanPlayerId) ? session.players[cleanPlayerId] : null;
      if (cleanPlayerId === session.hostPlayerId || existingPlayer?.isHost) {
        throw new Error("Cet identifiant est réservé à l'hôte de la salle.");
      }

      // Update session state with player info
      if (existingPlayer) {
        if (existingPlayer.token && !safeTimingCompare(String(playerToken || ''), existingPlayer.token)) {
          throw new Error('Ce joueur est déjà présent dans la salle depuis un autre appareil.');
        }
        // Players of a room created before tokens existed get theirs on their next join
        existingPlayer.token = existingPlayer.token || generateSecureToken(24);
        existingPlayer.isConnected = true;
        existingPlayer.name = cleanPlayerName;
      } else {
        if (Object.keys(session.players).length >= MAX_PLAYERS_PER_ROOM) {
          throw new Error(`Cette salle est complète (${MAX_PLAYERS_PER_ROOM} joueurs maximum).`);
        }
        session.players[cleanPlayerId] = {
          id: cleanPlayerId,
          name: cleanPlayerName,
          isConnected: true,
          token: generateSecureToken(24),
        };
      }

      await saveSession(session);

      socket.data.sessionId = formattedCode;
      socket.data.playerId = cleanPlayerId;
      socket.data.isHost = false;
      joinSessionRoom(socket, formattedCode);

      console.log(`Player ${cleanPlayerName} (${cleanPlayerId}) joined room ${formattedCode}`);

      // Notify player they successfully joined with sanitized view.
      // playerToken is returned to this player only: it is required to rejoin as the same player.
      if (typeof callback === 'function') {
        callback({
          success: true,
          session: sanitizeSessionForSocket(session, socket.data),
          playerToken: session.players[cleanPlayerId].token,
        });
      }

      // Broadcast updated session state to all clients in the room
      broadcastRoomUpdate(io, session, { light: true });
    } catch (error) {
      console.error('Error joining room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    } finally {
      release?.();
    }
  });

  // Host deletes a room session
  socket.on('room:delete', async (payload, callback) => {
    let release;
    try {
      const { sessionId, isHost } = socket.data;

      if (!sessionId || !isHost) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Non autorisé : seul l\'hôte peut supprimer la salle' });
        }
        return;
      }
      release = await acquireSessionLock(sessionId);
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
    } finally {
      release?.();
    }
  });

  // Handle disconnection cleanup
  socket.on('disconnect', async (reason) => {
    const { sessionId, playerId, isHost } = socket.data;

    if (!sessionId) {
      console.log(`Socket ${socket.id} disconnected (reason: ${reason})`);
      return;
    }

    let release;
    try {
      release = await acquireSessionLock(sessionId);
      const session = await getSession(sessionId);
      if (!session) return;

      if (isHost) {
        console.log(`Host ${socket.id} disconnected properly from room ${sessionId} (reason: ${reason})`);
        session.hostSocketId = null;
        await saveSession(session);
        disconnectFromTwitchChat(sessionId);
        broadcastRoomUpdate(io, session, { light: true });
      } else if (playerId && session.players[playerId]) {
        console.log(`Player ${playerId} disconnected properly from room ${sessionId} (reason: ${reason})`);
        session.players[playerId].isConnected = false;
        await saveSession(session);
        const advanced = await checkAndAdvanceSkip(io, session);
        if (!advanced) {
          broadcastRoomUpdate(io, session, { light: true });
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    } finally {
      release?.();
    }
  });
}
