export interface Player {
  id: string;
  name: string;
  vote?: number; // 1 to 5, or undefined if not voted yet
  hasSkipped?: boolean;
  isConnected: boolean;
}

export interface Video {
  id: string;
  title: string;
  youtubeId: string;
  animeName?: string;
  type?: 'OP' | 'ED' | 'OTHER';
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
  animeName: string;
  type: string;
  average: number;
  votesCount: number;
  twitchAverage?: number;
  twitchVotesCount?: number;
}

export interface GameSession {
  sessionId: string;
  hostSocketId?: string;
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
