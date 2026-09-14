export const ANIME_SYNONYMS = {
  'neon genesis evangelion': ['neon genesis evangelion', 'evangelion', 'shinseiki evangelion'],
  'attack on titan': ['attack on titan', 'shingeki no kyojin', 'snk'],
  'naruto shippuden': ['naruto shippuden', 'naruto shippuuden', 'naruto: shippuuden', 'naruto'],
  'tokyo ghoul': ['tokyo ghoul', 'tokyo kushushu', 'tokyo ghoul:re']
};

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes text for comparison by converting to lowercase,
 * removing accents, removing season/part suffixes, and stripping special characters.
 */
export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/season\s+\d+|2nd season|3rd season|\d+nd season|\d+rd season|\d+th season|part\s+\d+|cour\s+\d+/gi, '') // remove season identifiers
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compares two anime titles cleanly using exact match, synonyms, or whole-word match.
 */
export function isAnimeTitleMatch(titleA, titleB) {
  if (!titleA || !titleB) return false;
  const a = normalizeText(titleA);
  const b = normalizeText(titleB);
  if (!a || !b) return false;

  // Exact normalized match
  if (a === b) return true;

  // Dictionary synonyms match
  for (const synonyms of Object.values(ANIME_SYNONYMS)) {
    const normSynonyms = synonyms.map(normalizeText);
    const hasA = normSynonyms.some(s => s === a || (s.length >= 4 && a.includes(s)));
    const hasB = normSynonyms.some(s => s === b || (s.length >= 4 && b.includes(s)));
    if (hasA && hasB) return true;
  }

  // Word-boundary matching only if both strings are substantial (>= 4 characters)
  // to avoid false positives like "k" in "k-on" or "nana" in "nanatsu no taizai"
  if (a.length >= 4 && b.length >= 4) {
    const regexA = new RegExp(`(^|\\s)${escapeRegex(a)}(\\s|$)`);
    const regexB = new RegExp(`(^|\\s)${escapeRegex(b)}(\\s|$)`);
    if (regexA.test(b) || regexB.test(a)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters a list of database videos against a user's MAL/AniList completed anime list.
 *
 * @param {Array} videos - Array of video objects from DB (with title, artistName, description, youtubeId, malAnimeId, malTitle, anilistId, anilistTitle)
 * @param {Array} malTitles - Array of MAL/AniList title entries ({ animeId, anilistId, title, englishTitle, synonyms })
 * @returns {Array} Matched and deduplicated video objects
 */
export function filterVideosByMalList(videos, malTitles) {
  if (!Array.isArray(videos) || !Array.isArray(malTitles) || malTitles.length === 0) {
    return [];
  }

  const matchedVideos = videos.filter((video) => {
    // 1. Primary check: Exact MAL Anime ID match if specified on video
    if (video.malAnimeId || video.mal_anime_id) {
      const parsedVideoMalId = parseInt(video.malAnimeId || video.mal_anime_id, 10);
      const hasDirectIdMatch = malTitles.some(entry => entry.animeId && parseInt(entry.animeId, 10) === parsedVideoMalId);
      if (hasDirectIdMatch) return true;
    }

    // 1b. Direct AniList ID match if specified on video
    if (video.anilistId || video.anilist_id) {
      const parsedVideoAnilistId = parseInt(video.anilistId || video.anilist_id, 10);
      const hasDirectAnilistMatch = malTitles.some(entry => entry.anilistId && parseInt(entry.anilistId, 10) === parsedVideoAnilistId);
      if (hasDirectAnilistMatch) return true;
    }

    // 2. Secondary check: Explicit Anime Title match (malTitle or anilistTitle)
    const explicitAnimeTitle = video.malTitle || video.mal_title || video.anilistTitle || video.anilist_title;
    if (explicitAnimeTitle) {
      const hasTitleMatch = malTitles.some(entry => {
        const candidateTitles = [
          entry.title,
          entry.englishTitle,
          ...(Array.isArray(entry.synonyms) ? entry.synonyms : []),
        ].filter(Boolean);

        return candidateTitles.some(cTitle => isAnimeTitleMatch(explicitAnimeTitle, cTitle));
      });
      if (hasTitleMatch) return true;
    }

    // 3. Fallback: ONLY check description if NO explicit anime title is specified on the video.
    // NEVER search song title or artist name, and NEVER check if anime title contains the song/description!
    // This allows legacy tracks that only noted the anime in the description (e.g. "Opening - Violet Evergarden")
    // to be matched strictly against the anime title, using whole word boundaries.
    if (!explicitAnimeTitle && video.description) {
      const normDesc = normalizeText(video.description);
      if (normDesc.length >= 4) {
        const hasDescMatch = malTitles.some(entry => {
          const candidateTitles = [
            entry.title,
            entry.englishTitle,
            ...(Array.isArray(entry.synonyms) ? entry.synonyms : []),
          ].filter(Boolean);

          return candidateTitles.some(cTitle => {
            const normMal = normalizeText(cTitle);
            if (!normMal || normMal.length < 4) return false;
            // Check if the complete anime title is present in description as complete words
            const malRegex = new RegExp(`(^|\\s)${escapeRegex(normMal)}(\\s|$)`);
            return malRegex.test(normDesc);
          });
        });
        if (hasDescMatch) return true;
      }
    }

    return false;
  });

  // Deduplicate matched videos by youtubeId (or fallback key)
  const seenYoutubeIds = new Set();
  return matchedVideos.filter((video) => {
    const key = video.youtubeId || video.youtube_id || video.id;
    if (!key || seenYoutubeIds.has(key)) {
      return false;
    }
    seenYoutubeIds.add(key);
    return true;
  });
}
