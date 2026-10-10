// Playlist creation must not hold a database connection while waiting for YouTube / AniList.
// Postgres and the external HTTP calls are replaced by in-memory fakes.

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/db/db.js';
import { createPlaylistRecord } from '../src/services/playlistService.js';

const EXTERNAL_LATENCY_MS = 50;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const youtubeId = (i) => `vid${String(i).padStart(8, '0')}`;

let fetchesInFlight = 0;
let maxFetchesInFlight = 0;
let fetchCount = 0;
let connectionsHeld = 0;
let connectionHeldDuringFetch = false;
let unavailableVideos = new Set();
let knownVideos = new Set();
let queries = [];

before(() => {
  console.log = () => {};
  console.warn = () => {};

  globalThis.fetch = async (url) => {
    fetchCount++;
    fetchesInFlight++;
    maxFetchesInFlight = Math.max(maxFetchesInFlight, fetchesInFlight);
    if (connectionsHeld > 0) connectionHeldDuringFetch = true;
    await sleep(EXTERNAL_LATENCY_MS);
    if (connectionsHeld > 0) connectionHeldDuringFetch = true;
    fetchesInFlight--;

    const unavailable = [...unavailableVideos].some((id) => String(url).includes(id));
    return {
      ok: !unavailable,
      status: unavailable ? 404 : 200,
      json: async () => ({ title: 'Title', author_name: 'Author', data: { Media: { id: 1, idMal: 1, title: { romaji: 'Anime' } } } }),
    };
  };

  pool.query = async (sql, params) => {
    queries.push(sql);
    if (/FROM videos WHERE youtube_id = ANY/.test(sql)) {
      return { rows: params[0].filter((id) => knownVideos.has(id)).map((id) => ({ youtube_id: id })) };
    }
    return { rows: [], rowCount: 0 };
  };

  pool.connect = async () => {
    connectionsHeld++;
    return {
      query: async (sql) => {
        queries.push(sql);
        return { rows: [{ id: 1 }], rowCount: 1 };
      },
      release: () => {
        connectionsHeld--;
      },
    };
  };
});

beforeEach(() => {
  fetchesInFlight = 0;
  maxFetchesInFlight = 0;
  fetchCount = 0;
  connectionsHeld = 0;
  connectionHeldDuringFetch = false;
  unavailableVideos = new Set();
  knownVideos = new Set();
  queries = [];
});

const tracks = (count) =>
  Array.from({ length: count }, (_, i) => ({ title: `Track ${i + 1}`, youtubeId: youtubeId(i), artistName: 'Artist' }));

test('external checks run before the transaction, in parallel', async () => {
  const count = 40;
  const startedAt = performance.now();
  const result = await createPlaylistRecord({ name: 'Test', description: '', videos: tracks(count), categories: [] });
  const ms = performance.now() - startedAt;

  assert.equal(result.success, true);
  assert.equal(fetchCount, count);
  assert.equal(connectionHeldDuringFetch, false, 'a database connection was held during an external call');
  assert.equal(connectionsHeld, 0, 'the database connection was not released');
  assert.ok(maxFetchesInFlight > 1 && maxFetchesInFlight <= 4, `${maxFetchesInFlight} simultaneous external calls`);
  assert.ok(ms < (count * EXTERNAL_LATENCY_MS) / 2, `took ${Math.round(ms)} ms, no faster than sequential checks`);
  assert.equal(queries.filter((sql) => /INSERT INTO playlist_tracks/.test(sql)).length, count);
  assert.ok(queries.some((sql) => sql === 'COMMIT'));
});

test('videos already in the catalog and duplicates are not checked again', async () => {
  const videos = [...tracks(10), ...tracks(10)]; // each video twice
  for (let i = 0; i < 5; i++) knownVideos.add(youtubeId(i));

  await createPlaylistRecord({ name: 'Test', description: '', videos, categories: [] });

  assert.equal(fetchCount, 5, 'only the 5 unknown videos need a YouTube check, once each');
  assert.equal(queries.filter((sql) => /INSERT INTO playlist_tracks/.test(sql)).length, 20);
});

test('an unavailable video rejects the playlist without touching the database', async () => {
  unavailableVideos.add(youtubeId(7));

  await assert.rejects(
    createPlaylistRecord({ name: 'Test', description: '', videos: tracks(30), categories: [] }),
    /La vidéo de la piste 8 \("Track 8"\) n'est pas disponible sur YouTube/
  );
  assert.equal(queries.some((sql) => sql === 'BEGIN'), false, 'a transaction was opened for a rejected playlist');
  assert.equal(connectionsHeld, 0);
  assert.ok(fetchCount < 30, 'the remaining tracks were still checked after the rejection');
});

test('an invalid track is rejected before any external call', async () => {
  const videos = tracks(5);
  videos[2].youtubeId = 'not-a-youtube-id!!';

  await assert.rejects(
    createPlaylistRecord({ name: 'Test', description: '', videos, categories: [] }),
    /La piste à l'index 3 a un titre ou un lien YouTube invalide/
  );
  assert.equal(fetchCount, 0);
});

test('creating a playlist never rewrites a video that is already in the shared catalog', async () => {
  await createPlaylistRecord({ name: 'Test', description: '', videos: tracks(3), categories: [] });

  const inserts = queries.filter((sql) => /INSERT INTO videos/.test(sql));
  assert.equal(inserts.length, 3);
  for (const sql of inserts) {
    assert.equal(/EXCLUDED/.test(sql), false, 'the submitted values overwrite the existing video');
  }
});
