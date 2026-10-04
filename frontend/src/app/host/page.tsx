'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  ChevronDown,
  SlidersHorizontal,
  Share2,
  Tv,
  Minus,
  Folder,
  FolderOpen,
  Music,
} from 'lucide-react';
import gsap from 'gsap';
import { LeaderboardCard, LeaderboardSortButtons } from '@/components/leaderboard';
import HomeButton from '@/components/HomeButton';
import CloseButton from '@/components/CloseButton';
import { PlaylistCard, PlaylistFilters, PlaylistTrackCard } from '@/components/playlist';
import RatingNumberButton from '@/components/RatingNumberButton';

export function getTrackOpeningBadge(track: any, fallbackIndex: number): string {
  if (track.description && typeof track.description === 'string') {
    const match = track.description.match(/(?:Opening|OP)\s*(\d+)/i);
    if (match) return `OP ${match[1]}`;
    const edMatch = track.description.match(/(?:Ending|ED)\s*(\d+)/i);
    if (edMatch) return `ED ${edMatch[1]}`;
    if (/Opening|OP/i.test(track.description)) return `OP ${fallbackIndex + 1}`;
  }
  return `OP ${fallbackIndex + 1}`;
}

export function extractAnimeUsername(input: string, platform: 'mal' | 'anilist'): string {
  if (!input) return '';
  let str = input.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (str.includes('/')) {
    if (platform === 'anilist') {
      const match = str.match(/anilist\.co\/user\/([a-zA-Z0-9_-]+)/i);
      if (match) return match[1];
    } else {
      const match = str.match(/myanimelist\.net\/(?:profile|animelist)\/([a-zA-Z0-9_-]+)/i);
      if (match) return match[1];
    }
    const segments = str.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^[a-zA-Z0-9_-]{2,30}$/.test(last)) {
      return last;
    }
  }
  return str;
}

export function getTrackAnimeTitle(track: any): string {
  if (track.matchedAnimeTitle && typeof track.matchedAnimeTitle === 'string' && track.matchedAnimeTitle.trim()) {
    return track.matchedAnimeTitle.trim();
  }
  if (track.malTitle && typeof track.malTitle === 'string' && track.malTitle.trim()) {
    return track.malTitle.trim();
  }
  if (track.anilistTitle && typeof track.anilistTitle === 'string' && track.anilistTitle.trim()) {
    return track.anilistTitle.trim();
  }
  if (track.description && typeof track.description === 'string') {
    const cleaned = track.description
      .replace(/^(Opening|Ending|OP|ED|Insert\s*Song|OST)\s*\d*\s*[-–:]\s*/i, '')
      .replace(/\s*[-–:]\s*(Opening|Ending|OP|ED|Insert\s*Song|OST)\s*\d*$/i, '')
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }
  return track.title || 'Autre Animé';
}

const CATEGORIES = [
  'Anime/Manga',
  'Film/Cinéma',
  'Jeux Vidéo',
  'Série/TV',
  'Dessins Animés/Cartoons',
  'Streaming/VTuber',
  'Youtube',
] as const;

export const ANIME_FOLDER_THEMES = [
  {
    key: 'create',
    name: 'Créer',
    // Rayures diagonales vertes (thème Créer : #2fc355 avec teinte ton sur ton plus claire #61e283)
    bgPattern: 'repeating-linear-gradient(-45deg, #2fc355 0px, #2fc355 12px, #61e283 12px, #61e283 24px)',
    headerBg: 'bg-[#2fc355] hover:bg-[#28b34e]',
    headerText: 'text-black',
    folderIconClass: 'text-black/80',
  },
  {
    key: 'host',
    name: 'Host',
    // Rayures diagonales bleues (thème Host : #24B3F1 avec teinte ton sur ton plus claire #6ecefa)
    bgPattern: 'repeating-linear-gradient(-45deg, #24B3F1 0px, #24B3F1 12px, #6ecefa 12px, #6ecefa 24px)',
    headerBg: 'bg-[#24B3F1] hover:bg-[#0BA6EB]',
    headerText: 'text-black',
    folderIconClass: 'text-black/80',
  },
  {
    key: 'play',
    name: 'Play',
    // Rayures diagonales roses / fuchsia (thème Play : #DD4DCC avec teinte ton sur ton plus claire #ea8fe0)
    bgPattern: 'repeating-linear-gradient(-45deg, #DD4DCC 0px, #DD4DCC 12px, #ea8fe0 12px, #ea8fe0 24px)',
    headerBg: 'bg-[#DD4DCC] hover:bg-[#C933B7]',
    headerText: 'text-white',
    folderIconClass: 'text-white',
  },
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
    setDisabledVideos,
    getMalVideos,
    getAnilistVideos,
    showBanner,
    toggleHostPlayer,
    submitVote,
    toggleSkip,
    categories,
  } = useSocket();

  const dynamicCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return Array.from(CATEGORIES);
  }, [categories]);

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
  const [hasChosenMode, setHasChosenMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('playlistId')) return true;
      return sessionStorage.getItem('rate_it_host_mode_chosen') === 'true';
    }
    return false;
  });
  const [quizMode, setQuizMode] = useState<'playlist' | 'mal'>('playlist');
  const [playlistTab, setPlaylistTab] = useState<'validated' | 'community'>('validated');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<any[]>([]);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [searchPlaylistId, setSearchPlaylistId] = useState('');
  const [searchPlaylistError, setSearchPlaylistError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // If active category was deleted globally, reset to 'all'
  useEffect(() => {
    if (activeCategory !== 'all' && !dynamicCategories.includes(activeCategory)) {
      setActiveCategory('all');
    }
  }, [dynamicCategories, activeCategory]);

  // Strip deleted categories from locally loaded playlists
  useEffect(() => {
    if (categories && categories.length > 0) {
      setPlaylists((prev) => ({
        ...prev,
        validated: (prev.validated || []).map((p: any) => ({
          ...p,
          categories: Array.isArray(p.categories) ? p.categories.filter((c: any) => categories.includes(c)) : [],
        })),
        community: (prev.community || []).map((p: any) => ({
          ...p,
          categories: Array.isArray(p.categories) ? p.categories.filter((c: any) => categories.includes(c)) : [],
        })),
      }));
    }
  }, [categories]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tracksCache, setTracksCache] = useState<{ [id: string]: any[] }>({});
  const [loadingTracks, setLoadingTracks] = useState<{ [id: string]: boolean }>({});
  const [visibleTrackCounts, setVisibleTrackCounts] = useState<{ [id: string]: number }>({});
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isPlayersTabCollapsed, setIsPlayersTabCollapsed] = useState(false);
  const [showMobilePlayersModal, setShowMobilePlayersModal] = useState(false);
  const initialUrlLoadedRef = useRef(false);
  const playersPanelRef = useRef<HTMLDivElement>(null);
  const cassetteCancelRef = useRef<(() => void) | null>(null);
  const activeCassetteElRef = useRef<HTMLElement | null>(null);

  // Turntable Vinyl Disk Animation Refs & Controls
  const desktopDiskRef = useRef<HTMLImageElement | null>(null);
  const mobileDiskRef = useRef<HTMLImageElement | null>(null);
  const desktopDiskContainerRef = useRef<HTMLDivElement>(null);
  const mobileDiskContainerRef = useRef<HTMLDivElement>(null);
  const diskTweenRef = useRef<gsap.core.Tween | null>(null);
  const diskResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHandlingCardSelectionRef = useRef(false);
  const prevSelectedPlaylistIdRef = useRef<string | null>(null);

  const getDiskElements = () => {
    const els: HTMLElement[] = [];
    if (desktopDiskRef.current) els.push(desktopDiskRef.current);
    if (mobileDiskRef.current) els.push(mobileDiskRef.current);
    return els;
  };

  const getDiskContainers = () => {
    const els: HTMLElement[] = [];
    if (desktopDiskContainerRef.current) els.push(desktopDiskContainerRef.current);
    if (mobileDiskContainerRef.current) els.push(mobileDiskContainerRef.current);
    return els;
  };

  const stopDiskSpin = (immediate = false) => {
    if (diskResumeTimerRef.current) {
      clearTimeout(diskResumeTimerRef.current);
      diskResumeTimerRef.current = null;
    }

    if (!diskTweenRef.current) return;

    if (immediate) {
      gsap.killTweensOf(diskTweenRef.current);
      diskTweenRef.current.pause();
      diskTweenRef.current.timeScale(0);
    } else {
      gsap.killTweensOf(diskTweenRef.current);
      gsap.to(diskTweenRef.current, {
        timeScale: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          diskTweenRef.current?.pause();
        },
      });
    }
  };

  const startDiskSpin = (delayMs = 0) => {
    if (diskResumeTimerRef.current) {
      clearTimeout(diskResumeTimerRef.current);
      diskResumeTimerRef.current = null;
    }

    const execute = () => {
      const diskEls = getDiskElements();
      if (diskEls.length === 0) return;

      if (!diskTweenRef.current) {
        diskTweenRef.current = gsap.to(diskEls, {
          rotation: '+=360',
          duration: 3,
          ease: 'none',
          repeat: -1,
          transformOrigin: '50% 50%',
        });
        diskTweenRef.current.play();
      } else {
        gsap.killTweensOf(diskTweenRef.current);
        diskTweenRef.current.play();
        gsap.to(diskTweenRef.current, {
          timeScale: 1,
          duration: 0.8,
          ease: 'power2.in',
        });
      }
    };

    if (delayMs > 0) {
      diskResumeTimerRef.current = setTimeout(execute, delayMs);
    } else {
      execute();
    }
  };

  const revealDiskAndSpin = () => {
    const containers = getDiskContainers();
    if (containers.length === 0) return;

    gsap.killTweensOf(containers);
    gsap.fromTo(
      containers,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.45,
        ease: 'back.out(1.8)',
        onComplete: () => {
          startDiskSpin(0);
        },
      }
    );
  };

  const hideDisk = () => {
    stopDiskSpin(true);
    const containers = getDiskContainers();
    if (containers.length === 0) return;

    gsap.killTweensOf(containers);
    gsap.to(containers, {
      scale: 0,
      opacity: 0,
      duration: 0.35,
      ease: 'power2.in',
    });
  };

  useEffect(() => {
    return () => {
      if (cassetteCancelRef.current) cassetteCancelRef.current();
      if (activeCassetteElRef.current) {
        activeCassetteElRef.current.remove();
        activeCassetteElRef.current = null;
      }
      if (diskResumeTimerRef.current) {
        clearTimeout(diskResumeTimerRef.current);
        diskResumeTimerRef.current = null;
      }
      if (diskTweenRef.current) {
        diskTweenRef.current.kill();
        diskTweenRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedPlaylistId) {
      if (isHandlingCardSelectionRef.current) {
        // Will be animated and spun by the cassette animation callback
        isHandlingCardSelectionRef.current = false;
      } else {
        // Direct / URL initialization: show and spin immediately
        const containers = getDiskContainers();
        if (containers.length > 0) {
          gsap.set(containers, { scale: 1, opacity: 1 });
          startDiskSpin(0);
        }
      }
    } else {
      hideDisk();
    }
    prevSelectedPlaylistIdRef.current = selectedPlaylistId;
  }, [selectedPlaylistId]);

  const currentSelectedPlaylist = useMemo(() => {
    if (!selectedPlaylistId) return null;
    return (
      playlists.validated.find((p) => p.id === selectedPlaylistId) ||
      playlists.community.find((p) => p.id === selectedPlaylistId) ||
      null
    );
  }, [playlists, selectedPlaylistId]);

  const [animePlatform, setAnimePlatform] = useState<'mal' | 'anilist'>('mal');
  const [anilistUsername, setAnilistUsername] = useState('');
  const [animeConnectedPlatform, setAnimeConnectedPlatform] = useState<'mal' | 'anilist'>('mal');
  const [malTracks, setMalTracks] = useState<any[]>([]);
  const [isLoadingMalTracks, setIsLoadingMalTracks] = useState(false);
  const [malLoadError, setMalLoadError] = useState<string | null>(null);
  const [malConnectedUser, setMalConnectedUser] = useState<string | null>(null);
  const [animeSearchQuery, setAnimeSearchQuery] = useState('');
  const [collapsedAnimeGroups, setCollapsedAnimeGroups] = useState<Set<string>>(new Set());

  const animeGroups = useMemo(() => {
    if (!malTracks || malTracks.length === 0) return [];

    const groupsMap = new Map<string, { displayTitle: string; tracks: any[] }>();

    for (const track of malTracks) {
      const rawTitle = getTrackAnimeTitle(track);
      const key = rawTitle.toLowerCase().trim();

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { displayTitle: rawTitle, tracks: [] });
      }
      groupsMap.get(key)!.tracks.push(track);
    }

    return Array.from(groupsMap.values())
      .map((g) => ({
        animeTitle: g.displayTitle,
        tracks: g.tracks,
      }))
      .sort((a, b) => a.animeTitle.localeCompare(b.animeTitle, 'fr', { sensitivity: 'base' }));
  }, [malTracks]);

  const filteredAnimeGroups = useMemo(() => {
    if (!animeSearchQuery.trim()) return animeGroups;
    const q = animeSearchQuery.toLowerCase().trim();
    return animeGroups
      .map((group) => {
        const matchAnime = group.animeTitle.toLowerCase().includes(q);
        const matchingTracks = group.tracks.filter(
          (t) =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.artistName && t.artistName.toLowerCase().includes(q)) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
        if (matchAnime) {
          return group;
        }
        if (matchingTracks.length > 0) {
          return { ...group, tracks: matchingTracks };
        }
        return null;
      })
      .filter(Boolean) as { animeTitle: string; tracks: any[] }[];
  }, [animeGroups, animeSearchQuery]);

  const activeMalTracksCount = useMemo(() => {
    const disabledMap = session?.disabledVideoIds || {};
    return malTracks.filter((t) => !disabledMap[String(t.id)]).length;
  }, [malTracks, session?.disabledVideoIds]);

  const activeAnimeCount = useMemo(() => {
    const disabledMap = session?.disabledVideoIds || {};
    return animeGroups.filter((g) => g.tracks.some((t) => !disabledMap[String(t.id)])).length;
  }, [animeGroups, session?.disabledVideoIds]);


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
      const preselectedName = params.get('playlistName');
      if (preselectedId) {
        initialUrlLoadedRef.current = true;
        setHasChosenMode(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rate_it_host_mode_chosen', 'true');
        }
        // Clean URL so the query param doesn't lock playlist selection or re-trigger on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('playlistId');
        url.searchParams.delete('playlistName');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));

        setQuizMode('playlist');
        setLoadingTracks((prev) => ({ ...prev, [preselectedId]: true }));

        getPlaylistDetails(preselectedId)
          .then((res) => {
            const playlistName = res?.playlist?.name || preselectedName || preselectedId;
            const vids = res?.videos || [];

            // S'assurer que la playlist est présente dans la liste locale des playlists
            setPlaylists((prev) => {
              const exists =
                prev.validated.some((p) => p.id === res?.playlist?.id) ||
                prev.community.some((p) => p.id === res?.playlist?.id);
              if (!exists && res?.playlist) {
                return {
                  ...prev,
                  community: [
                    {
                      ...res.playlist,
                      video_count: vids.length || res.playlist.video_count || 0,
                    },
                    ...prev.community,
                  ],
                };
              }
              return prev;
            });

            setTracksCache((prev) => ({
              ...prev,
              [preselectedId]: vids,
            }));
            setSelectedPlaylistTracks(vids);
            setSelectedPlaylistId(preselectedId);
            setExpandedIds(new Set([preselectedId]));
            showBanner(`Playlist "${playlistName}" chargée correctement.`, 'success');
          })
          .catch((err: any) => {
            console.error('Failed to pre-select playlist from URL:', err);
            showBanner(err.message || 'Impossible de trouver la playlist sélectionnée.', 'error');
            setSelectedPlaylistId(null);
            setExpandedIds(new Set());
          })
          .finally(() => {
            setLoadingTracks((prev) => ({ ...prev, [preselectedId]: false }));
          });
      }
    }
  }, [session?.status, getPlaylistDetails, showBanner]);

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
      const rawInput = currentPlatform === 'anilist' ? anilistUsername.trim() : malUsername.trim();
      const username = extractAnimeUsername(rawInput, currentPlatform);
      if (!username) {
        showBanner(
          currentPlatform === 'anilist'
            ? 'Indiquez votre nom d\'utilisateur ou lien AniList pour commencer.'
            : 'Indiquez votre nom d\'utilisateur ou lien MyAnimeList pour commencer.',
          'warning'
        );
        setIsStartingGame(false);
        return;
      }

      const disabledMap = session?.disabledVideoIds || {};
      const activeCount = malTracks.length > 0
        ? malTracks.filter((t) => !disabledMap[String(t.id ?? '')]).length
        : 1;
      if (malTracks.length > 0 && activeCount === 0) {
        showBanner('Tous les openings sont désactivés. Veuillez en cocher au moins un pour lancer la partie.', 'warning');
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
      const currentTracks = tracksCache[selectedPlaylistId] || selectedPlaylistTracks;
      const disabledMap = session?.disabledVideoIds || {};
      const activeCount = currentTracks.length > 0
        ? currentTracks.filter((t) => !disabledMap[String(t.id ?? t.trackId ?? '')]).length
        : 1;
      if (currentTracks.length > 0 && activeCount === 0) {
        showBanner('Toutes les musiques de la playlist sont désactivées. Veuillez en cocher au moins une.', 'warning');
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
      if (prev.has(playlistId)) {
        return new Set();
      } else {
        return new Set([playlistId]);
      }
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

  const playCassetteInsertionAnimation = (playlistId: string, onCompleteCallback?: () => void) => {
    if (typeof window === 'undefined') return;

    // Annuler toute attente ou animation en cours
    if (cassetteCancelRef.current) {
      cassetteCancelRef.current();
      cassetteCancelRef.current = null;
    }
    if (activeCassetteElRef.current) {
      activeCassetteElRef.current.remove();
      activeCassetteElRef.current = null;
    }

    let isCancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let maxTimeout: ReturnType<typeof setTimeout> | null = null;
    let onScrollEnd: (() => void) | null = null;

    const cleanup = () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (maxTimeout) clearTimeout(maxTimeout);
      if (onScrollEnd && 'onscrollend' in window) {
        window.removeEventListener('scrollend', onScrollEnd);
      }
    };

    cassetteCancelRef.current = cleanup;

    const executeAnimation = () => {
      if (isCancelled) return;
      cleanup();
      cassetteCancelRef.current = null;

      const cardEl = document.getElementById(`playlist-card-${playlistId}`);
      const targetEl =
        window.innerWidth >= 640
          ? (playersPanelRef.current || document.getElementById('host-players-panel'))
          : document.getElementById('host-mobile-players-btn');

      if (!cardEl || !targetEl) {
        onCompleteCallback?.();
        return;
      }

      // Récupérer le visuel visible de la cassette (une fois le déploiement et le scroll terminés)
      const visualEl =
        (Array.from(cardEl.querySelectorAll('[data-cassette-visual]')).find(
          (el) => (el as HTMLElement).offsetParent !== null
        ) as HTMLElement) ||
        (cardEl.querySelector('[data-cassette-visual]') as HTMLElement) ||
        cardEl;

      const visualRect = visualEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const cassetteEl = document.createElement('div');
      cassetteEl.className = 'fixed pointer-events-none select-none';
      cassetteEl.style.zIndex = '5'; // En dessous des films, descriptions et cartes (z-10), mais au-dessus du fond animé (z-0)
      cassetteEl.style.position = 'fixed';

      // Dimensions initiales exactement basées sur la cassette réelle stabilisée
      const startWidth = visualRect.width > 0 ? visualRect.width : Math.min(cardEl.getBoundingClientRect().width * 0.72, 380);
      const startHeight = visualRect.height > 0 ? visualRect.height : startWidth * (692 / 945);
      cassetteEl.style.width = `${startWidth}px`;
      cassetteEl.style.height = `${startHeight}px`;
      cassetteEl.style.backgroundImage = "url('/PLAYLIST/CassetteRecadrée.png')";
      cassetteEl.style.backgroundSize = 'contain';
      cassetteEl.style.backgroundRepeat = 'no-repeat';
      cassetteEl.style.backgroundPosition = 'center';
      cassetteEl.style.filter = 'drop-shadow(0 14px 28px rgba(0, 0, 0, 0.55))';

      document.body.appendChild(cassetteEl);
      activeCassetteElRef.current = cassetteEl;

      const startX = visualRect.left + (visualRect.width - startWidth) / 2;
      const startY = visualRect.top + (visualRect.height - startHeight) / 2;

      const isDesktop = window.innerWidth >= 640;
      const endWidth = isDesktop ? Math.max(targetRect.width * 0.88, 200) : Math.max(targetRect.width * 0.9, 140);
      const endHeight = endWidth * (692 / 945);
      const endX = targetRect.left + (targetRect.width - endWidth) / 2;
      const enterY = isDesktop ? targetRect.top - endHeight * 0.2 : targetRect.top - endHeight * 0.15;

      const tl = gsap.timeline({
        onComplete: () => {
          cassetteEl.remove();
          if (activeCassetteElRef.current === cassetteEl) {
            activeCassetteElRef.current = null;
          }
          gsap.fromTo(
            targetEl,
            { scale: 0.96, y: -4 },
            { scale: 1, y: 0, duration: 0.3, ease: 'back.out(2.5)' }
          );
          if (onCompleteCallback) {
            onCompleteCallback();
          }
        },
      });

      // 1. Pop out de la cassette depuis son emplacement bien calé après scroll (en dessous des films et descriptions)
      tl.fromTo(
        cassetteEl,
        {
          left: startX,
          top: startY,
          scale: 0.94,
          opacity: 0,
          rotation: 0,
        },
        {
          scale: 1.05,
          opacity: 1,
          y: -24,
          rotation: -2,
          duration: 0.35,
          ease: 'back.out(1.8)',
        }
      )
        // 2. Trajet vers la liste des joueurs en rétrécissant à sa taille
        .to(
          cassetteEl,
          {
            left: endX,
            top: enterY,
            width: endWidth,
            height: endHeight,
            rotation: 2,
            duration: 0.55,
            ease: 'power2.inOut',
          },
          '+=0.04'
        )
        // 3. Glisse derrière la liste des joueurs et disparaît
        .to(cassetteEl, {
          y: '+=90',
          scale: 0.82,
          opacity: 0,
          duration: 0.32,
          ease: 'power3.in',
        });
    };

    // Attendre la stabilisation du scroll déclenché lors de l'ouverture
    const startTime = Date.now();
    let lastY = window.scrollY;
    let stableCount = 0;

    // Écouter scrollend si disponible dans le navigateur
    if ('onscrollend' in window) {
      onScrollEnd = () => {
        if (Date.now() - startTime >= 110) {
          executeAnimation();
        }
      };
      window.addEventListener('scrollend', onScrollEnd, { once: true });
    }

    // Détection de stabilisation du scroll (démarrée à 110ms pour laisser le scrollTo démarrer)
    pollInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 110) return;

      const currentY = window.scrollY;
      if (Math.abs(currentY - lastY) < 1.5) {
        stableCount++;
        if (stableCount >= 2) {
          executeAnimation();
        }
      } else {
        stableCount = 0;
        lastY = currentY;
      }
    }, 45);

    // Timeout de sécurité max
    maxTimeout = setTimeout(() => {
      executeAnimation();
    }, 650);
  };

  const handleSelectPlaylist = async (playlistId: string) => {
    isHandlingCardSelectionRef.current = true;
    const hadPrevious = !!selectedPlaylistId;
    const isDifferent = selectedPlaylistId !== playlistId;

    if (hadPrevious && isDifferent) {
      // Le disque s'arrête immédiatement lors d'une nouvelle sélection
      stopDiskSpin();
    }

    setSelectedPlaylistId(playlistId);
    setExpandedIds(new Set([playlistId]));

    playCassetteInsertionAnimation(playlistId, () => {
      if (!hadPrevious) {
        // Première sélection: apparition animée du disque et lancement de la rotation
        revealDiskAndSpin();
      } else if (isDifferent) {
        // Nouvelle sélection: le disque reprend rapidement (~600ms) après l'animation
        startDiskSpin(600);
      }
    });

    // Reset disabled video states when switching to a different playlist
    if (isDifferent && session?.disabledVideoIds && Object.keys(session.disabledVideoIds).length > 0) {
      setDisabledVideos({}).catch(console.error);
    }

    if (!tracksCache[playlistId] && !loadingTracks[playlistId]) {
      setLoadingTracks((prev) => ({ ...prev, [playlistId]: true }));
      try {
        const details = await getPlaylistDetails(playlistId);
        const videos = details.videos || [];
        setTracksCache((prev) => ({
          ...prev,
          [playlistId]: videos,
        }));
        setSelectedPlaylistTracks(videos);
      } catch (err: any) {
        console.error('Failed to load tracks for playlist:', err);
        showBanner(err.message || 'Impossible de charger les morceaux de cette playlist', 'error');
      } finally {
        setLoadingTracks((prev) => ({ ...prev, [playlistId]: false }));
      }
    } else if (tracksCache[playlistId]) {
      setSelectedPlaylistTracks(tracksCache[playlistId]);
    }
  };

  const handleToggleAllTracks = async (playlistId: string, enableAll: boolean) => {
    const tracks = tracksCache[playlistId] || selectedPlaylistTracks;
    if (!tracks || tracks.length === 0) return;
    try {
      if (enableAll) {
        await setDisabledVideos({});
      } else {
        const newMap: { [id: string]: boolean } = {};
        tracks.forEach((track) => {
          const trackId = String(track.id ?? track.trackId ?? '');
          if (trackId) newMap[trackId] = true;
        });
        await setDisabledVideos(newMap);
      }
    } catch (err: any) {
      console.error('Failed to toggle all tracks:', err);
    }
  };

  const handleStartGameWithPlaylist = async (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    if (activeConnectedPlayers.length === 0) {
      showBanner('Veuillez attendre au moins un joueur connecté ou cochez "Host joueur"', 'error');
      return;
    }
    const currentTracks = tracksCache[playlistId] || selectedPlaylistTracks;
    const disabledMap = session?.disabledVideoIds || {};
    const activeCount = currentTracks.length > 0
      ? currentTracks.filter((t) => !disabledMap[String(t.id ?? t.trackId ?? '')]).length
      : 1;
    if (currentTracks.length > 0 && activeCount === 0) {
      showBanner('Toutes les musiques de la playlist sont désactivées. Veuillez en cocher au moins une.', 'warning');
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
      const hadPrevious = !!selectedPlaylistId;
      const isDifferent = selectedPlaylistId !== res.playlist.id;

      if (hadPrevious && isDifferent) {
        stopDiskSpin();
      }

      isHandlingCardSelectionRef.current = true;
      setSelectedPlaylistId(res.playlist.id);
      setSelectedPlaylistTracks(res.videos || []);
      setTracksCache(prev => ({
        ...prev,
        [res.playlist.id]: res.videos || [],
      }));
      setExpandedIds(new Set([res.playlist.id]));
      playCassetteInsertionAnimation(res.playlist.id, () => {
        if (!hadPrevious) {
          revealDiskAndSpin();
        } else if (isDifferent) {
          startDiskSpin(600);
        }
      });
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

  const handleAnimeInputChange = (val: string, platform: 'mal' | 'anilist') => {
    if (platform === 'mal' && /anilist\.co/i.test(val)) {
      setAnimePlatform('anilist');
      setAnilistUsername(extractAnimeUsername(val, 'anilist'));
      return;
    }
    if (platform === 'anilist' && /myanimelist\.net/i.test(val)) {
      setAnimePlatform('mal');
      setMalUsername(extractAnimeUsername(val, 'mal'));
      return;
    }
    if (platform === 'anilist') {
      setAnilistUsername(val);
    } else {
      setMalUsername(val);
    }
  };

  const handleLoadAnimeTracks = async (e: React.FormEvent, platform?: 'mal' | 'anilist') => {
    e.preventDefault();
    setMalLoadError(null);
    const targetPlatform = platform || animePlatform;
    const rawInput = targetPlatform === 'anilist' ? anilistUsername.trim() : malUsername.trim();
    const username = extractAnimeUsername(rawInput, targetPlatform);
    if (!username) {
      setMalLoadError('Veuillez entrer un pseudo ou un lien valide.');
      return;
    }

    setIsLoadingMalTracks(true);
    try {
      const videos = targetPlatform === 'anilist'
        ? await getAnilistVideos(username)
        : await getMalVideos(username);
      setMalTracks(videos);
      setMalConnectedUser(username);
      setAnimeConnectedPlatform(targetPlatform);
      if (targetPlatform === 'anilist') {
        setAnilistUsername(username);
      } else {
        setMalUsername(username);
      }
    } catch (err: any) {
      setMalLoadError(err.message || 'Impossible de récupérer les animés. Vérifiez que le profil ou lien est bien public.');
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

  const handleToggleAnimeGroup = async (tracks: any[], enable: boolean) => {
    const currentDisabled = { ...(session?.disabledVideoIds || {}) };
    tracks.forEach((track) => {
      const id = String(track.id);
      if (enable) {
        delete currentDisabled[id];
      } else {
        currentDisabled[id] = true;
      }
    });
    try {
      await setDisabledVideos(currentDisabled);
    } catch (err) {
      console.error('Failed to toggle anime group:', err);
    }
  };

  const handleToggleAllMalTracks = async (enable: boolean) => {
    if (malTracks.length === 0) return;
    try {
      if (enable) {
        await setDisabledVideos({});
      } else {
        const newMap: { [id: string]: boolean } = {};
        malTracks.forEach((t) => {
          newMap[String(t.id)] = true;
        });
        await setDisabledVideos(newMap);
      }
    } catch (err) {
      console.error('Failed to toggle all MAL tracks:', err);
    }
  };

  const handleToggleSingleAnimeCollapse = (animeTitle: string) => {
    setCollapsedAnimeGroups((prev) => {
      const next = new Set(prev);
      if (next.has(animeTitle)) {
        next.delete(animeTitle);
      } else {
        next.add(animeTitle);
      }
      return next;
    });
  };

  const handleToggleCollapseAll = () => {
    if (collapsedAnimeGroups.size > 0) {
      setCollapsedAnimeGroups(new Set());
    } else {
      const allKeys = [
        ...animeGroups.map((g) => g.animeTitle),
        '__single_openings__',
      ];
      setCollapsedAnimeGroups(new Set(allKeys));
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('rate_it_host_mode_chosen');
      }
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
          <h2 className="text-2xl text-black font-title uppercase transform rotate-[-1deg]">
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
          <h2 className="mt-6 text-xl uppercase text-black font-title">Chargement de la session...</h2>
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
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 lg:px-8 py-4 sm:py-6 font-sans w-full max-w-full overflow-x-clip min-h-screen">
        <div className="z-10 w-full max-w-7xl mx-auto flex flex-col flex-1 gap-5 sm:gap-6">

          {/* Header Row: Home Button (Top Left) + Title/Logo + Mode switcher (affiché une fois le mode choisi) */}
          {hasChosenMode && (
            <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 w-full text-center md:text-left">
              <div className="flex items-center gap-3 sm:gap-4">
                <HomeButton
                  onClick={handleBackToHome}
                  sizeClassName="h-9 sm:h-12 md:h-14"
                  title="Quitter et fermer la salle"
                  ariaLabel="Quitter et fermer la salle"
                />
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
              </div>

              {/* Quiz Mode Selector (Playlists vs AnimeLists) */}
              <div className="flex border-2 border-black rounded-xl overflow-hidden font-black text-xs uppercase shadow-none shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setQuizMode('playlist')}
                  className={`py-2 px-3 sm:px-4 text-center cursor-pointer transition-colors ${quizMode === 'playlist'
                    ? 'bg-playlist text-black font-black'
                    : 'bg-white text-black hover:bg-slate-100'
                    }`}
                >
                  Playlists
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMode('mal')}
                  className={`py-2 px-3 sm:px-4 text-center border-l-2 border-black cursor-pointer transition-colors ${quizMode === 'mal'
                    ? 'bg-playlist text-black font-black'
                    : 'bg-white text-black hover:bg-slate-100'
                    }`}
                >
                  AnimeLists (MAL / AniList)
                </button>
              </div>
            </header>
          )}

          {/* TOP OPTIONS ROW (LIGNE D'OPTIONS EN HAUT) - Affichée uniquement après le choix du mode */}
          {hasChosenMode && (
            <>
              <div className="w-full info-card relative lg:!sticky lg:top-3 z-40 !overflow-visible rounded-2xl p-2.5 sm:p-3.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-md">

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
                    className={`px-3 py-1.5 border-2 border-black rounded-xl font-black text-xs uppercase inline-flex items-center gap-1.5 cursor-pointer shadow-none transition-colors btn-action-hover ${showQRCode ? 'bg-black text-[#FEEC66]' : 'bg-white hover:bg-slate-100 text-black'
                      }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR Code</span>
                  </button>
                </div>

                {/* 2. Options de jeu (HOST est un joueur + Vidéos aléatoires) */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-2 xl:py-0 border-t xl:border-t-0 border-black/15">
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
                      <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col w-56 p-2.5 bg-black text-white text-[11px] font-bold rounded-xl text-center leading-snug z-50 shadow-none">
                        Permet au Host de voter. À décocher si vous jouez avec vos amis sur votre téléphone IRL.
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-black" />
                      </div>
                    </div>

                    {/* Pseudo Host input (toujours visible, désactivé si Host joueur est décoché) */}
                    <input
                      type="text"
                      placeholder="Pseudo Host"
                      disabled={session.isHostPlayer === false}
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
                      className="px-2 py-1 text-xs font-bold bg-white border-2 border-black rounded-lg text-black placeholder:text-slate-400 w-24 sm:w-28 outline-none shadow-none disabled:opacity-40 disabled:bg-slate-100 disabled:border-slate-300 disabled:cursor-not-allowed transition-opacity"
                      title={session.isHostPlayer === false ? "Activez 'Host joueur' pour modifier le pseudo" : "Pseudonyme du Host"}
                    />
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
                        className="px-3 py-1.5 bg-[#9146FF] hover:bg-purple-600 disabled:opacity-50 text-white font-black text-xs uppercase border-2 border-black rounded-xl cursor-pointer shadow-none transition-colors btn-action-hover"
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
                  <div className="info-card rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4 shadow-none relative">
                    <h3 className="font-title text-base uppercase text-black text-center w-full px-10">
                      Rejoindre la salle
                    </h3>
                    <div className="p-3 bg-white border-2 border-black rounded-xl shadow-none">
                      <QRCodeSVG value={joinUrl} size={180} level="H" includeMargin={false} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 text-center leading-relaxed">
                      Scannez le QR Code avec votre téléphone :
                      <br />
                      <span className="font-mono text-black font-bold break-all bg-white px-2 py-0.5 rounded border border-black inline-block mt-1">{joinUrl}</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full py-2.5 px-4 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 shadow-none cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'Lien copié !' : 'Copier le lien d\'invitation'}</span>
                    </button>
                    <CloseButton
                      onClick={() => setShowQRCode(false)}
                      className="!absolute top-2 right-2 !z-50"
                      sizeClassName="w-8 h-8"
                      title="Fermer"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* MAIN CONTENT AREA */}
          {!hasChosenMode ? (
            /* ÉCRAN DE SÉLECTION DU MODE (écran séparé / formulaire initial plein format) */
            <div className="flex-1 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16 gap-8 sm:gap-10 lg:gap-12 animate-in fade-in duration-300">
              <div className="text-center flex flex-col items-center">
                <h2 className="font-title text-2xl text-black leading-tight tracking-wide max-w-2xl lg:max-w-4xl text-center">
                  Comment souhaitez-vous sélectionner les musiques pour cette session ?
                </h2>
              </div>

              {/* Les 2 boutons agrandis sur grands écrans et descriptions égalisées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 w-full px-2 sm:px-4 lg:px-6 items-stretch">
                {/* 1. Bouton : Utiliser une playlist préfaite */}
                <button
                  type="button"
                  onClick={() => {
                    setQuizMode('playlist');
                    setHasChosenMode(true);
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('rate_it_host_mode_chosen', 'true');
                    }
                  }}
                  className="group relative flex flex-col h-full w-full text-left cursor-pointer select-none focus:outline-none shadow-none"
                >
                  <div className="relative w-full flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus:scale-[1.03] group-active:scale-[0.98]">
                    <img
                      src="/LOGOS/Bouton_Playlist.png"
                      alt="Playlists"
                      className="w-full h-auto max-h-[220px] sm:max-h-[280px] lg:max-h-[340px] xl:max-h-[400px] object-contain drop-shadow-md group-hover:drop-shadow-xl transition-all duration-200"
                      draggable={false}
                    />
                  </div>

                  <div className="mt-4 lg:mt-6 w-full bg-white border-3 sm:border-4 xl:border-[5px] border-black rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 lg:p-7 xl:p-8 text-left shadow-none group-hover:bg-[#FEEC66] transition-all duration-200 flex-1 flex flex-col justify-center items-start">
                    <div className="flex items-center justify-between w-full gap-2 text-black font-title text-base sm:text-xl lg:text-2xl xl:text-3xl uppercase min-h-[2.5rem] sm:min-h-[3rem] lg:min-h-[3.5rem] text-left leading-snug">
                      <span>Utiliser une playlist préfaite</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base xl:text-lg font-bold text-slate-700 mt-2 lg:mt-3 leading-relaxed min-h-[2.75rem] sm:min-h-[3rem] lg:min-h-[3.25rem] flex items-center text-left">
                      Explorez le catalogue officiel, les playlists communautaires ou chargez un code.
                    </p>
                  </div>
                </button>

                {/* 2. Bouton : Importer une liste depuis MyAnimeList / Anilist */}
                <button
                  type="button"
                  onClick={() => {
                    setQuizMode('mal');
                    setHasChosenMode(true);
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('rate_it_host_mode_chosen', 'true');
                    }
                  }}
                  className="group relative flex flex-col h-full w-full text-left cursor-pointer select-none focus:outline-none shadow-none"
                >
                  <div className="relative w-full flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus:scale-[1.03] group-active:scale-[0.98]">
                    <img
                      src="/LOGOS/Bouton_MAL_AL.png"
                      alt="MyAnimeList / AniList"
                      className="w-full h-auto max-h-[220px] sm:max-h-[280px] lg:max-h-[340px] xl:max-h-[400px] object-contain drop-shadow-md group-hover:drop-shadow-xl transition-all duration-200"
                      draggable={false}
                    />
                  </div>

                  <div className="mt-4 lg:mt-6 w-full bg-white border-3 sm:border-4 xl:border-[5px] border-black rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 lg:p-7 xl:p-8 text-left shadow-none group-hover:bg-[#FEEC66] transition-all duration-200 flex-1 flex flex-col justify-center items-start">
                    <div className="flex items-center justify-between w-full gap-2 text-black font-title text-base sm:text-xl lg:text-2xl xl:text-3xl uppercase min-h-[2.5rem] sm:min-h-[3rem] lg:min-h-[3.5rem] text-left leading-snug">
                      <span>Importer une liste depuis MAL / AL</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base xl:text-lg font-bold text-slate-700 mt-2 lg:mt-3 leading-relaxed min-h-[2.75rem] sm:min-h-[3rem] lg:min-h-[3.25rem] flex items-center text-left">
                      Générez automatiquement une playlist avec les openings de vos animes complétés.
                    </p>
                  </div>
                </button>
              </div>

              {/* Petit bouton Accueil pour quitter si on souhaite annuler */}
              <div className="flex justify-center pt-2">
                <HomeButton
                  onClick={handleBackToHome}
                  sizeClassName="h-10 sm:h-12 md:h-14"
                  title="Retourner à l'accueil"
                  ariaLabel="Retourner à l'accueil"
                />
              </div>
            </div>
          ) : quizMode === 'playlist' ? (
            /* PLAYLISTS VIEW WITH FILTERS & CARDS (REUSING PLAYLISTCARD & PLAYLISTFILTERS) */
            <div className="flex flex-col lg:flex-row items-start gap-6 w-full flex-1">

              {/* Sidebar Filters */}
              <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3">
                {/* Form to load custom playlist by share code (TOUT EN HAUT DES FILTRES) */}
                <form
                  onSubmit={handleSearchPlaylist}
                  className="bg-white border-2 border-black rounded-2xl p-3 flex flex-col gap-2 shadow-none"
                >
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                    <Share2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Code de partage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={searchPlaylistId}
                      onChange={(e) => setSearchPlaylistId(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC123"
                      maxLength={12}
                      className="flex-1 min-w-0 px-2.5 py-1.5 border-2 border-black bg-white text-xs font-bold uppercase rounded-xl focus:outline-none shadow-none"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#FEEC66] hover:bg-yellow-300 text-black border-2 border-black rounded-xl font-black text-xs uppercase cursor-pointer shadow-none btn-action-hover shrink-0"
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

                <PlaylistFilters
                  categories={dynamicCategories}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  activeTab={playlistTab}
                  onSelectTab={setPlaylistTab}
                  validatedCount={playlists.validated.length}
                  communityCount={playlists.community.length}
                  searchQuery={playlistSearchQuery}
                  onSearchChange={setPlaylistSearchQuery}
                />
              </aside>

              {/* Main Playlists List */}
              <main className="flex-1 min-w-0 w-full flex flex-col gap-4">
                {displayedPlaylists.length === 0 ? (
                  <div className="p-8 sm:p-12 info-card rounded-2xl text-center flex flex-col items-center justify-center gap-3 shadow-none">
                    <h3 className="font-title text-lg text-black">
                      Aucune playlist trouvée
                    </h3>
                    <p className="text-xs font-bold text-slate-700 max-w-md">
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
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-none cursor-pointer btn-action-hover"
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
            <div className="info-card p-4 sm:p-6 rounded-2xl flex flex-col min-h-[460px] w-full max-w-full overflow-hidden shadow-none">
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
                      className={`px-3 py-1.5 uppercase transition ${animePlatform === 'mal'
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
                      className={`px-3 py-1.5 uppercase transition border-l-2 border-black ${animePlatform === 'anilist'
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
                    ? 'Collez le lien de votre profil ou entrez votre pseudo AniList pour importer automatiquement les openings de vos animes complétés.'
                    : 'Collez le lien de votre profil ou entrez votre pseudo MyAnimeList pour importer automatiquement les openings de vos animes complétés.'}
                </p>

                <form onSubmit={handleLoadAnimeTracks} className="flex flex-col sm:flex-row gap-2 mt-1">
                  {animePlatform === 'anilist' ? (
                    <input
                      type="text"
                      value={anilistUsername}
                      onChange={(e) => handleAnimeInputChange(e.target.value, 'anilist')}
                      placeholder="Lien ou pseudo AniList (ex: anilist.co/user/monPseudo)..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 border-2 border-black bg-white focus:outline-none focus:bg-white text-xs sm:text-sm font-bold rounded-xl shadow-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={malUsername}
                      onChange={(e) => handleAnimeInputChange(e.target.value, 'mal')}
                      placeholder="Lien ou pseudo MyAnimeList (ex: myanimelist.net/profile/monPseudo)..."
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
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  {/* Top Stats Banner */}
                  <div className="bg-emerald-50 p-3 sm:p-4 border-2 border-emerald-500 rounded-xl text-left shrink-0 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <p className="text-xs sm:text-sm text-emerald-950 font-black truncate">
                        Profil {animeConnectedPlatform === 'anilist' ? 'AniList' : 'MyAnimeList'} :{' '}
                        <span className="underline decoration-2">{malConnectedUser}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs font-black">
                      <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-400">
                        {animeGroups.length} animé{animeGroups.length > 1 ? 's' : ''} ({activeAnimeCount} actif{activeAnimeCount > 1 ? 's' : ''})
                      </span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg">
                        {activeMalTracksCount} / {malTracks.length} OP actif{activeMalTracksCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 border-2 border-black p-2.5 sm:p-3 rounded-xl shrink-0">
                    {/* Search inside anime / tracks */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={animeSearchQuery}
                        onChange={(e) => setAnimeSearchQuery(e.target.value)}
                        placeholder="Filtrer par animé, artiste ou chanson..."
                        className="w-full pl-9 pr-7 py-1.5 text-xs font-bold bg-white border border-black/20 rounded-lg focus:outline-none focus:border-black"
                      />
                      {animeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAnimeSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black font-black text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick Bulk Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleAllMalTracks(true)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-black rounded-lg text-[11px] font-black uppercase text-black cursor-pointer transition shadow-none"
                        title="Activer tous les openings de tous les animés"
                      >
                        Tout cocher
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllMalTracks(false)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-black rounded-lg text-[11px] font-black uppercase text-slate-700 cursor-pointer transition shadow-none"
                        title="Désactiver tous les openings de tous les animés"
                      >
                        Tout décocher
                      </button>
                    </div>
                  </div>

                  {/* Grouped Anime List - Flexible Folders Grid */}
                  <div className="flex-1 border-2 border-black bg-slate-100/70 p-2.5 sm:p-3.5 rounded-2xl max-h-[580px] overflow-y-auto mb-2 shadow-none scrollbar-thin">
                    {filteredAnimeGroups.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <Tv className="w-8 h-8 mx-auto mb-2 opacity-40 text-black" />
                        <p className="text-xs sm:text-sm font-black text-slate-500">
                          {animeSearchQuery ? 'Aucun animé ou chanson ne correspond à votre filtre.' : 'Aucun opening trouvé.'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start gap-3 sm:gap-3.5">
                        {filteredAnimeGroups.map((group, groupIdx) => {
                          const theme = ANIME_FOLDER_THEMES[groupIdx % ANIME_FOLDER_THEMES.length];
                          const totalGroupTracks = group.tracks.length;
                          const disabledMap = session?.disabledVideoIds || {};
                          const disabledInGroup = group.tracks.filter((t) => disabledMap[String(t.id)]).length;
                          const activeInGroup = totalGroupTracks - disabledInGroup;
                          const isAllActive = disabledInGroup === 0;
                          const isAllDisabled = activeInGroup === 0;
                          const isPartial = activeInGroup > 0 && disabledInGroup > 0;

                          // Sizing based on track count to pack cleanly into the grid
                          let folderWidthClass = 'w-fit max-w-full';
                          if (totalGroupTracks === 1) {
                            folderWidthClass = 'w-[165px] sm:w-[180px] shrink-0';
                          } else if (totalGroupTracks === 2) {
                            folderWidthClass = 'w-[325px] sm:w-[355px] shrink-0';
                          } else if (totalGroupTracks === 3) {
                            folderWidthClass = 'w-[485px] sm:w-[530px] max-w-full shrink-0';
                          } else if (totalGroupTracks === 4) {
                            folderWidthClass = 'w-[325px] sm:w-[355px] shrink-0';
                          } else {
                            folderWidthClass = 'w-full max-w-full';
                          }

                          return (
                            <div
                              key={group.animeTitle}
                              style={
                                isAllDisabled
                                  ? {
                                    background:
                                      'repeating-linear-gradient(-45deg, #cbd5e1 0px, #cbd5e1 12px, #f1f5f9 12px, #f1f5f9 24px)',
                                  }
                                  : {
                                    background: theme.bgPattern,
                                  }
                              }
                              className={`border-2 border-black rounded-xl p-2 sm:p-2.5 flex flex-col gap-1.5 transition-all shadow-none ${folderWidthClass} ${isAllDisabled
                                ? 'border-slate-500 opacity-60'
                                : 'hover:border-black'
                                }`}
                            >
                              {/* Dossier Indicatif Header */}
                              <div
                                className={`flex items-center justify-between gap-1.5 px-2 py-1.5 -mx-2 -mt-2 sm:-mx-2.5 sm:-mt-2.5 mb-1 rounded-t-lg select-none cursor-pointer transition-colors border-b-2 border-black ${isAllDisabled
                                  ? 'bg-slate-300 hover:bg-slate-400/80 text-slate-600'
                                  : `${theme.headerBg} ${theme.headerText}`
                                  }`}
                                onClick={() => handleToggleAnimeGroup(group.tracks, !isAllActive)}
                                title={isAllActive ? "Cliquer pour désactiver tout cet animé" : "Cliquer pour activer tout cet animé"}
                              >
                                {/* Left: Checkbox (toggles all in this anime) + Folder Icon + Anime Title */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleAnimeGroup(group.tracks, !isAllActive);
                                    }}
                                    title={isAllActive ? "Désactiver tout cet animé" : "Activer tout cet animé"}
                                    className={`w-4.5 h-4.5 rounded border border-black flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-none ${isAllActive
                                      ? 'bg-accent-red text-white'
                                      : isPartial
                                        ? 'bg-[#FEEC66] text-black'
                                        : 'bg-white text-transparent hover:border-accent-red'
                                      }`}
                                  >
                                    {isAllActive && <Check className="w-3 h-3 stroke-[3]" />}
                                    {isPartial && <Minus className="w-3 h-3 stroke-[3]" />}
                                  </button>

                                  <Folder className={`w-3.5 h-3.5 shrink-0 ${isAllDisabled ? 'text-slate-500' : theme.folderIconClass}`} />

                                  <span
                                    className={`font-black text-[11px] sm:text-xs uppercase tracking-tight truncate leading-tight ${isAllDisabled ? 'line-through text-slate-500' : theme.headerText
                                      }`}
                                    title={group.animeTitle}
                                  >
                                    {group.animeTitle}
                                  </span>
                                </div>

                                {/* Right: Count Badge */}
                                <span
                                  className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${isAllActive
                                    ? 'bg-black text-white border-black'
                                    : isAllDisabled
                                      ? 'bg-slate-200 text-slate-500 border-slate-300'
                                      : 'bg-white text-black border-black'
                                    }`}
                                >
                                  {totalGroupTracks === 1 ? '1 OP' : `${activeInGroup}/${totalGroupTracks} OP`}
                                </span>
                              </div>

                              {/* Film Cards inside this Folder */}
                              <div className="flex flex-wrap gap-2 items-start">
                                {group.tracks.map((track, trackIdx) => {
                                  const trackKey = String(track.id);
                                  const isTrackChecked = !disabledMap[trackKey];
                                  const badge = getTrackOpeningBadge(track, trackIdx);

                                  return (
                                    <div key={track.id} className="w-[145px] sm:w-[160px] aspect-[500/410] shrink-0">
                                      <PlaylistTrackCard
                                        track={track}
                                        index={trackIdx}
                                        selectable={true}
                                        isChecked={isTrackChecked}
                                        onToggle={() => handleToggleTrack(trackKey)}
                                        badgeText={badge}
                                        checkboxSide="left"
                                        disablePlay={true}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
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
                    Collez votre lien ou entrez votre pseudo {animePlatform === 'anilist' ? 'AniList' : 'MyAnimeList'} et cliquez sur <span className="text-accent-red font-black">Charger</span> ci-dessus pour configurer la liste des openings et animes à exclure.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FIXED CONNECTED PLAYERS TAB & MOBILE MODAL (Uniquement affiché après le choix du mode) */}
          {hasChosenMode && (
            <>
              {/* FIXED CONNECTED PLAYERS TAB (Desktop bottom-right) */}
              <div
                className="hidden sm:block !fixed bottom-4 right-5 sm:right-6 !z-50 pointer-events-none"
                style={{
                  position: 'fixed',
                  bottom: '1rem',
                  right: '1.5rem',
                  zIndex: 50,
                }}
              >
                {/* Vinyl Record Disk (Desktop) */}
                <div
                  ref={desktopDiskContainerRef}
                  className="absolute -top-16 -right-3 sm:-top-16 sm:-right-4 z-0 pointer-events-none"
                  style={{
                    transform: selectedPlaylistId ? 'scale(1)' : 'scale(0)',
                    opacity: selectedPlaylistId ? 1 : 0,
                  }}
                  title="Disque vinyle"
                >
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
                    <img
                      ref={desktopDiskRef}
                      src="/HOST/DiskOr.png"
                      alt="Disque vinyle"
                      className="w-full h-full object-contain select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                </div>

                <div
                  ref={playersPanelRef}
                  id="host-players-panel"
                  className="flex flex-col w-72 sm:w-80 info-card rounded-2xl overflow-hidden shadow-2xl transition-all relative z-10 pointer-events-auto bg-white"
                >
                  {/* Top Bar with HOST mascot/image, Players count and toggle */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsPlayersTabCollapsed(!isPlayersTabCollapsed)}
                    className="px-3.5 py-2 hover:bg-black/5 flex items-center justify-between cursor-pointer border-b border-black/10 select-none bg-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-black" />
                        <span className="font-title text-xs uppercase text-black">
                          Joueurs
                        </span>
                        <span className="bg-black text-[#FEEC66] px-1.5 py-0.5 rounded-lg text-xs font-mono font-black">
                          {activeConnectedPlayers.length}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${isPlayersTabCollapsed ? 'rotate-180' : ''
                        }`}
                    />
                  </div>

                  {/* Currently Selected Playlist / Mode Title */}
                  <div className={`px-3.5 py-2 bg-[#FAF9F5] flex flex-col gap-0.5 ${!isPlayersTabCollapsed ? 'border-b border-black/10' : ''}`}>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>Playlist sélectionnée</span>
                      </span>
                      {quizMode === 'playlist' && currentSelectedPlaylist && (
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          {currentSelectedPlaylist.video_count || (tracksCache[currentSelectedPlaylist.id] || []).length} titres
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-black truncate ${quizMode === 'mal'
                        ? 'text-black'
                        : currentSelectedPlaylist
                          ? 'text-black'
                          : 'text-slate-400 italic'
                        }`}
                      title={
                        quizMode === 'mal'
                          ? `Mode AnimeLists (${animeConnectedPlatform || animePlatform === 'anilist' ? 'AniList' : 'MyAnimeList'})`
                          : currentSelectedPlaylist
                            ? currentSelectedPlaylist.name
                            : 'Aucune playlist sélectionnée'
                      }
                    >
                      {quizMode === 'mal'
                        ? `Mode AnimeLists (${animeConnectedPlatform || animePlatform === 'anilist' ? 'AniList' : 'MyAnimeList'})`
                        : currentSelectedPlaylist
                          ? currentSelectedPlaylist.name
                          : 'Aucune playlist sélectionnée'}
                    </p>
                  </div>

                  {!isPlayersTabCollapsed && (
                    <div className="p-3 flex flex-col gap-2.5">
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
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border-2 border-black ${player.isConnected ? 'bg-white' : 'bg-slate-100 opacity-60'
                                  }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected
                                      ? 'bg-emerald-500 border border-black'
                                      : 'bg-slate-400'
                                      }`}
                                  />
                                  <span className="font-black text-xs text-black truncate">
                                    {player.name}
                                  </span>
                                </div>
                                {isHost && (
                                  <img
                                    src="/HOST/Couronne.png"
                                    alt="Host"
                                    className="w-5 h-5 object-contain shrink-0"
                                    title="Host"
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="pt-2 border-t border-black/15 flex flex-col gap-1.5 items-center">
                        <button
                          type="button"
                          onClick={handleStartGame}
                          disabled={
                            activeConnectedPlayers.length === 0 ||
                            isStartingGame ||
                            !hasChosenMode ||
                            (quizMode === 'playlist' && !selectedPlaylistId)
                          }
                          className="w-full py-1 flex items-center justify-center bg-transparent border-none outline-none select-none transition-all duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                          title={
                            !hasChosenMode
                              ? 'Veuillez choisir un mode de jeu'
                              : quizMode === 'playlist' && !selectedPlaylistId
                                ? 'Veuillez sélectionner une playlist'
                                : activeConnectedPlayers.length === 0
                                  ? 'En attente de joueurs ou activez "Host joueur"'
                                  : `Lancer la partie (${activeConnectedPlayers.length} joueur${activeConnectedPlayers.length > 1 ? 's' : ''})`
                          }
                          aria-label={`Lancer la partie (${activeConnectedPlayers.length} joueur${activeConnectedPlayers.length > 1 ? 's' : ''})`}
                        >
                          {isStartingGame ? (
                            <div className="flex items-center justify-center gap-2 py-1">
                              <Loader2 className="w-5 h-5 animate-spin text-black" />
                              <span className="font-title text-xs uppercase text-black">Démarrage...</span>
                            </div>
                          ) : (
                            <img
                              src="/JOIN/PlayText.png"
                              alt="PLAY"
                              className="h-10 sm:h-11 w-auto max-w-[85%] object-contain drop-shadow-md pointer-events-none select-none"
                              draggable={false}
                            />
                          )}
                        </button>
                        {quizMode === 'playlist' && !selectedPlaylistId && (
                          <p className="text-[10px] font-bold text-slate-500 text-center leading-tight">
                            Cliquez sur une playlist pour la choisir
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MOBILE RESPONSIVE FLOATING TAB (< sm) */}
              <div
                className="sm:hidden !fixed bottom-3 right-4 !z-50 pointer-events-none"
                style={{
                  position: 'fixed',
                  bottom: '0.75rem',
                  right: '1rem',
                  zIndex: 50,
                }}
              >
                {/* Vinyl Record Disk (Mobile) */}
                <div
                  ref={mobileDiskContainerRef}
                  className="absolute -top-8 -right-2 z-0 pointer-events-none"
                  style={{
                    transform: selectedPlaylistId ? 'scale(1)' : 'scale(0)',
                    opacity: selectedPlaylistId ? 1 : 0,
                  }}
                  title="Disque vinyle"
                >
                  <div className="relative w-14 h-14 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
                    <img
                      ref={mobileDiskRef}
                      src="/HOST/DiskOr.png"
                      alt="Disque vinyle"
                      className="w-full h-full object-contain select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  id="host-mobile-players-btn"
                  onClick={() => setShowMobilePlayersModal(true)}
                  className="relative z-10 px-3 py-2 rounded-xl info-card font-black text-xs uppercase text-black flex items-center gap-2 shadow-none cursor-pointer btn-action-hover border-2 border-black pointer-events-auto bg-white"
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{activeConnectedPlayers.length}</span>
                  </div>
                </button>
              </div>

              {/* MOBILE PLAYERS MODAL */}
              {showMobilePlayersModal && (
                <div className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 animate-fade-in">
                  <div className="w-full info-card rounded-2xl p-4 flex flex-col gap-3 shadow-none max-h-[85vh]">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-black" />
                          <h3 className="font-title text-xs uppercase text-black">
                            Joueurs ({activeConnectedPlayers.length})
                          </h3>
                        </div>
                      </div>
                      <CloseButton
                        onClick={() => setShowMobilePlayersModal(false)}
                        sizeClassName="w-7 h-7"
                        title="Fermer"
                      />
                    </div>

                    {/* Playlist sélectionnée sur mobile */}
                    <div className="px-3 py-2 bg-[#FAF9F5] border border-black/10 rounded-xl flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                        <Music className="w-3 h-3 text-host shrink-0" />
                        <span>Playlist sélectionnée :</span>
                      </span>
                      <p className={`text-xs font-black truncate ${currentSelectedPlaylist ? 'text-black' : 'text-slate-400 italic'}`}>
                        {quizMode === 'mal'
                          ? `Mode AnimeLists (${animeConnectedPlatform || animePlatform === 'anilist' ? 'AniList' : 'MyAnimeList'})`
                          : currentSelectedPlaylist
                            ? currentSelectedPlaylist.name
                            : 'Aucune playlist sélectionnée'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto max-h-52 pr-1 scrollbar-thin">
                      {playersList.map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-2 rounded-xl border-2 border-black ${player.isConnected ? 'bg-white' : 'bg-slate-100 opacity-60'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-500 border border-black' : 'bg-slate-400'
                                }`}
                            />
                            <span className="font-black text-xs text-black truncate">{player.name}</span>
                          </div>
                          {(player.isHost || player.id === session.hostPlayerId) && (
                            <img
                              src="/HOST/Couronne.png"
                              alt="Host"
                              className="w-5 h-5 object-contain shrink-0"
                              title="Host"
                            />
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
                      disabled={
                        activeConnectedPlayers.length === 0 ||
                        isStartingGame ||
                        !hasChosenMode ||
                        (quizMode === 'playlist' && !selectedPlaylistId)
                      }
                      className="w-full py-1 flex items-center justify-center bg-transparent border-none outline-none select-none transition-all duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                      title={
                        !hasChosenMode
                          ? 'Veuillez choisir un mode de jeu'
                          : quizMode === 'playlist' && !selectedPlaylistId
                            ? 'Veuillez sélectionner une playlist'
                            : activeConnectedPlayers.length === 0
                              ? 'En attente de joueurs ou activez "Host joueur"'
                              : `Lancer la partie (${activeConnectedPlayers.length} joueur${activeConnectedPlayers.length > 1 ? 's' : ''})`
                      }
                      aria-label={`Lancer la partie (${activeConnectedPlayers.length} joueur${activeConnectedPlayers.length > 1 ? 's' : ''})`}
                    >
                      {isStartingGame ? (
                        <div className="flex items-center justify-center gap-2 py-1">
                          <Loader2 className="w-5 h-5 animate-spin text-black" />
                          <span className="font-title text-xs uppercase text-black">Démarrage...</span>
                        </div>
                      ) : (
                        <img
                          src="/JOIN/PlayText.png"
                          alt="PLAY"
                          className="h-10 sm:h-11 w-auto max-w-[85%] object-contain drop-shadow-md pointer-events-none select-none"
                          draggable={false}
                        />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
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
                        className={`px-3 sm:px-4 py-2.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 ${hostHasSkipped
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
                        className={`px-3 sm:px-4 py-2.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 ${hostHasSkipped
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
            <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6 min-h-0">
              {/* Currently Playing details */}
              <div className="info-card border-4 border-black p-4 sm:p-6 rounded-2xl shrink-0">
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
                <div className="info-card border-4 border-black p-4 sm:p-5 rounded-2xl flex flex-col gap-3 bg-white shrink-0">
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
                        className={`w-full py-2.5 px-3 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${hostHasSkipped
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
                      <div className="flex justify-between items-center gap-1.5 sm:gap-2 px-1 py-1">
                        {[1, 2, 3, 4, 5].map((val) => {
                          const hostVote = session.votes?.[session.hostPlayerId || ''];
                          const isSelected = hostVote === val;
                          return (
                            <RatingNumberButton
                              key={val}
                              value={val}
                              isSelected={isSelected}
                              onClick={async () => {
                                try {
                                  await submitVote(val);
                                } catch (err: any) {
                                  showBanner(err.message || 'Erreur lors du vote', 'error');
                                }
                              }}
                              sizeClassName="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12"
                            />
                          );
                        })}
                      </div>
                      <button
                        onClick={handleToggleSkip}
                        className={`w-full mt-1 py-2.5 px-3 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${hostHasSkipped
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
                <div className="info-card border-4 border-black p-4 sm:p-5 rounded-2xl flex flex-col gap-2 shrink-0">
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
              <div className="flex-1 min-h-0 info-card border-4 border-black p-4 sm:p-6 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between border-b border-black pb-2 mb-3 shrink-0">
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

                <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] lg:max-h-none flex flex-col gap-2.5 pr-1 scrollbar-thin">
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
                          1: { text: '1', bg: 'bg-[var(--accent-red)] text-white' },
                          2: { text: '2', bg: 'bg-[var(--bg-play)] text-white' },
                          3: { text: '3', bg: 'bg-[var(--bg-cream)] text-black border border-black' },
                          4: { text: '4', bg: 'bg-[var(--bg-host)] text-black' },
                          5: { text: '5', bg: 'bg-[var(--bg-create)] text-black' },
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
                    className={`px-5 sm:px-6 py-3 border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 ${hostHasSkipped
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
