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
  artist_name VARCHAR(255),
  description TEXT,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  youtube_id VARCHAR(50) NOT NULL,
  playlist_id VARCHAR(50),
  session_id VARCHAR(50),
  player_name VARCHAR(100),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  source VARCHAR(20) DEFAULT 'PLAYER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratings_youtube_id ON ratings(youtube_id);
CREATE INDEX IF NOT EXISTS idx_ratings_playlist_id ON ratings(playlist_id);

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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='artist_name') THEN
    ALTER TABLE videos ADD COLUMN artist_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='description') THEN
    ALTER TABLE videos ADD COLUMN description TEXT;
  END IF;
END $$;

-- Seed Default Playlist if not exists
INSERT INTO playlists (id, name, description, is_custom, is_validated)
VALUES ('anime-classics', 'Anime Classics', 'The most iconic anime themes and music of all time.', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Videos if not exists
INSERT INTO videos (playlist_id, title, youtube_id, artist_name, description, order_index)
SELECT 'anime-classics', 'Cruel Angel Thesis', 'nU21rCWkuJw', 'Yoko Takahashi', 'Opening of Neon Genesis Evangelion from 1995', 0
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 'nU21rCWkuJw');

INSERT INTO videos (playlist_id, title, youtube_id, artist_name, description, order_index)
SELECT 'anime-classics', 'Guren no Yumiya', '8OkpRK2_gVs', 'Linked Horizon', 'Opening 1 of Attack on Titan from 2013', 1
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = '8OkpRK2_gVs');

INSERT INTO videos (playlist_id, title, youtube_id, artist_name, description, order_index)
SELECT 'anime-classics', 'Silhouette', 'zVgKnfN9i34', 'KANA-BOON', 'Opening 16 of Naruto Shippuden from 2014', 2
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 'zVgKnfN9i34');

INSERT INTO videos (playlist_id, title, youtube_id, artist_name, description, order_index)
SELECT 'anime-classics', 'Unravel', '7aMOurgDB-o', 'TK from Ling Tosite Sigure', 'Opening of Tokyo Ghoul from 2014', 3
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = '7aMOurgDB-o');
