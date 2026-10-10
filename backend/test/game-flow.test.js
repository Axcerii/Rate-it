// Functional regressions on the game flow and admin actions

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, createIo, storedSession, redisStore, playlistVideos, dbHandlers, dbQueries, silenceLogs } from './helpers/socketHarness.js';
import redisClient from '../src/store/redis.js';

const ADMIN_PASSWORD = 'admin-test-password';

// Rating writes sent to Postgres: [{ names, ratings, sources }]
const ratingWrites = () =>
  dbQueries
    .filter((q) => /INSERT INTO ratings/.test(q.sql))
    .map((q) => ({ names: q.params[4], ratings: q.params[5], sources: q.params[6] }));

before(() => {
  silenceLogs();
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  dbHandlers.push(playlistVideos(3));
});

beforeEach(() => {
  dbQueries.length = 0;
});

test('ratings are stored once per round when nothing changes', async () => {
  const { host, players } = await createRoom({ playerCount: 2 });
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  await players[0].send('game:vote', { voteValue: 5 });
  await players[1].send('game:vote', { voteValue: 3 });

  await host.send('game:show_results');
  await host.send('game:next');

  assert.deepEqual(ratingWrites(), [{ names: ['Player 0', 'Player 1'], ratings: [5, 3], sources: ['PLAYER', 'PLAYER'] }]);
});

test('a vote changed during the reveal replaces the stored rating', async () => {
  const { host, players } = await createRoom({ playerCount: 2 });
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  await players[0].send('game:vote', { voteValue: 5 });
  await host.send('game:show_results');
  await players[0].send('game:vote', { voteValue: 2 });
  await host.send('game:next');

  const writes = ratingWrites();
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1].ratings, [2]);
  // Each write replaces the ratings of the round instead of adding to them
  assert.ok(dbQueries.filter((q) => /INSERT INTO ratings/.test(q.sql)).every((q) => /DELETE FROM ratings WHERE session_id/.test(q.sql)));
});

test('votes are recorded again after going back to a video', async () => {
  const { host, players, sessionId } = await createRoom({ playerCount: 2 });
  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  await players[0].send('game:vote', { voteValue: 1 });
  await host.send('game:next');

  await host.send('game:previous');
  assert.equal(storedSession(sessionId).currentVideoIndex, 0);
  await players[0].send('game:vote', { voteValue: 5 });
  await players[1].send('game:vote', { voteValue: 4 });
  await host.send('game:next');

  const writes = ratingWrites();
  assert.deepEqual(writes.at(-1), { names: ['Player 0', 'Player 1'], ratings: [5, 4], sources: ['PLAYER', 'PLAYER'] });
  assert.equal(storedSession(sessionId).results['1'].average, 4.5);
});

test('playlist:validate applies the requested state instead of toggling', async () => {
  const io = createIo();
  const admin = io.connect();

  // A double click sends the same request twice: the playlist must end up validated
  await admin.send('playlist:validate', { id: 'PL-ABC123', isValidated: true, password: ADMIN_PASSWORD });
  await admin.send('playlist:validate', { id: 'PL-ABC123', isValidated: true, password: ADMIN_PASSWORD });

  const updates = dbQueries.filter((q) => /UPDATE playlists SET is_validated/.test(q.sql));
  assert.equal(updates.length, 2);
  for (const update of updates) {
    assert.match(update.sql, /is_validated = \$2/);
    assert.deepEqual(update.params, ['PL-ABC123', true]);
  }

  await admin.send('playlist:validate', { id: 'PL-ABC123', isValidated: false, password: ADMIN_PASSWORD });
  assert.deepEqual(dbQueries.filter((q) => /UPDATE playlists SET is_validated/.test(q.sql)).at(-1).params, ['PL-ABC123', false]);
});

test('a socket joining another room stops receiving the first one', async () => {
  const first = await createRoom({ playerCount: 1 });
  const traveller = first.players[0];

  // Second room on the same server
  const otherHost = first.io.connect();
  const created = await otherHost.send('room:create', { isHostPlayer: false });
  const joined = await traveller.send('room:join', { sessionId: created.session.sessionId, playerName: 'Player 0', playerId: 'player0' });
  assert.equal(joined.success, true);

  const before = traveller.received.length;
  await first.host.send('room:delete');

  assert.equal(traveller.received.slice(before).some((m) => m.event === 'room:deleted'), false);
  assert.deepEqual([...traveller.rooms], [`session:${created.session.sessionId}`]);
});

test('admin changes on a video invalidate every cached playlist', async () => {
  // Redis cache is only used when the client is open
  Object.defineProperty(redisClient, 'isOpen', { get: () => true, configurable: true });
  redisClient.scanIterator = async function* ({ MATCH }) {
    const prefix = MATCH.replace('*', '');
    for (const key of [...redisStore.keys()]) if (key.startsWith(prefix)) yield key;
  };
  const del = redisClient.del;
  redisClient.del = async (keys) => {
    for (const key of [].concat(keys)) redisStore.delete(key);
    return 1;
  };

  try {
    redisStore.set('playlists:list:public', '{"stale":true}');
    redisStore.set('playlist:details:PL-AAA111', '{"stale":true}');
    redisStore.set('playlist:details:PL-BBB222', '{"stale":true}');
    redisStore.set('session:KEEPME', '{"sessionId":"KEEPME"}');

    const io = createIo();
    const admin = io.connect();
    const res = await admin.send('playlist:admin_delete_video_direct', { videoId: '12', password: ADMIN_PASSWORD });

    assert.equal(res.success, true, res.error);
    assert.equal(redisStore.has('playlists:list:public'), false);
    assert.equal(redisStore.has('playlist:details:PL-AAA111'), false);
    assert.equal(redisStore.has('playlist:details:PL-BBB222'), false);
    assert.equal(redisStore.has('session:KEEPME'), true, 'game sessions must not be touched');
  } finally {
    delete redisClient.isOpen;
    redisClient.del = del;
  }
});
