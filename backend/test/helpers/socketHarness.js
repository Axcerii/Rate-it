// Test harness: runs the real socket handlers against in-memory Redis / Postgres fakes,
// with fake sockets (no network). Import this file BEFORE anything else from src/.

import { EventEmitter } from 'node:events';
import redisClient from '../../src/store/redis.js';
import pool from '../../src/db/db.js';
import { onConnection } from '../../src/sockets/index.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Redis -----------------------------------------------------------------
export const redisStore = new Map();
const redisLatency = () => new Promise((resolve) => setImmediate(resolve));
redisClient.get = async (key) => {
  await redisLatency();
  return redisStore.get(key) ?? null;
};
redisClient.set = async (key, value) => {
  await redisLatency();
  redisStore.set(key, value);
  return 'OK';
};
redisClient.del = async (key) => {
  await redisLatency();
  return redisStore.delete(key) ? 1 : 0;
};

export const storedSession = (sessionId) => JSON.parse(redisStore.get(`session:${sessionId}`));

// --- Postgres --------------------------------------------------------------
// Tests push handlers: (sql, params) => result | undefined. First defined result wins.
export const dbQueries = [];
export const dbHandlers = [];
pool.query = async (sql, params) => {
  dbQueries.push({ sql, params });
  for (const handler of dbHandlers) {
    const result = handler(sql, params);
    if (result !== undefined) return result;
  }
  if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: 0, avg: 0 }], rowCount: 1 };
  return { rows: [], rowCount: 0 };
};

// Playlist of `count` videos returned to game:start
export const playlistVideos = (count) => (sql) =>
  /FROM playlist_tracks/.test(sql)
    ? {
        rows: Array.from({ length: count }, (_, i) => ({
          id: String(i + 1),
          title: `Video ${i + 1}`,
          youtubeId: `youtube${i}`.padEnd(11, 'x'),
          artistName: 'Artist',
          description: 'x'.repeat(200),
        })),
      }
    : undefined;

// --- Socket.io -------------------------------------------------------------
let nextSocketId = 1;
let nextIp = 1;

export function createIo() {
  const sockets = new Map();
  const rooms = new Map();
  const io = {
    sockets: { sockets, adapter: { rooms } },
    // io.to(room).emit(...) and io.emit(...)
    to: (room) => ({
      emit: (event, payload) => {
        for (const id of rooms.get(room) || []) sockets.get(id)?.receive(event, payload);
      },
    }),
    emit: (event, payload) => {
      for (const socket of sockets.values()) socket.receive(event, payload);
    },
  };

  // Connects a new client. Each client gets its own IP unless one is given.
  io.connect = (ip = `203.0.113.${nextIp++ % 250}`) => {
    const socket = new EventEmitter();
    socket.id = `socket${nextSocketId++}`;
    socket.data = {};
    socket.rooms = new Set();
    socket.handshake = { address: '172.18.0.1', headers: { 'x-forwarded-for': ip } };
    socket.received = []; // every event the server sent to this client: { event, payload }
    socket.receive = (event, payload) => socket.received.push({ event, payload, bytes: JSON.stringify(payload ?? null).length });
    socket.join = (room) => {
      socket.rooms.add(room);
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(socket.id);
    };
    socket.leave = (room) => {
      socket.rooms.delete(room);
      rooms.get(room)?.delete(socket.id);
    };

    // What the server emits to this socket is recorded, what the client sends goes to the handlers
    const dispatch = socket.emit.bind(socket);
    socket.emit = (event, payload) => socket.receive(event, payload);
    // Like the frontend, a session returned in an ack replaces the client state (full update)
    socket.send = (event, payload = {}) =>
      new Promise((resolve) =>
        dispatch(event, payload, (response) => {
          if (response?.session) socket.receive('room:update', response.session);
          resolve(response);
        })
      );
    socket.close = () => {
      dispatch('disconnect', 'transport close');
      for (const room of [...socket.rooms]) socket.leave(room);
      sockets.delete(socket.id);
    };
    socket.updates = () => socket.received.filter((m) => m.event === 'room:update').map((m) => m.payload);
    socket.lastUpdate = () => socket.updates().at(-1);

    sockets.set(socket.id, socket);
    onConnection(io, socket);
    return socket;
  };

  return io;
}

// Creates a room with `playerCount` joined players. Returns { io, host, players, sessionId, hostToken, tokens }
export async function createRoom({ playerCount = 0, isHostPlayer = false } = {}) {
  const io = createIo();
  const host = io.connect();
  const created = await host.send('room:create', { isHostPlayer, playerId: 'host-player', hostName: 'Host' });
  const sessionId = created.session.sessionId;

  const players = [];
  const tokens = [];
  for (let i = 0; i < playerCount; i++) {
    const player = io.connect();
    const joined = await player.send('room:join', { sessionId, playerName: `Player ${i}`, playerId: `player${i}` });
    players.push(player);
    tokens.push(joined.playerToken);
  }
  return { io, host, players, sessionId, hostToken: created.hostToken, tokens };
}

export function silenceLogs() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
