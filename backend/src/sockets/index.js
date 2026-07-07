import { registerRoomHandlers } from './roomHandler.js';
import { registerGameHandlers } from './gameHandler.js';
import { registerVoteHandlers } from './voteHandler.js';

export function onConnection(io, socket) {
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerVoteHandlers(io, socket);
}
