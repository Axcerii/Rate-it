export interface Player {
  id: string;
  name: string;
  vote?: number; // 1 to 5, or undefined if not voted yet
  hasSkipped?: boolean;
  isConnected: boolean;
  isHost?: boolean;
}

export interface Video {
  id: string;
  title: string;        // Song Name
  youtubeId: string;
  artistName?: string;  // Artist Name
  description?: string; // Description
  malAnimeId?: number;  // Optional MyAnimeList Anime ID
  malTitle?: string;    // Optional MyAnimeList Anime Title
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videos: Video[];
  isCustom: boolean;
}

export interface VideoResult {
  id: string;
  title: string;
  youtubeId: string;
  artistName?: string;
  description?: string;
  malAnimeId?: number;
  malTitle?: string;
  average: number;
  votesCount: number;
  twitchAverage?: number;
  twitchVotesCount?: number;
  historicalAverage?: number;
  historicalVotesCount?: number;
  playerVotes?: Record<string, number>;
}

export interface TrackStats {
  youtubeId: string;
  title?: string;
  artistName?: string;
  description?: string;
  totalVotes: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface GameSession {
  sessionId: string;
  hostSocketId?: string;
  hostPlayerId?: string;
  hostToken?: string;
  isHostPlayer?: boolean;
  status: 'LOBBY' | 'PLAYING' | 'LEADERBOARD';
  phase?: 'VOTING' | 'REVEAL'; // Phase within PLAYING status
  playlistId: string;
  currentVideoIndex: number;
  videos?: Video[]; // List of videos loaded in active session
  players: Record<string, Player>; // Map of playerId -> Player
  votes: Record<string, number>; // Map of playerId -> voteValue
  skips?: Record<string, boolean>; // Map of playerId -> hasSkipped in VOTING phase
  revealSkips?: Record<string, boolean>; // Map of playerId -> hasSkipped in REVEAL phase
  results?: Record<string, VideoResult>; // Map of videoId -> VideoResult accumulated
  twitchChannel?: string | null;
  twitchVotes?: Record<string, number>; // Map of username -> voteValue
  disabledVideoIds?: Record<string, boolean>; // Map of videoId -> isDisabled
}

export interface VotePayload {
  playerId: string;
  voteValue: number; // 1 to 5
}

