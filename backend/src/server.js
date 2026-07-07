import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkDbConnection } from './db/db.js';
import { connectRedis } from './store/redis.js';

import { onConnection } from './sockets/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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

const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for local development, can be configured later
    methods: ['GET', 'POST'],
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
    await connectRedis();

    httpServer.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to connection error:', error);
    // In production, we might want to fail fast. For local dev, let's log it.
  }
}

startServer();
