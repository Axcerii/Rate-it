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

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to socket server');
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
      socket.emit('room:create', {}, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  };

  const joinRoom = (sessionId: string, playerName: string): Promise<GameSession> => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      if (!playerId) return reject(new Error('Player ID not ready'));
      socket.emit('room:join', { sessionId, playerName, playerId }, (response: any) => {
        if (response.success) {
          setSession(response.session);
          resolve(response.session);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  };

  const leaveRoom = () => {
    if (socket && session) {
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
