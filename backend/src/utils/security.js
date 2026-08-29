import crypto from 'crypto';

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

  // 5. Trim whitespace and truncate to maximum length
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
  const num = parseInt(val, 10);
  if (!isNaN(num) && num >= 1 && num <= 5) {
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
 *
 * @param {any} username
 * @returns {string|null} Valid MAL username or null
 */
export function validateMalUsername(username) {
  if (!username) return null;
  const str = String(username).trim();
  if (/^[a-zA-Z0-9_-]{2,20}$/.test(str)) {
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
 * Checks if a request origin is allowed based on origin header or localhost patterns.
 *
 * @param {string} origin - Origin header from request
 * @param {Array<string>} [allowedList] - Optional whitelist
 * @returns {boolean} True if origin is valid / allowed
 */
export function isAllowedOrigin(origin, allowedList = []) {
  if (!origin) return true; // Same-origin or non-browser request (e.g. mobile app, curl, server-to-server)

  if (allowedList.length > 0 && allowedList.includes(origin)) {
    return true;
  }

  // Allow localhost / local network IP development origins
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

// In-memory rate limiting tracker for admin password brute-force prevention
const adminAttempts = new Map();
const MAX_ADMIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute lockout

export function checkAdminRateLimit(key = 'default') {
  const now = Date.now();
  const entry = adminAttempts.get(key);

  if (entry) {
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remainingSec };
    }
    if (now - entry.lastAttempt > LOCKOUT_MS) {
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
  let entry = adminAttempts.get(key) || { count: 0, lastAttempt: now };
  entry.count += 1;
  entry.lastAttempt = now;

  if (entry.count >= MAX_ADMIN_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0;
  }
  adminAttempts.set(key, entry);
}

/**
 * Sanitizes the session state object before sending it to a specific client socket.
 * Prevents hostToken leaks and masks hidden vote values during the VOTING phase.
 *
 * @param {object} session
 * @param {object} socketData
 * @returns {object|null}
 */
export function sanitizeSessionForSocket(session, socketData = {}) {
  if (!session) return null;

  const isHost = !!socketData.isHost;
  const playerId = socketData.playerId;

  const copy = JSON.parse(JSON.stringify(session));

  // 1. Never leak hostToken in any client session payload
  delete copy.hostToken;

  // 2. If in active VOTING phase, prevent regular players from snooping on other players' ratings
  if (copy.status === 'PLAYING' && copy.phase === 'VOTING') {
    if (!isHost) {
      const maskedVotes = {};
      if (playerId && copy.votes && copy.votes[playerId] !== undefined) {
        maskedVotes[playerId] = copy.votes[playerId];
      }
      copy.votes = maskedVotes;

      if (copy.players) {
        for (const pid in copy.players) {
          if (pid !== playerId && copy.players[pid].vote !== undefined) {
            copy.players[pid].vote = null;
          }
        }
      }
    }
  }

  return copy;
}

/**
 * Securely broadcasts room updates to all sockets in a room,
 * ensuring each socket receives an appropriately masked/sanitized copy.
 *
 * @param {object} io
 * @param {object} session
 */
export function broadcastRoomUpdate(io, session) {
  if (!io || !session || !session.sessionId) return;
  const roomName = `session:${session.sessionId}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room || room.size === 0) return;

  for (const socketId of room) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      const sanitized = sanitizeSessionForSocket(session, sock.data);
      sock.emit('room:update', sanitized);
    }
  }
}
