import redisClient from './redis.js';

const SESSION_TTL = 7200; // 2 hours in seconds

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
