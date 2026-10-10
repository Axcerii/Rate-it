import { getSocketClientIp } from './security.js';

// Token buckets by "<limit name>|<client key>": { tokens, updatedAt, fullAt }
const buckets = new Map();

/**
 * Token bucket: each client may burst up to `capacity` calls, then `refillPerSec` calls per second.
 * Returns false when the call must be rejected.
 */
export function consumeRateLimit(name, key, { capacity, refillPerSec }) {
  const now = Date.now();
  const id = `${name}|${key}`;
  const bucket = buckets.get(id) || { tokens: capacity, updatedAt: now, fullAt: now };

  bucket.tokens = Math.min(capacity, bucket.tokens + ((now - bucket.updatedAt) / 1000) * refillPerSec);
  bucket.updatedAt = now;

  const allowed = bucket.tokens >= 1;
  if (allowed) bucket.tokens -= 1;

  bucket.fullAt = now + ((capacity - bucket.tokens) / refillPerSec) * 1000;
  buckets.set(id, bucket);
  return allowed;
}

// A bucket that is full again carries no information: drop it so the map cannot grow forever
setInterval(() => {
  const now = Date.now();
  for (const [id, bucket] of buckets) {
    if (bucket.fullAt <= now) buckets.delete(id);
  }
}, 60 * 1000).unref();

// Limits are per client IP: opening more sockets does not give more budget.
// They are sized to stay invisible in normal use, including several players behind the same IP.
const perMinutes = (count, minutes) => ({ capacity: count, refillPerSec: count / (minutes * 60) });

// Applies to every event, on top of the specific limits below
const GLOBAL_SOCKET_LIMIT = { capacity: 200, refillPerSec: 50 };

// Playlist creation / update, shared with POST /api/playlists
export const PLAYLIST_WRITE_LIMIT = perMinutes(20, 15);

// Events that create state or call external services (YouTube, AniList, MyAnimeList, Twitch)
const SOCKET_EVENT_LIMITS = {
  'room:create': { name: 'room:create', ...perMinutes(20, 10) },
  'playlist:create': { name: 'playlist:write', ...PLAYLIST_WRITE_LIMIT },
  'playlist:update_with_secret': { name: 'playlist:write', ...PLAYLIST_WRITE_LIMIT },
  'video:verify': { name: 'video:verify', capacity: 30, refillPerSec: 1 },
  'playlist:get_mal_videos': { name: 'anime-list', ...perMinutes(10, 1) },
  'playlist:get_anilist_videos': { name: 'anime-list', ...perMinutes(10, 1) },
  'playlist:search_videos': { name: 'playlist:search_videos', capacity: 60, refillPerSec: 5 },
  'game:start': { name: 'game:start', ...perMinutes(20, 1) },
  'twitch:connect': { name: 'twitch:connect', ...perMinutes(10, 1) },
};

const RATE_LIMIT_ERROR = 'Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.';

/**
 * Wraps a client event handler: over the limit, the event is dropped and the ack callback gets an error.
 */
export function withSocketRateLimit(socket, eventName, handler) {
  const specific = SOCKET_EVENT_LIMITS[eventName];

  return (...args) => {
    const ip = getSocketClientIp(socket);
    const allowed =
      consumeRateLimit('socket', ip, GLOBAL_SOCKET_LIMIT) && (!specific || consumeRateLimit(specific.name, ip, specific));

    if (!allowed) {
      const ack = args[args.length - 1];
      if (typeof ack === 'function') ack({ success: false, error: RATE_LIMIT_ERROR });
      return undefined;
    }
    return handler(...args);
  };
}
