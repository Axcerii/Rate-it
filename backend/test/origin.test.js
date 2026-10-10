// Origin whitelist (CORS + Socket.io handshake)

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../src/utils/security.js';

const ALLOWED = ['https://rate-it.fr', 'https://www.rate-it.fr', '51.91.126.16'];
const initialNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (initialNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = initialNodeEnv;
});

test('whitelisted origins are allowed in production', () => {
  process.env.NODE_ENV = 'production';
  for (const origin of ['https://rate-it.fr', 'https://www.rate-it.fr/', 'http://51.91.126.16', 'http://51.91.126.16:3000']) {
    assert.equal(isAllowedOrigin(origin, ALLOWED), true, origin);
  }
  // Requests without Origin header (server-side fetch from Next.js, curl) are not CORS requests
  assert.equal(isAllowedOrigin(undefined, ALLOWED), true);
});

test('domain names disguised as private IPs are rejected', () => {
  for (const env of ['production', 'development']) {
    process.env.NODE_ENV = env;
    for (const origin of [
      'https://10.evil.com',
      'https://172.attacker.net',
      'https://192.168.pwned.io',
      'https://rate-it.fr.evil.com',
      'https://evil.com',
      'http://172.15.0.1', // public: only 172.16-31 is private
      'http://172.32.0.1',
      'http://192.169.1.1',
      'http://999.168.1.1',
    ]) {
      assert.equal(isAllowedOrigin(origin, ALLOWED), false, `${origin} (${env})`);
    }
  }
});

test('local origins are allowed in development only', () => {
  const local = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.42:3000',
    'http://10.0.0.5:3000',
    'http://172.16.0.1:3000',
    'http://172.31.255.254:3000',
    'http://my-pc.local:3000',
  ];

  process.env.NODE_ENV = 'development';
  for (const origin of local) assert.equal(isAllowedOrigin(origin, ALLOWED), true, origin);

  process.env.NODE_ENV = 'production';
  for (const origin of local) assert.equal(isAllowedOrigin(origin, ALLOWED), false, origin);
});

test('a local origin explicitly whitelisted still works in production', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(isAllowedOrigin('http://localhost:3000', [...ALLOWED, 'http://localhost:3000']), true);
});
