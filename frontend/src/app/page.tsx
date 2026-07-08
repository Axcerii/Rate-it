'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

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
    <div className="relative flex flex-col flex-1 items-center justify-center bg-[#faf6eb] px-4 py-16 font-mono">
      
      {/* Main Card Container */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-10">
        
        {/* Header Logo (WarioWare Comic Style) */}
        <div className="text-center">
          <h1 className="text-6xl sm:text-8xl font-black uppercase tracking-wider text-[#990000] drop-shadow-[4px_4px_0px_#000] transform rotate-[-2deg]">
            ★ RATE IT ★
          </h1>
          <p className="mt-4 text-sm sm:text-base font-black text-[#002fa7] uppercase tracking-wider">
            THE ANIME INTRO RATING GAME WITH YOUR FRIENDS!
          </p>
        </div>

        {/* Action Panel Grid */}
        <div className="grid w-full gap-8 md:grid-cols-2">
          
          {/* Host Card */}
          <div className="flex flex-col justify-between bg-[#f0ead8] border-4 border-black p-8 rounded-3xl shadow-[6px_6px_0px_0px_#000] transition hover:scale-[1.01]">
            <div>
              <h2 className="text-2xl font-black text-black uppercase border-b-2 border-black pb-2 text-[#002fa7]">
                Host a Game
              </h2>
              <p className="mt-4 text-xs font-bold text-slate-700 leading-relaxed">
                Create a session, share the lobby QR code on the big screen, customize the playlist (enable/disable specific tracks), and listen to openings and endings for everyone to rate!
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={handleCreate}
                disabled={isCreating || isJoining}
                className="w-full py-4 bg-[#002fa7] text-white border-2 border-black font-black text-sm uppercase rounded-2xl shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform disabled:opacity-50"
              >
                {isCreating ? (
                  <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Create Room 📺'
                )}
              </button>
            </div>
          </div>

          {/* Join/Player Card */}
          <div className="flex flex-col justify-between bg-[#f0ead8] border-4 border-black p-8 rounded-3xl shadow-[6px_6px_0px_0px_#000] transition hover:scale-[1.01]">
            <div>
              <h2 className="text-2xl font-black text-black uppercase border-b-2 border-black pb-2 text-[#990000]">
                Join a Game
              </h2>
              <p className="mt-4 text-xs font-bold text-slate-700 leading-relaxed">
                Enter your nickname and the 6-character code shown on the host screen to join the lobby and cast your ratings.
              </p>

              <form onSubmit={handleJoin} className="mt-6 flex flex-col gap-4">
                <div>
                  <label htmlFor="playerName" className="block text-xs font-black uppercase mb-1">
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
                    className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
                  />
                </div>

                <div>
                  <label htmlFor="roomCode" className="block text-xs font-black uppercase mb-1">
                    Room Code
                  </label>
                  <input
                    type="text"
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ABCDEF"
                    maxLength={6}
                    disabled={isCreating || isJoining}
                    className="w-full px-3 py-3 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-center text-2xl font-black tracking-widest text-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating || isJoining}
                  className="mt-2 w-full py-4 bg-[#990000] text-white border-2 border-black font-black text-sm uppercase rounded-2xl shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  {isJoining ? (
                    <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Join Lobby 🎮'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="w-full max-w-md bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Bottom Options Row */}
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <button 
            onClick={() => router.push('/playlists/new')} 
            className="px-5 py-2.5 border-2 border-black bg-white hover:bg-slate-100 font-black text-xs uppercase rounded-xl transition shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
          >
            🛠️ Create Custom Playlist
          </button>
          <button 
            onClick={() => router.push('/admin')} 
            className="px-5 py-2.5 border-2 border-black bg-white hover:bg-slate-100 font-black text-xs uppercase rounded-xl transition shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
          >
            🔑 Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}
