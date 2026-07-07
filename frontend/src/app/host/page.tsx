'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { QRCodeSVG } from 'qrcode.react';

export default function HostLobby() {
  const router = useRouter();
  const { session, isConnected, leaveRoom, startGame, nextVideo, previousVideo } = useSocket();
  const [joinUrl, setJoinUrl] = useState('');
  const playerRef = useRef<any>(null);

  // Generate QR Code join URL once we have window.location
  useEffect(() => {
    if (session?.sessionId && typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/?code=${session.sessionId}`);
    }
  }, [session?.sessionId]);

  // If session or connection is lost, redirect back to home after a few seconds
  useEffect(() => {
    if (!session && !isConnected) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [session, isConnected, router]);

  // YouTube API Player setup
  useEffect(() => {
    if (!session || session.status !== 'PLAYING') return;

    const currentVideo = session.videos?.[session.currentVideoIndex];
    if (!currentVideo) return;

    let ytPlayer: any = null;

    const initializePlayer = () => {
      // Clear container first to avoid iframe duplication
      const container = document.getElementById('youtube-player-container');
      if (container) {
        container.innerHTML = '<div id="youtube-player"></div>';
      }

      // @ts-ignore
      ytPlayer = new window.YT.Player('youtube-player', {
        videoId: currentVideo.youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
        },
        events: {
          onStateChange: (event: any) => {
            // @ts-ignore
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log('Video ended, auto-advancing...');
              handleNext();
            }
          },
          onError: (err: any) => {
            console.error('YouTube Player Error:', err);
          }
        },
      });
      playerRef.current = ytPlayer;
    };

    // Load YouTube Iframe API script dynamically if not present
    // @ts-ignore
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // @ts-ignore
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      // @ts-ignore
      if (window.YT.Player) {
        initializePlayer();
      }
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        playerRef.current = null;
      }
    };
  }, [session?.status, session?.currentVideoIndex]);

  const handleStartGame = async () => {
    try {
      await startGame();
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleNext = async () => {
    try {
      await nextVideo();
    } catch (error) {
      console.error('Failed to advance:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await previousVideo();
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  };

  const handleBackToHome = () => {
    leaveRoom();
    router.push('/');
  };

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 p-6">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-fuchsia-500 border-t-transparent mx-auto" />
          <h2 className="mt-6 text-xl font-semibold text-slate-300">Loading Session...</h2>
          <p className="mt-2 text-sm text-slate-500">Redirecting to home if offline.</p>
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

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-slate-950 px-6 py-12 font-sans overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] h-[700px] w-[700px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[120px] pointer-events-none" />

        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-10">
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

          <div className="grid gap-10 lg:grid-cols-5 flex-1 items-start">
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
                      Scan to join on mobile, or type this link:
                      <br />
                      <span className="font-mono text-fuchsia-400 mt-1 inline-block break-all">{joinUrl}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col h-full">
              <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                    Players Connected
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
                    <p className="mt-4 text-sm">Waiting for players to connect...</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-h-[450px] overflow-y-auto pr-2">
                    {playersList.map((player) => (
                      <div
                        key={player.id}
                        className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 bg-slate-950/40 ${
                          player.isConnected ? 'border-emerald-500/20' : 'border-white/5 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${player.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`} />
                          <span className="font-bold text-slate-200 text-sm truncate max-w-[120px]">{player.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-6 border-t border-white/5 flex justify-end">
                  <button
                    onClick={handleStartGame}
                    disabled={playersList.length === 0}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                  >
                    Start Quiz ({playersList.length} players)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentVideo = session.videos?.[session.currentVideoIndex];

  // 2. PLAYING VIEW
  if (session.status === 'PLAYING' && currentVideo) {
    return (
      <div className="relative flex flex-col flex-1 bg-slate-950 px-6 py-8 font-sans overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] h-[700px] w-[700px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />

        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-3 py-1 rounded-full border border-fuchsia-500/20">
                Playing {session.currentVideoIndex + 1} / {session.videos?.length || 0}
              </span>
              <h1 className="text-xl font-bold text-white mt-2 font-mono tracking-wide">
                ROOM: {session.sessionId}
              </h1>
            </div>
            <button
              onClick={handleBackToHome}
              className="px-4 py-2 border border-white/10 bg-slate-900/40 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Exit Game
            </button>
          </div>

          {/* Main Grid: YouTube video & Track Metadata */}
          <div className="grid gap-8 lg:grid-cols-4 flex-1 items-stretch">
            {/* YouTube Player Column */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex-1 min-h-[450px] aspect-video w-full rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl relative" id="youtube-player-container">
                <div id="youtube-player" className="w-full h-full" />
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
                <button
                  onClick={handlePrevious}
                  disabled={session.currentVideoIndex === 0}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-slate-950/40 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 text-xs font-bold transition"
                >
                  ← Previous Theme
                </button>
                
                <span className="text-sm font-semibold text-slate-400 font-mono">
                  Track {session.currentVideoIndex + 1}
                </span>

                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-xs font-bold transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  {session.currentVideoIndex + 1 === session.videos?.length ? 'Show Results →' : 'Next Theme →'}
                </button>
              </div>
            </div>

            {/* Song details & Connected players list */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Song details */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md shadow-2xl">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Currently Playing</span>
                <h2 className="mt-2 text-2xl font-black text-white leading-tight">
                  {currentVideo.animeName}
                </h2>
                <p className="text-sm text-fuchsia-400 font-bold mt-1">
                  {currentVideo.type} — {currentVideo.title}
                </p>
              </div>

              {/* Players live voting list status */}
              <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md shadow-2xl flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-3">
                  Players Status
                </h3>
                <div className="mt-4 flex flex-col gap-3 overflow-y-auto max-h-[300px]">
                  {playersList.map((player) => {
                    const hasVoted = session.votes?.[player.id] !== undefined;
                    return (
                      <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-300 text-sm truncate max-w-[120px]">
                            {player.name}
                          </span>
                          {hasVoted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                              Voted ✅
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          {player.isConnected ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. LEADERBOARD VIEW
  if (session.status === 'LEADERBOARD') {
    const sortedResults = Object.values(session.results || {}).sort((a, b) => a.average - b.average);

    return (
      <div className="relative flex flex-col flex-1 bg-slate-950 px-6 py-12 font-sans overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] h-[700px] w-[700px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[120px] pointer-events-none" />

        <div className="z-10 w-full max-w-4xl mx-auto flex flex-col flex-1 gap-8 justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent sm:text-5xl drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              FINAL LEADERBOARD
            </h1>
            <p className="text-sm text-slate-400 mt-2">Ranked from the worst anime opening to the best</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
            {sortedResults.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No votes were recorded during this session.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sortedResults.map((result, idx) => {
                  const percent = (result.average / 5) * 100;
                  // Color based on rank/index
                  let rankColor = "text-slate-400 border-slate-500/20 bg-slate-500/10";
                  let bgBarColor = "bg-gradient-to-r from-violet-600 to-cyan-500";
                  
                  if (idx === sortedResults.length - 1) {
                    // Winner (the highest score, since it's worst to best)
                    rankColor = "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 animate-pulse";
                    bgBarColor = "bg-gradient-to-r from-yellow-500 via-amber-500 to-fuchsia-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]";
                  } else if (idx === 0) {
                    // Worst rating
                    rankColor = "text-red-400 border-red-500/30 bg-red-500/10";
                  }

                  return (
                    <div
                      key={result.id}
                      className="relative p-5 rounded-2xl border border-white/5 bg-slate-950/40 hover:border-white/10 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank indicator */}
                        <div className={`h-12 w-12 rounded-xl border flex items-center justify-center font-black text-lg ${rankColor}`}>
                          #{sortedResults.length - idx}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug">
                            {result.animeName}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {result.type} — {result.title}
                          </p>
                        </div>
                      </div>

                      {/* Score Bar & Average rating */}
                      <div className="flex items-center gap-6 sm:w-1/2 justify-between">
                        <div className="hidden sm:block flex-1 bg-slate-900 rounded-full h-3.5 overflow-hidden border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-1000 ${bgBarColor}`} style={{ width: `${percent}%` }} />
                        </div>
                        
                        <div className="text-right flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-2xl font-black text-white font-mono leading-none">
                              {result.average.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                              {result.votesCount} {result.votesCount === 1 ? 'vote' : 'votes'}
                            </span>
                          </div>
                          <span className="text-sm text-slate-500">/ 5</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center border-t border-white/5 pt-6 mt-2">
              <button
                onClick={handleBackToHome}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 font-bold text-white shadow-lg shadow-fuchsia-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
