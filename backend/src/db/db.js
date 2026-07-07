import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

export default pool;
