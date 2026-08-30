import { createClient } from 'redis';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from cwd or global root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Redis Connected successfully');
  }
  return redisClient;
}

export default redisClient;
