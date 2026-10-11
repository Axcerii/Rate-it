import { getSession, saveSession, acquireSessionLock } from '../store/sessionStore.js';
import { sanitizeText, broadcastRoomUpdate } from '../utils/security.js';

// Active Twitch chat links by sessionId: { ws, channel, attempts, retryTimer }
const twitchConnections = new Map();

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

// Chat votes are buffered and written in batches: a busy chat produces hundreds of votes per second,
// and each write rewrites the whole session and broadcasts it to every socket of the room
const TWITCH_VOTE_FLUSH_MS = 500;
// Votes waiting to be written, by sessionId: { votes: Map<user, vote>, timer }
const pendingTwitchVotes = new Map();

export function connectToTwitchChat(io, sessionId, channelName) {
  // Clean up any existing connection
  disconnectFromTwitchChat(sessionId);

  if (!channelName) return;

  const channel = channelName.trim().toLowerCase().replace('#', '');
  const entry = { ws: null, channel, attempts: 0, retryTimer: null };
  twitchConnections.set(sessionId, entry);
  openTwitchSocket(io, sessionId, entry);
}

export function isTwitchChatActive(sessionId) {
  return twitchConnections.has(sessionId);
}

function openTwitchSocket(io, sessionId, entry) {
  const { channel } = entry;
  const username = `justinfan${Math.floor(10000 + Math.random() * 90000)}`;
  const wsUrl = 'wss://irc-ws.chat.twitch.tv:443';

  console.log(`Connecting session ${sessionId} anonymously to Twitch chat: #${channel}`);

  try {
    const ws = new globalThis.WebSocket(wsUrl);
    entry.ws = ws;

    ws.onopen = () => {
      console.log(`Twitch WS connected for session ${sessionId}`);
      entry.attempts = 0;
      ws.send(`PASS oauth:anonymous\r\n`);
      ws.send(`NICK ${username}\r\n`);
      ws.send(`JOIN #${channel}\r\n`);
    };

    ws.onmessage = async (event) => {
      const rawMessage = event.data.toString();
      const lines = rawMessage.split('\r\n');

      for (const line of lines) {
        if (!line) continue;

        // Keep connection alive
        if (line.startsWith('PING')) {
          ws.send(line.replace('PING', 'PONG') + '\r\n');
          continue;
        }

        // Parse Twitch PRIVMSG (supports standard IRC and tag-prefixed IRC formats)
        const match = line.match(/^(?:@[^ ]+ )?:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.+)$/);
        if (match) {
          const user = match[1];
          const text = match[2].trim();

          // Check for special user announcement banner message enclosed in quotation marks
          const specialUser = (process.env.SPECIAL_TWITCH_USER || 'ryrynoceros_').toLowerCase();
          if (user.toLowerCase() === specialUser) {
            const quoteMatch = text.match(/^["“](.+)["”]$/);
            if (quoteMatch) {
              const rawBanner = quoteMatch[1].trim();
              const bannerMessage = sanitizeText(rawBanner, 300);
              const cleanUser = sanitizeText(user, 50);
              if (bannerMessage) {
                console.log(`Room ${sessionId} [Twitch Banner Broadcast] from ${cleanUser}: "${bannerMessage}"`);
                io.to(`session:${sessionId}`).emit('banner:broadcast', {
                  message: bannerMessage,
                  sender: cleanUser,
                  type: 'announcement'
                });
              }
            }
          }

          // Check if message is a vote (1 to 5)
          const firstChar = text.charAt(0);
          const vote = parseInt(firstChar, 10);

          if (!isNaN(vote) && vote >= 1 && vote <= 5) {
            // Also ensure it is either a single digit or a scale like '5/5', '4 stars'
            if (text.length === 1 || text.includes('/5') || text.toLowerCase().includes('star')) {
              queueTwitchVote(io, sessionId, user, vote);
            }
          }
        }
      }
    };

    ws.onerror = (err) => {
      console.error(`Twitch WS error for session ${sessionId}:`, err);
    };

    ws.onclose = () => {
      console.log(`Twitch WS closed for session ${sessionId}`);
      // Ignore sockets that were closed on purpose or already replaced by a newer connection
      if (twitchConnections.get(sessionId) !== entry || entry.ws !== ws) return;
      scheduleTwitchReconnect(io, sessionId, entry);
    };
  } catch (error) {
    console.error(`Failed to connect to Twitch for session ${sessionId}:`, error);
    scheduleTwitchReconnect(io, sessionId, entry);
  }
}

// Twitch (or the network) dropped the connection: retry with exponential backoff
// for as long as the session still exists and still wants its chat connected
function scheduleTwitchReconnect(io, sessionId, entry) {
  const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** entry.attempts, RECONNECT_MAX_DELAY_MS);
  entry.attempts++;
  console.log(`Twitch reconnect for session ${sessionId} in ${delay}ms (attempt ${entry.attempts})`);

  entry.retryTimer = setTimeout(async () => {
    entry.retryTimer = null;
    try {
      const session = await getSession(sessionId);
      if (twitchConnections.get(sessionId) !== entry) return;
      if (!session || !session.twitchChannel) {
        twitchConnections.delete(sessionId);
        return;
      }
      openTwitchSocket(io, sessionId, entry);
    } catch (error) {
      console.error(`Twitch reconnect check failed for session ${sessionId}:`, error);
      if (twitchConnections.get(sessionId) === entry) {
        scheduleTwitchReconnect(io, sessionId, entry);
      }
    }
  }, delay);
  entry.retryTimer.unref?.();
}

export function disconnectFromTwitchChat(sessionId) {
  const entry = twitchConnections.get(sessionId);
  if (entry) {
    console.log(`Closing Twitch connection for session ${sessionId}`);
    // Remove the entry first so that onclose does not trigger a reconnect
    twitchConnections.delete(sessionId);
    discardPendingTwitchVotes(sessionId);
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    try {
      entry.ws?.close();
    } catch (e) {
      console.error(e);
    }
  }
}

function queueTwitchVote(io, sessionId, user, vote) {
  let pending = pendingTwitchVotes.get(sessionId);
  if (!pending) {
    pending = { votes: new Map(), timer: null };
    pendingTwitchVotes.set(sessionId, pending);
  }
  pending.votes.set(user, vote);

  if (!pending.timer) {
    pending.timer = setTimeout(() => {
      pending.timer = null;
      flushTwitchVotes(io, sessionId);
    }, TWITCH_VOTE_FLUSH_MS);
    pending.timer.unref?.();
  }
}

export function discardPendingTwitchVotes(sessionId) {
  const pending = pendingTwitchVotes.get(sessionId);
  if (!pending) return;
  if (pending.timer) clearTimeout(pending.timer);
  pendingTwitchVotes.delete(sessionId);
}

/**
 * Moves the buffered chat votes into the given session object and returns how many votes changed.
 * Must be called while holding the session lock; the caller saves the session.
 * Handlers that close a round (results, next video) call it first so that late votes
 * are counted for the right video instead of leaking into the next one.
 */
export function applyPendingTwitchVotes(session) {
  if (!session) return 0;
  const pending = pendingTwitchVotes.get(session.sessionId);
  if (!pending) return 0;
  discardPendingTwitchVotes(session.sessionId);

  // In the lobby, chat votes only feed the connection check shown to the host: game:start wipes them
  if (session.status !== 'PLAYING' && session.status !== 'LOBBY') return 0;

  session.twitchVotes = session.twitchVotes || {};
  let changed = 0;
  for (const [user, vote] of pending.votes) {
    // Only record if vote changed or is new
    if (session.twitchVotes[user] !== vote) {
      session.twitchVotes[user] = vote;
      changed++;
    }
  }
  return changed;
}

async function flushTwitchVotes(io, sessionId) {
  let release;
  try {
    release = await acquireSessionLock(sessionId);
    const session = await getSession(sessionId);
    if (!session) {
      discardPendingTwitchVotes(sessionId);
      return;
    }

    const changed = applyPendingTwitchVotes(session);
    if (changed === 0) return;

    await saveSession(session);

    console.log(`Room ${sessionId} [Twitch]: ${changed} chat vote(s) recorded`);

    // Broadcast update securely to room
    broadcastRoomUpdate(io, session, { light: true });
  } catch (error) {
    console.error('Error saving Twitch chat votes:', error);
  } finally {
    release?.();
  }
}
