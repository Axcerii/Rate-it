'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { QRCodeSVG } from 'qrcode.react';

export default function HostLobby() {
  const router = useRouter();
  const { session, isConnected, leaveRoom } = useSocket();
  const [joinUrl, setJoinUrl] = useState('');

  // Generate QR Code join URL once we have window.location
  useEffect(() => {
    if (session?.sessionId && typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/?code=${session.sessionId}`);
    }
  }, [session?.sessionId]);

  // If session or connection is lost, redirect back to home after a few seconds or show message
  useEffect(() => {
    if (!session && !isConnected) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [session, isConnected, router]);

  const handleBackToHome = () => {
    leaveRoom();
    router.push('/');
  };

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 p-6">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-fuchsia-500 border-t-transparent mx-auto" />
          <h2 className="mt-6 text-xl font-semibold text-slate-300">Loading Host Lobby...</h2>
          <p className="mt-2 text-sm text-slate-500">If this takes too long, return to homepage.</p>
          <button
            onClick={handleBackToHome}
            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const playersList = Object.values(session.players || {});

  return (
    <div className="relative flex flex-col flex-1 bg-slate-950 px-6 py-12 font-sans overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-30%] right-[-10%] h-[700px] w-[700px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[120px] pointer-events-none" />

      {/* Main Grid Layout */}
      <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-10">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent tracking-wider">
              RATE IT — LOBBY
            </h1>
            <p className="text-sm text-slate-400 mt-1">Waiting for players to join before starting</p>
          </div>
          
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 border border-white/10 bg-slate-900/40 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition backdrop-blur-sm"
          >
            End Session
          </button>
        </div>

        {/* Middle content: Left (Code & QR), Right (Players) */}
        <div className="grid gap-10 lg:grid-cols-5 flex-1 items-start">
          
          {/* Room info (Code & QR Code) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center shadow-2xl backdrop-blur-md">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Join Room Code</h3>
              <div className="mt-4 text-6xl font-black tracking-widest text-white font-mono bg-slate-950/60 py-4 rounded-2xl border border-white/5 shadow-inner select-all">
                {session.sessionId}
              </div>

              {joinUrl && (
                <div className="mt-8 flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-2xl shadow-lg shadow-fuchsia-500/5">
                    <QRCodeSVG value={joinUrl} size={180} level="H" includeMargin={false} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mt-2">
                    Scan the QR code to join automatically on your smartphone, or go to:
                    <br />
                    <span className="font-mono text-fuchsia-400 mt-1 inline-block break-all">{joinUrl}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Players joined section */}
          <div className="lg:col-span-3 flex flex-col h-full">
            <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                  Players Joined
                  <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-xs font-semibold">
                    {playersList.length}
                  </span>
                </h3>
              </div>

              {playersList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                  <div className="h-8 w-8 rounded-full border border-dashed border-slate-600 animate-pulse flex items-center justify-center text-xs font-semibold">
                    ?
                  </div>
                  <p className="mt-4 text-sm">Waiting for the first player to connect...</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-h-[450px] overflow-y-auto pr-2">
                  {playersList.map((player) => (
                    <div
                      key={player.id}
                      className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 bg-slate-950/40 ${
                        player.isConnected
                          ? 'border-emerald-500/20 hover:border-emerald-500/40'
                          : 'border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            player.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'
                          }`}
                        />
                        <span className="font-bold text-slate-200 text-sm truncate max-w-[120px]">
                          {player.name}
                        </span>
                      </div>
                      
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {player.isConnected ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Start game button placeholder (for Étape 3+) */}
              <div className="mt-auto pt-6 border-t border-white/5 flex justify-end">
                <button
                  disabled={playersList.length === 0}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                >
                  Start Game (Waiting...)
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
