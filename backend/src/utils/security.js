import crypto from 'crypto';
import net from 'net';

/**
 * Centralized Security Utility Module for Input Sanitization, SQL Injection Prevention,
 * XSS Protection, Origin Validation, Session Masking, and Secure Authentication.
 */

/**
 * Generates a cryptographically secure random token in hex format.
 *
 * @param {number} [bytes=32]
 * @returns {string} Hex token string
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean} True if strings are equal
 */
export function safeTimingCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Dummy comparison to prevent timing leak on length difference
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Sanitizes a text string to prevent XSS attacks and dangerous character injections.
 * Strips HTML tags, script protocols, inline event handlers, null bytes, and dangerous control characters.
 * Truncates string to specified maxLength.
 *
 * @param {any} input - Raw input value
 * @param {number} [maxLength=255] - Maximum allowed length
 * @returns {string} Clean, sanitized string
 */
export function sanitizeText(input, maxLength = 255) {
  if (input === null || input === undefined) return '';

  let str = String(input);

  // 1. Remove null bytes and ASCII control characters (0-31 except \t, \n, \r)
  str = str.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Strip HTML tags (<script>, <iframe>, <style>, etc.)
  str = str.replace(/<[^>]*>?/gm, '');

  // 3. Strip dangerous inline event handlers (e.g., onload=, onerror=, onclick=)
  str = str.replace(/on\w+\s*=/gi, '');

  // 4. Strip dangerous script protocols
  str = str.replace(/(javascript|vbscript|data):/gi, '');

  // 5. Neutralize any remaining angle brackets to prevent broken tag reassembly
  str = str.replace(/[<>]/g, '');

  // 6. Trim whitespace and truncate to maximum length
  return str.trim().slice(0, maxLength);
}

/**
 * Escapes special SQL LIKE / ILIKE wildcard characters (% and _) and backslashes
 * so user inputs can be safely matched literally without SQL pattern exploitation.
 *
 * @param {any} input - Raw search query
 * @returns {string} Escaped search query for LIKE/ILIKE with ESCAPE '\'
 */
export function escapeLikePattern(input) {
  if (!input) return '';
  const str = sanitizeText(input, 100);
  return str.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validates a 6-character room code or playlist share ID format.
 *
 * @param {any} code
 * @returns {string|null} Formatted code or null if invalid
 */
export function validateRoomCode(code) {
  if (!code) return null;
  const str = String(code).trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(str) || /^PL-[A-Z0-9]{6}$/.test(str)) {
    return str;
  }
  return null;
}

/**
 * Regex for playlist ID format (e.g., "PL-DGRWQV" or 4-12 alphanumeric characters).
 */
export const PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]{2,50}$/;

/**
 * Validates and formats a playlist ID.
 *
 * @param {any} id
 * @returns {string|null} Clean uppercase playlist ID or null if invalid
 */
export function validatePlaylistId(id) {
  if (!id) return null;
  const str = String(id).trim();
  if (PLAYLIST_ID_REGEX.test(str)) {
    return str;
  }
  return null;
}

/**
 * Validates and extracts an 11-character YouTube video ID.
 *
 * @param {any} input
 * @returns {string|null} Valid 11-character YouTube ID or null
 */
export function validateYoutubeId(input) {
  if (!input) return null;
  const str = String(input).trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);
  const candidate = match && match[2].length === 11 ? match[2] : str;
  if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
    return candidate;
  }
  return null;
}

/**
 * Checks if a YouTube video is currently valid, public, and available using the official YouTube oEmbed endpoint.
 *
 * @param {string} youtubeId - 11-character YouTube video ID
 * @returns {Promise<{ valid: boolean, title?: string, author?: string, error?: string, warning?: string }>}
 */
export async function verifyYoutubeVideo(youtubeId) {
  const validId = validateYoutubeId(youtubeId);
  if (!validId) {
    return { valid: false, error: 'Format d\'identifiant YouTube invalide' };
  }

  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(validId)}&format=json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RateItValidator/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (response.status === 200) {
      const data = await response.json();
      return {
        valid: true,
        title: data.title,
        author: data.author_name,
      };
    } else if (response.status === 404 || response.status === 400) {
      return {
        valid: false,
        error: 'Vidéo introuvable, supprimée ou privée sur YouTube',
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        error: 'Vidéo restreinte ou intégration désactivée par son propriétaire',
      };
    }

    return {
      valid: false,
      error: `YouTube a répondu avec le statut ${response.status}`,
    };
  } catch (err) {
    console.warn(`Vérification YouTube impossible en direct pour ${validId}:`, err.message);
    return {
      valid: true,
      warning: 'Impossible de vérifier la disponibilité en direct (délai de réponse dépassé)',
    };
  }
}

/**
 * Validates rating numeric value between 1 and 5.
 *
 * @param {any} val
 * @returns {number|null} Valid rating integer or null
 */
export function validateRating(val) {
  // Strict on purpose: parseInt would turn 2.5, "3abc" or [4] into valid ratings
  const num = typeof val === 'string' && val.trim() !== '' ? Number(val) : val;
  if (Number.isInteger(num) && num >= 1 && num <= 5) {
    return num;
  }
  return null;
}

/**
 * Validates Twitch channel name format (1-25 alphanumeric/underscore characters).
 *
 * @param {any} channel
 * @returns {string|null} Valid channel name or null
 */
export function validateTwitchChannel(channel) {
  if (!channel) return null;
  const str = String(channel).trim().toLowerCase();
  if (/^[a-z0-9_]{1,25}$/.test(str)) {
    return str;
  }
  return null;
}

/**
 * Validates MyAnimeList username format (2-20 alphanumeric, dash, and underscore characters).
 * Supports plain usernames or full MAL URLs (profile/animelist).
 *
 * @param {any} username
 * @returns {string|null} Valid MAL username or null
 */
export function validateMalUsername(username) {
  if (!username) return null;
  let str = String(username).trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (str.includes('/')) {
    const urlMatch = str.match(/myanimelist\.net\/(?:profile|animelist)\/([a-zA-Z0-9_-]{2,20})/i);
    if (urlMatch) {
      str = urlMatch[1];
    } else {
      const segments = str.split('/').filter(Boolean);
      str = segments[segments.length - 1] || '';
    }
  }
  if (/^[a-zA-Z0-9_-]{2,20}$/.test(str)) {
    return str;
  }
  return null;
}

/**
 * Validates an AniList username (2-30 chars, alphanumeric + underscore + hyphen).
 * Supports plain usernames or full AniList URLs (user/animelist).
 *
 * @param {any} username
 * @returns {string|null} Valid AniList username or null
 */
export function validateAnilistUsername(username) {
  if (!username) return null;
  let str = String(username).trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (str.includes('/')) {
    const urlMatch = str.match(/anilist\.co\/user\/([a-zA-Z0-9_-]{2,30})/i);
    if (urlMatch) {
      str = urlMatch[1];
    } else {
      const segments = str.split('/').filter(Boolean);
      str = segments[segments.length - 1] || '';
    }
  }
  if (/^[a-zA-Z0-9_-]{2,30}$/.test(str)) {
    return str;
  }
  return null;
}

/**
 * Sanitizes and validates a video identifier against prototype pollution and malformed values.
 *
 * @param {any} id
 * @returns {string|null} Safe video id string or null
 */
export function sanitizeVideoId(id) {
  if (id === null || id === undefined) return null;
  const str = String(id).trim();
  if (['__proto__', 'constructor', 'prototype'].includes(str)) return null;
  if (/^[a-zA-Z0-9_-]{1,50}$/.test(str)) {
    return str;
  }
  return null;
}

/**
 * Validates a player identifier sent by a client. Player ids are used as keys of plain objects
 * (session.players, session.votes...): "__proto__" would reach Object.prototype and corrupt
 * every object of the process.
 *
 * @param {any} id
 * @returns {string|null} Safe player id or null
 */
export function validatePlayerId(id) {
  return sanitizeVideoId(id);
}

/**
 * Tells whether a hostname is this machine or a private network address (development setups).
 * Only real IP literals are matched: "10.evil.com" is a public domain name, not a private IP.
 *
 * @param {string} hostname - Hostname as returned by URL.hostname
 * @returns {boolean}
 */
export function isLocalDevHostname(hostname) {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '[::1]' || host.endsWith('.local')) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b, c, d] = ipv4.slice(1).map(Number);
  if ([a, b, c, d].some((part) => part > 255)) return false;

  return (
    a === 127 || // loopback
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) // 192.168.0.0/16
  );
}

/**
 * Checks if a request origin is allowed based on origin header or, outside production, local network patterns.
 *
 * @param {string} origin - Origin header from request
 * @param {Array<string>} [allowedList] - Optional whitelist
 * @returns {boolean} True if origin is valid / allowed
 */
export function isAllowedOrigin(origin, allowedList = []) {
  if (!origin) return true; // Same-origin or non-browser request (e.g. mobile app, curl, server-to-server)

  // Normalize allowed origins (strip trailing slashes, extract hostnames)
  const normalizedAllowed = allowedList
    .filter(Boolean)
    .flatMap((item) => {
      const trimmed = item.trim().replace(/\/+$/, '');
      if (!trimmed) return [];
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return [trimmed, `http://${trimmed}`, `https://${trimmed}`];
      }
      return [trimmed];
    });

  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  if (normalizedAllowed.length > 0 && normalizedAllowed.includes(cleanOrigin)) {
    return true;
  }

  // Parse origin or referer URL
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const originWithoutPath = url.origin;
    const hostWithPort = url.host;

    // Check if hostname, host with port, or origin without path matches allowed list
    if (
      normalizedAllowed.some((item) => {
        return (
          item === originWithoutPath ||
          item === hostname ||
          item === hostWithPort ||
          item === `http://${hostWithPort}` ||
          item === `https://${hostWithPort}` ||
          item === `http://${hostname}` ||
          item === `https://${hostname}`
        );
      })
    ) {
      return true;
    }

    // Allow localhost / local network origins in development only:
    // in production, only the ALLOWED_ORIGINS whitelist applies
    if (process.env.NODE_ENV !== 'production' && isLocalDevHostname(hostname)) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

// In-memory rate limiting tracker for admin password brute-force prevention.
// Every 5 wrong passwords lock the client out, twice as long each time (1 min, 2 min... up to 1 hour):
// a fixed one-minute lockout would still allow thousands of guesses per day.
const adminAttempts = new Map();
const MAX_ADMIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;
const MAX_LOCKOUT_MS = 60 * 60 * 1000;
// A client that stays quiet this long starts again from scratch
const ADMIN_ATTEMPTS_MEMORY_MS = MAX_LOCKOUT_MS;

export function checkAdminRateLimit(key = 'default') {
  const now = Date.now();
  const entry = adminAttempts.get(key);

  if (entry) {
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remainingSec };
    }
    if (now - Math.max(entry.lastAttempt, entry.lockedUntil || 0) > ADMIN_ATTEMPTS_MEMORY_MS) {
      adminAttempts.delete(key);
    }
  }
  return { allowed: true };
}

export function recordAdminAttempt(key = 'default', success = false) {
  const now = Date.now();
  if (success) {
    adminAttempts.delete(key);
    return;
  }
  let entry = adminAttempts.get(key) || { count: 0, lockouts: 0, lastAttempt: now };
  entry.count += 1;
  entry.lastAttempt = now;

  if (entry.count >= MAX_ADMIN_ATTEMPTS) {
    entry.lockedUntil = now + Math.min(LOCKOUT_MS * 2 ** (entry.lockouts || 0), MAX_LOCKOUT_MS);
    entry.lockouts = (entry.lockouts || 0) + 1;
    entry.count = 0;
  }
  adminAttempts.set(key, entry);
}

/**
 * Real client IP of a socket, used as rate-limit key.
 * The backend is only reachable through a reverse proxy, which appends the address of its peer
 * at the END of X-Forwarded-For. The entries before it are sent by the client itself and must
 * never be trusted (a random value per attempt would defeat any rate limit).
 * Same rule as Express "trust proxy: 1" (req.ip) on the REST side.
 *
 * @param {object} socket
 * @returns {string}
 */
export function getSocketClientIp(socket) {
  const forwarded = socket?.handshake?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const lastHop = forwarded.split(',').pop().trim();
    if (net.isIP(lastHop)) return lastHop;
  }
  return socket?.handshake?.address || socket?.id || 'unknown';
}

// Admin sessions: token -> expiry timestamp. In memory: admins log in again after a backend restart.
const adminSessions = new Map();
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// The session token is only ever sent to the browser in this HttpOnly cookie (see adminRoutes.js)
export const ADMIN_COOKIE_NAME = 'rate_it_admin';

/**
 * Opens an admin session and returns its token.
 *
 * @returns {string}
 */
export function createAdminSession() {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions) {
    if (expiresAt <= now) adminSessions.delete(token);
  }
  const token = generateSecureToken(32);
  adminSessions.set(token, now + ADMIN_SESSION_TTL_MS);
  return token;
}

export function isValidAdminSession(token) {
  if (typeof token !== 'string' || !token) return false;
  const expiresAt = adminSessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

export function revokeAdminSession(token) {
  if (typeof token === 'string') adminSessions.delete(token);
}

/**
 * Extracts the admin session token from a Cookie request header (HTTP request or socket handshake).
 *
 * @param {string|undefined} cookieHeader
 * @returns {string|null}
 */
export function getAdminSessionToken(cookieHeader) {
  if (typeof cookieHeader !== 'string') return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === ADMIN_COOKIE_NAME) {
      return part.slice(separator + 1).trim() || null;
    }
  }
  return null;
}

/**
 * Checks the admin password. Wrong attempts are rate limited per client.
 * Throws an Error with a user-facing message when access is denied.
 *
 * @param {string} password
 * @param {string} clientKey - Client IP (req.ip)
 */
export function verifyAdminPassword(password, clientKey = 'admin') {
  const configuredPassword = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim() : '';
  if (!configuredPassword) {
    console.error("Connexion admin refusée : la variable d'environnement ADMIN_PASSWORD n'est pas configurée sur le serveur.");
    throw new Error("Connexion impossible : aucun mot de passe administrateur n'est configuré sur le serveur.");
  }

  const rateLimit = checkAdminRateLimit(clientKey);
  if (!rateLimit.allowed) {
    throw new Error(`Trop de tentatives administratives incorrectes. Verrouillé pour encore ${rateLimit.remainingSec}s.`);
  }

  const isValid = safeTimingCompare(typeof password === 'string' ? password.trim() : '', configuredPassword);

  recordAdminAttempt(clientKey, isValid);

  if (!isValid) {
    throw new Error('Mot de passe administrateur invalide');
  }
}

// =========================================================================
// PLAYLIST SECRET CODE UTILITIES & RATE LIMITING
// =========================================================================

/**
 * Generates a cryptographically secure 44-character secret token for playlist editing.
 * 'sec_' prefix + 40 random hex characters (160 bits of cryptographic entropy).
 *
 * @returns {string} e.g. "sec_39fb3057aa4f3d5502cc7ee8e925f66504066fe0"
 */
export function generatePlaylistSecretCode() {
  return `sec_${crypto.randomBytes(20).toString('hex')}`;
}

const secretCodeAttempts = new Map();
const MAX_SECRET_CODE_ATTEMPTS = 10;
const SECRET_CODE_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes lockout

export function checkSecretCodeRateLimit(key = 'default') {
  const now = Date.now();
  const entry = secretCodeAttempts.get(key);

  if (entry) {
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remainingSec };
    }
    if (now - entry.lastAttempt > SECRET_CODE_LOCKOUT_MS) {
      secretCodeAttempts.delete(key);
    }
  }
  return { allowed: true };
}

export function recordSecretCodeAttempt(key = 'default', success = false) {
  const now = Date.now();
  if (success) {
    secretCodeAttempts.delete(key);
    return;
  }
  let entry = secretCodeAttempts.get(key) || { count: 0, lastAttempt: now };
  entry.count += 1;
  entry.lastAttempt = now;

  if (entry.count >= MAX_SECRET_CODE_ATTEMPTS) {
    entry.lockedUntil = now + SECRET_CODE_LOCKOUT_MS;
    entry.count = 0;
  }
  secretCodeAttempts.set(key, entry);
}


// Large fields that only change on game transitions (start, results, next/previous video):
// they are left out of "light" updates, the client keeps the ones it already has
const HEAVY_SESSION_FIELDS = ['videos', 'results'];

/**
 * Client-safe copy of the session as the host sees it. This is the only deep clone of a broadcast.
 */
function buildHostView(session, { light = false } = {}) {
  let source = session;
  if (light) {
    source = { ...session };
    for (const field of HEAVY_SESSION_FIELDS) delete source[field];
  }

  const copy = JSON.parse(JSON.stringify(source));

  // Never leak hostToken nor player tokens in any client session payload
  delete copy.hostToken;
  if (copy.players) {
    for (const pid in copy.players) {
      delete copy.players[pid].token;
    }
  }

  // Server-side bookkeeping, of no use to clients
  delete copy.savedRatingsMap;

  if (light) copy.partial = true;
  return copy;
}

/**
 * Everything the player views have in common, computed once per broadcast.
 */
function buildPlayerBase(hostView) {
  const base = { ...hostView };

  // Host-only data: the per-viewer Twitch votes (players only see the aggregated results)
  // and the lobby track selection
  delete base.twitchVotes;
  delete base.disabledVideoIds;

  // In active VOTING phase, prevent regular players from snooping on other players' ratings
  const hideVotes = base.status === 'PLAYING' && base.phase === 'VOTING';
  let maskedPlayers = null;
  if (hideVotes && base.players) {
    maskedPlayers = {};
    for (const pid in base.players) {
      const player = base.players[pid];
      maskedPlayers[pid] = player.vote !== undefined ? { ...player, vote: null } : player;
    }
  }

  return { base, hideVotes, maskedPlayers };
}

function buildPlayerView({ base, hideVotes, maskedPlayers }, playerId) {
  if (!hideVotes) return base;

  const votes = {};
  if (playerId && base.votes && base.votes[playerId] !== undefined) {
    votes[playerId] = base.votes[playerId];
  }

  const view = { ...base, votes };
  if (maskedPlayers) {
    view.players = playerId && base.players[playerId] ? { ...maskedPlayers, [playerId]: base.players[playerId] } : maskedPlayers;
  }
  return view;
}

/**
 * Sanitizes the session state object before sending it to a specific client socket.
 * Prevents token leaks and masks hidden vote values during the VOTING phase.
 *
 * @param {object} session
 * @param {object} socketData
 * @returns {object|null}
 */
export function sanitizeSessionForSocket(session, socketData = {}) {
  if (!session) return null;

  const hostView = buildHostView(session);
  if (socketData.isHost) return hostView;
  return buildPlayerView(buildPlayerBase(hostView), socketData.playerId);
}

/**
 * Securely broadcasts room updates to all sockets in a room,
 * ensuring each socket receives an appropriately masked/sanitized copy.
 *
 * With `light: true` the update is flagged `partial` and omits HEAVY_SESSION_FIELDS: use it for
 * every change that does not touch them (votes, skips, joins...). They make up most of the payload.
 *
 * @param {object} io
 * @param {object} session
 * @param {{ light?: boolean }} [options]
 */
export function broadcastRoomUpdate(io, session, { light = false } = {}) {
  if (!io || !session || !session.sessionId) return;
  const roomName = `session:${session.sessionId}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room || room.size === 0) return;

  const hostView = buildHostView(session, { light });
  let playerBase = null;

  for (const socketId of room) {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) continue;

    if (sock.data?.isHost) {
      sock.emit('room:update', hostView);
    } else {
      playerBase = playerBase || buildPlayerBase(hostView);
      sock.emit('room:update', buildPlayerView(playerBase, sock.data?.playerId));
    }
  }
}

/**
 * Whitelist of permitted playlist categories.
 */
export const ALLOWED_PLAYLIST_CATEGORIES = [
  'Film/Cinéma',
  'Série/TV',
  'Anime/Manga',
  'Musique',
  'Streaming/VTuber',
  'Youtube',
  'KPop',
  'JPop',
  'Jeux Vidéo',
  'Dessins Animés/Cartoons',
];

export const DEFAULT_PLAYLIST_CATEGORIES = ALLOWED_PLAYLIST_CATEGORIES;

/**
 * Regex ensuring safe category strings without harmful characters or script injections.
 * Allows letters (including unicode accents), numbers, spaces, and common safe punctuation (-, _, /, ', &, (, )).
 */
export const CATEGORY_REGEX = /^[\p{L}\p{N}\s\-_/'&()]{1,50}$/u;

/**
 * Validates and sanitizes a list of category tags to strictly prevent XSS and injection attacks.
 *
 * @param {any} categories - Input categories (array or comma-delimited string)
 * @returns {string[]} Sanitized list of valid categories
 */
export function validateAndSanitizeCategories(categories) {
  if (!categories) return [];

  const rawList = Array.isArray(categories)
    ? categories
    : typeof categories === 'string'
      ? categories.split(',')
      : [];

  const sanitized = [];
  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const clean = sanitizeText(item, 50).trim();
    if (clean.length > 0 && CATEGORY_REGEX.test(clean) && !sanitized.includes(clean)) {
      sanitized.push(clean);
    }
  }

  return sanitized;
}

