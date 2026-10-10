import { getSession, saveSession, acquireSessionLock } from '../store/sessionStore.js';
import { sanitizeText, broadcastRoomUpdate } from '../utils/security.js';

// Active Twitch chat links by sessionId: { ws, channel, attempts, retryTimer }
const twitchConnections = new Map();

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

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
              await registerTwitchVote(io, sessionId, user, vote);
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
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    try {
      entry.ws?.close();
    } catch (e) {
      console.error(e);
    }
  }
}

async function registerTwitchVote(io, sessionId, user, vote) {
  let release;
  try {
    release = await acquireSessionLock(sessionId);
    const session = await getSession(sessionId);
    if (!session || session.status !== 'PLAYING') return;

    session.twitchVotes = session.twitchVotes || {};
    
    // Only record if vote changed or is new
    if (session.twitchVotes[user] === vote) return;

    session.twitchVotes[user] = vote;
    await saveSession(session);

    console.log(`Room ${sessionId} [Twitch]: Viewer ${user} voted ${vote}`);

    // Broadcast update securely to room
    broadcastRoomUpdate(io, session);
  } catch (error) {
    console.error('Error saving Twitch chat vote:', error);
  } finally {
    release?.();
  }
}
