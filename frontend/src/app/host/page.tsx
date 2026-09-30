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
  Film,
  MonitorPlay,
  ArrowRight,
  ArrowLeft,
  UserX,
  LogOut,
  BarChart2,
  SkipForward,
  Users,
  Home,
  Loader2,
  FastForward,
  Ghost,
  ThumbsUp,
  ListPlus,
  Sparkles,
  Crown,
  Shuffle,
  Search,
  Play,
  ExternalLink,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import gsap from 'gsap';
import { LeaderboardCard, LeaderboardSortButtons } from '@/components/leaderboard';
import HomeButton from '@/components/HomeButton';
import { PlaylistCard, PlaylistFilters } from '@/components/playlist';

const CATEGORIES = [
  'Anime/Manga',
  'Film/Cinéma',
  'Jeux Vidéo',
  'Série/TV',
  'Dessins Animés/Cartoons',
  'Streaming/VTuber',
  'Youtube',
] as const;

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
    getAnilistVideos,
    showBanner,
    toggleHostPlayer,
    submitVote,
    toggleSkip,
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<any[]>([]);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [searchPlaylistId, setSearchPlaylistId] = useState('');
  const [searchPlaylistError, setSearchPlaylistError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tracksCache, setTracksCache] = useState<{ [id: string]: any[] }>({});
  const [loadingTracks, setLoadingTracks] = useState<{ [id: string]: boolean }>({});
  const [visibleTrackCounts, setVisibleTrackCounts] = useState<{ [id: string]: number }>({});
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isPlayersTabCollapsed, setIsPlayersTabCollapsed] = useState(false);
  const [showMobilePlayersModal, setShowMobilePlayersModal] = useState(false);
  const initialUrlLoadedRef = useRef(false);

  const [animePlatform, setAnimePlatform] = useState<'mal' | 'anilist'>('mal');
  const [anilistUsername, setAnilistUsername] = useState('');
  const [animeConnectedPlatform, setAnimeConnectedPlatform] = useState<'mal' | 'anilist'>('mal');
  const [malTracks, setMalTracks] = useState<any[]>([]);
  const [isLoadingMalTracks, setIsLoadingMalTracks] = useState(false);
  const [malLoadError, setMalLoadError] = useState<string | null>(null);
  const [malConnectedUser, setMalConnectedUser] = useState<string | null>(null);

  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true);
  const [hostCustomName, setHostCustomName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('rate_it_host_name');
    if (saved && saved.trim().toUpperCase() !== 'HOST') {
      setHostCustomName(saved);
    } else if (
      session?.hostPlayerId &&
      session.players?.[session.hostPlayerId]?.name &&
      session.players[session.hostPlayerId].name.trim().toUpperCase() !== 'HOST'
    ) {
      setHostCustomName(session.players[session.hostPlayerId].name);
    }
  }, [session?.hostPlayerId, session?.players]);

  // Leaderboard sorting state
  const [leaderboardSortType, setLeaderboardSortType] = useState<'players' | 'twitch'>('players');
  const [leaderboardSortDir, setLeaderboardSortDir] = useState<'desc' | 'asc'>('asc');

  // GSAP Progressive reveal animation states
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDarkAmbianceActive, setIsDarkAmbianceActive] = useState(false);
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false);
  const [showSidebars, setShowSidebars] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const cardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  // Client-side multi-word search filter with op/opening and ed/ending alias support
  const filterPlaylists = (list: any[]) => {
    if (!playlistSearchQuery.trim()) return list;

    const processed = playlistSearchQuery
      .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2')
      .replace(/(\d+)([a-zA-Z]+)/g, '$1 $2');

    const tokens = processed
      .toLowerCase()
      .split(/[\s,_\-:/\\+]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return list;

    return list.filter((p) => {
      const corpus = `${p.name || ''} ${p.description || ''} ${p.id || ''}`.toLowerCase();

      return tokens.every((token) => {
        if (token === 'op' || token === 'opening' || token === 'openings') {
          return /\b(op[0-9]*|opening[s]?)\b/i.test(corpus);
        }
        if (token === 'ed' || token === 'ending' || token === 'endings') {
          return /\b(ed[0-9]*|ending[s]?)\b/i.test(corpus);
        }
        if (token === 'ost' || token === 'soundtrack' || token === 'soundtracks') {
          return /\b(ost|soundtrack[s]?)\b/i.test(corpus);
        }
        return corpus.includes(token);
      });
    });
  };

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
      const confirmDelete = window.confirm('Êtes-vous sûr de vouloir quitter et supprimer la salle ?');
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

  // Fetch selected playlist details and cache tracks
  useEffect(() => {
    if (session?.status === 'LOBBY' && selectedPlaylistId) {
      if (!tracksCache[selectedPlaylistId] && !loadingTracks[selectedPlaylistId]) {
        setLoadingTracks((prev) => ({ ...prev, [selectedPlaylistId]: true }));
        getPlaylistDetails(selectedPlaylistId)
          .then((res) => {
            const vids = res.videos || [];
            setTracksCache((prev) => ({
              ...prev,
              [selectedPlaylistId]: vids,
            }));
            setSelectedPlaylistTracks(vids);
          })
          .catch((err) => console.error(err))
          .finally(() => {
            setLoadingTracks((prev) => ({ ...prev, [selectedPlaylistId]: false }));
          });
      } else if (tracksCache[selectedPlaylistId]) {
        setSelectedPlaylistTracks(tracksCache[selectedPlaylistId]);
      }
    }
  }, [session?.status, selectedPlaylistId, getPlaylistDetails, tracksCache, loadingTracks]);

  // Pre-select playlist if passed via URL query parameter (?playlistId=...)
  // Runs ONCE on mount so that subsequent playlist selections are not overridden!
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.status === 'LOBBY' && !initialUrlLoadedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const preselectedId = params.get('playlistId');
      if (preselectedId) {
        initialUrlLoadedRef.current = true;
        setSelectedPlaylistId(preselectedId);
        setQuizMode('playlist');
        setExpandedIds(new Set([preselectedId]));
        // Clean URL so the query param doesn't lock playlist selection
        const url = new URL(window.location.href);
        url.searchParams.delete('playlistId');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, [session?.status]);

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
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // @ts-ignore
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
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
    if (activeConnectedPlayers.length === 0) {
      showBanner('Veuillez attendre au moins un joueur connecté ou cochez "Host joueur"', 'error');
      return;
    }

    setIsStartingGame(true);
    if (quizMode === 'mal') {
      const currentPlatform = animeConnectedPlatform || animePlatform;
      const username = currentPlatform === 'anilist' ? anilistUsername.trim() : malUsername.trim();
      if (!username) {
        showBanner(
          currentPlatform === 'anilist'
            ? 'Indiquez votre nom d\'utilisateur AniList pour commencer.'
            : 'Indiquez votre nom d\'utilisateur MyAnimeList pour commencer.',
          'warning'
        );
        setIsStartingGame(false);
        return;
      }

      setLoadingMessage(
        currentPlatform === 'anilist'
          ? 'Récupération de vos animés AniList...'
          : 'Récupération de vos animés MyAnimeList...'
      );
      const t1 = setTimeout(() => {
        setLoadingMessage('Association avec la base de données...');
      }, 1500);
      const t2 = setTimeout(() => {
        setLoadingMessage('Récupération des liens vidéos...');
      }, 3000);

      try {
        if (currentPlatform === 'anilist') {
          await startGame(undefined, undefined, isShuffleEnabled, username);
        } else {
          await startGame(username, undefined, isShuffleEnabled);
        }
      } catch (error: any) {
        clearTimeout(t1);
        clearTimeout(t2);
        showBanner(error.message || 'Erreur : Impossible de commencer la partie.', 'error');
      } finally {
        setLoadingMessage(null);
        setIsStartingGame(false);
      }
    } else {
      if (!selectedPlaylistId) {
        showBanner('Veuillez sélectionner une playlist pour commencer la partie.', 'warning');
        setIsStartingGame(false);
        return;
      }
      setLoadingMessage('Récupération de la playlist...');
      try {
        await startGame(undefined, selectedPlaylistId, isShuffleEnabled);
      } catch (error: any) {
        showBanner(error.message || 'Erreur : Impossible de commencer la partie.', 'error');
      } finally {
        setLoadingMessage(null);
        setIsStartingGame(false);
      }
    }
  };

  const handleToggleExpand = async (playlistId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });

    if (!tracksCache[playlistId] && !loadingTracks[playlistId]) {
      setLoadingTracks((prev) => ({ ...prev, [playlistId]: true }));
      try {
        const details = await getPlaylistDetails(playlistId);
        const videos = details.videos || [];
        setTracksCache((prev) => ({
          ...prev,
          [playlistId]: videos,
        }));
        if (playlistId === selectedPlaylistId) {
          setSelectedPlaylistTracks(videos);
        }
      } catch (err: any) {
        console.error('Failed to load tracks for playlist:', err);
        showBanner(err.message || 'Impossible de charger les morceaux de cette playlist', 'error');
      } finally {
        setLoadingTracks((prev) => ({ ...prev, [playlistId]: false }));
      }
    }
  };

  const handleShowMoreTracks = (playlistId: string) => {
    setVisibleTrackCounts((prev) => ({
      ...prev,
      [playlistId]: (prev[playlistId] || 50) + 50,
    }));
  };

  const handleSelectPlaylist = async (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    if (!expandedIds.has(playlistId)) {
      handleToggleExpand(playlistId);
    }
  };

  const handleToggleAllTracks = async (playlistId: string, enableAll: boolean) => {
    const tracks = tracksCache[playlistId] || selectedPlaylistTracks;
    if (!tracks || tracks.length === 0) return;
    const disabledMap = session?.disabledVideoIds || {};
    for (const track of tracks) {
      const trackId = String(track.id || track.trackId || '');
      const isCurrentlyDisabled = Boolean(disabledMap[trackId]);
      if (enableAll && isCurrentlyDisabled) {
        await toggleLobbyVideo(trackId).catch(console.error);
      } else if (!enableAll && !isCurrentlyDisabled) {
        await toggleLobbyVideo(trackId).catch(console.error);
      }
    }
  };

  const handleStartGameWithPlaylist = async (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    if (activeConnectedPlayers.length === 0) {
      showBanner('Veuillez attendre au moins un joueur connecté ou cochez "Host joueur"', 'error');
      return;
    }
    try {
      setIsStartingGame(true);
      await startGame(
        undefined,
        playlistId,
        isShuffleEnabled,
        undefined
      );
    } catch (error: any) {
      console.error('Erreur lors du lancement de la partie:', error);
      showBanner(error.message || 'Impossible de lancer la partie', 'error');
    } finally {
      setIsStartingGame(false);
    }
  };

  const handleConnectTwitch = async () => {
    if (!twitchChannel.trim()) return;
    setIsTwitchConnecting(true);
    setTwitchError(null);
    try {
      await connectTwitch(twitchChannel.trim());
      showBanner(`Compte Twitch connecté : #${twitchChannel.trim()}`, 'success');
    } catch (err: any) {
      setTwitchError(err.message || 'Connexion avec Twitch échouée. Vérifiez que le compte existe bien.');
      showBanner(err.message || 'Connexion avec Twitch échouée. Vérifiez que le compte existe bien.', 'error');
    } finally {
      setIsTwitchConnecting(false);
    }
  };

  const handleDisconnectTwitch = async () => {
    setTwitchError(null);
    try {
      await disconnectTwitch();
    } catch (err: any) {
      setTwitchError(err.message || 'Déconnexion de Twitch échouée. Veuillez réessayer.');
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
          community: [
            {
              ...res.playlist,
              video_count: res.videos ? res.videos.length : (res.playlist.video_count || 0),
            },
            ...prev.community,
          ]
        }));
      }
      setSelectedPlaylistId(res.playlist.id);
      setSelectedPlaylistTracks(res.videos || []);
      setTracksCache(prev => ({
        ...prev,
        [res.playlist.id]: res.videos || [],
      }));
      setExpandedIds(prev => new Set(prev).add(res.playlist.id));
      setSearchPlaylistId('');
      showBanner(`Playlist "${res.playlist.name}" chargée avec succès !`, 'success');
    } catch (err: any) {
      setSearchPlaylistError(err.message || 'Playlist non trouvée.');
    }
  };

  const displayedPlaylists = React.useMemo(() => {
    const list = playlistTab === 'validated' ? playlists.validated : playlists.community;

    return list
      .filter((pl) => {
        if (activeCategory !== 'all') {
          if (!pl.categories || !Array.isArray(pl.categories) || !pl.categories.includes(activeCategory)) {
            return false;
          }
        }
        if (playlistSearchQuery.trim()) {
          const q = playlistSearchQuery.toLowerCase().trim();
          const matchName = pl.name && pl.name.toLowerCase().includes(q);
          const matchDesc = pl.description && pl.description.toLowerCase().includes(q);
          const matchId = pl.id && pl.id.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchId) return false;
        }
        return true;
      })
      .sort((a, b) => (b.played_count || 0) - (a.played_count || 0));
  }, [playlists, playlistTab, activeCategory, playlistSearchQuery]);

  const handleLoadAnimeTracks = async (e: React.FormEvent, platform?: 'mal' | 'anilist') => {
    e.preventDefault();
    setMalLoadError(null);
    const targetPlatform = platform || animePlatform;
    const username = targetPlatform === 'anilist' ? anilistUsername.trim() : malUsername.trim();
    if (!username) return;

    setIsLoadingMalTracks(true);
    try {
      const videos = targetPlatform === 'anilist'
        ? await getAnilistVideos(username)
        : await getMalVideos(username);
      setMalTracks(videos);
      setMalConnectedUser(username);
      setAnimeConnectedPlatform(targetPlatform);
    } catch (err: any) {
      setMalLoadError(err.message || 'Impossible de récupérer les animés. Vérifiez que le pseudo existe bien.');
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
      console.error('Erreur lors de l\'affichage des résultats:', error);
    }
  };

  const handleProceedAfterReveal = async () => {
    try {
      await nextVideo();
    } catch (error) {
      console.error('Erreur lors du passage à la vidéo suivante:', error);
    }
  };

  const handleToggleSkip = async () => {
    try {
      await toggleSkip();
    } catch (error: any) {
      console.error('Erreur lors du vote de skip:', error);
      showBanner(error.message || 'Impossible de voter pour passer', 'error');
    }
  };

  const handlePrev = async () => {
    try {
      await previousVideo();
    } catch (error) {
      console.error('Erreur lors du retour à la vidéo précédente:', error);
    }
  };

  const handleBackToHome = async () => {
    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?');
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

  // Cleanup GSAP timeline on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  const triggerLeaderboardReveal = () => {
    // Ensure the display is always worst at top and best at bottom for the reveal animation
    setLeaderboardSortDir('asc');

    const rawResults = Object.values(session?.results || {});

    if (rawResults.length === 0) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    setIsRevealing(true);
    setIsDarkAmbianceActive(false);
    setShowSidebars(false);

    // Compute player and twitch ranks for reveal order
    const rankedP = [...rawResults].sort((a: any, b: any) => (b.average || 0) - (a.average || 0));
    const pMap = new Map(rankedP.map((r: any, i) => [r.id, i + 1]));

    const rankedT = [...rawResults].sort((a: any, b: any) => (b.twitchAverage || 0) - (a.twitchAverage || 0));
    const tMap = new Map(rankedT.map((r: any, i) => [r.id, i + 1]));

    // Sequence reveals from worst rank (#N at top) down to rank 1 (Winner at bottom)
    const revealList = [...rawResults].sort((a: any, b: any) => {
      const rankA = leaderboardSortType === 'twitch' ? (tMap.get(a.id) ?? 1) : (pMap.get(a.id) ?? 1);
      const rankB = leaderboardSortType === 'twitch' ? (tMap.get(b.id) ?? 1) : (pMap.get(b.id) ?? 1);
      return rankB - rankA; // highest rank number (worst) first, rank 1 last
    });

    const cardElements = revealList
      .map((r: any) => cardRefs.current[r.id])
      .filter(Boolean) as HTMLElement[];

    // Ensure all cards are hidden initially
    gsap.set(cardElements, { opacity: 0, visibility: 'hidden', x: 0, y: 0, rotation: 0, scale: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsRevealing(false);
        setIsDarkAmbianceActive(false);
        setShowSidebars(true);
        setHasAnimatedOnce(true);
        gsap.set(cardElements, { opacity: 1, visibility: 'visible', x: 0, y: 0, rotation: 0, scale: 1, clearProps: 'all' });
      },
    });

    timelineRef.current = tl;

    // Small initial delay
    tl.to({}, { duration: 0.3 });

    // Start at top of the leaderboard
    if (cardElements.length > 0) {
      tl.call(() => {
        cardElements[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    revealList.forEach((result: any, idx) => {
      const el = cardRefs.current[result.id];
      if (!el) return;

      const rank = leaderboardSortType === 'twitch'
        ? (tMap.get(result.id) ?? 1)
        : (pMap.get(result.id) ?? 1);

      const isTop1 = rank === 1;
      const isTop2 = rank === 2;
      const isTop3 = rank === 3;
      const isFirstCard = idx === 0;

      // Alternating roundy entrance:
      // Even index: comes from right/down with positive tilt
      // Odd index: comes from left/down with negative tilt
      const startX = idx % 2 === 0 ? 80 : -80;
      const startY = 25; // arced curve
      const startRot = idx % 2 === 0 ? 2 : -2; // dynamic roundy tilt

      if (isTop1) {
        // Rank 1: The Grand Finale at the bottom - punchy, smooth slide & spotlight
        tl.to({}, { duration: 0.2 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        // Dark ambiance spotlight turns ON
        tl.call(() => {
          setIsDarkAmbianceActive(true);
        });

        tl.to({}, { duration: 0.2 });

        // Make visible and zoom/slide in with backlash
        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, scale: 0.35, rotation: -2, y: 30, x: 0 },
          {
            opacity: 1,
            scale: 1,
            rotation: 0,
            y: 0,
            x: 0,
            duration: 0.75,
            ease: 'back.out(1.4)',
          }
        );

        // Winner basks in spotlight
        tl.to({}, { duration: 1.2 });

        // Turn dark ambiance OFF and fade sidebars in after #1 is shown
        tl.call(() => {
          setIsDarkAmbianceActive(false);
          setShowSidebars(true);
        });

        tl.to({}, { duration: 0.3 });
      } else if (isTop2) {
        // Rank 2: Smooth, brisk slide
        tl.to({}, { duration: 0.18 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX * 1.2, y: 15, rotation: startRot, scale: 0.95 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.58,
            ease: 'power3.out',
          }
        );

        tl.to({}, { duration: 0.15 });
      } else if (isTop3) {
        // Rank 3: Smooth, brisk slide
        tl.to({}, { duration: 0.15 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX * 1.2, y: 15, rotation: startRot, scale: 0.96 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.55,
            ease: 'power3.out',
          }
        );

        tl.to({}, { duration: 0.12 });
      } else if (isFirstCard) {
        // First card: Keep original comfortable speed so the audience catches the start
        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: startY, rotation: startRot, scale: 0.97 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.75,
            ease: 'back.out(1.35)',
          }
        );

        tl.to({}, { duration: 0.25 });
      } else {
        // Middle cards: Progressive acceleration building up rapid momentum
        const nonPodiumTotal = Math.max(1, revealList.length - 4);
        const middleIdx = Math.max(0, idx - 1);
        const progress = Math.min(1, middleIdx / nonPodiumTotal);

        // Progressively accelerates from 0.46s down to 0.26s
        const cardDuration = 0.46 - (progress * 0.20);
        // Delay between cards compresses from 0.10s down to 0.04s
        const cardGap = 0.10 - (progress * 0.06);

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: startY, rotation: startRot, scale: 0.97 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: cardDuration,
            ease: 'back.out(1.2)',
          }
        );

        tl.to({}, { duration: cardGap });
      }
    });
  };

  const handleSkipAnimation = () => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    setIsDarkAmbianceActive(false);
    setIsRevealing(false);
    setShowSidebars(true);
    setHasAnimatedOnce(true);
    const cardElements = Object.values(cardRefs.current).filter(Boolean) as HTMLElement[];
    gsap.set(cardElements, { opacity: 1, visibility: 'visible', x: 0, y: 0, rotation: 0, scale: 1, clearProps: 'all' });
  };

  const handleReplayAnimation = () => {
    setLeaderboardSortDir('asc');
    setHasAnimatedOnce(false);
    setShowSidebars(false);
    setTimeout(() => {
      triggerLeaderboardReveal();
    }, 50);
  };

  // Auto-trigger reveal animation when entering LEADERBOARD
  useEffect(() => {
    if (session?.status === 'LEADERBOARD' && !hasAnimatedOnce && !isRevealing) {
      const resultsToUse = Object.values(session?.results || {});

      if (resultsToUse.length > 0) {
        const timer = setTimeout(() => {
          triggerLeaderboardReveal();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.status]);

  if (loadingMessage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-6 font-sans text-center min-h-screen">
        <div className="info-card w-full max-w-md p-8 rounded-3xl flex flex-col gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-host mx-auto" />
          <h2 className="text-2xl font-black text-black font-title uppercase transform rotate-[-1deg]">
            Lancement de la partie
          </h2>
          <div className="py-4 border-t-2 border-b-2 border-black bg-white rounded-xl">
            <p className="text-sm font-black text-host uppercase tracking-wide animate-pulse">
              {loadingMessage}
            </p>
          </div>
          <p className="text-xs text-slate-600 font-bold">
            Merci de patienter le temps que le serveur prépare les vidéos.
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
          <h2 className="mt-6 text-xl font-black uppercase text-black font-title">Chargement de la session...</h2>
          <p className="mt-2 text-xs font-bold text-slate-600">Redirection vers l'accueil si déconnexion.</p>
          <button
            onClick={handleBackToHome}
            className="mt-6 px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Retour à l'accueil</span>
          </button>
        </div>
      </div>
    );
  }

  const playersList = Object.values(session.players || {});
  const activeConnectedPlayers = playersList.filter(p => p.isConnected);
  const skipsCount = Object.keys(session.skips || {}).filter(id => session.players[id]?.isConnected && session.skips?.[id]).length;
  const revealSkipsCount = Object.keys(session.revealSkips || {}).filter(id => session.players[id]?.isConnected && session.revealSkips?.[id]).length;
  const hostPlayerId = session.hostPlayerId || Object.values(session.players || {}).find(p => p.isHost)?.id || '';
  const hostHasSkipped = session.phase === 'REVEAL'
    ? Boolean(hostPlayerId && session.revealSkips?.[hostPlayerId])
    : Boolean(hostPlayerId && session.skips?.[hostPlayerId]);

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 lg:px-8 py-4 sm:py-6 font-sans w-full max-w-full overflow-x-hidden min-h-screen">
        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-5 sm:gap-6">
          
          {/* Header Row: Title/Logo + Mode switcher + Exit Button */}
          <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 w-full text-center md:text-left">
            <div className="flex items-center gap-3">
              <img
                src="/HOST/HostText.png"
                alt="Host Lobby"
                className="h-10 sm:h-14 md:h-16 w-auto object-contain max-w-full select-none pointer-events-none"
              />
              <p className="hidden sm:block text-xs sm:text-sm font-bold text-slate-700">
                Configurez la session et invitez vos compagnons !
              </p>
            </div>

            {/* Quiz Mode Selector (Playlists vs AnimeLists) */}
            <div className="flex border-2 border-black rounded-xl overflow-hidden font-black text-xs uppercase shadow-none shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setQuizMode('playlist')}
                className={`py-2 px-3 sm:px-4 text-center cursor-pointer transition-colors ${
                  quizMode === 'playlist'
                    ? 'bg-playlist text-black font-black'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                Playlists
              </button>
              <button
                type="button"
                onClick={() => setQuizMode('mal')}
                className={`py-2 px-3 sm:px-4 text-center border-l-2 border-black cursor-pointer transition-colors ${
                  quizMode === 'mal'
                    ? 'bg-playlist text-black font-black'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                AnimeLists (MAL / AniList)
              </button>
            </div>

            {/* Exit Room / Home Button */}
            <div className="flex items-center gap-2 shrink-0">
              <HomeButton
                onClick={handleBackToHome}
                sizeClassName="h-9 sm:h-12 md:h-14"
                title="Quitter et fermer la salle"
                ariaLabel="Quitter et fermer la salle"
              />
            </div>
          </header>

          {/* TOP OPTIONS ROW (LIGNE D'OPTIONS EN HAUT) */}
          {/* Code de la salle + QR code, HOST est un joueur + Les vidéos sont dans un ordre aléatoire, Connexion à Twitch */}
          <div className="w-full bg-[#FAF0CA] border-2 border-black rounded-2xl p-2.5 sm:p-3.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-none">
            
            {/* 1. Salle & Invitation (Code + Copier + QR Code) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white border-2 border-black rounded-xl px-2.5 py-1.5 shadow-none">
                <span className="text-[11px] font-black uppercase text-slate-600">Salle :</span>
                <span className="font-mono font-black text-sm sm:text-base text-black select-all">
                  {showRoomCode ? session.sessionId : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRoomCode(!showRoomCode)}
                  className="p-0.5 text-slate-600 hover:text-black cursor-pointer"
                  title={showRoomCode ? 'Masquer le code' : 'Afficher le code'}
                >
                  {showRoomCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 border-2 border-black bg-host hover:bg-sky-400 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 cursor-pointer shadow-none"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQRCode(!showQRCode)}
                className={`px-3 py-1.5 border-2 border-black rounded-xl font-black text-xs uppercase inline-flex items-center gap-1.5 cursor-pointer shadow-none transition-colors ${
                  showQRCode ? 'bg-black text-[#FEEC66]' : 'bg-white hover:bg-slate-100 text-black'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>

            {/* 2. Options de jeu (HOST est un joueur + Vidéos aléatoires) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-2 xl:py-0 border-t xl:border-t-0 xl:border-l xl:border-r border-black/15 xl:px-4">
              {/* Host est un joueur */}
              <div className="flex items-center gap-2">
                <label htmlFor="hostIsPlayerLobbyToggle" className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm font-black text-black select-none">
                  <input
                    type="checkbox"
                    id="hostIsPlayerLobbyToggle"
                    checked={session.isHostPlayer !== false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      try {
                        const finalName = hostCustomName.trim() || 'HOST';
                        await toggleHostPlayer(checked, finalName);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="h-4 w-4 accent-host cursor-pointer"
                  />
                  <span>Host joueur</span>
                </label>

                {/* Tooltip "?" */}
                <div className="group relative inline-flex items-center justify-center">
                  <span
                    tabIndex={0}
                    className="h-4 w-4 rounded-full bg-slate-200 border border-black text-slate-800 text-[10px] font-black flex items-center justify-center cursor-help"
                  >
                    ?
                  </span>
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-56 p-2.5 bg-black text-white text-[11px] font-bold rounded-xl text-center leading-snug z-50 shadow-none">
                    Permet au Host de voter. À décocher si vous jouez avec vos amis sur votre téléphone en physique.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
                  </div>
                </div>

                {/* Pseudo Host input when player */}
                {session.isHostPlayer !== false && (
                  <input
                    type="text"
                    placeholder="Pseudo Host"
                    value={hostCustomName}
                    onChange={(e) => setHostCustomName(e.target.value)}
                    onBlur={async () => {
                      const trimmed = hostCustomName.trim();
                      const finalName = trimmed || 'HOST';
                      if (trimmed) {
                        localStorage.setItem('rate_it_host_name', trimmed);
                      } else {
                        localStorage.removeItem('rate_it_host_name');
                      }
                      try {
                        await toggleHostPlayer(true, finalName);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="px-2 py-1 text-xs font-bold bg-white border-2 border-black rounded-lg text-black placeholder:text-slate-400 w-24 sm:w-28 outline-none shadow-none"
                    title="Pseudonyme du Host"
                  />
                )}
              </div>

              {/* Vidéos en ordre aléatoire */}
              <label htmlFor="shuffleToggle" className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm font-black text-black select-none">
                <input
                  type="checkbox"
                  id="shuffleToggle"
                  checked={isShuffleEnabled}
                  onChange={(e) => setIsShuffleEnabled(e.target.checked)}
                  className="h-4 w-4 accent-host cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Shuffle className="w-3.5 h-3.5 text-slate-700" />
                  <span>Ordre aléatoire</span>
                </span>
              </label>
            </div>

            {/* 3. Twitch */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-purple-900 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#9146FF]" />
                <span>Twitch</span>
              </span>

              {session.twitchChannel ? (
                <div className="flex items-center gap-2 bg-purple-50 border-2 border-[#9146FF] px-2.5 py-1 rounded-xl">
                  <span className="text-xs text-purple-900 font-black truncate max-w-[130px]">
                    #{session.twitchChannel}
                  </span>
                  <button
                    onClick={handleDisconnectTwitch}
                    className="text-[10px] text-accent-red hover:underline font-black cursor-pointer"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={twitchChannel}
                    onChange={(e) => setTwitchChannel(e.target.value)}
                    placeholder="chaîne_twitch..."
                    className="px-2.5 py-1.5 border-2 border-black bg-white rounded-xl text-xs font-bold text-black focus:outline-none w-28 sm:w-36 shadow-none"
                  />
                  <button
                    type="button"
                    onClick={handleConnectTwitch}
                    disabled={isTwitchConnecting || !twitchChannel.trim()}
                    className="px-3 py-1.5 bg-[#9146FF] hover:bg-purple-600 disabled:opacity-50 text-white font-black text-xs uppercase border-2 border-black rounded-xl cursor-pointer shadow-none transition-colors"
                  >
                    {isTwitchConnecting ? '...' : 'Lier'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Modal Overlay if toggled */}
          {showQRCode && joinUrl && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border-4 border-black rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4 shadow-none relative">
                <button
                  type="button"
                  onClick={() => setShowQRCode(false)}
                  className="absolute top-3 right-3 p-1 rounded-lg border-2 border-black hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-title text-base font-black uppercase text-black text-center">
                  Rejoindre la salle
                </h3>
                <div className="p-3 bg-white border-2 border-black rounded-xl shadow-none">
                  <QRCodeSVG value={joinUrl} size={180} level="H" includeMargin={false} />
                </div>
                <p className="text-xs font-bold text-slate-700 text-center leading-relaxed">
                  Scannez le QR Code avec votre téléphone :
                  <br />
                  <span className="font-mono text-host font-bold break-all">{joinUrl}</span>
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 shadow-none cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Lien copié !' : 'Copier le lien d\'invitation'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          {quizMode === 'playlist' ? (
            /* PLAYLISTS VIEW WITH FILTERS & CARDS (REUSING PLAYLISTCARD & PLAYLISTFILTERS) */
            <div className="flex flex-col lg:flex-row items-start gap-6 w-full flex-1">
              
              {/* Sidebar Filters */}
              <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-4 z-20 flex flex-col gap-3">
                <PlaylistFilters
                  categories={CATEGORIES}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  activeTab={playlistTab}
                  onSelectTab={setPlaylistTab}
                  validatedCount={playlists.validated.length}
                  communityCount={playlists.community.length}
                  searchQuery={playlistSearchQuery}
                  onSearchChange={setPlaylistSearchQuery}
                />

                {/* Form to load custom playlist by share code */}
                <form
                  onSubmit={handleSearchPlaylist}
                  className="bg-white border-2 border-black rounded-xl p-2.5 flex flex-col gap-1.5 shadow-none"
                >
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Charger par code de partage
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={searchPlaylistId}
                      onChange={(e) => setSearchPlaylistId(e.target.value)}
                      placeholder="Code playlist..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 border-2 border-black bg-white text-xs font-bold rounded-lg focus:outline-none shadow-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#FEEC66] hover:bg-yellow-300 text-black border-2 border-black rounded-lg font-black text-xs uppercase cursor-pointer shadow-none"
                    >
                      OK
                    </button>
                  </div>
                  {searchPlaylistError && (
                    <p className="text-[10px] text-accent-red font-black mt-0.5">
                      {searchPlaylistError}
                    </p>
                  )}
                </form>
              </aside>

              {/* Main Playlists List */}
              <main className="flex-1 min-w-0 w-full flex flex-col gap-4">
                {displayedPlaylists.length === 0 ? (
                  <div className="p-8 sm:p-12 border-2 border-black bg-[#FAF0CA] rounded-2xl text-center flex flex-col items-center justify-center gap-3 shadow-none">
                    <h3 className="font-title text-lg font-black text-black">
                      Aucune playlist trouvée
                    </h3>
                    <p className="text-xs font-bold text-slate-600 max-w-md">
                      {activeCategory !== 'all'
                        ? `Aucune playlist disponible dans la catégorie "${activeCategory}".`
                        : playlistSearchQuery
                        ? `Aucun résultat pour "${playlistSearchQuery}".`
                        : 'Aucune playlist disponible pour le moment.'}
                    </p>
                    {(playlistSearchQuery || activeCategory !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlaylistSearchQuery('');
                          setActiveCategory('all');
                        }}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-none cursor-pointer"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 w-full">
                    {displayedPlaylists.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        isExpanded={expandedIds.has(playlist.id)}
                        onToggleExpand={handleToggleExpand}
                        tracks={tracksCache[playlist.id] || []}
                        isLoadingTracks={Boolean(loadingTracks[playlist.id])}
                        onHost={() => handleStartGameWithPlaylist(playlist.id)}
                        isStartingHost={isStartingGame}
                        visibleCount={visibleTrackCounts[playlist.id] || 50}
                        onShowMoreTracks={handleShowMoreTracks}
                        isHostLobby={true}
                        isSelected={selectedPlaylistId === playlist.id}
                        onSelectPlaylist={handleSelectPlaylist}
                        disabledVideoIds={session.disabledVideoIds || {}}
                        onToggleTrack={handleToggleTrack}
                        onToggleAllTracks={(enableAll) => handleToggleAllTracks(playlist.id, enableAll)}
                        canStartGame={activeConnectedPlayers.length > 0}
                        onStartGame={handleStartGame}
                      />
                    ))}
                  </div>
                )}
              </main>
            </div>
          ) : (
            /* ANIMELIST (MAL / ANILIST) SELECTION VIEW */
            <div className="bg-[#FAF0CA] border-2 border-black p-4 sm:p-6 rounded-2xl flex flex-col min-h-[460px] w-full max-w-full overflow-hidden shadow-none">
              {/* Platform Selector & Connexion form */}
              <div className="border-b-2 border-black pb-4 mb-4 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2">
                  <h3 className="text-sm sm:text-base font-black text-black uppercase flex items-center gap-2 text-accent-red">
                    <span>{animePlatform === 'anilist' ? 'AniList Connexion' : 'MyAnimeList Connexion'}</span>
                  </h3>

                  {/* Segmented Platform Toggle */}
                  <div className="inline-flex border-2 border-black rounded-xl overflow-hidden text-xs font-black shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAnimePlatform('mal');
                        setMalLoadError(null);
                      }}
                      className={`px-3 py-1.5 uppercase transition ${
                        animePlatform === 'mal'
                          ? 'bg-[#2E51A2] text-white'
                          : 'bg-white text-black hover:bg-slate-100'
                      }`}
                    >
                      MyAnimeList
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnimePlatform('anilist');
                        setMalLoadError(null);
                      }}
                      className={`px-3 py-1.5 uppercase transition border-l-2 border-black ${
                        animePlatform === 'anilist'
                          ? 'bg-[#02A9FF] text-white'
                          : 'bg-white text-black hover:bg-slate-100'
                      }`}
                    >
                      AniList
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed">
                  {animePlatform === 'anilist'
                    ? 'Entrez votre pseudo AniList pour prendre automatiquement les openings des animes que vous avez complétés.'
                    : 'Entrez votre pseudo MyAnimeList pour prendre automatiquement les openings des animes que vous avez complétés.'}
                </p>

                <form onSubmit={handleLoadAnimeTracks} className="flex flex-col sm:flex-row gap-2 mt-1">
                  {animePlatform === 'anilist' ? (
                    <input
                      type="text"
                      value={anilistUsername}
                      onChange={(e) => setAnilistUsername(e.target.value)}
                      placeholder="Pseudo AniList..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 border-2 border-black bg-white focus:outline-none focus:bg-white text-xs sm:text-sm font-bold rounded-xl shadow-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={malUsername}
                      onChange={(e) => setMalUsername(e.target.value)}
                      placeholder="Pseudo MyAnimeList..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 border-2 border-black bg-white focus:outline-none focus:bg-white text-xs sm:text-sm font-bold rounded-xl shadow-none"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={isLoadingMalTracks}
                    className="px-5 py-2.5 border-2 border-black bg-white text-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover disabled:opacity-50 shrink-0 shadow-none cursor-pointer"
                  >
                    {isLoadingMalTracks ? '...' : 'Charger'}
                  </button>
                </form>

                {malLoadError && (
                  <p className="text-xs text-accent-red font-black flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{malLoadError}</span>
                  </p>
                )}
              </div>

              {malConnectedUser ? (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="bg-emerald-50 p-3.5 border-2 border-emerald-500 rounded-xl text-left shrink-0 shadow-none">
                    <p className="text-xs sm:text-sm text-emerald-950 font-black">
                      Voici la liste des openings trouvés pour le compte {animeConnectedPlatform === 'anilist' ? 'AniList' : 'MyAnimeList'}: <span className="underline">{malConnectedUser}</span> ({malTracks.length} openings trouvés)
                    </p>
                  </div>

                  {/* Tracks list checklist with toggles */}
                  <div className="flex-1 border-2 border-black bg-white p-3 sm:p-4 rounded-2xl max-h-[340px] overflow-y-auto mb-4 shadow-none">
                    <p className="text-xs sm:text-sm font-black text-slate-600 uppercase border-b border-slate-200 pb-2 mb-3">
                      Openings trouvés (Décocher pour exclure)
                    </p>
                    {malTracks.length === 0 ? (
                      <p className="text-xs sm:text-sm text-slate-400 py-6 text-center font-bold">Aucun opening trouvé.</p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {malTracks.map((track) => {
                          const isDisabled = session.disabledVideoIds?.[track.id] || false;
                          return (
                            <div key={track.id} className="flex items-center justify-between text-xs sm:text-sm font-bold py-1.5 border-b border-slate-100 last:border-b-0 gap-3">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-black text-xs sm:text-sm leading-snug">
                                  <span className="font-black">{track.title}</span>
                                  <span className="text-slate-600 font-bold"> par {track.artistName || 'Artiste Non-Renseigné'}</span>
                                  {track.description && <span className="text-slate-500 font-normal"> — {track.description}</span>}
                                </span>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={!isDisabled}
                                  onChange={() => handleToggleTrack(track.id)}
                                  className="h-4 w-4 accent-accent-red cursor-pointer"
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
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-8 text-center">
                  <p className="text-xs font-black text-slate-600 uppercase max-w-xs leading-relaxed">
                    Rentrez votre pseudo {animePlatform === 'anilist' ? 'AniList' : 'MyAnimeList'} et cliquez sur <span className="text-accent-red font-black">Charger</span> ci-dessus pour configurer la liste des openings à exclure.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FIXED CONNECTED PLAYERS TAB (Desktop bottom-left) */}
          <div className="hidden sm:flex flex-col fixed bottom-4 left-4 z-40 w-72 sm:w-80 bg-[#FAF0CA] border-3 border-black rounded-2xl overflow-hidden shadow-none transition-all">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsPlayersTabCollapsed(!isPlayersTabCollapsed)}
              className="px-3.5 py-2.5 bg-[#FAF0CA] hover:bg-[#faeaaf] flex items-center justify-between cursor-pointer border-b-2 border-black/20 select-none"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-black" />
                <span className="font-title text-xs font-black uppercase text-black">
                  Joueurs connectés
                </span>
                <span className="bg-black text-[#FEEC66] px-2 py-0.5 rounded-lg text-xs font-mono font-black">
                  {activeConnectedPlayers.length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isPlayersTabCollapsed ? 'rotate-180' : ''
                }`}
              />
            </div>

            {!isPlayersTabCollapsed && (
              <div className="p-3 flex flex-col gap-2.5 bg-[#FAF0CA]">
                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {playersList.length === 0 ? (
                    <div className="py-4 text-center flex flex-col items-center gap-1.5">
                      <UserX className="w-6 h-6 text-slate-500 animate-pulse" />
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">
                        En attente de joueurs...
                      </p>
                      {session.isHostPlayer === false && (
                        <p className="text-[10px] text-slate-500 font-bold">
                          Cochez &quot;Host joueur&quot; en haut si vous jouez seul.
                        </p>
                      )}
                    </div>
                  ) : (
                    playersList.map((player) => {
                      const isHost = player.isHost || player.id === session.hostPlayerId;
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border-2 border-black ${
                            player.isConnected ? 'bg-white' : 'bg-slate-100 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                player.isConnected
                                  ? 'bg-emerald-500 border border-black'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span className="font-black text-xs text-black truncate">
                              {player.name}
                            </span>
                          </div>
                          {isHost && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase shrink-0">
                              <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>Host</span>
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-black/15">
                  <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={activeConnectedPlayers.length === 0 || isStartingGame}
                    className="w-full py-2.5 px-3 bg-host hover:bg-sky-400 border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
                  >
                    {isStartingGame ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Démarrage...</span>
                      </>
                    ) : (
                      <>
                        <span>Lancer ({activeConnectedPlayers.length})</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MOBILE RESPONSIVE FLOATING TAB (< sm) */}
          <div className="sm:hidden fixed bottom-3 left-3 z-40">
            <button
              type="button"
              onClick={() => setShowMobilePlayersModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#FAF0CA] border-2 border-black font-black text-xs uppercase text-black flex items-center gap-2 shadow-none cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{activeConnectedPlayers.length} joueur{activeConnectedPlayers.length > 1 ? 's' : ''}</span>
            </button>
          </div>

          {/* MOBILE PLAYERS MODAL */}
          {showMobilePlayersModal && (
            <div className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 animate-fade-in">
              <div className="w-full bg-[#FAF0CA] border-3 border-black rounded-2xl p-4 flex flex-col gap-3 shadow-none max-h-[80vh]">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-black" />
                    <h3 className="font-title text-sm font-black uppercase text-black">
                      Joueurs connectés ({activeConnectedPlayers.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMobilePlayersModal(false)}
                    className="p-1 rounded-lg border-2 border-black bg-white hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-56 pr-1">
                  {playersList.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-2 rounded-xl border-2 border-black ${
                        player.isConnected ? 'bg-white' : 'bg-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                            player.isConnected ? 'bg-emerald-500 border border-black' : 'bg-slate-400'
                          }`}
                        />
                        <span className="font-black text-xs text-black truncate">{player.name}</span>
                      </div>
                      {(player.isHost || player.id === session.hostPlayerId) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase">
                          <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>Host</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMobilePlayersModal(false);
                    handleStartGame();
                  }}
                  disabled={activeConnectedPlayers.length === 0 || isStartingGame}
                  className="w-full py-3 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-40 flex items-center justify-center gap-2 shadow-none"
                >
                  <span>Lancer la partie ({activeConnectedPlayers.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
                <span>Code de la salle :</span>
                <span className="font-mono font-black text-black">
                  {showRoomCode ? session.sessionId : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRoomCode(!showRoomCode)}
                  className="btn-action-hover text-xs"
                  title={showRoomCode ? 'Cacher le code' : 'Afficher le code'}
                >
                  {showRoomCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </span>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Lien copié !</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleBackToHome}
              className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Quitter la partie</span>
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 flex-1 items-stretch">
            {/* Video Player Box (2/3) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="aspect-video w-full rounded-2xl border-4 border-black bg-black overflow-hidden relative">
                <div id="youtube-player-container" className="w-full h-full" />
              </div>

              {/* Navigation controls */}
              <div className="flex flex-wrap justify-between items-center bg-menu border-10 border-white  p-3 sm:p-4 rounded-2xl gap-2">
                <button
                  onClick={handlePrev}
                  disabled={session.currentVideoIndex === 0}
                  className="px-3 sm:px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Précédent</span>
                </button>

                <span className="text-xs font-black text-black">
                  Vidéo {session.currentVideoIndex + 1} / {session.videos?.length}
                </span>

                {session.phase === 'REVEAL' ? (
                  <div className="flex items-center gap-2">
                    {session.isHostPlayer !== false && (
                      <button
                        onClick={handleToggleSkip}
                        className={`px-3 sm:px-4 py-2.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 ${
                          hostHasSkipped
                            ? 'bg-purple-200 text-purple-950 border-dashed'
                            : 'bg-white text-black hover:bg-slate-100'
                        }`}
                        title="Proposer de passer à la suite (vote volontaire sans forcer)"
                      >
                        {hostHasSkipped ? <Check className="w-4 h-4 shrink-0" /> : <SkipForward className="w-4 h-4 shrink-0" />}
                        <span>{hostHasSkipped ? 'Prêt' : 'Prêt (skip)'}</span>
                        <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono">
                          {revealSkipsCount}/{activeConnectedPlayers.length}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleProceedAfterReveal}
                      className="px-4 sm:px-5 py-2.5 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
                      title="Forcer la suite pour tous"
                    >
                      <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Afficher les résultats' : 'Vidéo suivante'}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {session.isHostPlayer !== false && (
                      <button
                        onClick={handleToggleSkip}
                        className={`px-3 sm:px-4 py-2.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 ${
                          hostHasSkipped
                            ? 'bg-amber-200 text-amber-950 border-dashed'
                            : 'bg-white text-black hover:bg-slate-100'
                        }`}
                        title="Proposer de passer la vidéo (vote volontaire sans forcer)"
                      >
                        {hostHasSkipped ? <Check className="w-4 h-4 shrink-0" /> : <SkipForward className="w-4 h-4 shrink-0" />}
                        <span>{hostHasSkipped ? 'Voté skip' : 'Voter skip'}</span>
                        <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono">
                          {skipsCount}/{activeConnectedPlayers.length}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleShowResults}
                      className="px-4 sm:px-5 py-2.5 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
                      title="Forcer l'affichage des résultats pour tous"
                    >
                      <BarChart2 className="w-4 h-4 shrink-0" />
                      <span>Résultats</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Side info & live votes status (1/3) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Currently Playing details */}
              <div className="info-card border-4 border-black p-4 sm:p-6 rounded-2xl">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Actuellement en cours</span>
                <h2 className="mt-2 text-xl sm:text-2xl font-black text-black leading-tight border-b-2 border-black pb-2 mb-2">
                  {currentVideo.title}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-cyan-950">
                  par {currentVideo.artistName || 'Artiste Non-renseigné'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                </p>
              </div>

              {/* Mon Vote (Hôte) Voting Widget */}
              {session.isHostPlayer !== false && (
                <div className="info-card border-4 border-black p-4 sm:p-5 rounded-2xl flex flex-col gap-3 bg-white">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase text-black flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>Mon Vote ({session.players?.[session.hostPlayerId || '']?.name || hostCustomName.trim() || 'HOST'})</span>
                    </h3>
                    {session.votes?.[session.hostPlayerId || ''] !== undefined && (
                      <span className="text-xs font-black bg-emerald-100 text-emerald-800 border border-black px-2 py-0.5 rounded">
                        Voté : {session.votes[session.hostPlayerId || '']}/5
                      </span>
                    )}
                  </div>

                  {session.phase === 'REVEAL' ? (
                    <div className="flex flex-col gap-2 py-1">
                      <p className="text-xs font-bold text-slate-600 text-center">
                        Résultats affichés pour cette vidéo
                      </p>
                      <button
                        onClick={handleToggleSkip}
                        className={`w-full py-2.5 px-3 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${
                          hostHasSkipped
                            ? 'bg-purple-200 text-purple-950 border-dashed'
                            : 'bg-[#DD4DCC] text-white hover:bg-fuchsia-600'
                        }`}
                      >
                        {hostHasSkipped ? <Check className="w-3.5 h-3.5 shrink-0" /> : <SkipForward className="w-3.5 h-3.5 shrink-0" />}
                        <span>{hostHasSkipped ? 'Prêt pour la suite' : 'Voter pour passer à la suite'}</span>
                        <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-mono ml-auto">
                          {revealSkipsCount} / {activeConnectedPlayers.length}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex justify-between items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((val) => {
                          const hostVote = session.votes?.[session.hostPlayerId || ''];
                          const isSelected = hostVote === val;
                          let style = "bg-white border-2 border-black text-black hover:bg-slate-100";
                          if (isSelected) {
                            if (val === 1) style = "bg-red-600 border-2 border-black text-white font-black";
                            else if (val === 2) style = "bg-orange-500 border-2 border-black text-white font-black";
                            else if (val === 3) style = "bg-yellow-400 border-2 border-black text-black font-black";
                            else if (val === 4) style = "bg-emerald-500 border-2 border-black text-white font-black";
                            else if (val === 5) style = "bg-host border-2 border-black text-black font-black";
                          }
                          return (
                            <button
                              key={val}
                              onClick={async () => {
                                try {
                                  await submitVote(val);
                                } catch (err: any) {
                                  showBanner(err.message || 'Erreur lors du vote', 'error');
                                }
                              }}
                              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full text-sm font-black transition flex items-center justify-center cursor-pointer ${style}`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleToggleSkip}
                        className={`w-full mt-1 py-2.5 px-3 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${
                          hostHasSkipped
                            ? 'bg-amber-200 text-amber-950 border-dashed'
                            : 'bg-white hover:bg-slate-100 text-black'
                        }`}
                      >
                        {hostHasSkipped ? <Check className="w-3.5 h-3.5 shrink-0" /> : <SkipForward className="w-3.5 h-3.5 shrink-0" />}
                        <span>{hostHasSkipped ? 'Vous avez voté pour passer' : 'Voter pour passer la vidéo'}</span>
                        <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-mono ml-auto">
                          {skipsCount} / {activeConnectedPlayers.length}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Twitch Live votes tracking */}
              {session.twitchChannel && (
                <div className="info-card border-4 border-black p-4 sm:p-5 rounded-2xl flex flex-col gap-2">
                  <h3 className="text-xs font-black uppercase text-purple-700 flex items-center gap-1.5 border-b border-purple-200 pb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse border border-black" />
                    Votes Twitch
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-700 font-bold">Votes reçus :</span>
                    <span className="text-lg font-black text-black font-mono">
                      {Object.keys(session.twitchVotes || {}).length}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Players Voting details */}
              <div className="flex-1 info-card border-4 border-black p-4 sm:p-6 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between border-b border-black pb-2 mb-4">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-black">
                    Joueurs actifs ({Object.keys(session.votes || {}).length} / {playersList.length})
                  </h3>
                  {session.phase === 'REVEAL' ? (
                    <span className="text-xs bg-purple-100 text-purple-800 border border-black font-black px-2.5 py-1 rounded-lg">
                      Prêt : {revealSkipsCount}/{activeConnectedPlayers.length}
                    </span>
                  ) : (
                    <span className="text-xs bg-blue-100 text-blue-800 border border-black font-black px-2.5 py-1 rounded-lg">
                      Skip : {skipsCount}/{activeConnectedPlayers.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-56 flex flex-col gap-2.5 pr-1">
                  {playersList.map((player) => {
                    const hasVoted = session.votes?.[player.id] !== undefined;
                    const hasSkipped = session.phase === 'REVEAL'
                      ? session.revealSkips?.[player.id]
                      : session.skips?.[player.id];

                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white rounded-xl"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-500 border border-black' : 'bg-slate-500'}`} />
                          <span className="font-black text-xs sm:text-sm text-black truncate max-w-[110px] sm:max-w-[140px]">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasSkipped && (
                            <span className="px-2 py-1 border border-black rounded bg-slate-200 text-slate-800 text-xs font-black uppercase flex items-center gap-1">
                              <SkipForward className="w-3 h-3" />
                            </span>
                          )}
                          {hasVoted ? (
                            <span className="px-2.5 py-1 border border-black rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black uppercase animate-pulse flex items-center gap-1">
                              <span>Voté</span>
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 border border-black rounded-lg bg-amber-100 text-amber-700 text-xs font-black uppercase">
                              Vote en cours...
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 p-2 sm:p-4">
            <div className="w-full max-w-3xl info-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-4 sm:gap-6 relative overflow-hidden max-h-[92vh] overflow-y-auto">
              <div className="flex flex-col gap-1 z-10">
                <span className="text-xs uppercase font-black text-slate-600 tracking-wider">Résultats de la vidéo</span>
                <h2 className="text-xl sm:text-3xl font-black text-black leading-tight border-b-2 border-black pb-2 mb-1">
                  {currentVideo.title}
                </h2>
                <p className="text-xs sm:text-sm font-black text-cyan-950">
                  Par {currentVideo.artistName || 'Artiste Non-renseigné'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                </p>
              </div>

              <div className={`grid gap-4 sm:gap-6 mt-1 z-10 ${session.twitchChannel ? 'sm:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto w-full'}`}>
                {/* Players Rating Card */}
                <div className="rounded-2xl border-4 border-black bg-white p-4 sm:p-5 flex flex-col items-center justify-center gap-2">
                  <span className="text-xs uppercase font-black text-cyan-950 tracking-wider">Moyenne des joueurs</span>
                  <span className="text-4xl sm:text-5xl font-black text-black font-mono leading-none">
                    {pAvg.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 font-bold mt-1">
                    {pCount} {pCount === 1 ? 'votant' : 'votants'}
                  </span>
                </div>

                {/* Twitch Rating Card - Only shown when Twitch is associated */}
                {session.twitchChannel && (
                  <div className="rounded-2xl border-4 border-black bg-white p-4 sm:p-5 flex flex-col items-center justify-center gap-2">
                    <span className="text-xs uppercase font-black text-purple-700 tracking-wider">Moyenne du chat</span>
                    {tCount > 0 ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-black font-mono leading-none">
                          {tAvg.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-500 font-bold mt-1">
                          par {tCount} {tCount === 1 ? 'vote du chat' : 'votes du chat'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-slate-400 font-mono py-2 mt-1">
                          N/A
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          Pas de votes du chat
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Requirement 2: Individual Player Votes Breakdown */}
              <div className="rounded-2xl border-4 border-black bg-white p-3.5 sm:p-4 text-left z-10">
                <h4 className="text-xs sm:text-sm font-black uppercase text-black border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-host" />
                    <span>Notes mises par les joueurs</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">({playersList.length} joueurs)</span>
                </h4>
                {playersList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">Pas de joueurs connectés</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {playersList.map((player) => {
                      const playerVote = session.votes?.[player.id];
                      let voteBadge = (
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 uppercase">
                          Pas de vote
                        </span>
                      );
                      if (playerVote !== undefined) {
                        const labels: Record<number, { text: string; bg: string }> = {
                          1: { text: '1', bg: 'bg-red-600 text-white' },
                          2: { text: '2', bg: 'bg-orange-500 text-white' },
                          3: { text: '3', bg: 'bg-yellow-400 text-black' },
                          4: { text: '4', bg: 'bg-emerald-500 text-white' },
                          5: { text: '5', bg: 'bg-host text-black' },
                        };
                        const l = labels[playerVote] || { text: `${playerVote}`, bg: 'bg-black text-white' };
                        voteBadge = (
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded border border-black uppercase ${l.bg}`}>
                            {l.text}
                          </span>
                        );
                      }
                      return (
                        <div key={player.id} className="flex items-center justify-between p-2.5 border-2 border-black rounded-xl bg-slate-50">
                          <span className="text-xs sm:text-sm font-black text-black truncate max-w-[100px] sm:max-w-[120px]">{player.name}</span>
                          {voteBadge}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap justify-center items-center gap-3 z-10">
                {session.isHostPlayer !== false && (
                  <button
                    onClick={handleToggleSkip}
                    className={`px-5 sm:px-6 py-3 border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 ${
                      hostHasSkipped
                        ? 'bg-purple-200 text-purple-950 border-dashed'
                        : 'bg-white text-black hover:bg-slate-100'
                    }`}
                    title="Proposer de passer à la suite (ne force pas)"
                  >
                    {hostHasSkipped ? <Check className="w-4 h-4 shrink-0" /> : <SkipForward className="w-4 h-4 shrink-0" />}
                    <span>{hostHasSkipped ? 'Prêt pour la suite' : 'Voter pour passer'}</span>
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono">
                      {revealSkipsCount} / {activeConnectedPlayers.length}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleProceedAfterReveal}
                  className="px-6 sm:px-8 py-3 bg-host text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
                  title="Forcer la suite pour tous"
                >
                  <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Voir le classement' : 'Vidéo suivante'}</span>
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
    const isTwitchLinked = Boolean(
      session.twitchChannel ||
      Object.values(session.results || {}).some(r => r.twitchVotesCount && r.twitchVotesCount > 0)
    );

    const resultsArray = Object.values(session.results || {});

    // Compute vote statistics
    const sessionAvg = resultsArray.length > 0
      ? (resultsArray.reduce((acc, r) => acc + (r.average || 0), 0) / resultsArray.length)
      : 0;

    const hostId = session.hostPlayerId || '';
    const hostRatedResults = resultsArray.filter(r => r.playerVotes?.[hostId] !== undefined);
    const hostVotesCount = hostRatedResults.length;
    const hostAvg = hostVotesCount > 0
      ? (hostRatedResults.reduce((acc, r) => acc + (r.playerVotes?.[hostId] || 0), 0) / hostVotesCount)
      : 0;
    const hostDisplayName = session.players?.[hostId]?.name || hostCustomName.trim() || 'HOST';

    const allPlayersList = Object.values(session.players || {});
    const playersStats = allPlayersList.map(p => {
      const pRated = resultsArray.filter(r => r.playerVotes?.[p.id] !== undefined);
      const count = pRated.length;
      const avg = count > 0 ? (pRated.reduce((acc, r) => acc + (r.playerVotes?.[p.id] || 0), 0) / count) : 0;
      return {
        ...p,
        ratedCount: count,
        avg,
      };
    });

    const twitchRated = resultsArray.filter(r => (r.twitchVotesCount ?? 0) > 0);
    const twitchCount = twitchRated.length;
    const twitchAvg = twitchCount > 0
      ? (twitchRated.reduce((acc, r) => acc + (r.twitchAverage || 0), 0) / twitchCount)
      : 0;

    // Precalculate absolute ranks
    const rankedByPlayers = [...resultsArray].sort((a, b) => (b.average || 0) - (a.average || 0));
    const playerRankMap = new Map(rankedByPlayers.map((r, i) => [r.id, i + 1]));

    const rankedByTwitch = [...resultsArray].sort((a, b) => (b.twitchAverage || 0) - (a.twitchAverage || 0));
    const twitchRankMap = new Map(rankedByTwitch.map((r, i) => [r.id, i + 1]));

    // Sort according to active selection
    const sortedResults = [...resultsArray].sort((a, b) => {
      const valA = leaderboardSortType === 'twitch' ? (a.twitchAverage ?? 0) : (a.average ?? 0);
      const valB = leaderboardSortType === 'twitch' ? (b.twitchAverage ?? 0) : (b.average ?? 0);

      if (valA !== valB) {
        return leaderboardSortDir === 'desc' ? valB - valA : valA - valB;
      }
      const fallbackA = leaderboardSortType === 'twitch' ? (a.average ?? 0) : (a.twitchAverage ?? 0);
      const fallbackB = leaderboardSortType === 'twitch' ? (b.average ?? 0) : (b.twitchAverage ?? 0);
      if (fallbackA !== fallbackB) {
        return leaderboardSortDir === 'desc' ? fallbackB - fallbackA : fallbackA - fallbackB;
      }
      const rankA = leaderboardSortType === 'twitch' ? (twitchRankMap.get(a.id) ?? 1) : (playerRankMap.get(a.id) ?? 1);
      const rankB = leaderboardSortType === 'twitch' ? (twitchRankMap.get(b.id) ?? 1) : (playerRankMap.get(b.id) ?? 1);
      if (rankA !== rankB) {
        return leaderboardSortDir === 'desc' ? rankA - rankB : rankB - rankA;
      }
      return String(a.title || '').localeCompare(String(b.title || ''));
    });

    const handleSortClick = (type: 'players' | 'twitch') => {
      if (isRevealing) {
        handleSkipAnimation();
      }
      if (type === 'players') {
        if (leaderboardSortType !== 'players') {
          setLeaderboardSortType('players');
          setLeaderboardSortDir('desc');
        } else {
          setLeaderboardSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        }
      } else {
        if (leaderboardSortType !== 'twitch') {
          setLeaderboardSortType('twitch');
          setLeaderboardSortDir('desc');
        } else {
          setLeaderboardSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        }
      }
    };

    const isSidebarVisible = showSidebars || (hasAnimatedOnce && !isRevealing);

    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-6 sm:py-10 font-sans w-full max-w-full overflow-x-clip">
        {/* Dark Ambiance Backdrop Overlay for Winner #1 Reveal */}
        <div
          className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-30 pointer-events-none transition-opacity duration-700 ${isDarkAmbianceActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        />

        <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6 sm:gap-8 justify-center items-center">
          {/* Header with Resultat.png */}
          <div className="flex flex-col items-center justify-center text-center w-full">
            <img
              src="/HOST/Resultat.png"
              alt="Résultats"
              className="h-20 sm:h-32 md:h-44 lg:h-52 xl:h-60 w-auto object-contain max-w-full"
            />
            {isRevealing && (
              <div className="flex items-center justify-center mt-3 z-20">
                <button
                  type="button"
                  onClick={handleSkipAnimation}
                  className="px-4 py-2 border-2 border-black bg-white text-black hover:bg-slate-100 focus:bg-slate-100 text-xs font-black uppercase rounded-xl inline-flex items-center gap-2 btn-action-hover cursor-pointer"
                  title="Passer l'animation et afficher tous les résultats immédiatement"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Passer l'animation</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Content: Left Wing (Desktop) + Center Leaderboard + Right Wing (Desktop) */}
          <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-4 xl:gap-6">
            {/* Left Side (Desktop): Rounded Square Sorting Buttons with Tooltips */}
            <div className={`hidden lg:flex flex-col items-end w-52 xl:w-60 shrink-0 sticky top-8 self-start gap-3 z-20 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <LeaderboardSortButtons
                layout="vertical"
                sortType={leaderboardSortType}
                sortDir={leaderboardSortDir}
                onSort={handleSortClick}
                isTwitchLinked={isTwitchLinked}
              />
            </div>

            {/* Center: Leaderboard Cards */}
            <div className="info-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 w-full max-w-4xl !overflow-visible !z-auto">
              {/* Mobile / Tablet Sorting Toolbar (< lg only) */}
              <div className={`flex lg:hidden items-center justify-center gap-4 border-b-2 border-black pb-4 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <LeaderboardSortButtons
                  layout="horizontal"
                  sortType={leaderboardSortType}
                  sortDir={leaderboardSortDir}
                  onSort={handleSortClick}
                  isTwitchLinked={isTwitchLinked}
                />
              </div>

              {/* Mobile Stats Summary (< lg only) */}
              <div className={`flex lg:hidden flex-col gap-2.5 p-3.5 bg-white border-2 border-black rounded-2xl transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-1.5 border-b border-black/20 pb-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-host shrink-0" />
                  <span className="text-[11px] font-black uppercase text-black">Moyennes des votes</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col p-2 bg-slate-50 border border-black rounded-xl text-center">
                    <span className="text-[9px] font-black uppercase text-slate-500">Moyenne Session</span>
                    <span className="text-lg font-black text-black font-mono">
                      {sessionAvg.toFixed(2)}<span className="text-[10px] text-slate-400 font-bold">/5</span>
                    </span>
                  </div>
                  {session.isHostPlayer !== false ? (
                    <div className="flex flex-col p-2 bg-amber-50 border border-black rounded-xl text-center">
                      <span className="text-[9px] font-black uppercase text-amber-900 truncate">Moyenne {hostDisplayName}</span>
                      <span className="text-lg font-black text-amber-950 font-mono">
                        {hostVotesCount > 0 ? `${hostAvg.toFixed(2)}/5` : 'Non voté'}
                      </span>
                    </div>
                  ) : isTwitchLinked && twitchCount > 0 ? (
                    <div className="flex flex-col p-2 bg-purple-50 border border-black rounded-xl text-center">
                      <span className="text-[9px] font-black uppercase text-purple-700">Chat Twitch</span>
                      <span className="text-lg font-black text-purple-950 font-mono">
                        {twitchAvg.toFixed(2)}<span className="text-[10px] text-purple-400 font-bold">/5</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {sortedResults.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-4 text-slate-500 font-bold text-xs sm:text-sm">
                  <p>Aucun vote n'a été enregistré pour le moment.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative !z-auto">
                  {sortedResults.map((result) => {
                    const rank = leaderboardSortType === 'twitch'
                      ? (twitchRankMap.get(result.id) ?? 1)
                      : (playerRankMap.get(result.id) ?? 1);

                    return (
                      <LeaderboardCard
                        key={result.id}
                        result={result}
                        rank={rank}
                        totalItems={resultsArray.length}
                        isDarkAmbianceActive={isDarkAmbianceActive}
                        hasAnimatedOnce={hasAnimatedOnce}
                        isTwitchLinked={isTwitchLinked}
                        cardRef={(el) => { cardRefs.current[result.id] = el; }}
                        playerVote={result.playerVotes?.[session.hostPlayerId || '']}
                        showPlayerVoteBadge={session.isHostPlayer !== false}
                      />
                    );
                  })}
                </div>
              )}

              {/* Mobile Back Button */}
              <div className={`flex lg:hidden justify-center border-t-2 border-black pt-6 mt-2 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={handleBackToHome}
                  className="px-8 py-3.5 bg-host border-2 border-black text-black font-black text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Retour à l'accueil</span>
                </button>
              </div>
            </div>

            {/* Right Side (Desktop): Vote Averages Sidebar + Home Button */}
            <div className={`hidden lg:flex flex-col items-start w-52 xl:w-60 shrink-0 sticky top-8 self-start gap-4 z-20 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              {/* Vote Averages Card - NO BOX SHADOW */}
              <div className="w-full bg-white border-2 border-black rounded-2xl p-3.5 xl:p-4 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 border-b-2 border-black pb-2">
                  <BarChart2 className="w-4 h-4 text-host shrink-0" />
                  <span className="text-xs font-black uppercase text-black">Moyennes des votes</span>
                </div>

                {/* Session General Average */}
                <div className="flex flex-col bg-slate-50 border-2 border-black rounded-xl p-2.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Moyenne Session</span>
                  <span className="text-2xl font-black text-black font-mono leading-tight mt-0.5">
                    {sessionAvg.toFixed(2)}<span className="text-xs text-slate-500 font-bold">/5</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    ({resultsArray.length} {resultsArray.length === 1 ? 'thème' : 'thèmes'})
                  </span>
                </div>

                {/* Host's Own Average (if Host is a player) */}
                {session.isHostPlayer !== false && (
                  <div className="flex flex-col bg-amber-50 border-2 border-black rounded-xl p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase text-amber-950 flex items-center gap-1 truncate">
                        <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Moyenne {hostDisplayName}</span>
                      </span>
                      <span className="text-[9px] font-black bg-amber-200 text-amber-900 border border-black px-1.5 py-0.2 rounded shrink-0">
                        Host
                      </span>
                    </div>
                    <span className="text-2xl font-black text-amber-950 font-mono leading-tight mt-0.5">
                      {hostVotesCount > 0 ? (
                        <>{hostAvg.toFixed(2)}<span className="text-xs text-amber-700 font-bold">/5</span></>
                      ) : (
                        <span className="text-xs text-slate-400 font-sans font-bold">Non voté</span>
                      )}
                    </span>
                    <span className="text-[9px] font-bold text-amber-800">
                      ({hostVotesCount}/{resultsArray.length} notés)
                    </span>
                  </div>
                )}

                {/* Twitch Average if linked */}
                {isTwitchLinked && twitchCount > 0 && (
                  <div className="flex flex-col bg-purple-50 border-2 border-black rounded-xl p-2.5">
                    <span className="text-[10px] font-black uppercase text-purple-700">Chat Twitch</span>
                    <span className="text-xl font-black text-purple-950 font-mono leading-tight mt-0.5">
                      {twitchAvg.toFixed(2)}<span className="text-xs text-purple-400 font-bold">/5</span>
                    </span>
                    <span className="text-[9px] font-bold text-purple-500">
                      ({twitchCount} {twitchCount === 1 ? 'thème noté' : 'thèmes notés'})
                    </span>
                  </div>
                )}

                {/* Breakdown by other players */}
                {playersStats.filter(p => !p.isHost).length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-black/15">
                    <span className="text-[10px] font-black uppercase text-slate-500">Par joueur :</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                      {playersStats
                        .filter(p => !p.isHost)
                        .map(p => (
                          <div key={p.id} className="flex items-center justify-between p-1.5 bg-slate-50 border border-black rounded-lg text-xs">
                            <span className="font-bold text-black truncate max-w-[90px]" title={p.name}>{p.name}</span>
                            <span className="font-mono font-black text-black">
                              {p.ratedCount > 0 ? `${p.avg.toFixed(2)}/5` : '—'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Back to Home Button */}
              <button
                onClick={handleBackToHome}
                className="w-full py-3 px-3 bg-white border-2 border-black text-black hover:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
                title="Quitter la session et revenir à l'accueil"
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Retour à l'accueil</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
