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
