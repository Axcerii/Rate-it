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
} from 'lucide-react';
import gsap from 'gsap';

// Dev-only dummy anime music list for testing progressive reveal animations
// STRICTLY GUARDED: process.env.NODE_ENV !== 'production' ensures it is dead-code eliminated in prod
const DEV_DUMMY_RESULTS = process.env.NODE_ENV !== 'production' ? [
  {
    id: 'dummy-1',
    youtubeId: '7aMOurgDB-o',
    title: 'Unravel',
    artistName: 'TK from Ling tosite sigure',
    description: 'Tokyo Ghoul - OP 1',
    average: 4.92,
    votesCount: 8,
    twitchAverage: 4.95,
    twitchVotesCount: 52,
  },
  {
    id: 'dummy-2',
    youtubeId: '2uq34TeWEdQ',
    title: 'Again',
    artistName: 'YUI',
    description: 'Fullmetal Alchemist: Brotherhood - OP 1',
    average: 4.81,
    votesCount: 8,
    twitchAverage: 4.88,
    twitchVotesCount: 44,
  },
  {
    id: 'dummy-3',
    youtubeId: 'CwkzK-F0Y00',
    title: 'Gurenge',
    artistName: 'LiSA',
    description: 'Demon Slayer - OP 1',
    average: 4.65,
    votesCount: 8,
    twitchAverage: 4.70,
    twitchVotesCount: 48,
  },
  {
    id: 'dummy-4',
    youtubeId: 'M2cckDmNLMI',
    title: 'KICK BACK',
    artistName: 'Kenshi Yonezu',
    description: 'Chainsaw Man - OP 1',
    average: 4.45,
    votesCount: 8,
    twitchAverage: 4.52,
    twitchVotesCount: 38,
  },
  {
    id: 'dummy-5',
    youtubeId: 'CID-sYQNCew',
    title: 'Shinzou wo Sasageyo!',
    artistName: 'Linked Horizon',
    description: 'Attack on Titan Season 2 - OP',
    average: 4.30,
    votesCount: 8,
    twitchAverage: 4.40,
    twitchVotesCount: 60,
  },
  {
    id: 'dummy-6',
    youtubeId: 'dlFA0Zq1k2A',
    title: 'Silhouette',
    artistName: 'KANA-BOON',
    description: 'Naruto Shippuden - OP 16',
    average: 4.12,
    votesCount: 8,
    twitchAverage: 4.25,
    twitchVotesCount: 35,
  },
  {
    id: 'dummy-7',
    youtubeId: '2S4qGKmzBJE',
    title: 'The Rumbling',
    artistName: 'SiM',
    description: 'Attack on Titan Final Season Part 2 - OP',
    average: 3.90,
    votesCount: 8,
    twitchAverage: 4.05,
    twitchVotesCount: 30,
  },
  {
    id: 'dummy-8',
    youtubeId: 'KId6eunoiW8',
    title: 'Crossing Field',
    artistName: 'LiSA',
    description: 'Sword Art Online - OP 1',
    average: 3.72,
    votesCount: 8,
    twitchAverage: 3.80,
    twitchVotesCount: 25,
  },
  {
    id: 'dummy-9',
    youtubeId: 'n6jCJZEFIto',
    title: 'Tank!',
    artistName: 'Seatbelts',
    description: 'Cowboy Bebop - OP',
    average: 3.50,
    votesCount: 8,
    twitchAverage: 3.65,
    twitchVotesCount: 21,
  },
  {
    id: 'dummy-10',
    youtubeId: '210R0ozmVwg',
    title: 'Bling-Bang-Bang-Born',
    artistName: 'Creepy Nuts',
    description: 'Mashle: Magic and Muscles S2 - OP',
    average: 3.25,
    votesCount: 8,
    twitchAverage: 3.40,
    twitchVotesCount: 33,
  },
] : [];

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
    showBanner,
    toggleHostPlayer,
    submitVote,
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
  const [malTracks, setMalTracks] = useState<any[]>([]);
  const [isLoadingMalTracks, setIsLoadingMalTracks] = useState(false);
  const [malLoadError, setMalLoadError] = useState<string | null>(null);
  const [malConnectedUser, setMalConnectedUser] = useState<string | null>(null);

  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true);

  // Leaderboard sorting state
  const [leaderboardSortType, setLeaderboardSortType] = useState<'players' | 'twitch'>('players');
  const [leaderboardSortDir, setLeaderboardSortDir] = useState<'desc' | 'asc'>('asc');

  // GSAP Progressive reveal & test animation states
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDarkAmbianceActive, setIsDarkAmbianceActive] = useState(false);
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false);
  const [enableDevDummyData, setEnableDevDummyData] = useState(false);
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

  // Fetch selected playlist details
  useEffect(() => {
    if (session?.status === 'LOBBY') {
      if (selectedPlaylistId) {
        getPlaylistDetails(selectedPlaylistId).then(res => {
          setSelectedPlaylistTracks(res.videos || []);
        }).catch(err => console.error(err));
      } else {
        setSelectedPlaylistTracks([]);
      }
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

    if (quizMode === 'mal') {
      const username = malUsername.trim();
      if (!username) {
        showBanner('Indiquez votre nom d\'utilisateur MyAnimeList pour commencer.', 'warning');
        return;
      }

      setLoadingMessage('Récupération de vos animés...');
      const t1 = setTimeout(() => {
        setLoadingMessage('Association avec la base de données...');
      }, 1500);
      const t2 = setTimeout(() => {
        setLoadingMessage('Récupération des liens vidéos...');
      }, 3000);

      try {
        await startGame(username, undefined, isShuffleEnabled);
      } catch (error: any) {
        clearTimeout(t1);
        clearTimeout(t2);
        showBanner(error.message || 'Erreur : Impossible de commencer la partie.', 'error');
      } finally {
        setLoadingMessage(null);
      }
    } else {
      if (!selectedPlaylistId) {
        showBanner('Veuillez sélectionner une playlist pour commencer la partie.', 'warning');
        return;
      }
      setLoadingMessage('Récupération de la playlist...');
      try {
        await startGame(undefined, selectedPlaylistId, isShuffleEnabled);
      } catch (error: any) {
        showBanner(error.message || 'Erreur : Impossible de commencer la partie.', 'error');
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
          community: [res.playlist, ...prev.community]
        }));
      }
      setSelectedPlaylistId(res.playlist.id);
      setSearchPlaylistId('');
    } catch (err: any) {
      setSearchPlaylistError(err.message || 'Playlist non trouvée.');
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

    const rawResults = (process.env.NODE_ENV !== 'production' && enableDevDummyData)
      ? (DEV_DUMMY_RESULTS || [])
      : Object.values(session?.results || {});

    if (rawResults.length === 0) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    setIsRevealing(true);
    setIsDarkAmbianceActive(false);

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

      // Alternating roundy entrance:
      // Even index: comes from right/down with positive tilt
      // Odd index: comes from left/down with negative tilt
      const startX = idx % 2 === 0 ? 80 : -80;
      const startY = 30; // arced curve
      const startRot = idx % 2 === 0 ? 2 : -2; // dynamic roundy tilt

      if (isTop1) {
        // Rank 1: The Grand Finale at the bottom
        tl.to({}, { duration: 1.0 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        // Dark ambiance spotlight turns ON
        tl.call(() => {
          setIsDarkAmbianceActive(true);
        });

        tl.to({}, { duration: 0.6 });

        // Make visible and zoom in with overshoot backlash
        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, scale: 0.15, rotation: -3, y: 40, x: 0 },
          {
            opacity: 1,
            scale: 1,
            rotation: 0,
            y: 0,
            x: 0,
            duration: 1.25,
            ease: 'back.out(1.7)',
          }
        );

        // Winner basks in spotlight
        tl.to({}, { duration: 2.4 });

        // Turn dark ambiance OFF
        tl.call(() => {
          setIsDarkAmbianceActive(false);
        });

        tl.to({}, { duration: 0.6 });
      } else if (isTop2) {
        // Rank 2: Slow down for suspense
        tl.to({}, { duration: 0.8 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: startY, rotation: startRot, scale: 0.93 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 1.15,
            ease: 'back.out(1.5)',
          }
        );

        tl.to({}, { duration: 0.5 });
      } else if (isTop3) {
        // Rank 3: Slow down
        tl.to({}, { duration: 0.6 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: startY, rotation: startRot, scale: 0.95 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 1.0,
            ease: 'back.out(1.4)',
          }
        );

        tl.to({}, { duration: 0.4 });
      } else {
        // Ranks > 3: Brisk rhythm with roundy arc and backlash
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
      }
    });
  };

  const handleSkipAnimation = () => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    setIsDarkAmbianceActive(false);
    setIsRevealing(false);
    setHasAnimatedOnce(true);
    const cardElements = Object.values(cardRefs.current).filter(Boolean) as HTMLElement[];
    gsap.set(cardElements, { opacity: 1, visibility: 'visible', x: 0, y: 0, rotation: 0, scale: 1, clearProps: 'all' });
  };

  const handleReplayAnimation = () => {
    setLeaderboardSortDir('asc');
    setHasAnimatedOnce(false);
    setTimeout(() => {
      triggerLeaderboardReveal();
    }, 50);
  };

  // Auto-trigger reveal animation when entering LEADERBOARD
  useEffect(() => {
    if (session?.status === 'LEADERBOARD' && !hasAnimatedOnce && !isRevealing) {
      const resultsToUse = (process.env.NODE_ENV !== 'production' && enableDevDummyData)
        ? (DEV_DUMMY_RESULTS || [])
        : Object.values(session?.results || {});

      if (resultsToUse.length > 0) {
        const timer = setTimeout(() => {
          triggerLeaderboardReveal();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.status, enableDevDummyData]);

  if (loadingMessage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-6 font-sans text-center min-h-screen">
        <div className="info-card w-full max-w-md p-8 rounded-3xl flex flex-col gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-[#24B3F1] mx-auto" />
          <h2 className="text-2xl font-black text-black font-title uppercase transform rotate-[-1deg]">
            Lancement de la partie
          </h2>
          <div className="py-4 border-t-2 border-b-2 border-black bg-white rounded-xl">
            <p className="text-sm font-black text-[#24B3F1] uppercase tracking-wide animate-pulse">
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

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-8 py-6 sm:py-12 font-sans w-full max-w-full overflow-x-hidden">
        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6 sm:gap-8">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-4 sm:pb-6 gap-4 text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start">
              <img
                src="/HOST/HostText.png"
                alt="Host Lobby"
                className="h-12 sm:h-20 w-auto object-contain max-w-full"
              />
              <p className="text-xl font-bold text-black mt-1">Configurez la salle et invitez vos compagnons !</p>
            </div>
            <button
              onClick={handleBackToHome}
              className="px-4 py-2.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Fermer la session</span>
            </button>
          </div>

          {/* Quiz Mode Selector (Goofy Wario style) */}
          <div className="flex flex-col sm:flex-row border-4 border-black rounded-2xl overflow-hidden font-black text-xs sm:text-sm uppercase shrink-0">
            <button
              onClick={() => setQuizMode('playlist')}
              className={`flex-1 py-3.5 sm:py-4 px-2 text-center btn-choice-hover inline-flex items-center justify-center gap-2 ${quizMode === 'playlist'
                ? 'bg-playlist text-black font-black'
                : 'bg-white text-black hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100'
                }`}
            >
              <span className="uppercase">Choisir une playlist</span>
            </button>
            <button
              onClick={() => setQuizMode('mal')}
              className={`flex-1 py-3.5 sm:py-4 px-2 text-center btn-choice-hover inline-flex items-center justify-center gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-black ${quizMode === 'mal'
                ? 'bg-playlist text-black font-black'
                : 'bg-white text-black hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100'
                }`}
            >
              <span className="uppercase">Basé sur mon MyAnimeList</span>
            </button>
          </div>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-5 flex-1 items-start w-full max-w-full">
            {/* Left side parameters (2/5) */}
            <div className="lg:col-span-2 flex flex-col gap-6 w-full max-w-full">
              {/* Room Code Card */}
              <div className="info-card p-3.5 sm:p-6 text-center rounded-2xl flex flex-col items-center w-full max-w-full">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-600">Code de la Salle</h3>

                <div className="mt-3 w-full text-2xl sm:text-4xl font-black tracking-wider sm:tracking-widest text-black bg-white py-2.5 sm:py-3 rounded-xl border-2 border-black flex items-center justify-center gap-2 sm:gap-3 relative overflow-hidden px-2">
                  <span className="font-mono select-all">
                    {showRoomCode ? session.sessionId : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRoomCode(!showRoomCode)}
                    title={showRoomCode ? 'Cacher le code' : 'Afficher le code'}
                    className="btn-action-hover p-1 text-slate-700"
                  >
                    {showRoomCode ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center w-full">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 sm:px-4 py-2.5 border-2 border-black bg-[#24B3F1] text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Lien copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>Copier le lien d'invitation</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQRCode(!showQRCode)}
                    className="px-3 sm:px-4 py-2.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-1.5"
                  >
                    {showQRCode ? (
                      <>
                        <EyeOff className="w-4 h-4 shrink-0" />
                        <span>Cacher le QR Code</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 shrink-0" />
                        <span>Afficher le QR Code</span>
                      </>
                    )}
                  </button>
                </div>

                {showQRCode && joinUrl && (
                  <div className="mt-4 flex flex-col items-center gap-4 w-full">
                    <div className="p-3 bg-white border-2 border-black rounded-xl">
                      <QRCodeSVG value={joinUrl} size={140} level="H" includeMargin={false} />
                    </div>
                    <p className="text-xs text-slate-700 font-bold leading-relaxed max-w-xs mt-1">
                      Scanner le QR Code pour rejoindre la salle :
                      <br />
                      <span className="text-[#24B3F1] break-all select-all font-mono font-bold">{joinUrl}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Host Options Card */}
              <div className="info-card p-3.5 sm:p-5 rounded-2xl flex flex-col gap-3.5 w-full max-w-full !overflow-visible z-20">
                {/* Host Player Option */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="hostIsPlayerLobbyToggle" className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-black text-black select-none">
                      <input
                        type="checkbox"
                        id="hostIsPlayerLobbyToggle"
                        checked={session.isHostPlayer !== false}
                        onChange={async (e) => {
                          try {
                            await toggleHostPlayer(e.target.checked);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="h-4 w-4 accent-[#24B3F1] cursor-pointer"
                      />
                      <span>Le Host est un joueur</span>
                    </label>

                    {/* Hoverable Tooltip "?" */}
                    <div className="group relative inline-flex items-center justify-center">
                      <span
                        tabIndex={0}
                        className="h-4 w-4 rounded-full bg-slate-200 border border-black text-slate-800 text-xs font-black flex items-center justify-center cursor-help focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        ?
                      </span>
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus-within:flex flex-col w-64 p-3 bg-black text-white text-xs font-bold rounded-xl shadow-xl text-center leading-snug z-50">
                        Permet au Host de voter. À décocher si vous voulez jouer sur votre téléphone avec vos amis dans la vrai vie.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shuffle Random Order Option */}
                <div className="flex items-center justify-between gap-3 border-t border-black/15 pt-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="shuffleOpeningsToggle" className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-black text-black select-none">
                      <input
                        type="checkbox"
                        id="shuffleOpeningsToggle"
                        checked={isShuffleEnabled}
                        onChange={(e) => setIsShuffleEnabled(e.target.checked)}
                        className="h-4 w-4 accent-[#24B3F1] cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5">
                        <span>Les vidéos sont dans un ordre aléatoire</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>



              {/* Twitch Votes */}
              <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col gap-3 w-full max-w-full overflow-hidden">
                <h3 className="text-sm sm:text-base font-black text-black uppercase flex items-center gap-2 border-b border-black pb-2">
                  <span>Twitch</span>
                  <span className="text-xs bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded font-black uppercase">optionnel</span>
                </h3>
                <p className="text-xs text-slate-700 font-bold leading-relaxed">
                  Laisse participer ton chat en les laissant taper un chiffre entre 1 et 5 et regarde leurs votes !
                </p>
                {session.twitchChannel ? (
                  <div className="flex flex-col gap-2 bg-purple-50 p-3.5 border-2 border-purple-300 rounded-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm text-purple-900 font-black flex items-center gap-1.5 truncate">
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
                        Connecté au compte : #{session.twitchChannel}
                      </span>
                      <button
                        onClick={handleDisconnectTwitch}
                        className="text-xs text-[#990000] hover:text-red-500 focus:text-red-500 focus-visible:text-red-500 font-black shrink-0 btn-action-hover underline"
                      >
                        Déconnexion
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={twitchChannel}
                      onChange={(e) => setTwitchChannel(e.target.value)}
                      placeholder="pseudo_twitch..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 border-2 border-black bg-white focus:outline-none text-xs sm:text-sm font-bold rounded-xl"
                    />
                    <button
                      onClick={handleConnectTwitch}
                      disabled={isTwitchConnecting}
                      className="px-4 py-2.5 bg-[#24B3F1] text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover disabled:opacity-50 shrink-0"
                    >
                      {isTwitchConnecting ? '...' : 'Connexion'}
                    </button>
                  </div>
                )}
                {twitchError && (
                  <p className="text-xs text-[#990000] font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{twitchError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right side parameters (3/5) */}
            <div className="lg:col-span-3 flex flex-col gap-6 w-full max-w-full overflow-hidden">
              {quizMode === 'playlist' ? (
                /* PLAYLIST SELECTION CARD */
                <div className="info-card p-4 sm:p-6 rounded-2xl flex flex-col min-h-[460px] w-full max-w-full overflow-hidden">
                  <h3 className="text-sm sm:text-base font-black text-black uppercase border-b-2 border-black pb-2.5 mb-4 text-cyan-950">
                    Playlist & Sélection des vidéos
                  </h3>

                  {/* Search Playlist ID */}
                  <form onSubmit={handleSearchPlaylist} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={searchPlaylistId}
                      onChange={(e) => setSearchPlaylistId(e.target.value)}
                      placeholder="Code de partage de playlist..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 border-2 border-black bg-white text-xs sm:text-sm font-bold focus:outline-none rounded-xl"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 border-2 border-black bg-white text-cyan-950 font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover shrink-0"
                    >
                      Charger
                    </button>
                  </form>
                  {searchPlaylistError && (
                    <p className="text-xs text-[#990000] font-black mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{searchPlaylistError}</span>
                    </p>
                  )}

                  {/* Search / Filter Playlists Bar */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={playlistSearchQuery}
                      onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                      placeholder="Rechercher une playlist par nom, description ou ID..."
                      className="w-full pl-10 pr-9 py-2.5 border-2 border-black bg-white rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:bg-[#faf6eb]"
                    />
                    {playlistSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPlaylistSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-0.5"
                        title="Effacer la recherche"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Playlist Tabs (Validated vs Community) */}
                  <div className="flex flex-col sm:flex-row border-2 sm:border-4 border-black rounded-xl sm:rounded-2xl overflow-hidden font-black text-xs sm:text-sm uppercase mb-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPlaylistTab('validated')}
                      className={`flex-1 py-2.5 sm:py-3 px-2 text-center btn-choice-hover inline-flex items-center justify-center gap-2 ${playlistTab === 'validated'
                        ? 'bg-playlist text-black font-black'
                        : 'bg-white text-black hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100'
                        }`}
                    >
                      <span className="uppercase">
                        Playlists vérifiées ({playlistSearchQuery.trim() ? `${filterPlaylists(playlists.validated).length}/${playlists.validated.length}` : playlists.validated.length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaylistTab('community')}
                      className={`flex-1 py-2.5 sm:py-3 px-2 text-center btn-choice-hover inline-flex items-center justify-center gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-black ${playlistTab === 'community'
                        ? 'bg-playlist text-black font-black'
                        : 'bg-white text-black hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100'
                        }`}
                    >
                      <span className="uppercase">
                        Playlists de la communauté ({playlistSearchQuery.trim() ? `${filterPlaylists(playlists.community).length}/${playlists.community.length}` : playlists.community.length})
                      </span>
                    </button>
                  </div>

                  {/* Playlist Cards List (Scrollable box) */}
                  <div className="flex-1 border-2 border-black bg-white p-3 sm:p-4 rounded-2xl max-h-72 sm:max-h-80 overflow-y-auto mb-5 flex flex-col gap-3.5">
                    {(() => {
                      const filteredValidated = filterPlaylists(playlists.validated);
                      const filteredCommunity = filterPlaylists(playlists.community);
                      const activeLists = playlistTab === 'validated' ? filteredValidated : filteredCommunity;

                      if (activeLists.length === 0) {
                        if (playlistSearchQuery.trim()) {
                          return (
                            <div className="text-center py-8 flex flex-col items-center gap-2">
                              <p className="text-xs sm:text-sm text-slate-600 font-bold">
                                Aucune playlist ne correspond à &quot;{playlistSearchQuery}&quot; dans cet onglet.
                              </p>
                              {playlistTab === 'validated' && filteredCommunity.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPlaylistTab('community')}
                                  className="text-xs font-black text-[#24B3F1] hover:underline"
                                >
                                  Voir les {filteredCommunity.length} résultat{filteredCommunity.length > 1 ? 's' : ''} dans la communauté →
                                </button>
                              )}
                              {playlistTab === 'community' && filteredValidated.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPlaylistTab('validated')}
                                  className="text-xs font-black text-[#24B3F1] hover:underline"
                                >
                                  Voir les {filteredValidated.length} résultat{filteredValidated.length > 1 ? 's' : ''} dans les vérifiées →
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setPlaylistSearchQuery('')}
                                className="mt-1 px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover"
                              >
                                Réinitialiser la recherche
                              </button>
                            </div>
                          );
                        }
                        return <p className="text-xs sm:text-sm text-slate-500 font-bold text-center py-8">Aucune playlist n'a été trouvée.</p>;
                      }
                      return activeLists.map((p) => {
                        const isSelected = p.id === selectedPlaylistId;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlaylistId(p.id)}
                            className={`p-3.5 sm:p-4 rounded-2xl transition cursor-pointer flex justify-between items-start gap-3 sm:gap-4 ${isSelected
                              ? 'border-4 border-black bg-yellow-100'
                              : 'border-2 border-black bg-white hover:bg-slate-50 focus:bg-slate-50 focus-visible:bg-slate-50'
                              }`}
                          >
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isSelected && <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
                                <span className="font-black text-sm sm:text-base text-black block">
                                  {p.name}
                                </span>
                              </div>
                              {p.description && (
                                <p className="text-xs sm:text-sm text-slate-700 font-bold mt-1 line-clamp-2 leading-relaxed break-words">
                                  {p.description}
                                </p>
                              )}
                              <span className="text-xs font-mono text-slate-500 block mt-1.5 uppercase font-bold">
                                ID: {p.id}
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2 shrink-0">
                              <span className="text-xs bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1.5">
                                <Gamepad2 className="w-3.5 h-3.5" />
                                <span>{p.played_count || 0} plays</span>
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Tracks list inside selected playlist with toggles */}
                  <div className="flex-1 border-2 border-black bg-white p-3 sm:p-4 rounded-2xl max-h-72 sm:max-h-80 overflow-y-auto mb-4">
                    <p className="text-xs sm:text-sm font-black text-slate-600 uppercase border-b border-slate-200 pb-2 mb-3">
                      Vidéos de la Playlist (Décocher pour exclure)
                    </p>
                    {selectedPlaylistTracks.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center font-bold">
                        {selectedPlaylistId ? 'Chargement des vidéos...' : 'Sélectionnez une playlist ci-dessus pour afficher et gérer ses vidéos.'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {selectedPlaylistTracks.map((track) => {
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
                <div className="info-card p-4 sm:p-6 rounded-2xl flex flex-col min-h-[460px] w-full max-w-full overflow-hidden">
                  {/* Connexion MAL form at the top */}
                  <div className="border-b-2 border-black pb-4 mb-4 flex flex-col gap-2.5">
                    <h3 className="text-sm sm:text-base font-black text-black uppercase flex items-center gap-2 border-b border-black pb-2 text-[#990000]">
                      <span>MyAnimeList connexion</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed">
                      Entrez votre pseudo MyAnimeList pour prendre automatiquement les openings des animes que vous avez complétés.
                    </p>

                    <form onSubmit={handleLoadMalTracks} className="flex flex-col sm:flex-row gap-2 mt-1">
                      <input
                        type="text"
                        value={malUsername}
                        onChange={(e) => setMalUsername(e.target.value)}
                        placeholder="Pseudo MyAnimeList..."
                        className="flex-1 min-w-0 px-3.5 py-2.5 border-2 border-black bg-white focus:outline-none focus:bg-white text-xs sm:text-sm font-bold rounded-xl"
                      />
                      <button
                        type="submit"
                        disabled={isLoadingMalTracks}
                        className="px-5 py-2.5 border-2 border-black bg-white text-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover disabled:opacity-50 shrink-0"
                      >
                        {isLoadingMalTracks ? '...' : 'Charger'}
                      </button>
                    </form>

                    {malLoadError && (
                      <p className="text-xs text-[#990000] font-black flex items-center gap-1.5 mt-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{malLoadError}</span>
                      </p>
                    )}
                  </div>

                  {malConnectedUser ? (
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="bg-emerald-50 p-3.5 border-2 border-emerald-500 rounded-xl text-left shrink-0">
                        <p className="text-xs sm:text-sm text-emerald-950 font-black">
                          Voici la liste des openings trouvés pour le compte: <span className="underline">{malConnectedUser}</span> ({malTracks.length} openings trouvés)
                        </p>
                      </div>

                      {/* Tracks list checklist with toggles */}
                      <div className="flex-1 border-2 border-black bg-white p-3 sm:p-4 rounded-2xl max-h-[340px] overflow-y-auto mb-4">
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
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-8 text-center">
                      <p className="text-xs font-black text-slate-600 uppercase max-w-xs leading-relaxed">
                        Rentrez votre pseudo MyAnimeList et cliquez sur <span className="text-[#990000] font-black">Charger</span> ci-dessus pour configurer la liste des openings à exclure.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Connected players list */}
              <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col min-h-[220px] w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                  <h3 className="text-sm font-black text-black uppercase flex items-center gap-2">
                    Joueurs connectés
                    <span className="bg-black text-[#faf6eb] px-2 py-0.5 rounded text-xs font-mono">
                      {playersList.length}
                    </span>
                  </h3>
                </div>

                {playersList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-6 text-center">
                    <UserX className="w-8 h-8 text-slate-400 animate-pulse mb-2" />
                    <p className="text-xs font-bold text-slate-600 mt-2">En attente de joueurs... <br /> Si seul, veuillez cocher la case "Le Host est un joueur"</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 max-h-40 overflow-y-auto pr-1">
                    {playersList.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-2.5 sm:p-3 border-2 border-black bg-white rounded-xl ${player.isConnected ? 'opacity-100' : 'opacity-50 bg-slate-100'
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
                    className="w-full sm:w-auto px-6 py-3 bg-[#24B3F1] border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <span>Commencer la partie ({playersList.length} joueurs)</span>
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
                  <button
                    onClick={handleProceedAfterReveal}
                    className="px-4 sm:px-5 py-2.5 bg-[#24B3F1] border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
                  >
                    <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Afficher les résultats' : 'Vidéo suivante'}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={handleShowResults}
                    className="px-4 sm:px-5 py-2.5 bg-[#24B3F1] border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
                  >
                    <BarChart2 className="w-4 h-4 shrink-0" />
                    <span>Résultats</span>
                  </button>
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
                      <span>Mon Vote (Hôte)</span>
                    </h3>
                    {session.votes?.[session.hostPlayerId || ''] !== undefined && (
                      <span className="text-xs font-black bg-emerald-100 text-emerald-800 border border-black px-2 py-0.5 rounded">
                        Voté : {session.votes[session.hostPlayerId || '']}/5
                      </span>
                    )}
                  </div>

                  {session.phase === 'REVEAL' ? (
                    <p className="text-xs font-bold text-slate-600 text-center py-2">
                      Résultats affichés pour cette vidéo
                    </p>
                  ) : (
                    <div className="flex justify-between items-center gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const hostVote = session.votes?.[session.hostPlayerId || ''];
                        const isSelected = hostVote === val;
                        let style = "bg-white border-2 border-black text-black hover:bg-slate-100";
                        if (isSelected) {
                          if (val === 1) style = "bg-red-600 border-2 border-black text-white font-black";
                          else if (val === 2) style = "bg-orange-500 border-2 border-black text-white font-black";
                          else if (val === 3) style = "bg-yellow-400 border-2 border-black text-black font-black";
                          else if (val === 4) style = "bg-emerald-500 border-2 border-black text-white font-black";
                          else if (val === 5) style = "bg-[#24B3F1] border-2 border-black text-black font-black";
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
                    <Users className="w-4 h-4 text-[#24B3F1]" />
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
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 uppercase flex items-center gap-1">
                          <span>Pas de vote</span>
                          <X className="w-3 h-3" />
                        </span>
                      );
                      if (playerVote !== undefined) {
                        const labels: Record<number, { text: string; bg: string; icon: React.ReactNode }> = {
                          1: { text: '1', bg: 'bg-red-600 text-white', icon: <FastForward className="w-3 h-3" /> },
                          2: { text: '2', bg: 'bg-orange-500 text-white', icon: <Ghost className="w-3 h-3" /> },
                          3: { text: '3', bg: 'bg-yellow-400 text-black', icon: <ThumbsUp className="w-3 h-3" /> },
                          4: { text: '4', bg: 'bg-emerald-500 text-white', icon: <ListPlus className="w-3 h-3" /> },
                          5: { text: '5', bg: 'bg-[#24B3F1] text-black', icon: <Crown className="w-3 h-3 text-amber-300" /> },
                        };
                        const l = labels[playerVote] || { text: `Score ${playerVote}`, bg: 'bg-black text-white', icon: null };
                        voteBadge = (
                          <span className={`text-xs font-black px-2 py-0.5 rounded border border-black uppercase flex items-center gap-1 ${l.bg}`}>
                            <span>{l.text}</span>
                            {l.icon}
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

              <div className="mt-2 flex justify-center z-10">
                <button
                  onClick={handleProceedAfterReveal}
                  className="px-6 sm:px-8 py-3 bg-[#24B3F1] text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 shadow-[2px_2px_0px_#000]"
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
      (process.env.NODE_ENV !== 'production' && enableDevDummyData) ||
      Object.values(session.results || {}).some(r => r.twitchVotesCount && r.twitchVotesCount > 0)
    );

    const resultsArray = (process.env.NODE_ENV !== 'production' && enableDevDummyData)
      ? (DEV_DUMMY_RESULTS || [])
      : Object.values(session.results || {});

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

    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-6 sm:py-10 font-sans w-full max-w-full overflow-x-hidden">
        {/* Dark Ambiance Backdrop Overlay for Winner #1 Reveal */}
        <div
          className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-30 pointer-events-none transition-opacity duration-700 ${
            isDarkAmbianceActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6 sm:gap-8 justify-center items-center">
          {/* Header with BIG Resultat.png that POPs on desktop + Reveal Controls */}
          <div className="flex flex-col items-center justify-center border-b-4 border-black pb-4 sm:pb-6 text-center w-full">
            <img
              src="/HOST/Resultat.png"
              alt="Résultats"
              className="h-20 sm:h-32 md:h-44 lg:h-52 xl:h-60 w-auto object-contain max-w-full drop-shadow-[4px_4px_0px_#000]"
            />
            <p className="text-xs sm:text-sm md:text-base font-bold text-slate-800 mt-2">
              Découvrez les notes et le classement final de la session
            </p>

            {/* Animation Control Bar & Dev Testing Toggle */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3.5 z-20">
              {isRevealing ? (
                <button
                  type="button"
                  onClick={handleSkipAnimation}
                  className="px-4 py-2 bg-black text-white text-xs font-black uppercase rounded-xl inline-flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Passer l'animation et afficher tous les résultats immédiatement"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Passer l'animation</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReplayAnimation}
                  className="px-4 py-2 bg-white border-2 border-black text-black text-xs font-black uppercase rounded-xl inline-flex items-center gap-2 hover:bg-slate-100 transition-colors btn-action-hover cursor-pointer"
                  title="Rejouer l'animation progressive du classement"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rejouer l'animation</span>
                </button>
              )}

              {/* Dev Only: Test with 10 anime tracks (strictly eliminated in production) */}
              {process.env.NODE_ENV !== 'production' && (
                <button
                  type="button"
                  onClick={() => {
                    if (isRevealing) {
                      handleSkipAnimation();
                    }
                    setEnableDevDummyData(prev => !prev);
                    setHasAnimatedOnce(false);
                  }}
                  className={`px-3.5 py-2 border-2 border-black rounded-xl text-xs font-black uppercase inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    enableDevDummyData
                      ? 'bg-emerald-400 text-black'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                  title="Charger 10 musiques d'anime fictives pour tester l'animation (Dev only - jamais inclus en prod)"
                >
                  <span>🧪 {enableDevDummyData ? 'Désactiver les 10 musiques test' : 'Tester avec 10 musiques d\'anime'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Content: Left Wing (Desktop) + Center Leaderboard + Right Wing (Desktop) */}
          <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-4 xl:gap-6">
            {/* Left Side (Desktop): Sorting Buttons (Both Player and Twitch underneath) */}
            <div className="hidden lg:flex flex-col items-end w-52 xl:w-60 shrink-0 sticky top-8 gap-3 z-20">
              <div className="bg-white border-2 border-black p-3.5 rounded-2xl w-full text-center flex flex-col gap-3">
                <span className="block text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  Ordre d'affichage
                </span>

                {/* Player Sort Button */}
                <button
                  type="button"
                  onClick={() => handleSortClick('players')}
                  className={`w-full py-3 px-3 border-2 border-black rounded-xl text-xs font-black uppercase inline-flex items-center justify-center gap-2 btn-action-hover ${
                    leaderboardSortType === 'players'
                      ? 'bg-[#24B3F1] text-black'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  title={leaderboardSortType === 'players' ? 'Cliquer pour inverser l\'ordre' : 'Trier par les votes des joueurs'}
                >
                  <span>
                    Joueurs : {leaderboardSortType === 'players' ? (leaderboardSortDir === 'desc' ? 'Meilleur au Pire' : 'Pire au Meilleur') : 'Pire au Meilleur'}
                  </span>
                  {leaderboardSortType === 'players' ? (
                    leaderboardSortDir === 'desc' ? <ArrowDown className="w-4 h-4 shrink-0" /> : <ArrowUp className="w-4 h-4 shrink-0" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 shrink-0 opacity-40" />
                  )}
                </button>

                {/* Twitch Sort Button (placed directly underneath the Player button) */}
                {isTwitchLinked && (
                  <button
                    type="button"
                    onClick={() => handleSortClick('twitch')}
                    className={`w-full py-3 px-3 border-2 border-black rounded-xl text-xs font-black uppercase inline-flex items-center justify-center gap-2 btn-action-hover ${
                      leaderboardSortType === 'twitch'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-purple-800 hover:bg-purple-50'
                    }`}
                    title={leaderboardSortType === 'twitch' ? 'Cliquer pour inverser l\'ordre' : 'Trier par les votes Twitch'}
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-300 animate-pulse shrink-0" />
                    <span>
                      Twitch : {leaderboardSortType === 'twitch' ? (leaderboardSortDir === 'desc' ? 'Meilleur au Pire' : 'Pire au Meilleur') : 'Pire au Meilleur'}
                    </span>
                    {leaderboardSortType === 'twitch' ? (
                      leaderboardSortDir === 'desc' ? <ArrowDown className="w-4 h-4 shrink-0" /> : <ArrowUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 shrink-0 opacity-40" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Center: Leaderboard Cards */}
            <div className="info-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 w-full max-w-4xl !overflow-visible !z-auto">
              {/* Mobile / Tablet Sorting Toolbar (< lg only) */}
              <div className="flex lg:hidden flex-col gap-2.5 border-b-2 border-black pb-4">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Ordre d'affichage :
                </span>

                <div className="flex flex-col gap-2">
                  {/* Mobile Button 1: Joueurs */}
                  <button
                    type="button"
                    onClick={() => handleSortClick('players')}
                    className={`w-full px-3.5 py-2.5 border-2 border-black rounded-xl text-xs font-black uppercase inline-flex items-center justify-center gap-2 btn-action-hover ${
                      leaderboardSortType === 'players'
                        ? 'bg-[#24B3F1] text-black'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>
                      Joueurs : {leaderboardSortType === 'players' ? (leaderboardSortDir === 'desc' ? 'Meilleur au Pire' : 'Pire au Meilleur') : 'Pire au Meilleur'}
                    </span>
                    {leaderboardSortType === 'players' ? (
                      leaderboardSortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5 shrink-0" /> : <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                    )}
                  </button>

                  {/* Mobile Button 2: Twitch placed directly under the player one */}
                  {isTwitchLinked && (
                    <button
                      type="button"
                      onClick={() => handleSortClick('twitch')}
                      className={`w-full px-3.5 py-2.5 border-2 border-black rounded-xl text-xs font-black uppercase inline-flex items-center justify-center gap-2 btn-action-hover ${
                        leaderboardSortType === 'twitch'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-800 hover:bg-purple-50'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-purple-300 animate-pulse shrink-0" />
                      <span>
                        Twitch : {leaderboardSortType === 'twitch' ? (leaderboardSortDir === 'desc' ? 'Meilleur au Pire' : 'Pire au Meilleur') : 'Pire au Meilleur'}
                      </span>
                      {leaderboardSortType === 'twitch' ? (
                        leaderboardSortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5 shrink-0" /> : <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {sortedResults.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-4 text-slate-500 font-bold text-xs sm:text-sm">
                  <p>Aucun vote n'a été enregistré pour le moment.</p>
                  {process.env.NODE_ENV !== 'production' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEnableDevDummyData(true);
                        setHasAnimatedOnce(false);
                      }}
                      className="px-5 py-2.5 bg-emerald-400 border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover"
                    >
                      🧪 Charger 10 musiques de test (Dev)
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative !z-auto">
                  {sortedResults.map((result) => {
                    const percent = (result.average / 5) * 100;
                    const rank = leaderboardSortType === 'twitch' ? (twitchRankMap.get(result.id) ?? 1) : (playerRankMap.get(result.id) ?? 1);
                    const isTop3 = rank <= 3;
                    const isWinner = rank === 1;
                    const isSecond = rank === 2;
                    const isThird = rank === 3;
                    const isLast = resultsArray.length > 1 && rank === resultsArray.length;

                    // Background and border styling for podium & standard ranks
                    let cardBg = "bg-white";
                    let borderStyle = "border-2 border-black";

                    if (isWinner) {
                      cardBg = "bg-[#facc15]";
                      borderStyle = "border-4 border-black transform sm:rotate-[0.5deg]";
                    } else if (isSecond) {
                      cardBg = "bg-slate-50";
                      borderStyle = "border-2 sm:border-3 border-black";
                    } else if (isThird) {
                      cardBg = "bg-amber-50/70";
                      borderStyle = "border-2 sm:border-3 border-black";
                    } else if (isLast) {
                      cardBg = "bg-red-50";
                    }

                    // Card z-index and highlight styling: Winner is placed at !z-50 in root context so it is never blurred!
                    const winnerSpotlight = isWinner
                      ? isDarkAmbianceActive
                        ? 'relative !z-50 ring-4 ring-amber-400 shadow-[0_0_60px_rgba(250,204,21,0.9)]'
                        : 'relative !z-40'
                      : isTop3
                      ? 'relative z-20'
                      : 'relative z-10 hover:z-25';

                    // RENDER TOP 3: FULL CARD WITH DIRECT PREVIEW THUMBNAIL
                    if (isTop3) {
                      return (
                        <div
                          key={result.id}
                          ref={(el) => { cardRefs.current[result.id] = el; }}
                          style={{ opacity: hasAnimatedOnce ? 1 : 0, visibility: hasAnimatedOnce ? 'visible' : 'hidden' }}
                          className={`p-5 sm:p-6 rounded-3xl ${cardBg} ${borderStyle} ${winnerSpotlight} flex flex-col md:flex-row items-stretch md:items-center gap-5 sm:gap-6 transition-all !overflow-visible`}
                        >
                          {/* Left: Visible YouTube Thumbnail Preview (Play button only on hover) */}
                          <div className="relative w-full md:w-52 lg:w-60 aspect-video rounded-2xl overflow-hidden border-2 border-black bg-black shrink-0 group/thumb">
                            <img
                              src={`https://img.youtube.com/vi/${result.youtubeId}/mqdefault.jpg`}
                              alt={result.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                              loading="lazy"
                            />
                            {/* Red play button shown ONLY when hovering */}
                            <a
                              href={`https://www.youtube.com/watch?v=${result.youtubeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 cursor-pointer opacity-0 group-hover/thumb:opacity-100"
                              title="Regarder sur YouTube (nouvel onglet)"
                            >
                              <div className="w-11 h-11 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg transform transition-transform group-hover/thumb:scale-110">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </div>
                              <span className="sr-only">Ouvrir sur YouTube</span>
                            </a>
                            <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/20 pointer-events-none">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>YouTube</span>
                            </div>
                          </div>

                          {/* Center: Rank Badge, Podium Tag, Title & Artist */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                              {/* Rank badge */}
                              <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-2 border-black flex items-center justify-center font-black text-base sm:text-lg shrink-0 relative ${
                                isWinner ? 'bg-black text-[#faf6eb]' : isSecond ? 'bg-slate-200 text-slate-900' : 'bg-amber-200 text-amber-950'
                              }`}>
                                #{rank}
                                {isWinner && (
                                  <span className="absolute -top-3 -right-2">
                                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400 drop-shadow" />
                                  </span>
                                )}
                              </div>

                              {/* Podium Tag */}
                              <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border border-black ${
                                isWinner ? 'bg-amber-400 text-black' : isSecond ? 'bg-slate-200 text-black' : 'bg-amber-100 text-amber-950'
                              }`}>
                                {isWinner ? '🏆 1ère Place - Vainqueur' : isSecond ? '🥈 2ème Place' : '🥉 3ème Place'}
                              </span>
                            </div>

                            {/* Clickable Title redirecting to YouTube */}
                            <a
                              href={`https://www.youtube.com/watch?v=${result.youtubeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-black text-black text-base sm:text-lg leading-snug hover:text-[#BF1539] hover:underline transition-colors max-w-full group/title"
                              title="Ouvrir la vidéo sur YouTube"
                            >
                              <span className="truncate">{result.title}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/title:opacity-100 shrink-0 text-slate-700 group-hover/title:text-[#BF1539]" />
                            </a>

                            <p className="text-xs font-bold text-slate-700 mt-1 leading-relaxed truncate">
                              par <span className="text-black font-black">{result.artistName || 'Artiste Non-Renseigné'}</span>
                              {result.description ? ` — ${result.description}` : ''}
                            </p>
                          </div>

                          {/* Right: Scores & Progress Bars */}
                          <div className="flex flex-col gap-2.5 w-full md:w-72 lg:w-80 shrink-0 justify-center border-t md:border-t-0 md:border-l border-black/15 pt-3 md:pt-0 md:pl-5">
                            {/* Players Score Bar (Hide 'Joueurs' if Twitch not active) */}
                            <div className="flex items-center gap-3 w-full">
                              {isTwitchLinked && (
                                <span className="text-[11px] font-black uppercase text-slate-700 w-16 shrink-0 text-left">
                                  Joueurs
                                </span>
                              )}
                              <div className="flex-1 bg-[#faf6eb] border-2 border-black rounded-full h-3.5 overflow-hidden">
                                <div
                                  className="h-full bg-[#24B3F1] border-r-2 border-black rounded-full transition-all duration-1000"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="text-right flex items-center justify-end gap-1.5 w-24 shrink-0 font-mono">
                                <span className="text-base sm:text-lg font-black text-black leading-none">
                                  {result.average.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">/5</span>
                                <span className="text-[10px] font-bold text-slate-500 ml-1">
                                  ({result.votesCount})
                                </span>
                              </div>
                            </div>

                            {/* Twitch Score Bar */}
                            {result.twitchVotesCount !== undefined && result.twitchVotesCount > 0 && (
                              <div className="flex items-center gap-3 w-full border-t border-black/10 pt-1.5">
                                <span className="text-[11px] font-black uppercase text-purple-700 w-16 shrink-0 text-left flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                                  Twitch
                                </span>
                                <div className="flex-1 bg-[#faf6eb] border-2 border-black rounded-full h-3.5 overflow-hidden">
                                  <div
                                    className="h-full bg-purple-600 border-r-2 border-black rounded-full transition-all duration-1000"
                                    style={{ width: `${((result.twitchAverage ?? 0) / 5) * 100}%` }}
                                  />
                                </div>
                                <div className="text-right flex items-center justify-end gap-1.5 w-24 shrink-0 font-mono">
                                  <span className="text-base sm:text-lg font-black text-purple-700 leading-none">
                                    {(result.twitchAverage ?? 0).toFixed(2)}
                                  </span>
                                  <span className="text-xs text-slate-400 font-bold">/5</span>
                                  <span className="text-[10px] font-bold text-purple-600 ml-1">
                                    ({result.twitchVotesCount})
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // RENDER RANKS 4+: COMPACT CARD WITH HOVER PREVIEW POPOVER
                    return (
                      <div
                        key={result.id}
                        ref={(el) => { cardRefs.current[result.id] = el; }}
                        style={{ opacity: hasAnimatedOnce ? 1 : 0, visibility: hasAnimatedOnce ? 'visible' : 'hidden' }}
                        className={`p-4 sm:p-5 rounded-2xl ${cardBg} ${borderStyle} ${winnerSpotlight} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all !overflow-visible`}
                      >
                        {/* Left: Rank badge & Title info with hover preview and click redirect */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border-2 border-black bg-black text-[#faf6eb] flex items-center justify-center font-black text-base sm:text-lg shrink-0 relative">
                            #{rank}
                          </div>

                          <div className="min-w-0 flex-1 text-left">
                            {/* Title with hover thumbnail preview and click redirect to YouTube */}
                            <div className="relative group/title inline-block max-w-full">
                              <a
                                href={`https://www.youtube.com/watch?v=${result.youtubeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-black text-black text-sm sm:text-base leading-snug hover:text-[#BF1539] hover:underline transition-colors max-w-full"
                                title="Ouvrir la vidéo sur YouTube"
                              >
                                <span className="truncate">{result.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/title:opacity-100 shrink-0 text-slate-700 group-hover/title:text-[#BF1539]" />
                              </a>

                              {/* Floating hover preview popover */}
                              <div className="pointer-events-none absolute bottom-full left-0 mb-3 hidden group-hover/title:flex flex-col w-60 sm:w-68 p-2.5 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000] z-50 animate-in fade-in zoom-in-95 duration-150">
                                <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-black mb-2">
                                  <img
                                    src={`https://img.youtube.com/vi/${result.youtubeId}/mqdefault.jpg`}
                                    alt={result.title}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                    <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg">
                                      <Play className="w-4 h-4 fill-white ml-0.5" />
                                    </div>
                                  </div>
                                </div>
                                <p className="font-black text-xs text-black truncate">{result.title}</p>
                                <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">
                                  par {result.artistName || 'Artiste inconnu'}
                                </p>
                                <span className="text-[10px] font-black text-[#BF1539] uppercase mt-1.5 flex items-center gap-1 border-t border-slate-100 pt-1.5">
                                  <span>Cliquer pour ouvrir sur YouTube</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                                {/* Bottom arrow */}
                                <div className="absolute top-full left-6 -mt-[1px] border-4 border-transparent border-t-black" />
                              </div>
                            </div>

                            <p className="text-xs font-bold text-slate-600 mt-0.5 leading-relaxed truncate">
                              par <span className="text-black">{result.artistName || 'Artiste Non-Renseigné'}</span>
                              {result.description ? ` — ${result.description}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Right: Score Metrics & Progress Bars */}
                        <div className="flex flex-col gap-2.5 w-full md:w-80 lg:w-96 shrink-0 justify-center border-t md:border-t-0 pt-3 md:pt-0 border-black/10">
                          {/* Players Flat Score Bar (Hide 'Joueurs' if Twitch not active) */}
                          <div className="flex items-center gap-3 w-full">
                            {isTwitchLinked && (
                              <span className="text-[11px] font-black uppercase text-slate-700 w-16 shrink-0 text-left">
                                Joueurs
                              </span>
                            )}

                            <div className="flex-1 bg-[#faf6eb] border-2 border-black rounded-full h-3.5 overflow-hidden">
                              <div
                                className="h-full bg-[#24B3F1] border-r-2 border-black rounded-full transition-all duration-1000"
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            <div className="text-right flex items-center justify-end gap-1.5 w-24 shrink-0 font-mono">
                              <span className="text-base sm:text-lg font-black text-black leading-none">
                                {result.average.toFixed(2)}
                              </span>
                              <span className="text-xs text-slate-400 font-bold">/5</span>
                              <span className="text-[10px] font-bold text-slate-500 ml-1">
                                ({result.votesCount})
                              </span>
                            </div>
                          </div>

                          {/* Twitch Chat metrics */}
                          {result.twitchVotesCount !== undefined && result.twitchVotesCount > 0 && (
                            <div className="flex items-center gap-3 w-full border-t border-black/10 pt-1.5">
                              <span className="text-[11px] font-black uppercase text-purple-700 w-16 shrink-0 text-left flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                                Twitch
                              </span>

                              <div className="flex-1 bg-[#faf6eb] border-2 border-black rounded-full h-3.5 overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 border-r-2 border-black rounded-full transition-all duration-1000"
                                  style={{ width: `${((result.twitchAverage ?? 0) / 5) * 100}%` }}
                                />
                              </div>

                              <div className="text-right flex items-center justify-end gap-1.5 w-24 shrink-0 font-mono">
                                <span className="text-base sm:text-lg font-black text-purple-700 leading-none">
                                  {(result.twitchAverage ?? 0).toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">/5</span>
                                <span className="text-[10px] font-bold text-purple-600 ml-1">
                                  ({result.twitchVotesCount})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mobile Back Button */}
              <div className="flex lg:hidden justify-center border-t-2 border-black pt-6 mt-2">
                <button
                  onClick={handleBackToHome}
                  className="px-8 py-3.5 bg-[#24B3F1] border-2 border-black text-black font-black text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Retour à l'accueil</span>
                </button>
              </div>
            </div>

            {/* Right Side (Desktop): Home Button Only */}
            <div className="hidden lg:flex flex-col items-start w-52 xl:w-60 shrink-0 sticky top-8 gap-3 z-20">
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
