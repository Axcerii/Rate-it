import { registerRoomHandlers } from './roomHandler.js';
import { registerGameHandlers } from './gameHandler.js';

export function onConnection(io, socket) {
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
}
