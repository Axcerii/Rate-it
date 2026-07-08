'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { QRCodeSVG } from 'qrcode.react';

export default function HostLobby() {
  const router = useRouter();
  const { 
    session, 
    isConnected, 
    leaveRoom, 
    startGame, 
    nextVideo, 
    previousVideo,
    connectTwitch,
    disconnectTwitch
  } = useSocket();
  const [joinUrl, setJoinUrl] = useState('');
  const [malUsername, setMalUsername] = useState('');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [isTwitchConnecting, setIsTwitchConnecting] = useState(false);
  const [twitchError, setTwitchError] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<{
    show: boolean;
    playersAvg: number;
    playersCount: number;
    twitchAvg: number;
    twitchCount: number;
  } | null>(null);
  const playerRef = useRef<any>(null);

  // Generate QR Code join URL once we have window.location
  useEffect(() => {
    if (session?.sessionId && typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/?code=${session.sessionId}`);
    }
  }, [session?.sessionId]);

  // Redirect back to home only if there is no session to restore and connection is established
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostSessionId = localStorage.getItem('rate_it_host_session_id');
      if (!session && isConnected && !hostSessionId) {
        router.push('/');
      }
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
      await startGame(malUsername);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleConnectTwitch = async () => {
    if (!twitchChannel.trim()) return;
    setIsTwitchConnecting(true);
    setTwitchError(null);
    try {
      await connectTwitch(twitchChannel.trim());
    } catch (err: any) {
      setTwitchError(err.message || 'Failed to connect Twitch');
    } finally {
      setIsTwitchConnecting(false);
    }
  };

  const handleDisconnectTwitch = async () => {
    setTwitchError(null);
    try {
      await disconnectTwitch();
    } catch (err: any) {
      setTwitchError(err.message || 'Failed to disconnect Twitch');
    }
  };

  const handleNext = () => {
    if (!session) return;
    
    const playerVotesList = Object.values(session.votes || {});
    const pCount = playerVotesList.length;
    const pSum = playerVotesList.reduce((sum: number, v: any) => sum + v, 0);
    const pAvg = pCount > 0 ? parseFloat((pSum / pCount).toFixed(2)) : 0;

    const twitchVotesList = Object.values(session.twitchVotes || {});
    const tCount = twitchVotesList.length;
    const tSum = twitchVotesList.reduce((sum: number, v: any) => sum + v, 0);
    const tAvg = tCount > 0 ? parseFloat((tSum / tCount).toFixed(2)) : 0;

    setRevealData({
      show: true,
      playersAvg: pAvg,
      playersCount: pCount,
      twitchAvg: tAvg,
      twitchCount: tCount
    });
  };

  const handleProceedAfterReveal = async () => {
    setRevealData(null);
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

              {/* MyAnimeList Quiz Filter */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>MyAnimeList Quiz</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-normal lowercase">optional</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Filter the quiz themes using your MAL completed list.
                </p>
                <input
                  type="text"
                  value={malUsername}
                  onChange={(e) => setMalUsername(e.target.value)}
                  placeholder="Enter MAL Username"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500 transition font-medium"
                />
              </div>

              {/* Twitch Chat Integration */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Twitch Chat Votes</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-normal lowercase">optional</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Connect to Twitch chat to count live ratings (1-5) from viewers.
                </p>
                {session.twitchChannel ? (
                  <div className="flex flex-col gap-2 bg-purple-500/10 p-4 border border-purple-500/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                        Connected to #{session.twitchChannel}
                      </span>
                      <button
                        onClick={handleDisconnectTwitch}
                        className="text-xs text-red-400 hover:text-red-300 font-bold"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={twitchChannel}
                      onChange={(e) => setTwitchChannel(e.target.value)}
                      placeholder="Twitch Channel"
                      className="flex-1 px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition font-medium"
                    />
                    <button
                      onClick={handleConnectTwitch}
                      disabled={isTwitchConnecting}
                      className="px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                    >
                      {isTwitchConnecting ? '...' : 'Connect'}
                    </button>
                  </div>
                )}
                {twitchError && <p className="text-xs text-red-400 font-bold">{twitchError}</p>}
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

              {/* Twitch Chat live voting status */}
              {session.twitchChannel && (
                <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 backdrop-blur-md shadow-2xl flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-purple-500/10 pb-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] animate-pulse" />
                    Twitch Chat Votes
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">Votes received:</span>
                    <span className="text-lg font-black text-white font-mono">
                      {Object.keys(session.twitchVotes || {}).length}
                    </span>
                  </div>
                </div>
              )}

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

        {/* Reveal Scores Modal */}
        {revealData?.show && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] text-center flex flex-col gap-6 mx-4 relative overflow-hidden">
              {/* Accent glow */}
              <div className="absolute top-[-20%] left-[-20%] h-[200px] w-[200px] rounded-full bg-fuchsia-500/20 blur-[50px] pointer-events-none" />
              <div className="absolute bottom-[-20%] right-[-20%] h-[200px] w-[200px] rounded-full bg-cyan-500/20 blur-[50px] pointer-events-none" />

              <div className="flex flex-col gap-1 z-10">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Round Results</span>
                <h2 className="text-3xl font-black text-white leading-tight">
                  {currentVideo.animeName}
                </h2>
                <p className="text-sm font-semibold text-fuchsia-400">
                  {currentVideo.type} — {currentVideo.title}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 mt-4 z-10">
                {/* Players Rating Card */}
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-6 flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Players Average</span>
                  <span className="text-5xl font-black text-white font-mono leading-none">
                    {revealData.playersAvg.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    from {revealData.playersCount} {revealData.playersCount === 1 ? 'player' : 'players'}
                  </span>
                </div>

                {/* Twitch Rating Card */}
                <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-6 flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Twitch Chat Average</span>
                  {revealData.twitchCount > 0 ? (
                    <>
                      <span className="text-5xl font-black text-white font-mono leading-none">
                        {revealData.twitchAvg.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        from {revealData.twitchCount} {revealData.twitchCount === 1 ? 'chat vote' : 'chat votes'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-slate-500 font-mono py-3">
                        N/A
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        No Twitch chat votes
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-center z-10">
                <button
                  onClick={handleProceedAfterReveal}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 font-bold text-white text-sm shadow-lg shadow-fuchsia-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  {session.currentVideoIndex + 1 === session.videos?.length ? 'Go to Leaderboard →' : 'Continue to Next Track →'}
                </button>
              </div>
            </div>
          </div>
        )}
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
                      <div className="flex flex-col gap-2 sm:w-1/2 justify-center">
                        <div className="flex items-center gap-6 justify-between">
                          {/* Players Score */}
                          <div className="hidden sm:block flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                            <div className={`h-full rounded-full transition-all duration-1000 ${bgBarColor}`} style={{ width: `${percent}%` }} />
                          </div>
                          
                          <div className="text-right flex items-center gap-2 min-w-[90px]">
                            <div className="flex flex-col items-end">
                              <span className="text-lg font-black text-white font-mono leading-none font-bold">
                                {result.average.toFixed(2)}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                {result.votesCount} {result.votesCount === 1 ? 'player' : 'players'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-600">/5</span>
                          </div>
                        </div>

                        {/* Twitch Score (if active) */}
                        {result.twitchVotesCount > 0 && (
                          <div className="flex items-center gap-6 justify-between border-t border-white/5 pt-1.5">
                            <div className="hidden sm:block flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                              <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-all duration-1000 shadow-[0_0_8px_rgba(168,85,247,0.2)]" style={{ width: `${(result.twitchAverage / 5) * 100}%` }} />
                            </div>
                            
                            <div className="text-right flex items-center gap-2 min-w-[90px]">
                              <div className="flex flex-col items-end">
                                <span className="text-lg font-black text-purple-400 font-mono leading-none">
                                  {result.twitchAverage.toFixed(2)}
                                </span>
                                <span className="text-[9px] font-bold text-purple-500/80 uppercase tracking-wider mt-0.5">
                                  {result.twitchVotesCount} {result.twitchVotesCount === 1 ? 'chat vote' : 'chat votes'}
                                </span>
                              </div>
                              <span className="text-xs text-slate-600">/5</span>
                            </div>
                          </div>
                        )}
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
