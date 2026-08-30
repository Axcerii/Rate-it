import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from cwd or global root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

export async function checkDbConnection() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    console.log('PostgreSQL Connected successfully:', res.rows[0].now);
    return true;
  } finally {
    client.release();
  }
}

import { runManyToManyMigration } from './migrate_to_many_to_many.js';

export async function initializeDatabase() {
  try {
    // 1. Run many-to-many migration if needed
    await runManyToManyMigration();

    // 2. Initialize and verify schema definitions & seed data
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema initialized and verified successfully.');
    return true;
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

export default pool;
