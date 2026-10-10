// Admin authentication: password check rate limited on the real client IP,
// session kept in an HttpOnly cookie, admin socket events authorized by that cookie only

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createIo, silenceLogs, dbQueries } from './helpers/socketHarness.js';
import adminRouter from '../src/routes/adminRoutes.js';
import {
  ADMIN_COOKIE_NAME,
  getSocketClientIp,
  verifyAdminPassword,
  createAdminSession,
  isValidAdminSession,
  revokeAdminSession,
  getAdminSessionToken,
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

// Real Express app with the admin routes, behind a fake reverse proxy (X-Forwarded-For / -Proto)
let server;
let baseUrl;
const api = (path, { ip = '203.0.113.200', cookie, https = true, ...options } = {}) =>
  fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      'X-Forwarded-Proto': https ? 'https' : 'http',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
const login = (password, options) => api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }), ...options });
// "name=value" pair of the Set-Cookie header, as a browser would send it back
const cookiePair = (res) => (res.headers.get('set-cookie') || '').split(';')[0];

before(async () => {
  silenceLogs();
  process.env.ADMIN_PASSWORD = PASSWORD;
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('the client IP is the one appended by the proxy, not the one sent by the client', () => {
  assert.equal(getSocketClientIp(socketBehindProxy(null, '203.0.113.7')), '203.0.113.7');
  assert.equal(getSocketClientIp(socketBehindProxy('1.2.3.4', '203.0.113.7')), '203.0.113.7');
  assert.equal(getSocketClientIp(socketBehindProxy('1.2.3.4, 5.6.7.8', '203.0.113.7')), '203.0.113.7');
  assert.equal(getSocketClientIp(socketBehindProxy(null, '2001:db8::1')), '2001:db8::1');
  // No proxy (local development): falls back to the socket address
  assert.equal(getSocketClientIp({ id: 'x', handshake: { address: '127.0.0.1', headers: {} } }), '127.0.0.1');
  assert.equal(getSocketClientIp({ id: 'x', handshake: { address: '127.0.0.1', headers: { 'x-forwarded-for': 'garbage' } } }), '127.0.0.1');
});

test('wrong passwords lock the client out, whatever it puts in X-Forwarded-For', async () => {
  const attackerIp = '198.51.100.23';
  // A new forged address in front of the real one for every attempt
  const attempt = (password, n) => login(password, { ip: `10.${n}.${n}.${n}, ${attackerIp}` });

  for (let n = 0; n < 5; n++) {
    const res = await attempt(`guess-${n}`, n);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('set-cookie'), null);
  }
  // Locked out: even the right password is refused from this IP
  const locked = await attempt(PASSWORD, 99);
  assert.equal(locked.status, 401);
  assert.match((await locked.json()).error, /Trop de tentatives/);

  // Another client is not affected
  assert.equal((await login(PASSWORD, { ip: '203.0.113.50' })).status, 200);
});

test('login sets the session in an HttpOnly, SameSite=Strict cookie and nowhere else', async () => {
  const res = await login(PASSWORD);
  const body = await res.json();
  const setCookie = res.headers.get('set-cookie');
  const token = cookiePair(res).split('=')[1];

  assert.equal(res.status, 200);
  assert.deepEqual(body, { success: true }, 'the token must not be readable by page scripts');
  assert.match(setCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=[0-9a-f]{64};`));
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /Max-Age=43200/i);
  assert.equal(isValidAdminSession(token), true);
});

test('the cookie is not marked Secure over plain HTTP, so local development still works', async () => {
  const res = await login(PASSWORD, { https: false, ip: '203.0.113.51' });
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.doesNotMatch(setCookie, /Secure/i);
});

test('session check and logout', async () => {
  const anonymous = await (await api('/api/admin/session')).json();
  assert.equal(anonymous.authenticated, false);

  const forged = await (await api('/api/admin/session', { cookie: `${ADMIN_COOKIE_NAME}=${'0'.repeat(64)}` })).json();
  assert.equal(forged.authenticated, false);

  const cookie = cookiePair(await login(PASSWORD, { ip: '203.0.113.52' }));
  assert.equal((await (await api('/api/admin/session', { cookie })).json()).authenticated, true);

  const logout = await api('/api/admin/logout', { method: 'POST', cookie });
  assert.match(logout.headers.get('set-cookie'), new RegExp(`^${ADMIN_COOKIE_NAME}=;`));
  // The session is revoked on the server: a copy of the cookie is useless after logout
  assert.equal((await (await api('/api/admin/session', { cookie })).json()).authenticated, false);
});

test('a session expires after 12 hours and can be revoked', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const token = createAdminSession();
  t.mock.timers.tick(11 * 60 * 60 * 1000);
  assert.equal(isValidAdminSession(token), true);
  t.mock.timers.tick(2 * 60 * 60 * 1000);
  assert.equal(isValidAdminSession(token), false);

  const other = createAdminSession();
  revokeAdminSession(other);
  assert.equal(isValidAdminSession(other), false);
  assert.equal(isValidAdminSession(undefined), false);
  assert.equal(isValidAdminSession(''), false);
});

test('the session token is read from the Cookie header among other cookies', () => {
  assert.equal(getAdminSessionToken(`${ADMIN_COOKIE_NAME}=abc`), 'abc');
  assert.equal(getAdminSessionToken(`theme=dark; ${ADMIN_COOKIE_NAME}=abc; other=1`), 'abc');
  assert.equal(getAdminSessionToken(`x${ADMIN_COOKIE_NAME}=nope`), null);
  assert.equal(getAdminSessionToken('theme=dark'), null);
  assert.equal(getAdminSessionToken(undefined), null);
});

test('admin socket events require the session cookie; the password in a payload grants nothing', async () => {
  const io = createIo();
  const deletes = () => dbQueries.filter((q) => /DELETE FROM playlists/.test(q.sql)).length;
  const before = deletes();

  // Knows the admin password but has no session cookie
  const noCookie = io.connect();
  for (const password of [PASSWORD, undefined]) {
    const res = await noCookie.send('playlist:delete', { id: 'PL-ABC123', password });
    assert.equal(res.success, false);
    assert.match(res.error, /Session administrateur/);
  }
  assert.equal((await noCookie.send('admin:verify', { password: PASSWORD })).success, false);

  const forged = io.connect(undefined, { cookie: `${ADMIN_COOKIE_NAME}=${'0'.repeat(64)}` });
  assert.equal((await forged.send('playlist:delete', { id: 'PL-ABC123' })).success, false);
  assert.equal(deletes(), before, 'a playlist was deleted without an admin session');

  // With a valid session cookie on the handshake
  const token = createAdminSession();
  const admin = io.connect(undefined, { cookie: `${ADMIN_COOKIE_NAME}=${token}` });
  assert.equal((await admin.send('admin:verify')).success, true);
  assert.equal((await admin.send('playlist:delete', { id: 'PL-ABC123' })).success, true);
  assert.equal(deletes(), before + 1);

  // Revoked (logout): the same socket loses its rights immediately
  revokeAdminSession(token);
  assert.equal((await admin.send('playlist:delete', { id: 'PL-ABC123' })).success, false);
});

test('verifyAdminPassword rejects everything but the exact password', () => {
  const ip = '203.0.113.60';
  assert.doesNotThrow(() => verifyAdminPassword(PASSWORD, ip));
  for (const [n, wrong] of [undefined, null, '', {}, PASSWORD + 'x'].entries()) {
    assert.throws(() => verifyAdminPassword(wrong, `203.0.113.${70 + n}`), /invalide/);
  }
});
