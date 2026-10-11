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
  AlertTriangle,
  Film,
  ArrowRight,
  UserX,
  Users,
  Home,
  Loader2,
  Shuffle,
  Search,
  Play,
  ChevronDown,
  Share2,
  Tv,
  Minus,
  Folder,
  Music,
} from '@/components/icons';
import gsap from 'gsap';
import HostLeaderboardView from '@/components/host/HostLeaderboardView';
import HostPlayingView from '@/components/host/HostPlayingView';
import HostModeChoice from '@/components/host/HostModeChoice';
import TwitchConnectionCheck from '@/components/host/TwitchConnectionCheck';
import { getRoomStats } from '@/components/host/roomStats';
import HomeButton from '@/components/HomeButton';
import CloseButton from '@/components/CloseButton';
import { PlaylistCard, PlaylistFilters, PlaylistTrackCard } from '@/components/playlist';
import { ANIME_FOLDER_THEMES, extractAnimeUsername, getTrackAnimeTitle, getTrackKind, getTrackOpeningBadge, type AnimeTrackKind } from '@/components/host/animeTracks';

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
    isHost,
    createRoom,
    leaveRoom,
    deleteRoom,
    startGame,
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
  const [hideTwitchCheck, setHideTwitchCheck] = useState(false);
  const [copiedPlaylistLink, setCopiedPlaylistLink] = useState(false);

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
  const autoCreateStartedRef = useRef(false);
  // Playlist the visitor arrived with (?playlistId=...): kept first in the list, whatever the filters
  const [pinnedPlaylistId, setPinnedPlaylistId] = useState<string | null>(null);
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

    // One folder per anime and per kind: the endings of an anime are kept apart from its openings
    const groupsMap = new Map<string, { displayTitle: string; kind: AnimeTrackKind; tracks: any[] }>();

    for (const track of malTracks) {
      const rawTitle = getTrackAnimeTitle(track);
      const kind = getTrackKind(track);
      const key = `${rawTitle.toLowerCase().trim()}|${kind}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { displayTitle: rawTitle, kind, tracks: [] });
      }
      groupsMap.get(key)!.tracks.push(track);
    }

    // Biggest folders first, then alphabetical order, openings before endings
    return Array.from(groupsMap.entries())
      .map(([key, g]) => ({
        key,
        animeTitle: g.displayTitle,
        kind: g.kind,
        tracks: g.tracks,
      }))
      .sort(
        (a, b) =>
          b.tracks.length - a.tracks.length ||
          a.animeTitle.localeCompare(b.animeTitle, 'fr', { sensitivity: 'base' }) ||
          (a.kind === b.kind ? 0 : a.kind === 'opening' ? -1 : 1)
      );
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
      .filter(Boolean) as typeof animeGroups;
  }, [animeGroups, animeSearchQuery]);

  const activeMalTracksCount = useMemo(() => {
    const disabledMap = session?.disabledVideoIds || {};
    return malTracks.filter((t) => !disabledMap[String(t.id)]).length;
  }, [malTracks, session?.disabledVideoIds]);

  // An anime can have two folders (openings and endings): count it once
  const animeCount = useMemo(() => new Set(animeGroups.map((g) => g.animeTitle.toLowerCase().trim())).size, [animeGroups]);

  const activeAnimeCount = useMemo(() => {
    const disabledMap = session?.disabledVideoIds || {};
    return new Set(
      animeGroups
        .filter((g) => g.tracks.some((t) => !disabledMap[String(t.id)]))
        .map((g) => g.animeTitle.toLowerCase().trim())
    ).size;
  }, [animeGroups, session?.disabledVideoIds]);

  // How many openings / endings were imported, and how many are still ticked
  const animeKindStats = useMemo(() => {
    const disabledMap = session?.disabledVideoIds || {};
    const stats = { opening: { total: 0, active: 0 }, ending: { total: 0, active: 0 } };
    for (const track of malTracks) {
      const entry = stats[getTrackKind(track)];
      entry.total++;
      if (!disabledMap[String(track.id)]) entry.active++;
    }
    return stats;
  }, [malTracks, session?.disabledVideoIds]);


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
      // A shared playlist link opens its own room instead (see below)
      const hasPlaylistLink = Boolean(new URLSearchParams(window.location.search).get('playlistId'));
      if (!session && isConnected && !hostSessionId && !hasPlaylistLink) {
        router.push('/');
      }
    }
  }, [session, isConnected, router]);

  // Shared playlist link (/host?playlistId=...) opened without a room: create one, so that the visitor
  // lands directly in a lobby with the playlist selected
  useEffect(() => {
    if (typeof window === 'undefined' || !isConnected || autoCreateStartedRef.current) return;
    if (!new URLSearchParams(window.location.search).get('playlistId')) return;

    if (session) {
      // Restored as a player of another room: this page is for hosting, leave it first
      if (!isHost) leaveRoom();
      // This page has its room: never open another one. Closing the room (back to home) empties the
      // session while the playlist is still in the address bar, which must not count as a new arrival.
      else autoCreateStartedRef.current = true;
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;
    const attempt = () => {
      // A previous room of this host is being restored: wait for it, or for the server to say it is gone
      if (localStorage.getItem('rate_it_host_session_id') && ++tries < 20) {
        timer = setTimeout(attempt, 300);
        return;
      }
      autoCreateStartedRef.current = true;
      createRoom().catch((err: any) => {
        showBanner(err.message || 'Impossible de créer la salle.', 'error');
        router.push('/');
      });
    };
    attempt();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [session, isConnected, isHost, createRoom, leaveRoom, showBanner, router]);

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

            const loadedId = res?.playlist?.id || preselectedId;
            setTracksCache((prev) => ({
              ...prev,
              [loadedId]: vids,
            }));
            setSelectedPlaylistTracks(vids);
            setSelectedPlaylistId(loadedId);
            setPinnedPlaylistId(loadedId);
            setExpandedIds(new Set([loadedId]));
            showBanner(`Playlist "${playlistName}" chargée correctement.`, 'success');
          })
          .catch((err: any) => {
            console.error('Failed to pre-select playlist from URL:', err);
            showBanner(err.message || 'Impossible de trouver la playlist sélectionnée.', 'error');
            setSelectedPlaylistId(null);
            setExpandedIds(new Set());
            // Dead link: do not keep it in the address bar
            window.history.replaceState(null, '', window.location.pathname);
          })
          .finally(() => {
            setLoadingTracks((prev) => ({ ...prev, [preselectedId]: false }));
          });
      }
    }
  }, [session?.status, getPlaylistDetails, showBanner]);

  // Keep the selected playlist in the address bar: the URL of the lobby is a link that can be shared
  // as is, and a refresh comes back to the same playlist
  useEffect(() => {
    if (typeof window === 'undefined' || session?.status !== 'LOBBY') return;
    // Nothing selected yet, or the playlist of the link is still loading: leave the URL alone
    if (quizMode === 'playlist' && !selectedPlaylistId) return;

    const url = new URL(window.location.href);
    const wanted = quizMode === 'playlist' ? selectedPlaylistId : null;
    if (url.searchParams.get('playlistId') === wanted && !url.searchParams.has('playlistName')) return;

    if (wanted) url.searchParams.set('playlistId', wanted);
    else url.searchParams.delete('playlistId');
    url.searchParams.delete('playlistName');
    window.history.replaceState(null, '', url.pathname + url.search);
  }, [session?.status, quizMode, selectedPlaylistId]);

  const handleCopyPlaylistLink = () => {
    if (!selectedPlaylistId || typeof window === 'undefined') return;
    navigator.clipboard.writeText(`${window.location.origin}/host?playlistId=${encodeURIComponent(selectedPlaylistId)}`);
    setCopiedPlaylistLink(true);
    showBanner('Lien copié : il ouvre directement une salle avec cette playlist prête à jouer.', 'success', 5000);
    setTimeout(() => setCopiedPlaylistLink(false), 2500);
  };

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
      setHideTwitchCheck(false);
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
    const pinned = pinnedPlaylistId
      ? [...playlists.validated, ...playlists.community].find((p) => p.id === pinnedPlaylistId)
      : null;

    const filtered = list
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

    return pinned ? [pinned, ...filtered.filter((p) => p.id !== pinned.id)] : filtered;
  }, [playlists, playlistTab, activeCategory, playlistSearchQuery, pinnedPlaylistId]);

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

  const handleToggleTracksOfKind = (kind: AnimeTrackKind, enable: boolean) =>
    handleToggleAnimeGroup(malTracks.filter((t) => getTrackKind(t) === kind), enable);

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

  const { playersList, activeConnectedPlayers } = getRoomStats(session);

  // Why the PLAY button is greyed out, written under it: a disabled button alone does not say what is missing
  const startBlockedReason =
    quizMode === 'playlist' && !selectedPlaylistId
      ? 'Choisissez une playlist pour lancer la partie'
      : activeConnectedPlayers.length === 0
        ? "En attente d'un joueur (ou cochez « Host joueur »)"
        : null;

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
                    <span className="text-xs font-black uppercase text-slate-600">Salle :</span>
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
                        className="h-4 w-4 rounded-full bg-slate-200 border-2 border-black text-slate-800 text-xs font-black flex items-center justify-center cursor-help"
                      >
                        ?
                      </span>
                      <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col w-56 p-2.5 bg-black text-white text-xs font-bold rounded-xl text-center leading-snug z-50 shadow-none">
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
                  <span className="text-xs font-black uppercase text-purple-900 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
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
                        className="text-xs text-accent-red hover:underline font-black cursor-pointer"
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
                      <span className="font-mono text-black font-bold break-all bg-white px-2 py-0.5 rounded border-2 border-black inline-block mt-1">{joinUrl}</span>
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
            <HostModeChoice
              onChoose={(mode) => {
                setQuizMode(mode);
                setHasChosenMode(true);
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('rate_it_host_mode_chosen', 'true');
                }
              }}
              onBackToHome={handleBackToHome}
            />
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
                    <p className="text-xs text-accent-red font-black mt-0.5">
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
                        {animeCount} animé{animeCount > 1 ? 's' : ''} ({activeAnimeCount} actif{activeAnimeCount > 1 ? 's' : ''})
                      </span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg">
                        {animeKindStats.opening.active} / {animeKindStats.opening.total} OP actif{animeKindStats.opening.active > 1 ? 's' : ''}
                      </span>
                      {animeKindStats.ending.total > 0 && (
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg">
                          {animeKindStats.ending.active} / {animeKindStats.ending.total} ED actif{animeKindStats.ending.active > 1 ? 's' : ''}
                        </span>
                      )}
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
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
                      {/* Per kind: unticks everything, or ticks it all back once nothing is left */}
                      {(['opening', 'ending'] as const).map((kind) => {
                        const { total, active } = animeKindStats[kind];
                        const enable = total > 0 && active === 0;
                        const label = kind === 'opening' ? 'openings' : 'endings';
                        return (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => handleToggleTracksOfKind(kind, enable)}
                            disabled={total === 0}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border-2 border-black rounded-lg text-xs font-black uppercase text-slate-700 cursor-pointer transition shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                            title={
                              total === 0
                                ? `Aucun ${kind === 'opening' ? 'opening' : 'ending'} dans cette liste`
                                : `${enable ? 'Activer' : 'Désactiver'} tous les ${label} de tous les animés`
                            }
                          >
                            {enable ? 'Cocher' : 'Décocher'} tous les {label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleToggleAllMalTracks(true)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border-2 border-black rounded-lg text-xs font-black uppercase text-black cursor-pointer transition shadow-none"
                        title="Activer tous les titres de tous les animés"
                      >
                        Tout cocher
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllMalTracks(false)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border-2 border-black rounded-lg text-xs font-black uppercase text-slate-700 cursor-pointer transition shadow-none"
                        title="Désactiver tous les titres de tous les animés"
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
                          const kindLabel = group.kind === 'ending' ? 'ED' : 'OP';
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
                              key={group.key}
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
                                    className={`w-4.5 h-4.5 rounded border-2 border-black flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-none ${isAllActive
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
                                    className={`font-black text-xs uppercase tracking-tight truncate leading-tight ${isAllDisabled ? 'line-through text-slate-500' : theme.headerText
                                      }`}
                                    title={group.animeTitle}
                                  >
                                    {group.animeTitle}
                                  </span>
                                </div>

                                {/* Right: Count Badge */}
                                <span
                                  className={`text-xs font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${isAllActive
                                    ? 'bg-black text-white border-black'
                                    : isAllDisabled
                                      ? 'bg-slate-200 text-slate-500 border-slate-300'
                                      : 'bg-white text-black border-black'
                                    }`}
                                >
                                  {totalGroupTracks === 1 ? `1 ${kindLabel}` : `${activeInGroup}/${totalGroupTracks} ${kindLabel}`}
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
                {/* Twitch chat check, stacked above the players panel */}
                {session.twitchChannel && !hideTwitchCheck && (
                  <TwitchConnectionCheck
                    channel={session.twitchChannel}
                    votes={session.twitchVotes || {}}
                    onClose={() => setHideTwitchCheck(true)}
                    className="relative z-10 pointer-events-auto w-72 sm:w-80 mb-2"
                  />
                )}

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
                    <div className="flex items-center justify-between gap-2 text-xs font-black uppercase text-slate-500">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <span>Playlist</span>
                      </span>
                      {quizMode === 'playlist' && currentSelectedPlaylist && (
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 font-mono whitespace-nowrap">
                            {currentSelectedPlaylist.video_count || (tracksCache[currentSelectedPlaylist.id] || []).length} titres
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyPlaylistLink}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-slate-100 border-2 border-black rounded-md text-xs font-black uppercase text-black cursor-pointer"
                            title="Copier un lien qui ouvre une salle avec cette playlist prête à jouer"
                          >
                            {copiedPlaylistLink ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                            <span>{copiedPlaylistLink ? 'Copié' : 'Partager'}</span>
                          </button>
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
                            <p className="text-xs font-bold text-slate-700 leading-tight">
                              En attente de joueurs...
                            </p>
                            {session.isHostPlayer === false && (
                              <p className="text-xs text-slate-500 font-bold">
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
                                      ? 'bg-emerald-500 border-2 border-black'
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
                              className="h-14 sm:h-16 w-auto max-w-[90%] object-contain drop-shadow-md pointer-events-none select-none"
                              draggable={false}
                            />
                          )}
                        </button>
                        {startBlockedReason && (
                          <p className="text-xs font-black text-slate-700 text-center leading-tight">
                            {startBlockedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MOBILE RESPONSIVE FLOATING TAB (< sm) */}
              <div
                className="sm:hidden !fixed bottom-3 right-4 !z-50 pointer-events-none flex flex-col items-end"
                style={{
                  position: 'fixed',
                  bottom: '0.75rem',
                  right: '1rem',
                  zIndex: 50,
                }}
              >
                {session.twitchChannel && !hideTwitchCheck && (
                  <TwitchConnectionCheck
                    channel={session.twitchChannel}
                    votes={session.twitchVotes || {}}
                    onClose={() => setHideTwitchCheck(true)}
                    compact
                    className="relative z-10 pointer-events-auto w-56 mb-2"
                  />
                )}

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
                      <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                        <Music className="w-3 h-3 text-host shrink-0" />
                        <span>Playlist sélectionnée :</span>
                        {quizMode === 'playlist' && currentSelectedPlaylist && (
                          <button
                            type="button"
                            onClick={handleCopyPlaylistLink}
                            className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border-2 border-black rounded-md text-xs font-black uppercase text-black cursor-pointer"
                          >
                            {copiedPlaylistLink ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                            <span>{copiedPlaylistLink ? 'Copié' : 'Partager'}</span>
                          </button>
                        )}
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
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-500 border-2 border-black' : 'bg-slate-400'
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
                          className="h-14 sm:h-16 w-auto max-w-[90%] object-contain drop-shadow-md pointer-events-none select-none"
                          draggable={false}
                        />
                      )}
                    </button>
                    {startBlockedReason && (
                      <p className="text-xs font-black text-slate-700 text-center leading-tight">
                        {startBlockedReason}
                      </p>
                    )}
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
    return (
      <HostPlayingView
        session={session}
        hostCustomName={hostCustomName}
        showRoomCode={showRoomCode}
        onShowRoomCodeChange={setShowRoomCode}
        copiedLink={copiedLink}
        onCopyLink={handleCopyLink}
        onBackToHome={handleBackToHome}
      />
    );
  }

  // 3. LEADERBOARD VIEW
  if (session.status === 'LEADERBOARD') {
    return <HostLeaderboardView session={session} hostCustomName={hostCustomName} onBackToHome={handleBackToHome} />;
  }

  return null;
}
