'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameSession } from '../../../shared/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  session: GameSession | null;
  isHost: boolean;
  playerId: string;
  createRoom: () => Promise<GameSession>;
  joinRoom: (sessionId: string, playerName: string) => Promise<GameSession>;
  leaveRoom: () => void;
  startGame: (malUsername?: string, playlistId?: string) => Promise<GameSession>;
  nextVideo: () => Promise<GameSession>;
  previousVideo: () => Promise<GameSession>;
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
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

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
    const socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to socket server');
      
      const hostSessionId = localStorage.getItem('rate_it_host_session_id');
      const playerSessionId = localStorage.getItem('rate_it_player_session_id');
      const name = playerNameRef.current || localStorage.getItem('rate_it_player_name');
      const id = playerIdRef.current || localStorage.getItem('rate_it_player_id');

      if (hostSessionId) {
        console.log(`Auto-restoring Host session: ${hostSessionId}`);
        isHostRef.current = true;
        setIsHost(true);
        socketInstance.emit('room:reconnect_host', { sessionId: hostSessionId }, (response: any) => {
          if (response.success) {
            setSession(response.session);
          } else {
            console.log('Failed to restore Host session, clearing storage');
            localStorage.removeItem('rate_it_host_session_id');
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

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    };

    const onRoomUpdate = (updatedSession: GameSession) => {
      console.log('Received room update:', updatedSession);
      setSession(updatedSession);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('room:update', onRoomUpdate);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('room:update', onRoomUpdate);
      socketInstance.disconnect();
    };
  }, []);

  const createRoom = (): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      isHostRef.current = true;
      setIsHost(true);
      socket.emit('room:create', {}, (response: any) => {
        if (response.success) {
          localStorage.setItem('rate_it_host_session_id', response.session.sessionId);
          localStorage.removeItem('rate_it_player_session_id');
          setSession(response.session);
          resolve(response.session);
        } else {
          isHostRef.current = false;
          setIsHost(false);
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  };

  const joinRoom = (sessionId: string, playerName: string): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      if (!playerId) return reject(new Error('Player ID not ready'));
      isHostRef.current = false;
      setIsHost(false);
      playerNameRef.current = playerName;
      socket.emit('room:join', { sessionId, playerName, playerId }, (response: any) => {
        if (response.success) {
          localStorage.setItem('rate_it_player_session_id', response.session.sessionId);
          localStorage.removeItem('rate_it_host_session_id');
          setSession(response.session);
          resolve(response.session);
        } else {
          playerNameRef.current = '';
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  };

  const leaveRoom = () => {
    if (socket && session) {
      isHostRef.current = false;
      setIsHost(false);
      playerNameRef.current = '';
      localStorage.removeItem('rate_it_host_session_id');
      localStorage.removeItem('rate_it_player_session_id');
      socket.disconnect();
      socket.connect();
      setSession(null);
    }
  };

  const startGame = (malUsername?: string, playlistId?: string): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:start', { malUsername, playlistId }, (response: any) => {
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
      socket.emit('playlist:get_mal_videos', { username }, (response: any) => {
        if (response.success) {
          resolve(response.videos);
        } else {
          reject(new Error(response.error || 'Failed to match MAL videos'));
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
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        nextVideo,
        previousVideo,
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
