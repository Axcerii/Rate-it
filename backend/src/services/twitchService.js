import { getSession, saveSession } from '../store/sessionStore.js';

// Map to hold active Twitch WS connections by sessionId
const twitchConnections = new Map();

export function connectToTwitchChat(io, sessionId, channelName) {
  // Clean up any existing connection
  disconnectFromTwitchChat(sessionId);

  if (!channelName) return;

  const channel = channelName.trim().toLowerCase().replace('#', '');
  const username = `justinfan${Math.floor(10000 + Math.random() * 90000)}`;
  const wsUrl = 'wss://irc-ws.chat.twitch.tv:443';

  console.log(`Connecting session ${sessionId} anonymously to Twitch chat: #${channel}`);

  try {
    const ws = new globalThis.WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Twitch WS connected for session ${sessionId}`);
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
      twitchConnections.delete(sessionId);
    };

    twitchConnections.set(sessionId, ws);
  } catch (error) {
    console.error(`Failed to connect to Twitch for session ${sessionId}:`, error);
  }
}

export function disconnectFromTwitchChat(sessionId) {
  const ws = twitchConnections.get(sessionId);
  if (ws) {
    console.log(`Closing Twitch connection for session ${sessionId}`);
    try {
      ws.close();
    } catch (e) {
      console.error(e);
    }
    twitchConnections.delete(sessionId);
  }
}

async function registerTwitchVote(io, sessionId, user, vote) {
  try {
    const session = await getSession(sessionId);
    if (!session || session.status !== 'PLAYING') return;

    session.twitchVotes = session.twitchVotes || {};
    
    // Only record if vote changed or is new
    if (session.twitchVotes[user] === vote) return;

    session.twitchVotes[user] = vote;
    await saveSession(session);

    console.log(`Room ${sessionId} [Twitch]: Viewer ${user} voted ${vote}`);

    // Broadcast update so Host screen updates vote counts in real-time
    io.to(`session:${sessionId}`).emit('room:update', session);
  } catch (error) {
    console.error('Error saving Twitch chat vote:', error);
  }
}
