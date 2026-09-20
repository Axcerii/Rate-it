'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import {
  ChevronLeft,
  Plus,
  Loader2,
  ListMusic,
} from 'lucide-react';
import { PlaylistCard, PlaylistFilters } from '@/components/playlist';

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

  // Show more tracks progressively
  const handleShowMoreTracks = (playlistId: string) => {
    setVisibleTrackCounts((prev) => ({
      ...prev,
      [playlistId]: (prev[playlistId] || 15) + 30,
    }));
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
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-none"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2fc355] text-black border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-[#34d15d] active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-none"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Créer une playlist</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </header>

        {/* Modular Category Filters, Tabs & Search Bar */}
        <PlaylistFilters
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          validatedCount={playlists.validated.length}
          communityCount={playlists.community.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Playlists List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-black" />
            <p className="font-black text-sm uppercase">Chargement des playlists...</p>
          </div>
        ) : displayedPlaylists.length === 0 ? (
          <div className="p-8 sm:p-12 border-4 border-black bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-3 shadow-none">
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
                className="mt-2 px-4 py-2 bg-black text-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-800 shadow-none"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayedPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                isExpanded={expandedIds.has(playlist.id)}
                onToggleExpand={handleToggleExpand}
                tracks={tracksCache[playlist.id] || []}
                isLoadingTracks={Boolean(loadingTracks[playlist.id])}
                onHost={handleHostPlaylist}
                isStartingHost={startingHostId === playlist.id}
                visibleCount={visibleTrackCounts[playlist.id] || 15}
                onShowMoreTracks={handleShowMoreTracks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
