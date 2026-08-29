export const ANIME_SYNONYMS = {
  'neon genesis evangelion': ['neon genesis evangelion', 'evangelion', 'shinseiki evangelion'],
  'attack on titan': ['attack on titan', 'shingeki no kyojin', 'snk'],
  'naruto shippuden': ['naruto shippuden', 'naruto shippuuden', 'naruto: shippuuden', 'naruto'],
  'tokyo ghoul': ['tokyo ghoul', 'tokyo kushushu', 'tokyo ghoul:re']
};

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
 * Filters a list of database videos against a user's MAL completed anime list.
 *
 * @param {Array} videos - Array of video objects from DB (with title, artistName, description, youtubeId, malAnimeId, malTitle)
 * @param {Array} malTitles - Array of MAL title entries ({ animeId, title, englishTitle })
 * @returns {Array} Matched and deduplicated video objects
 */
export function filterVideosByMalList(videos, malTitles) {
  if (!Array.isArray(videos) || !Array.isArray(malTitles) || malTitles.length === 0) {
    return [];
  }

  const matchedVideos = videos.filter((video) => {
    // 1. Primary check: Exact MAL Anime ID match if specified on video
    if (video.malAnimeId) {
      const parsedVideoMalId = parseInt(video.malAnimeId, 10);
      const hasDirectIdMatch = malTitles.some(entry => entry.animeId && parseInt(entry.animeId, 10) === parsedVideoMalId);
      if (hasDirectIdMatch) return true;
    }

    // 2. Secondary check: Explicit MAL Anime Title match if specified on video
    if (video.malTitle) {
      const normExplicitMalTitle = normalizeText(video.malTitle);
      if (normExplicitMalTitle.length >= 2) {
        const hasExplicitTitleMatch = malTitles.some(entry => {
          const normEntryTitle = normalizeText(entry.title);
          const normEntryEngTitle = normalizeText(entry.englishTitle);
          return (
            (normEntryTitle && (normEntryTitle.includes(normExplicitMalTitle) || normExplicitMalTitle.includes(normEntryTitle))) ||
            (normEntryEngTitle && (normEntryEngTitle.includes(normExplicitMalTitle) || normExplicitMalTitle.includes(normEntryEngTitle)))
          );
        });
        if (hasExplicitTitleMatch) return true;
      }
    }

    // 3. Fallback: Fuzzy matching against video description, title, and artist name
    const normDescription = normalizeText(video.description);
    const normTitle = normalizeText(video.title);
    const normArtist = normalizeText(video.artistName);
    const textToSearch = `${normDescription} ${normArtist} ${normTitle}`;

    return malTitles.some((entry) => {
      const rawTitles = [entry.title, entry.englishTitle].filter(Boolean);

      return rawTitles.some((raw) => {
        const normMal = normalizeText(raw);
        if (!normMal || normMal.length < 3) return false;

        // Direct inclusion in either direction
        if (
          textToSearch.includes(normMal) ||
          (normDescription && normMal.includes(normDescription)) ||
          (normTitle && normMal.includes(normTitle))
        ) {
          return true;
        }

        // Synonyms lookup
        for (const synonyms of Object.values(ANIME_SYNONYMS)) {
          const hasVideoSyn = synonyms.some((s) => textToSearch.includes(normalizeText(s)));
          const hasMalSyn = synonyms.some((s) => normMal.includes(normalizeText(s)));

          if (hasVideoSyn && hasMalSyn) {
            return true;
          }
        }

        // Significant word / token matching
        const malWords = normMal.split(' ').filter((w) => w.length >= 3 && !['the', 'and', 'for', 'you', 'movie', 'specials'].includes(w));
        if (malWords.length >= 2) {
          const allWordsPresent = malWords.every((word) => textToSearch.includes(word));
          if (allWordsPresent) return true;
        }

        return false;
      });
    });
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
