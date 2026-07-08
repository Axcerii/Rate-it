/**
 * Service to fetch public completed anime list for a MyAnimeList username.
 * Uses the public unauthenticated load.json endpoint.
 */
export async function fetchUserCompletedAnime(username) {
  if (!username) return [];

  const url = `https://myanimelist.net/animelist/${encodeURIComponent(username)}/load.json?status=2`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('MAL Username not found');
      }
      throw new Error(`MAL API returned status ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from MyAnimeList (possibly private profile)');
    }

    // Extract titles (both original romaji and English title if present)
    return data.map((entry) => ({
      title: entry.anime_title,
      englishTitle: entry.anime_title_eng,
    }));
  } catch (error) {
    console.error(`Error fetching MAL list for user ${username}:`, error);
    throw new Error(error.message || 'Failed to fetch MyAnimeList profile');
  }
}
