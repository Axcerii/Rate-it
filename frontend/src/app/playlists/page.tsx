'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/lib/useSocket';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Play,
  Film,
  Music2,
  ExternalLink,
  Loader2,
  ListMusic,
  CheckCircle2,
  Users,
  X,
  Radio,
} from 'lucide-react';

const CATEGORIES = [
  'Film/Cinéma',
  'Série/TV',
  'Anime/Manga',
  'Musique',
  'Streaming/VTuber',
  'Youtube',
  'KPop',
  'JPop',
  'Jeux Vidéo',
  'Dessins Animés/Cartoons',
] as const;

export default function PlaylistsPage() {
  const router = useRouter();
  const { getPlaylists, getPlaylistDetails, createRoom, showBanner } = useSocket();

  const [playlists, setPlaylists] = useState<{ validated: any[]; community: any[] }>({
    validated: [],
    community: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'validated' | 'community'>('validated');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand / collapse tracks for playlists
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tracksCache, setTracksCache] = useState<{ [id: string]: any[] }>({});
  const [loadingTracks, setLoadingTracks] = useState<{ [id: string]: boolean }>({});

  // Host launching state
  const [startingHostId, setStartingHostId] = useState<string | null>(null);

  // Progressive track rendering for instant accordion opening
  const [visibleTrackCounts, setVisibleTrackCounts] = useState<{ [id: string]: number }>({});

  // Fetch playlists on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getPlaylists()
      .then((res) => {
        if (isMounted) {
          setPlaylists(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load playlists:', err);
        showBanner('Erreur lors du chargement des playlists', 'error');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getPlaylists, showBanner]);

  // Toggle playlist accordion expand
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

    // If tracks not cached yet, fetch them
    if (!tracksCache[playlistId] && !loadingTracks[playlistId]) {
      setLoadingTracks((prev) => ({ ...prev, [playlistId]: true }));
      try {
        const details = await getPlaylistDetails(playlistId);
        setTracksCache((prev) => ({
          ...prev,
          [playlistId]: details.videos || [],
        }));
      } catch (err: any) {
        console.error('Failed to load tracks for playlist:', err);
        showBanner('Impossible de charger les morceaux de cette playlist', 'error');
      } finally {
        setLoadingTracks((prev) => ({ ...prev, [playlistId]: false }));
      }
    }
  };

  // Launch Host with pre-selected playlist
  const handleHostPlaylist = async (playlistId: string) => {
    setStartingHostId(playlistId);
    try {
      await createRoom();
      router.push(`/host?playlistId=${playlistId}`);
    } catch (err: any) {
      console.error('Failed to launch room for playlist:', err);
      showBanner(err.message || 'Erreur lors du lancement de la salle', 'error');
      setStartingHostId(null);
    }
  };

  // Filter and sort playlists
  const displayedPlaylists = useMemo(() => {
    const list = activeTab === 'validated' ? playlists.validated : playlists.community;

    return list
      .filter((pl) => {
        // Filter by category
        if (activeCategory !== 'all') {
          if (!pl.categories || !Array.isArray(pl.categories) || !pl.categories.includes(activeCategory)) {
            return false;
          }
        }
        // Filter by text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = pl.name && pl.name.toLowerCase().includes(q);
          const matchDesc = pl.description && pl.description.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => (b.played_count || 0) - (a.played_count || 0));
  }, [playlists, activeTab, activeCategory, searchQuery]);

  return (
    <div className="relative flex flex-col flex-1 items-center bg-transparent px-3 sm:px-6 py-4 sm:py-8 font-sans w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-5xl z-10 flex flex-col gap-5 sm:gap-7">

        {/* Top Header Navigation */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Accueil</span>
          </button>

          {/* Central Logo / Title */}
          <div className="flex items-center gap-2">
            <img
              src="/PLAYLIST/PlaylistText.png"
              alt="Playlists"
              className="h-9 sm:h-12 w-auto object-contain"
            />
          </div>

          {/* Create New Playlist Shortcut */}
          <button
            type="button"
            onClick={() => router.push('/playlists/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2fc355] text-black border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-[#34d15d] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Créer une playlist</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </header>

        {/* Category Filters Bar (Horizontal Pills) */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              <span>Filtrer par catégorie</span>
            </span>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="text-[11px] font-bold text-slate-800 hover:text-black underline underline-offset-2"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs uppercase whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-slate-100'
              }`}
            >
              Tous
            </button>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(isSelected ? 'all' : cat)}
                  className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs uppercase whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#BF1539] text-white'
                      : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tabs Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex border-3 border-black rounded-2xl bg-white p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('validated')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                activeTab === 'validated'
                  ? 'bg-[#BF1539] text-white'
                  : 'text-black hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Playlists Validées</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTab === 'validated' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {playlists.validated.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                activeTab === 'community'
                  ? 'bg-[#BF1539] text-white'
                  : 'text-black hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Playlists Communauté</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTab === 'community' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {playlists.community.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une playlist..."
              className="w-full pl-9 pr-8 py-2 border-2 border-black bg-white rounded-xl text-xs font-bold text-black focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-0.5"
                title="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Playlists List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-black" />
            <p className="font-black text-sm uppercase">Chargement des playlists...</p>
          </div>
        ) : displayedPlaylists.length === 0 ? (
          <div className="p-8 sm:p-12 border-4 border-black bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-3">
            <ListMusic className="w-12 h-12 text-slate-400" />
            <h3 className="font-title text-xl font-black text-black">Aucune playlist trouvée</h3>
            <p className="text-xs font-bold text-slate-600 max-w-md">
              {searchQuery || activeCategory !== 'all'
                ? 'Aucune playlist ne correspond aux filtres sélectionnés. Essayez de réinitialiser la recherche ou de changer de catégorie.'
                : 'Aucune playlist disponible pour le moment.'}
            </p>
            {(searchQuery || activeCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 px-4 py-2 bg-black text-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-800"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayedPlaylists.map((playlist) => {
              const isExpanded = expandedIds.has(playlist.id);
              const tracks = tracksCache[playlist.id] || [];
              const isLoadingThis = loadingTracks[playlist.id];
              const isStartingHost = startingHostId === playlist.id;

              return (
                <article
                  key={playlist.id}
                  className="bg-white border-4 border-black rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-transform hover:scale-[1.005]"
                >
                  {/* Playlist Card Header / Main Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Thumbnail: 16:9 of 1st video */}
                      <div className="relative w-28 sm:w-40 aspect-video rounded-xl border-2 border-black overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center">
                        {playlist.first_video_youtube_id ? (
                          <img
                            src={`https://img.youtube.com/vi/${playlist.first_video_youtube_id}/mqdefault.jpg`}
                            alt={playlist.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/50 p-2">
                            <ListMusic className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Text details */}
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-title text-base sm:text-lg font-black text-black leading-tight truncate max-w-full">
                            {playlist.name}
                          </h3>
                        </div>

                        {playlist.description && (
                          <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-2">
                            {playlist.description}
                          </p>
                        )}

                        {/* Badges: Times Played, Video Count, Categories */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {/* Times Played */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-black bg-[#FEEC66] font-black text-[10px] text-black uppercase">
                            <Play className="w-2.5 h-2.5 fill-black" />
                            <span>{playlist.played_count || 0} partie{(playlist.played_count || 0) > 1 ? 's' : ''}</span>
                          </span>

                          {/* Video Count */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-black bg-slate-100 font-black text-[10px] text-black uppercase">
                            <Film className="w-2.5 h-2.5" />
                            <span>{playlist.video_count || 0} vidéo{(playlist.video_count || 0) > 1 ? 's' : ''}</span>
                          </span>

                          {/* Categories */}
                          {Array.isArray(playlist.categories) &&
                            playlist.categories.map((cat: string) => (
                              <span
                                key={cat}
                                className="px-2 py-0.5 rounded-lg border border-black bg-rose-100 text-rose-950 font-black text-[10px] uppercase"
                              >
                                {cat}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (HOST Button & Accordion Toggle) */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* HOST Button using /HOST/HostText.png */}
                      <button
                        type="button"
                        onClick={() => handleHostPlaylist(playlist.id)}
                        disabled={isStartingHost}
                        aria-label={`Lancer un host avec la playlist ${playlist.name}`}
                        className="flex-1 sm:flex-none px-4 py-2 bg-[#009EE3] hover:bg-[#24B3F1] active:translate-x-0.5 active:translate-y-0.5 text-white border-3 border-black rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
                      >
                        {isStartingHost ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Lancement...</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <img
                              src="/HOST/HostText.png"
                              alt="HOST"
                              className="h-5 sm:h-6 w-auto object-contain pointer-events-none"
                            />
                          </div>
                        )}
                      </button>

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(playlist.id)}
                        aria-expanded={isExpanded}
                        className="px-3 py-2 bg-white hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 text-black border-2 border-black rounded-xl font-black text-xs uppercase flex items-center gap-1 transition-all shrink-0"
                      >
                        <span>{isExpanded ? 'Masquer' : 'Morceaux'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accordion: Video List Dropdown */}
                  {isExpanded && (
                    <div className="border-t-2 border-black pt-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-600 px-1">
                        <span>Pistes de la playlist ({tracks.length || playlist.video_count || 0})</span>
                        {playlist.first_video_youtube_id && (
                          <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                            <span>⭐ Piste 1 = miniature</span>
                          </span>
                        )}
                      </div>

                      {isLoadingThis ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-xs font-bold text-slate-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Chargement des vidéos...</span>
                        </div>
                      ) : tracks.length === 0 ? (
                        <p className="text-xs font-bold text-slate-400 py-3 text-center">
                          Aucune vidéo trouvée dans cette playlist.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                          {tracks.slice(0, visibleTrackCounts[playlist.id] || 15).map((track, idx) => (
                            <div
                              key={track.trackId || track.id || idx}
                              className={`flex items-center justify-between p-2 rounded-xl border border-black gap-2.5 transition-colors ${
                                idx === 0 ? 'bg-amber-50/80' : 'bg-slate-50 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="font-mono font-black text-xs w-6 text-center shrink-0 text-slate-500">
                                  #{idx + 1}
                                </span>

                                {/* Thumbnail */}
                                <div className="w-14 aspect-video rounded border border-black overflow-hidden bg-black shrink-0 relative">
                                  <img
                                    src={`https://img.youtube.com/vi/${track.youtubeId}/default.jpg`}
                                    alt={track.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-black text-xs text-black truncate leading-tight">
                                      {track.title}
                                    </p>
                                    {idx === 0 && (
                                      <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded border border-black shrink-0">
                                        Cover
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-600 truncate mt-0.5">
                                    par {track.artistName || 'Artiste inconnu'}
                                    {track.malTitle ? ` • ${track.malTitle}` : ''}
                                  </p>
                                </div>
                              </div>

                              {/* YouTube link */}
                              <a
                                href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-white hover:bg-slate-100 text-black border border-black rounded-lg transition shrink-0"
                                title="Regarder sur YouTube"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ))}

                          {tracks.length > (visibleTrackCounts[playlist.id] || 15) && (
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleTrackCounts((prev) => ({
                                  ...prev,
                                  [playlist.id]: (prev[playlist.id] || 15) + 30,
                                }))
                              }
                              className="w-full py-2 mt-1 bg-slate-100 hover:bg-slate-200 active:translate-x-0.5 active:translate-y-0.5 text-black border-2 border-black rounded-xl font-black text-xs uppercase transition text-center"
                            >
                              + Afficher les morceaux suivants ({tracks.length - (visibleTrackCounts[playlist.id] || 15)} restants)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
