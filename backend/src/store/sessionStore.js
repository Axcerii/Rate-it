import redisClient from './redis.js';

const SESSION_TTL = 7200; // 2 hours in seconds

// Tail of the pending mutation queue for each session (in-memory: valid for a single backend instance)
const sessionLocks = new Map();

/**
 * Serializes session mutations: every "getSession -> modify -> saveSession" sequence must run
 * between acquireSessionLock() and the release function it resolves to, otherwise concurrent
 * handlers overwrite each other's changes (lost votes, game going back to a previous video).
 * Not reentrant: never acquire the lock of a session while already holding it.
 */
export function acquireSessionLock(sessionId) {
  const previous = sessionLocks.get(sessionId) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  sessionLocks.set(sessionId, tail);
  tail.then(() => {
    if (sessionLocks.get(sessionId) === tail) sessionLocks.delete(sessionId);
  });
  return previous.then(() => release);
}

export async function saveSession(session) {
  try {
    const key = `session:${session.sessionId}`;
    await redisClient.set(key, JSON.stringify(session), {
      EX: SESSION_TTL,
    });
    return true;
  } catch (error) {
    console.error('Error saving session to Redis:', error);
    throw error;
  }
}

export async function getSession(sessionId) {
  try {
    const key = `session:${sessionId}`;
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting session from Redis:', error);
    throw error;
  }
}

export async function deleteSession(sessionId) {
  try {
    const key = `session:${sessionId}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting session from Redis:', error);
    throw error;
  }
}
