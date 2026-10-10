// A player id is public (broadcast in room:update): it must not be enough to act as that player

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, storedSession, redisStore, playlistVideos, dbHandlers, silenceLogs } from './helpers/socketHarness.js';

before(() => {
  silenceLogs();
  dbHandlers.push(playlistVideos(3));
});

test('joining returns a secret token that is never broadcast', async () => {
  const { host, players, tokens, sessionId } = await createRoom({ playerCount: 2 });

  assert.match(tokens[0], /^[0-9a-f]{48}$/);
  assert.notEqual(tokens[0], tokens[1]);
  assert.equal(storedSession(sessionId).players.player0.token, tokens[0]);

  for (const socket of [host, ...players]) {
    for (const update of socket.updates()) {
      assert.equal(JSON.stringify(update).includes(tokens[0]), false, 'player token leaked in room:update');
      assert.equal(JSON.stringify(update).includes(tokens[1]), false, 'player token leaked in room:update');
      assert.equal(update.hostToken, undefined);
    }
  }
});

test('another client cannot take over a player with only its id', async () => {
  const { io, host, players, sessionId } = await createRoom({ playerCount: 2 });
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  await players[0].send('game:vote', { voteValue: 5 });

  const attacker = io.connect();
  for (const playerToken of [undefined, '', 'guess', '0'.repeat(48)]) {
    const res = await attacker.send('room:join', { sessionId, playerName: 'Hacked', playerId: 'player0', playerToken });
    assert.equal(res.success, false);
    assert.equal(res.playerToken, undefined);
  }

  // The attacker is not in the room and cannot vote as the victim
  const vote = await attacker.send('game:vote', { voteValue: 1 });
  assert.equal(vote.success, false);

  const session = storedSession(sessionId);
  assert.equal(session.players.player0.name, 'Player 0');
  assert.equal(session.votes.player0, 5);
});

test('the same player can rejoin with its token (refresh, reconnection)', async () => {
  const { io, players, tokens, sessionId } = await createRoom({ playerCount: 1 });
  players[0].close();

  const back = io.connect();
  const res = await back.send('room:join', { sessionId, playerName: 'Renamed', playerId: 'player0', playerToken: tokens[0] });

  assert.equal(res.success, true);
  assert.equal(res.playerToken, tokens[0]);
  const session = storedSession(sessionId);
  assert.equal(session.players.player0.name, 'Renamed');
  assert.equal(session.players.player0.isConnected, true);
});

test('the host player cannot be taken over through room:join', async () => {
  const { io, sessionId } = await createRoom({ isHostPlayer: true });

  const attacker = io.connect();
  const res = await attacker.send('room:join', { sessionId, playerName: 'Hacked', playerId: 'host-player' });

  assert.equal(res.success, false);
  assert.equal(storedSession(sessionId).players['host-player'].name, 'Host');
});

test('players of a room created before tokens existed can still rejoin', async () => {
  const { io, players, sessionId } = await createRoom({ playerCount: 1 });
  players[0].close();

  // Simulate a session stored by the previous version: no token on the player
  const session = storedSession(sessionId);
  delete session.players.player0.token;
  redisStore.set(`session:${sessionId}`, JSON.stringify(session));

  const back = io.connect();
  const res = await back.send('room:join', { sessionId, playerName: 'Player 0', playerId: 'player0' });
  assert.equal(res.success, true);
  assert.match(res.playerToken, /^[0-9a-f]{48}$/);
});

test('a player id can never reach Object.prototype', async () => {
  const { io, host, sessionId } = await createRoom({ playerCount: 1 });

  for (const playerId of ['__proto__', 'constructor', 'prototype', 'a b', '<x>', 'x'.repeat(51)]) {
    const attacker = io.connect();
    const res = await attacker.send('room:join', { sessionId, playerName: 'pwn', playerId });
    assert.equal(res.success, false, `player id "${playerId}" was accepted`);
  }
  assert.deepEqual(Object.keys(Object.prototype), []);

  // The host id goes through the same check: an invalid one falls back to the default id
  const otherHost = io.connect();
  const created = await otherHost.send('room:create', { isHostPlayer: true, playerId: '__proto__', hostName: 'Host' });
  assert.equal(created.session.hostPlayerId, `host_${created.session.sessionId}`);
  assert.deepEqual(Object.keys(Object.prototype), []);

  // Games still start
  const start = await host.send('game:start', { playlistId: 'pl', shuffle: false });
  assert.equal(start.success, true);
});
