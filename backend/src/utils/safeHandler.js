import { withSocketRateLimit } from './rateLimiter.js';

// Events emitted by Socket.io itself (not by clients): their arguments must not be altered
const RESERVED_EVENTS = new Set(['disconnect', 'disconnecting', 'error']);

/**
 * Wraps a socket event handler so that nothing a client sends can crash the process.
 * - A missing/null payload becomes {} so that destructuring in handler signatures is safe.
 * - Any error (sync or async) escaping the handler is logged and reported through the ack callback.
 */
export function safeHandler(eventName, handler) {
  return async (...args) => {
    const isClientEvent = !RESERVED_EVENTS.has(eventName);
    const lastArg = args[args.length - 1];
    const ack = isClientEvent && typeof lastArg === 'function' ? lastArg : null;

    if (isClientEvent && (args.length === 0 || args[0] === null || args[0] === undefined)) {
      args[0] = {};
    }

    try {
      await handler(...args);
    } catch (error) {
      console.error(`Unhandled error in socket handler "${eventName}":`, error);
      if (ack) {
        try {
          ack({ success: false, error: 'Erreur interne du serveur' });
        } catch (ackError) {
          console.error(`Failed to send error ack for "${eventName}":`, ackError);
        }
      }
    }
  };
}

/**
 * Patches socket.on / socket.once so that every handler registered afterwards is rate limited
 * and wrapped with safeHandler. Must be called before registering the handlers.
 */
export function installSafeHandlers(socket) {
  for (const method of ['on', 'once']) {
    const original = socket[method].bind(socket);
    socket[method] = (eventName, handler) => {
      const limited = RESERVED_EVENTS.has(eventName) ? handler : withSocketRateLimit(socket, eventName, handler);
      return original(eventName, safeHandler(eventName, limited));
    };
  }
}
