import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { checkDbConnection, initializeDatabase } from './db/db.js';
import redisClient, { connectRedis } from './store/redis.js';
import { isAllowedOrigin } from './utils/security.js';
import { onConnection } from './sockets/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from cwd or global root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Security HTTP Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://www.youtube.com; connect-src 'self' ws: wss: https:;"
  );
  next();
});

// Configure CORS Origin Verification Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        console.warn(`Blocked HTTP request from unauthorized origin: ${origin}`);
        callback(new Error('Cross-Origin Request Blocked'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await checkDbConnection();
    res.status(200).json({ status: 'OK', message: 'Server and Database are healthy' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

const httpServer = createServer(app);

// Configure Socket.io with CSRF / Origin Verification
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        console.warn(`Blocked Socket CORS request from unauthorized origin: ${origin}`);
        callback(new Error('Cross-Origin Socket Request Blocked'), false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin || req.headers.referer;
    if (isAllowedOrigin(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      console.warn(`CSurf protection: Blocked socket handshake from origin ${origin}`);
      callback('Forbidden origin', false);
    }
  },
});

io.on('connection', (socket) => {
  console.log(`New socket connection: ${socket.id}`);
  onConnection(io, socket);
});

async function startServer() {
  try {
    console.log('Connecting to databases...');
    await checkDbConnection();
    await initializeDatabase();
    await connectRedis();

    httpServer.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to connection error:', error);
  }
}

// Graceful Shutdown on termination signals
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  try {
    io.close(() => {
      console.log('Socket.io server closed.');
    });

    httpServer.close(async () => {
      console.log('HTTP server closed.');

      try {
        await pool.end();
        console.log('PostgreSQL connection pool closed.');
      } catch (err) {
        console.error('Error closing PostgreSQL pool:', err);
      }

      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
          console.log('Redis client disconnected.');
        }
      } catch (err) {
        console.error('Error closing Redis client:', err);
      }

      console.log('Graceful shutdown completed successfully.');
      process.exit(0);
    });

    // Force shutdown after 10s if connections hang
    setTimeout(() => {
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000).unref();
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

