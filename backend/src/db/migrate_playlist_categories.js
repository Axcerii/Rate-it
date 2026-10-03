import pool from './db.js';

export const ALLOWED_CATEGORIES = [
  'Film/Cinéma',
  'Série/TV',
  'Anime/Manga',
  'Musique',
  'Streaming/VTuber',
  'Youtube',
  'KPop',
  'JPop',
  'Jeux Vidéo',
  'Dessins Animés/Cartoons',
];

export async function runPlaylistCategoriesMigration() {
  const client = await pool.connect();
  try {
    console.log('--- Checking & Migrating Playlist Categories Column ---');
    await client.query('BEGIN');

    // 1. Add categories column to playlists table if it does not exist
    await client.query(`
      ALTER TABLE playlists
      ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}'
    `);

    // 2. Add GIN index for efficient array filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_playlists_categories 
      ON playlists USING GIN(categories)
    `);

    // 3. Backfill existing default / known playlists with categories if empty
    const defaultCategoriesMap = [
      { id: 'PL-91XO0F', categories: ['Anime/Manga', 'Musique'] },
      { id: 'PL-4ZX0HO', categories: ['Anime/Manga', 'Musique'] },
      { id: 'PL-QXQ7NB', categories: ['Anime/Manga', 'Musique'] },
      { id: 'PL-XFNVMB', categories: ['Streaming/VTuber', 'Musique', 'JPop'] },
      { id: 'PL-F7IELO', categories: ['Anime/Manga', 'Musique'] },
      { id: 'PL-O7Y0P6', categories: ['Anime/Manga', 'Musique'] },
      { id: 'PL-7JCGV4', categories: ['Anime/Manga', 'Musique'] },
      { id: 'PL-A5Q8BI', categories: ['Anime/Manga', 'Musique'] },
      { id: 'anime-classics', categories: ['Anime/Manga', 'Musique'] },
    ];

    for (const item of defaultCategoriesMap) {
      await client.query(
        `UPDATE playlists 
         SET categories = $1 
         WHERE id = $2 AND (categories IS NULL OR categories = '{}')`,
        [item.categories, item.id]
      );
    }

    // 4. Create playlist_categories table if it does not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlist_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Seed initial categories if table is empty
    const catCountRes = await client.query('SELECT COUNT(*) FROM playlist_categories');
    if (parseInt(catCountRes.rows[0].count, 10) === 0) {
      for (const cat of ALLOWED_CATEGORIES) {
        await client.query(
          'INSERT INTO playlist_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [cat]
        );
      }
    }

    // 6. Ensure any existing categories from playlists are also registered
    await client.query(`
      INSERT INTO playlist_categories (name)
      SELECT DISTINCT unnest(categories)
      FROM playlists
      WHERE categories IS NOT NULL AND array_length(categories, 1) > 0
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Playlist categories migration completed successfully.');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error running playlist categories migration:', error);
    throw error;
  } finally {
    client.release();
  }
}
