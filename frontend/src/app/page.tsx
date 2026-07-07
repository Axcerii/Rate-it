'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom } = useSocket();
  
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!roomCode.trim() || roomCode.length !== 4) {
      setError('Please enter a valid 4-character room code');
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
    <div className="relative flex flex-col flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 font-sans sm:px-6 lg:px-8">
      {/* Background Anime-inspired Neon Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-12">
        {/* Header Logo */}
        <div className="text-center">
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent sm:text-7xl drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            RATE IT
          </h1>
          <p className="mt-3 text-lg text-slate-400 sm:text-xl font-medium tracking-wide">
            The anime intro rating game with your friends!
          </p>
        </div>

        {/* Action Panel */}
        <div className="grid w-full gap-8 md:grid-cols-2">
          {/* Host Card */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-fuchsia-500/30 hover:shadow-fuchsia-500/5">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-fuchsia-500 to-violet-600 opacity-0 blur transition duration-300 group-hover:opacity-10 pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white group-hover:text-fuchsia-400 transition-colors">
                Host a Game
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Create a session, share the lobby QR code on the big screen, and queue up anime opening and ending themes for everyone to rate.
              </p>
            </div>

            <div className="relative z-10 mt-8">
              <button
                onClick={handleCreate}
                disabled={isCreating || isJoining}
                className="w-full relative flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isCreating ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Create Room (Hôte)'
                )}
              </button>
            </div>
          </div>

          {/* Join/Player Card */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-500/30 hover:shadow-cyan-500/5">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 blur transition duration-300 group-hover:opacity-10 pointer-events-none" />

            <div className="relative z-10 w-full">
              <h2 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                Join a Game
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Enter your nickname and the 4-digit code shown on the host screen to join the lobby and vote on your phone.
              </p>

              <form onSubmit={handleJoin} className="mt-6 flex flex-col gap-4">
                <div>
                  <label htmlFor="playerName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nickname
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="E.g. Luffy"
                    maxLength={16}
                    disabled={isCreating || isJoining}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="roomCode" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Room Code
                  </label>
                  <input
                    type="text"
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ABCD"
                    maxLength={4}
                    disabled={isCreating || isJoining}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center text-xl font-bold tracking-widest text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating || isJoining}
                  className="mt-4 w-full relative flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isJoining ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Join Lobby (Joueur)'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-950/40 p-4 text-center text-sm font-medium text-red-300 backdrop-blur-md animate-shake">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
