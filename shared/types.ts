export interface Player {
  id: string;
  name: string;
  vote?: number; // 1 to 5, or undefined if not voted yet
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

export interface GameSession {
  sessionId: string;
  hostSocketId?: string;
  status: 'LOBBY' | 'PLAYING' | 'LEADERBOARD';
  playlistId: string;
  currentVideoIndex: number;
  players: Record<string, Player>; // Map of playerId -> Player
  votes: Record<string, number>; // Map of playerId -> voteValue
}

export interface VotePayload {
  playerId: string;
  voteValue: number; // 1 to 5
}
