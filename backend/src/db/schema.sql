CREATE TABLE IF NOT EXISTS playlists (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE
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

-- Seed Default Playlist if not exists
INSERT INTO playlists (id, name, description, is_custom)
VALUES ('anime-classics', 'Anime Classics', 'The most iconic Anime openings and endings of all time.', FALSE)
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
