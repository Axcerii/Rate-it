// Helpers for the anime tracks shown in the host lobby (MyAnimeList / AniList mode)

export type AnimeTrackKind = 'opening' | 'ending';

// Descriptions follow "Opening 4 - BLEACH" / "Ending 2 - BLEACH". Anything not marked as an ending
// counts as an opening. "ED" is only read in capitals, so that a word ending in "ed" is not taken for it.
export function getTrackKind(track: any): AnimeTrackKind {
  const description = typeof track?.description === 'string' ? track.description : '';
  if (/\bendings?\b/i.test(description) || /\bED\s?\d*\b/.test(description)) return 'ending';
  return 'opening';
}

export function getTrackOpeningBadge(track: any, fallbackIndex: number): string {
  const prefix = getTrackKind(track) === 'ending' ? 'ED' : 'OP';
  if (track.description && typeof track.description === 'string') {
    const match = track.description.match(prefix === 'ED' ? /(?:Ending|ED)\s*(\d+)/i : /(?:Opening|OP)\s*(\d+)/i);
    if (match) return `${prefix} ${match[1]}`;
  }
  return `${prefix} ${fallbackIndex + 1}`;
}

export function extractAnimeUsername(input: string, platform: 'mal' | 'anilist'): string {
  if (!input) return '';
  let str = input.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (str.includes('/')) {
    if (platform === 'anilist') {
      const match = str.match(/anilist\.co\/user\/([a-zA-Z0-9_-]+)/i);
      if (match) return match[1];
    } else {
      const match = str.match(/myanimelist\.net\/(?:profile|animelist)\/([a-zA-Z0-9_-]+)/i);
      if (match) return match[1];
    }
    const segments = str.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^[a-zA-Z0-9_-]{2,30}$/.test(last)) {
      return last;
    }
  }
  return str;
}

export function getTrackAnimeTitle(track: any): string {
  if (track.matchedAnimeTitle && typeof track.matchedAnimeTitle === 'string' && track.matchedAnimeTitle.trim()) {
    return track.matchedAnimeTitle.trim();
  }
  if (track.malTitle && typeof track.malTitle === 'string' && track.malTitle.trim()) {
    return track.malTitle.trim();
  }
  if (track.anilistTitle && typeof track.anilistTitle === 'string' && track.anilistTitle.trim()) {
    return track.anilistTitle.trim();
  }
  if (track.description && typeof track.description === 'string') {
    const cleaned = track.description
      .replace(/^(Opening|Ending|OP|ED|Insert\s*Song|OST)\s*\d*\s*[-–:]\s*/i, '')
      .replace(/\s*[-–:]\s*(Opening|Ending|OP|ED|Insert\s*Song|OST)\s*\d*$/i, '')
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }
  return track.title || 'Autre Animé';
}

export const ANIME_FOLDER_THEMES = [
  {
    key: 'create',
    name: 'Créer',
    // Rayures diagonales vertes (thème Créer : #2fc355 avec teinte ton sur ton plus claire #61e283)
    bgPattern: 'repeating-linear-gradient(-45deg, #2fc355 0px, #2fc355 12px, #61e283 12px, #61e283 24px)',
    headerBg: 'bg-[#2fc355] hover:bg-[#28b34e]',
    headerText: 'text-black',
    folderIconClass: 'text-black/80',
  },
  {
    key: 'host',
    name: 'Host',
    // Rayures diagonales bleues (thème Host : #24B3F1 avec teinte ton sur ton plus claire #6ecefa)
    bgPattern: 'repeating-linear-gradient(-45deg, #24B3F1 0px, #24B3F1 12px, #6ecefa 12px, #6ecefa 24px)',
    headerBg: 'bg-[#24B3F1] hover:bg-[#0BA6EB]',
    headerText: 'text-black',
    folderIconClass: 'text-black/80',
  },
  {
    key: 'play',
    name: 'Play',
    // Rayures diagonales roses / fuchsia (thème Play : #DD4DCC avec teinte ton sur ton plus claire #ea8fe0)
    bgPattern: 'repeating-linear-gradient(-45deg, #DD4DCC 0px, #DD4DCC 12px, #ea8fe0 12px, #ea8fe0 24px)',
    headerBg: 'bg-[#DD4DCC] hover:bg-[#C933B7]',
    headerText: 'text-white',
    folderIconClass: 'text-white',
  },
] as const;
