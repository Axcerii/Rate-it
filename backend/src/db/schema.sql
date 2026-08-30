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
  youtube_id VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255),
  description TEXT,
  mal_anime_id INTEGER,
  mal_title VARCHAR(255),
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

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_video_id ON playlist_tracks(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_mal_anime_id ON videos(mal_anime_id);
CREATE INDEX IF NOT EXISTS idx_ratings_youtube_id ON ratings(youtube_id);
CREATE INDEX IF NOT EXISTS idx_ratings_playlist_id ON ratings(playlist_id);

-- Seed Default Playlist if not exists
INSERT INTO playlists (id, name, description, is_custom, is_validated)
VALUES ('anime-classics', 'Anime Classics', 'The most iconic anime themes and music of all time.', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Videos if not exists
INSERT INTO videos (youtube_id, title, artist_name, description, mal_anime_id, mal_title)
VALUES 
  ('nU21rCWkuJw', 'Cruel Angel Thesis', 'Yoko Takahashi', 'Opening of Neon Genesis Evangelion from 1995', 30, 'Neon Genesis Evangelion'),
  ('8OkpRK2_gVs', 'Guren no Yumiya', 'Linked Horizon', 'Opening 1 of Attack on Titan from 2013', 16498, 'Attack on Titan'),
  ('zVgKnfN9i34', 'Silhouette', 'KANA-BOON', 'Opening 16 of Naruto Shippuden from 2014', 1735, 'Naruto Shippuden'),
  ('7aMOurgDB-o', 'Unravel', 'TK from Ling Tosite Sigure', 'Opening of Tokyo Ghoul from 2014', 22319, 'Tokyo Ghoul')
ON CONFLICT (youtube_id) DO NOTHING;

-- Seed playlist_tracks links for anime-classics
INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
SELECT 'anime-classics', v.id, 0 FROM videos v WHERE v.youtube_id = 'nU21rCWkuJw' AND NOT EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.playlist_id = 'anime-classics' AND pt.video_id = v.id);
INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
SELECT 'anime-classics', v.id, 1 FROM videos v WHERE v.youtube_id = '8OkpRK2_gVs' AND NOT EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.playlist_id = 'anime-classics' AND pt.video_id = v.id);
INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
SELECT 'anime-classics', v.id, 2 FROM videos v WHERE v.youtube_id = 'zVgKnfN9i34' AND NOT EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.playlist_id = 'anime-classics' AND pt.video_id = v.id);
INSERT INTO playlist_tracks (playlist_id, video_id, order_index)
SELECT 'anime-classics', v.id, 3 FROM videos v WHERE v.youtube_id = '7aMOurgDB-o' AND NOT EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.playlist_id = 'anime-classics' AND pt.video_id = v.id);


