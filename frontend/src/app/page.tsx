'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import HostButton from '@/components/HostButton';
import JoinCard from '@/components/JoinCard';
import CreatePlaylistButton from '@/components/CreatePlaylistButton';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, session, isHost } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to active session if restored
  useEffect(() => {
    if (session) {
      if (isHost) {
        router.push('/host');
      } else {
        router.push('/play');
      }
    }
  }, [session, isHost, router]);

  // Load previous player name and check URL query params for room code on mount
  useEffect(() => {
    const savedName = localStorage.getItem('rate_it_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        setRoomCode(code.toUpperCase());
      }
    }
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await createRoom();
      router.push('/host');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create session');
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      localStorage.setItem('rate_it_player_name', playerName.trim());
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      router.push('/play');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to join session');
      setIsJoining(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center bg-transparent px-3 sm:px-6 py-4 sm:py-8 font-sans w-full max-w-full overflow-x-hidden">

      {/* Main Card Container */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center justify-center gap-4 sm:gap-6 px-1 sm:px-0">

        {/* Header Logo */}
        <div className="flex justify-center items-center">
          <img
            src="/RateItLogo.png"
            alt="Rate It Logo"
            className="w-auto h-28 sm:h-52 md:h-64 object-contain max-w-full transition-transform duration-300"
          />
        </div>

        {/* Action Panel Grid */}
        <div className="grid w-full gap-8 md:grid-cols-2">

          {/* Host Button */}
          <div className="flex items-center justify-center">
            <HostButton
              onClick={handleCreate}
              disabled={isCreating || isJoining}
              loading={isCreating}
            />
          </div>

          {/* Join Card */}
          <div className="flex items-center justify-center">
            <JoinCard
              playerName={playerName}
              setPlayerName={setPlayerName}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              onSubmit={handleJoin}
              disabled={isCreating || isJoining}
              loading={isJoining}
            />
          </div>
        </div>

        {/* Create Playlist Button (Spans full length under the two main buttons) */}
        <div className="w-full my-8 flex items-center justify-center">
          <CreatePlaylistButton
            onClick={() => router.push('/playlists/new')}
            disabled={isCreating || isJoining}
          />
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="w-full max-w-md bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
