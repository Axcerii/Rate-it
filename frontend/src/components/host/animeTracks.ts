// Helpers for the anime tracks shown in the host lobby (MyAnimeList / AniList mode)

export function getTrackOpeningBadge(track: any, fallbackIndex: number): string {
  if (track.description && typeof track.description === 'string') {
    const match = track.description.match(/(?:Opening|OP)\s*(\d+)/i);
    if (match) return `OP ${match[1]}`;
    const edMatch = track.description.match(/(?:Ending|ED)\s*(\d+)/i);
    if (edMatch) return `ED ${edMatch[1]}`;
    if (/Opening|OP/i.test(track.description)) return `OP ${fallbackIndex + 1}`;
  }
  return `OP ${fallbackIndex + 1}`;
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
