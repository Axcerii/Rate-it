import { validateMalUsername } from '../utils/security.js';

/**
 * Service to fetch public completed anime list for a MyAnimeList username.
 * Uses the public unauthenticated load.json endpoint.
 */
export async function fetchUserCompletedAnime(username) {
  const cleanUsername = validateMalUsername(username);
  if (!cleanUsername) {
    throw new Error('Nom d\'utilisateur MyAnimeList invalide (2-20 caractères alphanumériques)');
  }

  const url = `https://myanimelist.net/animelist/${encodeURIComponent(cleanUsername)}/load.json?status=2`;

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
        throw new Error('Nom d\'utilisateur MAL introuvable');
      }
      throw new Error(`L'API MAL a renvoyé le statut ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Format de réponse invalide de MyAnimeList (profil peut-être privé)');
    }

    // Extract titles and MAL anime_id (both original romaji, English title, and MAL ID)
    return data.map((entry) => ({
      animeId: entry.anime_id,
      title: entry.anime_title,
      englishTitle: entry.anime_title_eng,
    }));
  } catch (error) {
    console.error(`Error fetching MAL list for user ${cleanUsername}:`, error);
    throw new Error(error.message || 'Échec de la récupération du profil MyAnimeList');
  }
}
