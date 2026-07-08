CREATE TABLE IF NOT EXISTS playlists (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  played_count INTEGER DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE,
  is_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  playlist_id VARCHAR(50) REFERENCES playlists(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  youtube_id VARCHAR(50) NOT NULL,
  anime_name VARCHAR(255),
  video_type VARCHAR(10),
  order_index INTEGER NOT NULL
);

-- Migration block to update existing database structures
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='played_count') THEN
    ALTER TABLE playlists ADD COLUMN played_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='last_played') THEN
    ALTER TABLE playlists ADD COLUMN last_played TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='is_validated') THEN
    ALTER TABLE playlists ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='created_at') THEN
    ALTER TABLE playlists ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Seed Default Playlist if not exists
INSERT INTO playlists (id, name, description, is_custom, is_validated)
VALUES ('anime-classics', 'Anime Classics', 'The most iconic Anime openings and endings of all time.', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Videos if not exists
INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'A Cruel Angel''s Thesis', 'nU21rCWkuJw', 'Neon Genesis Evangelion', 'OP', 0
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 'nU21rCWkuJw');

INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'Guren no Yumiya', '8OkpRK2_gVs', 'Attack on Titan', 'OP', 1
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = '8OkpRK2_gVs');

INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'Silhouette', 'zVgKnfN9i34', 'Naruto Shippuden', 'OP', 2
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 'zVgKnfN9i34');

INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'Unravel', '7aMOurgDB-o', 'Tokyo Ghoul', 'OP', 3
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = '7aMOurgDB-o');
