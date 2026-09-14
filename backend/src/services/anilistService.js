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

/**
 * Resolves AniList metadata for an anime given its MAL ID, AniList ID, or Title.
 * Returns { anilistId, anilistTitle, idMal } or null.
 */
export async function resolveAnilistForAnime({ malAnimeId, malTitle, title, anilistId } = {}) {
  const malId = malAnimeId ? parseInt(malAnimeId, 10) : null;
  const cleanAnilistId = anilistId ? parseInt(anilistId, 10) : null;

  // 1. Try resolving by MAL ID (fast and 100% exact via AniList idMal index)
  if (malId && !isNaN(malId)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const query = `
        query ($malId: Int) {
          Media(idMal: $malId, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
            }
          }
        }
      `;
      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Rate-it-Quiz/1.0' },
        body: JSON.stringify({ query, variables: { malId } }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const media = json.data?.Media;
        if (media) {
          return {
            anilistId: media.id,
            anilistTitle: media.title?.romaji || media.title?.english || 'Titre Inconnu',
            idMal: media.idMal || malId,
          };
        }
      }
    } catch (e) {
      console.warn('AniList MAL ID auto-resolve failed:', e.message);
    }
  }

  // 2. Try resolving by AniList ID if provided (fills in MAL ID and title)
  if (cleanAnilistId && !isNaN(cleanAnilistId)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
            }
          }
        }
      `;
      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Rate-it-Quiz/1.0' },
        body: JSON.stringify({ query, variables: { id: cleanAnilistId } }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const media = json.data?.Media;
        if (media) {
          return {
            anilistId: media.id,
            anilistTitle: media.title?.romaji || media.title?.english || 'Titre Inconnu',
            idMal: media.idMal || null,
          };
        }
      }
    } catch (e) {
      console.warn('AniList ID auto-resolve failed:', e.message);
    }
  }

  // 3. Fallback: try resolving by title (malTitle or title)
  const searchTitle = malTitle || title;
  if (searchTitle && String(searchTitle).trim().length >= 2) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
            }
          }
        }
      `;
      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Rate-it-Quiz/1.0' },
        body: JSON.stringify({ query, variables: { search: String(searchTitle).trim() } }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const media = json.data?.Media;
        if (media) {
          return {
            anilistId: media.id,
            anilistTitle: media.title?.romaji || media.title?.english || 'Titre Inconnu',
            idMal: media.idMal || null,
          };
        }
      }
    } catch (e) {
      console.warn('AniList search auto-resolve failed:', e.message);
    }
  }

  return null;
}


