// Load test: massive influx of Twitch chat votes on a running game.
// Runs without Redis nor network: Redis and the Twitch WebSocket are replaced by in-memory fakes.
//
//   npm test
//   TWITCH_FLOOD_VIEWERS=20000 TWITCH_FLOOD_SOCKETS=100 npm test   (heavier scenario)

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import redisClient from '../src/store/redis.js';
import { getSession, saveSession, acquireSessionLock } from '../src/store/sessionStore.js';
import { connectToTwitchChat, disconnectFromTwitchChat, applyPendingTwitchVotes } from '../src/services/twitchService.js';

const VIEWERS = parseInt(process.env.TWITCH_FLOOD_VIEWERS, 10) || 5000;
const ROOM_SOCKETS = parseInt(process.env.TWITCH_FLOOD_SOCKETS, 10) || 30;
const VIDEOS = 200; // largest playlist allowed: worst case for the size of the session blob
const SESSION_ID = 'FLOOD1';

// --- Fakes -----------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory Redis answering on a later event-loop turn, so that unserialized writes would overlap
const redisLatency = () => new Promise((resolve) => setImmediate(resolve));
const redisStore = new Map();
let redisWrites = 0;
redisClient.get = async (key) => {
  await redisLatency();
  return redisStore.get(key) ?? null;
};
redisClient.set = async (key, value) => {
  await redisLatency();
  redisWrites++;
  redisStore.set(key, value);
  return 'OK';
};

// Fake Twitch IRC WebSocket: the test pushes chat lines through it
let twitchSocket = null;
class FakeTwitchWebSocket {
  constructor() {
    twitchSocket = this;
    setTimeout(() => this.onopen?.(), 0);
  }
  send() {}
  close() {
    setTimeout(() => this.onclose?.(), 0);
  }
  // Delivers one WebSocket frame containing one IRC line per [user, text] pair
  frame(messages) {
    const data = messages.map(([user, text]) => `:${user}!${user}@${user}.tmi.twitch.tv PRIVMSG #flood :${text}`).join('\r\n');
    return this.onmessage({ data: `${data}\r\n` });
  }
}

// Fake Socket.io server: a room full of connected sockets, counting what is broadcast to them
let emittedUpdates = 0;
let emittedBytes = 0;
function createFakeIo(socketCount) {
  const roomName = `session:${SESSION_ID}`;
  const sockets = new Map();
  for (let i = 0; i < socketCount; i++) {
    sockets.set(`socket${i}`, {
      data: { sessionId: SESSION_ID, playerId: `player${i}`, isHost: i === 0 },
      emit: (event, payload) => {
        emittedUpdates++;
        emittedBytes += JSON.stringify(payload).length;
      },
    });
  }
  return {
    sockets: { sockets, adapter: { rooms: new Map([[roomName, new Set(sockets.keys())]]) } },
    to: () => ({ emit: () => {} }),
  };
}

function createPlayingSession() {
  const players = {};
  for (let i = 0; i < ROOM_SOCKETS; i++) {
    players[`player${i}`] = { id: `player${i}`, name: `Player ${i}`, isConnected: true };
  }
  return {
    sessionId: SESSION_ID,
    hostToken: 'secret',
    status: 'PLAYING',
    phase: 'VOTING',
    playlistId: 'flood',
    currentVideoIndex: 0,
    twitchChannel: 'flood',
    players,
    votes: {},
    twitchVotes: {},
    videos: Array.from({ length: VIDEOS }, (_, i) => ({
      id: String(i + 1),
      title: `Video ${i + 1}`,
      youtubeId: `youtube${i}`.padEnd(11, 'x'),
      artistName: 'Artist',
      description: 'x'.repeat(200),
    })),
  };
}

// Sends the given messages as a burst of frames (Twitch batches several lines per frame),
// without waiting for the backend to process them
async function flood(messages, { perFrame = 20, onFrame } = {}) {
  const pending = [];
  for (let i = 0; i < messages.length; i += perFrame) {
    pending.push(twitchSocket.frame(messages.slice(i, i + perFrame)));
    if (onFrame) pending.push(onFrame(i / perFrame));
    if (i % (perFrame * 10) === 0) await sleep(0); // let the event loop breathe like real network I/O
  }
  await Promise.all(pending);
}

// Chat votes are written in batches: waits until the stored session satisfies the predicate
async function waitForSession(predicate, timeoutMs = 60000) {
  const deadline = performance.now() + timeoutMs;
  for (;;) {
    const session = await getSession(SESSION_ID);
    if (predicate(session) || performance.now() > deadline) return session;
    await sleep(20);
  }
}

// Longer than the batching delay of the service: everything received before is written after it
const settle = () => sleep(1500);

function report(label, startedAt, messageCount) {
  const ms = Math.round(performance.now() - startedAt);
  const rate = Math.round((messageCount / ms) * 1000);
  console.log(
    `    ${label}: ${messageCount} messages in ${ms} ms (${rate}/s) | redis writes: ${redisWrites}` +
      ` | room:update sent: ${emittedUpdates} (${(emittedBytes / 1024 / 1024).toFixed(1)} MB)`
  );
  return ms;
}

// --- Tests -----------------------------------------------------------------

before(() => {
  globalThis.WebSocket = FakeTwitchWebSocket;
  console.log = ((log) => (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('    ')) log(...args);
  })(console.log); // keep only this file's reports, the service logs one line per vote
});

beforeEach(async () => {
  disconnectFromTwitchChat(SESSION_ID);
  redisStore.clear();
  redisWrites = 0;
  emittedUpdates = 0;
  emittedBytes = 0;
  await saveSession(createPlayingSession());
  redisWrites = 0;
  connectToTwitchChat(createFakeIo(ROOM_SOCKETS), SESSION_ID, 'flood');
  await sleep(5);
});

test(`every vote of a ${VIEWERS}-viewer burst is counted`, async () => {
  const messages = Array.from({ length: VIEWERS }, (_, i) => [`viewer${i}`, String((i % 5) + 1)]);

  const startedAt = performance.now();
  await flood(messages);
  const session = await waitForSession((s) => Object.keys(s.twitchVotes).length >= VIEWERS);
  const ms = report('burst', startedAt, messages.length);

  assert.equal(Object.keys(session.twitchVotes).length, VIEWERS, 'some Twitch votes were lost');
  for (const i of [0, 1, 2, 3, 4, VIEWERS - 1]) {
    assert.equal(session.twitchVotes[`viewer${i}`], (i % 5) + 1);
  }
  // The streamer must see the chat votes almost live, and the room must not be flooded with updates
  assert.ok(ms < 5000, `burst took ${ms} ms to be processed`);
  assert.ok(redisWrites <= 10, `${redisWrites} Redis writes for a single burst`);
  assert.ok(emittedUpdates <= 10 * ROOM_SOCKETS, `${emittedUpdates} room:update sent for a single burst`);
});

test('spam is ignored and the last vote of each viewer wins', async () => {
  const viewers = Math.min(VIEWERS, 1000);
  const messages = [];
  for (let i = 0; i < viewers; i++) messages.push([`viewer${i}`, '1']);
  for (let i = 0; i < viewers; i++) messages.push([`viewer${i}`, 'LUL trop bien cette musique']);
  for (let i = 0; i < viewers; i++) messages.push([`viewer${i}`, '6'], [`viewer${i}`, '0'], [`viewer${i}`, '42']);
  for (let i = 0; i < viewers; i++) messages.push([`viewer${i}`, i % 2 === 0 ? '5/5' : '4 stars']);
  for (let i = 0; i < viewers; i++) messages.push([`viewer${i}`, i % 2 === 0 ? '5/5' : '4 stars']); // repeats

  const startedAt = performance.now();
  await flood(messages);
  await settle();
  report('spam + revotes', startedAt, messages.length);

  const session = await getSession(SESSION_ID);
  assert.equal(Object.keys(session.twitchVotes).length, viewers);
  for (let i = 0; i < viewers; i++) {
    assert.equal(session.twitchVotes[`viewer${i}`], i % 2 === 0 ? 5 : 4);
  }
});

test('votes sent before the host moves on never leak into the next video', async () => {
  const half = Math.min(VIEWERS, 2000) / 2;
  const firstVideoVotes = Array.from({ length: half }, (_, i) => [`early${i}`, '5']);
  const secondVideoVotes = Array.from({ length: half }, (_, i) => [`late${i}`, '1']);
  let countedForFirstVideo = null;
  let roundClosed;
  const roundClosedPromise = new Promise((resolve) => {
    roundClosed = resolve;
  });

  // Same sequence as game:next
  const nextVideo = async () => {
    const release = await acquireSessionLock(SESSION_ID);
    try {
      const session = await getSession(SESSION_ID);
      applyPendingTwitchVotes(session);
      countedForFirstVideo = Object.keys(session.twitchVotes).length;
      roundClosed();
      await sleep(20); // game:next writes the ratings to Postgres before saving
      session.currentVideoIndex++;
      session.twitchVotes = {};
      await saveSession(session);
    } finally {
      release();
    }
  };

  // The host clicks "next" right after the last votes of the first video, before any batch is written.
  // The next votes arrive while game:next is still running: they belong to the second video.
  await flood(firstVideoVotes);
  const next = nextVideo();
  await roundClosedPromise;
  await flood(secondVideoVotes);
  await next;
  await settle();

  const session = await getSession(SESSION_ID);
  assert.equal(session.currentVideoIndex, 1, 'a stale Twitch vote write brought the game back to the previous video');
  assert.equal(countedForFirstVideo, half, 'late votes of the first video were not counted in its results');
  const voters = Object.keys(session.twitchVotes);
  assert.equal(voters.length, half);
  assert.ok(voters.every((user) => user.startsWith('late')), 'votes of the previous video leaked into the new one');
});
