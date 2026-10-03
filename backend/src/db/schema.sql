CREATE TABLE IF NOT EXISTS playlist_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlists (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  played_count INTEGER DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE,
  is_validated BOOLEAN DEFAULT FALSE,
  secret_code VARCHAR(64),
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  youtube_id VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255),
  description TEXT,
  mal_anime_id INTEGER,
  mal_title VARCHAR(255),
  anilist_id INTEGER,
  anilist_title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id SERIAL PRIMARY KEY,
  playlist_id VARCHAR(50) NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- Ensure columns exist on tables created in older versions before creating indexes
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS played_count INTEGER DEFAULT 0;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS last_played TIMESTAMP WITH TIME ZONE;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS secret_code VARCHAR(64);
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

ALTER TABLE videos ADD COLUMN IF NOT EXISTS mal_anime_id INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mal_title VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS anilist_id INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS anilist_title VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_video_id ON playlist_tracks(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_mal_anime_id ON videos(mal_anime_id);
CREATE INDEX IF NOT EXISTS idx_videos_anilist_id ON videos(anilist_id);
CREATE INDEX IF NOT EXISTS idx_ratings_youtube_id ON ratings(youtube_id);
CREATE INDEX IF NOT EXISTS idx_ratings_playlist_id ON ratings(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlists_secret_code ON playlists(secret_code);
CREATE INDEX IF NOT EXISTS idx_playlists_categories ON playlists USING GIN(categories);




