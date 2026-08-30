'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameSession } from '../../../shared/types';

export type BannerType = 'error' | 'announcement' | 'info' | 'success' | 'warning';

export interface BannerNotice {
  id: string;
  message: string;
  sender?: string;
  type?: BannerType;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  session: GameSession | null;
  isHost: boolean;
  playerId: string;
  banner: BannerNotice | null;
  showBanner: (message: string, type?: BannerType, duration?: number, sender?: string) => void;
  hideBanner: () => void;
  createRoom: (options?: { isHostPlayer?: boolean; hostName?: string }) => Promise<GameSession>;
  toggleHostPlayer: (isHostPlayer: boolean, hostName?: string) => Promise<GameSession>;
  joinRoom: (sessionId: string, playerName: string) => Promise<GameSession>;
  leaveRoom: () => void;
  deleteRoom: () => Promise<void>;
  startGame: (malUsername?: string, playlistId?: string) => Promise<GameSession>;
  nextVideo: () => Promise<GameSession>;
  previousVideo: () => Promise<GameSession>;
  showResults: () => Promise<GameSession>;
  toggleSkip: () => Promise<boolean>;
  submitVote: (voteValue: number) => Promise<number>;
  connectTwitch: (channelName: string) => Promise<string>;
  disconnectTwitch: () => Promise<void>;
  getPlaylists: () => Promise<{ validated: any[]; community: any[] }>;
  createPlaylist: (name: string, description: string, videos: any[]) => Promise<string>;
  getPlaylistDetails: (id: string) => Promise<{ playlist: any; videos: any[] }>;
  searchVideos: (query: string) => Promise<any[]>;
  toggleLobbyVideo: (videoId: string) => Promise<any>;
  validatePlaylist: (id: string, isValidated: boolean, password?: string) => Promise<void>;
  deletePlaylist: (id: string, password?: string) => Promise<void>;
  cleanStalePlaylists: (password?: string) => Promise<number>;
  getMalVideos: (username: string) => Promise<any[]>;
  getVideoStats: (youtubeId: string) => Promise<any>;
  getGlobalStats: (password?: string) => Promise<{ overall: any; topTracks: any[]; worstTracks: any[] }>;
  adminAddVideo: (playlistId: string, title: string, youtubeId: string, artistName: string, description: string, malAnimeId?: number | string, malTitle?: string, password?: string) => Promise<string>;
  adminDeleteVideo: (playlistId: string, videoId: string, password?: string) => Promise<void>;
  adminDeleteVideoDirect: (videoId: string | number, password?: string) => Promise<void>;
  adminUpdateVideo: (videoId: string | number, videoData: { title: string; youtubeId: string; artistName?: string; description?: string; malAnimeId?: number | string; malTitle?: string }, password?: string) => Promise<any>;
  adminSearchVideos: (query?: string, limit?: number, offset?: number, password?: string) => Promise<{ videos: any[]; total: number }>;
  verifyVideo: (youtubeId: string) => Promise<{ valid: boolean; title?: string; author?: string; error?: string }>;
}

const SocketContext = createContext<SocketContextType | null>(null);

const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // 1. If accessing frontend directly on port 3000 (dev server or direct container)
    // the backend Socket.io server is on port 4000
    if (port === '3000') {
      return `${protocol}//${hostname}:4000`;
    }

    // 2. If explicit NEXT_PUBLIC_WS_URL is set
    if (process.env.NEXT_PUBLIC_WS_URL) {
      const envUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (!isLocalhost && envUrl.includes('localhost')) {
        return window.location.origin;
      }
      return envUrl;
    }

    // 3. Production behind reverse proxy (Nginx on port 80/443)
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  // Banner state
  const [banner, setBanner] = useState<BannerNotice | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hideBanner = () => {
    setBanner(null);
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  };

  const showBanner = (
    message: string,
    type: BannerType = 'error',
    duration = 12000,
    sender?: string
  ) => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setBanner({
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      sender,
    });

    if (duration > 0) {
      bannerTimerRef.current = setTimeout(() => {
        setBanner(null);
      }, duration);
    }
  };

  // Generate or retrieve player ID on mount
  useEffect(() => {
    let id = localStorage.getItem('rate_it_player_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('rate_it_player_id', id);
    }
    setPlayerId(id);

    // Sync isHostRef if active session exists in localStorage
    const hostSessionId = localStorage.getItem('rate_it_host_session_id');
    if (hostSessionId) {
      isHostRef.current = true;
      setIsHost(true);
    }
  }, []);

  const sessionRef = useRef<GameSession | null>(null);
  const playerNameRef = useRef<string>('');
  const playerIdRef = useRef<string>('');
  const isHostRef = useRef<boolean>(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    const targetUrl = getSocketUrl();
    console.log(`[Socket] Connecting to: ${targetUrl}`);
    const socketInstance = io(targetUrl, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to socket server');
      
      const hostSessionId = localStorage.getItem('rate_it_host_session_id');
      const hostToken = localStorage.getItem('rate_it_host_token');
      const playerSessionId = localStorage.getItem('rate_it_player_session_id');
      const name = playerNameRef.current || localStorage.getItem('rate_it_player_name');
      const id = playerIdRef.current || localStorage.getItem('rate_it_player_id');

      if (hostSessionId && hostToken) {
        console.log(`Auto-restoring Host session: ${hostSessionId}`);
        isHostRef.current = true;
        setIsHost(true);
        socketInstance.emit('room:reconnect_host', { sessionId: hostSessionId, hostToken, playerId: id }, (response: any) => {
          if (response.success) {
            setSession(response.session);
          } else {
            console.log('Failed to restore Host session, clearing storage');
            localStorage.removeItem('rate_it_host_session_id');
            localStorage.removeItem('rate_it_host_token');
            isHostRef.current = false;
            setIsHost(false);
          }
        });
      } else if (playerSessionId && name && id) {
        console.log(`Auto-restoring Player session: ${playerSessionId} as ${name}`);
        isHostRef.current = false;
        setIsHost(false);
        socketInstance.emit('room:join', {
          sessionId: playerSessionId,
          playerName: name,
          playerId: id
        }, (response: any) => {
          if (response.success) {
            setSession(response.session);
          } else {
            console.log('Failed to restore Player session, clearing storage');
            localStorage.removeItem('rate_it_player_session_id');
          }
        });
      }
    };

    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      console.log('Socket disconnected from server:', reason || 'disconnected');
    };

    const onConnectError = (err: any) => {
      console.error('Socket connection error:', err?.message || err);
    };

    const onRoomUpdate = (updatedSession: GameSession) => {
      console.log('Received room update:', updatedSession);
      setSession(updatedSession);
    };

    const onBannerBroadcast = (data: { message: string; sender?: string; type?: BannerType }) => {
      console.log('Received banner broadcast:', data);
      showBanner(data.message, data.type || 'announcement', 12000, data.sender);
    };

    const onRoomDeleted = () => {
      console.log('Received room:deleted broadcast: host closed room, socket disconnected properly');
      showBanner('L\'hôte a fermé la session de cette salle.', 'info');
      isHostRef.current = false;
      setIsHost(false);
      playerNameRef.current = '';
      localStorage.removeItem('rate_it_host_session_id');
      localStorage.removeItem('rate_it_host_token');
      localStorage.removeItem('rate_it_player_session_id');
      setSession(null);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.on('room:update', onRoomUpdate);
    socketInstance.on('banner:broadcast', onBannerBroadcast);
    socketInstance.on('room:deleted', onRoomDeleted);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.off('room:update', onRoomUpdate);
      socketInstance.off('banner:broadcast', onBannerBroadcast);
      socketInstance.off('room:deleted', onRoomDeleted);
      socketInstance.disconnect();
    };
  }, []);

  const createRoom = (options?: { isHostPlayer?: boolean; hostName?: string }): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Connexion WebSocket non initialisée.'));
      if (!socket.connected) {
        return reject(new Error('Serveur inaccessible ou non connecté (WebSocket déconnecté). Vérifiez votre connexion.'));
      }
      
      const timeoutId = setTimeout(() => {
        isHostRef.current = false;
        setIsHost(false);
        reject(new Error('Délai d\'attente dépassé (timeout) lors de la création de la salle.'));
      }, 8000);

      isHostRef.current = true;
      setIsHost(true);
      const isHostPlayer = options?.isHostPlayer !== false;
      const hostName = options?.hostName || 'Hôte';
      const id = playerIdRef.current || localStorage.getItem('rate_it_player_id');
      socket.emit('room:create', { isHostPlayer, hostName, playerId: id }, (response: any) => {
        clearTimeout(timeoutId);
        if (response && response.success) {
          localStorage.setItem('rate_it_host_session_id', response.session.sessionId);
          if (response.hostToken) {
            localStorage.setItem('rate_it_host_token', response.hostToken);
          }
          localStorage.removeItem('rate_it_player_session_id');
          setSession(response.session);
          resolve(response.session);
        } else {
          isHostRef.current = false;
          setIsHost(false);
          reject(new Error(response?.error || 'Échec de la création de la salle'));
        }
      });
    });
  };

  const toggleHostPlayer = (isHostPlayer: boolean, hostName?: string): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket non initialisé'));
      socket.emit('room:toggle_host_player', { isHostPlayer, hostName }, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to toggle host player setting'));
        }
      });
    });
  };

  const joinRoom = (sessionId: string, playerName: string): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Connexion WebSocket non initialisée.'));
      if (!playerId) return reject(new Error('Identifiant joueur manquant.'));
      if (!socket.connected) {
        return reject(new Error('Serveur inaccessible ou non connecté (WebSocket déconnecté). Vérifiez votre connexion.'));
      }

      const timeoutId = setTimeout(() => {
        playerNameRef.current = '';
        reject(new Error('Délai d\'attente dépassé (timeout) pour rejoindre la salle.'));
      }, 8000);

      isHostRef.current = false;
      setIsHost(false);
      playerNameRef.current = playerName;
      socket.emit('room:join', { sessionId, playerName, playerId }, (response: any) => {
        clearTimeout(timeoutId);
        if (response && response.success) {
          localStorage.setItem('rate_it_player_session_id', response.session.sessionId);
          localStorage.removeItem('rate_it_host_session_id');
          localStorage.removeItem('rate_it_host_token');
          setSession(response.session);
          resolve(response.session);
        } else {
          playerNameRef.current = '';
          reject(new Error(response?.error || 'Échec lors de la tentative de rejoindre la salle'));
        }
      });
    });
  };

  const leaveRoom = () => {
    if (socket && session) {
      console.log(`Leaving room ${session.sessionId}: socket is disconnected properly`);
      isHostRef.current = false;
      setIsHost(false);
      playerNameRef.current = '';
      localStorage.removeItem('rate_it_host_session_id');
      localStorage.removeItem('rate_it_host_token');
      localStorage.removeItem('rate_it_player_session_id');
      socket.disconnect();
      socket.connect();
      setSession(null);
    }
  };

  const deleteRoom = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket || !session) {
        leaveRoom();
        return resolve();
      }
      const code = session.sessionId;
      console.log(`Closing room ${code}: socket is disconnecting properly...`);
      socket.emit('room:delete', {}, (response: any) => {
        leaveRoom();
        if (response && response.success) {
          console.log(`Room ${code} deleted: socket disconnected properly`);
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to delete room'));
        }
      });
    });
  };

  const startGame = (malUsername?: string, playlistId?: string): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Start game request timed out. Please try again.'));
      }, 12000);

      socket.emit('game:start', { malUsername, playlistId }, (response: any) => {
        clearTimeout(timeoutId);
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to start game'));
        }
      });
    });
  };

  const connectTwitch = (channelName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('twitch:connect', { channelName }, (response: any) => {
        if (response.success) {
          resolve(response.channelName);
        } else {
          reject(new Error(response.error || 'Failed to connect Twitch'));
        }
      });
    });
  };

  const disconnectTwitch = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('twitch:disconnect', {}, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to disconnect Twitch'));
        }
      });
    });
  };

  const nextVideo = (): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:next', {}, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to advance video'));
        }
      });
    });
  };

  const previousVideo = (): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:previous', {}, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to go to previous video'));
        }
      });
    });
  };

  const showResults = (): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:show_results', {}, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to reveal results'));
        }
      });
    });
  };

  const toggleSkip = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:player_skip', {}, (response: any) => {
        if (response.success) {
          resolve(response.hasSkipped);
        } else {
          reject(new Error(response.error || 'Failed to toggle skip'));
        }
      });
    });
  };

  const submitVote = (voteValue: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:vote', { voteValue }, (response: any) => {
        if (response.success) {
          resolve(response.vote);
        } else {
          reject(new Error(response.error || 'Failed to submit vote'));
        }
      });
    });
  };

  const getPlaylists = (): Promise<{ validated: any[]; community: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:list', {}, (response: any) => {
        if (response.success) {
          resolve({ validated: response.validated, community: response.community });
        } else {
          reject(new Error(response.error || 'Failed to fetch playlists'));
        }
      });
    });
  };

  const createPlaylist = (name: string, description: string, videos: any[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:create', { name, description, videos }, (response: any) => {
        if (response.success) {
          resolve(response.playlistId);
        } else {
          reject(new Error(response.error || 'Failed to create playlist'));
        }
      });
    });
  };

  const getPlaylistDetails = (id: string): Promise<{ playlist: any; videos: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:get', { id }, (response: any) => {
        if (response.success) {
          resolve({ playlist: response.playlist, videos: response.videos });
        } else {
          reject(new Error(response.error || 'Failed to get playlist details'));
        }
      });
    });
  };

  const searchVideos = (query: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:search_videos', { query }, (response: any) => {
        if (response.success) {
          resolve(response.results);
        } else {
          reject(new Error(response.error || 'Failed to search videos'));
        }
      });
    });
  };

  const toggleLobbyVideo = (videoId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:toggle_video', { videoId }, (response: any) => {
        if (response.success) {
          resolve(response.disabledVideoIds);
        } else {
          reject(new Error(response.error || 'Failed to toggle video status'));
        }
      });
    });
  };

  const validatePlaylist = (id: string, isValidated: boolean, password?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:validate', { id, isValidated, password }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to validate playlist'));
        }
      });
    });
  };

  const deletePlaylist = (id: string, password?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:delete', { id, password }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to delete playlist'));
        }
      });
    });
  };

  const cleanStalePlaylists = (password?: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:clean_stale', { password }, (response: any) => {
        if (response.success) {
          resolve(response.count);
        } else {
          reject(new Error(response.error || 'Failed to clean stale playlists'));
        }
      });
    });
  };

  const getMalVideos = (username: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));

      const timeoutId = setTimeout(() => {
        reject(new Error('Failed to fetch matched MAL openings: Request timed out.'));
      }, 10000);

      socket.emit('playlist:get_mal_videos', { username }, (response: any) => {
        clearTimeout(timeoutId);
        if (response.success) {
          resolve(response.videos);
        } else {
          reject(new Error(response.error || 'Failed to match MAL videos'));
        }
      });
    });
  };

  const getVideoStats = (youtubeId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('video:get_stats', { youtubeId }, (response: any) => {
        if (response.success) {
          resolve(response.stats);
        } else {
          reject(new Error(response.error || 'Failed to get video stats'));
        }
      });
    });
  };

  const getGlobalStats = (password?: string): Promise<{ overall: any; topTracks: any[]; worstTracks: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('admin:get_global_stats', { password }, (response: any) => {
        if (response.success) {
          resolve({
            overall: response.overall,
            topTracks: response.topTracks,
            worstTracks: response.worstTracks,
          });
        } else {
          reject(new Error(response.error || 'Failed to get global stats'));
        }
      });
    });
  };

  const adminAddVideo = (playlistId: string, title: string, youtubeId: string, artistName: string, description: string, malAnimeId?: number | string, malTitle?: string, password?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:admin_add_video', { playlistId, title, youtubeId, artistName, description, malAnimeId, malTitle, password }, (response: any) => {
        if (response.success) {
          resolve(response.videoId);
        } else {
          reject(new Error(response.error || 'Failed to add video as admin'));
        }
      });
    });
  };

  const adminDeleteVideo = (playlistId: string, videoId: string, password?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:admin_delete_video', { playlistId, videoId, password }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to delete video as admin'));
        }
      });
    });
  };

  const adminDeleteVideoDirect = (videoId: string | number, password?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:admin_delete_video_direct', { videoId, password }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to delete video as admin'));
        }
      });
    });
  };

  const adminUpdateVideo = (
    videoId: string | number,
    videoData: { title: string; youtubeId: string; artistName?: string; description?: string; malAnimeId?: number | string; malTitle?: string },
    password?: string
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:admin_update_video', { videoId, ...videoData, password }, (response: any) => {
        if (response.success) {
          resolve(response.video);
        } else {
          reject(new Error(response.error || 'Failed to update video'));
        }
      });
    });
  };

  const adminSearchVideos = (query = '', limit = 100, offset = 0, password?: string): Promise<{ videos: any[]; total: number }> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('playlist:admin_search_all_videos', { query, limit, offset, password }, (response: any) => {
        if (response.success) {
          resolve({ videos: response.videos || [], total: response.total || 0 });
        } else {
          reject(new Error(response.error || 'Failed to search videos'));
        }
      });
    });
  };

  const verifyVideo = (youtubeId: string): Promise<{ valid: boolean; title?: string; author?: string; error?: string }> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('video:verify', { youtubeId }, (response: any) => {
        if (response && response.success) {
          resolve({
            valid: response.valid,
            title: response.title,
            author: response.author,
            error: response.error,
          });
        } else {
          reject(new Error(response?.error || 'Échec de la vérification de la vidéo'));
        }
      });
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        session,
        playerId,
        isHost,
        banner,
        showBanner,
        hideBanner,
        createRoom,
        toggleHostPlayer,
        joinRoom,
        leaveRoom,
        deleteRoom,
        startGame,
        nextVideo,
        previousVideo,
        showResults,
        toggleSkip,
        submitVote,
        connectTwitch,
        disconnectTwitch,
        getPlaylists,
        createPlaylist,
        getPlaylistDetails,
        searchVideos,
        toggleLobbyVideo,
        validatePlaylist,
        deletePlaylist,
        cleanStalePlaylists,
        getMalVideos,
        getVideoStats,
        getGlobalStats,
        adminAddVideo,
        adminDeleteVideo,
        adminDeleteVideoDirect,
        adminUpdateVideo,
        adminSearchVideos,
        verifyVideo,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
