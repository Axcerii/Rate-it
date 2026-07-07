'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameSession } from '../../../shared/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  session: GameSession | null;
  playerId: string;
  createRoom: () => Promise<GameSession>;
  joinRoom: (sessionId: string, playerName: string) => Promise<GameSession>;
  leaveRoom: () => void;
  startGame: () => Promise<GameSession>;
  nextVideo: () => Promise<GameSession>;
  previousVideo: () => Promise<GameSession>;
  submitVote: (voteValue: number) => Promise<number>;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string>('');

  // Generate or retrieve player ID on mount
  useEffect(() => {
    let id = localStorage.getItem('rate_it_player_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('rate_it_player_id', id);
    }
    setPlayerId(id);
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
      
      const currentSession = sessionRef.current;
      if (currentSession) {
        if (isHostRef.current) {
          console.log(`Auto re-associating host for session ${currentSession.sessionId}`);
          socketInstance.emit('room:reconnect_host', { sessionId: currentSession.sessionId }, (response: any) => {
            if (response.success) {
              setSession(response.session);
            }
          });
        } else {
          const name = playerNameRef.current || localStorage.getItem('rate_it_player_name') || 'Player';
          console.log(`Auto re-joining session ${currentSession.sessionId} as ${name}`);
          socketInstance.emit('room:join', {
            sessionId: currentSession.sessionId,
            playerName: name,
            playerId: playerIdRef.current
          }, (response: any) => {
            if (response.success) {
              setSession(response.session);
            }
          });
        }
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
      socket.emit('room:create', {}, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          isHostRef.current = false;
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
      playerNameRef.current = playerName;
      socket.emit('room:join', { sessionId, playerName, playerId }, (response: any) => {
        if (response.success) {
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
      playerNameRef.current = '';
      socket.disconnect();
      socket.connect();
      setSession(null);
    }
  };

  const startGame = (): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      socket.emit('game:start', {}, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to start game'));
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

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        session,
        playerId,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        nextVideo,
        previousVideo,
        submitVote,
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
