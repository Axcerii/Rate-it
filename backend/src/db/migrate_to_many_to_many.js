import pool from './db.js';

export async function runManyToManyMigration() {
  const client = await pool.connect();
  try {
    console.log('--- STARTING MANY-TO-MANY DATABASE MIGRATION ---');

    // 1. Check if playlist_tracks already exists
    const checkTable = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'playlist_tracks'
       ) as exists;`
    );

    if (checkTable.rows[0].exists) {
      console.log('✅ Table "playlist_tracks" already exists. Migration already applied.');
      return { success: true, message: 'Already migrated' };
    }

    // Check if videos table exists to migrate from
    const checkVideos = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'videos'
       ) as exists;`
    );

    if (!checkVideos.rows[0].exists) {
      console.log('ℹ️ Table "videos" does not exist yet. Initializing new schema directly.');
      return { success: true, message: 'Fresh database' };
    }

    // Start transaction for zero-loss atomic migration
    await client.query('BEGIN');

    console.log('1. Creating backup tables before migration...');
    await client.query(`CREATE TABLE IF NOT EXISTS videos_pre_migration_backup AS SELECT * FROM videos;`);
    await client.query(`CREATE TABLE IF NOT EXISTS ratings_pre_migration_backup AS SELECT * FROM ratings;`);

    const initialVideosCountRes = await client.query('SELECT COUNT(*) as count, COUNT(DISTINCT youtube_id) as distinct_yt FROM videos;');
    const initialVideosCount = parseInt(initialVideosCountRes.rows[0].count, 10);
    const distinctYtCount = parseInt(initialVideosCountRes.rows[0].distinct_yt, 10);
    console.log(`📊 Found ${initialVideosCount} total track instances representing ${distinctYtCount} unique YouTube videos.`);

    console.log('2. Creating new catalog table "videos_catalog"...');
    await client.query(`
      CREATE TABLE videos_catalog (
        id SERIAL PRIMARY KEY,
        youtube_id VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        artist_name VARCHAR(255),
        description TEXT,
        mal_anime_id INTEGER,
        mal_title VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('3. Consolidating and deduplicating unique videos with best metadata...');
    await client.query(`
      INSERT INTO videos_catalog (youtube_id, title, artist_name, description, mal_anime_id, mal_title)
      SELECT DISTINCT ON (youtube_id)
        youtube_id,
        COALESCE(NULLIF(title, ''), 'Titre Inconnu') as title,
        artist_name,
        description,
        mal_anime_id,
        mal_title
      FROM videos
      ORDER BY youtube_id,
        (CASE WHEN mal_anime_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
        (CASE WHEN artist_name IS NOT NULL AND artist_name <> '' AND artist_name <> 'Unknown Artist' THEN 1 ELSE 0 END) DESC,
        LENGTH(COALESCE(description, '')) DESC,
        id ASC;
    `);

    const migratedUniqueCountRes = await client.query('SELECT COUNT(*) as count FROM videos_catalog;');
    const migratedUniqueCount = parseInt(migratedUniqueCountRes.rows[0].count, 10);
    console.log(`✅ Deduplicated into ${migratedUniqueCount} unique catalog videos.`);

    console.log('4. Creating junction table "playlist_tracks"...');
    await client.query(`
      CREATE TABLE playlist_tracks (
        id SERIAL PRIMARY KEY,
        playlist_id VARCHAR(50) NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        video_id INTEGER NOT NULL REFERENCES videos_catalog(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
      CREATE INDEX idx_playlist_tracks_video_id ON playlist_tracks(video_id);
    `);

    console.log('5. Populating "playlist_tracks" preserving playlist links and order_index...');
    await client.query(`
      INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
      SELECT v.playlist_id, vc.id, v.order_index
      FROM videos v
      JOIN videos_catalog vc ON v.youtube_id = vc.youtube_id
      ORDER BY v.playlist_id, v.order_index ASC;
    `);

    const migratedTracksCountRes = await client.query('SELECT COUNT(*) as count FROM playlist_tracks;');
    const migratedTracksCount = parseInt(migratedTracksCountRes.rows[0].count, 10);
    console.log(`✅ Successfully created ${migratedTracksCount} playlist track relationships.`);

    console.log('6. Updating "ratings" foreign keys...');
    await client.query(`ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_video_id_fkey;`);
    await client.query(`
      UPDATE ratings r
      SET video_id = vc.id
      FROM videos_catalog vc
      WHERE r.youtube_id = vc.youtube_id;
    `);

    console.log('7. Finalizing table swap and foreign key constraints...');
    await client.query(`DROP TABLE videos CASCADE;`);
    await client.query(`ALTER TABLE videos_catalog RENAME TO videos;`);
    await client.query(`
      ALTER TABLE playlist_tracks 
      DROP CONSTRAINT IF EXISTS playlist_tracks_video_id_fkey;
      
      ALTER TABLE playlist_tracks 
      ADD CONSTRAINT playlist_tracks_video_id_fkey 
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;

      ALTER TABLE ratings 
      ADD CONSTRAINT ratings_video_id_fkey 
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
      CREATE INDEX IF NOT EXISTS idx_videos_mal_anime_id ON videos(mal_anime_id);
    `);

    // Integrity Check
    if (distinctYtCount !== migratedUniqueCount) {
      throw new Error(`Integrity check failed: Expected ${distinctYtCount} unique videos, got ${migratedUniqueCount}`);
    }
    if (initialVideosCount !== migratedTracksCount) {
      throw new Error(`Integrity check failed: Expected ${initialVideosCount} playlist tracks, got ${migratedTracksCount}`);
    }

    await client.query('COMMIT');
    console.log('🎉 --- MIGRATION COMPLETED SUCCESSFULLY WITH ZERO DATA LOSS! ---');

    return {
      success: true,
      initialVideos: initialVideosCount,
      uniqueVideos: migratedUniqueCount,
      playlistTracks: migratedTracksCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed! Rolled back completely to original state.', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: node src/db/migrate_to_many_to_many.js
if (process.argv[1] && process.argv[1].includes('migrate_to_many_to_many')) {
  runManyToManyMigration()
    .then((res) => {
      console.log('Migration Result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration execution error:', err);
      process.exit(1);
    });
}
