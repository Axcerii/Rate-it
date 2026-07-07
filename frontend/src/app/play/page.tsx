'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

export default function PlayView() {
  const router = useRouter();
  const { session, isConnected, playerId, leaveRoom } = useSocket();

  // If session or connection is lost, redirect back to home after a few seconds
  useEffect(() => {
    if (!session && !isConnected) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [session, isConnected, router]);

  const handleLeave = () => {
    leaveRoom();
    router.push('/');
  };

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 p-6">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mx-auto" />
          <h2 className="mt-6 text-xl font-semibold text-slate-300">Connecting to Lobby...</h2>
          <p className="mt-2 text-sm text-slate-500">Redirecting to home if offline.</p>
          <button
            onClick={handleLeave}
            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = session.players[playerId];

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-slate-950 px-4 py-8 font-sans overflow-hidden justify-center items-center">
        <div className="absolute top-[-30%] left-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[110px] pointer-events-none" />

        <div className="z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md text-center flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mt-2">You are in!</h2>
            <p className="text-sm text-slate-400">
              Room Code: <span className="font-mono font-bold text-cyan-400 tracking-wider">{session.sessionId}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 shadow-inner">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Your Nickname</span>
            <span className="block mt-1 text-2xl font-black text-white truncate px-2">
              {currentPlayer?.name || 'Anonymous'}
            </span>
          </div>

          <div className="py-6 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center h-16 w-16 mb-4">
              <div className="absolute animate-ping h-8 w-8 rounded-full bg-cyan-500 opacity-20" />
              <div className="relative rounded-full h-4 w-4 bg-cyan-500 shadow-[0_0_12px_#06b6d4]" />
            </div>
            <h4 className="text-lg font-bold text-slate-200">Waiting for Host</h4>
            <p className="mt-1 text-sm text-slate-400 max-w-[240px] leading-relaxed mx-auto">
              The game will start as soon as the host launches the session. Get ready!
            </p>
          </div>

          <button
            onClick={handleLeave}
            className="w-full py-4 px-6 border border-white/10 hover:border-red-500/20 bg-slate-950/40 hover:bg-red-950/20 hover:text-red-400 text-slate-400 font-bold rounded-xl transition backdrop-blur-sm"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // 2. PLAYING VIEW
  if (session.status === 'PLAYING') {
    const currentVideo = session.videos?.[session.currentVideoIndex];

    return (
      <div className="relative flex flex-col flex-1 bg-slate-950 px-4 py-8 font-sans overflow-hidden justify-center items-center">
        <div className="absolute top-[-30%] left-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[110px] pointer-events-none" />

        <div className="z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md text-center flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <span className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">
              Nickname: {currentPlayer?.name}
            </span>
            <span className="text-xs font-bold text-cyan-400 font-mono tracking-widest bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Room {session.sessionId}
            </span>
          </div>

          {currentVideo ? (
            <div className="flex flex-col gap-6 py-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                Now Rating Theme {session.currentVideoIndex + 1} of {session.videos?.length}
              </span>
              
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-white leading-tight">
                  {currentVideo.animeName}
                </h2>
                <p className="text-sm font-bold text-cyan-400 tracking-wider">
                  {currentVideo.type} — {currentVideo.title}
                </p>
              </div>

              {/* Placeholder message for Step 4 voting interface */}
              <div className="mt-8 p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-300 text-xs font-semibold leading-relaxed">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span>Waiting for Voting system initialization...</span>
                  <span className="text-[10px] text-slate-500 font-normal">Voting buttons (1-5) will appear in Étape 4.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-slate-400">Loading video metadata...</div>
          )}

          <button
            onClick={handleLeave}
            className="w-full mt-4 py-3.5 px-6 border border-white/5 hover:border-red-500/20 bg-slate-950/20 hover:bg-red-950/20 hover:text-red-400 text-slate-500 font-bold rounded-xl transition text-xs"
          >
            Exit Game
          </button>
        </div>
      </div>
    );
  }

  // 3. LEADERBOARD VIEW
  if (session.status === 'LEADERBOARD') {
    return (
      <div className="relative flex flex-col flex-1 bg-slate-950 px-4 py-8 font-sans overflow-hidden justify-center items-center">
        <div className="absolute top-[-30%] left-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

        <div className="z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md text-center flex flex-col gap-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Game Finished!</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            All themes have been played. Look at the host screen to see the final ratings!
          </p>

          <button
            onClick={handleLeave}
            className="w-full mt-4 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    );
  }

  return null;
}
