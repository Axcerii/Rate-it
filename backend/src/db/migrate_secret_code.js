import pool from './db.js';
import crypto from 'crypto';

export function generatePlaylistSecretCode() {
  // 160 bits of cryptographic entropy (40 hex characters)
  return `sec_${crypto.randomBytes(20).toString('hex')}`;
}

export async function runSecretCodeMigration() {
  const client = await pool.connect();
  try {
    console.log('--- STARTING SECRET CODE DATABASE MIGRATION ---');

    // 1. Check if column secret_code exists in playlists table
    const checkColumn = await client.query(
      `SELECT EXISTS (
         SELECT 1 
         FROM information_schema.columns 
         WHERE table_name = 'playlists' AND column_name = 'secret_code'
       ) as exists;`
    );

    await client.query('BEGIN');

    if (!checkColumn.rows[0].exists) {
      console.log('1. Adding column "secret_code" to "playlists" table...');
      await client.query(`ALTER TABLE playlists ADD COLUMN IF NOT EXISTS secret_code VARCHAR(64);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_playlists_secret_code ON playlists(secret_code);`);
      console.log('✅ Column "secret_code" and index added successfully.');
    } else {
      console.log('ℹ️ Column "secret_code" already exists.');
    }

    // 2. Safely backfill any playlist that lacks a secret_code
    const emptyRows = await client.query(
      `SELECT id, name FROM playlists WHERE secret_code IS NULL OR secret_code = ''`
    );

    if (emptyRows.rows.length > 0) {
      console.log(`2. Backfilling secret codes for ${emptyRows.rows.length} existing playlist(s)...`);
      for (const row of emptyRows.rows) {
        const newSecret = generatePlaylistSecretCode();
        await client.query(
          `UPDATE playlists SET secret_code = $1 WHERE id = $2`,
          [newSecret, row.id]
        );
        console.log(`   - Playlist "${row.name}" (${row.id}) assigned secret code: ${newSecret}`);
      }
      console.log(`✅ Successfully backfilled ${emptyRows.rows.length} playlists.`);
    } else {
      console.log('✅ All existing playlists already have secret codes assigned.');
    }

    await client.query('COMMIT');
    console.log('🎉 --- SECRET CODE MIGRATION COMPLETED SUCCESSFULLY WITH ZERO DATA LOSS! ---');

    return { success: true, backfilledCount: emptyRows.rows.length };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Secret code migration failed! Rolled back completely.', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: node src/db/migrate_secret_code.js
if (process.argv[1] && process.argv[1].includes('migrate_secret_code')) {
  runSecretCodeMigration()
    .then((res) => {
      console.log('Migration Result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration execution error:', err);
      process.exit(1);
    });
}
