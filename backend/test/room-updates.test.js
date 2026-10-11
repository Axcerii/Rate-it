// room:update broadcasts: what each client sees, and how much is sent

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, storedSession, playlistVideos, dbHandlers, silenceLogs, sleep } from './helpers/socketHarness.js';
import { sanitizeSessionForSocket } from '../src/utils/security.js';
import { connectToTwitchChat, disconnectFromTwitchChat } from '../src/services/twitchService.js';

const VIDEOS = 200;
const PLAYERS = 30;

// Fake Twitch socket, to push chat votes into a room
let twitchSocket = null;
class FakeTwitchWebSocket {
  constructor() {
    twitchSocket = this;
  }
  send() {}
  close() {}
  chat(user, text) {
    return this.onmessage({ data: `:${user}!${user}@${user}.tmi.twitch.tv PRIVMSG #chan :${text}\r\n` });
  }
}

// Same merge as the frontend (useSocket.tsx, onRoomUpdate)
function clientState(socket) {
  let state = null;
  for (const update of socket.updates()) {
    if (!update.partial) {
      state = update;
    } else if (state && state.sessionId === update.sessionId) {
      const { partial, ...changes } = update;
      state = { ...state, ...changes };
    }
  }
  return state;
}

const bytesSince = (sockets, marks) => sockets.reduce((sum, s, i) => sum + s.received.slice(marks[i]).reduce((a, m) => a + m.bytes, 0), 0);
const mark = (sockets) => sockets.map((s) => s.received.length);

before(() => {
  silenceLogs();
  globalThis.WebSocket = FakeTwitchWebSocket;
  dbHandlers.push(playlistVideos(VIDEOS));
});

test('a vote only sends a light update, without the video list', async () => {
  const { host, players } = await createRoom({ playerCount: PLAYERS });
  const everyone = [host, ...players];
  const started = await host.send('game:start', { playlistId: 'pl', shuffle: false });
  const fullSize = JSON.stringify(started.session).length;

  const marks = mark(everyone);
  await players[0].send('game:vote', { voteValue: 4 });

  const sent = bytesSince(everyone, marks);
  const update = players[1].lastUpdate();
  assert.equal(update.partial, true);
  assert.equal(update.videos, undefined);
  assert.equal(update.results, undefined);
  assert.equal(update.players.player0.vote, null, "another player's vote must stay hidden");
  assert.ok(sent < (fullSize * everyone.length) / 5, `${sent} bytes sent for one vote (full state x ${everyone.length} = ${fullSize * everyone.length})`);
});

test('votes stay hidden from other players during the voting phase', async () => {
  const { host, players } = await createRoom({ playerCount: 3 });
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  await players[0].send('game:vote', { voteValue: 5 });
  await players[1].send('game:vote', { voteValue: 2 });

  const own = players[0].lastUpdate();
  assert.deepEqual(own.votes, { player0: 5 });
  assert.equal(own.players.player0.vote, 5);
  assert.equal(own.players.player1.vote, null);

  const spectator = players[2].lastUpdate();
  assert.deepEqual(spectator.votes, {});
  assert.equal(spectator.players.player0.vote, null);

  const hostView = host.lastUpdate();
  assert.deepEqual(hostView.votes, { player0: 5, player1: 2 });

  // Once the results are shown, everybody sees every vote
  await host.send('game:show_results');
  assert.deepEqual(players[2].lastUpdate().votes, { player0: 5, player1: 2 });
  assert.equal(players[2].lastUpdate().partial, undefined);
});

test('server-only and host-only data never reach the players', async () => {
  const { io, host, players, sessionId, tokens, hostToken } = await createRoom({ playerCount: 2 });
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  connectToTwitchChat(io, sessionId, 'chan');
  await twitchSocket.chat('viewer1', '5');
  await sleep(700);
  await host.send('game:show_results');
  await host.send('game:next');
  disconnectFromTwitchChat(sessionId);

  assert.ok(storedSession(sessionId).savedRatingsMap, 'test setup: ratings should have been recorded');

  for (const socket of [host, ...players]) {
    const everything = JSON.stringify(socket.received);
    assert.equal(everything.includes('savedRatingsMap'), false);
    assert.equal(everything.includes(hostToken), false);
    for (const token of tokens) assert.equal(everything.includes(token), false);
  }
  for (const player of players) {
    assert.equal(JSON.stringify(player.received).includes('viewer1'), false, 'per-viewer Twitch votes sent to a player');
  }
  // The host still gets the live Twitch votes, and players the aggregated result
  assert.ok(host.updates().some((u) => u.twitchVotes?.viewer1 === 5));
  assert.equal(players[0].lastUpdate().results['1'].twitchVotesCount, 1);
});

test('chat votes sent in the lobby reach the host as a connection check, and never count in the game', async () => {
  const { io, host, players, sessionId } = await createRoom({ playerCount: 1 });
  await host.send('twitch:connect', { channelName: 'chan' });
  await twitchSocket.chat('viewer1', '5');
  await twitchSocket.chat('viewer2', '3');
  await sleep(700);

  assert.deepEqual(host.lastUpdate().twitchVotes, { viewer1: 5, viewer2: 3 });
  assert.equal(JSON.stringify(players[0].received).includes('viewer1'), false, 'per-viewer Twitch votes sent to a player');

  // A vote still buffered when the game starts must not be counted for the first video either
  await twitchSocket.chat('viewer3', '1');
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  await sleep(700);
  assert.deepEqual(storedSession(sessionId).twitchVotes, {});

  await host.send('game:show_results');
  assert.equal(host.lastUpdate().results['1'].twitchVotesCount, 0);
  disconnectFromTwitchChat(sessionId);
});

test('light updates applied by the client always add up to the full state', async () => {
  const { io, host, players, sessionId } = await createRoom({ playerCount: 5, isHostPlayer: true });
  const everyone = [host, ...players];

  // Each step is a client action; after each one, every client must hold exactly the state
  // the server would send it in full
  const steps = [
    () => host.send('playlist:set_disabled_videos', { disabledVideoIds: { 3: true, 4: true } }),
    () => host.send('playlist:toggle_video', { videoId: '4' }),
    () => host.send('twitch:connect', { channelName: 'chan' }),
    () => host.send('game:start', { playlistId: 'pl', shuffle: false }),
    () => players[0].send('game:vote', { voteValue: 5 }),
    () => players[1].send('game:vote', { voteValue: 1 }),
    () => host.send('game:vote', { voteValue: 3 }),
    async () => {
      await twitchSocket.chat('viewer1', '4');
      await twitchSocket.chat('viewer2', '2');
      await sleep(700);
    },
    () => players[2].send('game:player_skip'),
    () => host.send('game:show_results'),
    () => players[3].send('game:vote', { voteValue: 2 }), // vote during the reveal: results change
    () => players[0].send('game:player_skip'),
    () => host.send('game:next'),
    () => players[4].send('game:vote', { voteValue: 4 }),
    () => players[1].close(),
    () => host.send('room:toggle_host_player', { isHostPlayer: false }),
    () => host.send('game:previous'),
    () => host.send('twitch:disconnect'),
    () => host.send('game:next'),
    () => host.send('game:next'),
  ];

  for (const [index, step] of steps.entries()) {
    await step();
    const session = storedSession(sessionId);
    for (const socket of everyone) {
      if (!io.sockets.sockets.has(socket.id)) continue; // disconnected client
      const expected = JSON.parse(JSON.stringify(sanitizeSessionForSocket(session, socket.data)));
      const actual = JSON.parse(JSON.stringify(clientState(socket)));
      assert.deepEqual(actual, expected, `client state diverged after step ${index + 1} for ${socket.data.playerId}`);
    }
  }
});
