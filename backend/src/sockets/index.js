import { registerRoomHandlers } from './roomHandler.js';
import { registerGameHandlers } from './gameHandler.js';
import { registerVoteHandlers } from './voteHandler.js';
import { registerTwitchHandlers } from './twitchHandler.js';
import { registerPlaylistHandlers } from './playlistHandler.js';
import { installSafeHandlers } from '../utils/safeHandler.js';

export function onConnection(io, socket) {
  // Must stay first: wraps every handler registered below (malformed payloads, uncaught errors)
  installSafeHandlers(socket);

  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerVoteHandlers(io, socket);
  registerTwitchHandlers(io, socket);
  registerPlaylistHandlers(io, socket);
}
