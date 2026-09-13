import { validateAnilistUsername } from '../utils/security.js';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

/**
 * Service to fetch public completed anime list for an AniList username.
 * Uses the public GraphQL endpoint without authentication.
 */
export async function fetchUserCompletedAnimeFromAnilist(username) {
  const cleanUsername = validateAnilistUsername(username);
  if (!cleanUsername) {
    throw new Error("Nom d'utilisateur AniList invalide (2-30 caractères alphanumériques)");
  }

  const query = `
    query ($userName: String) {
      MediaListCollection (userName: $userName, type: ANIME, status: COMPLETED) {
        lists {
          name
          entries {
            media {
              id
              idMal
              title {
                romaji
                english
                native
              }
              synonyms
            }
          }
        }
      }
    }
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Rate-it-Quiz/1.0',
      },
      body: JSON.stringify({
        query,
        variables: { userName: cleanUsername },
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Nom d'utilisateur AniList introuvable");
      }
      if (response.status === 429) {
        throw new Error("Trop de requêtes vers AniList, veuillez patienter quelques secondes");
      }
      throw new Error(`L'API AniList a renvoyé le statut ${response.status}`);
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      const isNotFound = data.errors.some((e) => e.status === 404 || e.message?.toLowerCase().includes('not found'));
      if (isNotFound) {
        throw new Error("Profil ou nom d'utilisateur AniList introuvable");
      }
      throw new Error(`AniList: ${data.errors[0].message}`);
    }

    const lists = data.data?.MediaListCollection?.lists;
    if (!Array.isArray(lists)) {
      throw new Error("Format de réponse invalide d'AniList (profil peut-être privé)");
    }

    const uniqueMap = new Map();

    for (const list of lists) {
      const entries = list.entries || [];
      for (const entry of entries) {
        const media = entry.media;
        if (!media) continue;

        if (!uniqueMap.has(media.id)) {
          uniqueMap.set(media.id, {
            animeId: media.idMal || null, // MAL ID if present
            anilistId: media.id,          // AniList ID
            title: media.title?.romaji || media.title?.english || '',
            englishTitle: media.title?.english || '',
            synonyms: Array.isArray(media.synonyms) ? media.synonyms : [],
          });
        }
      }
    }

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error(`Error fetching AniList list for user ${cleanUsername}:`, error);
    throw new Error(error.message || "Échec de la récupération du profil AniList");
  }
}
