// Socket event rate limiting (per client IP)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { consumeRateLimit } from '../src/utils/rateLimiter.js';
import { installSafeHandlers } from '../src/utils/safeHandler.js';

// Minimal socket as seen behind the reverse proxy
function createSocket(ip) {
  const socket = new EventEmitter();
  socket.id = `socket-${Math.random()}`;
  socket.handshake = { address: '172.18.0.1', headers: { 'x-forwarded-for': ip } };
  installSafeHandlers(socket);
  return socket;
}

// Emits a client event and resolves with the ack payload
const send = (socket, event, payload = {}) => new Promise((resolve) => socket.emit(event, payload, resolve));

test('token bucket: burst up to capacity, then refill over time', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const limit = { capacity: 3, refillPerSec: 1 };

  assert.deepEqual([1, 2, 3, 4].map(() => consumeRateLimit('bucket-test', 'a', limit)), [true, true, true, false]);
  assert.equal(consumeRateLimit('bucket-test', 'b', limit), true, 'another client has its own budget');

  t.mock.timers.tick(2000);
  assert.deepEqual([1, 2, 3].map(() => consumeRateLimit('bucket-test', 'a', limit)), [true, true, false]);
});

test('room:create is limited per IP, whatever the number of sockets', async () => {
  let created = 0;
  const register = (socket) => socket.on('room:create', async (payload, callback) => {
    created++;
    callback({ success: true });
  });

  const results = [];
  for (let i = 0; i < 30; i++) {
    const socket = createSocket('198.51.100.1'); // a new socket for each attempt
    register(socket);
    results.push(await send(socket, 'room:create'));
  }

  assert.equal(created, 20);
  assert.equal(results.filter((r) => r.success).length, 20);
  assert.match(results.at(-1).error, /Trop de requêtes/);

  // Another IP is not affected
  const other = createSocket('198.51.100.2');
  register(other);
  assert.equal((await send(other, 'room:create')).success, true);
});

test('playlist:create and playlist:update_with_secret share the same budget', async () => {
  const socket = createSocket('198.51.100.3');
  let handled = 0;
  for (const event of ['playlist:create', 'playlist:update_with_secret']) {
    socket.on(event, async (payload, callback) => {
      handled++;
      callback({ success: true });
    });
  }

  for (let i = 0; i < 15; i++) await send(socket, 'playlist:create');
  for (let i = 0; i < 15; i++) await send(socket, 'playlist:update_with_secret');

  assert.equal(handled, 20);
});

test('a full room of players behind one IP can vote without being limited', async () => {
  const sockets = Array.from({ length: 100 }, () => createSocket('198.51.100.4'));
  let votes = 0;
  for (const socket of sockets) {
    socket.on('game:vote', async (payload, callback) => {
      votes++;
      callback({ success: true });
    });
  }

  const results = await Promise.all(sockets.map((socket) => send(socket, 'game:vote', { voteValue: 5 })));

  assert.equal(votes, 100);
  assert.ok(results.every((r) => r.success));
});

test('an event flood from one IP is cut off', async () => {
  const socket = createSocket('198.51.100.5');
  let handled = 0;
  socket.on('game:vote', async (payload, callback) => {
    handled++;
    callback({ success: true });
  });

  const results = await Promise.all(Array.from({ length: 5000 }, () => send(socket, 'game:vote', { voteValue: 5 })));

  assert.ok(handled < 300, `${handled} events handled out of 5000`);
  assert.ok(results.filter((r) => !r.success).every((r) => /Trop de requêtes/.test(r.error)));
});

test('socket lifecycle events are never rate limited', async () => {
  const socket = createSocket('198.51.100.5'); // same IP as the flood above: its budget is exhausted
  let disconnected = false;
  socket.on('disconnect', async () => {
    disconnected = true;
  });
  socket.emit('disconnect', 'transport close');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(disconnected, true);
});
