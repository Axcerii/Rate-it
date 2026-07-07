import { registerRoomHandlers } from './roomHandler.js';

export function onConnection(io, socket) {
  registerRoomHandlers(io, socket);
}
