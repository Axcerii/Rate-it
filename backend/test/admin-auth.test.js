// Admin authentication: brute-force rate limit keyed on the real client IP, and session tokens

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSocketClientIp,
  verifyAdminCredential,
  createAdminSession,
  isValidAdminSession,
} from '../src/utils/security.js';

const PASSWORD = 'correct horse battery staple';

// Socket as seen behind Nginx: "X-Forwarded-For: <whatever the client sent>, <real peer address>"
const socketBehindProxy = (clientSentHeader, realIp) => ({
  id: 'socket-id',
  handshake: {
    address: '172.18.0.1', // the proxy itself
    headers: { 'x-forwarded-for': clientSentHeader ? `${clientSentHeader}, ${realIp}` : realIp },
  },
});

before(() => {
  process.env.ADMIN_PASSWORD = PASSWORD;
  console.error = () => {};
});

test('the client IP is the one appended by the proxy, not the one sent by the client', () => {
  assert.equal(getSocketClientIp(socketBehindProxy(null, '203.0.113.7')), '203.0.113.7');
  assert.equal(getSocketClientIp(socketBehindProxy('1.2.3.4', '203.0.113.7')), '203.0.113.7');
  assert.equal(getSocketClientIp(socketBehindProxy('1.2.3.4, 5.6.7.8', '203.0.113.7')), '203.0.113.7');
  assert.equal(getSocketClientIp(socketBehindProxy(null, '2001:db8::1')), '2001:db8::1');
  // No proxy (local development): falls back to the socket address
  assert.equal(getSocketClientIp({ id: 'x', handshake: { address: '127.0.0.1', headers: {} } }), '127.0.0.1');
  assert.equal(getSocketClientIp({ id: 'x', handshake: { address: '127.0.0.1', headers: { 'x-forwarded-for': 'garbage' } } }), '127.0.0.1');
});

test('rotating a forged X-Forwarded-For does not bypass the brute-force lockout', () => {
  const attackerIp = '198.51.100.23';
  const attempt = (guess, n) => {
    const socket = socketBehindProxy(`10.${n}.${n}.${n}`, attackerIp); // new fake IP for every attempt
    verifyAdminCredential(guess, getSocketClientIp(socket));
  };

  for (let n = 0; n < 5; n++) {
    assert.throws(() => attempt(`guess-${n}`, n), /invalide/);
  }
  // Locked out: even the right password is refused from this IP
  assert.throws(() => attempt(PASSWORD, 99), /Trop de tentatives/);
  // Another client is not affected
  assert.doesNotThrow(() => verifyAdminCredential(PASSWORD, '203.0.113.50'));
});

test('a session token replaces the password', () => {
  const ip = '203.0.113.60';
  assert.doesNotThrow(() => verifyAdminCredential(PASSWORD, ip));

  const token = createAdminSession();
  assert.notEqual(token, PASSWORD);
  assert.equal(isValidAdminSession(token), true);
  assert.doesNotThrow(() => verifyAdminCredential(token, ip));

  assert.equal(isValidAdminSession('adm_' + '0'.repeat(64)), false);
  assert.equal(isValidAdminSession(undefined), false);
  assert.throws(() => verifyAdminCredential('adm_' + '0'.repeat(64), ip), /invalide/);
});

test('a session token expires', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const token = createAdminSession();
  t.mock.timers.tick(11 * 60 * 60 * 1000);
  assert.equal(isValidAdminSession(token), true);
  t.mock.timers.tick(2 * 60 * 60 * 1000);
  assert.equal(isValidAdminSession(token), false);
});

test('a valid session still works while its IP is locked out by wrong guesses', () => {
  const ip = '203.0.113.70';
  const token = createAdminSession();
  for (let n = 0; n < 5; n++) {
    assert.throws(() => verifyAdminCredential(`guess-${n}`, ip));
  }
  assert.throws(() => verifyAdminCredential(PASSWORD, ip), /Trop de tentatives/);
  assert.doesNotThrow(() => verifyAdminCredential(token, ip));
});
