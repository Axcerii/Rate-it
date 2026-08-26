'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { QRCodeSVG } from 'qrcode.react';
import {
  Eye,
  EyeOff,
  Copy,
  QrCode,
  Check,
  X,
  Disc,
  Star,
  AlertTriangle,
  Gamepad2,
  ArrowRight,
  ArrowLeft,
  UserX,
  LogOut,
  BarChart2,
  SkipForward,
  Users,
  Trophy,
  Home,
  Loader2,
  Frown,
  Meh as MehIcon,
  Smile,
  Sparkles,
  Crown
} from 'lucide-react';

export default function HostLobby() {
  const router = useRouter();
  const {
    session,
    isConnected,
    leaveRoom,
    deleteRoom,
    startGame,
    nextVideo,
    previousVideo,
    showResults,
    connectTwitch,
    disconnectTwitch,
    getPlaylists,
    getPlaylistDetails,
    toggleLobbyVideo,
    getMalVideos,
    showBanner
  } = useSocket();

  const [joinUrl, setJoinUrl] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [malUsername, setMalUsername] = useState('');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [isTwitchConnecting, setIsTwitchConnecting] = useState(false);
  const [twitchError, setTwitchError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  const handleCopyLink = () => {
    let url = joinUrl;
    if (!url && session?.sessionId && typeof window !== 'undefined') {
      url = `${window.location.origin}/?code=${session.sessionId}`;
    }
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Custom playlist states
  const [playlists, setPlaylists] = useState<{ validated: any[]; community: any[] }>({ validated: [], community: [] });
  const [quizMode, setQuizMode] = useState<'playlist' | 'mal'>('playlist');
  const [playlistTab, setPlaylistTab] = useState<'validated' | 'community'>('validated');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('anime-classics');
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<any[]>([]);
  const [searchPlaylistId, setSearchPlaylistId] = useState('');
  const [searchPlaylistError, setSearchPlaylistError] = useState<string | null>(null);
  const [malTracks, setMalTracks] = useState<any[]>([]);
  const [isLoadingMalTracks, setIsLoadingMalTracks] = useState(false);
  const [malLoadError, setMalLoadError] = useState<string | null>(null);
  const [malConnectedUser, setMalConnectedUser] = useState<string | null>(null);

  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

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

  // Intercept back navigation (browser back button or swipe-back gesture) to confirm room deletion
  useEffect(() => {
    if (!session) return;

    if (typeof window !== 'undefined') {
      window.history.pushState({ hostSession: true }, '', window.location.href);
    }

    const handlePopState = async () => {
      const confirmDelete = window.confirm('Are you sure you want to delete this host room session?');
      if (confirmDelete) {
        try {
          await deleteRoom();
        } catch (err) {
          console.error(err);
          leaveRoom();
        }
        router.push('/');
      } else {
        if (typeof window !== 'undefined') {
          window.history.pushState({ hostSession: true }, '', window.location.href);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [session, deleteRoom, leaveRoom, router]);

  // Load playlists on mount when lobby is active
  useEffect(() => {
    if (session?.status === 'LOBBY') {
      getPlaylists().then(res => {
        setPlaylists(res);
      }).catch(err => console.error(err));
    }
  }, [session?.status, getPlaylists]);

  // Fetch selected playlist details
  useEffect(() => {
    if (session?.status === 'LOBBY' && selectedPlaylistId) {
      getPlaylistDetails(selectedPlaylistId).then(res => {
        setSelectedPlaylistTracks(res.videos);
      }).catch(err => console.error(err));
    }
  }, [session?.status, selectedPlaylistId, getPlaylistDetails]);

  // YouTube API Player setup
  useEffect(() => {
    if (!session || session.status !== 'PLAYING') return;

    const currentVideo = session.videos?.[session.currentVideoIndex];
    if (!currentVideo) return;

    let ytPlayer: any = null;

    const initializePlayer = () => {
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
              console.log('Video ended, auto-revealing vote results...');
              showResults().catch(err => console.error('Failed to reveal results on video end:', err));
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
    setSearchPlaylistError(null);

    if (quizMode === 'mal') {
      const username = malUsername.trim();
      if (!username) {
        showBanner('Please enter your MyAnimeList username to start.', 'error');
        return;
      }

      setLoadingMessage('Fetching MyAnimeList completed list...');
      const t1 = setTimeout(() => {
        setLoadingMessage('Matching anime titles with database...');
      }, 1500);
      const t2 = setTimeout(() => {
        setLoadingMessage('Assembling custom quiz...');
      }, 3000);

      try {
        await startGame(username, undefined);
      } catch (error: any) {
        clearTimeout(t1);
        clearTimeout(t2);
        showBanner(error.message || 'Failed to start game', 'error');
      } finally {
        setLoadingMessage(null);
      }
    } else {
      setLoadingMessage('Loading playlist tracks...');
      try {
        await startGame(undefined, selectedPlaylistId);
      } catch (error: any) {
        showBanner(error.message || 'Failed to start game', 'error');
      } finally {
        setLoadingMessage(null);
      }
    }
  };

  const handleConnectTwitch = async () => {
    if (!twitchChannel.trim()) return;
    setIsTwitchConnecting(true);
    setTwitchError(null);
    try {
      await connectTwitch(twitchChannel.trim());
      showBanner(`Connected to Twitch chat #${twitchChannel.trim()}`, 'announcement');
    } catch (err: any) {
      setTwitchError(err.message || 'Failed to connect Twitch');
      showBanner(err.message || 'Failed to connect Twitch', 'error');
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

  const handleSearchPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchPlaylistError(null);
    if (!searchPlaylistId.trim()) return;

    try {
      const res = await getPlaylistDetails(searchPlaylistId.trim().toUpperCase());
      const alreadyPresent = playlists.community.some(p => p.id === res.playlist.id) || playlists.validated.some(p => p.id === res.playlist.id);
      if (!alreadyPresent) {
        setPlaylists(prev => ({
          ...prev,
          community: [res.playlist, ...prev.community]
        }));
      }
      setSelectedPlaylistId(res.playlist.id);
      setSearchPlaylistId('');
    } catch (err: any) {
      setSearchPlaylistError(err.message || 'Playlist not found');
    }
  };

  const handleLoadMalTracks = async (e: React.FormEvent) => {
    e.preventDefault();
    setMalLoadError(null);
    const username = malUsername.trim();
    if (!username) return;

    setIsLoadingMalTracks(true);
    try {
      const videos = await getMalVideos(username);
      setMalTracks(videos);
      setMalConnectedUser(username);
    } catch (err: any) {
      setMalLoadError(err.message || 'Failed to match MAL videos');
      setMalConnectedUser(null);
      setMalTracks([]);
    } finally {
      setIsLoadingMalTracks(false);
    }
  };

  const handleToggleTrack = async (videoId: string) => {
    try {
      await toggleLobbyVideo(videoId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShowResults = async () => {
    try {
      await showResults();
    } catch (error) {
      console.error('Failed to reveal results:', error);
    }
  };

  const handleProceedAfterReveal = async () => {
    try {
      await nextVideo();
    } catch (error) {
      console.error('Failed to advance:', error);
    }
  };

  const handlePrev = async () => {
    try {
      await previousVideo();
    } catch (error) {
      console.error('Failed to retreat:', error);
    }
  };

  const handleBackToHome = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete this host room session?');
    if (confirmDelete) {
      try {
        await deleteRoom();
      } catch (err) {
        console.error(err);
        leaveRoom();
      }
      router.push('/');
    }
  };

  if (loadingMessage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-6 font-sans text-center min-h-screen">
        <div className="info-card w-full max-w-md p-8 rounded-3xl flex flex-col gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-[#24B3F1] mx-auto" />
          <h2 className="text-2xl font-black text-black font-title uppercase transform rotate-[-1deg]">
            Setting up Quiz
          </h2>
          <div className="py-4 border-t-2 border-b-2 border-black bg-white rounded-xl">
            <p className="text-sm font-black text-[#24B3F1] uppercase tracking-wide animate-pulse">
              {loadingMessage}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-bold">
            Please wait while the server prepares your playlist themes...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-6 font-sans">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent mx-auto" />
          <h2 className="mt-6 text-xl font-black uppercase text-black font-title">Loading Session...</h2>
          <p className="mt-2 text-xs font-bold text-slate-600">Redirecting to home if offline.</p>
          <button
            onClick={handleBackToHome}
            className="mt-6 px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go Back Home</span>
          </button>
        </div>
      </div>
    );
  }

  const playersList = Object.values(session.players || {});
  const activeConnectedPlayers = playersList.filter(p => p.isConnected);
  const skipsCount = Object.keys(session.skips || {}).filter(id => session.players[id]?.isConnected && session.skips?.[id]).length;
  const revealSkipsCount = Object.keys(session.revealSkips || {}).filter(id => session.players[id]?.isConnected && session.revealSkips?.[id]).length;

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-8 py-6 sm:py-12 font-sans w-full max-w-full overflow-x-hidden">
        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6 sm:gap-8">
          <div className="flex flex-col sm:flex-row items-center justify-between border-b-4 border-black pb-4 sm:pb-6 gap-4 text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start">
              <img
                src="/HOST/HostText.png"
                alt="Host Lobby"
                className="h-12 sm:h-20 w-auto object-contain max-w-full"
              />
              <p className="text-xs font-bold text-slate-700 mt-1">Configure your room settings and wait for players</p>
            </div>
            <button
              onClick={handleBackToHome}
              className="px-4 py-2 border-2 border-black bg-[#990000] text-white font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Close Session</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quiz Mode Selector (Goofy Wario style) */}
          <div className="flex flex-col sm:flex-row border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#000] font-black text-xs sm:text-sm uppercase shrink-0">
            <button
              onClick={() => setQuizMode('playlist')}
              className={`flex-1 py-3.5 sm:py-4 px-2 text-center transition-all inline-flex items-center justify-center gap-2 ${quizMode === 'playlist'
                ? 'bg-play text-black'
                : 'bg-white text-black hover:bg-slate-100'
                }`}
            >
              <span>Play a Playlist (Pre-made or Custom)</span>
            </button>
            <button
              onClick={() => setQuizMode('mal')}
              className={`flex-1 py-3.5 sm:py-4 px-2 text-center transition-all inline-flex items-center justify-center gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-black ${quizMode === 'mal'
                ? 'bg-[#990000] text-white'
                : 'bg-white text-black hover:bg-slate-100'
                }`}
            >
              <Star className="w-4 h-4 shrink-0" />
              <span>Play MyAnimeList Quiz</span>
            </button>
          </div>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-5 flex-1 items-start w-full max-w-full">
            {/* Left side parameters (2/5) */}
            <div className="lg:col-span-2 flex flex-col gap-6 w-full max-w-full overflow-hidden">
              {/* Room Code Card */}
              <div className="info-card p-3.5 sm:p-6 text-center rounded-2xl flex flex-col items-center w-full max-w-full">
                <h3 className="text-xs font-black uppercase text-slate-600">Room Code</h3>

                <div className="mt-3 w-full text-2xl sm:text-4xl font-black tracking-wider sm:tracking-widest text-black bg-white py-2.5 sm:py-3 rounded-xl border-2 border-black shadow-inner flex items-center justify-center gap-2 sm:gap-3 relative overflow-hidden px-2">
                  <span className="font-mono select-all">
                    {showRoomCode ? session.sessionId : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRoomCode(!showRoomCode)}
                    title={showRoomCode ? 'Hide Code' : 'Show Code'}
                    className="hover:scale-110 active:scale-95 transition-transform p-1 text-slate-700"
                  >
                    {showRoomCode ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center w-full">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 sm:px-4 py-2 border-2 border-black bg-[#24B3F1] text-black font-black text-[10px] sm:text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition inline-flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>Copy Join Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQRCode(!showQRCode)}
                    className="px-3 sm:px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-[10px] sm:text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition inline-flex items-center justify-center gap-1.5"
                  >
                    {showQRCode ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 shrink-0" />
                        <span>Hide QR Code</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span>Show QR Code</span>
                      </>
                    )}
                  </button>
                </div>

                {showQRCode && joinUrl && (
                  <div className="mt-4 flex flex-col items-center gap-4 w-full">
                    <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#000]">
                      <QRCodeSVG value={joinUrl} size={140} level="H" includeMargin={false} />
                    </div>
                    <p className="text-[10px] text-slate-700 font-bold leading-relaxed max-w-xs mt-1">
                      Scan or open this link to rate:
                      <br />
                      <span className="text-[#24B3F1] break-all select-all font-mono">{joinUrl}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* MAL Custom Quiz */}
              {quizMode === 'mal' && (
                <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col gap-3 w-full max-w-full overflow-hidden">
                  <h3 className="text-sm font-black text-black uppercase flex items-center gap-2 border-b border-black pb-2">
                    <span>MyAnimeList Quiz</span>
                    <span className="text-[9px] bg-[#24B3F1]/20 text-cyan-950 px-2 py-0.5 rounded font-black uppercase">Active</span>
                  </h3>
                  <p className="text-[10px] text-slate-700 font-bold">
                    Filters themes using your completed MAL profile.
                  </p>

                  <form onSubmit={handleLoadMalTracks} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={malUsername}
                      onChange={(e) => setMalUsername(e.target.value)}
                      placeholder="MAL Username..."
                      className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-white text-xs font-bold"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingMalTracks}
                      className="px-4 py-2 border-2 border-black bg-white text-black font-black text-xs uppercase rounded-lg shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 shrink-0"
                    >
                      {isLoadingMalTracks ? '...' : 'Load'}
                    </button>
                  </form>

                  {malLoadError && (
                    <p className="text-[10px] text-[#990000] font-black flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{malLoadError}</span>
                    </p>
                  )}

                  {malConnectedUser && (
                    <div className="bg-emerald-50 p-2.5 border-2 border-emerald-500 rounded-xl text-left shrink-0">
                      <span className="text-[10px] text-emerald-950 font-black flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Connected: {malConnectedUser}'s Profile ({malTracks.length} matched openings)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Twitch Votes */}
              <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col gap-3 w-full max-w-full overflow-hidden">
                <h3 className="text-sm font-black text-black uppercase flex items-center gap-2 border-b border-black pb-2">
                  <span>Twitch Chat Votes</span>
                  <span className="text-[9px] bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded font-black uppercase">optional</span>
                </h3>
                <p className="text-[10px] text-slate-700 font-bold">
                  Connect chat to aggregate rating numbers (1 to 5) from viewers.
                </p>
                {session.twitchChannel ? (
                  <div className="flex flex-col gap-2 bg-purple-50 p-3 border-2 border-purple-300 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-900 font-black flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                        Connected to #{session.twitchChannel}
                      </span>
                      <button
                        onClick={handleDisconnectTwitch}
                        className="text-xs text-[#990000] hover:text-red-500 font-black shrink-0"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={twitchChannel}
                      onChange={(e) => setTwitchChannel(e.target.value)}
                      placeholder="Channel name..."
                      className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white focus:outline-none text-xs font-bold"
                    />
                    <button
                      onClick={handleConnectTwitch}
                      disabled={isTwitchConnecting}
                      className="px-4 py-2 bg-[#24B3F1] text-black border-2 border-black font-black text-xs uppercase rounded-lg shadow-[1px_1px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 disabled:opacity-50 shrink-0"
                    >
                      {isTwitchConnecting ? '...' : 'Connect'}
                    </button>
                  </div>
                )}
                {twitchError && (
                  <p className="text-[10px] text-[#990000] font-black flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{twitchError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right side parameters (3/5) */}
            <div className="lg:col-span-3 flex flex-col gap-6 w-full max-w-full overflow-hidden">
              {quizMode === 'playlist' ? (
                /* PLAYLIST SELECTION CARD */
                <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col min-h-[420px] w-full max-w-full overflow-hidden">
                  <h3 className="text-sm font-black text-black uppercase border-b-2 border-black pb-2 mb-4 text-cyan-950">
                    Playlist Selection & Skip Toggles
                  </h3>

                  {/* Search Playlist ID */}
                  <form onSubmit={handleSearchPlaylist} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={searchPlaylistId}
                      onChange={(e) => setSearchPlaylistId(e.target.value)}
                      placeholder="Share Playlist ID..."
                      className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white text-xs font-bold focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 border-2 border-black bg-white text-cyan-950 font-black text-xs uppercase rounded-lg shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                    >
                      Load
                    </button>
                  </form>
                  {searchPlaylistError && (
                    <p className="text-[10px] text-[#990000] font-black mb-3 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{searchPlaylistError}</span>
                    </p>
                  )}

                  {/* Playlist Tabs (Validated vs Community) */}
                  <div className="flex border-b-2 border-black pb-2 mb-4 gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setPlaylistTab('validated')}
                      className={`flex-1 px-2 sm:px-3 py-1.5 border-2 border-black font-black text-[9px] sm:text-[10px] uppercase rounded-lg transition text-center ${playlistTab === 'validated'
                        ? 'bg-[#24B3F1] text-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white hover:bg-slate-100'
                        }`}
                    >
                      Validated ({playlists.validated.length})
                    </button>
                    <button
                      onClick={() => setPlaylistTab('community')}
                      className={`flex-1 px-2 sm:px-3 py-1.5 border-2 border-black font-black text-[9px] sm:text-[10px] uppercase rounded-lg transition text-center ${playlistTab === 'community'
                        ? 'bg-[#24B3F1] text-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white hover:bg-slate-100'
                        }`}
                    >
                      Community ({playlists.community.length})
                    </button>
                  </div>

                  {/* Playlist Cards List (Scrollable box) */}
                  <div className="flex-1 border-2 border-black bg-white p-2.5 sm:p-3 rounded-xl max-h-48 overflow-y-auto mb-4 flex flex-col gap-3">
                    {(() => {
                      const activeLists = playlistTab === 'validated' ? playlists.validated : playlists.community;
                      if (activeLists.length === 0) {
                        return <p className="text-xs text-slate-500 font-bold text-center py-6">No playlists in this category.</p>;
                      }
                      return activeLists.map((p) => {
                        const isSelected = p.id === selectedPlaylistId;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlaylistId(p.id)}
                            className={`p-2.5 sm:p-3 border-2 rounded-xl transition cursor-pointer flex justify-between items-center gap-2 sm:gap-4 ${isSelected
                              ? 'border-4 border-black bg-yellow-100 shadow-[2px_2px_0px_#000]'
                              : 'border-black bg-white hover:bg-slate-50'
                              }`}
                          >
                            <div className="text-left flex-1 min-w-0 truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                {isSelected && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                                <span className="font-black text-xs text-black truncate block max-w-[100px] sm:max-w-xs">
                                  {p.name}
                                </span>
                              </div>
                              {p.description && (
                                <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[100px] sm:max-w-xs">
                                  {p.description}
                                </p>
                              )}
                              <span className="text-[8px] font-mono text-slate-400 block mt-1 uppercase">
                                ID: {p.id}
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-[8px] bg-slate-100 border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                <Gamepad2 className="w-3 h-3" />
                                <span>{p.played_count || 0} plays</span>
                              </span>
                              {isSelected ? (
                                <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded border border-black font-black uppercase">
                                  Selected
                                </span>
                              ) : (
                                <span className="text-[8px] bg-white text-slate-500 hover:text-black px-1.5 py-0.5 rounded border border-black font-black uppercase">
                                  Select
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Tracks list inside selected playlist with toggles */}
                  <div className="flex-1 border-2 border-black bg-white p-2.5 sm:p-3 rounded-xl max-h-56 overflow-y-auto mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">
                      Lobby Tracks Checklists (Uncheck to skip)
                    </p>
                    {selectedPlaylistTracks.length === 0 ? (
                      <p className="text-[10px] text-slate-400 py-3 text-center">Loading playlist tracks...</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedPlaylistTracks.map((track) => {
                          const isDisabled = session.disabledVideoIds?.[track.id] || false;
                          return (
                            <div key={track.id} className="flex items-center justify-between text-xs font-bold py-1 border-b border-slate-100 last:border-b-0 gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                                <span className="truncate text-black text-[11px] sm:text-xs">
                                  <span className="font-black">{track.title}</span>
                                  <span className="text-slate-600 font-bold"> by {track.artistName || 'Unknown Artist'}</span>
                                  {track.description && <span className="text-slate-500 font-normal"> — {track.description}</span>}
                                </span>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={!isDisabled}
                                  onChange={() => handleToggleTrack(track.id)}
                                  className="h-4 w-4 accent-[#24B3F1] cursor-pointer"
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* MYANIMELIST SELECTION CARD */
                <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col min-h-[420px] w-full max-w-full overflow-hidden">
                  <h3 className="text-sm font-black text-black uppercase border-b-2 border-black pb-2 mb-4 text-[#990000]">
                    MyAnimeList Openings & Skip Toggles
                  </h3>

                  {malConnectedUser ? (
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="bg-emerald-50 p-3 border-2 border-emerald-500 rounded-xl text-left shrink-0">
                        <p className="text-xs text-emerald-950 font-black">
                          Displaying matched openings list for account: <span className="underline">{malConnectedUser}</span> ({malTracks.length} total tracks found)
                        </p>
                      </div>

                      {/* Tracks list checklist with toggles */}
                      <div className="flex-1 border-2 border-black bg-white p-2.5 sm:p-3 rounded-xl max-h-[300px] overflow-y-auto mb-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">
                          MAL Matched Openings (Uncheck to skip)
                        </p>
                        {malTracks.length === 0 ? (
                          <p className="text-xs text-slate-400 py-6 text-center">No matching database anime found in list.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {malTracks.map((track) => {
                              const isDisabled = session.disabledVideoIds?.[track.id] || false;
                              return (
                                <div key={track.id} className="flex items-center justify-between text-xs font-bold py-1.5 border-b border-slate-100 last:border-b-0 gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                                    <span className="truncate text-black text-[11px] sm:text-xs">
                                      <span className="font-black">{track.title}</span>
                                      <span className="text-slate-600 font-bold"> by {track.artistName || 'Unknown Artist'}</span>
                                      {track.description && <span className="text-slate-500 font-normal"> — {track.description}</span>}
                                    </span>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={!isDisabled}
                                      onChange={() => handleToggleTrack(track.id)}
                                      className="h-4 w-4 accent-[#990000] cursor-pointer"
                                    />
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                      <ArrowRight className="w-8 h-8 text-[#990000] animate-pulse mb-2" />
                      <p className="mt-2 text-xs font-black text-slate-600 uppercase max-w-xs leading-relaxed">
                        Enter your MyAnimeList Username and click <span className="text-[#990000] font-black">Load</span> on the left panel to configure matched openings skip checklist.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Connected players list */}
              <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col min-h-[220px] w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                  <h3 className="text-sm font-black text-black uppercase flex items-center gap-2">
                    Players Joined
                    <span className="bg-black text-[#faf6eb] px-2 py-0.5 rounded text-xs font-mono">
                      {playersList.length}
                    </span>
                  </h3>
                </div>

                {playersList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-6 text-center">
                    <UserX className="w-8 h-8 text-slate-400 animate-pulse mb-2" />
                    <p className="text-xs font-bold text-slate-600 mt-2">Waiting for players to connect...</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 max-h-40 overflow-y-auto pr-1">
                    {playersList.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-2.5 sm:p-3 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000] ${player.isConnected ? 'opacity-100' : 'opacity-50 bg-slate-100'
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-500 border border-black' : 'bg-slate-500'}`} />
                          <span className="font-black text-xs text-black truncate">{player.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-black flex justify-end">
                  <button
                    onClick={handleStartGame}
                    disabled={playersList.length === 0}
                    className="w-full sm:w-auto px-6 py-3 bg-[#24B3F1] border-2 border-black text-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <span>Start Quiz ({playersList.length} players)</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PLAYING VIEW
  if (session.status === 'PLAYING') {
    const currentVideo = session.videos?.[session.currentVideoIndex];
    if (!currentVideo) return null;

    const currentRoundRes = session.results?.[currentVideo.id];
    const playerVotesList = Object.values(session.votes || {});
    const pAvg = currentRoundRes?.average ?? (
      playerVotesList.length > 0
        ? parseFloat((playerVotesList.reduce((a, b) => a + b, 0) / playerVotesList.length).toFixed(2))
        : 0
    );
    const pCount = currentRoundRes?.votesCount ?? playerVotesList.length;

    const twitchVotesList = Object.values(session.twitchVotes || {});
    const tAvg = currentRoundRes?.twitchAverage ?? (
      twitchVotesList.length > 0
        ? parseFloat((twitchVotesList.reduce((a, b) => a + b, 0) / twitchVotesList.length).toFixed(2))
        : 0
    );
    const tCount = currentRoundRes?.twitchVotesCount ?? twitchVotesList.length;

    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-4 sm:py-6 font-sans w-full max-w-full overflow-x-hidden">
        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6">
          {/* Top Panel bar */}
          <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 sm:pb-4 gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
                <span>Lobby Code:</span>
                <span className="font-mono font-black text-black">
                  {showRoomCode ? session.sessionId : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRoomCode(!showRoomCode)}
                  className="hover:scale-110 active:scale-95 transition-transform text-xs"
                  title={showRoomCode ? 'Hide Code' : 'Show Code'}
                >
                  {showRoomCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </span>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-1.5"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleBackToHome}
              className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 font-black text-xs uppercase rounded-xl shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Quit Game</span>
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 flex-1 items-stretch">
            {/* Video Player Box (2/3) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="aspect-video w-full rounded-2xl border-4 border-black bg-black shadow-[6px_6px_0px_0px_#000] overflow-hidden relative">
                <div id="youtube-player-container" className="w-full h-full" />
              </div>

              {/* Navigation controls */}
              <div className="flex flex-wrap justify-between items-center bg-[#f0ead8] border-4 border-black p-3 sm:p-4 rounded-2xl shadow-[4px_4px_0px_#000] gap-2">
                <button
                  onClick={handlePrev}
                  disabled={session.currentVideoIndex === 0}
                  className="px-3 sm:px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 font-black text-xs uppercase rounded-xl transition disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-black text-black">
                  Track {session.currentVideoIndex + 1} / {session.videos?.length}
                </span>

                {session.phase === 'REVEAL' ? (
                  <button
                    onClick={handleProceedAfterReveal}
                    className="px-4 sm:px-5 py-2.5 bg-[#24B3F1] border-2 border-black text-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-1.5"
                  >
                    <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Show Results' : 'Next Theme'}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={handleShowResults}
                    className="px-4 sm:px-5 py-2.5 bg-[#24B3F1] border-2 border-black text-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-1.5"
                  >
                    <BarChart2 className="w-4 h-4 shrink-0" />
                    <span>Show Vote Results</span>
                  </button>
                )}
              </div>
            </div>

            {/* Side info & live votes status (1/3) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Currently Playing details */}
              <div className="bg-[#f0ead8] border-4 border-black p-4 sm:p-6 rounded-2xl shadow-[4px_4px_0px_#000]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Currently playing</span>
                <h2 className="mt-2 text-xl sm:text-2xl font-black text-black leading-tight border-b-2 border-black pb-2 mb-2">
                  {currentVideo.title}
                </h2>
                <p className="text-xs font-bold text-cyan-950">
                  By {currentVideo.artistName || 'Unknown Artist'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                </p>
              </div>

              {/* Twitch Live votes tracking */}
              {session.twitchChannel && (
                <div className="bg-[#f0ead8] border-4 border-black p-4 sm:p-5 rounded-2xl shadow-[4px_4px_0px_#000] flex flex-col gap-2">
                  <h3 className="text-xs font-black uppercase text-purple-700 flex items-center gap-1.5 border-b border-purple-200 pb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse border border-black" />
                    Twitch Chat Votes
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-700 font-bold">Votes received:</span>
                    <span className="text-lg font-black text-black font-mono">
                      {Object.keys(session.twitchVotes || {}).length}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Players Voting details */}
              <div className="flex-1 bg-[#f0ead8] border-4 border-black p-4 sm:p-6 rounded-2xl shadow-[4px_4px_0px_#000] flex flex-col">
                <div className="flex items-center justify-between border-b border-black pb-2 mb-4">
                  <h3 className="text-xs font-black uppercase text-black">
                    Active Votes ({Object.keys(session.votes || {}).length} / {playersList.length})
                  </h3>
                  {session.phase === 'REVEAL' ? (
                    <span className="text-[9px] bg-purple-100 text-purple-800 border border-black font-black px-2 py-0.5 rounded-lg">
                      Ready: {revealSkipsCount}/{activeConnectedPlayers.length}
                    </span>
                  ) : (
                    <span className="text-[9px] bg-blue-100 text-blue-800 border border-black font-black px-2 py-0.5 rounded-lg">
                      Skips: {skipsCount}/{activeConnectedPlayers.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-48 flex flex-col gap-2 pr-1">
                  {playersList.map((player) => {
                    const hasVoted = session.votes?.[player.id] !== undefined;
                    const hasSkipped = session.phase === 'REVEAL'
                      ? session.revealSkips?.[player.id]
                      : session.skips?.[player.id];

                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-2.5 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-500 border border-black' : 'bg-slate-500'}`} />
                          <span className="font-black text-xs text-black truncate max-w-[100px] sm:max-w-[120px]">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasSkipped && (
                            <span className="px-1.5 py-0.5 border border-black rounded bg-slate-200 text-slate-800 text-[8px] font-black uppercase flex items-center gap-1">
                              <span>Skipped</span>
                              <SkipForward className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {hasVoted ? (
                            <span className="px-2 py-0.5 border border-black rounded-lg bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase animate-pulse flex items-center gap-1">
                              <span>Voted</span>
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 border border-black rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                              Voting...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WarioWare-styled Reveal Modal */}
        {session.phase === 'REVEAL' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 p-2">
            <div className="w-full max-w-3xl bg-[#f0ead8] border-4 border-black p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[8px_8px_0px_#000] text-center flex flex-col gap-4 sm:gap-6 relative overflow-hidden max-h-[92vh] overflow-y-auto">
              <div className="flex flex-col gap-1 z-10">
                <span className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Round Results</span>
                <h2 className="text-xl sm:text-3xl font-black text-black leading-tight border-b-2 border-black pb-2 mb-1">
                  {currentVideo.title}
                </h2>
                <p className="text-xs sm:text-sm font-black text-cyan-950">
                  By {currentVideo.artistName || 'Unknown Artist'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                </p>
              </div>

              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 mt-1 z-10">
                {/* Players Rating Card */}
                <div className="rounded-2xl border-4 border-black bg-white p-4 sm:p-5 flex flex-col items-center justify-center gap-2 shadow-[4px_4px_0px_#000]">
                  <span className="text-[10px] uppercase font-black text-cyan-950 tracking-wider">Players Average</span>
                  <span className="text-4xl sm:text-5xl font-black text-black font-mono leading-none">
                    {pAvg.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 font-bold mt-1">
                    from {pCount} {pCount === 1 ? 'player' : 'players'}
                  </span>
                </div>

                {/* Twitch Rating Card */}
                <div className="rounded-2xl border-4 border-black bg-white p-4 sm:p-5 flex flex-col items-center justify-center gap-2 shadow-[4px_4px_0px_#000]">
                  <span className="text-[10px] uppercase font-black text-purple-700 tracking-wider">Twitch Chat Average</span>
                  {tCount > 0 ? (
                    <>
                      <span className="text-4xl sm:text-5xl font-black text-black font-mono leading-none">
                        {tAvg.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500 font-bold mt-1">
                        from {tCount} {tCount === 1 ? 'chat vote' : 'chat votes'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-slate-400 font-mono py-2 mt-1">
                        N/A
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        No Twitch chat votes
                      </span>
                    </>
                  )}
                </div>

                {/* All-Time Historical Average Card */}
                {currentRoundRes?.historicalAverage !== undefined && (
                  <div className="sm:col-span-2 rounded-2xl border-2 border-black bg-amber-50 p-3.5 flex items-center justify-between shadow-[2px_2px_0px_#000] text-left">
                    <div>
                      <span className="text-[10px] uppercase font-black text-amber-950 tracking-wider block">All-Time Global Rating</span>
                      <span className="text-[10px] text-amber-800 font-bold">Based on {currentRoundRes.historicalVotesCount || 0} historical ratings across all room sessions</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black text-[#faf6eb] px-3 py-1.5 rounded-xl border-2 border-black font-mono font-black text-sm sm:text-base shrink-0">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                      <span>{currentRoundRes.historicalAverage.toFixed(2)} / 5</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement 2: Individual Player Votes Breakdown */}
              <div className="rounded-2xl border-4 border-black bg-white p-3 sm:p-4 shadow-[4px_4px_0px_#000] text-left z-10">
                <h4 className="text-xs font-black uppercase text-black border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#24B3F1]" />
                    <span>Player Votes Breakdown</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">({playersList.length} players)</span>
                </h4>
                {playersList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No connected players</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {playersList.map((player) => {
                      const playerVote = session.votes?.[player.id];
                      let voteBadge = (
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 uppercase flex items-center gap-1">
                          <span>No vote</span>
                          <X className="w-3 h-3" />
                        </span>
                      );
                      if (playerVote !== undefined) {
                        const labels: Record<number, { text: string; bg: string; icon: React.ReactNode }> = {
                          1: { text: '1 Awful', bg: 'bg-red-600 text-white', icon: <Frown className="w-3 h-3" /> },
                          2: { text: '2 Meh', bg: 'bg-orange-500 text-white', icon: <MehIcon className="w-3 h-3" /> },
                          3: { text: '3 Good', bg: 'bg-yellow-400 text-black', icon: <Smile className="w-3 h-3" /> },
                          4: { text: '4 Great', bg: 'bg-emerald-500 text-white', icon: <Sparkles className="w-3 h-3" /> },
                          5: { text: '5 Masterpiece', bg: 'bg-[#24B3F1] text-black', icon: <Crown className="w-3 h-3 text-amber-300" /> },
                        };
                        const l = labels[playerVote] || { text: `Score ${playerVote}`, bg: 'bg-black text-white', icon: null };
                        voteBadge = (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase flex items-center gap-1 ${l.bg}`}>
                            <span>{l.text}</span>
                            {l.icon}
                          </span>
                        );
                      }
                      return (
                        <div key={player.id} className="flex items-center justify-between p-2 border-2 border-black rounded-xl bg-slate-50 shadow-[1px_1px_0px_#000]">
                          <span className="text-xs font-black text-black truncate max-w-[90px] sm:max-w-[110px]">{player.name}</span>
                          {voteBadge}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-center z-10">
                <button
                  onClick={handleProceedAfterReveal}
                  className="px-6 sm:px-8 py-3 bg-[#24B3F1] text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-2"
                >
                  <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Go to Leaderboard' : 'Continue to Next Track'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
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
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-6 sm:py-12 font-sans w-full max-w-full overflow-x-hidden">
        <div className="z-10 w-full max-w-4xl mx-auto flex flex-col flex-1 gap-6 sm:gap-8 justify-center">
          <div className="text-center border-b-4 border-black pb-4">
            <h1 className="text-2xl sm:text-4xl font-[#990000] font-black font-title uppercase drop-shadow-[2px_2px_0px_#000] flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
              <span>FINAL LEADERBOARD</span>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
            </h1>
            <p className="text-xs font-bold text-slate-700 mt-2">Ranked from the worst average score to the best</p>
          </div>

          <div className="bg-[#f0ead8] border-4 border-black p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_0px_#000] sm:shadow-[6px_6px_0px_0px_#000] flex flex-col gap-6 w-full max-w-full overflow-hidden">
            {sortedResults.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-bold text-xs">
                No votes were recorded during this session.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sortedResults.map((result, idx) => {
                  const percent = (result.average / 5) * 100;

                  // Color highlights based on rankings
                  let cardBg = "bg-white";
                  let borderStyle = "border-2 border-black shadow-[3px_3px_0px_#000]";

                  if (idx === sortedResults.length - 1) {
                    // Winner gets the highlighted bright Wario yellow card
                    cardBg = "bg-[#facc15]";
                    borderStyle = "border-4 border-black shadow-[4px_4px_0px_#000] transform rotate-[1deg]";
                  } else if (idx === 0) {
                    // Worst rating gets a red tint card
                    cardBg = "bg-red-50";
                  }

                  return (
                    <div
                      key={result.id}
                      className={`relative p-5 rounded-2xl ${cardBg} ${borderStyle} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl border-2 border-black bg-black text-[#faf6eb] flex items-center justify-center font-black text-lg">
                          #{sortedResults.length - idx}
                        </div>
                        <div>
                          <h3 className="font-black text-black text-sm sm:text-base leading-snug">
                            {result.title}
                          </h3>
                          <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                            By {result.artistName || 'Unknown Artist'} {result.description ? `— ${result.description}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Score metrics & fills */}
                      <div className="flex flex-col gap-2 sm:w-1/2 justify-center">
                        <div className="flex items-center gap-4 justify-between">
                          {/* Players Flat Score Bar */}
                          <div className="hidden sm:block flex-1 bg-[#faf6eb] border-2 border-black rounded-full h-3.5 overflow-hidden">
                            <div className="h-full bg-[#24B3F1] border-r-2 border-black rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                          </div>

                          <div className="text-right flex items-center gap-2 min-w-[90px]">
                            <div className="flex flex-col items-end">
                              <span className="text-lg font-black text-black font-mono leading-none">
                                {result.average.toFixed(2)}
                              </span>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mt-0.5">
                                {result.votesCount} {result.votesCount === 1 ? 'player' : 'players'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-bold">/5</span>
                          </div>
                        </div>

                        {/* Twitch Chat metrics */}
                        {result.twitchVotesCount !== undefined && result.twitchVotesCount > 0 && (
                          <div className="flex items-center gap-4 justify-between border-t border-black/10 pt-2">
                            {/* Twitch Flat Score Bar */}
                            <div className="hidden sm:block flex-1 bg-[#faf6eb] border-2 border-black rounded-full h-3.5 overflow-hidden">
                              <div className="h-full bg-purple-600 border-r-2 border-black rounded-full transition-all duration-1000" style={{ width: `${((result.twitchAverage ?? 0) / 5) * 100}%` }} />
                            </div>

                            <div className="text-right flex items-center gap-2 min-w-[90px]">
                              <div className="flex flex-col items-end">
                                <span className="text-lg font-black text-purple-700 font-mono leading-none">
                                  {(result.twitchAverage ?? 0).toFixed(2)}
                                </span>
                                <span className="text-[8px] font-black text-purple-600 uppercase tracking-wider mt-0.5">
                                  {result.twitchVotesCount} {result.twitchVotesCount === 1 ? 'chat vote' : 'chat votes'}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 font-bold">/5</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center border-t-2 border-black pt-6 mt-2">
              <button
                onClick={handleBackToHome}
                className="px-8 py-3.5 bg-[#24B3F1] border-2 border-black text-black font-black text-sm uppercase rounded-xl shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Back to Homepage</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
