// gameHandler / voteHandler: permissions, vote validation, results and automatic progression

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, storedSession, playlistVideos, dbHandlers, silenceLogs } from './helpers/socketHarness.js';

const VIDEO_COUNT = 3;

before(() => {
  silenceLogs();
  dbHandlers.push(playlistVideos(VIDEO_COUNT));
  // Historical stats returned for every video once its ratings are recorded
  dbHandlers.push((sql) => (/COUNT\(\*\)::int as count/.test(sql) ? { rows: [{ count: 12, avg: '3.456' }] } : undefined));
});

async function startedRoom(options) {
  const room = await createRoom(options);
  const started = await room.host.send('game:start', { playlistId: 'pl', shuffle: false });
  assert.equal(started.success, true, started.error);
  return room;
}

test('game:start loads the playlist and resets the round', async () => {
  const { host, sessionId } = await createRoom({ playerCount: 2 });
  await host.send('playlist:set_disabled_videos', { disabledVideoIds: { 2: true } });

  const started = await host.send('game:start', { playlistId: 'pl', shuffle: false });

  assert.equal(started.success, true);
  const session = storedSession(sessionId);
  assert.equal(session.status, 'PLAYING');
  assert.equal(session.phase, 'VOTING');
  assert.equal(session.currentVideoIndex, 0);
  assert.deepEqual(session.videos.map((v) => v.id), ['1', '3'], 'disabled videos must be left out');
  assert.deepEqual(session.votes, {});
});

test('game:start fails without a playlist or when every video is disabled', async () => {
  const { host, sessionId } = await createRoom();

  const noPlaylist = await host.send('game:start', {});
  assert.equal(noPlaylist.success, false);

  await host.send('playlist:set_disabled_videos', { disabledVideoIds: { 1: true, 2: true, 3: true } });
  const allDisabled = await host.send('game:start', { playlistId: 'pl' });
  assert.equal(allDisabled.success, false);
  assert.equal(storedSession(sessionId).status, 'LOBBY');
});

test('only the host can drive the game', async () => {
  const { players, sessionId } = await startedRoom({ playerCount: 1 });

  for (const event of ['game:start', 'game:show_results', 'game:next', 'game:previous', 'room:delete', 'twitch:connect']) {
    const res = await players[0].send(event, { playlistId: 'pl', channelName: 'chan' });
    assert.equal(res.success, false, `${event} accepted from a player`);
  }

  const session = storedSession(sessionId);
  assert.equal(session.currentVideoIndex, 0);
  assert.equal(session.phase, 'VOTING');
});

test('a client outside any room cannot play', async () => {
  const { io } = await startedRoom();
  const stranger = io.connect();

  for (const event of ['game:vote', 'game:player_skip', 'game:next', 'game:start']) {
    const res = await stranger.send(event, { voteValue: 5 });
    assert.equal(res.success, false, `${event} accepted from a client outside the room`);
  }
});

test('only whole ratings from 1 to 5 are accepted', async () => {
  const { players, sessionId } = await startedRoom({ playerCount: 1 });

  for (const voteValue of [0, 6, -1, 2.5, 'abc', null, undefined, {}, [], '', 1e9, NaN]) {
    const res = await players[0].send('game:vote', { voteValue });
    assert.equal(res.success, false, `vote ${JSON.stringify(voteValue)} accepted`);
  }
  assert.deepEqual(storedSession(sessionId).votes, {});

  for (const voteValue of [1, 2, 3, 4, 5]) {
    const res = await players[0].send('game:vote', { voteValue });
    assert.equal(res.success, true);
    assert.equal(res.vote, voteValue);
  }
  // Voting again replaces the previous vote
  assert.deepEqual(storedSession(sessionId).votes, { player0: 5 });
});

test('votes are refused outside of a running game', async () => {
  const { host, players, sessionId } = await createRoom({ playerCount: 1 });

  const inLobby = await players[0].send('game:vote', { voteValue: 5 });
  assert.equal(inLobby.success, false);

  await host.send('game:start', { playlistId: 'pl', shuffle: false });
  for (let i = 0; i < VIDEO_COUNT; i++) await host.send('game:next');
  assert.equal(storedSession(sessionId).status, 'LEADERBOARD');

  const onLeaderboard = await players[0].send('game:vote', { voteValue: 5 });
  assert.equal(onLeaderboard.success, false);
});

test('the host votes as a player when playing, under its own id', async () => {
  const { host, sessionId } = await startedRoom({ isHostPlayer: true });

  const res = await host.send('game:vote', { voteValue: 4 });

  assert.equal(res.success, true);
  assert.deepEqual(storedSession(sessionId).votes, { 'host-player': 4 });
});

test('results: averages, vote counts and historical stats', async () => {
  const { host, players, sessionId } = await startedRoom({ playerCount: 3 });
  await players[0].send('game:vote', { voteValue: 5 });
  await players[1].send('game:vote', { voteValue: 4 });
  await players[2].send('game:vote', { voteValue: 2 });

  const res = await host.send('game:show_results');

  assert.equal(res.success, true);
  const session = storedSession(sessionId);
  assert.equal(session.phase, 'REVEAL');
  const result = session.results['1'];
  assert.equal(result.average, 3.67);
  assert.equal(result.votesCount, 3);
  assert.deepEqual(result.playerVotes, { player0: 5, player1: 4, player2: 2 });
  assert.equal(result.twitchVotesCount, 0);
  assert.equal(result.historicalAverage, 3.46);
  assert.equal(result.historicalVotesCount, 12);
});

test('a round without any vote gives an average of 0, not NaN', async () => {
  const { host, sessionId } = await startedRoom({ playerCount: 1 });
  await host.send('game:show_results');

  const result = storedSession(sessionId).results['1'];
  assert.equal(result.average, 0);
  assert.equal(result.votesCount, 0);
});

test('game:next resets the round and ends on the leaderboard', async () => {
  const { host, players, sessionId } = await startedRoom({ playerCount: 2 });
  await players[0].send('game:vote', { voteValue: 5 });
  await players[1].send('game:player_skip');

  await host.send('game:next');

  let session = storedSession(sessionId);
  assert.equal(session.currentVideoIndex, 1);
  assert.equal(session.phase, 'VOTING');
  assert.deepEqual(session.votes, {});
  assert.deepEqual(session.skips, {});
  assert.equal(session.players.player0.vote, undefined);
  assert.equal(session.players.player1.hasSkipped, false);
  assert.equal(session.results['1'].average, 5, 'the round that was skipped over keeps its result');

  await host.send('game:next');
  await host.send('game:next');
  session = storedSession(sessionId);
  assert.equal(session.status, 'LEADERBOARD');
  assert.equal(Object.keys(session.results).length, VIDEO_COUNT);
});

test('game:previous goes back one video and never below the first', async () => {
  const { host, sessionId } = await startedRoom({ playerCount: 1 });

  await host.send('game:previous');
  assert.equal(storedSession(sessionId).currentVideoIndex, 0);

  await host.send('game:next');
  await host.send('game:next');
  await host.send('game:previous');
  assert.equal(storedSession(sessionId).currentVideoIndex, 1);

  // From the leaderboard, going back resumes the game on the last video
  await host.send('game:next');
  await host.send('game:next');
  assert.equal(storedSession(sessionId).status, 'LEADERBOARD');
  await host.send('game:previous');
  const session = storedSession(sessionId);
  assert.equal(session.status, 'PLAYING');
  assert.equal(session.currentVideoIndex, VIDEO_COUNT - 1);
});

test('when every connected player skips, the game moves on by itself', async () => {
  const { players, sessionId } = await startedRoom({ playerCount: 3 });
  await players[0].send('game:vote', { voteValue: 4 });

  await players[0].send('game:player_skip');
  await players[1].send('game:player_skip');
  assert.equal(storedSession(sessionId).phase, 'VOTING', 'one player has not skipped yet');

  await players[2].send('game:player_skip');
  let session = storedSession(sessionId);
  assert.equal(session.phase, 'REVEAL');
  assert.equal(session.results['1'].average, 4);

  // Same rule to leave the results screen
  for (const player of players) await player.send('game:player_skip');
  session = storedSession(sessionId);
  assert.equal(session.currentVideoIndex, 1);
  assert.equal(session.phase, 'VOTING');
});

test('skipping twice cancels the skip', async () => {
  const { players, sessionId } = await startedRoom({ playerCount: 2 });

  const first = await players[0].send('game:player_skip');
  const second = await players[0].send('game:player_skip');

  assert.equal(first.hasSkipped, true);
  assert.equal(second.hasSkipped, false);
  assert.equal(storedSession(sessionId).players.player0.hasSkipped, false);
});

test('a player who leaves no longer blocks the automatic skip', async () => {
  const { players, sessionId } = await startedRoom({ playerCount: 3 });
  await players[0].send('game:player_skip');
  await players[1].send('game:player_skip');
  assert.equal(storedSession(sessionId).phase, 'VOTING');

  players[2].close();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const session = storedSession(sessionId);
  assert.equal(session.players.player2.isConnected, false);
  assert.equal(session.phase, 'REVEAL');
});
