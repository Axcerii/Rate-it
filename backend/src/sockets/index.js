import { registerRoomHandlers } from './roomHandler.js';
import { registerGameHandlers } from './gameHandler.js';
import { registerVoteHandlers } from './voteHandler.js';
import { registerTwitchHandlers } from './twitchHandler.js';
import { registerPlaylistHandlers } from './playlistHandler.js';

export function onConnection(io, socket) {
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerVoteHandlers(io, socket);
  registerTwitchHandlers(io, socket);
  registerPlaylistHandlers(io, socket);
}
