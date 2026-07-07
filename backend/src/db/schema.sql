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
SELECT 'anime-classics', 'A Cruel Angel''s Thesis', 't-QSmNReDyI', 'Neon Genesis Evangelion', 'OP', 0
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 't-QSmNReDyI');

INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'Guren no Yumiya', '8OkpRKvqdLA', 'Attack on Titan', 'OP', 1
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = '8OkpRKvqdLA');

INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'Silhouette', 'dlFA0Zq1k2A', 'Naruto Shippuden', 'OP', 2
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 'dlFA0Zq1k2A');

INSERT INTO videos (playlist_id, title, youtube_id, anime_name, video_type, order_index)
SELECT 'anime-classics', 'Unravel', 'uMeR2W19wT0', 'Tokyo Ghoul', 'OP', 3
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE playlist_id = 'anime-classics' AND youtube_id = 'uMeR2W19wT0');
